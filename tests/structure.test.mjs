import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

const stripComments = (css) => css.replaceAll(/\/\*[\s\S]*?\*\//g, "");

function findRuleContainingSelector(css, selector) {
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  for (const match of stripComments(css).matchAll(rulePattern)) {
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
  // 敷居を下げる一文は、設計書の案内文どおり画面にも出す
  assert.match(html, /1個だけでも、順番どおりでなくてもOK！/);
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
  assert.match(html, /クエストは①送る→②自分の言葉で返す→③使い方を決める、の3ステップで進みます。/);
  assert.ok(
    html.indexOf('aria-labelledby="beginner-guide-title"') < html.indexOf('aria-labelledby="progress-title"'),
    "初心者向け案内は進み具合より前に置く",
  );
  assert.match(html, /<section\s+id="suggestion"\s+class="suggestion"\s+aria-label="[^"]+"/i);
  assert.ok(
    html.indexOf('id="suggestion"') < html.indexOf('aria-labelledby="progress-title"'),
    "迷ったときの候補は進み具合より前に置く",
  );
  // 進める速さは利用者が決める。日付にクエストを割り当てない。
  assert.match(html, /1日に何個やっても、やらない日があってもかまいません。/);
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
    "AIの回答が正しいか、別の資料と比べよう",
    "コピーしました。ChatGPTなどの生成AIを開いて貼り付けてください。",
    "AIの回答を読んで、気になったところを短い言葉で書く",
    "書きにくいときは、ここから選ぶ",
    "AIの答えをどう使うか、自分で決める",
    "このクエストのURLをコピー",
    "このクエストの記録を消す",
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
    // 3ステップ制にしたので、1クリックで完了にする言い回しは残さない
    "できたことにする",
    "できた記録を取り消す",
  ]) {
    assert.ok(
      visibleUiSources.every((source) => !source.includes(ambiguousLabel)),
      `ambiguous UI label remains: ${ambiguousLabel}`,
    );
  }
});

test("クエストは3ステップの通過を記録し、判断で完了する", async () => {
  const app = await read("../js/app.js");
  const state = await read("../js/state.js");

  for (const label of ["AIに送った", "自分の言葉で返した", "使い方を決めた"]) {
    assert.ok(state.includes(label), `missing step label: ${label}`);
  }
  for (const label of ["そのまま使える", "直せば使える", "使わない"]) {
    assert.ok(state.includes(label), `missing verdict label: ${label}`);
  }
  assert.match(app, /markStep\(progress,\s*quest\.id,\s*step/);
  assert.match(app, /setVerdict\(progress,\s*quest\.id,\s*verdict/);

  // 順序は見た目で誘導する。押せなくすると、生成AIを開けない人が参加を記録できない
  assert.match(app, /step-button--\$\{state\}/);
  assert.doesNotMatch(app, /disabled:\s*!done/);
  assert.doesNotMatch(app, /disabled:\s*!previousDone/);
});

test("安全上の注意は畳まず、入力欄のそばにも書いてある", async () => {
  const app = await read("../js/app.js");
  const css = await read("../css/styles.css");

  // 自由入力欄を置いた画面なので、注意は常に見えている必要がある
  assert.match(app, /function safetyBanner/);
  assert.match(app, /safetyBanner\(model\)/);
  assert.match(app, /名前など個人が分かる言葉は書かないでください。/);
  assert.match(css, /\.safety-banner\s*\{[^}]*background:\s*var\(--warn-bg\)/s);

  // 畳んでよいのは、安全以外の定型文だけ
  const details = app.slice(app.indexOf("function referenceDetails"), app.indexOf("function safetyBanner"));
  assert.doesNotMatch(details, /安全に使うために/);
  assert.match(app, /毎回共通の補足（材料の扱い・開けないとき）/);
});

test("2通目は利用者が言葉を入れる欄になり、端末にも保存しない", async () => {
  const app = await read("../js/app.js");

  assert.match(app, /splitFollowUpTemplate/);
  assert.match(app, /buildFollowUpText/);
  assert.match(app, /id:\s*"follow-up-input"/);
  assert.match(app, /ここに書いた言葉は、この端末にも保存されません。/);
  // 下書きはモジュール変数だけに置き、保存対象に含めない
  assert.match(app, /let followUpDraft = ""/);
  assert.doesNotMatch(app, /saveProgress\([^)]*followUpDraft/);
  assert.doesNotMatch(app, /followUpDraft[^\n]*localStorage/);
});

test("毎回同じ定型文は畳み、添付が要る回には練習素材を出す", async () => {
  const app = await read("../js/app.js");
  const viewModel = await read("../js/view-model.js");

  assert.match(app, /el\("details",\s*\{\s*className:\s*"reference-details"/);
  assert.match(app, /毎回共通の補足/);
  assert.match(app, /sampleMaterial/);
  for (const asset of ["sample-notice.md", "sample-screen.svg", "sample-draft.md"]) {
    assert.ok(viewModel.includes(asset), `missing sample material: ${asset}`);
  }
});

test("ルートの選択はクエストをまたいで保たれる", async () => {
  const app = await read("../js/app.js");
  const openQuest = app.slice(app.indexOf("function openQuest"), app.indexOf("function removeQuestHash"));
  assert.doesNotMatch(openQuest, /activeRoute\s*=/, "クエストを開くたびに日常ルートへ戻してはいけない");
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
  // 力ごとの総ポイントがそろわない理由を画面で説明する
  assert.match(app, /総ポイントは、その力を使うクエストの数です。/);
});

test("7つの力は絵でも見分けられ、カードと一覧の両方に出る", async () => {
  const app = await read("../js/app.js");
  const icons = await read("../js/power-icons.js");
  const { POWER_DEFINITIONS } = await import("../js/powers.js");
  const { POWER_ICON_PATHS, powerIconMarkup } = await import("../js/power-icons.js");

  assert.deepEqual(
    Object.keys(POWER_ICON_PATHS).sort(),
    POWER_DEFINITIONS.map(({ id }) => id).sort(),
  );
  assert.ok(Object.values(POWER_ICON_PATHS).every((paths) => paths.length > 0));
  assert.match(powerIconMarkup("agency"), /^<svg[^>]+viewBox="0 0 24 24"/);
  assert.match(powerIconMarkup("agency"), /aria-hidden="true"/);
  assert.match(powerIconMarkup("agency", { title: "主体性の剣" }), /aria-label="主体性の剣"/);
  assert.equal(powerIconMarkup("unknown"), "");
  assert.doesNotMatch(icons, /(?:href|src)=["']https?:\/\//i);

  assert.match(app, /createPowerIcon/);
  assert.match(app, /className:\s*"quest-power"/);
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
  assert.match(app, /progress\s*=\s*emptyProgress\(\)/);
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
  assert.match(css, /@media\s*\(max-width:\s*640px\)[^{]*\{[\s\S]*\.filter-list,\s*\.route-switch,\s*\.detail-actions,\s*\.suggestion__actions\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(css, /@media\s*\(max-width:\s*640px\)[^{]*\{[\s\S]*\.filter-list\s+button,\s*\.route-switch\s+button,\s*\.detail-actions\s+button,\s*\.suggestion__actions\s+button,\s*#open-powers-guide\s*\{[^}]*width:\s*100%/s);
  assert.match(css, /@media\s*\(max-width:\s*640px\)[^{]*\{[\s\S]*\.quest-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(css, /@media\s*\(max-width:\s*640px\)[^{]*\{[\s\S]*dialog\s*\{[^}]*width:\s*calc\(100%\s*-\s*1rem\)[^}]*max-height:\s*calc\(100vh\s*-\s*1rem\);\s*max-height:\s*calc\(100dvh\s*-\s*1rem\)[^}]*padding:\s*1rem/s);
  assert.match(css, /\.prompt-box,\s*\.power-progress,\s*\.powers-guide-list li\s*\{[^}]*min-width:\s*0[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test("説明・操作・考える・注意の4つの役割が見た目で区別されている", async () => {
  const css = await read("../css/styles.css");

  for (const token of ["--action-line:", "--think-bg:", "--warn-line:", "--warn-bg:", "--done:"]) {
    assert.ok(css.includes(token), `missing role token: ${token}`);
  }

  // 操作（コピーして送る文）と注意（確かめること）が同じ規則を共有してはいけない
  const promptRule = findRuleContainingSelector(css, ".prompt-box");
  const factCheckRule = findRuleContainingSelector(css, ".fact-check");
  const reflectionRule = findRuleContainingSelector(css, ".reflection");
  assert.notEqual(promptRule.selectorText, factCheckRule.selectorText);
  assert.notEqual(promptRule.selectorText, reflectionRule.selectorText);
  assert.notEqual(reflectionRule.selectorText, factCheckRule.selectorText);
  assert.ok(
    !findRuleContainingSelector(css, ".prompt-box").selectors.includes(".safety-note"),
    "コピーする文と安全上の注意を同じ見た目にしてはいけない",
  );

  // 操作は濃い枠の白地、考えるは淡い黄、注意は警告色
  assert.match(promptRule.declarations, /border:\s*2px\s+solid\s+var\(--action-line\)/);
  assert.match(promptRule.declarations, /background:\s*var\(--action-bg\)/);
  assert.match(reflectionRule.declarations, /background:\s*var\(--think-bg\)/);
  assert.match(factCheckRule.declarations, /border:\s*2px\s+solid\s+var\(--warn-line\)/);
  assert.match(factCheckRule.declarations, /background:\s*var\(--warn-bg\)/);

  // 警告色は注意の役割だけで使う
  const warnUsers = [...stripComments(css).matchAll(/([^{}]+)\{([^{}]*var\(--warn-line\)[^{}]*)\}/g)]
    .map(([, selector]) => selector.trim());
  assert.ok(warnUsers.length > 0);
  assert.ok(
    warnUsers.every((selector) => /fact-check|safety-banner|verdict--skip/.test(selector)),
    `警告色が注意以外で使われている: ${warnUsers.join(" / ")}`,
  );

  // 見出しと本文の大きさの差、番号バッジ、ステップ表示
  assert.match(css, /h3\s*\{[^}]*font-size:\s*var\(--label-size\)/s);
  assert.match(css, /\.quest-number--text\s*\{[^}]*background:\s*var\(--text-area\)/s);
  assert.match(css, /\.quest-number--media\s*\{[^}]*background:\s*var\(--media-area\)/s);
  assert.match(css, /\.quest-number--thinking\s*\{[^}]*background:\s*var\(--thinking-area\)/s);
  assert.match(css, /\.step-tracker__item--done\s*\{[^}]*border-color:\s*var\(--done\)/s);
  assert.match(css, /\.action-block__number\s*\{/);
  assert.match(css, /\.reference-details\s*\{/);
  assert.match(css, /\.followup-input\s*\{[^}]*min-height:\s*44px/s);
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
