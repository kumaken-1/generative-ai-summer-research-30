import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowURL = new URL("../.github/workflows/pages.yml", import.meta.url);

test("GitHub Pages workflow has safe triggers, permissions, and concurrency", async () => {
  const workflow = await readFile(workflowURL, "utf8");

  assert.match(workflow, /^name:\s*Deploy GitHub Pages$/m);
  assert.match(workflow, /^\s{2}push:\s*$/m);
  assert.match(workflow, /^\s{4}branches:\s*\[main\]\s*$/m);
  assert.match(workflow, /^\s{2}workflow_dispatch:\s*$/m);
  assert.match(workflow, /^\s{2}contents:\s*read\s*$/m);
  assert.match(workflow, /^\s{2}pages:\s*write\s*$/m);
  assert.match(workflow, /^\s{2}id-token:\s*write\s*$/m);
  assert.match(workflow, /^concurrency:\s*$/m);
  assert.match(workflow, /^\s{2}cancel-in-progress:\s*true\s*$/m);
});

test("GitHub Pages workflow tests and builds before uploading and deploying", async () => {
  const workflow = await readFile(workflowURL, "utf8");
  const requiredSteps = [
    "actions/checkout@v4",
    "actions/setup-node@v4",
    "npm ci",
    "npx playwright install --with-deps chromium",
    "npm test",
    "npm run test:smoke",
    "npm run build:print",
    "git diff --exit-code -- print.html",
    "actions/configure-pages@v5",
    "actions/upload-pages-artifact@v3",
    "actions/deploy-pages@v4",
  ];

  let previousIndex = -1;
  for (const step of requiredSteps) {
    const index = workflow.indexOf(step);
    assert.notEqual(index, -1, `missing workflow step: ${step}`);
    assert.ok(index > previousIndex, `workflow step is out of order: ${step}`);
    previousIndex = index;
  }

  assert.match(workflow, /^\s{4}environment:\s*$/m);
  assert.match(workflow, /^\s{6}name:\s*github-pages\s*$/m);
  assert.match(workflow, /url:\s*\$\{\{\s*steps\.deployment\.outputs\.page_url\s*\}\}/);
});

test("Playwright is an exact development dependency so CI smoke tests cannot skip", async () => {
  const packageJSON = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );

  assert.match(packageJSON.devDependencies?.playwright ?? "", /^\d+\.\d+\.\d+$/);
  assert.doesNotMatch(packageJSON.devDependencies.playwright, /^[~^]/);
});

test("installed dependencies are excluded from the public repository", async () => {
  const gitignore = await readFile(new URL("../.gitignore", import.meta.url), "utf8");

  assert.match(gitignore, /^node_modules\/$/m);
});
