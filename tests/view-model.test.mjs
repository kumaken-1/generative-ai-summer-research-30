import assert from "node:assert/strict";
import test from "node:test";

import { quests } from "../js/quests.js";
import {
  BADGE_DEFINITIONS,
  STEP_IDS,
  emptyProgress,
  markStep,
  setVerdict,
  toggleFavorite,
} from "../js/state.js";
import {
  AREA_LABELS,
  BADGE_HINTS,
  BADGE_LABELS,
  BLANK_MARKER,
  CLEARED_FALLBACK,
  INPUT_MODE_GUIDANCE,
  INPUT_MODE_LABELS,
  SAMPLE_MATERIALS,
  buildFollowUpText,
  classifyQuestHash,
  clearedTitles,
  createQuestViewModel,
  filterQuests,
  getSuggestionId,
  getQuestFocusSelector,
  getQuestById,
  parseQuestHash,
  resolveClearedNames,
  splitFollowUpTemplate,
  uncompletedQuestIds,
} from "../js/view-model.js";

function clearAllSteps(progress, id) {
  let next = progress;
  for (const step of STEP_IDS) next = markStep(next, id, step);
  return next;
}

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
  assert.deepEqual(
    Object.keys(BADGE_LABELS),
    BADGE_DEFINITIONS.map(({ id }) => id),
  );
  assert.ok(Object.values(BADGE_LABELS).every(Boolean));
  assert.ok(Object.values(BADGE_HINTS).every(Boolean));
});

test("添付や貼り付けが要るクエストには練習用素材の案内がある", () => {
  for (const mode of ["document", "image", "paste"]) {
    assert.ok(SAMPLE_MATERIALS[mode].href.startsWith("./assets/"));
    assert.ok(SAMPLE_MATERIALS[mode].label.length > 0);
  }
  assert.equal(SAMPLE_MATERIALS.text, undefined);

  const withSample = quests.find((quest) => quest.inputMode === "document");
  assert.ok(withSample, "文書を添付するクエストが存在する");
  const model = createQuestViewModel(withSample, emptyProgress());
  assert.equal(model.sampleMaterial.href, SAMPLE_MATERIALS.document.href);

  const textOnly = createQuestViewModel(quests[0], emptyProgress());
  assert.equal(textOnly.sampleMaterial, null);
});

test("穴あきの2通目は入力欄の前後に割れて、埋めた語で組み立てられる", () => {
  const template = `私は「${BLANK_MARKER}」が気になりました。その点を直してください。`;
  assert.deepEqual(splitFollowUpTemplate(template), {
    before: "私は「",
    after: "」が気になりました。その点を直してください。",
  });
  assert.equal(
    buildFollowUpText(template, "元気すぎる表現"),
    "私は「元気すぎる表現」が気になりました。その点を直してください。",
  );
  // 未入力のときは、生成AI側で書き足せるように全角の空白を残す
  assert.match(buildFollowUpText(template, ""), /私は「　+」が気になりました。/);
  assert.match(buildFollowUpText(template, "   "), /私は「　+」が気になりました。/);
  assert.deepEqual(splitFollowUpTemplate("空欄なし"), { before: "空欄なし", after: "" });
});

test("全30問の2通目が、ちょうど1つの空欄と3つの例を持つ", () => {
  const templates = new Set();
  for (const quest of quests) {
    for (const route of ["daily", "school"]) {
      const followUp = quest[route].followUp;
      assert.equal(
        followUp.template.split(BLANK_MARKER).length - 1,
        1,
        `quest ${quest.id} ${route} は空欄がちょうど1つ`,
      );
      assert.equal(followUp.hints.length, 3, `quest ${quest.id} ${route} は例が3つ`);
      assert.ok(followUp.hints.every((hint) => hint.trim().length > 0));
      templates.add(followUp.template);
    }
  }
  // 60本すべて同じ言い回しだと単調になるので、型の種類を担保する
  assert.ok(templates.size >= 20, `2通目の文型が少なすぎる: ${templates.size}`);
});

test("クエスト30はクリア済みの題名を差し込める", () => {
  const finale = getQuestById(quests, 30);
  assert.ok(finale.daily.firstPrompt.includes("{{cleared}}"));
  assert.ok(finale.school.firstPrompt.includes("{{cleared}}"));

  let progress = emptyProgress();
  for (const id of [6, 13]) progress = clearAllSteps(progress, id);
  const titles = clearedTitles(quests, progress);
  assert.deepEqual(titles, [getQuestById(quests, 6).title, getQuestById(quests, 13).title]);

  const resolved = resolveClearedNames(finale.daily.firstPrompt, titles);
  assert.ok(!resolved.includes("{{cleared}}"));
  assert.ok(resolved.includes(titles[0]));
  assert.ok(resolved.includes(titles[1]));

  assert.ok(resolveClearedNames(finale.daily.firstPrompt, []).includes(CLEARED_FALLBACK));
  assert.equal(resolveClearedNames("空欄なし", ["A"]), "空欄なし");
});

test("候補はまだ試していないものから出し、日付には結びつけない", () => {
  // 1日に何個やってもよく、やらない日があってもよい。速さは利用者が決める。
  assert.deepEqual(uncompletedQuestIds(quests, emptyProgress()), quests.map(({ id }) => id));
  assert.equal(getSuggestionId(quests, emptyProgress(), 0), 1);

  // 「別のクエストにする」を押すと、次の未クリアへ送る
  assert.equal(getSuggestionId(quests, emptyProgress(), 1), 2);
  assert.equal(getSuggestionId(quests, emptyProgress(), 29), 30);
  assert.equal(getSuggestionId(quests, emptyProgress(), 30), 1, "端まで行ったら先頭へ戻る");

  // クリア済みは候補に出さない
  let progress = emptyProgress();
  for (const id of [1, 2, 3]) progress = clearAllSteps(progress, id);
  assert.equal(getSuggestionId(quests, progress, 0), 4);
  assert.ok(!uncompletedQuestIds(quests, progress).includes(1));
  assert.equal(uncompletedQuestIds(quests, progress).length, 27);

  // 全部終えたら候補はなくなる
  let everything = emptyProgress();
  for (const quest of quests) everything = clearAllSteps(everything, quest.id);
  assert.deepEqual(uncompletedQuestIds(quests, everything), []);
  assert.equal(getSuggestionId(quests, everything, 0), null);
  assert.equal(getSuggestionId(quests, everything, 7), null);
});

test("createQuestViewModel adds labels and step/verdict state", () => {
  let progress = clearAllSteps(emptyProgress(), 1);
  progress = setVerdict(progress, 1, "edit");
  progress = toggleFavorite(progress, 2);

  const model = createQuestViewModel(quests[0], progress);
  assert.equal(model.areaLabel, "文字で話す");
  assert.equal(model.inputModeLabel, "文字だけ");
  assert.equal(model.completed, true);
  assert.equal(model.stepCount, 3);
  assert.equal(model.verdict, "edit");
  assert.equal(model.verdictLabel, "直せば使える");
  assert.equal(model.favorite, false);
  assert.equal(model.completionLabel, "クリア済み");
  assert.equal(model.favoriteLabel, "お気に入りに追加");

  const favorite = createQuestViewModel(quests[1], progress);
  assert.equal(favorite.completed, false);
  assert.equal(favorite.favorite, true);
  assert.equal(favorite.completionLabel, "未クリア");
  assert.equal(favorite.favoriteLabel, "お気に入りから外す");

  const halfway = createQuestViewModel(quests[2], markStep(emptyProgress(), 3, "sent"));
  assert.equal(halfway.stepCount, 1);
  assert.equal(halfway.completionLabel, "あと2ステップ");
});

test("createQuestViewModel safely adds the two power names", () => {
  const model = createQuestViewModel(quests[0], emptyProgress());
  assert.equal(typeof model.primaryPowerName, "string");
  assert.notEqual(model.primaryPowerName, "力の情報を確認中");
  assert.notEqual(model.supportingPowerName, "力の情報を確認中");

  const unknown = createQuestViewModel({
    ...quests[0],
    primaryPower: "unknown",
    supportingPower: null,
  }, emptyProgress());
  assert.equal(unknown.primaryPowerName, "力の情報を確認中");
  assert.equal(unknown.supportingPowerName, "力の情報を確認中");
});
