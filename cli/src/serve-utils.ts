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
  const initialFileList = await getFilesRecursively(directory, watchIgnore, watchInclude);
  for (const filePath of initialFileList) {
    try {
      const stats = await stat(filePath);
      fileMTimes.set(filePath, stats.mtimeMs);
    } catch (err) {}
  }
  return fileMTimes;
}
