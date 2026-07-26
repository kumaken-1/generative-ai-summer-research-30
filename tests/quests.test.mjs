import test from "node:test";
import assert from "node:assert/strict";
import { quests } from "../js/quests.js";

const requiredKeys = [
  "id",
  "area",
  "title",
  "ability",
  "inputMode",
  "daily",
  "school",
  "reflectPrompt",
  "safety",
  "factCheck",
  "related",
];

const expectedTitles = [
  "AIに自己紹介せよ",
  "短い質問を投げてみよ",
  "止まった文章を救え",
  "相手に届く言葉に変えよ",
  "「もう少し」で答えを変えよ",
  "バラバラのメモをつなげよ",
  "アイデアを10個集めよ",
  "分かるまで聞き直せ",
  "長い話から必要なことを選べ",
  "小さな困りごとを相談せよ",
  "二つの候補をくらべよ",
  "写真を撮って聞いてみよ",
  "写真から忘れ物を防げ",
  "無理のない予定に組み直せ",
  "むずかしい説明をやさしくせよ",
  "聞くべき質問を集めよ",
  "画像の見落としを探せ",
  "角の立たない言い方を探せ",
  "頭の中のもやもやを分けよ",
  "AIの案に自分の案を足せ",
  "自分の好みを伝えよ",
  "条件を一つずつ足せ",
  "「これは違う」を伝えよ",
  "良いところだけ残せ",
  "「ほかには？」で視野を広げよ",
  "AIに「本当？」と聞け",
  "確かめ方を教えてもらえ",
  "AIの言葉を自分に戻せ",
  "自分専用の最初の一言を作れ",
  "自分の「マイ孫の手」を発見せよ",
];

test("30個のクエストが1から30まで重複なく存在する", () => {
  assert.equal(quests.length, 30);
  assert.deepEqual(quests.map((quest) => quest.id), [...Array(30)].map((_, i) => i + 1));
  assert.deepEqual(quests.map((quest) => quest.title), expectedTitles);
});

test("全クエストが表示に必要なデータを持つ", () => {
  for (const quest of quests) {
    assert.deepEqual(Object.keys(quest).sort(), [...requiredKeys].sort());
    for (const route of ["daily", "school"]) {
      assert.deepEqual(Object.keys(quest[route]).sort(), ["firstPrompt", "followUp", "situation"]);
      assert.ok(quest[route].situation);
      assert.ok(quest[route].firstPrompt);
      assert.ok(quest[route].followUp);
    }
  }
});

test("領域は10件ずつで、最初の10回はテキスト入力である", () => {
  assert.deepEqual(
    Object.fromEntries(["text", "media", "thinking"].map((area) => [
      area,
      quests.filter((quest) => quest.area === area).length,
    ])),
    { text: 10, media: 10, thinking: 10 },
  );
  assert.ok(quests.slice(0, 10).every((quest) => quest.inputMode === "text"));
});

test("11回目以降で写真・画像・文書を段階的に体験する", () => {
  const laterModes = quests.slice(10).map((quest) => quest.inputMode);
  assert.ok(laterModes.filter((mode) => mode === "camera").length >= 3);
  assert.ok(laterModes.filter((mode) => mode === "image").length >= 2);
  assert.ok(laterModes.filter((mode) => mode === "document").length >= 3);
});

test("振り返りと対話で本人の判断を促す", () => {
  for (const quest of quests) {
    assert.match(quest.reflectPrompt, /あなた/);
    assert.match(quest.daily.followUp, /私|自分|違和感|合わ|考え|好み|条件/);
    assert.match(quest.school.followUp, /私|自分|違和感|合わ|考え|好み|条件/);
  }
});

test("事実確認が必要な回には具体的な確認方法がある", () => {
  const factChecks = quests.filter((quest) => quest.factCheck.required);
  assert.ok(factChecks.length >= 5);
  assert.ok(factChecks.every((quest) => quest.factCheck.method.length >= 10));
});

test("入力例に個人情報や機密情報の入力を求めない", () => {
  const examples = quests.flatMap((quest) => [
    quest.daily.firstPrompt,
    quest.daily.followUp,
    quest.school.firstPrompt,
    quest.school.followUp,
  ]).join("\n");
  for (const forbidden of ["児童の名前を入", "保護者名を入", "職員名を入", "成績を貼", "健康情報を貼"]) {
    assert.doesNotMatch(examples, new RegExp(forbidden));
  }
  assert.ok(quests.every((quest) => /架空|公開|個人情報なし|個人情報を含まない/.test(
    `${quest.school.firstPrompt}${quest.school.followUp}${quest.safety}`,
  )));
});
