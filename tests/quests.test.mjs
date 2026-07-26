import test from "node:test";
import assert from "node:assert/strict";
import { quests } from "../js/quests.js";

test("30個のクエストが1から30まで重複なく存在する", () => {
  assert.equal(quests.length, 30);
  assert.deepEqual(quests.map((quest) => quest.id), [...Array(30)].map((_, i) => i + 1));
});
