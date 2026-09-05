import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

test("theme bootstrap defaults light even on a dark OS, and honors explicit choices", async () => {
  const script = await readFile(new URL("../public/theme-init.js", import.meta.url), "utf8");
  for (const [saved, osDark, expected] of [[null,true,"light"], ["dark",false,"dark"], ["light",true,"light"], ["system",true,"dark"], ["system",false,"light"], ["invalid",true,"light"]]) {
    const document = { documentElement: { dataset: {} } };
    vm.runInNewContext(script, { document, localStorage: { getItem: () => saved }, window: { matchMedia: () => ({ matches: osDark }) } });
    assert.equal(document.documentElement.dataset.theme, expected);
  }
  const document = { documentElement: { dataset: {} } };
  vm.runInNewContext(script, { document, localStorage: { getItem: () => { throw new Error("blocked"); } }, window: {} });
  assert.equal(document.documentElement.dataset.theme, "light");
});
