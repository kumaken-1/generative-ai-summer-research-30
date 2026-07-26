export const STORAGE_KEY = "ai-summer-research-30-progress-v1";

function normalizeIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((id) => Number.isInteger(id) && id >= 1 && id <= 30))]
    .sort((a, b) => a - b);
}

export function normalizeProgress(value) {
  return {
    completed: normalizeIds(value?.completed),
    favorites: normalizeIds(value?.favorites),
  };
}

function toggle(progress, field, id) {
  const normalized = normalizeProgress(progress);
  if (!Number.isInteger(id) || id < 1 || id > 30) {
    return normalized;
  }

  const values = normalized[field];
  normalized[field] = values.includes(id)
    ? values.filter((value) => value !== id)
    : [...values, id].sort((a, b) => a - b);
  return normalized;
}

export function toggleCompleted(progress, id) {
  return toggle(progress, "completed", id);
}

export function toggleFavorite(progress, id) {
  return toggle(progress, "favorites", id);
}

export function earnedBadges(completed) {
  const ids = normalizeIds(completed);
  const badges = [];

  if (ids.length >= 1) badges.push("first-step");
  if (ids.length >= 3) badges.push("tried-a-little");
  if (ids.length >= 5) badges.push("beginner");
  if (ids.length >= 10) badges.push("summer-research");

  const hasEachWorld = [
    [1, 10],
    [11, 20],
    [21, 30],
  ].every(([start, end]) => ids.some((id) => id >= start && id <= end));
  if (hasEachWorld) badges.push("three-worlds");
  if (ids.length === 30) badges.push("secret-complete");

  return badges;
}

export function loadProgress(storage = window.localStorage) {
  try {
    return normalizeProgress(JSON.parse(storage.getItem(STORAGE_KEY)));
  } catch {
    return normalizeProgress(null);
  }
}

export function saveProgress(progress, storage = window.localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(normalizeProgress(progress)));
}

export function checkStorageAvailability(storage = window.localStorage) {
  const stored = storage.getItem(STORAGE_KEY);
  if (stored === null) {
    storage.setItem(STORAGE_KEY, JSON.stringify(normalizeProgress(null)));
    storage.removeItem(STORAGE_KEY);
  } else {
    storage.setItem(STORAGE_KEY, stored);
  }
}

export function clearProgress(storage = window.localStorage) {
  storage.removeItem(STORAGE_KEY);
}
