import { readFile } from "node:fs/promises";
import ts from "typescript";

let modulePromise;

export function loadCredentialVaultModule() {
  if (!modulePromise) {
    modulePromise = (async () => {
      const source = await readFile(
        new URL("../lib/client/credential-vault.ts", import.meta.url),
        "utf8",
      );
      const compiled = ts.transpileModule(source, {
        fileName: "credential-vault.ts",
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
        reportDiagnostics: true,
      });
      const errors = (compiled.diagnostics ?? []).filter(
        (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
      );
      if (errors.length) {
        throw new Error(ts.formatDiagnostics(errors, {
          getCanonicalFileName: (file) => file,
          getCurrentDirectory: () => process.cwd(),
          getNewLine: () => "\n",
        }));
      }
      const url = `data:text/javascript;base64,${Buffer.from(compiled.outputText).toString("base64")}`;
      return import(url);
    })();
  }
  return modulePromise;
}
