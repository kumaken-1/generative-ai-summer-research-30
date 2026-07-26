import assert from "node:assert/strict";
import test from "node:test";

import { quests } from "../js/quests.js";
import {
  AREA_LABELS,
  BADGE_LABELS,
  INPUT_MODE_GUIDANCE,
  INPUT_MODE_LABELS,
  classifyQuestHash,
  createQuestViewModel,
  filterQuests,
  getQuestFocusSelector,
  getQuestById,
  parseQuestHash,
} from "../js/view-model.js";

test("filterQuests returns all quests or the ten quests in an area", () => {
  assert.equal(filterQuests(quests, "all").length, 30);
  assert.deepEqual(
    filterQuests(quests, "text").map(({ id }) => id),
    Array.from({ length: 10 }, (_, index) => index + 1),
  );
  assert.deepEqual(
    filterQuests(quests, "media").map(({ id }) => id),
    Array.from({ length: 10 }, (_, index) => index + 11),
  );
  assert.deepEqual(
    filterQuests(quests, "thinking").map(({ id }) => id),
    Array.from({ length: 10 }, (_, index) => index + 21),
  );
  assert.equal(filterQuests(quests, "unknown").length, 30);
});

test("parseQuestHash accepts only exact quest hashes from 1 through 30", () => {
  assert.equal(parseQuestHash("#quest-12"), 12);
  for (const hash of ["", "#quest-0", "#quest-31", "#quest-1-extra", "#QUEST-1"]) {
    assert.equal(parseQuestHash(hash), null);
  }
});

test("classifyQuestHash distinguishes empty, valid, and invalid hashes", () => {
  assert.deepEqual(classifyQuestHash(""), { type: "empty", id: null });
  assert.deepEqual(classifyQuestHash("#quest-12"), { type: "valid", id: 12 });
  for (const hash of ["#garbage", "#quest-0", "#quest-31", "#quest-1-extra"]) {
    assert.deepEqual(classifyQuestHash(hash), { type: "invalid", id: null });
  }
});

test("getQuestById finds numeric and numeric-string IDs without loose matches", () => {
  assert.equal(getQuestById(quests, 1)?.title, "AIに自己紹介せよ");
  assert.equal(getQuestById(quests, "12")?.id, 12);
  assert.equal(getQuestById(quests, "12x"), null);
  assert.equal(getQuestById(quests, 31), null);
});

test("getQuestFocusSelector points to the current card button safely", () => {
  assert.equal(getQuestFocusSelector(1), '[data-open="1"]');
  assert.equal(getQuestFocusSelector(30), '[data-open="30"]');
  assert.equal(getQuestFocusSelector(0), null);
  assert.equal(getQuestFocusSelector("1"), null);
});

test("Japanese labels cover every quest area, input mode, and badge", () => {
  assert.deepEqual(AREA_LABELS, {
    text: "文字で話す",
    media: "写真や文章",
    thinking: "自分の使い方",
  });
  assert.deepEqual(INPUT_MODE_LABELS, {
    text: "文字だけ",
    camera: "カメラ・写真",
    paste: "文章を貼り付け",
    document: "文書を添付",
    image: "画像を添付",
  });
  assert.deepEqual(INPUT_MODE_GUIDANCE, {
    text: "下の文章をコピーし、ChatGPTなどの生成AIの入力欄へ貼り付けて送ります。",
    camera: "個人情報が入っていないことを確認し、生成AIの画面で撮影するか写真を選んで添付してから、下の文章を送ります。",
    paste: "個人情報を除いた文章を生成AIの入力欄へ貼り付け、続けて下の文章を送ります。",
    document: "個人情報を含まない、公開可能な文書だけを生成AIに添付し、下の文章を送ります。",
    image: "個人情報を隠した公開可能な画像だけを生成AIに添付し、下の文章を送ります。",
  });
  assert.deepEqual(BADGE_LABELS, {
    "first-step": "はじめの一歩",
    "tried-a-little": "ちょっと聞いてみた",
    beginner: "孫の手ビギナー",
    "summer-research": "夏の自由研究達成",
    "three-worlds": "三つの世界を旅した",
    "secret-complete": "30クエスト達成（隠し称号）",
  });
});

test("createQuestViewModel adds labels and completion/favorite state", () => {
  const model = createQuestViewModel(quests[0], {
    completed: [1],
    favorites: [2],
  });

  assert.equal(model.areaLabel, "文字で話す");
  assert.equal(model.inputModeLabel, "文字だけ");
  assert.equal(
    model.inputModeGuidance,
    "下の文章をコピーし、ChatGPTなどの生成AIの入力欄へ貼り付けて送ります。",
  );
  assert.equal(model.completed, true);
  assert.equal(model.favorite, false);
  assert.equal(model.completionLabel, "クリア済み");
  assert.equal(model.favoriteLabel, "お気に入りに追加");

  const favorite = createQuestViewModel(quests[1], {
    completed: [],
    favorites: [2],
  });
  assert.equal(favorite.completed, false);
  assert.equal(favorite.favorite, true);
  assert.equal(favorite.completionLabel, "未クリア");
  assert.equal(favorite.favoriteLabel, "お気に入りから外す");
});

test("createQuestViewModel safely adds the two power names", () => {
  const model = createQuestViewModel(quests[0], {
    completed: [],
    favorites: [],
  });

  assert.equal(model.primaryPowerName, "対話の杖");
  assert.equal(model.supportingPowerName, "主体性の剣");

  const unknown = createQuestViewModel({
    ...quests[0],
    primaryPower: "unknown",
    supportingPower: null,
  }, {
    completed: [],
    favorites: [],
  });
  assert.equal(unknown.primaryPowerName, "力の情報を確認中");
  assert.equal(unknown.supportingPowerName, "力の情報を確認中");
});
