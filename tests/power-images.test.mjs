import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const assetUrl = (name) => new URL(`../assets/${name}`, import.meta.url);

function readLossyWebpSize(buffer) {
  assert.equal(buffer.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(buffer.subarray(8, 12).toString("ascii"), "WEBP");
  assert.equal(buffer.subarray(12, 16).toString("ascii"), "VP8 ");
  assert.deepEqual([...buffer.subarray(23, 26)], [0x9d, 0x01, 0x2a]);

  return {
    width: buffer.readUInt16LE(26) & 0x3fff,
    height: buffer.readUInt16LE(28) & 0x3fff,
  };
}

test("seven-powers artwork is published as correctly sized WebP files under 1 MB total", async () => {
  const variants = [
    { name: "seven-powers-720.webp", width: 720, height: 1018 },
    { name: "seven-powers-1055.webp", width: 1055, height: 1491 },
  ];

  let totalBytes = 0;

  for (const variant of variants) {
    const [buffer, file] = await Promise.all([
      readFile(assetUrl(variant.name)),
      stat(assetUrl(variant.name)),
    ]);
    const metadata = readLossyWebpSize(buffer);

    assert.equal(metadata.width, variant.width, `${variant.name} width`);
    assert.equal(metadata.height, variant.height, `${variant.name} height`);
    totalBytes += file.size;
  }

  assert.ok(totalBytes < 1_000_000, `combined artwork is ${totalBytes} bytes`);
});
