import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { quests } from "../js/quests.js";
import { buildPrintPage, escapeHtml } from "../scripts/build-print-page.mjs";

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
      quest.daily.firstPrompt,
      quest.daily.followUp,
      quest.school.situation,
      quest.school.firstPrompt,
      quest.school.followUp,
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
