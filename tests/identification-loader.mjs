import { readFile } from "node:fs/promises";
import ts from "typescript";

let modulesPromise;

function transpile(source, filename) {
  const compiled = ts.transpileModule(source, {
    fileName: filename,
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
  return compiled.outputText;
}

function dataUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}

async function readTypeScript(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

export async function loadIdentificationModules() {
  if (!modulesPromise) {
    modulesPromise = (async () => {
      const [contractSource, openaiSource, captureSource] = await Promise.all([
        readTypeScript("../lib/identification-contract.ts"),
        readTypeScript("../lib/openai-identification.ts"),
        readTypeScript("../lib/webpage-capture.ts"),
      ]);
      const contractUrl = dataUrl(
        transpile(contractSource, "identification-contract.ts"),
      );
      const replaceContractImport = (source) => source.replace(
        /from\s+["']\.\/identification-contract["']/g,
        `from ${JSON.stringify(contractUrl)}`,
      );
      const openaiUrl = dataUrl(replaceContractImport(
        transpile(openaiSource, "openai-identification.ts"),
      ));
      const captureUrl = dataUrl(replaceContractImport(
        transpile(captureSource, "webpage-capture.ts"),
      ));

      const [contract, openai, capture] = await Promise.all([
        import(contractUrl),
        import(openaiUrl),
        import(captureUrl),
      ]);
      return { contract, openai, capture };
    })();
  }
  return modulesPromise;
}
