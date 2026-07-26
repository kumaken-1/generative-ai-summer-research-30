import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  test("Playwright smoke test dependency is available", { skip: "playwright is not installed" }, () => {});
}

if (chromium) {
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
      await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
      await page.evaluate(() => localStorage.clear());
      await page.reload({ waitUntil: "networkidle" });
      assert.equal(await page.locator(".quest-card").count(), 30);

      await page.getByRole("button", { name: /写真や文章/ }).click();
      assert.equal(await page.locator(".quest-card").count(), 10);

      await page.getByRole("button", { name: /すべて/ }).click();
      await page.locator('.quest-card[data-quest-id="1"]').getByRole("button", { name: "このクエストを見る" }).click();
      assert.equal(new URL(page.url()).hash, "#quest-1");
      await page.getByRole("button", { name: "学校で試す" }).click();
      const firstPrompt = await page.locator('[data-prompt="first"]').textContent();
      await page.locator('[data-copy="first"]').click();
      assert.equal(await page.evaluate(() => window.__copiedText), firstPrompt);
      await page.getByText("入力文をコピーしました").waitFor();

      await page.getByRole("button", { name: "クリアにする" }).click();
      assert.match(await page.locator("#progress").innerText(), /1\s*\/\s*30/);
      assert.equal(await page.getByRole("button", { name: "クリアを取り消す" }).count(), 1);

      await page.reload({ waitUntil: "networkidle" });
      assert.match(await page.locator("#progress").innerText(), /1\s*\/\s*30/);
      assert.match(await page.locator('.quest-card[data-quest-id="1"]').innerText(), /クリア済み/);

      await page.goto("http://127.0.0.1:4173/#quest-12", { waitUntil: "networkidle" });
      assert.equal(await page.locator("#quest-dialog[open]").count(), 1);
      assert.match(await page.locator("#quest-detail").innerText(), /クエスト 12/);
      await page.getByRole("button", { name: "閉じる" }).click();
      assert.equal(new URL(page.url()).hash, "");
    } finally {
      await browser.close();
    }
  });
}
