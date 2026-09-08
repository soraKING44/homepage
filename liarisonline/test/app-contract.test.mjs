import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../js/html.js", import.meta.url), "utf8");
const sharedViews = await readFile(new URL("../js/views/shared.js", import.meta.url), "utf8");

test("public site never contains the secret answer table", async () => {
  await assert.rejects(access(new URL("../scenario/answers.json", import.meta.url)));
});

test("document URLs reject executable schemes and text is escaped", () => {
  assert.match(html, /function safeDocUrl/);
  assert.match(html, /parsed\.protocol !== 'http:' && parsed\.protocol !== 'https:'/);
  assert.match(html, /function esc\(value\)/);
  assert.match(sharedViews, /rel="noopener noreferrer"/);
});
