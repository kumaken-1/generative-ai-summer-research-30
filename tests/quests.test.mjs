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
  "primaryPower",
  "supportingPower",
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
  "自分専用の相談文を作れ",
  "自分の「マイ孫の手」を発見せよ",
];

const expectedAbilities = [
  "普通の言葉で相談する",
  "一文だけで尋ねる",
  "続きを一緒に考える",
  "相手に合わせて言い換える",
  "追加の一言で調整する",
  "メモを文章にする",
  "選択肢を広げる",
  "説明方法を変えさせる",
  "困りごとを言葉で説明して整理する",
  "使い道を自分の生活から探す",
  "比較する",
  "初めて写真を撮影・添付する",
  "写真を添付してチェックリスト化する",
  "予定を調整する",
  "文章・文書を渡して簡単にし原文へ戻る",
  "質問を作る",
  "写真・スクリーンショットを添付して観点を増やす",
  "頼み方・断り方を考える",
  "考えを整理する",
  "AI案を完成品にせず自分の考えを加える",
  "好みを言葉にする",
  "条件を追加する",
  "違和感を言葉にして対話を続ける",
  "部分的に採用する",
  "最初の案を唯一とせず別の見方を集める",
  "公開資料を添付し回答を原文と比べる",
  "スクリーンショットや回答から検証方法を尋ねる",
  "自分の言葉に直す",
  "よく使う入口を決める",
  "体験を振り返る",
];

test("30個のクエストが1から30まで重複なく存在する", () => {
  assert.equal(quests.length, 30);
  assert.deepEqual(quests.map((quest) => quest.id), [...Array(30)].map((_, i) => i + 1));
  assert.deepEqual(quests.map((quest) => quest.title), expectedTitles);
  assert.deepEqual(quests.map((quest) => quest.ability), expectedAbilities);
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
  assert.ok(quests.slice(0, 10).every((quest) => quest.area === "text"));
  assert.ok(quests.slice(10, 20).every((quest) => quest.area === "media"));
  assert.ok(quests.slice(20, 30).every((quest) => quest.area === "thinking"));
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
  assert.deepEqual(factChecks.map((quest) => quest.id), [11, 15, 17, 26, 27]);
  assert.ok(factChecks.every((quest) => quest.factCheck.method.length >= 10));
  assert.ok(factChecks.every((quest) => /原文|発行元|更新日|一次資料|公式|複数/.test(
    quest.factCheck.method,
  )));
});

test("入力例に個人情報や機密情報の入力を求めない", () => {
  const examples = quests.flatMap((quest) => [
    quest.daily.firstPrompt,
    quest.daily.followUp,
    quest.school.firstPrompt,
    quest.school.followUp,
  ]).join("\n");
  for (const forbidden of [
    "児童名",
    "児童の名前を入",
    "保護者名",
    "職員名",
    "実名",
    "成績を貼",
    "健康情報を貼",
    "顔写真を添付",
  ]) {
    assert.doesNotMatch(examples, new RegExp(forbidden));
  }
  const schoolPrefix = "個人情報を含まない架空・公開の内容で試します。";
  assert.ok(quests.every((quest) => quest.school.firstPrompt.startsWith(schoolPrefix)));

  const attachmentQuests = quests.filter((quest) =>
    ["camera", "image", "document"].includes(quest.inputMode));
  for (const quest of attachmentQuests) {
    for (const route of ["daily", "school"]) {
      assert.match(quest[route].firstPrompt, /個人情報|名前や住所/);
      assert.match(quest[route].firstPrompt, /架空|公開/);
    }
  }
});

test("関連参照と入力方式と安全・事実確認の型が有効である", () => {
  const inputModes = new Set(["text", "paste", "camera", "image", "document"]);
  for (const quest of quests) {
    assert.ok(inputModes.has(quest.inputMode));
    assert.ok(Array.isArray(quest.related));
    assert.ok(quest.related.every((id) =>
      Number.isInteger(id) && id >= 1 && id <= 30 && id !== quest.id));
    assert.equal(typeof quest.factCheck.required, "boolean");
    assert.equal(typeof quest.factCheck.method, "string");
    assert.ok(quest.safety.trim().length > 0);
  }
});
