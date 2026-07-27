import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { quests } from "../js/quests.js";
import { POWER_DEFINITIONS } from "../js/powers.js";
import {
  buildPrintPage,
  escapeHtml,
  printableFirstPrompt,
  printableFollowUp,
} from "../scripts/build-print-page.mjs";

const printPageUrl = new URL("../print.html", import.meta.url);

test("escapeHtml protects generated markup", () => {
  assert.equal(escapeHtml(`<>&"'`), "&lt;&gt;&amp;&quot;&#39;");
});

test("print.html is synchronized with the generator and includes all 30 quests", async () => {
  const html = await readFile(printPageUrl, "utf8");
  assert.equal(html, buildPrintPage(quests));
  assert.equal((html.match(/class="[^"]*\bprint-quest\b[^"]*"/g) ?? []).length, 30);
  for (const quest of quests) {
    assert.ok(html.includes(`クエスト ${quest.id}`));
    assert.ok(html.includes(escapeHtml(quest.title)));
    assert.ok(html.includes(escapeHtml(quest.ability)));
  }
  assert.doesNotMatch(html, /<script\b/i);
  assert.match(html, /href="\.\/css\/print\.css"/);
});

test("print.html contains complete representative routes and guidance", async () => {
  const html = await readFile(printPageUrl, "utf8");
  for (const id of [1, 12, 26, 30]) {
    const quest = quests[id - 1];
    for (const text of [
      `クエスト ${quest.id}`,
      quest.title,
      quest.ability,
      quest.daily.situation,
      printableFirstPrompt(quest.daily.firstPrompt),
      printableFollowUp(quest.daily.followUp),
      quest.school.situation,
      printableFirstPrompt(quest.school.firstPrompt),
      printableFollowUp(quest.school.followUp),
      quest.safety,
    ]) {
      assert.ok(html.includes(escapeHtml(text)), `quest ${id} is missing: ${text}`);
    }
    if (quest.factCheck.required) {
      assert.ok(html.includes(escapeHtml(quest.factCheck.method)));
    }
  }
  assert.equal((html.match(/class="hand-check"/g) ?? []).length, 30);
});

test("印刷版は空欄を手書きできる下線にし、書きにくいときの例を添える", () => {
  const sample = { template: "私は「____」が気になりました。", hints: ["ア", "イ", "ウ"] };
  assert.equal(printableFollowUp(sample), "私は「＿＿＿＿＿＿＿＿」が気になりました。");
  assert.doesNotMatch(printableFollowUp(sample), /____/);
});

test("印刷版は3ステップのチェック欄と、全30問の例を載せる", async () => {
  const html = await readFile(printPageUrl, "utf8");
  assert.match(html, /□ ①送った　□ ②自分の言葉で返した　□ ③使い方を決めた/);
  assert.doesNotMatch(html, /____/, "画面用の空欄記号が紙面に残っている");
  assert.equal((html.match(/class="print-hints"/g) ?? []).length, 60);
  for (const quest of quests) {
    assert.ok(html.includes(escapeHtml(quest.daily.followUp.hints.join(" ／ "))));
  }
  // 最終回の差し込み記号は、紙面にそのまま出さない
  assert.doesNotMatch(html, /\{\{cleared\}\}/);
});

test("print.html uses explicit beginner labels and shows both powers", async () => {
  const html = await readFile(printPageUrl, "utf8");
  const powerNames = new Map(
    POWER_DEFINITIONS.map(({ id, name }) => [id, name]),
  );

  for (const label of [
    "生成AIで使うもの",
    "まず、この文章を生成AIに入力してみよう",
    "AIの回答を読んだら、続けてこの文章を入力しよう",
    "主となる力",
    "一緒に使う力",
  ]) {
    assert.ok(html.includes(label), `print page is missing beginner label: ${label}`);
  }
  assert.doesNotMatch(html, /最初の一言|自分の考えを、もう一言/);

  for (const quest of quests) {
    assert.ok(html.includes(escapeHtml(powerNames.get(quest.primaryPower))));
    assert.ok(html.includes(escapeHtml(powerNames.get(quest.supportingPower))));
  }
});
