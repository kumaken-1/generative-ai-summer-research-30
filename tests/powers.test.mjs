import test from "node:test";
import assert from "node:assert/strict";
import {
  POWER_DEFINITIONS,
  calculatePowerProgress,
  powerTotals,
} from "../js/powers.js";
import { quests } from "../js/quests.js";

const expectedPowerNames = {
  agency: "主体性の剣",
  safety: "情報守りの盾",
  delegation: "仕事選びの羅針盤",
  instruction: "指示の魔法袋",
  dialogue: "対話の杖",
  verification: "真実を映す鏡",
  finishing: "仕上げのたい焼き",
};

test("7つの力は安定したIDと名称を持つ", () => {
  assert.deepEqual(
    Object.fromEntries(
      POWER_DEFINITIONS.map(({ id, name }) => [id, name]),
    ),
    expectedPowerNames,
  );
});

test("全クエストに異なる主・補助の力が設定されている", () => {
  const validIds = new Set(POWER_DEFINITIONS.map(({ id }) => id));
  for (const quest of quests) {
    assert.ok(validIds.has(quest.primaryPower), `quest ${quest.id} primary`);
    assert.ok(validIds.has(quest.supportingPower), `quest ${quest.id} supporting`);
    assert.notEqual(
      quest.primaryPower,
      quest.supportingPower,
      `quest ${quest.id}`,
    );
  }
});

test("30題の力ポイント総数は分類表どおり60ポイントになる", () => {
  assert.deepEqual(powerTotals(quests), {
    agency: 9,
    safety: 7,
    delegation: 7,
    instruction: 12,
    dialogue: 11,
    verification: 7,
    finishing: 7,
  });
  assert.equal(Object.values(powerTotals(quests)).reduce((a, b) => a + b, 0), 60);
});

test("どの力にも触れられる機会があり、極端な偏りがない", () => {
  const totals = Object.values(powerTotals(quests));
  assert.ok(Math.min(...totals) >= 6, "1問しか経験できない力があってはならない");
  assert.ok(Math.max(...totals) <= 12);
});

test("13番はハルシネーション検出なので真実を映す鏡が主となる", () => {
  const questsById = new Map(quests.map((quest) => [quest.id, quest]));
  assert.equal(questsById.get(13).primaryPower, "verification");
  // 初めて写真を添付する回は、何を写してよいかの判断が要点になる
  assert.equal(questsById.get(12).primaryPower, "safety");
  // 教育用語の説明はAIが誤りやすいので確かめる力が主
  assert.equal(questsById.get(8).primaryPower, "verification");
  // 最終回は自分で決めることそのものが主題
  assert.equal(questsById.get(30).primaryPower, "agency");
});

test("進捗計算は重複を除き無効なクエストIDを無視する", () => {
  const progress = calculatePowerProgress(quests, [1, 1, 26, 999]);
  assert.equal(progress.completedQuestCount, 2);
  assert.equal(progress.earnedTotal, 4);
  assert.equal(progress.total, 60);
  assert.equal(progress.byPower.dialogue.earned, 1);
  assert.equal(progress.byPower.agency.earned, 1);
  assert.equal(progress.byPower.verification.earned, 1);
  assert.equal(progress.byPower.safety.earned, 1);
});
