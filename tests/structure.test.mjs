import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

function findRuleContainingSelector(css, selector) {
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  for (const match of css.matchAll(rulePattern)) {
    const selectors = match[1].split(",").map((item) => item.trim());
    if (selectors.includes(selector)) {
      return {
        selectorText: selectors.join(", "),
        selectors,
        declarations: match[2],
      };
    }
  }
  assert.fail(`missing CSS rule for selector: ${selector}`);
}

test("HTML exposes the complete Japanese page structure before JavaScript runs", async () => {
  const html = await read("../index.html");
  const packageJson = JSON.parse(await read("../package.json"));

  assert.match(html, /<html\s+lang="ja"/i);
  assert.match(html, /<meta\s+charset="utf-8"/i);
  assert.match(html, /<meta\s+name="viewport"\s+content="width=device-width,\s*initial-scale=1"/i);
  assert.match(html, /<meta\s+name="description"\s+content="[^"]+"/i);
  assert.match(html, /<title>夏休み限定｜生成AI 夏の自由研究30<\/title>/);
  assert.match(html, /<link\s+rel="icon"\s+href="\.\/assets\/favicon\.svg"/i);
  assert.match(html, /<link\s+rel="stylesheet"\s+href="\.\/css\/styles\.css"/i);
  assert.match(html, /<link\s+rel="stylesheet"\s+href="\.\/css\/print\.css"\s+media="print"/i);
  assert.match(html, /<a[^>]+href="#main"[^>]*>[^<]+<\/a>/i);
  assert.match(html, /<header[^>]+class="hero"/i);
  assert.match(html, /夏休み限定/);
  assert.match(html, /<h1>生成AI 夏の自由研究30<\/h1>/);
  assert.match(html, /30の『ちょっと試してみる』から、気になるものを選ぼう。/);
  assert.match(html, /ちょっと聞く。もう一度頼む。最後は自分で決める。/);
  assert.match(html, /<main\s+id="main"/i);
  assert.equal(
    packageJson.scripts.test,
    "node --test tests/state.test.mjs tests/view-model.test.mjs tests/quests.test.mjs tests/powers.test.mjs tests/power-images.test.mjs tests/structure.test.mjs tests/print-page.test.mjs tests/docs.test.mjs tests/workflow.test.mjs",
  );
  assert.equal(packageJson.scripts["test:smoke"], "node --test tests/smoke.test.mjs");
  assert.equal(packageJson.scripts["test:all"], "npm test && npm run test:smoke");
  assert.equal(packageJson.scripts["test:content"], "node --test tests/quests.test.mjs");
  assert.equal(packageJson.scripts["test:state"], "node --test tests/state.test.mjs");
});

test("HTML provides accessible render targets for progress, filters, quests, and feedback", async () => {
  const html = await read("../index.html");

  assert.match(html, /<section[^>]+aria-labelledby="beginner-guide-title"/i);
  assert.match(html, /<h2\s+id="beginner-guide-title"[^>]*>このサイトの使い方は3つだけ<\/h2>/i);
  assert.match(html, /選ぶ：気になるクエスト（小さなお題）を一つ選ぶ/);
  assert.match(html, /コピー：表示された文章をコピーする/);
  assert.match(html, /生成AIで送る：ChatGPTなどの生成AIを開き、文章を貼り付けて送る/);
  assert.match(
    html,
    /AIの回答が正しいとは限りません。回答を読んで、自分の考えも続けて入力しましょう。/,
  );
  assert.ok(
    html.indexOf('aria-labelledby="beginner-guide-title"') < html.indexOf('aria-labelledby="progress-title"'),
    "初心者向け案内は進み具合より前に置く",
  );
  assert.match(html, /<section[^>]+aria-labelledby="progress-title"/i);
  assert.match(html, /<h2\s+id="progress-title"/i);
  assert.match(html, /<div\s+id="progress"[^>]+aria-live="polite"/i);
  assert.match(
    html,
    /<div\s+id="storage-warning"[^>]+role="status"[^>]+hidden[\s\S]*href="\.\/print\.html"/i,
  );
  assert.match(
    html,
    /この端末では進み具合を保存できません。[\s\S]*印刷用マップをご利用ください。/,
  );
  assert.match(html, /<div\s+class="reset-controls"\s+hidden>/i);
  assert.match(html, /<button\s+id="reset-progress"[^>]*>進み具合をリセット<\/button>/i);
  assert.match(
    html,
    /<div\s+id="reset-confirmation"[^>]+hidden[\s\S]*本当にリセットしますか？[\s\S]*id="confirm-reset"[\s\S]*リセットする[\s\S]*id="cancel-reset"[\s\S]*やめる/i,
  );
  assert.match(html, /<nav\s+id="filters"[^>]+aria-label="[^"]+"/i);
  assert.match(html, /<section[^>]+aria-labelledby="quest-title"/i);
  assert.match(html, /<h2\s+id="quest-title"/i);
  assert.match(html, /<div\s+id="quest-list"\s+class="quest-grid"/i);
  assert.match(
    html,
    /<noscript>[\s\S]*href="\.\/print\.html"[\s\S]*印刷用のクエストマップ[\s\S]*<\/noscript>/i,
  );
  assert.match(html, /<dialog\s+id="quest-dialog"[^>]+aria-labelledby="dialog-title"/i);
  assert.match(html, /<h2\s+id="dialog-title"/i);
  assert.match(html, /<div\s+id="quest-detail"/i);
  assert.match(
    html,
    /<div\s+id="dialog-toast"\s+role="status"\s+aria-live="polite"\s+aria-atomic="true"><\/div>/i,
  );
  assert.match(html, /<button\s+id="close-dialog"[^>]*>/i);
  assert.match(html, /<div\s+id="toast"\s+role="status"\s+aria-live="polite"/i);
  assert.match(html, /<script\s+type="module"\s+src="\.\/js\/app\.js"><\/script>/i);
});

test("power summary avoids duplicate live announcements and keeps concise toast feedback", async () => {
  const html = await read("../index.html");

  assert.match(
    html,
    /<div\s+id="power-summary"\s+class="power-summary">\s*<p>ポイントを読み込んでいます。<\/p>\s*<\/div>/i,
  );
  assert.doesNotMatch(
    html,
    /<div\s+id="power-summary"[^>]*\saria-live=/i,
    "7項目の一括再描画は読み上げず、短いtoast通知を優先する",
  );
  assert.match(html, /<div\s+id="toast"\s+role="status"\s+aria-live="polite"/i);
  assert.match(
    html,
    /<div\s+id="dialog-toast"\s+role="status"\s+aria-live="polite"\s+aria-atomic="true"><\/div>/i,
  );
});

test("seven powers guide is accessible and keeps its images lazy before opening", async () => {
  const html = await read("../index.html");

  assert.match(
    html,
    /<button\s+id="open-powers-guide"\s+type="button"\s+aria-haspopup="dialog">7つの力を見る<\/button>/i,
  );
  assert.match(
    html,
    /<dialog\s+id="powers-dialog"\s+aria-labelledby="powers-dialog-title"/i,
  );
  assert.match(
    html,
    /<h2\s+id="powers-dialog-title">生成AIを使うときに大切な7つの力<\/h2>/i,
  );
  assert.match(
    html,
    /<button\s+id="close-powers-dialog"[^>]*>7つの力の説明を閉じる<\/button>/i,
  );
  assert.match(html, /能力評価ではなく[\s\S]*体験回数/);
  assert.match(
    html,
    /<a[^>]+href="\.\/assets\/seven-powers-1055\.webp"[^>]+target="_blank"[^>]+rel="noopener"[^>]*>[\s\S]*画像を大きく見る[\s\S]*<\/a>/i,
  );
  assert.match(
    html,
    /<source[^>]+data-srcset="\.\/assets\/seven-powers-720\.webp 720w,\s*\.\/assets\/seven-powers-1055\.webp 1055w"/i,
  );
  assert.match(
    html,
    /<img[^>]+data-src="\.\/assets\/seven-powers-720\.webp"[^>]+width="720"[^>]+height="1018"[^>]+alt="[^"]+"/i,
  );
  const imageMarkup = [...html.matchAll(/<(?:source|img)\b[^>]*>/gi)]
    .map(([tag]) => tag)
    .filter((tag) => tag.includes("seven-powers-"))
    .join("\n");
  assert.doesNotMatch(imageMarkup, /\ssrc="\.\/assets\/seven-powers-/i);
  assert.doesNotMatch(imageMarkup, /\ssrcset="\.\/assets\/seven-powers-/i);
  assert.match(html, /<ul\s+id="powers-guide-list"/i);
});

test("app uses explicit beginner-facing action labels", async () => {
  const html = await read("../index.html");
  const app = await read("../js/app.js");
  const viewModel = await read("../js/view-model.js");
  const questData = await read("../js/quests.js");
  const visibleUiSources = [html, app, viewModel, questData];

  for (const label of [
    "生成AIで使うもの",
    "まず、この文章を生成AIに入力してみよう",
    "AIの回答を読んで、合わないところを伝えよう",
    "AIの回答を読んだら、続けてこの文章を入力しよう",
    "この文章をコピー",
    "日常の困りごとで試す",
    "学校の困りごとで試す",
    "できたことにする",
    "できた記録を取り消す",
    "AIの回答が正しいか、別の資料と比べよう",
    "コピーしました。ChatGPTなどの生成AIを開いて貼り付けてください。",
  ]) {
    assert.ok(app.includes(label), `missing explicit label: ${label}`);
  }

  for (const ambiguousLabel of [
    "最初のひとこと",
    "最初の一言",
    "自分の考えを、もう一言",
    "入力文をコピー",
    "入力方法",
    "クリアにする",
  ]) {
    assert.ok(
      visibleUiSources.every((source) => !source.includes(ambiguousLabel)),
      `ambiguous UI label remains: ${ambiguousLabel}`,
    );
  }
});

test("app routes toast messages to one live region and restores regenerated card focus", async () => {
  const app = await read("../js/app.js");

  assert.match(app, /document\.querySelector\("#dialog-toast"\)/);
  assert.match(app, /dialog\.open[\s\S]*dialogToast[\s\S]*toast/);
  assert.match(app, /getQuestFocusSelector\(returnQuestId\)/);
  assert.match(app, /questList\.focus\(\)|main\.focus\(\)/);
});

test("app renders seven-power totals, quest power labels, and point-change feedback", async () => {
  const app = await read("../js/app.js");

  assert.match(app, /POWER_DEFINITIONS/);
  assert.match(app, /calculatePowerProgress/);
  assert.match(app, /ポイントは能力評価ではなく、その力を使う体験をした回数です。/);
  assert.match(app, /主となる力：\$\{model\.primaryPowerName\}　＋1/);
  assert.match(app, /このお題で経験する力/);
  assert.match(app, /一緒に使う力：\$\{model\.supportingPowerName\}　＋1/);
  assert.match(app, /1ポイントずつ加わりました。/);
  assert.match(app, /1ポイントずつ取り消しました。/);
});

test("app keeps interactions usable when storage fails and offers reset confirmation", async () => {
  const app = await read("../js/app.js");

  assert.match(app, /checkStorageAvailability/);
  assert.match(app, /getLocalStorageSafely/);
  assert.match(app, /const storage = getLocalStorageSafely\(\)/);
  assert.match(app, /storage\s*\?\s*loadProgress\(storage\)/);
  assert.match(app, /saveProgress\(progress,\s*storage\)/);
  assert.match(app, /clearProgress\(storage\)/);
  assert.match(app, /checkStorageAvailability\(storage\)/);
  assert.match(app, /storageWarning\.hidden\s*=\s*false/);
  assert.match(app, /clearProgress/);
  assert.match(app, /進み具合をリセットしました/);
  assert.match(app, /resetConfirmation\.hidden\s*=\s*false/);
  assert.match(app, /resetControls\.hidden\s*=\s*false/);
  assert.match(app, /progress\s*=\s*\{\s*completed:\s*\[\],\s*favorites:\s*\[\]\s*\}/);
  assert.match(
    app,
    /生成AIを開けないときは、入力例を読み、どんな返事が来そうか考えるだけでも参加できます。/,
  );
});

test("screen styles define the design tokens, grid, focus, and responsive behavior", async () => {
  const css = await read("../css/styles.css");

  for (const token of [
    "--ink: #203047",
    "--muted: #5c6878",
    "--paper: #fffdf7",
    "--surface: #fff",
    "--text-area: #2d6a73",
    "--media-area: #b45d34",
    "--thinking-area: #6b5aa6",
    "--focus: #005fcc",
    "--radius: 18px",
    "--shadow:",
  ]) {
    assert.ok(css.includes(token), `missing token: ${token}`);
  }
  assert.match(css, /font-family:\s*"BIZ UDPGothic",\s*"Yu Gothic",\s*sans-serif/);
  assert.match(css, /body\s*\{[^}]*margin:\s*0[^}]*line-height:\s*1\.7/s);
  assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*3px\s+solid\s+var\(--focus\)/s);
  assert.match(css, /\.quest-grid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(260px,\s*1fr\)\)/s);
  assert.match(css, /\.power-list\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*18rem\),\s*1fr\)\)[^}]*gap:/s);
  assert.match(css, /\.power-item\s+progress\s*\{[^}]*width:\s*100%/s);
  assert.match(css, /\.quest-card\s*\{[^}]*min-height:\s*180px[^}]*padding:\s*1rem[^}]*border:[^;]+;[^}]*border-radius:\s*var\(--radius\)[^}]*background:\s*var\(--surface\)[^}]*box-shadow:\s*var\(--shadow\)/s);
  assert.match(css, /button[\s\S]*min-height:\s*44px/);
  assert.match(css, /dialog\s*\{[^}]*max-height:\s*calc\(100vh\s*-\s*2rem\);\s*max-height:\s*calc\(100dvh\s*-\s*2rem\)/s);
  assert.match(css, /dialog::backdrop/);
  assert.match(css, /\.screen-reader-only/);
  assert.match(css, /@media\s*\(max-width:\s*640px\)[^{]*\{[\s\S]*padding-inline:\s*1rem/);
  assert.match(css, /@media\s*\(max-width:\s*640px\)[^{]*\{[\s\S]*\.filter-list,\s*\.route-switch,\s*\.detail-actions\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(css, /@media\s*\(max-width:\s*640px\)[^{]*\{[\s\S]*\.filter-list\s+button,\s*\.route-switch\s+button,\s*\.detail-actions\s+button,\s*#open-powers-guide\s*\{[^}]*width:\s*100%/s);
  assert.match(css, /@media\s*\(max-width:\s*640px\)[^{]*\{[\s\S]*\.quest-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(css, /@media\s*\(max-width:\s*640px\)[^{]*\{[\s\S]*dialog\s*\{[^}]*width:\s*calc\(100%\s*-\s*1rem\)[^}]*max-height:\s*calc\(100vh\s*-\s*1rem\);\s*max-height:\s*calc\(100dvh\s*-\s*1rem\)[^}]*padding:\s*1rem/s);
  assert.match(css, /\.prompt-box,\s*\.power-progress,\s*\.powers-guide-list li\s*\{[^}]*min-width:\s*0[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test("print stylesheet formats an A4 three-column checklist and hides controls", async () => {
  const css = await read("../css/print.css");

  assert.match(css, /@page\s*\{[^}]*size:\s*A4\s+portrait[^}]*margin:\s*12mm/s);
  const hiddenSelectors = ["button", "nav", "dialog", "#toast"];
  const hiddenRule = findRuleContainingSelector(css, hiddenSelectors[0]);
  for (const selector of hiddenSelectors) {
    const selectorRule = findRuleContainingSelector(css, selector);
    assert.equal(
      selectorRule.selectorText,
      hiddenRule.selectorText,
      `${selector} must share the print-control hiding rule`,
    );
  }
  assert.match(hiddenRule.declarations, /display:\s*none\s*!important/);
  assert.match(css, /\.quest-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*1fr\)/s);
  assert.match(css, /\.quest-card\s*\{[^}]*break-inside:\s*avoid/s);
  assert.match(css, /font-size:\s*(?:9pt|1[0-9](?:\.\d+)?pt)/);
  assert.doesNotMatch(css, /a\[href\].*::after/s);
});

test("favicon is a self-contained SVG with 30 and a pencil", async () => {
  const svg = await read("../assets/favicon.svg");

  assert.match(svg, /<svg[^>]+viewBox="0 0 \d+ \d+"/i);
  assert.match(svg, />30<\/text>/);
  assert.match(svg, /(?:pencil|鉛筆)/i);
  assert.doesNotMatch(svg, /(?:href|src)=["']https?:\/\//i);
});
