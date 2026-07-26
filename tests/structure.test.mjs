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
});

test("HTML provides accessible render targets for progress, filters, quests, and feedback", async () => {
  const html = await read("../index.html");

  assert.match(html, /<section[^>]+aria-labelledby="progress-title"/i);
  assert.match(html, /<h2\s+id="progress-title"/i);
  assert.match(html, /<div\s+id="progress"[^>]+aria-live="polite"/i);
  assert.match(html, /<nav\s+id="filters"[^>]+aria-label="[^"]+"/i);
  assert.match(html, /<section[^>]+aria-labelledby="quest-title"/i);
  assert.match(html, /<h2\s+id="quest-title"/i);
  assert.match(html, /<div\s+id="quest-list"\s+class="quest-grid"/i);
  assert.match(
    html,
    /クエストを表示するにはJavaScriptを有効にしてください。JavaScriptが使えない場合は、印刷用のクエストマップをご利用ください。/,
  );
  assert.match(html, /<dialog\s+id="quest-dialog"[^>]+aria-labelledby="dialog-title"/i);
  assert.match(html, /<h2\s+id="dialog-title"/i);
  assert.match(html, /<div\s+id="quest-detail"/i);
  assert.match(html, /<button\s+id="close-dialog"[^>]*>/i);
  assert.match(html, /<div\s+id="toast"\s+role="status"\s+aria-live="polite"/i);
  assert.match(html, /<script\s+type="module"\s+src="\.\/js\/app\.js"><\/script>/i);
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
  assert.match(css, /\.quest-card\s*\{[^}]*min-height:\s*180px[^}]*padding:\s*1rem[^}]*border:[^;]+;[^}]*border-radius:\s*var\(--radius\)[^}]*background:\s*var\(--surface\)[^}]*box-shadow:\s*var\(--shadow\)/s);
  assert.match(css, /button[\s\S]*min-height:\s*44px/);
  assert.match(css, /dialog::backdrop/);
  assert.match(css, /\.screen-reader-only/);
  assert.match(css, /@media\s*\(max-width:\s*640px\)[^{]*\{[\s\S]*padding-inline:\s*1rem/);
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
