import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { challenges } from "../js/challenges.js";
import { FOLLOW_UP_STEPS, SAFETY_NOTE, SEND_TYPES } from "../js/view-model.js";
import {
  buildPrintPage,
  escapeHtml,
  printableTemplate,
} from "../scripts/build-print-page.mjs";

const printPageUrl = new URL("../print.html", import.meta.url);

test("escapeHtml が生成物を守る", () => {
  assert.equal(escapeHtml(`<>&"'`), "&lt;&gt;&amp;&quot;&#39;");
});

test("print.html は生成器の出力と完全に一致する", async () => {
  const html = await readFile(printPageUrl, "utf8");
  assert.equal(html, buildPrintPage(challenges));
  assert.equal((html.match(/class="print-challenge"/g) ?? []).length, 30);
  assert.doesNotMatch(html, /<script\b/i);
  assert.match(html, /href="\.\/css\/print\.css"/);
});

test("30件すべての本文が紙面に載る", async () => {
  const html = await readFile(printPageUrl, "utf8");
  for (const challenge of challenges) {
    assert.ok(html.includes(escapeHtml(challenge.title)), `題名が無い: ${challenge.title}`);
    assert.ok(html.includes(escapeHtml(challenge.send.prompt)), `送る文が無い: id ${challenge.id}`);
    assert.ok(html.includes(escapeHtml(challenge.reply)), `返事の一行が無い: id ${challenge.id}`);
    assert.ok(
      html.includes(escapeHtml(printableTemplate(challenge.followUp.template))),
      `2通目が無い: id ${challenge.id}`,
    );
    assert.ok(
      html.includes(escapeHtml(challenge.followUp.hints.join(" ／ "))),
      `例が無い: id ${challenge.id}`,
    );
    for (const step of challenge.send.steps) {
      assert.ok(html.includes(escapeHtml(step.text)), `手順が無い: id ${challenge.id}`);
    }
  }
  assert.equal((html.match(/class="print-check"/g) ?? []).length, 30);
  assert.equal((html.match(/class="print-safety"/g) ?? []).length, 30);
  assert.ok(html.includes(escapeHtml(SAFETY_NOTE)));
});

test("紙面では空欄を手書きできる下線にする", async () => {
  assert.equal(printableTemplate("「____」が気になりました。"), "「＿＿＿＿＿＿＿＿」が気になりました。");
  const html = await readFile(printPageUrl, "utf8");
  assert.doesNotMatch(html, /____/, "画面用の空欄記号が紙面に残っている");
});

test("送り方のラベルと2通目の手順が紙面にも出る", async () => {
  const html = await readFile(printPageUrl, "utf8");
  for (const type of Object.values(SEND_TYPES)) {
    const used = challenges.some((challenge) => challenge.send.type === type.id);
    if (used) assert.ok(html.includes(escapeHtml(type.label)), `送り方が無い: ${type.label}`);
  }
  assert.ok(html.includes("1回目 —"));
  assert.ok(html.includes("2回目 —"));
  for (const step of FOLLOW_UP_STEPS) {
    assert.ok(html.includes(escapeHtml(step.text)), `2通目の手順が無い: ${step.text}`);
  }
});

test("ゲーム由来の語を紙面にも残さない", async () => {
  const html = await readFile(printPageUrl, "utf8");
  for (const word of ["クエスト", "称号", "ポイント", "7つの力", "７つの力"]) {
    assert.ok(!html.includes(word), `紙面に残っている: ${word}`);
  }
});
