# Beginner Language, Mobile, and Seven Powers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 初めて生成AIを使う教職員が携帯から迷わず30のお題を試し、7つの力ごとの獲得ポイントを確認し、軽量な「7つの力」画像ガイドを利用できるようにする。

**Architecture:** 30題の本文は `js/quests.js`、7つの力の定義とポイント計算は新設する `js/powers.js` に分ける。既存の完了IDだけを `localStorage` に保存し、ポイントは完了IDと分類から毎回導出するため、保存形式は変更しない。初心者向け案内と2つのダイアログは既存の静的HTML・JavaScript構成を維持し、画像は公開用WebPだけを遅延読込する。

**Tech Stack:** HTML、CSS、JavaScript ES modules、Node.js test runner、Playwright 1.62.0、Sharp（画像変換・メタデータ検証）、GitHub Actions、GitHub Pages

---

## File Responsibilities

- `js/quests.js`: 30題の本文、入力方式、主となる力、一緒に使う力
- `js/powers.js`: 7つの力の定義、総ポイント、獲得ポイント計算
- `js/view-model.js`: 初心者向け表示ラベル、入力方法別の操作説明
- `js/app.js`: 進捗・ポイント描画、初心者向け詳細、画像ガイドの開閉と遅延読込
- `index.html`: 最初の3手順、7つの力ボタンとガイドダイアログの静的骨格
- `css/styles.css`: ポイント表示、画像ガイド、携帯向け操作
- `scripts/build-power-images.mjs`: 親フォルダの元PNGから公開用WebPを生成
- `scripts/build-print-page.mjs`: 初心者向け共通語彙と力の表示を印刷版へ反映
- `tests/*.test.mjs`: データ契約、語彙、ポイント、画像、レスポンシブ操作

### Task 1: Seven Powers Data Contract

**Files:**
- Create: `js/powers.js`
- Modify: `js/quests.js`
- Create: `tests/powers.test.mjs`
- Modify: `tests/quests.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing power-definition tests**

`tests/powers.test.mjs` に次を追加する。

```js
import test from "node:test";
import assert from "node:assert/strict";
import { quests } from "../js/quests.js";
import {
  POWER_DEFINITIONS,
  calculatePowerProgress,
  powerTotals,
} from "../js/powers.js";

const expectedTotals = {
  agency: 9,
  safety: 7,
  delegation: 7,
  instruction: 13,
  dialogue: 11,
  verification: 6,
  finishing: 7,
};

test("seven powers have stable beginner-facing names", () => {
  assert.deepEqual(
    POWER_DEFINITIONS.map(({ id, name }) => [id, name]),
    [
      ["agency", "主体性の剣"],
      ["safety", "情報守りの盾"],
      ["delegation", "仕事選びの羅針盤"],
      ["instruction", "指示の魔法袋"],
      ["dialogue", "対話の杖"],
      ["verification", "真実を映す鏡"],
      ["finishing", "仕上げのたい焼き"],
    ],
  );
});

test("every quest has one primary and one distinct supporting power", () => {
  for (const quest of quests) {
    assert.ok(expectedTotals[quest.primaryPower]);
    assert.ok(expectedTotals[quest.supportingPower]);
    assert.notEqual(quest.primaryPower, quest.supportingPower);
  }
});

test("power totals match the approved 60-point classification", () => {
  assert.deepEqual(powerTotals(quests), expectedTotals);
  assert.equal(Object.values(expectedTotals).reduce((sum, value) => sum + value, 0), 60);
});

test("completed quests add one point to both tagged powers without duplicates", () => {
  const progress = calculatePowerProgress(quests, [1, 1, 26, 999]);
  assert.equal(progress.completedQuestCount, 2);
  assert.equal(progress.earnedTotal, 4);
  assert.equal(progress.byPower.dialogue.earned, 1);
  assert.equal(progress.byPower.agency.earned, 1);
  assert.equal(progress.byPower.verification.earned, 1);
  assert.equal(progress.byPower.safety.earned, 1);
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
node --test tests/powers.test.mjs
```

Expected: FAIL because `js/powers.js` and the two quest power fields do not exist.

- [ ] **Step 3: Add the approved classification to all 30 quests**

Each quest in `js/quests.js` receives exactly these two IDs:

```js
const questPowerMap = {
  1: ["dialogue", "agency"],
  2: ["instruction", "dialogue"],
  3: ["finishing", "instruction"],
  4: ["finishing", "instruction"],
  5: ["dialogue", "instruction"],
  6: ["instruction", "finishing"],
  7: ["instruction", "dialogue"],
  8: ["dialogue", "instruction"],
  9: ["delegation", "instruction"],
  10: ["delegation", "dialogue"],
  11: ["delegation", "verification"],
  12: ["delegation", "safety"],
  13: ["safety", "verification"],
  14: ["delegation", "agency"],
  15: ["verification", "safety"],
  16: ["instruction", "safety"],
  17: ["verification", "safety"],
  18: ["finishing", "instruction"],
  19: ["agency", "dialogue"],
  20: ["finishing", "agency"],
  21: ["dialogue", "agency"],
  22: ["instruction", "dialogue"],
  23: ["dialogue", "agency"],
  24: ["agency", "finishing"],
  25: ["agency", "dialogue"],
  26: ["verification", "safety"],
  27: ["verification", "safety"],
  28: ["finishing", "agency"],
  29: ["delegation", "instruction"],
  30: ["delegation", "agency"],
};
```

Store the pair on each quest as:

```js
primaryPower: questPowerMap[id][0],
supportingPower: questPowerMap[id][1],
```

Do not infer these values from titles at runtime.

- [ ] **Step 4: Implement pure power calculations**

`js/powers.js`:

```js
export const POWER_DEFINITIONS = [
  { id: "agency", name: "主体性の剣", shortDescription: "使う・使わないを自分で決める" },
  { id: "safety", name: "情報守りの盾", shortDescription: "入力してよい情報か確かめる" },
  { id: "delegation", name: "仕事選びの羅針盤", shortDescription: "AIに任せる仕事を見極める" },
  { id: "instruction", name: "指示の魔法袋", shortDescription: "目的・材料・相手・形式を伝える" },
  { id: "dialogue", name: "対話の杖", shortDescription: "追加の言葉で答えを近づける" },
  { id: "verification", name: "真実を映す鏡", shortDescription: "事実・日付・根拠を確かめる" },
  { id: "finishing", name: "仕上げのたい焼き", shortDescription: "自分の言葉と実態に合わせて仕上げる" },
];

const validQuestIds = (quests) => new Set(quests.map(({ id }) => id));

export function powerTotals(quests) {
  const totals = Object.fromEntries(POWER_DEFINITIONS.map(({ id }) => [id, 0]));
  for (const quest of quests) {
    totals[quest.primaryPower] += 1;
    totals[quest.supportingPower] += 1;
  }
  return totals;
}

export function calculatePowerProgress(quests, completedIds) {
  const validIds = validQuestIds(quests);
  const completed = [...new Set(completedIds)].filter((id) => validIds.has(id));
  const totals = powerTotals(quests);
  const earned = Object.fromEntries(POWER_DEFINITIONS.map(({ id }) => [id, 0]));
  for (const quest of quests) {
    if (!completed.includes(quest.id)) continue;
    earned[quest.primaryPower] += 1;
    earned[quest.supportingPower] += 1;
  }
  return {
    completedQuestCount: completed.length,
    earnedTotal: completed.length * 2,
    total: quests.length * 2,
    byPower: Object.fromEntries(
      POWER_DEFINITIONS.map(({ id }) => [id, { earned: earned[id], total: totals[id] }]),
    ),
  };
}
```

- [ ] **Step 5: Add the focused test to the normal test script and verify GREEN**

Run:

```powershell
npm.cmd test
```

Expected: all existing tests plus `tests/powers.test.mjs` PASS.

- [ ] **Step 6: Commit**

```powershell
git add js/powers.js js/quests.js tests/powers.test.mjs tests/quests.test.mjs package.json
git commit -m "feat: classify quests by seven AI powers"
```

### Task 2: Beginner Vocabulary and Input Guidance

**Files:**
- Modify: `js/view-model.js`
- Modify: `js/app.js`
- Modify: `index.html`
- Modify: `tests/view-model.test.mjs`
- Modify: `tests/structure.test.mjs`

- [ ] **Step 1: Write failing vocabulary and guidance tests**

Add assertions for:

```js
assert.match(indexHtml, /クエスト（小さなお題）/);
assert.match(indexHtml, /気になるお題を一つ選ぶ/);
assert.match(indexHtml, /表示された文章をコピーする/);
assert.match(indexHtml, /ChatGPTなどの生成AIを開き/);

for (const vagueLabel of [
  "最初の一言",
  "自分の考えを、もう一言",
  "入力文をコピー",
  "入力方法：",
  "クリアにする",
]) {
  assert.doesNotMatch(appSource, new RegExp(vagueLabel));
}
```

Test all five guidance strings:

```js
assert.match(INPUT_MODE_GUIDANCE.text, /入力欄へ貼り付けて送る/);
assert.match(INPUT_MODE_GUIDANCE.camera, /写真を選んで添付/);
assert.match(INPUT_MODE_GUIDANCE.paste, /個人情報を除いた文章/);
assert.match(INPUT_MODE_GUIDANCE.document, /公開可能な文書/);
assert.match(INPUT_MODE_GUIDANCE.image, /個人情報を隠した/);
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
node --test tests/view-model.test.mjs tests/structure.test.mjs
```

Expected: FAIL on missing 3-step guide, old labels, and missing `INPUT_MODE_GUIDANCE`.

- [ ] **Step 3: Add the top-page 3-step guide**

Add a section before progress:

```html
<section class="getting-started" aria-labelledby="getting-started-title">
  <p class="eyebrow">はじめてでも大丈夫</p>
  <h2 id="getting-started-title">このサイトの使い方は3つだけ</h2>
  <ol class="getting-started__steps">
    <li><strong>選ぶ</strong><span>気になるクエスト（小さなお題）を一つ選ぶ</span></li>
    <li><strong>コピー</strong><span>表示された文章をコピーする</span></li>
    <li><strong>生成AIで送る</strong><span>ChatGPTなどの生成AIを開き、文章を貼り付けて送る</span></li>
  </ol>
  <p>AIの回答が正しいとは限りません。回答を読んで、自分の考えも続けて入力しましょう。</p>
</section>
```

- [ ] **Step 4: Export beginner labels and five guidance strings**

In `js/view-model.js`, export:

```js
export const INPUT_MODE_LABELS = {
  text: "文字だけ",
  camera: "カメラ・写真",
  paste: "文章を貼り付け",
  document: "文書を添付",
  image: "画像を添付",
};

export const INPUT_MODE_GUIDANCE = {
  text: "下の文章をコピーし、ChatGPTなどの生成AIの入力欄へ貼り付けて送ります。",
  camera: "個人情報が写っていないことを確認し、生成AIの画面で撮影するか写真を選んで添付してから、下の文章を送ります。",
  paste: "個人情報を除いた文章を生成AIの入力欄へ貼り付け、続けて下の文章を送ります。",
  document: "個人情報を含まない公開可能な文書だけを、生成AIの画面で添付してから下の文章を送ります。",
  image: "個人情報を隠した公開可能な画像だけを、生成AIの画面で添付してから下の文章を送ります。",
};
```

Include `inputModeGuidance` in `createQuestViewModel`.

- [ ] **Step 5: Replace vague UI vocabulary**

Use these exact visible labels in `js/app.js`:

```text
生成AIで使うもの
まず、この文章を生成AIに入力してみよう
AIの回答を読んで、合わないところを考えよう
AIの回答を読んだら、続けてこの文章を入力しよう
この文章をコピー
日常の困りごとで試す
学校の困りごとで試す
できたことにする
できた記録を取り消す
AIの回答が正しいか、元の資料と比べよう
```

After a successful copy, set the live-region message to:

```text
コピーしました。ChatGPTなどの生成AIを開いて貼り付けてください。
```

- [ ] **Step 6: Verify and commit**

Run:

```powershell
npm.cmd test
```

Expected: PASS.

```powershell
git add index.html js/view-model.js js/app.js tests/view-model.test.mjs tests/structure.test.mjs
git commit -m "feat: make beginner actions explicit"
```

### Task 3: Points Indicator and Quest Power Display

**Files:**
- Modify: `js/app.js`
- Modify: `js/view-model.js`
- Modify: `css/styles.css`
- Modify: `tests/view-model.test.mjs`
- Modify: `tests/structure.test.mjs`
- Modify: `tests/smoke.test.mjs`

- [ ] **Step 1: Write failing rendering and interaction tests**

The browser test must assert:

```js
assert.match(await page.locator("#power-summary").innerText(), /0 \/ 60ポイント/);
assert.match(await page.locator("#power-summary").innerText(), /主体性の剣\s+0 \/ 9/);

await page.locator('.quest-card[data-quest-id="1"] .quest-open').click();
assert.match(await page.locator("#quest-detail").innerText(), /主となる力\s+対話の杖/);
assert.match(await page.locator("#quest-detail").innerText(), /一緒に使う力\s+主体性の剣/);
await page.getByRole("button", { name: "できたことにする" }).click();
assert.match(await page.locator("#power-summary").innerText(), /2 \/ 60ポイント/);
assert.match(await page.locator("#power-summary").innerText(), /主体性の剣\s+1 \/ 9/);
assert.match(await page.locator("#power-summary").innerText(), /対話の杖\s+1 \/ 11/);
```

Reload the page and confirm the derived points persist from the existing completed IDs.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```powershell
node --test tests/view-model.test.mjs tests/structure.test.mjs
```

Expected: FAIL because power summary targets and power labels are absent.

- [ ] **Step 3: Add a static power-summary target**

Inside the progress panel:

```html
<div id="power-summary" class="power-summary" aria-live="polite">
  <p>ポイントを読み込んでいます。</p>
</div>
```

- [ ] **Step 4: Render total and seven per-power indicators**

`renderProgress()` imports `POWER_DEFINITIONS` and `calculatePowerProgress`, then renders:

```html
<p class="points-total"><strong>0 / 60ポイント</strong>　0 / 30お題できた</p>
<p class="points-note">ポイントは能力評価ではなく、その力を使う体験をした回数です。</p>
<ul class="power-list">
  <li class="power-progress">
    <span>主体性の剣</span>
    <strong>0 / 9ポイント</strong>
    <progress value="0" max="9" aria-label="主体性の剣 9ポイント中0ポイント"></progress>
  </li>
</ul>
```

Use native `<progress>` and visible numbers; do not use color alone.

- [ ] **Step 5: Show power tags on cards and details**

Cards show only:

```text
主となる力：対話の杖
```

Details show:

```text
このお題で経験する力
主となる力：対話の杖 ＋1
一緒に使う力：主体性の剣 ＋1
```

Completion toast:

```text
できたことにしました。対話の杖と主体性の剣に1ポイントずつ加わりました。
```

Cancellation toast states that the two points were removed.

- [ ] **Step 6: Add readable responsive styles**

Use a one-column list on mobile and a two-column list when space allows:

```css
.power-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: 0.75rem;
}

.power-progress progress {
  width: 100%;
}
```

- [ ] **Step 7: Verify and commit**

Run:

```powershell
npm.cmd test
```

Expected: PASS.

```powershell
git add index.html js/app.js js/view-model.js css/styles.css tests/view-model.test.mjs tests/structure.test.mjs tests/smoke.test.mjs
git commit -m "feat: show progress across seven AI powers"
```

### Task 4: Optimize the Seven Powers Image

**Files:**
- Create: `scripts/build-power-images.mjs`
- Create: `assets/seven-powers-720.webp`
- Create: `assets/seven-powers-1055.webp`
- Create: `tests/power-images.test.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `README.md`

- [ ] **Step 1: Add Sharp as an exact development dependency**

Run:

```powershell
npm.cmd install --save-dev --save-exact sharp@0.34.4
```

Expected: `package.json` and lockfile contain exactly `sharp: 0.34.4`.

- [ ] **Step 2: Write the failing image contract test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import sharp from "sharp";

const images = [
  ["assets/seven-powers-720.webp", 720],
  ["assets/seven-powers-1055.webp", 1055],
];

test("public seven-powers images are readable WebP files at approved widths", async () => {
  let totalBytes = 0;
  for (const [path, width] of images) {
    const metadata = await sharp(path).metadata();
    const file = await stat(path);
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, width);
    assert.equal(metadata.height, Math.round(width * 1491 / 1055));
    totalBytes += file.size;
  }
  assert.ok(totalBytes < 1_000_000);
});
```

- [ ] **Step 3: Run the test and verify RED**

Run:

```powershell
node --test tests/power-images.test.mjs
```

Expected: FAIL because the WebP files do not exist.

- [ ] **Step 4: Create a source-controlled conversion script**

`scripts/build-power-images.mjs`:

```js
import { resolve } from "node:path";
import sharp from "sharp";

const source = resolve(process.argv[2] || "../７つの力.png");
const outputs = [
  { width: 720, path: "assets/seven-powers-720.webp" },
  { width: 1055, path: "assets/seven-powers-1055.webp" },
];

for (const output of outputs) {
  await sharp(source)
    .resize({ width: output.width, withoutEnlargement: true })
    .webp({ quality: 86, smartSubsample: true })
    .toFile(output.path);
}
```

Add:

```json
"build:powers": "node scripts/build-power-images.mjs ../７つの力.png"
```

- [ ] **Step 5: Generate and inspect both files**

Run:

```powershell
npm.cmd run build:powers
node --test tests/power-images.test.mjs
```

Expected: PASS and combined size below 1MB.

Open both generated files at original detail. Confirm the smallest body text, including the four bullets under each item, remains legible in the 1055px file. Confirm the 720px file works as an overview and is not presented as the only text source on mobile.

- [ ] **Step 6: Document source handling and commit**

README states:

```text
元画像「７つの力.png」は公開リポジトリに含めません。公開用WebPを更新するときだけ、リポジトリの親フォルダに元画像を置き、npm run build:powers を実行します。
```

Run `npm.cmd test`, then:

```powershell
git add package.json package-lock.json scripts/build-power-images.mjs assets/seven-powers-720.webp assets/seven-powers-1055.webp tests/power-images.test.mjs README.md
git commit -m "feat: add optimized seven powers artwork"
```

### Task 5: Accessible Seven Powers Guide

**Files:**
- Modify: `index.html`
- Modify: `js/app.js`
- Modify: `css/styles.css`
- Modify: `tests/structure.test.mjs`
- Modify: `tests/smoke.test.mjs`

- [ ] **Step 1: Write failing structure and browser tests**

Assert:

```js
assert.match(indexHtml, /id="open-powers-guide"/);
assert.match(indexHtml, /id="powers-dialog"/);
assert.match(indexHtml, /生成AIを使うときに大切な7つの力/);
assert.doesNotMatch(indexHtml, /src="\.\/assets\/seven-powers-/);
```

Browser flow:

```js
await page.getByRole("button", { name: "7つの力を見る" }).click();
assert.equal(await page.locator("#powers-dialog[open]").count(), 1);
await page.locator("#powers-dialog img").waitFor();
assert.match(await page.locator("#powers-dialog").innerText(), /主体性の剣/);
assert.match(await page.locator("#powers-dialog").innerText(), /仕上げのたい焼き/);
await page.getByRole("button", { name: "7つの力の説明を閉じる" }).click();
assert.equal(await page.locator("#powers-dialog[open]").count(), 0);
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
node --test tests/structure.test.mjs
```

Expected: FAIL because the guide controls do not exist.

- [ ] **Step 3: Add button and dialog skeleton**

Place the button next to the point explanation:

```html
<button id="open-powers-guide" type="button" aria-haspopup="dialog">
  7つの力を見る
</button>
```

Add a second native dialog:

```html
<dialog id="powers-dialog" aria-labelledby="powers-dialog-title">
  <div class="dialog-header dialog-header--sticky">
    <h2 id="powers-dialog-title">生成AIを使うときに大切な7つの力</h2>
    <button id="close-powers-guide" type="button">7つの力の説明を閉じる</button>
  </div>
  <p>ポイントは能力評価ではなく、その力を使う体験をした回数です。</p>
  <a id="powers-image-link" href="./assets/seven-powers-1055.webp" target="_blank" rel="noopener">
    <picture id="powers-picture">
      <source data-srcset="./assets/seven-powers-720.webp 720w, ./assets/seven-powers-1055.webp 1055w" type="image/webp">
      <img class="powers-guide-image" data-src="./assets/seven-powers-720.webp" width="720" height="1018"
        alt="校務で使う生成AI活用の7つの力を、七つの道具として紹介した図">
    </picture>
    <span>画像を大きく見る</span>
  </a>
  <ol id="powers-guide-list" class="powers-guide-list"></ol>
</dialog>
```

- [ ] **Step 4: Implement the text guide, lazy loading, and dialog behavior**

Render one list item per `POWER_DEFINITIONS` entry into `#powers-guide-list`, using the power name and `shortDescription`. On first open, copy `data-src` to `src` and `data-srcset` to `srcset`; do not preload the images. Use `showModal()`, focus the close button, close on the button and Escape, and restore focus to the opener.

- [ ] **Step 5: Add guide styles**

```css
.powers-guide-image {
  display: block;
  width: min(100%, 45rem);
  height: auto;
  margin-inline: auto;
}

.dialog-header--sticky {
  position: sticky;
  z-index: 3;
  inset-block-start: 0;
  padding-block: 0.5rem;
  background: var(--surface);
}
```

The textual seven-item guide must remain usable if the image fails.

- [ ] **Step 6: Verify and commit**

Run:

```powershell
npm.cmd test
```

Expected: PASS.

```powershell
git add index.html js/app.js css/styles.css tests/structure.test.mjs tests/smoke.test.mjs
git commit -m "feat: guide beginners through seven AI powers"
```

### Task 6: Mobile Layout and Responsive Browser Tests

**Files:**
- Modify: `css/styles.css`
- Modify: `tests/smoke.test.mjs`
- Modify: `tests/structure.test.mjs`

- [ ] **Step 1: Add failing multi-viewport tests**

For widths 390, 820, and 1440:

```js
for (const viewport of [
  { width: 390, height: 844 },
  { width: 820, height: 1180 },
  { width: 1440, height: 1000 },
]) {
  const page = await browser.newPage({ viewport });
  await page.goto(`${baseURL}/`, { waitUntil: "networkidle" });
  const sizes = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  assert.ok(sizes.content <= sizes.viewport);
  await page.close();
}
```

At 390px, assert every visible main button has a bounding box at least 44px high and that route, copy, completion, guide open, and both dialogs close successfully.

- [ ] **Step 2: Run the smoke test in GitHub Actions or a working Chromium environment and verify RED**

Run:

```powershell
npm.cmd run test:smoke
```

On this Windows machine, if Chromium exits with `3221225477`, do not weaken or skip the test. Push only after normal tests pass, then use the required Ubuntu GitHub Actions run as the RED/GREEN browser evidence.

- [ ] **Step 3: Implement mobile controls and dialog sizing**

Add:

```css
@media (max-width: 640px) {
  .filter-list,
  .route-switch,
  .detail-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .filter-list button,
  .route-switch button,
  .detail-actions button,
  #open-powers-guide {
    width: 100%;
  }

  dialog {
    width: calc(100% - 1rem);
    max-height: calc(100dvh - 1rem);
    padding: 1rem;
  }
}

.prompt-box,
.power-progress,
.powers-guide-list li {
  min-width: 0;
  overflow-wrap: anywhere;
}
```

Keep the quest list one column at 390px and preserve current desktop density.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
npm.cmd test
git diff --check
```

Expected: PASS and no whitespace errors.

```powershell
git add css/styles.css tests/smoke.test.mjs tests/structure.test.mjs
git commit -m "fix: make all quest actions mobile friendly"
```

### Task 7: Print, Documentation, and Workflow Integrity

**Files:**
- Modify: `scripts/build-print-page.mjs`
- Modify: `print.html`
- Modify: `tests/print-page.test.mjs`
- Modify: `README.md`
- Modify: `.github/workflows/pages.yml`
- Modify: `tests/workflow.test.mjs`

- [ ] **Step 1: Write failing print and workflow tests**

Assert that print output uses:

```text
生成AIで使うもの
まず、この文章を生成AIに入力してみよう
AIの回答を読んだら、続けてこの文章を入力しよう
主となる力
一緒に使う力
```

Assert that the Pages artifact explicitly includes both WebP files and excludes the 4.04MB source PNG.

- [ ] **Step 2: Verify RED**

Run:

```powershell
node --test tests/print-page.test.mjs tests/workflow.test.mjs
```

Expected: FAIL on old vocabulary and missing asset allowlist entries.

- [ ] **Step 3: Update generator, regenerate print page, and update docs**

The print page shows both power names per quest and the beginner labels. README documents:

- 3-step beginner flow
- seven-power points as experience counts
- mobile support
- guide image source/update procedure
- no original PNG in the public repository

- [ ] **Step 4: Update the workflow artifact allowlist**

The static artifact copy includes:

```text
assets/favicon.svg
assets/seven-powers-720.webp
assets/seven-powers-1055.webp
```

Do not use a broad copy that could include the parent source image, tests, docs, or `node_modules`.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npm.cmd run build:print
npm.cmd test
git diff --exit-code -- print.html
git diff --check
```

Expected: all PASS and generated print page clean.

```powershell
git add scripts/build-print-page.mjs print.html tests/print-page.test.mjs README.md .github/workflows/pages.yml tests/workflow.test.mjs
git commit -m "docs: align print and deployment with beginner guide"
```

### Task 8: Full Verification and GitHub Pages Deployment

**Files:**
- Verify all changed files
- No planned production-code changes

- [ ] **Step 1: Run local verification**

```powershell
npm.cmd test
npm.cmd run build:print
git diff --exit-code -- print.html
git diff --check
git status -sb
```

Expected: all tests PASS, no generated differences, and only intentional committed changes.

- [ ] **Step 2: Verify privacy and asset scope**

```powershell
git log --format="%ae" | Sort-Object -Unique
git ls-files | Select-String -Pattern '７つの力\.png|node_modules|AppData'
```

Expected: only the GitHub noreply email; no source PNG, `node_modules`, or temporary path is tracked.

- [ ] **Step 3: Push `main`**

```powershell
git push origin main
```

- [ ] **Step 4: Require a successful GitHub Actions run**

Confirm the latest run passes:

- unit and contract tests
- Chromium installation
- browser smoke tests at 390, 820, and 1440 widths
- print generation and synchronization
- allowlisted static artifact upload
- GitHub Pages deployment

- [ ] **Step 5: Verify the public URL**

At `https://kumaken-1.github.io/generative-ai-summer-research-30/`, verify:

- first-screen 3-step guide
- `0 / 60ポイント` and seven denominators
- quest 1 awards dialogue and agency points
- reload preserves points through completed IDs
- cancellation removes both points
- `7つの力を見る` opens a guide with readable text
- the image is not fetched before opening and is fetched after opening
- large-image link opens the 1055px WebP
- 390px layout has no horizontal overflow
- print page has all 30 quests and new vocabulary
- 404 page still links to the project root

- [ ] **Step 6: Final report**

Report the public URL, latest commit, GitHub Actions run, normal test count, browser viewports, image dimensions and byte sizes, and any remaining warning. Do not call the work complete without this fresh evidence.
