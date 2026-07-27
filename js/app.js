import { quests } from "./quests.js";
import { POWER_DEFINITIONS, calculatePowerProgress } from "./powers.js";
import { createPowerIcon } from "./power-icons.js";
import {
  BADGE_DEFINITIONS,
  STEP_DEFINITIONS,
  STEP_IDS,
  VERDICT_DEFINITIONS,
  checkStorageAvailability,
  clearProgress,
  clearQuest,
  completedIds,
  earnedBadges,
  emptyProgress,
  getLocalStorageSafely,
  loadProgress,
  markStep,
  saveProgress,
  setVerdict,
  toggleFavorite,
  unmarkStep,
  verdictCounts,
} from "./state.js";
import { LEGACY_STORAGE_KEY, STORAGE_KEY } from "./state.js";
import {
  AREA_LABELS,
  BADGE_HINTS,
  BADGE_LABELS,
  buildFollowUpText,
  classifyQuestHash,
  clearedTitles,
  createQuestViewModel,
  filterQuests,
  getSuggestionId,
  getQuestFocusSelector,
  getQuestById,
  parseQuestHash,
  resolveClearedNames,
  splitFollowUpTemplate,
} from "./view-model.js";

const progressRoot = document.querySelector("#progress");
const powerSummaryRoot = document.querySelector("#power-summary");
const suggestionRoot = document.querySelector("#suggestion");
const filtersRoot = document.querySelector("#filters");
const questList = document.querySelector("#quest-list");
const dialog = document.querySelector("#quest-dialog");
const dialogTitle = document.querySelector("#dialog-title");
const detailRoot = document.querySelector("#quest-detail");
const closeButton = document.querySelector("#close-dialog");
const toast = document.querySelector("#toast");
const dialogToast = document.querySelector("#dialog-toast");
const storageWarning = document.querySelector("#storage-warning");
const resetControls = document.querySelector(".reset-controls");
const resetButton = document.querySelector("#reset-progress");
const resetConfirmation = document.querySelector("#reset-confirmation");
const confirmResetButton = document.querySelector("#confirm-reset");
const cancelResetButton = document.querySelector("#cancel-reset");
const openPowersGuideButton = document.querySelector("#open-powers-guide");
const powersDialog = document.querySelector("#powers-dialog");
const closePowersDialogButton = document.querySelector("#close-powers-dialog");
const powersGuideList = document.querySelector("#powers-guide-list");

const storage = getLocalStorageSafely();
let progress = storage ? loadProgress(storage) : emptyProgress();
let storageAvailable = Boolean(storage);
let activeFilter = "all";
let activeQuestId = null;
let activeRoute = "daily";
let returnFocus = null;
let returnQuestId = null;
let toastTimer;
let toastMessage = "";
let powersImageLoaded = false;
// 「別のクエストにする」を押した回数。候補を送るだけで、進み具合には関係しない。
let suggestionOffset = 0;
// 利用者が書いた一言。端末にも保存せず、画面を閉じると消える。
let followUpDraft = "";

function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(options)) {
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("data-") || key.startsWith("aria-")) node.setAttribute(key, value);
    else if (key === "ariaPressed") node.setAttribute("aria-pressed", String(value));
    else node[key] = value;
  }
  node.append(...children.filter(Boolean));
  return node;
}

function powerIcon(powerId) {
  return createPowerIcon(powerId);
}

function renderToast() {
  const inDialog = dialog.open;
  toast.textContent = inDialog ? "" : toastMessage;
  dialogToast.textContent = inDialog ? toastMessage : "";
  toast.setAttribute("aria-hidden", String(inDialog));
  dialogToast.setAttribute("aria-hidden", String(!inDialog));
}

function showToast(message) {
  clearTimeout(toastTimer);
  toastMessage = message;
  renderToast();
  toastTimer = setTimeout(() => {
    toastMessage = "";
    renderToast();
  }, 3500);
}

function showStorageWarning() {
  storageAvailable = false;
  storageWarning.hidden = false;
}

function persist() {
  if (!storageAvailable) return;
  try {
    saveProgress(progress, storage);
  } catch {
    showStorageWarning();
  }
}

function currentPowerProgress() {
  return calculatePowerProgress(quests, completedIds(progress));
}

function renderProgress() {
  const powerProgress = currentPowerProgress();
  const count = powerProgress.completedQuestCount;
  const meter = el("progress", {
    className: "progress-meter",
    max: 30,
    value: count,
    "aria-label": `30クエスト中${count}件クリア`,
  });

  const verdicts = verdictCounts(progress);
  const verdictSummary = el("ul", { className: "verdict-summary" },
    VERDICT_DEFINITIONS.map(({ id, label }) => el("li", { className: `verdict verdict--${id}` }, [
      el("span", { className: "verdict__label", text: label }),
      el("strong", { className: "verdict__count", text: `${verdicts[id]}回` }),
    ])));

  const badges = new Set(earnedBadges(progress, quests, powerProgress));
  const badgeList = el("ul", { className: "badge-list" },
    BADGE_DEFINITIONS.map(({ id, hint }) => {
      const earned = badges.has(id);
      return el("li", {
        className: earned ? "badge badge--earned" : "badge badge--locked",
        title: earned ? "" : hint,
      }, [
        el("span", { className: "badge__mark", text: earned ? "★" : "☆", "aria-hidden": "true" }),
        el("span", { className: "badge__label", text: BADGE_LABELS[id] }),
        earned ? null : el("span", { className: "badge__hint", text: BADGE_HINTS[id] }),
      ]);
    }));

  progressRoot.replaceChildren(
    el("p", { className: "progress-count" }, [
      el("strong", { text: `${count} / 30` }),
      document.createTextNode(" クエストをクリア"),
    ]),
    meter,
    el("h3", { text: "あなたの判断" }),
    el("p", {
      className: "field-note",
      text: "AIの答えをどう扱ったかの記録です。数の多さを競うものではありません。",
    }),
    verdictSummary,
    el("h3", { text: "獲得称号" }),
    badgeList,
  );

  const powerList = el("ul", { className: "power-list" });
  for (const power of POWER_DEFINITIONS) {
    const points = powerProgress.byPower[power.id];
    powerList.append(el("li", { className: `power-item power-item--${power.id}` }, [
      el("p", { className: "power-item__heading" }, [
        el("span", { className: "power-item__name" }, [
          powerIcon(power.id),
          el("strong", { text: power.name }),
        ]),
        el("span", { className: "power-item__points", text: `${points.earned} / ${points.total}ポイント` }),
      ]),
      el("p", { className: "power-item__description", text: power.description }),
      el("progress", {
        max: points.total,
        value: points.earned,
        "aria-label": `${power.name} ${points.earned} / ${points.total}ポイント`,
      }),
    ]));
  }
  powerSummaryRoot.replaceChildren(
    el("p", { className: "power-total" }, [
      el("strong", { text: `${powerProgress.earnedTotal} / ${powerProgress.total}ポイント` }),
      document.createTextNode(`　${count} / ${quests.length}題できた`),
    ]),
    el("p", {
      className: "power-note",
      text: "ポイントは能力評価ではなく、その力を使う体験をした回数です。",
    }),
    el("p", {
      className: "field-note",
      text: "総ポイントは、その力を使うクエストの数です。数が多い力ほど大切、という意味ではありません。",
    }),
    powerList,
  );
}

function renderSuggestion() {
  if (!suggestionRoot) return;
  const pick = getQuestById(quests, getSuggestionId(quests, progress, suggestionOffset));
  if (!pick) {
    suggestionRoot.replaceChildren(
      el("p", { className: "suggestion__eyebrow", text: "迷ったときは" }),
      el("p", { className: "suggestion__title" }, [
        el("strong", { text: "30すべてに触れました。" }),
      ]),
      el("p", {
        className: "field-note",
        text: "気になったものは、何度でもやり直せます。同じクエストを別のルートで試すのもおすすめです。",
      }),
    );
    return;
  }
  const model = createQuestViewModel(pick, progress);
  suggestionRoot.replaceChildren(
    el("p", { className: "suggestion__eyebrow", text: "迷ったときは" }),
    el("p", { className: "suggestion__title" }, [
      el("span", { className: `quest-number quest-number--${model.area}`, text: String(model.id) }),
      el("strong", { text: model.title }),
    ]),
    el("p", { className: "suggestion__ability", text: model.ability }),
    el("div", { className: "suggestion__actions" }, [
      el("button", {
        type: "button",
        className: "suggestion__open",
        text: "このクエストを見る",
        "data-open": String(model.id),
      }),
      el("button", {
        type: "button",
        className: "quiet-button",
        text: "別のクエストにする",
        "data-next-suggestion": "1",
      }),
    ]),
    el("p", {
      className: "field-note",
      text: "まだ試していないものから出しています。1日に何個やっても、やらない日があってもかまいません。",
    }),
  );
}

function renderFilters() {
  const definitions = [
    ["all", "すべて"],
    ["text", "文字で話す（1〜10）"],
    ["media", "写真や文章（11〜20）"],
    ["thinking", "自分の使い方（21〜30）"],
  ];
  const list = el("ul", { className: "filter-list" });
  for (const [value, label] of definitions) {
    list.append(el("li", {}, [
      el("button", {
        type: "button",
        className: "filter-button",
        text: label,
        "data-filter": value,
        ariaPressed: activeFilter === value,
      }),
    ]));
  }
  filtersRoot.replaceChildren(list);
}

function renderCard(quest) {
  const model = createQuestViewModel(quest, progress);
  const stepDots = el("p", { className: "quest-steps", "aria-label": `3ステップ中${model.stepCount}件完了` },
    STEP_IDS.map((step, index) => el("span", {
      className: model.steps.includes(step) ? "step-dot step-dot--done" : "step-dot",
      text: String(index + 1),
      "aria-hidden": "true",
    })));

  return el("article", {
    className: model.completed ? "quest-card quest-card--complete" : "quest-card",
    "data-area": model.area,
    "data-quest-id": String(model.id),
  }, [
    el("p", { className: "quest-card__top" }, [
      el("span", { className: `quest-number quest-number--${model.area}`, text: String(model.id) }),
      el("span", { className: `area-label area-label--${model.area}`, text: model.areaLabel }),
      model.favorite ? el("span", { className: "quest-card__favorite", text: "★", title: "お気に入り" }) : null,
    ]),
    el("h3", { className: "quest-title", text: model.title }),
    el("p", { className: "quest-power" }, [
      powerIcon(model.primaryPower),
      el("span", { text: model.primaryPowerName }),
    ]),
    el("p", { className: "quest-status" }, [
      stepDots,
      el("span", {
        className: model.completed ? "status status--complete" : "status",
        text: model.completed ? "✓ クリア済み" : model.completionLabel,
      }),
    ]),
    el("button", {
      type: "button",
      className: "quest-open",
      text: "このクエストを見る",
      "data-open": String(model.id),
    }),
  ]);
}

function renderCards() {
  questList.replaceChildren(...filterQuests(quests, activeFilter).map(renderCard));
}

function labeledSection(title, text, className = "") {
  return el("section", { className: `detail-section ${className}`.trim() }, [
    el("h3", { text: title }),
    el("p", { text }),
  ]);
}

// 順序は見た目で誘導するだけにする。押せなくすると、生成AIを開けない人が
// 「読んで考えるだけの参加」を記録できなくなり、設計書の方針に反する。
function stepButton(model, step, label) {
  const index = STEP_IDS.indexOf(step);
  const done = model.steps.includes(step);
  const isNext = !done && (index === 0 || model.steps.includes(STEP_IDS[index - 1]));
  const state = done ? "done" : isNext ? "next" : "later";
  return el("button", {
    type: "button",
    className: `step-button step-button--${state}`,
    text: done ? `✓ ${label}` : label,
    "data-step": step,
    ariaPressed: done,
  });
}

function stepTracker(model) {
  return el("ol", { className: "step-tracker" },
    STEP_DEFINITIONS.map(({ id, label }, index) => el("li", {
      className: model.steps.includes(id) ? "step-tracker__item step-tracker__item--done" : "step-tracker__item",
    }, [
      el("span", { className: "step-tracker__number", text: `${index + 1}`, "aria-hidden": "true" }),
      el("span", { className: "step-tracker__label", text: label }),
    ])));
}

function actionBlock({ number, title, guidance, promptText, promptName, model, step, stepLabel, extra }) {
  return el("section", { className: "detail-section action-block" }, [
    el("h3", { className: "action-block__title" }, [
      el("span", { className: "action-block__number", text: number, "aria-hidden": "true" }),
      el("span", { text: title }),
    ]),
    guidance ? el("p", { className: "field-note", text: guidance }) : null,
    extra ?? null,
    promptText === null ? null : el("p", {
      className: "prompt-box",
      text: promptText,
      "data-prompt": promptName,
      tabIndex: -1,
    }),
    promptText === null ? null : el("button", {
      type: "button",
      className: "copy-button",
      text: "この文章をコピー",
      "data-copy": promptName,
    }),
    stepButton(model, step, stepLabel),
  ]);
}

function followUpBuilder(model, route) {
  const { before, after } = splitFollowUpTemplate(route.followUp.template);
  const preview = el("p", {
    className: "prompt-box",
    text: buildFollowUpText(route.followUp.template, followUpDraft),
    "data-prompt": "follow-up",
    tabIndex: -1,
  });

  const input = el("input", {
    type: "text",
    id: "follow-up-input",
    className: "followup-input",
    value: followUpDraft,
    placeholder: route.followUp.hints[0] ?? "",
    autocomplete: "off",
    maxLength: 60,
  });
  input.addEventListener("input", () => {
    followUpDraft = input.value;
    preview.textContent = buildFollowUpText(route.followUp.template, followUpDraft);
  });

  const hints = el("div", { className: "hint-chips" }, [
    el("span", { className: "hint-chips__label", text: "書きにくいときは、ここから選ぶ" }),
    ...route.followUp.hints.map((hint) => el("button", {
      type: "button",
      className: "hint-chip",
      text: hint,
      "data-hint": hint,
    })),
  ]);

  return el("div", { className: "followup-builder" }, [
    el("label", {
      className: "followup-builder__label",
      htmlFor: "follow-up-input",
      text: "AIの回答を読んで、気になったところを短い言葉で書く",
    }),
    el("p", { className: "followup-line" }, [
      el("span", { className: "followup-line__fixed", text: before }),
      input,
      el("span", { className: "followup-line__fixed", text: after }),
    ]),
    hints,
    el("p", { className: "field-note", text: "名前など個人が分かる言葉は書かないでください。ここに書いた言葉は、この端末にも保存されません。" }),
    preview,
    el("button", {
      type: "button",
      className: "copy-button",
      text: "この文章をコピー",
      "data-copy": "follow-up",
    }),
  ]);
}

function verdictBlock(model) {
  return el("section", { className: "detail-section action-block action-block--decide" }, [
    el("h3", { className: "action-block__title" }, [
      el("span", { className: "action-block__number", text: "③", "aria-hidden": "true" }),
      el("span", { text: "AIの答えをどう使うか、自分で決める" }),
    ]),
    el("p", {
      className: "field-note",
      text: "AIの答えは完成品ではなく材料です。どれを選んでもクリアになります。",
    }),
    el("div", { className: "verdict-choices" },
      VERDICT_DEFINITIONS.map(({ id, label, note }) => el("button", {
        type: "button",
        className: model.verdict === id ? "verdict-choice verdict-choice--active" : "verdict-choice",
        "data-verdict": id,
        ariaPressed: model.verdict === id,
      }, [
        el("strong", { text: label }),
        el("span", { className: "verdict-choice__note", text: note }),
      ]))),
  ]);
}

function referenceDetails() {
  const items = [
    el("section", {}, [
      el("h4", { text: "生成AIを開けないとき" }),
      el("p", {
        text: "生成AIを開けないときは、入力例を読み、どんな返事が来そうか考えるだけでも参加できます。",
      }),
    ]),
    el("section", {}, [
      el("h4", { text: "AIの答えは完成品ではなく材料" }),
      el("ul", {}, [
        el("li", { text: "そのまま使う：内容を確かめ、自分の考えと合うとき" }),
        el("li", { text: "一部を使う：役立つ部分だけを選ぶとき" }),
        el("li", { text: "自分で直す：自分の言葉や目的に合わせるとき" }),
        el("li", { text: "使わない：合わない、確かでない、安全でないとき" }),
      ]),
    ]),
  ];
  return el("details", { className: "reference-details" }, [
    el("summary", { text: "毎回共通の補足（材料の扱い・開けないとき）" }),
    ...items,
  ]);
}

// 安全上の注意は畳まない。入力欄を置いた画面なので、常に見えている必要がある。
function safetyBanner(model) {
  return el("p", { className: "safety-banner" }, [
    el("span", { className: "safety-banner__mark", text: "！", "aria-hidden": "true" }),
    el("span", { text: model.safety }),
  ]);
}

function renderDetail() {
  const quest = getQuestById(quests, activeQuestId);
  if (!quest) return;
  const model = createQuestViewModel(quest, progress);
  const route = quest[activeRoute];
  dialogTitle.textContent = model.title;

  const firstPrompt = resolveClearedNames(route.firstPrompt, clearedTitles(quests, progress));

  const routeSwitch = el("div", { className: "route-switch", role: "group", "aria-label": "試す場面" }, [
    el("button", {
      type: "button",
      text: "日常の困りごとで試す",
      "data-route": "daily",
      ariaPressed: activeRoute === "daily",
    }),
    el("button", {
      type: "button",
      text: "学校の困りごとで試す",
      "data-route": "school",
      ariaPressed: activeRoute === "school",
    }),
  ]);

  const sample = model.sampleMaterial
    ? el("p", { className: "sample-link" }, [
      el("a", {
        href: model.sampleMaterial.href,
        target: "_blank",
        rel: "noopener",
        text: model.sampleMaterial.label,
      }),
    ])
    : null;

  const children = [
    el("p", { className: "detail-meta" }, [
      el("span", { className: `quest-number quest-number--${model.area}`, text: String(model.id) }),
      el("span", { className: `area-label area-label--${model.area}`, text: model.areaLabel }),
      model.completed ? el("span", { className: "status status--complete", text: "✓ クリア済み" }) : null,
    ]),
    stepTracker(model),
    safetyBanner(model),
    // 文字だけの回は説明が自明なので、案内文は添付・撮影が要る回にだけ出す。
    el("section", { className: "detail-section input-mode" }, [
      el("h3", { text: "生成AIで使うもの" }),
      el("p", { className: "input-mode__label", text: model.inputModeLabel }),
      model.inputMode === "text"
        ? null
        : el("p", { className: "field-note", text: model.inputModeGuidance }),
    ]),
    routeSwitch,
    labeledSection("こんなときに", route.situation),
    actionBlock({
      number: "①",
      title: "まず、この文章を生成AIに入力してみよう",
      guidance: null,
      promptText: firstPrompt,
      promptName: "first",
      model,
      step: "sent",
      stepLabel: "AIに送った",
      extra: sample,
    }),
    el("section", { className: "detail-section action-block" }, [
      el("h3", { className: "action-block__title" }, [
        el("span", { className: "action-block__number", text: "②", "aria-hidden": "true" }),
        el("span", { text: "AIの回答を読んで、合わないところを伝えよう" }),
      ]),
      el("p", { className: "reflection", text: model.reflectPrompt }),
      el("p", { className: "screen-reader-only", text: "AIの回答を読んだら、続けてこの文章を入力しよう" }),
      followUpBuilder(model, route),
      stepButton(model, "replied", "自分の言葉で返した"),
    ]),
    verdictBlock(model),
  ];

  if (model.factCheck.required) {
    children.push(labeledSection(
      "AIの回答が正しいか、別の資料と比べよう",
      model.factCheck.method,
      "fact-check",
    ));
  }

  // 動機づけの情報は、実際にやることの後ろに置く。
  // 前に置くと、入力例が画面外へ押し出されてしまう。
  children.push(
    labeledSection("身につくこと", model.ability),
    el("section", { className: "detail-section quest-powers" }, [
      el("h3", { text: "このお題で経験する力" }),
      el("p", { className: "quest-powers__row" }, [
        powerIcon(model.primaryPower),
        el("span", { text: `主となる力：${model.primaryPowerName}　＋1` }),
      ]),
      el("p", { className: "quest-powers__row" }, [
        powerIcon(model.supportingPower),
        el("span", { text: `一緒に使う力：${model.supportingPowerName}　＋1` }),
      ]),
    ]),
    referenceDetails(model),
    el("div", { className: "detail-actions" }, [
      el("button", {
        type: "button",
        text: model.favoriteLabel,
        "data-toggle-favorite": String(model.id),
        ariaPressed: model.favorite,
      }),
      el("button", {
        type: "button",
        text: "このクエストのURLをコピー",
        "data-share": String(model.id),
      }),
      model.stepCount > 0
        ? el("button", {
          type: "button",
          className: "quiet-button",
          text: "このクエストの記録を消す",
          "data-clear-quest": String(model.id),
        })
        : null,
    ]),
    el("section", { className: "detail-section related-quests" }, [
      el("h3", { text: "関連クエスト" }),
      ...model.related.map((id) => {
        const relatedQuest = getQuestById(quests, id);
        return el("button", {
          type: "button",
          text: `クエスト ${id}：${relatedQuest.title}`,
          "data-open": String(id),
        });
      }),
    ]),
  );
  detailRoot.replaceChildren(...children);
}

function showDialog() {
  if (!dialog.open) {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }
  renderToast();
}

function openQuest(id, { updateHash = true, source = null } = {}) {
  const quest = getQuestById(quests, id);
  if (!quest) return;
  if (source && !dialog.open) {
    returnFocus = source;
    returnQuestId = quest.id;
  }
  activeQuestId = quest.id;
  followUpDraft = "";
  renderDetail();
  showDialog();
  if (updateHash && window.location.hash !== `#quest-${quest.id}`) {
    window.location.hash = `quest-${quest.id}`;
  }
  closeButton.focus();
}

function removeQuestHash() {
  if (parseQuestHash(window.location.hash)) {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }
}

function finishClose() {
  activeQuestId = null;
  followUpDraft = "";
  removeQuestHash();
  const selector = getQuestFocusSelector(returnQuestId);
  const replacement = selector ? questList.querySelector(selector) : null;
  const target = returnFocus?.isConnected ? returnFocus : replacement;
  returnFocus = null;
  returnQuestId = null;
  renderToast();
  if (target?.isConnected) {
    target.focus();
  } else {
    questList.tabIndex = -1;
    questList.focus();
  }
}

function closeQuest() {
  if (typeof dialog.close === "function" && dialog.open) {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
    finishClose();
  }
}

async function copyText(text, message) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(text);
    showToast(message);
    return true;
  } catch {
    return false;
  }
}

async function copyPrompt(button) {
  const prompt = detailRoot.querySelector(`[data-prompt="${button.dataset.copy}"]`);
  if (!prompt) return;
  const copied = await copyText(
    prompt.textContent,
    "コピーしました。ChatGPTなどの生成AIを開いて貼り付けてください。",
  );
  if (copied) return;
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(prompt);
  selection.removeAllRanges();
  selection.addRange(range);
  prompt.focus();
  showToast("文字を選択しました。コピー操作をしてください");
}

function refreshAll() {
  persist();
  renderProgress();
  renderSuggestion();
  renderCards();
  if (activeQuestId) renderDetail();
}

function announceCompletion(model, wasCompleted) {
  if (model.completed && !wasCompleted) {
    showToast(
      `クリアしました。${model.primaryPowerName}と${model.supportingPowerName}に1ポイントずつ加わりました。`,
    );
  } else if (!model.completed && wasCompleted) {
    showToast(
      `記録を戻しました。${model.primaryPowerName}と${model.supportingPowerName}から1ポイントずつ取り消しました。`,
    );
  }
}

function handleStep(step) {
  const quest = getQuestById(quests, activeQuestId);
  if (!quest) return;
  const before = createQuestViewModel(quest, progress);
  progress = before.steps.includes(step)
    ? unmarkStep(progress, quest.id, step)
    : markStep(progress, quest.id, step, { route: activeRoute });
  refreshAll();
  announceCompletion(createQuestViewModel(quest, progress), before.completed);
}

function handleVerdict(verdict) {
  const quest = getQuestById(quests, activeQuestId);
  if (!quest) return;
  const before = createQuestViewModel(quest, progress);
  progress = setVerdict(progress, quest.id, verdict, { route: activeRoute });
  refreshAll();
  announceCompletion(createQuestViewModel(quest, progress), before.completed);
}

function renderPowersGuide() {
  powersGuideList.replaceChildren(...POWER_DEFINITIONS.map((power) =>
    el("li", {}, [
      powerIcon(power.id),
      el("strong", { text: power.name }),
      el("span", { text: `：${power.description}` }),
    ])));
}

function loadPowersGuideImage() {
  if (powersImageLoaded) return;
  const source = powersDialog.querySelector("source[data-srcset]");
  const image = powersDialog.querySelector("img[data-src]");
  if (source) source.srcset = source.dataset.srcset;
  if (image) image.src = image.dataset.src;
  powersImageLoaded = true;
}

function openPowersGuide() {
  loadPowersGuideImage();
  if (typeof powersDialog.showModal === "function") powersDialog.showModal();
  else powersDialog.setAttribute("open", "");
  closePowersDialogButton.focus();
}

function closePowersGuide() {
  if (typeof powersDialog.close === "function" && powersDialog.open) {
    powersDialog.close();
  } else {
    powersDialog.removeAttribute("open");
    openPowersGuideButton.focus();
  }
}

function closeResetConfirmation() {
  resetConfirmation.hidden = true;
  resetButton.setAttribute("aria-expanded", "false");
  resetButton.focus();
}

function resetProgress() {
  let cleared = false;
  if (storage) {
    try {
      clearProgress(storage);
      cleared = true;
    } catch {
      showStorageWarning();
    }
  }
  progress = emptyProgress();
  renderProgress();
  renderSuggestion();
  renderCards();
  if (activeQuestId) renderDetail();
  closeResetConfirmation();
  showToast(cleared
    ? "進み具合をリセットしました"
    : "端末に保存された進み具合を削除できませんでした");
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.filter) {
    activeFilter = button.dataset.filter;
    renderFilters();
    renderCards();
  } else if (button.dataset.nextSuggestion) {
    suggestionOffset += 1;
    renderSuggestion();
  } else if (button.dataset.open) {
    openQuest(Number(button.dataset.open), { source: button });
  } else if (button.dataset.route) {
    activeRoute = button.dataset.route;
    followUpDraft = "";
    renderDetail();
  } else if (button.dataset.copy) {
    copyPrompt(button);
  } else if (button.dataset.hint) {
    const input = detailRoot.querySelector("#follow-up-input");
    if (input) {
      input.value = button.dataset.hint;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    }
  } else if (button.dataset.step) {
    handleStep(button.dataset.step);
  } else if (button.dataset.verdict) {
    handleVerdict(button.dataset.verdict);
  } else if (button.dataset.share) {
    const url = `${window.location.origin}${window.location.pathname}#quest-${button.dataset.share}`;
    copyText(url, "このクエストのURLをコピーしました").then((copied) => {
      if (!copied) showToast(`コピーできませんでした。${url}`);
    });
  } else if (button.dataset.clearQuest) {
    progress = clearQuest(progress, Number(button.dataset.clearQuest));
    refreshAll();
    showToast("このクエストの記録を消しました");
  } else if (button.dataset.toggleFavorite) {
    progress = toggleFavorite(progress, Number(button.dataset.toggleFavorite));
    refreshAll();
  } else if (button === resetButton) {
    resetConfirmation.hidden = false;
    resetButton.setAttribute("aria-expanded", "true");
    confirmResetButton.focus();
  } else if (button === confirmResetButton) {
    resetProgress();
  } else if (button === cancelResetButton) {
    closeResetConfirmation();
  } else if (button === openPowersGuideButton) {
    openPowersGuide();
  } else if (button === closePowersDialogButton) {
    closePowersGuide();
  }
});

closeButton.addEventListener("click", closeQuest);
dialog.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    closeQuest();
  }
});
dialog.addEventListener("close", finishClose);
powersDialog.addEventListener("close", () => openPowersGuideButton.focus());
window.addEventListener("hashchange", () => {
  const hash = classifyQuestHash(window.location.hash);
  if (hash.type === "valid") {
    openQuest(hash.id, { updateHash: false });
  } else if (hash.type === "empty" && dialog.open) {
    closeQuest();
  }
});

if (!storage) {
  showStorageWarning();
} else {
  try {
    checkStorageAvailability(storage);
    // 旧形式から読み込んだときは、その場で新形式へ書き戻しておく
    if (storage.getItem(STORAGE_KEY) === null && storage.getItem(LEGACY_STORAGE_KEY) !== null) {
      persist();
    }
  } catch {
    showStorageWarning();
  }
}
resetControls.hidden = false;
renderProgress();
renderSuggestion();
renderPowersGuide();
renderFilters();
renderCards();
const initialHash = classifyQuestHash(window.location.hash);
if (initialHash.type === "valid") {
  openQuest(initialHash.id, { updateHash: false });
}
