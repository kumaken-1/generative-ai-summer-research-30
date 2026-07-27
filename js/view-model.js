import { POWER_DEFINITIONS } from "./powers.js";
import {
  BADGE_DEFINITIONS,
  STEP_DEFINITIONS,
  STEP_IDS,
  VERDICT_DEFINITIONS,
  completedIds,
  normalizeProgress,
} from "./state.js";

export const AREA_LABELS = {
  text: "文字で話す",
  media: "写真や文章",
  thinking: "自分の使い方",
};

export const INPUT_MODE_LABELS = {
  text: "文字だけ",
  camera: "カメラ・写真",
  paste: "文章を貼り付け",
  document: "文書を添付",
  image: "画像を添付",
};

export const INPUT_MODE_GUIDANCE = {
  text: "下の文章をコピーし、ChatGPTなどの生成AIの入力欄へ貼り付けて送ります。",
  camera: "個人情報が入っていないことを確認し、生成AIの画面で撮影するか写真を選んで添付してから、下の文章を送ります。",
  paste: "個人情報を除いた文章を生成AIの入力欄へ貼り付け、続けて下の文章を送ります。",
  document: "個人情報を含まない、公開可能な文書だけを生成AIに添付し、下の文章を送ります。",
  image: "個人情報を隠した公開可能な画像だけを生成AIに添付し、下の文章を送ります。",
};

// 添付や貼り付けが必要なクエストで使う練習用素材。
// 「まず公開資料を探してくる」で止まらないようにする。
export const SAMPLE_MATERIALS = {
  document: {
    href: "./assets/sample-notice.md",
    label: "練習用の公開文書をひらく（架空の通知文）",
  },
  image: {
    href: "./assets/sample-screen.svg",
    label: "練習用の画面画像をひらく（架空の案内画面）",
  },
  paste: {
    href: "./assets/sample-draft.md",
    label: "練習用の下書きをひらく（架空のお便り案）",
  },
};

export const BADGE_LABELS = Object.fromEntries(
  BADGE_DEFINITIONS.map(({ id, label }) => [id, label]),
);

export const BADGE_HINTS = Object.fromEntries(
  BADGE_DEFINITIONS.map(({ id, hint }) => [id, hint]),
);

export const STEP_LABELS = Object.fromEntries(
  STEP_DEFINITIONS.map(({ id, label }) => [id, label]),
);

export const VERDICT_LABELS = Object.fromEntries(
  VERDICT_DEFINITIONS.map(({ id, label }) => [id, label]),
);

export const BLANK_MARKER = "____";
export const BLANK_PLACEHOLDER = "　　　　";
export const CLEARED_MARKER = "{{cleared}}";
export const CLEARED_FALLBACK = "いくつかのクエスト";

export function filterQuests(quests, area) {
  return AREA_LABELS[area] ? quests.filter((quest) => quest.area === area) : quests;
}

export function parseQuestHash(hash) {
  const match = /^#quest-(\d+)$/.exec(hash);
  const id = match ? Number(match[1]) : 0;
  return Number.isInteger(id) && id >= 1 && id <= 30 ? id : null;
}

export function classifyQuestHash(hash) {
  if (hash === "") {
    return { type: "empty", id: null };
  }
  const id = parseQuestHash(hash);
  return id === null
    ? { type: "invalid", id: null }
    : { type: "valid", id };
}

export function getQuestById(quests, id) {
  const numericId = typeof id === "string" && /^\d+$/.test(id) ? Number(id) : id;
  return quests.find((quest) => quest.id === numericId) ?? null;
}

export function getQuestFocusSelector(id) {
  return Number.isInteger(id) && id >= 1 && id <= 30
    ? `[data-open="${id}"]`
    : null;
}

// 「私は『____』が気になりました。」を、入力欄の前後に割る。
export function splitFollowUpTemplate(template) {
  const text = String(template ?? "");
  const index = text.indexOf(BLANK_MARKER);
  return index === -1
    ? { before: text, after: "" }
    : { before: text.slice(0, index), after: text.slice(index + BLANK_MARKER.length) };
}

export function buildFollowUpText(template, value = "") {
  const filled = String(value ?? "").trim();
  return String(template ?? "")
    .replace(BLANK_MARKER, filled === "" ? BLANK_PLACEHOLDER : filled);
}

// クエスト30の入力例に、その人が実際にクリアしたクエスト名を差し込む。
export function resolveClearedNames(text, titles = []) {
  const source = String(text ?? "");
  if (!source.includes(CLEARED_MARKER)) return source;
  const names = titles.filter(Boolean);
  const replacement = names.length
    ? names.slice(-3).map((title) => `「${title}」`).join("と")
    : CLEARED_FALLBACK;
  return source.replaceAll(CLEARED_MARKER, replacement);
}

export function clearedTitles(quests, progress) {
  const cleared = new Set(completedIds(progress));
  return quests.filter((quest) => cleared.has(quest.id)).map((quest) => quest.title);
}

// 迷ったときの候補。日付には結びつけない。
// 1日に何個やっても、何もしない日があってもよく、進める速さは利用者が決める。
export function uncompletedQuestIds(quests, progress) {
  const cleared = new Set(completedIds(progress));
  return quests.filter((quest) => !cleared.has(quest.id)).map((quest) => quest.id);
}

// まだ試していないものから1つ返す。利用者が「別のにする」を押すたびに offset が進む。
export function getSuggestionId(quests, progress, offset = 0) {
  const remaining = uncompletedQuestIds(quests, progress);
  if (remaining.length === 0) return null;
  const index = ((offset % remaining.length) + remaining.length) % remaining.length;
  return remaining[index];
}

export function createQuestViewModel(quest, progress) {
  const normalized = normalizeProgress(progress);
  const steps = normalized.steps[quest.id] ?? [];
  const completed = STEP_IDS.every((step) => steps.includes(step));
  const favorite = normalized.favorites.includes(quest.id);
  const powerNames = new Map(POWER_DEFINITIONS.map(({ id, name }) => [id, name]));
  const verdict = normalized.verdicts[quest.id] ?? null;

  return {
    ...quest,
    areaLabel: AREA_LABELS[quest.area],
    inputModeLabel: INPUT_MODE_LABELS[quest.inputMode],
    inputModeGuidance: INPUT_MODE_GUIDANCE[quest.inputMode],
    sampleMaterial: SAMPLE_MATERIALS[quest.inputMode] ?? null,
    primaryPowerName: powerNames.get(quest.primaryPower) ?? "力の情報を確認中",
    supportingPowerName: powerNames.get(quest.supportingPower) ?? "力の情報を確認中",
    steps,
    stepCount: steps.length,
    completed,
    verdict,
    verdictLabel: verdict ? VERDICT_LABELS[verdict] : null,
    routesTried: normalized.routes[quest.id] ?? [],
    favorite,
    completionLabel: completed
      ? "クリア済み"
      : steps.length === 0
        ? "未クリア"
        : `あと${STEP_IDS.length - steps.length}ステップ`,
    favoriteLabel: favorite ? "お気に入りから外す" : "お気に入りに追加",
  };
}
