import { getIntegrity } from "../common/integrity.js";
import { Analysis } from "./analysis";

let babel, babelPresetTs, babelPluginImportAttributes;

export function setBabel(_babel, _babelPresetTs, _babelPluginImportAttributes) {
  (babel = _babel),
    (babelPresetTs = _babelPresetTs),
    (babelPluginImportAttributes = _babelPluginImportAttributes);
}

const globalConsole = globalThis.console;
const dummyConsole = {
  log() {},
  warn() {},
  memory() {},
  assert() {},
  clear() {},
  count() {},
  countReset() {},
  debug() {},
  dir() {},
  dirxml() {},
  error() {},
  exception() {},
  group() {},
  groupCollapsed() {},
  groupEnd() {},
  info() {},
  table() {},
  time() {},
  timeEnd() {},
  timeLog() {},
  timeStamp() {},
  trace() {},
};

export async function createTsAnalysis(
  source: string,
  url: string
): Promise<Analysis> {
  if (!babel)
    [
      babel,
      { default: babelPresetTs },
      { default: babelPluginImportAttributes },
    ] = await Promise.all([
      import("@babel/core"),
      import("@babel/preset-typescript"),
      import("@babel/plugin-syntax-import-attributes"),
    ]);

  const imports = new Set<string>();
  const dynamicImports = new Set<string>();

  // @ts-ignore
  globalThis.console = dummyConsole;
  try {
    babel.transform(source, {
      filename: "/" + url,
      ast: false,
      sourceMaps: false,
      inputSourceMap: false,
      babelrc: false,
      babelrcRoots: false,
      configFile: false,
      highlightCode: false,
      compact: false,
      sourceType: "module",
      parserOpts: {
        plugins: ["jsx"],
        errorRecovery: true,
      },
      presets: [
        [
          babelPresetTs,
          {
            onlyRemoveTypeImports: true,
          },
        ],
      ],
      plugins: [
        babelPluginImportAttributes,
        () => {
          return {
            visitor: {
              ExportAllDeclaration(path) {
                if (path.node.exportKind !== "type")
                  imports.add(path.node.source.value);
              },
              ExportNamedDeclaration(path) {
                if (path.node.source) imports.add(path.node.source.value);
              },
              ImportDeclaration(path) {
                if (path.node.exportKind !== "type")
                  imports.add(path.node.source.value);
              },
              Import(path) {
                dynamicImports.add(
                  buildDynamicString(
                    path.parentPath.get("arguments.0").node,
                    url,
                    true
                  )
                );
              },
            },
          };
        },
      ],
    });
  } finally {
    globalThis.console = globalConsole;
  }

  return {
    deps: [...imports],
    dynamicDeps: [...dynamicImports],
    cjsLazyDeps: null,
    size: source.length,
    format: "typescript",
    integrity: await getIntegrity(source),
  };
}

// We use the special character \x10 as a "wildcard symbol"
function buildDynamicString(
  node,
  fileName,
  isEsm = false,
  lastIsWildcard = false
): string {
  if (node.type === "StringLiteral") {
    return node.value;
  }
  if (node.type === "TemplateLiteral") {
    let str = "";
    for (let i = 0; i < node.quasis.length; i++) {
      const quasiStr = node.quasis[i].value.cooked;
      if (quasiStr.length) {
        str += quasiStr;
        lastIsWildcard = false;
      }
      const nextNode = node.expressions[i];
      if (nextNode) {
        const nextStr = buildDynamicString(
          nextNode,
          fileName,
          isEsm,
          lastIsWildcard
        );
        if (nextStr.length) {
          lastIsWildcard = nextStr.endsWith("\x10");
          str += nextStr;
        }
      }
    }
    return str;
  }
  if (node.type === "BinaryExpression" && node.operator === "+") {
    const leftResolved = buildDynamicString(
      node.left,
      fileName,
      isEsm,
      lastIsWildcard
    );
    if (leftResolved.length) lastIsWildcard = leftResolved.endsWith("\x10");
    const rightResolved = buildDynamicString(
      node.right,
      fileName,
      isEsm,
      lastIsWildcard
    );
    return leftResolved + rightResolved;
  }
  if (isEsm && node.type === "Identifier") {
    if (node.name === "__dirname") return ".";
    if (node.name === "__filename") return "./" + fileName;
  }
  // TODO: proper expression support
  // new URL('...', import.meta.url).href | new URL('...', import.meta.url).toString() | new URL('...', import.meta.url).pathname
  // import.meta.X
  /*if (isEsm && node.type === 'MemberExpression' && node.object.type === 'MetaProperty' &&
      node.object.meta.type === 'Identifier' && node.object.meta.name === 'import' &&
      node.object.property.type === 'Identifier' && node.object.property.name === 'meta') {
    if (node.property.type === 'Identifier' && node.property.name === 'url') {
      return './' + fileName;
    }
  }*/
  return lastIsWildcard ? "" : "\x10";
}
