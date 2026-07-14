import { readFile } from "node:fs/promises";
import ts from "typescript";

let cachedModule;

export async function loadCatalogModule() {
  if (!cachedModule) {
    const source = await readFile(new URL("../lib/catalog.ts", import.meta.url), "utf8");
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
    const dataUrl = `data:text/javascript;base64,${Buffer.from(compiled.outputText).toString("base64")}`;
    cachedModule = import(dataUrl);
  }
  return cachedModule;
}
