export const STORAGE_KEY = "ai-summer-research-30-progress-v2";
export const LEGACY_STORAGE_KEY = "ai-summer-research-30-progress-v1";

export const STEP_DEFINITIONS = [
  { id: "sent", label: "AIに送った", hint: "①の文章をコピーして、生成AIに送りました" },
  { id: "replied", label: "自分の言葉で返した", hint: "②の空欄を埋めて、もう一言返しました" },
  { id: "decided", label: "使い方を決めた", hint: "そのまま使う・直す・使わないを自分で決めました" },
];

export const STEP_IDS = STEP_DEFINITIONS.map(({ id }) => id);

export const VERDICT_DEFINITIONS = [
  { id: "as-is", label: "そのまま使える", note: "内容を確かめ、自分の考えと合っていた" },
  { id: "edit", label: "直せば使える", note: "役立つ部分を選び、自分の言葉に直した" },
  { id: "skip", label: "使わない", note: "合わない、確かでない、安全でないと判断した" },
];

export const VERDICT_IDS = VERDICT_DEFINITIONS.map(({ id }) => id);

export const ROUTE_IDS = ["daily", "school"];

export const BADGE_DEFINITIONS = [
  { id: "first-step", label: "はじめの一歩", hint: "1つクリアする" },
  { id: "tried-a-little", label: "ちょっと聞いてみた", hint: "3つクリアする" },
  { id: "beginner", label: "孫の手ビギナー", hint: "5つクリアする" },
  { id: "three-worlds", label: "三つの世界を旅した", hint: "3つのエリアそれぞれで1つクリアする" },
  { id: "both-routes", label: "二刀流", hint: "同じクエストを日常と学校の両方で試す" },
  { id: "said-no", label: "使わない勇気", hint: "「使わない」を1回選ぶ" },
  { id: "many-days", label: "三日通った", hint: "3日に分けて取り組む" },
  { id: "fact-checker", label: "原典にあたる人", hint: "確かめが必要なクエストを3つクリアする" },
  { id: "summer-research", label: "夏の自由研究達成", hint: "10クリアする" },
  { id: "all-powers", label: "七つの力に触れた", hint: "7つの力すべてに1ポイント以上ためる" },
  { id: "secret-complete", label: "30クエスト達成（隠し称号）", hint: "30すべてクリアする" },
];

const QUEST_MIN = 1;
const QUEST_MAX = 30;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isQuestId(value) {
  return Number.isInteger(value) && value >= QUEST_MIN && value <= QUEST_MAX;
}

function toQuestId(value) {
  const numeric = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return isQuestId(numeric) ? numeric : null;
}

export function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(toQuestId).filter((id) => id !== null))].sort((a, b) => a - b);
}

function normalizeIdKeyedList(value, allowed) {
  const result = {};
  if (!value || typeof value !== "object") return result;
  for (const [key, entries] of Object.entries(value)) {
    const id = toQuestId(key);
    if (id === null || !Array.isArray(entries)) continue;
    const kept = allowed.filter((item) => entries.includes(item));
    if (kept.length) result[id] = kept;
  }
  return result;
}

function normalizeIdKeyedValue(value, allowed) {
  const result = {};
  if (!value || typeof value !== "object") return result;
  for (const [key, entry] of Object.entries(value)) {
    const id = toQuestId(key);
    if (id === null || !allowed.includes(entry)) continue;
    result[id] = entry;
  }
  return result;
}

function normalizeDays(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((day) => typeof day === "string" && DATE_PATTERN.test(day)))]
    .sort();
}

export function normalizeProgress(value) {
  const steps = normalizeIdKeyedList(value?.steps, STEP_IDS);
  const verdicts = normalizeIdKeyedValue(value?.verdicts, VERDICT_IDS);
  for (const id of Object.keys(verdicts)) {
    if (!steps[id]?.includes("decided")) delete verdicts[id];
  }
  return {
    favorites: normalizeIds(value?.favorites),
    steps,
    verdicts,
    routes: normalizeIdKeyedList(value?.routes, ROUTE_IDS),
    days: normalizeDays(value?.days),
  };
}

export function emptyProgress() {
  return normalizeProgress(null);
}

export function migrateLegacyProgress(value) {
  const progress = emptyProgress();
  progress.favorites = normalizeIds(value?.favorites);
  for (const id of normalizeIds(value?.completed)) {
    progress.steps[id] = [...STEP_IDS];
  }
  return progress;
}

export function completedIds(progress) {
  const normalized = normalizeProgress(progress);
  return Object.entries(normalized.steps)
    .filter(([, done]) => STEP_IDS.every((step) => done.includes(step)))
    .map(([id]) => Number(id))
    .sort((a, b) => a - b);
}

export function isStepDone(progress, id, step) {
  return Boolean(normalizeProgress(progress).steps[toQuestId(id)]?.includes(step));
}

export function nextStep(progress, id) {
  const done = normalizeProgress(progress).steps[toQuestId(id)] ?? [];
  return STEP_IDS.find((step) => !done.includes(step)) ?? null;
}

export function toggleFavorite(progress, id) {
  const normalized = normalizeProgress(progress);
  const questId = toQuestId(id);
  if (questId === null) return normalized;
  normalized.favorites = normalized.favorites.includes(questId)
    ? normalized.favorites.filter((value) => value !== questId)
    : [...normalized.favorites, questId].sort((a, b) => a - b);
  return normalized;
}

export function markStep(progress, id, step, { route = null, date = todayKey() } = {}) {
  const normalized = normalizeProgress(progress);
  const questId = toQuestId(id);
  if (questId === null || !STEP_IDS.includes(step)) return normalized;

  const done = new Set(normalized.steps[questId] ?? []);
  done.add(step);
  normalized.steps[questId] = STEP_IDS.filter((item) => done.has(item));

  if (ROUTE_IDS.includes(route)) {
    const routes = new Set(normalized.routes[questId] ?? []);
    routes.add(route);
    normalized.routes[questId] = ROUTE_IDS.filter((item) => routes.has(item));
  }
  if (typeof date === "string" && DATE_PATTERN.test(date) && !normalized.days.includes(date)) {
    normalized.days = [...normalized.days, date].sort();
  }
  return normalized;
}

export function unmarkStep(progress, id, step) {
  const normalized = normalizeProgress(progress);
  const questId = toQuestId(id);
  if (questId === null || !STEP_IDS.includes(step)) return normalized;

  const cutoff = STEP_IDS.indexOf(step);
  const kept = (normalized.steps[questId] ?? [])
    .filter((item) => STEP_IDS.indexOf(item) < cutoff);
  if (kept.length) normalized.steps[questId] = kept;
  else delete normalized.steps[questId];
  delete normalized.verdicts[questId];
  return normalized;
}

export function setVerdict(progress, id, verdict, options = {}) {
  const questId = toQuestId(id);
  if (questId === null || !VERDICT_IDS.includes(verdict)) return normalizeProgress(progress);
  const normalized = markStep(progress, questId, "decided", options);
  normalized.verdicts[questId] = verdict;
  return normalized;
}

export function clearQuest(progress, id) {
  const normalized = normalizeProgress(progress);
  const questId = toQuestId(id);
  if (questId === null) return normalized;
  delete normalized.steps[questId];
  delete normalized.verdicts[questId];
  delete normalized.routes[questId];
  return normalized;
}

export function verdictCounts(progress) {
  const normalized = normalizeProgress(progress);
  const counts = Object.fromEntries(VERDICT_IDS.map((id) => [id, 0]));
  for (const verdict of Object.values(normalized.verdicts)) counts[verdict] += 1;
  return counts;
}

export function earnedBadges(progress, quests = [], powerProgress = null) {
  const normalized = normalizeProgress(progress);
  const cleared = completedIds(normalized);
  const clearedSet = new Set(cleared);
  const badges = new Set();

  if (cleared.length >= 1) badges.add("first-step");
  if (cleared.length >= 3) badges.add("tried-a-little");
  if (cleared.length >= 5) badges.add("beginner");
  if (cleared.length >= 10) badges.add("summer-research");
  if (cleared.length === QUEST_MAX) badges.add("secret-complete");

  const clearedAreas = new Set(
    quests.filter((quest) => clearedSet.has(quest.id)).map((quest) => quest.area),
  );
  if (clearedAreas.size >= 3) badges.add("three-worlds");

  if (Object.values(normalized.routes).some((routes) => routes.length >= 2)) {
    badges.add("both-routes");
  }
  if (Object.values(normalized.verdicts).includes("skip")) badges.add("said-no");
  if (normalized.days.length >= 3) badges.add("many-days");

  const factCheckCleared = quests
    .filter((quest) => quest.factCheck?.required && clearedSet.has(quest.id)).length;
  if (factCheckCleared >= 3) badges.add("fact-checker");

  const byPower = powerProgress?.byPower;
  const powerValues = byPower ? Object.values(byPower) : [];
  if (powerValues.length && powerValues.every((points) => points.earned >= 1)) {
    badges.add("all-powers");
  }

  return BADGE_DEFINITIONS.map(({ id }) => id).filter((id) => badges.has(id));
}

export function getLocalStorageSafely(scope = globalThis) {
  try {
    return scope.localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadProgress(storage = window.localStorage) {
  try {
    const stored = storage.getItem(STORAGE_KEY);
    if (stored !== null) return normalizeProgress(JSON.parse(stored));
    const legacy = storage.getItem(LEGACY_STORAGE_KEY);
    if (legacy !== null) return migrateLegacyProgress(JSON.parse(legacy));
    return emptyProgress();
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress, storage = window.localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(normalizeProgress(progress)));
}

export function checkStorageAvailability(storage = window.localStorage) {
  const stored = storage.getItem(STORAGE_KEY);
  if (stored === null) {
    storage.setItem(STORAGE_KEY, JSON.stringify(emptyProgress()));
    storage.removeItem(STORAGE_KEY);
  } else {
    storage.setItem(STORAGE_KEY, stored);
  }
}

export function clearProgress(storage = window.localStorage) {
  storage.removeItem(STORAGE_KEY);
  storage.removeItem(LEGACY_STORAGE_KEY);
}
