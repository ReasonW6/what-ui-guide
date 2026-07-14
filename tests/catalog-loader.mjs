import { readFile } from "node:fs/promises";
import ts from "typescript";

let cachedModule;

function transpile(source) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  });
  const syntaxErrors = (compiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  if (syntaxErrors.length) {
    throw new Error(ts.formatDiagnostics(syntaxErrors, {
      getCanonicalFileName: (file) => file,
      getCurrentDirectory: () => process.cwd(),
      getNewLine: () => "\n",
    }));
  }
  return compiled.outputText;
}

function dataUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}

export async function loadCatalogModule() {
  if (!cachedModule) {
    const source = await readFile(new URL("../lib/catalog.ts", import.meta.url), "utf8");
    const searchSource = await readFile(
      new URL("../lib/catalog-search.ts", import.meta.url),
      "utf8",
    );
    const searchUrl = dataUrl(transpile(searchSource));
    const compiledCatalog = transpile(source).replace(
      /from\s+["']\.\/catalog-search["']/,
      `from ${JSON.stringify(searchUrl)}`,
    );
    cachedModule = import(dataUrl(compiledCatalog));
  }
  return cachedModule;
}
