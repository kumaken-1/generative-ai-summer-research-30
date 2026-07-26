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
  ".svg": "image/svg+xml",
};
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
      assert.match(await page.locator("#power-summary").innerText(), /主体性の剣\s+0\s*\/\s*10ポイント/);

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

      await page.getByRole("button", { name: "できたことにする" }).click();
      assert.match(await page.locator("#progress").innerText(), /1\s*\/\s*30/);
      assert.match(await page.locator("#power-summary").innerText(), /2\s*\/\s*60ポイント\s+1\s*\/\s*30題できた/);
      assert.match(await page.locator("#power-summary").innerText(), /主体性の剣\s+1\s*\/\s*10ポイント/);
      assert.match(await page.locator("#power-summary").innerText(), /対話の杖\s+1\s*\/\s*11ポイント/);
      await page.getByText("できたことにしました。対話の杖と主体性の剣に1ポイントずつ加わりました。").waitFor();
      assert.equal(await page.getByRole("button", { name: "できた記録を取り消す" }).count(), 1);

      await page.reload({ waitUntil: "networkidle" });
      assert.match(await page.locator("#progress").innerText(), /1\s*\/\s*30/);
      assert.match(await page.locator("#power-summary").innerText(), /2\s*\/\s*60ポイント\s+1\s*\/\s*30題できた/);
      assert.match(await page.locator('.quest-card[data-quest-id="1"]').innerText(), /クリア済み/);
      await page.locator('.quest-card[data-quest-id="1"]').getByRole("button", { name: "このクエストを見る" }).click();
      await page.getByRole("button", { name: "できた記録を取り消す" }).click();
      assert.match(await page.locator("#power-summary").innerText(), /0\s*\/\s*60ポイント\s+0\s*\/\s*30題できた/);
      assert.match(await page.locator("#power-summary").innerText(), /主体性の剣\s+0\s*\/\s*10ポイント/);
      assert.match(await page.locator("#power-summary").innerText(), /対話の杖\s+0\s*\/\s*11ポイント/);
      await page.getByText("できた記録を取り消しました。対話の杖と主体性の剣から1ポイントずつ取り消しました。").waitFor();

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
      await page.getByRole("button", { name: "できたことにする" }).click();
      await page.getByRole("button", { name: "閉じる" }).click();

      await page.getByRole("button", { name: "進み具合をリセット" }).click();
      await page.getByRole("button", { name: "やめる" }).click();
      assert.match(await page.locator("#progress").innerText(), /1\s*\/\s*30/);
      await page.getByRole("button", { name: "進み具合をリセット" }).click();
      await page.getByRole("button", { name: "リセットする" }).click();
      assert.match(await page.locator("#progress").innerText(), /0\s*\/\s*30/);
      await page.getByText("進み具合をリセットしました").waitFor();
      assert.equal(await page.locator("#reset-progress").evaluate((node) => node === document.activeElement), true);

      await page.addInitScript(() => {
        const originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function setItem(key, value) {
          if (key === "ai-summer-research-30-progress-v1") throw new Error("blocked");
          return originalSetItem.call(this, key, value);
        };
      });
      await page.reload({ waitUntil: "networkidle" });
      await page.getByText("この端末では進み具合を保存できません。印刷用マップをご利用ください。").waitFor();
      await page.locator('.quest-card[data-quest-id="2"]').getByRole("button", { name: "このクエストを見る" }).click();
      await page.getByRole("button", { name: "できたことにする" }).click();
      assert.match(await page.locator("#progress").innerText(), /1\s*\/\s*30/);
    } finally {
      await browser.close();
    }
  });
