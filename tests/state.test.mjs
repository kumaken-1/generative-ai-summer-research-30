import assert from "node:assert/strict";
import test from "node:test";
import {
  LEGACY_STORAGE_KEYS,
  STORAGE_KEY,
  checkStorageAvailability,
  clearTried,
  getLocalStorageSafely,
  isTried,
  loadTried,
  migrateLegacy,
  normalizeTried,
  saveTried,
  toggleTried,
} from "../js/state.js";

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

test("記録は「やってみた」の番号だけを持つ", () => {
  assert.deepEqual(normalizeTried(null), []);
  assert.deepEqual(normalizeTried([3, 1, 1, "2"]), [1, 2, 3]);
  assert.deepEqual(normalizeTried([0, 31, null, "x", 1.5]), []);
  assert.deepEqual(normalizeTried({ tried: [5] }), [5]);
});

test("印は付け外しできる", () => {
  let tried = toggleTried([], 7);
  assert.deepEqual(tried, [7]);
  assert.ok(isTried(tried, 7));
  assert.ok(!isTried(tried, 8));
  tried = toggleTried(tried, 3);
  assert.deepEqual(tried, [3, 7]);
  tried = toggleTried(tried, 7);
  assert.deepEqual(tried, [3]);
  assert.deepEqual(toggleTried(tried, 99), [3]);
});

test("旧版の記録から「やってみた」だけを引き継ぐ", () => {
  assert.deepEqual(migrateLegacy({ completed: [2, 4] }), [2, 4]);
  assert.deepEqual(
    migrateLegacy({ steps: { 3: ["sent"], 8: ["sent", "replied", "decided"] } }),
    [3, 8],
  );
  assert.deepEqual(migrateLegacy({}), []);
  assert.deepEqual(migrateLegacy(null), []);
});

test("保存先は新しいキーを優先し、なければ旧キーを読む", () => {
  assert.deepEqual(loadTried(memoryStorage({ [STORAGE_KEY]: "[1,2]" })), [1, 2]);

  const legacyV2 = memoryStorage({
    [LEGACY_STORAGE_KEYS[0]]: JSON.stringify({ steps: { 5: ["sent"] } }),
  });
  assert.deepEqual(loadTried(legacyV2), [5]);

  const legacyV1 = memoryStorage({
    [LEGACY_STORAGE_KEYS[1]]: JSON.stringify({ completed: [9] }),
  });
  assert.deepEqual(loadTried(legacyV1), [9]);

  const both = memoryStorage({
    [STORAGE_KEY]: "[1]",
    [LEGACY_STORAGE_KEYS[0]]: JSON.stringify({ steps: { 5: ["sent"] } }),
  });
  assert.deepEqual(loadTried(both), [1]);

  assert.deepEqual(loadTried(memoryStorage({ [STORAGE_KEY]: "{" })), []);
  assert.deepEqual(loadTried(memoryStorage()), []);
});

test("保存と削除は新旧どちらのキーも扱う", () => {
  const storage = memoryStorage();
  saveTried([2, 1, 1], storage);
  assert.equal(storage.getItem(STORAGE_KEY), "[1,2]");

  for (const key of LEGACY_STORAGE_KEYS) storage.setItem(key, "{}");
  clearTried(storage);
  assert.equal(storage.getItem(STORAGE_KEY), null);
  for (const key of LEGACY_STORAGE_KEYS) assert.equal(storage.getItem(key), null);
});

test("保存可否の確認は既存の値を壊さない", () => {
  const storage = memoryStorage({ [STORAGE_KEY]: "[4]" });
  checkStorageAvailability(storage);
  assert.equal(storage.getItem(STORAGE_KEY), "[4]");

  const empty = memoryStorage();
  checkStorageAvailability(empty);
  assert.equal(empty.getItem(STORAGE_KEY), null);
});

test("localStorage が使えない環境でも例外を投げない", () => {
  assert.equal(getLocalStorageSafely({}), null);
  assert.equal(getLocalStorageSafely({
    get localStorage() {
      throw new Error("blocked");
    },
  }), null);
});
