import { stat } from 'node:fs/promises';
import c from 'picocolors';
import open from 'open';
import {
  cliHtmlHighlight,
  copyToClipboard,
  getFilesRecursively,
  getGenerator,
  getLatestEsms
} from './utils.ts';

// Best-effort extraction of top-level export names from a TS source that
// may contain syntax errors. Used only as a fallback when amaro's parser
// fails — we need to keep importers linkable so the SyntaxError stub from
// serve.ts reaches the browser console instead of being masked by an earlier
// "does not provide an export named X" link error.
//
// Strategy: blank out comments and string/template literals (preserving
// newlines so positions stay sensible) so `export` can't match inside them,
// then walk every `export ...` occurrence and pattern-match the common forms.
// Type-only exports (interface, type) emit no runtime binding and are skipped.
export function extractExportNames(source: string): string[] {
  const blank = (m: string) => m.replace(/[^\n]/g, ' ');
  const stripped = source
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/\/\/[^\n]*/g, blank)
    .replace(/(['"])(?:\\.|(?!\1).)*?\1/g, blank)
    .replace(/`(?:\\[\s\S]|\$\{[^}]*\}|(?!`)[\s\S])*?`/g, blank);

  const names = new Set<string>();
  const ID = '[A-Za-z_$][\\w$]*';
  const re = /\bexport\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped))) {
    const rest = stripped.slice(m.index + m[0].length);

    if (/^default\b/.test(rest)) {
      names.add('default');
      continue;
    }
    if (/^(?:type|interface)\b/.test(rest)) continue;

    let sub = rest.match(new RegExp(`^\\*\\s+as\\s+(${ID})`));
    if (sub) {
      names.add(sub[1]);
      continue;
    }
    if (/^\*/.test(rest)) continue; // export * from — names not recoverable

    sub = rest.match(new RegExp(`^(?:async\\s+)?function\\s*\\*?\\s*(${ID})`));
    if (sub) {
      names.add(sub[1]);
      continue;
    }
    sub = rest.match(new RegExp(`^(?:class|enum|namespace)\\s+(${ID})`));
    if (sub) {
      names.add(sub[1]);
      continue;
    }
    sub = rest.match(new RegExp(`^(?:const|let|var)\\s+(${ID})`));
    if (sub) {
      names.add(sub[1]);
      continue;
    }

    if (rest[0] === '{') {
      const close = rest.indexOf('}');
      if (close > 0) {
        for (const spec of rest.slice(1, close).split(',')) {
          const t = spec.trim();
          if (!t) continue;
          const asMatch = t.match(new RegExp(`\\sas\\s+(${ID})\\s*$`));
          if (asMatch) {
            names.add(asMatch[1]);
          } else {
            const idMatch = t.match(new RegExp(`^(${ID})`));
            if (idMatch) names.add(idMatch[1]);
          }
        }
      }
    }
  }
  return [...names];
}

// Function to display keyboard shortcuts
let showingShortcuts = false;
let showingShortcutsWatch = false;

// Define the key handler outside to avoid multiple bindings
let currentKeyHandler: ((key: Buffer) => void) | null = null;

export function showShortcuts(serverUrl: string, isWatchMode = false) {
  // Clean up existing handler first if we're setting up shortcuts again
  if (currentKeyHandler) {
    process.stdin.removeListener('data', currentKeyHandler);
    currentKeyHandler = null;
  }

  // If shortcuts are already showing, just ensure handler is attached
  if (showingShortcuts) {
    setupKeyHandler(serverUrl);
    return;
  }

  if (isWatchMode) {
    showingShortcutsWatch = true;
    console.log(`${c.blue('Info:')} Watching for file changes...`);
  }

  process.stdin.setRawMode?.(true);
  process.stdin.resume();
  showingShortcuts = true;

  setupKeyHandler(serverUrl);
}

function setupKeyHandler(serverUrl: string) {
  // Create a new handler
  currentKeyHandler = key => {
    // Convert the key buffer to a string for comparison
    const keyStr = String(key);

    switch (keyStr) {
      case '\u0003': // Ctrl+C
      case 'q':
        hideShortcuts();
        console.log(`\n${c.blue('Info:')} Server stopped`);
        process.exit(0);
        break;
      case 'o':
        console.log(`${c.blue('Info:')} Opening ${serverUrl} in browser`);
        open(serverUrl);
        break;
      case 'c':
        console.log(`${c.blue('Info:')} Copied server URL to clipboard`);
        copyToClipboard(serverUrl);
        break;
    }
  };

  // Attach the new handler
  process.stdin.on('data', currentKeyHandler);
}

// Function to hide keyboard shortcuts
export function hideShortcuts() {
  if (!showingShortcuts) return;

  // Remove the event listener if it exists
  if (currentKeyHandler) {
    process.stdin.removeListener('data', currentKeyHandler);
    currentKeyHandler = null;
  }

  process.stdin.setRawMode?.(false);
  process.stdin.pause();

  if (showingShortcutsWatch) {
    console.log(`\x1b[2K\x1b[1A`);
    showingShortcutsWatch = false;
  }

  showingShortcuts = false;
}

let esModuleShimsUrl: string | null = null;
export async function esmsCodeSnippet(importMapSrc?: string) {
  if (!esModuleShimsUrl) {
    esModuleShimsUrl = await getLatestEsms(await getGenerator({}), 'jspm.io');
  }
  return `<script src="${importMapSrc || 'importmap.js'}"></script>
<script async crossorigin="anonymous" src="${esModuleShimsUrl}"></script>`;
}

export function lintMessage({
  file,
  name,
  description,
  code
}: {
  file: string;
  name: string;
  description?: string;
  code?: { title?: string; type?: 'html'; snippet: string };
}) {
  hideShortcuts();
  console.log(`${c.yellow('Warning:')} Problem in HTML file ${c.bold(file)}:`);
  console.log(`${c.yellow(` → ${name}`)}${description ? `\n   ${c.dim(description)}` : ''}`);
  if (code) {
    if (code.title) console.log(`\n${c.magenta(code.title)}`);
    console.log(`\n${cliHtmlHighlight(code.snippet)}\n`);
  }
}

export async function getFileMtimes(
  directory: string,
  watchInclude: string[] | undefined,
  watchIgnore: string[] | undefined
) {
  const fileMTimes = new Map<string, number>();
  // Initialize the file MTimes map
  const initialFileList = await getFilesRecursively(directory, watchIgnore, watchInclude, {});
  for (const filePath of initialFileList) {
    try {
      const stats = await stat(filePath);
      fileMTimes.set(filePath, stats.mtimeMs);
    } catch (err) {}
  }
  return fileMTimes;
}
