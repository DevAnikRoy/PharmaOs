import { readFile } from 'node:fs/promises';
import ts from 'typescript';

export async function loadTs(url, mocks = {}) {
  const source = await readFile(url, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const exports = {};
  new Function('require', 'exports', outputText)((name) => {
    if (!(name in mocks)) throw new Error(`Unmocked dependency ${name}`);
    return mocks[name];
  }, exports);
  return exports;
}
