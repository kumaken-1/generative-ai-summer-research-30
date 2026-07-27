import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("READMEが企画の前提と運用を説明している", async () => {
  const readme = await read("../README.md");

  for (const phrase of [
    "自由参加",
    "順番も速さも自由",
    "ランキング",
    "生成AIを開けないとき",
    "localStorage",
    "収集しません",
    "外部API",
    "個人情報",
    "材料",
    "GitHub Pages",
    "npm test",
    "npm run build:print",
    "js/challenges.js",
    "MIT License",
    "CC BY 4.0",
  ]) {
    assert.ok(readme.includes(phrase), `READMEに無い: ${phrase}`);
  }
});

test("READMEが手順・色・補足・記録の扱いを説明している", async () => {
  const readme = await read("../README.md");

  for (const phrase of [
    "手順の番号は1回目から2回目まで通しで振ってあります",
    "添付と文章が同じメッセージで、送信は1回",
    "そのままコピーして送る",
    "自分の文を貼ってから送る",
    "写真・資料を添付してから送る",
    "空欄をうめてから送る",
    "ラベルとアイコンだけで何をするか決まる",
    "押しても、マウスを乗せても開きます",
    "添付ボタンの場所",
    "端末にも保存しません",
    "sample-notice.md",
    "sample-draft.md",
    "sample-screen.svg",
  ]) {
    assert.ok(readme.includes(phrase), `READMEに無い: ${phrase}`);
  }
});

test("廃止した仕掛けの説明を残さない", async () => {
  const readme = await read("../README.md");
  for (const word of ["7つの力", "７つの力", "称号", "ポイント", "クエスト", "3ステップ", "今日のおすすめ"]) {
    assert.ok(!readme.includes(word), `READMEに残っている: ${word}`);
  }
});

test("練習用の素材が架空であることを明示している", async () => {
  for (const path of ["../assets/sample-notice.md", "../assets/sample-draft.md"]) {
    const material = await read(path);
    assert.match(material, /練習用/);
    assert.match(material, /実在の[^\n]*とは関係ありません/);
  }
  const screen = await read("../assets/sample-screen.svg");
  assert.match(screen, /<title>[^<]*練習用[^<]*<\/title>/);
  assert.doesNotMatch(screen, /(?:href|src)=["']https?:\/\//i);
  assert.doesNotMatch(screen, /<script/i);
});

test("コードとコンテンツのライセンスが分かれている", async () => {
  const codeLicense = await read("../LICENSE-CODE");
  const contentLicense = await read("../LICENSE-CONTENT");

  assert.match(codeLicense, /MIT License/);
  assert.match(codeLicense, /Permission is hereby granted, free of charge/);
  assert.match(contentLicense, /Creative Commons Attribution 4\.0 International/);
  assert.match(contentLicense, /CC BY 4\.0/);
});

test("404ページは自己完結していて、相対リンクで戻る", async () => {
  const html = await read("../404.html");

  assert.match(html, /<html\s+lang="ja"/i);
  assert.match(html, /<meta\s+charset="utf-8"/i);
  assert.match(html, /<meta\s+name="viewport"/i);
  assert.match(html, /<main[\s>]/i);
  assert.match(html, /<a\s+href="\.\/">[\s\S]*トップへ戻る[\s\S]*<\/a>/i);
  assert.doesNotMatch(html, /(?:src|href)=["']https?:\/\//i);
  assert.doesNotMatch(html, /<script/i);
});
