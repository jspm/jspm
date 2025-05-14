import * as fs from "node:fs/promises";
import * as http from "node:http";
import * as path from "node:path";
import { stripTypeScriptTypes } from "node:module";
import { existsSync } from "node:fs";
import c from "picocolors";
import open from "open";
import mime from "mime";
import {
  JspmError,
  copyToClipboard,
  getFilesRecursively,
  runPackageScript,
  startSpinner,
  stopSpinner,
  getInputPath,
} from "./utils.ts";
import { ImportMap } from '@jspm/import-map';

import type { ServeFlags } from "./cli.ts";
import { pathToFileURL } from "node:url";

// Generate HTML directory listing
async function generateDirectoryListing(
  directoryPath: string,
  requestPath: string
): Promise<string> {
  const files = await fs.readdir(directoryPath, { withFileTypes: true });

  let html = `<!DOCTYPE html>
<html>
<head>
  <title>Directory listing for ${requestPath}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { border-bottom: 1px solid #ddd; padding-bottom: 10px; }
    ul { list-style-type: none; padding: 0; }
    li { padding: 5px 0; }
    li a { display: block; text-decoration: none; }
    li a:hover { text-decoration: underline; }
    .directory { font-weight: bold; }
  </style>
</head>
<body>
  <h1>Directory listing for ${requestPath}</h1>
  <ul>`;

  // Add parent directory link if not at root
  if (requestPath !== "/") {
    html += `
    <li><a href="..">..</a></li>`;
  }

  // Sort entries: directories first, then files
  const sortedFiles = files.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  // Add entries
  for (const file of sortedFiles) {
    const name = file.name;
    const href = path.join(requestPath, name);

    if (file.isDirectory()) {
      html += `
    <li><a href="${href}/" class="directory">${name}/</a></li>`;
    } else {
      html += `
    <li><a href="${href}">${name}</a></li>`;
    }
  }

  html += `
  </ul>
</body>
</html>`;

  return html;
}

export default async function serve(dir = ".", flags: ServeFlags = {}) {
  const port = flags.port || 5776;

  // Validate the input map if provided
  if (flags.map) {
    const mapPath = getInputPath(flags);
    if (!mapPath.endsWith('.json')) {
      throw new JspmError(`Import map must end with '.json', got '${mapPath}'`);
    }
  }

  // Resolve directory to absolute path
  const resolvedDir = path.resolve(dir);

  try {
    const stats = await fs.stat(resolvedDir);
    if (!stats.isDirectory()) {
      throw new JspmError(`"${dir}" is not a directory`);
    }
  } catch (err: any) {
    if (err.code === "ENOENT") {
      throw new JspmError(`Directory "${dir}" does not exist`);
    }
    throw err;
  }

  // SSE clients for live reloading
  const clients: Set<http.ServerResponse> = new Set();

  // Create HTTP server
  const server = http.createServer(async (req, res) => {
    try {
      const reqUrl = new URL(req.url || "/", `http://${req.headers.host}`);
      const reqPath = decodeURIComponent(reqUrl.pathname);

      // Handle Server-Sent Events endpoint for watch mode
      if (flags.watch && reqPath === "/_events") {
        // Set headers for SSE
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
        });

        // Send initial connection established message
        res.write("event: connected\ndata: Connected to SSE\n\n");

        // Add client to the set of active clients
        clients.add(res as http.ServerResponse);

        // Handle client disconnect
        req.on("close", () => {
          clients.delete(res as http.ServerResponse);
        });

        return;
      }

      // Get watch script path from import map path if available
      let watchScriptPath = "/_watch.js";
      if (flags.watch && flags.map) {
        const mapPath = getInputPath(flags);
        const mapBaseName = path.basename(mapPath, '.json');
        watchScriptPath = `/${mapBaseName}.js`;
      }

      // Handle request for watch script or import map JavaScript wrapper
      const isWatchScriptRequest = flags.watch && (reqPath === watchScriptPath || reqPath === "/_watch.js");
      const isImportMapJsRequest = flags.map && reqPath.endsWith(".js") && reqPath === `/${path.basename(getInputPath(flags), ".json")}.js`;
      
      if (isWatchScriptRequest || isImportMapJsRequest) {
        // Get import map
        let importMapJson = "{}";
        try {
          // For both watch script and standalone import map .js wrappers
          if (flags.map) {
            importMapJson = JSON.stringify(await readImportMap(flags, resolvedDir));
          }
        } catch (err) {
          if (err instanceof JspmError) {
            throw err;
          }
          console.warn(`${c.yellow("Warning:")} Failed to load import map: ${err.message}`);
        }

        res.writeHead(200, { "Content-Type": "text/javascript" });
        
        // If this is an import map JS wrapper in non-watch mode, return a simple injection script
        if (isImportMapJsRequest && !isWatchScriptRequest) {
          res.end(`// JSPM ImportMap JavaScript injection wrapper
document.head.appendChild(Object.assign(document.createElement("script"), {
  type: "importmap",
  innerHTML: ${importMapJson}
}));
`);
          return;
        }
        
        // Otherwise return the full watch script
        res.end(`/**
 * JSPM Hot Reloading with ES Module Shims
 *   (https://github.com/guybedford/es-module-shims?tab=readme-ov-file#hot-reloading)
 * 
 * Ideally, use <script type="module-shim">import 'app'</script> for hot reloading,
 * which is the recommended technique for ES Module Shims. Using Shim Mode allows
 * ES Module Shims to control all executions, and ensure \`import.meta.hot\` is available.
 * 
 * But, because that is not always possible to change, this script allows both shim mode
 * and polyfill native script mode by implementing a hack to avoid the double execution
 * for native module loads.
 * 
 * Note: It is still recommended to use hot reloading with \`<script type="module-shim">\`
 * Shim Mode scripts when possible.
 */
{
const pkgPath = new URL(document.currentScript.src).pathname;
// Remove the .js extension to get the base map path
const mapPath = pkgPath.replace(/\.js$/,'');

// First, put ES Module Shims into Shim Mode, and enable hot reloading
esmsInitOptions = {
  hotReload: true,
  shimMode: true
};

// Setup the hot reload change events
function createHotReloadSource() {
  const source = new EventSource('/_events');
  source.addEventListener('connected', function(e) {
    console.log('[JSPM Watch] Connected to server');
  });
  
  source.addEventListener('change', function(e) {
    const data = JSON.parse(e.data);
    console.log('[JSPM Watch] Files changed, reloading...');
    if (data.reload) {
      if (typeof importShim !== 'undefined' && importShim.hotReload) {
        data.files?.forEach(file => importShim.hotReload(file));
      } else {
        window.location.reload();
      }
    }
  });
  
  source.onerror = evt => {
    console.error('[JSPM Watch] EventSource error');
    if (source.readyState === EventSource.CLOSED) {
      console.info('[JSPM Watch] Connection closed, restarting...');
      clearTimeout(t);
      source = createHotReloadSource();
    }
  };
  
  const t = setTimeout(() => {
    source.close();
    createHotReloadSource();
  }, 90000);
  
  return source;
}
createHotReloadSource();

const importMap = ${importMapJson};

// Inject the import map as a Shim Mode import map
document.head.appendChild(Object.assign(document.createElement("script"), {
  type: "importmap-shim",
  innerHTML: JSON.stringify(importMap)
}));

// Create an importShim wrapper that polls for the real importShim to be defined
_is = async function (impt) {
  while (typeof importShim === 'undefined')
    await new Promise(resolve => setTimeout(resolve, 10));
  return importShim(impt);
};

/*
 * This implements the native import map patch hack - supporting the native imports via a
 * native import map that bridges into the shim loader with a data: URL approach.
 * The remaining limitation is that we don't provide named exports for these imports, but
 * that is the tradeoff that is made (and again, if this is not the case, use shim mode
 * scripts for hot reloading rather!).
 */
document.head.appendChild(Object.assign(document.createElement("script"), {
  type: "importmap",
  innerHTML: JSON.stringify({
    imports: Object.fromEntries(Object.entries(importMap.imports || {}).map(([impt, target]) =>
      !impt.endsWith('/')
      // Remap the native \`import 'app'\` to importShim('app')
      ? [impt, \`data:text/javascript,await _is(\${JSON.stringify(target)})\`]

      /*
      * The last hack here is handling trailing '/' mappings, which can't be known in advance.
      * We implement this with an import.meta.url trick for self-inspection with a JS comment
      * used to make this valid JS in the data URL. This is because, for an import map with:
      * 
      * {
      *   "imports": {
      *     "app/": "data:text/javascript,console.log(import.meta.url.slice(61))//"
      *   }
      * }
      * 
      * \`import('app/foo')\` will import the data URL with \`/foo\` appended to the data URL which
      * would result in an invalid JS source if we didn't have the comment at the end. We then
      * slice its own length to be able to get its own subpath string at runtime (61 in the above
      * example, and 93 in the below usage, being the length of the data URL itself).
      */
      : [impt, 'data:text/javascript,await _is(JSON.stringify(target) + import.meta.url.slice(96)); //']
    ))
  })
}));
}
`);
        return;
      }

      // Resolve to the actual file system path
      const filePath = path.join(resolvedDir, reqPath);

      // Basic security check to prevent directory traversal
      if (!filePath.startsWith(resolvedDir)) {
        res.writeHead(403);
        res.end("403 Forbidden");
        return;
      }

      try {
        const stats = await fs.stat(filePath);

        if (stats.isDirectory()) {
          // Check for index.html in directory
          const indexPath = path.join(filePath, "index.html");
          try {
            await fs.access(indexPath);
            // If index.html exists, serve it
            let content = await fs.readFile(indexPath, "utf8");

            // If watch mode is enabled, inject the watch client script
            if (flags.watch) {
              // Determine the watch script path
              let watchScriptPath = "/_watch.js";
              if (flags.map) {
                const mapPath = getInputPath(flags);
                const mapBaseName = path.basename(mapPath, '.json');
                watchScriptPath = `/${mapBaseName}.js`;
              }
              
              // Inject the watch script before the closing </body> tag
              if (content.includes("</body>")) {
                content = content.replace(
                  "</body>",
                  `<script src="${watchScriptPath}"></script></body>`
                );
              } else {
                // If there's no body tag, append it at the end
                content += `\n<script src="${watchScriptPath}"></script>`;
              }
            }

            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(content);
          } catch {
            // If no index.html, generate directory listing
            if (!reqPath.endsWith("/")) {
              // Redirect to add trailing slash for directories
              res.writeHead(301, { Location: `${reqPath}/` });
              res.end();
              return;
            }

            let listing = await generateDirectoryListing(filePath, reqPath);

            // If watch mode is enabled, inject the watch client script
            if (flags.watch) {
              // Determine the watch script path
              let watchScriptPath = "/_watch.js";
              if (flags.map) {
                const mapPath = getInputPath(flags);
                const mapBaseName = path.basename(mapPath, '.json');
                watchScriptPath = `/${mapBaseName}.js`;
              }
              
              // Inject the watch script before the closing </body> tag
              listing = listing.replace(
                "</body>",
                `<script src="${watchScriptPath}"></script></body>`
              );
            }

            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(listing);
          }
        } else {
          // Check if this is a request for the original TypeScript file
          const isOriginalRequest =
            reqPath.endsWith(".ts.original") ||
            reqPath.endsWith(".mts.original");

          if (isOriginalRequest) {
            // Serve the original TypeScript file without transformation
            const originalPath = filePath.slice(0, -9); // Remove '.original'
            const content = await fs.readFile(originalPath, "utf8");
            res.writeHead(200, { "Content-Type": "application/typescript" });
            res.end(content);
          } else {
            // Check if this is a TypeScript file that needs transformation
            const ext = path.extname(filePath);
            const isTypeScript = ext === ".ts" || ext === ".mts";

            if (isTypeScript && flags.typestripping !== false) {
              // Transform TypeScript to JavaScript by stripping types
              const tsContent = await fs.readFile(filePath, "utf8");
              try {
                // Use Node.js built-in TypeScript type stripping
                const strippedCode = stripTypeScriptTypes(tsContent);
                // Add sourceURL comment to preserve original filename in devtools
                const jsCode = `${strippedCode}\n//# sourceURL=${path.basename(
                  filePath
                )}.original`;
                res.writeHead(200, { "Content-Type": "text/javascript" });
                res.end(jsCode);
              } catch (error) {
                console.error(
                  `Error transforming TypeScript file: ${error.message}`
                );
                res.writeHead(500);
                res.end(`Error transforming TypeScript file: ${error.message}`);
              }
            } else if (ext === ".html" && flags.watch) {
              // For HTML files in watch mode, inject the watch client script
              let content = await fs.readFile(filePath, "utf8");

              // Determine the watch script path
              let watchScriptPath = "/_watch.js";
              if (flags.map) {
                const mapPath = getInputPath(flags);
                const mapBaseName = path.basename(mapPath, '.json');
                watchScriptPath = `/${mapBaseName}.js`;
              }

              // Inject the watch script before the closing </body> tag
              if (content.includes("</body>")) {
                content = content.replace(
                  "</body>",
                  `<script src="${watchScriptPath}"></script></body>`
                );
              } else {
                // If there's no body tag, append it at the end
                content += `\n<script src="${watchScriptPath}"></script>`;
              }

              res.writeHead(200, { "Content-Type": "text/html" });
              res.end(content);
            } else {
              // Serve all other files normally
              const content = await fs.readFile(filePath);
              const contentType =
                mime.getType(filePath) || "application/octet-stream";
              res.writeHead(200, { "Content-Type": contentType });
              res.end(content);
            }
          }
        }
      } catch (err: any) {
        if (err.code === "ENOENT") {
          res.writeHead(404);
          res.end("404 Not Found");
        } else {
          console.error(err);
          res.writeHead(500);
          res.end("500 Internal Server Error");
        }
      }
    } catch (err) {
      console.error(err);
      res.writeHead(500);
      res.end("500 Internal Server Error");
    }
  });

  // Start the server
  server.listen(port, async () => {
    if (!flags.silent) {
      const serverUrl = `http://localhost:${port}`;
      console.log(`${c.green("Server running at:")} ${c.bold(serverUrl)}`);
      console.log(`${c.green("Serving directory:")} ${c.bold(resolvedDir)}`);
      if (flags.typestripping !== false) {
        console.log(
          `${c.blue("TypeScript:")} ${c.dim(
            "Type stripping is applied to TypeScript files (use --no-typestripping to disable)"
          )}`
        );
      }

      // If watch mode is enabled, start the file watcher
      if (flags.watch) {
        await startWatchMode(resolvedDir, clients);
        console.log(`${c.blue("Info:")} ${c.dim("Watching for changes...")}`);
      }

      // Display keyboard shortcuts
      console.log(`${c.magenta(c.bold("\nKeyboard shortcuts:"))}
 → ${c.bold(c.bgBlueBright(c.whiteBright(" o ")))} ${c.dim(
        "Open server URL in the browser"
      )}
 → ${c.bold(c.bgBlueBright(c.whiteBright(" c ")))} ${c.dim(
        "Copy server URL to clipboard"
      )}
 → ${c.bold(c.bgBlueBright(c.whiteBright(" r ")))} ${c.dim(
        flags.watch ? "Force reload all clients" : "Reload server (restart)"
      )}`);

      if (flags.watch) {
        console.log(
          ` → ${c.bold(c.bgBlueBright(c.whiteBright(" p ")))} ${c.dim(
            "Run prepare script"
          )}`
        );
      }

      console.log(
        ` → ${c.bold(c.bgBlueBright(c.whiteBright(" q ")))} ${c.dim(
          "Stop server (or Ctrl+C)"
        )}`
      );

      // Setup keyboard input handling
      process.stdin.setRawMode?.(true);
      process.stdin.resume();
      process.stdin.on("data", (key) => {
        switch (String(key)) {
          case "\u0003": // Ctrl+C
          case "q":
            console.log(`\n${c.blue("Info:")} Server stopped`);
            process.exit(0);
            break;
          case "o":
            console.log(`${c.blue("Info:")} Opening ${serverUrl} in browser`);
            open(serverUrl);
            break;
          case "c":
            console.log(`${c.blue("Info:")} Copied server URL to clipboard`);
            copyToClipboard(serverUrl);
            break;
          case "r":
            if (flags.watch) {
              console.log(
                `${c.blue("Info:")} Triggering reload for all clients...`
              );
              notifyClients(clients, { reload: true, forced: true });
            } else {
              console.log(`${c.blue("Info:")} Restarting server...`);
              server.close(() => {
                server.listen(port, () => {
                  console.log(
                    `${c.green("Ok:")} Server restarted at ${c.bold(serverUrl)}`
                  );
                });
              });
            }
            break;
          case "p":
            if (flags.watch) {
              console.log(`${c.blue("Info:")} Running prepare script...`);
              runPrepareScript(resolvedDir, clients);
            }
            break;
        }
      });
    }
  });

  // Handle server errors
  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      throw new JspmError(
        `Port ${port} is already in use. Try a different port with --port option.`
      );
    } else {
      throw err;
    }
  });

  // Handle process termination
  process.on("SIGINT", () => {
    console.log(`\n${c.blue("Info:")} Server stopped`);
    process.exit(0);
  });

  // Keep the process running
  return new Promise<void>(() => {});
}

// Notify all connected SSE clients of an event
function notifyClients(clients: Set<http.ServerResponse>, data: any) {
  const event = `event: change\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((client) => {
    try {
      client.write(event);
    } catch (err) {
      // Client might have disconnected
    }
  });
}

// Run package.json prepare script if it exists
async function runPrepareScript(
  directory: string,
  clients: Set<http.ServerResponse>
) {
  try {
    const packageJsonPath = path.join(directory, "package.json");
    if (!existsSync(packageJsonPath)) {
      console.log(
        `${c.yellow("Warning:")} No package.json found in ${directory}`
      );
      return;
    }

    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
    const prepareScript = packageJson.scripts?.prepare;

    if (!prepareScript) {
      console.log(
        `${c.yellow("Warning:")} No prepare script found in package.json`
      );
      return;
    }

    startSpinner(`Running prepare script: ${c.dim(prepareScript)}`);

    try {
      await runPackageScript(prepareScript, directory);
      stopSpinner();
      console.log(`${c.green("Ok:")} Prepare script completed`);

      // Notify clients to reload
      notifyClients(clients, { reload: true, prepare: true });
    } catch (error) {
      stopSpinner();
      console.error(
        `${c.red("Error:")} Prepare script failed: ${error.message}`
      );
    }
  } catch (error) {
    console.error(
      `${c.red("Error:")} Failed to run prepare script: ${error.message}`
    );
  }
}

// Custom function to read and validate an import map
async function readImportMap(flags: ServeFlags, serverRoot: string) {
  const mapPath = getInputPath(flags);
  
  // Read and parse the import map file
  try {
    const content = await fs.readFile(mapPath, 'utf8');
    
    // Validate that it's valid JSON
    try {
      const parsedMap = JSON.parse(content);
      

      const importMap = new ImportMap({
        map: parsedMap,
        mapUrl: this.mapUrl,
        rootUrl: this.rootUrl,
      });
      importMap.rebase(path.relative(serverRoot, mapPath).replace(/\\/g, '/'), pathToFileURL(serverRoot));
      
      return importMap.toJSON();
    } catch (parseErr) {
      throw new JspmError(`Import map is not valid JSON: ${parseErr.message}`);
    }
  } catch (readErr) {
    if (readErr instanceof JspmError) {
      throw readErr;
    }
    throw new JspmError(`Failed to read import map '${mapPath}': ${readErr.message}`);
  }
}

// Start the watch mode to monitor file changes
async function startWatchMode(
  directory: string,
  clients: Set<http.ServerResponse>
) {
  let lastCheckTime = 0;
  const fileMTimes = new Map<string, number>();
  const jspmConfigPath = path.join(directory, "jspm.json");
  let lastConsoleErase = 0;
  let watchIgnore: string[] = [];
  let watchInclude: string[] = [];
  let debounceTimer: NodeJS.Timeout | null = null;

  // Try to load jspm.json for ignore/include patterns
  try {
    if (existsSync(jspmConfigPath)) {
      const jspmConfig = JSON.parse(await fs.readFile(jspmConfigPath, "utf8"));
      watchIgnore = jspmConfig.ignore || [];
      watchInclude = jspmConfig.include || [];
    }
  } catch (err) {
    console.warn(
      `${c.yellow("Warning:")} Failed to load jspm.json config: ${err.message}`
    );
  }

  // Check for package.json prepare script
  let hasPrepareScript = false;
  try {
    const packageJsonPath = path.join(directory, "package.json");
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, "utf8")
      );
      hasPrepareScript = !!packageJson.scripts?.prepare;
    }
  } catch (err) {
    console.warn(
      `${c.yellow("Warning:")} Failed to check prepare script: ${err.message}`
    );
  }

  // Add some common patterns to ignore
  const defaultIgnore = ["node_modules/**", ".git/**", ".vscode/**"];

  watchIgnore = [...watchIgnore, ...defaultIgnore];

  // Initialize the file MTimes map
  const initialFileList = await getFilesRecursively(
    directory,
    watchIgnore,
    watchInclude
  );
  for (const filePath of initialFileList) {
    try {
      const stats = await fs.stat(filePath);
      fileMTimes.set(filePath, stats.mtimeMs);
    } catch (err) {}
  }

  // Start the watch interval
  setInterval(async () => {
    // Skip if the last check was less than 1 second ago (debounce)
    if (Date.now() - lastCheckTime < 1000) {
      return;
    }

    const changes: string[] = [];
    const currentFileList = await getFilesRecursively(
      directory,
      watchIgnore,
      watchInclude
    );

    // Check for new or modified files
    for (const filePath of currentFileList) {
      try {
        const stats = await fs.stat(filePath);
        const oldMTime = fileMTimes.get(filePath) || 0;

        if (stats.mtimeMs > oldMTime) {
          changes.push(filePath);
          fileMTimes.set(filePath, stats.mtimeMs);
        }
      } catch (err) {
        // Ignore errors for missing files
      }
    }

    // Check for deleted files
    for (const [filePath] of fileMTimes) {
      if (!currentFileList.includes(filePath)) {
        changes.push(filePath);
        fileMTimes.delete(filePath);
      }
    }

    if (changes.length > 0) {
      lastCheckTime = Date.now();

      // Clear previous debounce timer if it exists
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Set a debounce timer to handle multiple rapid changes as a single event
      debounceTimer = setTimeout(() => {
        // Erase previous message if needed
        const timeSinceLastErase = Date.now() - lastConsoleErase;
        if (lastConsoleErase > 0 && timeSinceLastErase < 10000) {
          // Erase up to 3 lines using ANSI escape codes
          process.stdout.write("\x1B[2K\x1B[1A\x1B[2K\x1B[G");
        }
        lastConsoleErase = Date.now();

        const displayPath = path.relative(directory, changes[0]);
        console.log(
          `${c.blue("Watch:")} ${
            changes.length > 1
              ? `${changes.length} files changed`
              : `${displayPath} changed`
          }`
        );

        // Notify clients to reload
        notifyClients(clients, {
          reload: true,
          files: changes.map((file) => path.relative(directory, file)),
          timestamp: Date.now(),
        });
      }, 300); // 300ms debounce time
    }
  }, 1000); // Check every second
}
