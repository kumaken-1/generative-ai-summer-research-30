export const STORAGE_KEY = "ai-summer-research-30-tried-v3";
export const LEGACY_STORAGE_KEYS = [
  "ai-summer-research-30-progress-v2",
  "ai-summer-research-30-progress-v1",
];

const MIN_ID = 1;
const MAX_ID = 30;

function toChallengeId(value) {
  const numeric = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return Number.isInteger(numeric) && numeric >= MIN_ID && numeric <= MAX_ID ? numeric : null;
}

export function normalizeTried(value) {
  const list = Array.isArray(value) ? value : value?.tried;
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map(toChallengeId).filter((id) => id !== null))].sort((a, b) => a - b);
}

export function isTried(tried, id) {
  const challengeId = toChallengeId(id);
  return challengeId !== null && normalizeTried(tried).includes(challengeId);
}

export function toggleTried(tried, id) {
  const current = normalizeTried(tried);
  const challengeId = toChallengeId(id);
  if (challengeId === null) return current;
  return current.includes(challengeId)
    ? current.filter((value) => value !== challengeId)
    : [...current, challengeId].sort((a, b) => a - b);
}

// 旧版（3ステップ・ポイント制）の記録から、「やってみた」だけを引き継ぐ。
export function migrateLegacy(value) {
  if (Array.isArray(value?.completed)) return normalizeTried(value.completed);
  if (value?.steps && typeof value.steps === "object") {
    return normalizeTried(Object.keys(value.steps));
  }
  return [];
}

export function getLocalStorageSafely(scope = globalThis) {
  try {
    return scope.localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadTried(storage = window.localStorage) {
  try {
    const stored = storage.getItem(STORAGE_KEY);
    if (stored !== null) return normalizeTried(JSON.parse(stored));
    for (const key of LEGACY_STORAGE_KEYS) {
      const legacy = storage.getItem(key);
      if (legacy !== null) return migrateLegacy(JSON.parse(legacy));
    }
    return [];
  } catch {
    return [];
  }
}

export function saveTried(tried, storage = window.localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(normalizeTried(tried)));
}

export function checkStorageAvailability(storage = window.localStorage) {
  const stored = storage.getItem(STORAGE_KEY);
  if (stored === null) {
    storage.setItem(STORAGE_KEY, "[]");
    storage.removeItem(STORAGE_KEY);
  } else {
    storage.setItem(STORAGE_KEY, stored);
  }
}

export function clearTried(storage = window.localStorage) {
  storage.removeItem(STORAGE_KEY);
  for (const key of LEGACY_STORAGE_KEYS) storage.removeItem(key);
}
