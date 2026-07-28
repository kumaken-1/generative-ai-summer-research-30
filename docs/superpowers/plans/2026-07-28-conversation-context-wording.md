# Conversation Context Wording Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 「AIが覚えています」という誤解を招く表現を、同じ会話内の文脈利用を説明する表現へ置き換える。

**Architecture:** 共通補足の正本は `js/view-model.js` に置いたまま、表示文言だけを変更する。テストで新旧表現を検査し、既存の生成器から `print.html` を再生成する。

**Tech Stack:** JavaScript ES modules、Node.js test runner、静的HTML生成

---

## File Responsibilities

- `js/view-model.js`: 共通補足「新しいメッセージ」の正本文言
- `tests/view-model.test.mjs`: 共通補足の新旧表現を検査
- `print.html`: `scripts/build-print-page.mjs`から生成される印刷版

### Task 1: 会話履歴の説明文を正確にする

**Files:**
- Modify: `tests/view-model.test.mjs`
- Modify: `js/view-model.js`
- Regenerate: `print.html`

- [ ] **Step 1: 失敗する回帰テストを書く**

`tests/view-model.test.mjs`の共通補足テストに、次を追加する。

```js
assert.match(
  HELP_ITEMS.newmsg.body,
  /同じ会話の続きなら、直前のやりとりを踏まえて答えてくれます。/,
);
assert.doesNotMatch(HELP_ITEMS.newmsg.body, /AIが覚えています/);
```

- [ ] **Step 2: テストが正しい理由で失敗することを確認する**

Run:

```powershell
node --test tests/view-model.test.mjs
```

Expected: 新しい表現が存在せず、旧表現が残っているためFAIL。

- [ ] **Step 3: 正本を最小修正する**

`js/view-model.js`の`HELP_ITEMS.newmsg.body`を次に変更する。

```js
body: "同じ会話の続きに、もう一度入力して送ります。新しい会話を始める必要はありません。同じ会話の続きなら、直前のやりとりを踏まえて答えてくれます。",
```

- [ ] **Step 4: 印刷版を再生成する**

Run:

```powershell
npm.cmd run build:print
```

Expected: `print.html`の30件すべてに新しい共通補足が反映される。

- [ ] **Step 5: 全検証を行う**

Run:

```powershell
npm.cmd test
git diff --exit-code -- print.html
git diff --check
rg -n "前のやりとりはAIが覚えています" js tests print.html
```

Expected:

- 通常テストがすべてPASS
- 生成器と`print.html`が一致
- 空白エラーなし
- 旧表現の検索結果なし

- [ ] **Step 6: コミットする**

```powershell
git add js/view-model.js tests/view-model.test.mjs print.html
git commit -m "fix: clarify conversation context wording"
```
