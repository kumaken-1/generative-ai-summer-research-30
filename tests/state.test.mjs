import assert from "node:assert/strict";
import test from "node:test";

import {
  STORAGE_KEY,
  clearProgress,
  earnedBadges,
  loadProgress,
  normalizeProgress,
  saveProgress,
  toggleCompleted,
  toggleFavorite,
} from "../js/state.js";

test("normalizeProgress returns empty progress for null and broken field types", () => {
  assert.deepEqual(normalizeProgress(null), { completed: [], favorites: [] });
  assert.deepEqual(normalizeProgress({ completed: "1", favorites: {} }), {
    completed: [],
    favorites: [],
  });
});

test("normalizeProgress removes duplicates and invalid IDs, then sorts ascending", () => {
  assert.deepEqual(
    normalizeProgress({
      completed: [30, 2, 2, 0, 31, 1.5, "3", 1],
      favorites: [11, -1, 10, 11, 20],
    }),
    { completed: [1, 2, 30], favorites: [10, 11, 20] },
  );
});

test("toggleCompleted toggles a valid ID without mutating the input", () => {
  const progress = { completed: [1, 3], favorites: [2] };
  const added = toggleCompleted(progress, 2);
  const removed = toggleCompleted(added, 1);

  assert.deepEqual(added, { completed: [1, 2, 3], favorites: [2] });
  assert.deepEqual(removed, { completed: [2, 3], favorites: [2] });
  assert.deepEqual(progress, { completed: [1, 3], favorites: [2] });
  assert.notStrictEqual(added, progress);
  assert.notStrictEqual(added.completed, progress.completed);
  assert.notStrictEqual(added.favorites, progress.favorites);
});

test("toggleFavorite toggles a valid ID and ignores invalid IDs without mutation", () => {
  const progress = { completed: [1], favorites: [2] };

  assert.deepEqual(toggleFavorite(progress, 3), {
    completed: [1],
    favorites: [2, 3],
  });
  assert.deepEqual(toggleFavorite(progress, 2), {
    completed: [1],
    favorites: [],
  });
  assert.deepEqual(toggleFavorite(progress, 0), progress);
  assert.deepEqual(toggleFavorite(progress, 31), progress);
  assert.deepEqual(toggleFavorite(progress, 1.5), progress);
  assert.deepEqual(progress, { completed: [1], favorites: [2] });
});

test("earnedBadges grants count badges at each threshold", () => {
  assert.deepEqual(earnedBadges([]), []);
  assert.deepEqual(earnedBadges([1]), ["first-step"]);
  assert.deepEqual(earnedBadges([1, 2, 3]), ["first-step", "tried-a-little"]);
  assert.deepEqual(earnedBadges([1, 2, 3, 4, 5]), [
    "first-step",
    "tried-a-little",
    "beginner",
  ]);
  assert.deepEqual(earnedBadges([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), [
    "first-step",
    "tried-a-little",
    "beginner",
    "summer-research",
  ]);
});

test("earnedBadges grants three-worlds and secret-complete", () => {
  assert.ok(earnedBadges([1, 11, 21]).includes("three-worlds"));
  assert.ok(!earnedBadges([1, 10, 20]).includes("three-worlds"));
  const all = Array.from({ length: 30 }, (_, index) => index + 1);
  assert.deepEqual(earnedBadges(all), [
    "first-step",
    "tried-a-little",
    "beginner",
    "summer-research",
    "three-worlds",
    "secret-complete",
  ]);
});

test("earnedBadges ignores duplicate and invalid IDs", () => {
  assert.deepEqual(earnedBadges([1, 1, 0, 31, 1.5, "2"]), ["first-step"]);
});

test("loadProgress normalizes stored JSON", () => {
  const storage = {
    getItem(key) {
      assert.equal(key, STORAGE_KEY);
      return JSON.stringify({ completed: [3, 1, 3], favorites: [30, 0] });
    },
  };
  assert.deepEqual(loadProgress(storage), {
    completed: [1, 3],
    favorites: [30],
  });
});

test("loadProgress returns empty progress for broken JSON or getItem errors", () => {
  assert.deepEqual(loadProgress({ getItem: () => "{" }), {
    completed: [],
    favorites: [],
  });
  assert.deepEqual(
    loadProgress({
      getItem() {
        throw new Error("blocked");
      },
    }),
    { completed: [], favorites: [] },
  );
});

test("saveProgress stores normalized progress and propagates setItem errors", () => {
  const calls = [];
  saveProgress(
    { completed: [3, 1, 3], favorites: [31, 2] },
    { setItem: (...args) => calls.push(args) },
  );
  assert.deepEqual(calls, [
    [
      STORAGE_KEY,
      JSON.stringify({ completed: [1, 3], favorites: [2] }),
    ],
  ]);
  assert.throws(
    () =>
      saveProgress(
        { completed: [], favorites: [] },
        {
          setItem() {
            throw new Error("quota");
          },
        },
      ),
    /quota/,
  );
});

test("clearProgress removes only the progress key and propagates errors", () => {
  const removed = [];
  clearProgress({ removeItem: (key) => removed.push(key) });
  assert.deepEqual(removed, [STORAGE_KEY]);
  assert.throws(
    () =>
      clearProgress({
        removeItem() {
          throw new Error("blocked");
        },
      }),
    /blocked/,
  );
});
