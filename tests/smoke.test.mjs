import assert from "node:assert/strict";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
};
const STORAGE_KEY = "ai-summer-research-30-progress-v2";

// ①送る → ②自分の言葉で返す → ③使い方を決める、の順にしかクリアできない。
async function completeThreeSteps(page, verdict = "直せば使える") {
  await page.getByRole("button", { name: "AIに送った" }).click();
  await page.getByRole("button", { name: "自分の言葉で返した" }).click();
  await page.getByRole("button", { name: new RegExp(verdict) }).click();
}
  let server;
  let baseURL;

  test.before(async () => {
    server = createServer(async (request, response) => {
      if (!["GET", "HEAD"].includes(request.method)) {
        response.writeHead(405, { Allow: "GET, HEAD" });
        response.end();
        return;
      }
      try {
        const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
        let filePath = resolve(ROOT, `.${pathname}`);
        if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${sep}`)) {
          response.writeHead(403);
          response.end();
          return;
        }
        if ((await stat(filePath)).isDirectory()) filePath = resolve(filePath, "index.html");
        if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${sep}`)) {
          response.writeHead(403);
          response.end();
          return;
        }
        const info = await stat(filePath);
        response.writeHead(200, {
          "Content-Length": info.size,
          "Content-Type": CONTENT_TYPES[extname(filePath)] ?? "application/octet-stream",
        });
        if (request.method === "HEAD") response.end();
        else createReadStream(filePath).pipe(response);
      } catch {
        response.writeHead(404);
        response.end();
      }
    });
    await new Promise((resolveListen, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolveListen);
    });
    const { port } = server.address();
    baseURL = `http://127.0.0.1:${port}`;
  });

  test.after(async () => {
    await new Promise((resolveClose, reject) => {
      server.close((error) => error ? reject(error) : resolveClose());
    });
  });

  test("index and print pages never overflow horizontally at supported viewports", async () => {
    const browser = await chromium.launch();
    const viewports = [
      { width: 390, height: 844 },
      { width: 820, height: 1180 },
      { width: 1440, height: 1000 },
    ];

    try {
      for (const viewport of viewports) {
        const page = await browser.newPage({ viewport });
        for (const pathname of ["/", "/print.html"]) {
          await page.goto(`${baseURL}${pathname}`, { waitUntil: "networkidle" });
          const dimensions = await page.evaluate(() => ({
            clientWidth: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
          }));
          assert.ok(
            dimensions.scrollWidth <= dimensions.clientWidth,
            `${pathname} overflows at ${viewport.width}px: ${dimensions.scrollWidth} > ${dimensions.clientWidth}`,
          );
        }
        await page.close();
      }
    } finally {
      await browser.close();
    }
  });

  test("mobile primary controls are easy to tap and the full beginner path works", async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: async () => {} },
      });
    });

    const assertVisibleButtonsAreTallEnough = async (selector, label) => {
      const heights = await page.locator(selector).evaluateAll((buttons) => buttons
        .filter((button) => {
          const style = getComputedStyle(button);
          const rect = button.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
        })
        .map((button) => button.getBoundingClientRect().height));
      assert.ok(heights.length > 0, `${label} has no visible controls`);
      for (const height of heights) {
        assert.ok(height >= 44, `${label} control is only ${height}px tall`);
      }
    };

    try {
      await page.goto(`${baseURL}/`, { waitUntil: "networkidle" });
      await assertVisibleButtonsAreTallEnough("#filters button", "filters");
      await assertVisibleButtonsAreTallEnough(".quest-open", "quest open");
      await assertVisibleButtonsAreTallEnough("#open-powers-guide", "powers guide open");

      await page.getByRole("button", { name: /写真や文章/ }).click();
      assert.equal(await page.locator(".quest-card").count(), 10);
      await page.getByRole("button", { name: /すべて/ }).click();
      await page.locator('.quest-card[data-quest-id="1"] .quest-open').click();
      await assertVisibleButtonsAreTallEnough(".route-switch button", "route switch");
      await assertVisibleButtonsAreTallEnough("[data-copy]", "copy");
      await assertVisibleButtonsAreTallEnough(".detail-actions button", "detail actions");
      await assertVisibleButtonsAreTallEnough("#close-dialog", "quest close");
      await assertVisibleButtonsAreTallEnough(".hint-chip", "hint chips");
      await assertVisibleButtonsAreTallEnough(".step-button:not([disabled])", "step buttons");
      await page.locator('.route-switch button').last().click();
      assert.equal(await page.locator('.route-switch button').last().getAttribute("aria-pressed"), "true");
      await page.locator('[data-copy="first"]').click();
      await completeThreeSteps(page);
      assert.match(await page.locator("#progress").innerText(), /1\s*\/\s*30/);
      await page.getByRole("button", { name: "閉じる" }).click();
      assert.equal(await page.locator("#quest-dialog[open]").count(), 0);

      await page.getByRole("button", { name: "7つの力を見る" }).click();
      assert.equal(await page.locator("#powers-dialog[open]").count(), 1);
      await assertVisibleButtonsAreTallEnough("#close-powers-dialog", "powers close");
      await page.getByRole("button", { name: "7つの力の説明を閉じる" }).click();
      assert.equal(await page.locator("#powers-dialog[open]").count(), 0);
    } finally {
      await browser.close();
    }
  });

  test("mobile quest browsing, detail, copy, completion, persistence, and hash flow", async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: async (text) => { window.__copiedText = text; } },
      });
    });

    try {
      await page.goto(`${baseURL}/`, { waitUntil: "networkidle" });
      await page.evaluate(() => localStorage.clear());
      await page.reload({ waitUntil: "networkidle" });
      assert.equal(await page.locator(".quest-card").count(), 30);
      assert.match(await page.locator("#power-summary").innerText(), /0\s*\/\s*60ポイント\s+0\s*\/\s*30題できた/);
      assert.match(await page.locator("#power-summary").innerText(), /主体性の剣\s+0\s*\/\s*9ポイント/);

      await page.getByRole("button", { name: /写真や文章/ }).click();
      assert.equal(await page.locator(".quest-card").count(), 10);

      await page.getByRole("button", { name: /すべて/ }).click();
      await page.locator('.quest-card[data-quest-id="1"]').getByRole("button", { name: "このクエストを見る" }).click();
      assert.equal(new URL(page.url()).hash, "#quest-1");
      assert.match(await page.locator("#quest-detail").innerText(), /このお題で経験する力/);
      assert.match(await page.locator("#quest-detail").innerText(), /主となる力：対話の杖　＋1/);
      assert.match(await page.locator("#quest-detail").innerText(), /一緒に使う力：主体性の剣　＋1/);
      await page.getByRole("button", { name: "学校の困りごとで試す" }).click();
      const firstPrompt = await page.locator('[data-prompt="first"]').textContent();
      await page.locator('[data-copy="first"]').click();
      assert.equal(await page.evaluate(() => window.__copiedText), firstPrompt);
      await page.getByText("コピーしました。ChatGPTなどの生成AIを開いて貼り付けてください。").waitFor();

      // ②③は①を終えるまで押せない
      assert.equal(await page.getByRole("button", { name: "自分の言葉で返した" }).isDisabled(), true);
      await page.getByRole("button", { name: "AIに送った" }).click();
      assert.match(await page.locator("#progress").innerText(), /0\s*\/\s*30/);
      assert.equal(await page.getByRole("button", { name: "自分の言葉で返した" }).isDisabled(), false);

      // 2通目は空欄を自分で埋めて組み立てる
      const before = await page.locator('[data-prompt="follow-up"]').textContent();
      await page.locator(".hint-chip").first().click();
      const hint = await page.locator(".hint-chip").first().textContent();
      const filled = await page.locator('[data-prompt="follow-up"]').textContent();
      assert.notEqual(filled, before);
      assert.ok(filled.includes(hint), `組み立てた文に「${hint}」が入っていない: ${filled}`);
      await page.locator("#follow-up-input").fill("じぶんの言葉");
      assert.match(await page.locator('[data-prompt="follow-up"]').textContent(), /じぶんの言葉/);
      await page.locator('[data-copy="follow-up"]').click();
      assert.match(await page.evaluate(() => window.__copiedText), /じぶんの言葉/);

      await page.getByRole("button", { name: "自分の言葉で返した" }).click();
      assert.match(await page.locator("#progress").innerText(), /0\s*\/\s*30/);
      await page.getByRole("button", { name: /使わない/ }).click();

      assert.match(await page.locator("#progress").innerText(), /1\s*\/\s*30/);
      assert.match(await page.locator("#power-summary").innerText(), /2\s*\/\s*60ポイント\s+1\s*\/\s*30題できた/);
      assert.match(await page.locator("#power-summary").innerText(), /主体性の剣\s+1\s*\/\s*9ポイント/);
      assert.match(await page.locator("#power-summary").innerText(), /対話の杖\s+1\s*\/\s*11ポイント/);
      await page.getByText("クリアしました。対話の杖と主体性の剣に1ポイントずつ加わりました。").waitFor();
      // 「使わない」を選ぶこと自体が称号になる
      assert.match(await page.locator("#progress").innerText(), /使わない勇気/);

      await page.reload({ waitUntil: "networkidle" });
      assert.match(await page.locator("#progress").innerText(), /1\s*\/\s*30/);
      assert.match(await page.locator("#power-summary").innerText(), /2\s*\/\s*60ポイント\s+1\s*\/\s*30題できた/);
      assert.match(await page.locator('.quest-card[data-quest-id="1"]').innerText(), /クリア済み/);
      assert.equal(await page.locator("#quest-dialog[open]").count(), 1);
      assert.match(await page.locator("#quest-detail").innerText(), /クエスト 1/);
      // 書いた言葉は端末に残さない
      assert.equal(await page.locator("#follow-up-input").inputValue(), "");
      assert.equal(
        await page.evaluate((key) => localStorage.getItem(key).includes("じぶんの言葉"), STORAGE_KEY),
        false,
      );

      await page.getByRole("button", { name: "自分の言葉で返した" }).click();
      assert.match(await page.locator("#power-summary").innerText(), /0\s*\/\s*60ポイント\s+0\s*\/\s*30題できた/);
      assert.match(await page.locator("#power-summary").innerText(), /主体性の剣\s+0\s*\/\s*9ポイント/);
      await page.getByText("記録を戻しました。対話の杖と主体性の剣から1ポイントずつ取り消しました。").waitFor();

      await page.goto(`${baseURL}/#quest-12`, { waitUntil: "networkidle" });
      assert.equal(await page.locator("#quest-dialog[open]").count(), 1);
      assert.match(await page.locator("#quest-detail").innerText(), /クエスト 12/);
      await page.getByRole("button", { name: "閉じる" }).click();
      await page.waitForFunction(() => window.location.hash === "");
      assert.equal(new URL(page.url()).hash, "");
    } finally {
      await browser.close();
    }
  });

  test("reset requires confirmation and storage failures keep in-tab progress usable", async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
      await page.goto(`${baseURL}/`, { waitUntil: "networkidle" });
      await page.locator('.quest-card[data-quest-id="1"]').getByRole("button", { name: "このクエストを見る" }).click();
      await completeThreeSteps(page);
      await page.getByRole("button", { name: "閉じる" }).click();

      await page.getByRole("button", { name: "進み具合をリセット" }).click();
      await page.getByRole("button", { name: "やめる" }).click();
      assert.match(await page.locator("#progress").innerText(), /1\s*\/\s*30/);
      await page.getByRole("button", { name: "進み具合をリセット" }).click();
      await page.getByRole("button", { name: "リセットする" }).click();
      assert.match(await page.locator("#progress").innerText(), /0\s*\/\s*30/);
      await page.getByText("進み具合をリセットしました").waitFor();
      assert.equal(await page.locator("#reset-progress").evaluate((node) => node === document.activeElement), true);

      await page.addInitScript((key) => {
        const originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function setItem(name, value) {
          if (name === key) throw new Error("blocked");
          return originalSetItem.call(this, name, value);
        };
      }, STORAGE_KEY);
      await page.reload({ waitUntil: "networkidle" });
      await page.getByText("この端末では進み具合を保存できません。印刷用マップをご利用ください。").waitFor();
      await page.locator('.quest-card[data-quest-id="2"]').getByRole("button", { name: "このクエストを見る" }).click();
      await completeThreeSteps(page);
      assert.match(await page.locator("#progress").innerText(), /1\s*\/\s*30/);
    } finally {
      await browser.close();
    }
  });

  test("迷ったときの候補・共通注意の折りたたみ・URL共有が動く", async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: async (text) => { window.__copiedText = text; } },
      });
    });

    try {
      await page.goto(`${baseURL}/`, { waitUntil: "networkidle" });

      // 候補は日付ではなく「まだ試していないもの」から出る
      const pick = page.locator("#suggestion");
      await pick.locator("[data-open]").waitFor();
      const pickId = await pick.locator("[data-open]").getAttribute("data-open");
      assert.equal(pickId, "1", "未クリアなら最初のクエストから出す");

      // 「別のクエストにする」で候補を送れる。進み具合は変わらない。
      await pick.getByRole("button", { name: "別のクエストにする" }).click();
      assert.equal(await pick.locator("[data-open]").getAttribute("data-open"), "2");
      assert.match(await page.locator("#progress").innerText(), /0\s*\/\s*30/);

      await pick.locator("[data-open]").click();
      assert.equal(new URL(page.url()).hash, "#quest-2");

      // 毎回同じ定型文は既定で畳んでおき、肝心の入力例を画面外に押し出さない
      const details = page.locator(".reference-details");
      assert.equal(await details.evaluate((node) => node.open), false);
      assert.equal(await page.getByText("安全に使うために").isVisible(), false);
      await details.locator("summary").click();
      assert.equal(await page.getByText("安全に使うために").isVisible(), true);

      await page.getByRole("button", { name: "このクエストのURLをコピー" }).click();
      const copied = await page.evaluate(() => window.__copiedText);
      assert.ok(copied.endsWith("#quest-2"), `共有URLが不正: ${copied}`);
      await page.getByText("このクエストのURLをコピーしました").waitFor();

      // ルートの選択は次のクエストにも引き継がれる
      await page.getByRole("button", { name: "学校の困りごとで試す" }).click();
      await page.getByRole("button", { name: "閉じる" }).click();
      await page.locator('.quest-card[data-quest-id="7"] .quest-open').click();
      assert.equal(
        await page.getByRole("button", { name: "学校の困りごとで試す" }).getAttribute("aria-pressed"),
        "true",
      );
    } finally {
      await browser.close();
    }
  });

  test("最終回はクリア済みのクエスト名を入力例に差し込む", async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

    try {
      await page.goto(`${baseURL}/`, { waitUntil: "networkidle" });
      await page.evaluate(() => localStorage.clear());
      await page.reload({ waitUntil: "networkidle" });

      await page.goto(`${baseURL}/#quest-30`, { waitUntil: "networkidle" });
      const before = await page.locator('[data-prompt="first"]').textContent();
      assert.doesNotMatch(before, /\{\{cleared\}\}/);
      assert.match(before, /いくつかのクエスト/);
      await page.getByRole("button", { name: "閉じる" }).click();

      await page.locator('.quest-card[data-quest-id="6"] .quest-open').click();
      const clearedTitle = await page.locator("#dialog-title").textContent();
      await completeThreeSteps(page);
      await page.getByRole("button", { name: "閉じる" }).click();

      await page.goto(`${baseURL}/#quest-30`, { waitUntil: "networkidle" });
      const after = await page.locator('[data-prompt="first"]').textContent();
      assert.doesNotMatch(after, /\{\{cleared\}\}/);
      assert.ok(
        after.includes(clearedTitle),
        `クリア済みの「${clearedTitle}」が差し込まれていない: ${after}`,
      );
    } finally {
      await browser.close();
    }
  });

  test("seven powers guide loads its image on first open and restores focus on close", async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

    try {
      const imageResponses = [];
      page.on("response", (response) => {
        if (response.url().includes("seven-powers-")) imageResponses.push(response.url());
      });
      await page.goto(`${baseURL}/`, { waitUntil: "networkidle" });
      assert.equal(imageResponses.length, 0);
      assert.equal(await page.locator("#powers-guide-list li").count(), 7);
      assert.match(await page.locator("#powers-guide-list li").first().innerText(), /主体性の剣/);
      assert.match(await page.locator("#powers-guide-list li").last().innerText(), /仕上げのたい焼き/);

      const opener = page.getByRole("button", { name: "7つの力を見る" });
      await opener.click();
      assert.equal(await page.locator("#powers-dialog[open]").count(), 1);
      await page.locator("#powers-dialog img").waitFor();
      await page.waitForFunction(() => performance.getEntriesByType("resource")
        .some((entry) => entry.name.includes("seven-powers-")));
      assert.ok(imageResponses.length > 0);
      assert.equal(
        await page.locator("#close-powers-dialog").evaluate((node) => node === document.activeElement),
        true,
      );

      await page.getByRole("button", { name: "7つの力の説明を閉じる" }).click();
      assert.equal(await page.locator("#powers-dialog[open]").count(), 0);
      assert.equal(await opener.evaluate((node) => node === document.activeElement), true);
    } finally {
      await browser.close();
    }
  });
