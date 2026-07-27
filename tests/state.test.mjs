import assert from "node:assert/strict";
import test from "node:test";
import {
  BADGE_DEFINITIONS,
  LEGACY_STORAGE_KEY,
  STEP_IDS,
  STORAGE_KEY,
  VERDICT_IDS,
  checkStorageAvailability,
  clearProgress,
  clearQuest,
  completedIds,
  earnedBadges,
  emptyProgress,
  getLocalStorageSafely,
  isStepDone,
  loadProgress,
  markStep,
  migrateLegacyProgress,
  nextStep,
  normalizeProgress,
  saveProgress,
  setVerdict,
  todayKey,
  toggleFavorite,
  unmarkStep,
  verdictCounts,
} from "../js/state.js";
import { quests } from "../js/quests.js";
import { calculatePowerProgress } from "../js/powers.js";

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

function clearAllSteps(progress, id, options) {
  let next = progress;
  for (const step of STEP_IDS) next = markStep(next, id, step, options);
  return next;
}

test("空の進み具合は5つの領域を持つ", () => {
  assert.deepEqual(emptyProgress(), {
    favorites: [],
    steps: {},
    verdicts: {},
    routes: {},
    days: [],
  });
});

test("3ステップすべてを終えたクエストだけがクリア扱いになる", () => {
  let progress = emptyProgress();
  progress = markStep(progress, 3, "sent", { date: "2026-07-27" });
  assert.deepEqual(completedIds(progress), []);
  assert.equal(nextStep(progress, 3), "replied");
  assert.ok(isStepDone(progress, 3, "sent"));

  progress = markStep(progress, 3, "replied", { date: "2026-07-27" });
  assert.deepEqual(completedIds(progress), []);

  progress = markStep(progress, 3, "decided", { date: "2026-07-27" });
  assert.deepEqual(completedIds(progress), [3]);
  assert.equal(nextStep(progress, 3), null);
});

test("ステップの取り消しは、それ以降のステップと判断も戻す", () => {
  let progress = clearAllSteps(emptyProgress(), 5, { route: "daily", date: "2026-07-27" });
  progress = setVerdict(progress, 5, "edit", { route: "daily", date: "2026-07-27" });
  assert.deepEqual(completedIds(progress), [5]);
  assert.equal(progress.verdicts[5], "edit");

  progress = unmarkStep(progress, 5, "replied");
  assert.deepEqual(progress.steps[5], ["sent"]);
  assert.equal(progress.verdicts[5], undefined);
  assert.deepEqual(completedIds(progress), []);

  progress = unmarkStep(progress, 5, "sent");
  assert.equal(progress.steps[5], undefined);
});

test("判断は3ステップ目を兼ね、集計できる", () => {
  let progress = emptyProgress();
  progress = markStep(progress, 1, "sent");
  progress = markStep(progress, 1, "replied");
  progress = setVerdict(progress, 1, "skip");
  assert.deepEqual(completedIds(progress), [1]);
  assert.deepEqual(verdictCounts(progress), { "as-is": 0, edit: 0, skip: 1 });

  progress = setVerdict(progress, 1, "as-is");
  assert.deepEqual(verdictCounts(progress), { "as-is": 1, edit: 0, skip: 0 });
  assert.deepEqual(setVerdict(progress, 1, "bogus").verdicts, { 1: "as-is" });
});

test("試したルートと取り組んだ日を記録する", () => {
  let progress = emptyProgress();
  progress = markStep(progress, 2, "sent", { route: "daily", date: "2026-07-27" });
  progress = markStep(progress, 2, "replied", { route: "school", date: "2026-07-29" });
  assert.deepEqual(progress.routes[2], ["daily", "school"]);
  assert.deepEqual(progress.days, ["2026-07-27", "2026-07-29"]);
});

test("todayKey は端末の暦日を YYYY-MM-DD で返す", () => {
  assert.equal(todayKey(new Date(2026, 6, 5)), "2026-07-05");
  assert.match(todayKey(), /^\d{4}-\d{2}-\d{2}$/);
});

test("お気に入りは切り替えられ、無効なIDは無視される", () => {
  let progress = toggleFavorite(emptyProgress(), 7);
  assert.deepEqual(progress.favorites, [7]);
  progress = toggleFavorite(progress, 7);
  assert.deepEqual(progress.favorites, []);
  assert.deepEqual(toggleFavorite(progress, 99).favorites, []);
  assert.deepEqual(toggleFavorite(progress, 0).favorites, []);
});

test("クエスト単位で記録を消せる", () => {
  let progress = clearAllSteps(emptyProgress(), 9, { route: "daily" });
  progress = setVerdict(progress, 9, "edit");
  progress = clearQuest(progress, 9);
  assert.equal(progress.steps[9], undefined);
  assert.equal(progress.verdicts[9], undefined);
  assert.equal(progress.routes[9], undefined);
});

test("壊れた保存データを安全な形に正規化する", () => {
  const normalized = normalizeProgress({
    favorites: [1, 1, 99, "3", null],
    steps: { 4: ["sent", "bogus"], 99: ["sent"], bad: ["sent"] },
    verdicts: { 4: "edit", 5: "edit", 6: "nope" },
    routes: { 4: ["daily", "nowhere"] },
    days: ["2026-07-27", "not-a-date", "2026-07-27"],
  });
  assert.deepEqual(normalized.favorites, [1, 3]);
  assert.deepEqual(normalized.steps, { 4: ["sent"] });
  // 3ステップ目が終わっていない判断は捨てる
  assert.deepEqual(normalized.verdicts, {});
  assert.deepEqual(normalized.routes, { 4: ["daily"] });
  assert.deepEqual(normalized.days, ["2026-07-27"]);
});

test("旧形式のクリア記録は3ステップ完了として引き継ぐ", () => {
  const migrated = migrateLegacyProgress({ completed: [2, 4], favorites: [6] });
  assert.deepEqual(completedIds(migrated), [2, 4]);
  assert.deepEqual(migrated.steps[2], [...STEP_IDS]);
  assert.deepEqual(migrated.favorites, [6]);
});

test("保存済みデータがない端末では旧キーから読み込む", () => {
  const legacy = memoryStorage({
    [LEGACY_STORAGE_KEY]: JSON.stringify({ completed: [1], favorites: [] }),
  });
  assert.deepEqual(completedIds(loadProgress(legacy)), [1]);

  const current = memoryStorage({
    [STORAGE_KEY]: JSON.stringify({ steps: { 8: [...STEP_IDS] } }),
    [LEGACY_STORAGE_KEY]: JSON.stringify({ completed: [1], favorites: [] }),
  });
  assert.deepEqual(completedIds(loadProgress(current)), [8]);

  assert.deepEqual(loadProgress(memoryStorage({ [STORAGE_KEY]: "{" })), emptyProgress());
});

test("保存と削除は新旧どちらのキーも扱う", () => {
  const storage = memoryStorage();
  saveProgress(markStep(emptyProgress(), 1, "sent"), storage);
  assert.deepEqual(completedIds(loadProgress(storage)), []);
  assert.ok(isStepDone(loadProgress(storage), 1, "sent"));

  storage.setItem(LEGACY_STORAGE_KEY, "{}");
  clearProgress(storage);
  assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.equal(storage.getItem(LEGACY_STORAGE_KEY), null);
});

test("保存可否の確認は既存の値を壊さない", () => {
  const stored = JSON.stringify(emptyProgress());
  const storage = memoryStorage({ [STORAGE_KEY]: stored });
  checkStorageAvailability(storage);
  assert.equal(storage.getItem(STORAGE_KEY), stored);

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

test("称号は数だけでなく、ふるまいでも得られる", () => {
  const badgeIds = BADGE_DEFINITIONS.map(({ id }) => id);
  assert.ok(BADGE_DEFINITIONS.every(({ label, hint }) => label && hint));
  assert.equal(new Set(badgeIds).size, badgeIds.length);
  assert.deepEqual(earnedBadges(emptyProgress(), quests), []);

  let bothRoutes = clearAllSteps(emptyProgress(), 1, { route: "daily" });
  bothRoutes = markStep(bothRoutes, 1, "sent", { route: "school" });
  assert.ok(earnedBadges(bothRoutes, quests).includes("both-routes"));

  let saidNo = clearAllSteps(emptyProgress(), 1, { route: "daily" });
  saidNo = setVerdict(saidNo, 1, "skip");
  assert.ok(earnedBadges(saidNo, quests).includes("said-no"));

  let manyDays = emptyProgress();
  for (const [index, date] of ["2026-07-27", "2026-07-29", "2026-08-02"].entries()) {
    manyDays = markStep(manyDays, index + 1, "sent", { date });
  }
  assert.ok(earnedBadges(manyDays, quests).includes("many-days"));

  let threeWorlds = emptyProgress();
  for (const id of [1, 12, 22]) threeWorlds = clearAllSteps(threeWorlds, id);
  assert.ok(earnedBadges(threeWorlds, quests).includes("three-worlds"));

  const factIds = quests.filter((quest) => quest.factCheck.required).map((quest) => quest.id);
  assert.ok(factIds.length >= 3);
  let factChecker = emptyProgress();
  for (const id of factIds.slice(0, 3)) factChecker = clearAllSteps(factChecker, id);
  assert.ok(earnedBadges(factChecker, quests).includes("fact-checker"));
});

test("七つの力の称号は全ての力に1ポイント入ってから出る", () => {
  let progress = emptyProgress();
  for (const id of [1, 2, 3]) progress = clearAllSteps(progress, id);
  const partial = calculatePowerProgress(quests, completedIds(progress));
  assert.ok(!earnedBadges(progress, quests, partial).includes("all-powers"));

  let everything = emptyProgress();
  for (const quest of quests) everything = clearAllSteps(everything, quest.id);
  const full = calculatePowerProgress(quests, completedIds(everything));
  const badges = earnedBadges(everything, quests, full);
  assert.ok(badges.includes("all-powers"));
  assert.ok(badges.includes("secret-complete"));
});

test("称号は定義順で返り、判断とステップの型は固定である", () => {
  let progress = emptyProgress();
  for (const id of [1, 12, 22, 4, 5]) progress = clearAllSteps(progress, id);
  const badges = earnedBadges(progress, quests);
  const order = BADGE_DEFINITIONS.map(({ id }) => id);
  assert.deepEqual(badges, order.filter((id) => badges.includes(id)));

  assert.deepEqual(STEP_IDS, ["sent", "replied", "decided"]);
  assert.deepEqual(VERDICT_IDS, ["as-is", "edit", "skip"]);
});
