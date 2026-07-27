import { CATEGORIES } from "./challenges.js";
import { isTried } from "./state.js";

// 操作の種類。ラベルとアイコンを主、色を従にする。
// 色が見分けられなくても、ラベルだけで何をするか決まるようにしておく。
export const SEND_TYPES = {
  asis: {
    id: "asis",
    label: "そのままコピーして送る",
    short: "そのままコピー",
    icon: "copy",
  },
  paste: {
    id: "paste",
    label: "自分の文を貼ってから送る",
    short: "自分の文を貼る",
    icon: "paste",
  },
  attach: {
    id: "attach",
    label: "写真・資料を添付してから送る",
    short: "写真・資料を添付",
    icon: "attach",
  },
};

export const FILL_TYPE = {
  id: "fill",
  label: "空欄をうめてから送る",
  short: "空欄をうめる",
  icon: "pencil",
};

// 30本から参照する共通の補足。チャレンジごとに書き分けない。
export const HELP_TEXTS = {
  attach: {
    title: "添付ボタンの場所",
    body: "ChatGPTなら入力欄の左にあるクリップ（＋）の形のボタンです。押すと「写真を撮る」「ファイルを選ぶ」が出ます。Geminiなら画像のアイコンです。",
  },
  once: {
    title: "1回で送る",
    body: "送信は1回だけです。先に写真や資料を送ってから文章を別に送るのではなく、添付が付いた状態で文章を入れて、1回押します。",
  },
  newmsg: {
    title: "新しいメッセージ",
    body: "同じ会話の続きに、もう一度入力して送ります。新しい会話を始める必要はありません。前のやりとりはAIが覚えています。",
  },
  paste: {
    title: "貼り付け",
    body: "長い文でもかまいません。改行が入っていても大丈夫です。携帯なら、コピーしたあと入力欄を長押しすると「ペースト」が出ます。",
  },
};

export const FOLLOW_UP_STEPS = [
  { text: "下の空欄を、自分の言葉でうめます" },
  { text: "できた文を、新しいメッセージとして送信します", help: "newmsg" },
];

export const SAFETY_NOTE =
  "児童・保護者・職員の名前や、個人が分かる情報、学校の機密情報は入力しません。";

export const BLANK_MARKER = "____";
export const BLANK_PLACEHOLDER = "　　　　";

export const CATEGORY_NAMES = Object.fromEntries(
  CATEGORIES.map(({ id, name }) => [id, name]),
);

export function categoryCounts(challenges) {
  return CATEGORIES.map((category) => ({
    ...category,
    count: challenges.filter((item) => item.category === category.id).length,
  }));
}

export function filterChallenges(challenges, category) {
  return CATEGORY_NAMES[category]
    ? challenges.filter((item) => item.category === category)
    : challenges;
}

export function parseChallengeHash(hash) {
  const match = /^#c-(\d+)$/.exec(hash);
  const id = match ? Number(match[1]) : 0;
  return Number.isInteger(id) && id >= 1 && id <= 30 ? id : null;
}

export function classifyChallengeHash(hash) {
  if (hash === "") return { type: "empty", id: null };
  const id = parseChallengeHash(hash);
  return id === null ? { type: "invalid", id: null } : { type: "valid", id };
}

export function getChallengeById(challenges, id) {
  const numeric = typeof id === "string" && /^\d+$/.test(id) ? Number(id) : id;
  return challenges.find((item) => item.id === numeric) ?? null;
}

export function getFocusSelector(id) {
  return Number.isInteger(id) && id >= 1 && id <= 30 ? `[data-open="${id}"]` : null;
}

export function splitTemplate(template) {
  const text = String(template ?? "");
  const index = text.indexOf(BLANK_MARKER);
  return index === -1
    ? { before: text, after: "" }
    : { before: text.slice(0, index), after: text.slice(index + BLANK_MARKER.length) };
}

export function buildFilledText(template, value = "") {
  const filled = String(value ?? "").trim();
  return String(template ?? "")
    .replace(BLANK_MARKER, filled === "" ? BLANK_PLACEHOLDER : filled);
}

// 手順の番号は「1回目」から「2回目」まで通しで振る。
// 返事を挟んだ一続きの流れとして見せるため、途中で1に戻さない。
export function numberedSteps(challenge) {
  const send = challenge.send.steps.map((step, index) => ({ ...step, number: index + 1 }));
  const offset = send.length;
  const follow = FOLLOW_UP_STEPS.map((step, index) => ({ ...step, number: offset + index + 1 }));
  return { send, follow };
}

export function createViewModel(challenge, tried) {
  return {
    ...challenge,
    categoryName: CATEGORY_NAMES[challenge.category] ?? "",
    sendType: SEND_TYPES[challenge.send.type] ?? SEND_TYPES.asis,
    steps: numberedSteps(challenge),
    tried: isTried(tried, challenge.id),
  };
}
