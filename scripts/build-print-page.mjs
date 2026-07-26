import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { quests } from "../js/quests.js";
import { POWER_DEFINITIONS } from "../js/powers.js";

const powerNames = new Map(
  POWER_DEFINITIONS.map(({ id, name }) => [id, name]),
);

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function routeMarkup(label, route) {
  return `        <section class="print-route">
          <h3>${escapeHtml(label)}</h3>
          <p><strong>生成AIで使うもの：</strong>${escapeHtml(route.situation)}</p>
          <p><strong>まず、この文章を生成AIに入力してみよう：</strong>${escapeHtml(route.firstPrompt)}</p>
          <p><strong>AIの回答を読んだら、続けてこの文章を入力しよう：</strong>${escapeHtml(route.followUp)}</p>
        </section>`;
}

function questMarkup(quest) {
  const factCheck = quest.factCheck.required
    ? `
        <p><strong>事実を確かめる：</strong>${escapeHtml(quest.factCheck.method)}</p>`
    : "";
  return `      <article class="quest-card print-quest">
        <p class="hand-check">□ 試した　□ 振り返った</p>
        <p class="quest-number">クエスト ${quest.id}</p>
        <h2 class="quest-title">${escapeHtml(quest.title)}</h2>
        <p><strong>身につくこと：</strong>${escapeHtml(quest.ability)}</p>
        <p><strong>主となる力：</strong>${escapeHtml(powerNames.get(quest.primaryPower))}</p>
        <p><strong>一緒に使う力：</strong>${escapeHtml(powerNames.get(quest.supportingPower))}</p>
${routeMarkup("日常で試す", quest.daily)}
${routeMarkup("学校で試す", quest.school)}
        <p><strong>安全に使うために：</strong>${escapeHtml(quest.safety)}</p>${factCheck}
      </article>`;
}

export function buildPrintPage(items) {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>印刷用クエストマップ｜生成AI 夏の自由研究30</title>
    <link rel="stylesheet" href="./css/styles.css">
    <link rel="stylesheet" href="./css/print.css">
  </head>
  <body>
    <header class="hero">
      <div class="hero__inner">
        <p class="eyebrow">印刷用クエストマップ</p>
        <h1>生成AI 夏の自由研究30</h1>
        <p class="hero__lead">気になるクエストを選び、試したら手書きでチェックしましょう。</p>
      </div>
    </header>
    <main class="site-main">
      <div class="quest-grid">
${items.map(questMarkup).join("\n")}
      </div>
    </main>
  </body>
</html>
`;
}

const isMain = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  await writeFile(new URL("../print.html", import.meta.url), buildPrintPage(quests), "utf8");
}
