import assert from "node:assert/strict";
import test from "node:test";

import { CATEGORIES, challenges } from "../js/challenges.js";
import { HELP_TEXTS, SEND_TYPES } from "../js/view-model.js";

const EXPECTED_CATEGORY_COUNTS = {
  write: 8,
  organize: 7,
  expand: 6,
  verify: 5,
  photo: 4,
};

test("30件が1から30まで重複なく並ぶ", () => {
  assert.equal(challenges.length, 30);
  assert.deepEqual(challenges.map(({ id }) => id), [...Array(30)].map((_, i) => i + 1));
  const titles = challenges.map(({ title }) => title);
  assert.equal(new Set(titles).size, 30, "題名が重複している");
});

test("カテゴリーは5種で、件数が設計どおり", () => {
  assert.deepEqual(CATEGORIES.map(({ id }) => id), Object.keys(EXPECTED_CATEGORY_COUNTS));
  assert.ok(CATEGORIES.every(({ name }) => name.length > 0));
  const counts = {};
  for (const item of challenges) counts[item.category] = (counts[item.category] ?? 0) + 1;
  assert.deepEqual(counts, EXPECTED_CATEGORY_COUNTS);
});

test("表示に必要なデータがそろっている", () => {
  const keys = ["id", "category", "title", "intro", "send", "reply", "followUp"];
  for (const item of challenges) {
    assert.deepEqual(Object.keys(item).sort(), [...keys].sort(), `id ${item.id}`);
    assert.ok(item.title.length >= 6, `id ${item.id} の題名が短すぎる`);
    assert.ok(item.intro.length >= 40, `id ${item.id} の紹介文が短すぎる`);
    assert.deepEqual(Object.keys(item.send).sort(), ["prompt", "steps", "type"]);
    assert.ok(SEND_TYPES[item.send.type], `id ${item.id} の送り方が不正`);
    assert.ok(item.send.prompt.length > 0);
    assert.ok(item.send.steps.length >= 2, `id ${item.id} の手順が少なすぎる`);
    assert.deepEqual(Object.keys(item.followUp).sort(), ["hints", "template"]);
  }
});

test("題名は場面の説明で、命令形を使わない", () => {
  for (const item of challenges) {
    assert.doesNotMatch(item.title, /せよ$|え$|よ$/, `id ${item.id}: ${item.title}`);
  }
});

test("紹介文は2文以上で、読み手の場面から入る", () => {
  for (const item of challenges) {
    assert.ok(item.intro.includes("\n"), `id ${item.id} の紹介文が1行しかない`);
  }
});

test("2通目は空欄ひとつと例3つを持ち、言い回しが偏らない", () => {
  const templates = [];
  for (const item of challenges) {
    const { template, hints } = item.followUp;
    assert.equal(template.split("____").length - 1, 1, `id ${item.id} の空欄が1つでない`);
    assert.equal(hints.length, 3, `id ${item.id} の例が3つでない`);
    for (const hint of hints) {
      assert.ok(hint.trim().length > 0);
      assert.doesNotMatch(hint, /てください。?$|。$/, `id ${item.id} の例に文末表現がある`);
    }
    templates.push(template);
  }
  assert.equal(new Set(templates).size, 30, "2通目の文が重複している");
  const leading = templates.filter((t) => t.startsWith("私は")).length;
  assert.ok(leading <= 10, `「私は」で始まる文が多すぎる: ${leading}`);
});

test("返事を読む場面が、毎回そのチャレンジのねらいとして書かれている", () => {
  const replies = challenges.map(({ reply }) => reply);
  for (const [index, reply] of replies.entries()) {
    assert.match(reply, /^返事が来ます/, `id ${index + 1}`);
    assert.ok(reply.length >= 20, `id ${index + 1} の一行が短すぎる`);
  }
  assert.equal(new Set(replies).size, 30, "返事の一行が使い回されている");
});

test("手順は送信の回数と、同じメッセージであることを明示する", () => {
  for (const item of challenges) {
    const text = item.send.steps.map(({ text: value }) => value).join("\n");
    assert.match(text, /送信|送りま/, `id ${item.id} に送信の手順がない`);
    if (item.send.type !== "asis") {
      assert.match(
        text,
        /同じメッセージ|同じ入力欄|まとめて/,
        `id ${item.id} で添付・貼り付けと文章が同じ送信だと分からない`,
      );
      assert.match(text, /1回/, `id ${item.id} に送信が1回だと書かれていない`);
    }
  }
});

test("補足は共通の4本だけを参照し、1件につき2個までにする", () => {
  const allowed = Object.keys(HELP_TEXTS);
  assert.deepEqual(allowed.sort(), ["attach", "newmsg", "once", "paste"]);
  for (const item of challenges) {
    const used = item.send.steps.filter(({ help }) => help).map(({ help }) => help);
    assert.ok(used.length <= 2, `id ${item.id} の補足が多すぎる: ${used.length}`);
    for (const help of used) {
      assert.ok(allowed.includes(help), `id ${item.id} に未知の補足 ${help}`);
    }
  }
});

test("写真のカテゴリーは全て添付、送り方の配分がかたよらない", () => {
  for (const item of challenges.filter(({ category }) => category === "photo")) {
    assert.equal(item.send.type, "attach", `id ${item.id}`);
  }
  const counts = {};
  for (const item of challenges) counts[item.send.type] = (counts[item.send.type] ?? 0) + 1;
  assert.ok(counts.asis >= 12 && counts.asis <= 18, `そのままコピーが ${counts.asis} 件`);
  assert.ok(counts.paste >= 6, `貼り付けが ${counts.paste} 件`);
  assert.ok(counts.attach >= 6, `添付が ${counts.attach} 件`);
});

test("添付・撮影の回は、写り込みを確かめる手順を含む", () => {
  for (const item of challenges.filter((c) => c.send.type === "attach")) {
    const text = item.send.steps.map(({ text: value }) => value).join("\n");
    assert.match(
      text,
      /名前|住所|個人|写り込|公開/,
      `id ${item.id} に、写り込みまたは公開資料であることの確認がない`,
    );
  }
});

test("ゲーム由来の語と、チャレンジ同士の参照を残さない", () => {
  const source = challenges.flatMap((item) => [
    item.title,
    item.intro,
    item.reply,
    item.send.prompt,
    item.followUp.template,
    ...item.followUp.hints,
    ...item.send.steps.map(({ text }) => text),
  ]).join("\n");
  for (const word of ["クエスト", "ポイント", "称号", "レベル", "クリア", "７つの力", "7つの力"]) {
    assert.ok(!source.includes(word), `ゲーム由来の語が残っている: ${word}`);
  }
  assert.doesNotMatch(source, /チャレンジ\s*\d+/, "チャレンジ同士を番号で参照している");
});

test("入力例に個人情報を求めない", () => {
  const source = challenges.flatMap((item) => [
    item.send.prompt,
    item.followUp.template,
    ...item.followUp.hints,
  ]).join("\n");
  for (const forbidden of ["児童名", "保護者名", "職員名", "実名", "成績を", "健康情報", "顔写真"]) {
    assert.ok(!source.includes(forbidden), `個人情報の語が含まれる: ${forbidden}`);
  }
});
