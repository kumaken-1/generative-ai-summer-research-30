import { quests } from "./quests.js";
import {
  checkStorageAvailability,
  clearProgress,
  earnedBadges,
  loadProgress,
  saveProgress,
  toggleCompleted,
  toggleFavorite,
} from "./state.js";
import {
  AREA_LABELS,
  BADGE_LABELS,
  classifyQuestHash,
  createQuestViewModel,
  filterQuests,
  getQuestFocusSelector,
  getQuestById,
  parseQuestHash,
} from "./view-model.js";

const progressRoot = document.querySelector("#progress");
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

let progress = loadProgress();
let storageAvailable = true;
let activeFilter = "all";
let activeQuestId = null;
let activeRoute = "daily";
let returnFocus = null;
let returnQuestId = null;
let toastTimer;
let toastMessage = "";

function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(options)) {
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("data-")) node.setAttribute(key, value);
    else if (key === "ariaPressed") node.setAttribute("aria-pressed", String(value));
    else node[key] = value;
  }
  node.append(...children.filter(Boolean));
  return node;
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
    saveProgress(progress);
  } catch {
    showStorageWarning();
  }
}

function renderProgress() {
  const count = progress.completed.length;
  const meter = el("progress", {
    className: "progress-meter",
    max: 30,
    value: count,
    ariaLabel: `30クエスト中${count}件クリア`,
  });
  const badges = earnedBadges(progress.completed);
  const badgeList = el("ul", { className: "badge-list" });
  if (badges.length) {
    for (const badge of badges) {
      badgeList.append(el("li", { className: "badge", text: BADGE_LABELS[badge] }));
    }
  } else {
    badgeList.append(el("li", { className: "badge badge--empty", text: "称号はまだありません" }));
  }
  progressRoot.replaceChildren(
    el("p", { className: "progress-count" }, [
      el("strong", { text: `${count} / 30` }),
      document.createTextNode(" クエストをクリア"),
    ]),
    meter,
    el("h3", { text: "獲得称号" }),
    badgeList,
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
  const status = el("p", { className: "quest-status" }, [
    el("span", {
      className: model.completed ? "status status--complete" : "status",
      text: `${model.completed ? "✓ " : "□ "}${model.completionLabel}`,
    }),
    el("span", {
      className: model.favorite ? "status status--favorite" : "status",
      text: `${model.favorite ? "★" : "☆"} ${model.favorite ? "お気に入り" : "お気に入り未登録"}`,
    }),
  ]);
  return el("article", {
    className: "quest-card",
    "data-area": model.area,
    "data-quest-id": String(model.id),
  }, [
    el("p", { className: "quest-card__top" }, [
      el("span", { className: "quest-number", text: `クエスト ${model.id}` }),
      el("span", { className: `area-label area-label--${model.area}`, text: model.areaLabel }),
    ]),
    el("h3", { className: "quest-title", text: model.title }),
    el("p", { className: "quest-ability", text: model.ability }),
    el("p", { className: "quest-meta", text: `入力方法：${model.inputModeLabel}` }),
    status,
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

function copySection(title, text, name) {
  return el("section", { className: "detail-section" }, [
    el("h3", { text: title }),
    el("p", { className: "prompt-box", text, "data-prompt": name, tabIndex: -1 }),
    el("button", {
      type: "button",
      className: "copy-button",
      text: "入力文をコピー",
      "data-copy": name,
    }),
  ]);
}

function renderDetail() {
  const quest = getQuestById(quests, activeQuestId);
  if (!quest) return;
  const model = createQuestViewModel(quest, progress);
  const route = quest[activeRoute];
  dialogTitle.textContent = model.title;

  const routeSwitch = el("div", { className: "route-switch", role: "group", ariaLabel: "試す場面" }, [
    el("button", {
      type: "button",
      text: "日常で試す",
      "data-route": "daily",
      ariaPressed: activeRoute === "daily",
    }),
    el("button", {
      type: "button",
      text: "学校で試す",
      "data-route": "school",
      ariaPressed: activeRoute === "school",
    }),
  ]);

  const related = el("section", { className: "detail-section related-quests" }, [
    el("h3", { text: "関連クエスト" }),
    ...model.related.map((id) => {
      const relatedQuest = getQuestById(quests, id);
      return el("button", {
        type: "button",
        text: `クエスト ${id}：${relatedQuest.title}`,
        "data-open": String(id),
      });
    }),
  ]);

  const children = [
    el("p", { className: "quest-number", text: `クエスト ${model.id}` }),
    el("p", { className: `area-label area-label--${model.area}`, text: model.areaLabel }),
    labeledSection("身につくこと", model.ability),
    labeledSection("入力方法", model.inputModeLabel),
    routeSwitch,
    labeledSection("こんなときに", route.situation),
    copySection("最初の一言", route.firstPrompt, "first"),
    labeledSection("自分はどう思う？", model.reflectPrompt, "reflection"),
    copySection("自分の考えを、もう一言", route.followUp, "follow-up"),
    labeledSection(
      "生成AIを開けないとき",
      "生成AIを開けないときは、入力例を読み、どんな返事が来そうか考えるだけでも参加できます。",
      "alternative-participation",
    ),
  ];
  if (model.factCheck.required) {
    children.push(labeledSection("事実を確かめる", model.factCheck.method, "fact-check"));
  }
  children.push(
    labeledSection("安全に使うために", model.safety, "safety-note"),
    el("aside", { className: "material-note" }, [
      el("strong", { text: "AIの答えは完成品ではなく材料" }),
      el("p", { text: "答えを見たら、自分でどう使うかを決めます。" }),
      el("ul", {}, [
        el("li", { text: "そのまま使う：内容を確かめ、自分の考えと合うとき" }),
        el("li", { text: "一部を使う：役立つ部分だけを選ぶとき" }),
        el("li", { text: "自分で直す：自分の言葉や目的に合わせるとき" }),
        el("li", { text: "使わない：合わない、確かでない、安全でないとき" }),
      ]),
    ]),
    el("div", { className: "detail-actions" }, [
      el("button", {
        type: "button",
        text: model.favoriteLabel,
        "data-toggle-favorite": String(model.id),
        ariaPressed: model.favorite,
      }),
      el("button", {
        type: "button",
        text: model.completed ? "クリアを取り消す" : "クリアにする",
        "data-toggle-completed": String(model.id),
        ariaPressed: model.completed,
      }),
    ]),
    related,
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
  activeRoute = "daily";
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

async function copyPrompt(button) {
  const prompt = detailRoot.querySelector(`[data-prompt="${button.dataset.copy}"]`);
  if (!prompt) return;
  const text = prompt.textContent;
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(text);
    showToast("入力文をコピーしました");
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(prompt);
    selection.removeAllRanges();
    selection.addRange(range);
    prompt.focus();
    showToast("文字を選択しました。コピー操作をしてください");
  }
}

function updateProgress(kind, id) {
  progress = kind === "completed"
    ? toggleCompleted(progress, id)
    : toggleFavorite(progress, id);
  persist();
  renderProgress();
  renderCards();
  if (activeQuestId) renderDetail();
}

function closeResetConfirmation() {
  resetConfirmation.hidden = true;
  resetButton.setAttribute("aria-expanded", "false");
  resetButton.focus();
}

function resetProgress() {
  let cleared = true;
  try {
    clearProgress();
  } catch {
    cleared = false;
    showStorageWarning();
  }
  progress = { completed: [], favorites: [] };
  renderProgress();
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
  } else if (button.dataset.open) {
    openQuest(Number(button.dataset.open), { source: button });
  } else if (button.dataset.route) {
    activeRoute = button.dataset.route;
    renderDetail();
  } else if (button.dataset.copy) {
    copyPrompt(button);
  } else if (button.dataset.toggleCompleted) {
    updateProgress("completed", Number(button.dataset.toggleCompleted));
  } else if (button.dataset.toggleFavorite) {
    updateProgress("favorite", Number(button.dataset.toggleFavorite));
  } else if (button === resetButton) {
    resetConfirmation.hidden = false;
    resetButton.setAttribute("aria-expanded", "true");
    confirmResetButton.focus();
  } else if (button === confirmResetButton) {
    resetProgress();
  } else if (button === cancelResetButton) {
    closeResetConfirmation();
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
window.addEventListener("hashchange", () => {
  const hash = classifyQuestHash(window.location.hash);
  if (hash.type === "valid") {
    openQuest(hash.id, { updateHash: false });
  } else if (hash.type === "empty" && dialog.open) {
    closeQuest();
  }
});

try {
  checkStorageAvailability();
} catch {
  showStorageWarning();
}
resetControls.hidden = false;
renderProgress();
renderFilters();
renderCards();
const initialHash = classifyQuestHash(window.location.hash);
if (initialHash.type === "valid") {
  openQuest(initialHash.id, { updateHash: false });
}
