import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const demoUrl = new URL("../app/ui/DemoStage.tsx", import.meta.url);
const cssUrl = new URL("../app/ui/demo-stage.css", import.meta.url);

function attributeNames(node) {
  return new Set(
    node.attributes.properties
      .filter(ts.isJsxAttribute)
      .map((attribute) => attribute.name.text),
  );
}

test("every demo button has an activation handler", async () => {
  const source = await readFile(demoUrl, "utf8");
  const file = ts.createSourceFile("DemoStage.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const unwired = [];

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (node.tagName.getText(file) === "button") {
        const attributes = attributeNames(node);
        if (!["onClick", "onContextMenu"].some((name) => attributes.has(name))) {
          const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
          unwired.push(line + 1);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(file);
  assert.deepEqual(unwired, [], `unwired demo buttons at lines: ${unwired.join(", ")}`);
});

test("every range control updates state", async () => {
  const source = await readFile(demoUrl, "utf8");
  const file = ts.createSourceFile("DemoStage.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const unwired = [];

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (node.tagName.getText(file) === "input") {
        const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
        const type = attributes.find((attribute) => attribute.name.text === "type");
        const isRange = type?.initializer && ts.isStringLiteral(type.initializer) && type.initializer.text === "range";
        if (isRange && !attributeNames(node).has("onChange")) {
          const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
          unwired.push(line + 1);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(file);
  assert.deepEqual(unwired, [], `unwired range inputs at lines: ${unwired.join(", ")}`);
});

test("before-after slider uses a horizontal full-area control", async () => {
  const [source, css] = await Promise.all([
    readFile(demoUrl, "utf8"),
    readFile(cssUrl, "utf8"),
  ]);
  assert.match(source, /className="demo-compare-control"/);
  assert.match(source, /className="demo-compare-line"/);
  assert.match(source, /className="demo-compare-handle"/);
  assert.match(css, /\.demo-compare-control\s*\{[\s\S]*?inset:\s*0;/);
  const componentSection = source.slice(
    source.indexOf('case "before-after-slider"'),
    source.indexOf("default:", source.indexOf('case "before-after-slider"')),
  );
  assert.match(componentSection, /max="100"/);
  assert.match(componentSection, /min="0"/);
  assert.doesNotMatch(componentSection, /max="92"|min="8"/);
  assert.equal(componentSection.split('style={{ left: `${compare}%` }}').length - 1, 2);
  const section = css.slice(
    css.indexOf(".demo-stage .demo-before-after"),
    css.indexOf(".demo-stage .demo-unavailable"),
  );
  assert.doesNotMatch(section, /rotate\(90deg\)/);
  assert.doesNotMatch(section, /\.demo-before\s*\{[\s\S]*?border-right:/);
  assert.match(section, /\.demo-before\s*\{[\s\S]*?padding:\s*0;/);
  assert.match(section, /\.demo-compare-control input\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;/);
  assert.match(section, /\.demo-compare-line\s*\{[\s\S]*?width:\s*2px;[\s\S]*?transform:\s*translateX\(-50%\);/);
  assert.match(section, /\.demo-compare-handle\s*\{[\s\S]*?width:\s*34px;[\s\S]*?height:\s*34px;/);
});

test("visible scroll areas use the dark scrollbar treatment", async () => {
  const [globalCss, codeCss, demoCss] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/ui/code-explorer.css", import.meta.url), "utf8"),
    readFile(cssUrl, "utf8"),
  ]);
  assert.match(globalCss, /html\s*\{[\s\S]*?scrollbar-width:\s*thin;/);
  assert.match(globalCss, /html::\-webkit-scrollbar-thumb/);
  assert.match(codeCss, /\.code-panel\s*\{[\s\S]*?scrollbar-color:/);
  assert.match(codeCss, /\.code-panel::\-webkit-scrollbar-corner/);
  assert.match(demoCss, /\.demo-table-scroll,[\s\S]*?\.demo-feed > div,[\s\S]*?\.demo-snap > div:first-child\s*\{[\s\S]*?scrollbar-width:\s*thin;/);
});

test("usage guidance renders a complete two-column grid", async () => {
  const source = await readFile(new URL("../app/components/[slug]/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /info-panel-wide/);
  assert.equal((source.match(/className="info-panel"/g) ?? []).length, 4);
});

test("detail copy actions use the shared top-right icon treatment", async () => {
  const [promptSource, codeSource, globalCss, codeCss] = await Promise.all([
    readFile(new URL("../app/ui/InteractiveDetail.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ui/CodeExplorer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/ui/code-explorer.css", import.meta.url), "utf8"),
  ]);
  assert.match(promptSource, /className="copy-icon-button"/);
  assert.match(codeSource, /className="copy-code copy-icon-button"/);
  assert.match(globalCss, /\.prompt-box \.copy-icon-button\s*\{[\s\S]*?position:\s*absolute;/);
  assert.match(codeCss, /\.copy-code\s*\{[\s\S]*?position:\s*absolute;/);
});

test("desktop detail preview has a full-height sticky containing block", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.detail-visual\s*\{\s*align-self:\s*stretch;/);
  assert.match(css, /\.detail-visual-sticky\s*\{[\s\S]*?position:\s*sticky;/);
  assert.match(css, /@media \(max-width:\s*980px\)[\s\S]*?\.detail-visual-sticky\s*\{\s*position:\s*static;/);
});
