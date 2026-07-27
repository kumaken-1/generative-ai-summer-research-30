import assert from "node:assert/strict";
import test from "node:test";

import { challenges } from "../js/challenges.js";
import {
  BLANK_MARKER,
  CATEGORY_NAMES,
  FILL_TYPE,
  FOLLOW_UP_STEPS,
  HELP_TEXTS,
  SAFETY_NOTE,
  SEND_TYPES,
  buildFilledText,
  categoryCounts,
  classifyChallengeHash,
  createViewModel,
  filterChallenges,
  getChallengeById,
  getFocusSelector,
  numberedSteps,
  parseChallengeHash,
  splitTemplate,
} from "../js/view-model.js";

test("送り方は3種で、ラベルとアイコンが色とは別に用意されている", () => {
  assert.deepEqual(Object.keys(SEND_TYPES), ["asis", "paste", "attach"]);
  for (const type of Object.values(SEND_TYPES)) {
    assert.ok(type.label.length > 0);
    assert.ok(type.short.length > 0);
    assert.ok(type.icon.length > 0);
  }
  assert.equal(FILL_TYPE.label, "空欄をうめてから送る");
  assert.ok(FILL_TYPE.icon.length > 0);
});

test("共通の補足は4本で、名前と本文を持つ", () => {
  assert.deepEqual(Object.keys(HELP_TEXTS).sort(), ["attach", "newmsg", "once", "paste"]);
  for (const help of Object.values(HELP_TEXTS)) {
    assert.ok(help.title.length > 0);
    assert.ok(help.body.length >= 30);
  }
});

test("2通目の手順は共通で、新しいメッセージだと補足がつく", () => {
  assert.equal(FOLLOW_UP_STEPS.length, 2);
  assert.equal(FOLLOW_UP_STEPS[1].help, "newmsg");
  assert.match(FOLLOW_UP_STEPS[1].text, /新しいメッセージ/);
  assert.match(SAFETY_NOTE, /個人が分かる情報/);
});

test("手順の番号は1回目から2回目まで通しで振る", () => {
  for (const challenge of challenges) {
    const { send, follow } = numberedSteps(challenge);
    assert.deepEqual(send.map(({ number }) => number), send.map((_, i) => i + 1));
    assert.equal(follow[0].number, send.length + 1);
    assert.equal(follow[1].number, send.length + 2);
  }
});

test("カテゴリーの件数を数え、絞り込める", () => {
  const counts = categoryCounts(challenges);
  assert.equal(counts.reduce((total, item) => total + item.count, 0), 30);
  for (const item of counts) {
    assert.equal(filterChallenges(challenges, item.id).length, item.count);
    assert.ok(CATEGORY_NAMES[item.id].length > 0);
  }
  assert.equal(filterChallenges(challenges, "all").length, 30);
  assert.equal(filterChallenges(challenges, "unknown").length, 30);
});

test("URLの断片は c-1 から c-30 だけを受け付ける", () => {
  assert.equal(parseChallengeHash("#c-12"), 12);
  for (const hash of ["", "#c-0", "#c-31", "#c-1-extra", "#C-1", "#quest-1"]) {
    assert.equal(parseChallengeHash(hash), null);
  }
  assert.deepEqual(classifyChallengeHash(""), { type: "empty", id: null });
  assert.deepEqual(classifyChallengeHash("#c-3"), { type: "valid", id: 3 });
  assert.deepEqual(classifyChallengeHash("#nope"), { type: "invalid", id: null });
});

test("番号から該当のチャレンジと戻り先を引ける", () => {
  assert.equal(getChallengeById(challenges, 1)?.id, 1);
  assert.equal(getChallengeById(challenges, "12")?.id, 12);
  assert.equal(getChallengeById(challenges, "12x"), null);
  assert.equal(getChallengeById(challenges, 31), null);
  assert.equal(getFocusSelector(1), '[data-open="1"]');
  assert.equal(getFocusSelector(0), null);
  assert.equal(getFocusSelector("1"), null);
});

test("空欄は前後に割れ、埋めた語で組み立てられる", () => {
  const template = `「${BLANK_MARKER}」が気になりました。`;
  assert.deepEqual(splitTemplate(template), { before: "「", after: "」が気になりました。" });
  assert.equal(buildFilledText(template, "言い回し"), "「言い回し」が気になりました。");
  assert.match(buildFilledText(template, ""), /「　+」/);
  assert.match(buildFilledText(template, "   "), /「　+」/);
  assert.deepEqual(splitTemplate("空欄なし"), { before: "空欄なし", after: "" });
});

test("表示用のデータに、種別と試した印がそろう", () => {
  const model = createViewModel(challenges[0], [1]);
  assert.equal(model.categoryName, CATEGORY_NAMES[challenges[0].category]);
  assert.equal(model.sendType.id, challenges[0].send.type);
  assert.equal(model.tried, true);
  assert.equal(model.steps.send.length, challenges[0].send.steps.length);
  assert.equal(model.steps.follow.length, 2);

  assert.equal(createViewModel(challenges[1], [1]).tried, false);
});
