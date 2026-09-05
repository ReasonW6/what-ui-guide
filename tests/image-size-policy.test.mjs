import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";

test("build-time image parser refuses vulnerable containers within a deadline", () => {
  const script = `import './build/image-size-policy.mjs';
import { imageSize } from 'image-size';
import assert from 'node:assert/strict';
const icns = Buffer.alloc(16); icns.write('icns'); icns.writeUInt32BE(16,4); icns.write('ic07',8);
const heif = Buffer.alloc(24); heif.writeUInt32BE(24); heif.write('ftyp',4); heif.write('avif',8);
const jxl = Buffer.alloc(32); jxl.writeUInt32BE(12); jxl.write('JXL ',4); jxl.writeUInt32BE(20,12); jxl.write('ftyp',16); jxl.write('jxl ',20);
for (const value of [icns, heif, jxl]) assert.throws(() => imageSize(value), /disabled file type/);
const png = Buffer.alloc(24); Buffer.from([137,80,78,71,13,10,26,10]).copy(png); png.write('IHDR',12); png.writeUInt32BE(32,16); png.writeUInt32BE(24,20);
assert.equal(imageSize(png).width,32);`;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], { cwd: new URL("..", import.meta.url), timeout: 3000, encoding: "utf8", windowsHide: true });
  assert.equal(result.error, undefined, "image parser must not hang");
  assert.equal(result.status, 0, result.stderr);
});
