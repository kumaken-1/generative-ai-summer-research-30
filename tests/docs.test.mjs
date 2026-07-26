import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("README explains the public course, safety, operation, and contribution rules", async () => {
  const readme = await read("../README.md");

  for (const phrase of [
    "夏休み限定",
    "自由参加",
    "ランキング",
    "提出",
    "最初の10回",
    "写真",
    "文書",
    "localStorage",
    "収集しません",
    "外部API",
    "個人情報",
    "下書き",
    "ファクトチェック",
    "対話",
    "GitHub Pages",
    "npm test",
    "npm run build:print",
    "js/quests.js",
    "MIT License",
    "CC BY 4.0",
  ]) {
    assert.ok(readme.includes(phrase), `README is missing: ${phrase}`);
  }
});

test("README explains the beginner flow, mobile support, points, and image update policy", async () => {
  const readme = await read("../README.md");

  for (const phrase of [
    "1. 気になるクエストを選ぶ",
    "2. 文章を生成AIに入力する",
    "3. AIの回答を読んで、続けて文章を入力する",
    "携帯",
    "0/60",
    "獲得ポイント/総ポイント",
    "能力評価ではなく",
    "体験回数",
    "seven-powers-720.webp",
    "seven-powers-1055.webp",
    "元画像",
    "公開リポジトリに含めません",
  ]) {
    assert.ok(readme.includes(phrase), `README is missing: ${phrase}`);
  }
});

test("dual license files clearly cover code and content", async () => {
  const codeLicense = await read("../LICENSE-CODE");
  const contentLicense = await read("../LICENSE-CONTENT");

  assert.match(codeLicense, /MIT License/);
  assert.match(codeLicense, /Copyright \(c\) 2026 .* contributors/);
  assert.match(codeLicense, /Permission is hereby granted, free of charge/);

  assert.match(contentLicense, /Creative Commons Attribution 4\.0 International/);
  assert.match(contentLicense, /CC BY 4\.0/);
  assert.match(contentLicense, /https:\/\/creativecommons\.org\/licenses\/by\/4\.0\//);
  assert.match(contentLicense, /表示/);
});

test("404 page is accessible, self-contained, and links back with a project-safe relative URL", async () => {
  const html = await read("../404.html");

  assert.match(html, /<html\s+lang="ja"/i);
  assert.match(html, /<meta\s+charset="utf-8"/i);
  assert.match(html, /<meta\s+name="viewport"/i);
  assert.match(html, /<main[\s>]/i);
  assert.match(html, /<h1>[\s\S]*見つかりませんでした[\s\S]*<\/h1>/i);
  assert.match(html, /<a\s+href="\.\/">[\s\S]*トップへ戻る[\s\S]*<\/a>/i);
  assert.doesNotMatch(html, /(?:src|href)=["']https?:\/\//i);
  assert.doesNotMatch(html, /<script/i);
});
