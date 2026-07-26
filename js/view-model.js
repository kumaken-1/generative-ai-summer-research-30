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

export const BADGE_LABELS = {
  "first-step": "はじめの一歩",
  "tried-a-little": "ちょっと聞いてみた",
  beginner: "孫の手ビギナー",
  "summer-research": "夏の自由研究達成",
  "three-worlds": "三つの世界を旅した",
  "secret-complete": "30クエスト達成（隠し称号）",
};

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

export function createQuestViewModel(quest, progress) {
  const completed = progress.completed.includes(quest.id);
  const favorite = progress.favorites.includes(quest.id);
  return {
    ...quest,
    areaLabel: AREA_LABELS[quest.area],
    inputModeLabel: INPUT_MODE_LABELS[quest.inputMode],
    inputModeGuidance: INPUT_MODE_GUIDANCE[quest.inputMode],
    completed,
    favorite,
    completionLabel: completed ? "クリア済み" : "未クリア",
    favoriteLabel: favorite ? "お気に入りから外す" : "お気に入りに追加",
  };
}
