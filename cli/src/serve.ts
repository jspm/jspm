import { fileURLToPath, pathToFileURL } from 'node:url';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { type ServerResponse, createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import c from 'picocolors';
import mime from 'mime';
import { analyzeHtml } from '@jspm/generator';
import { transformSync } from 'amaro';
import {
  JspmError,
  getDisabledWarnings,
  getEnv,
  getExportsEntries,
  getFilesRecursively,
  getOutputPath,
  isURL,
  readInputMap,
  stopSpinner
} from './utils.ts';
import { type ProjectConfig, initProject } from './init.ts';
import type { ServeFlags } from './cli.ts';
import install from './install.ts';
import type { IImportMap } from './types.ts';
import renderDirectoryListing from './views/directory-listing.ts';
import notFoundPage from './views/not-found.ts';
import createHotMap from './views/hot-map.ts';
import {
  esmsCodeSnippet,
  getFileMtimes,
  hideShortcuts,
  lintMessage,
  showShortcuts
} from './serve-utils.ts';

export default async function serve(flags: ServeFlags = {}) {
  const port = flags.port || 5776;

  let mapDeps: string[];

  // SSE clients for live reloading
  const clients: Set<ServerResponse> = new Set();

  const projectConfig = await initProject(flags);
  const resolvedDir = projectConfig.projectPath;

  process.chdir(resolvedDir);

  const { files: watchInclude, ignore, name } = projectConfig;
  const env = await getEnv(flags);
  const outputMapPath = getOutputPath(flags);
  const defaultIgnore = ['node_modules/**', '.git/**', '.vscode/**'];
  const watchIgnore = [
    relative(resolvedDir, outputMapPath).replace(/\\/g, '/'),
    ...(ignore || []),
    ...defaultIgnore
  ];

  const fileMTimes = await getFileMtimes(resolvedDir, watchInclude, watchIgnore);

  const serverUrl = `http://localhost:${port}/${name}`;

  const server = createServer(async (req, res) => {
    try {
      const reqUrl = new URL(req.url || '/', `http://${req.headers.host}`);
      let reqPath = decodeURIComponent(reqUrl.pathname);

      // Serve the JSPM logo
      if (reqPath === '/jspm.png') {
        try {
          res.writeHead(200, { 'Content-Type': 'image/png' });
          res.end(await readFile(resolve(fileURLToPath(import.meta.url), '../../assets/jspm.png')));
          return;
        } catch (err) {
          console.error(`Error serving logo: ${err.message}`);
        }
      }

      // Handle Server-Sent Events endpoint for watch mode
      if (
        flags.watch &&
        (reqPath === '/_events' || (reqPath === '/' && reqUrl.pathname.endsWith('_events')))
      ) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        });
        res.write('event: connected\ndata: {}\n\n');
        clients.add(res as ServerResponse);
        req.on('close', () => {
          clients.delete(res as ServerResponse);
        });
        return;
      }

      // Redirect the root into the app dir
      if (reqPath === '/') {
        res.writeHead(302, { Location: `${`/${name}`}/` });
        res.end();
        return;
      }

      if (
        !reqPath.startsWith(`/${name}`) ||
        (reqPath.length !== name.length + 1 && reqPath[name.length + 1] !== '/')
      ) {
        res.writeHead(404);
        res.end(notFoundPage);
        return;
      }

      reqPath = reqPath.substring(`/${name}`.length) || '';

      // Rlve to the actual file system path
      let filePath = join(resolvedDir, reqPath);
      const tsOriginal = filePath.endsWith('.ts.original') || filePath.endsWith('.mts.original');
      if (tsOriginal) filePath = filePath.slice(0, -9);
      const relativePath = relative(resolvedDir, filePath).replace(/\\/g, '/');

      // Basic security check to prevent directory traversal
      if (!filePath.startsWith(resolvedDir)) {
        res.writeHead(403);
        res.end('403 Forbidden');
        return;
      }

      try {
        const stats = await stat(filePath);
        if (stats.isDirectory()) {
          if (!reqPath.endsWith('/')) {
            // Try to see if index.html exists in the directory
            const indexPath = join(filePath, 'index.html');
            try {
              await stat(indexPath);
              // If index.html exists, redirect to it directly
              res.writeHead(302, { Location: `/${name}${reqPath}/index.html` });
              res.end();
              return;
            } catch (err) {
              // If index.html doesn't exist, redirect to the directory with trailing slash
              res.writeHead(301, { Location: `/${name}${reqPath}/` });
              res.end();
              return;
            }
          }
          // Only show directory listing for URLs with trailing slash
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(await renderDirectoryListing(filePath, reqPath, `/${name}`));
        } else if (flags.watch && filePath.endsWith('.js') && filePath === outputMapPath) {
          // When watching, we intercept the import map with the hot reloading import map
          const map = readInputMap(outputMapPath);
          res.writeHead(200, { 'Content-Type': 'text/javascript' });
          res.end(createHotMap(map));
        } else if (tsOriginal) {
          // Serve the original TypeScript file without transformation
          const content = await readFile(filePath, 'utf8');
          res.writeHead(200, { 'Content-Type': 'application/typescript' });
          res.end(content);
        } else if (filePath.endsWith('.jsx') || filePath.endsWith('.tsx')) {
          lintMessage({
            file: relativePath,
            name: `JSX is not supported in ${c.bold('jspm serve')}`,
            description: `Consider one of the following alternatives:
  1. Run an initial preprocessor step separately compiling e.g. ${c.bold(
    'src/**/*.jsx'
  )} into ${c.bold('lib/**/*.js')}.
  2. Use a JSX-like templating library like htm (${c.cyan('https://www.npmjs.com/package/htm')}).
  3. Consider alternative React-based workflow tooling for JSX application workflows.`
          });

          // Serve the JSX file as plain text
          const content = await readFile(filePath, 'utf8');
          const contentType = filePath.endsWith('.jsx')
            ? 'text/javascript'
            : 'application/typescript';
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content);
        } else if (flags.typeStripping && (filePath.endsWith('.ts') || filePath.endsWith('.mts'))) {
          // Transform TypeScript to JavaScript by stripping types
          const tsContent = await readFile(filePath, 'utf8');
          try {
            // Use Node.js built-in TypeScript type stripping
            const strippedCode = transformSync(tsContent, {
              transform: { mode: 'strip-only', noEmptyExport: true }
            }).code;
            // Add sourceURL comment to preserve original filename in devtools
            const jsCode = `${strippedCode}\n//# sourceURL=${basename(filePath)}.original`;
            res.writeHead(200, { 'Content-Type': 'text/javascript' });
            res.end(jsCode);
          } catch (error) {
            hideShortcuts();
            console.error(
              `${c.red(`TypeScript ${error.code || 'Error'}`)}: ${error.message}
${c.bold(
  `${relative(resolvedDir, filePath).replace(/\\/g, '/')}:[${error.startLine || ''}:${
    error.startColumn || ''
  }]`
)}
${error.snippet}`
            );
            res.writeHead(500);
            res.end(
              `throw new Error(\`JSPM Server: Error transforming TypeScript file: ${error.message}\`);`
            );
            showShortcuts(serverUrl, flags.watch);
          }
        } else if (filePath.endsWith('.html')) {
          // Read HTML file
          let content = await readFile(filePath, 'utf8');
          const analyzed = analyzeHtml(content, pathToFileURL(filePath));

          const relativePath = relative(resolvedDir, filePath).replace(/\\/g, '/');

          const relPathForMap = relative(dirname(filePath), resolvedDir).replace(/\\/g, '/');
          const relMapPath = `${relPathForMap ? `${relPathForMap}/` : ''}importmap.js`;

          const hasImportMap = analyzed.scripts.some(
            script => script.attrs.src.value === relMapPath
          );
          const hasInlineImportMap = !analyzed.map.newScript;

          const hasModules =
            analyzed.modules.length ||
            analyzed.inlineModules.length ||
            analyzed.staticImports.size ||
            analyzed.dynamicImports.size;
          const missingEsms = !analyzed.esModuleShims;
          const missingMap = !hasImportMap;
          if (hasInlineImportMap) {
            lintMessage({
              file: relativePath,
              name: `Inline import map not tracked by this serve instance`,
              description: `The HTML file has an inline import map, but that is not being watched by this server. Use ${c.bold(
                `jspm serve -m ${relativePath}`
              )} to run a server tracking the install of the inline import map in this HTML file.`
            });
          }
          if (hasModules && (missingEsms || missingMap)) {
            lintMessage({
              file: relativePath,
              name: `Missing the ${missingMap ? 'import map script ' : ''}${
                missingMap && missingEsms ? 'and the ' : ''
              }${missingEsms ? 'ES Module Shims polyfill' : ''}`,
              description: `This application will not support hot reloading${
                missingEsms
                  ? missingMap
                    ? ''
                    : ' or work in Chrome 132, Safari 18.3 or Firefox'
                  : ''
              }.`,
              code: {
                title: `Add the following HTML snippet to ${c.bold(relativePath)}:`,
                snippet: await esmsCodeSnippet(relMapPath)
              }
            });
          }

          // Rewrite module scripts to use module-shim type when watch mode is enabled
          if (flags.watch && (analyzed.modules.length > 0 || analyzed.inlineModules.length > 0)) {
            let offset = 0;
            for (const module of analyzed.modules) {
              if (module.attrs.type?.value === 'module') {
                let { start, end, quote } = module.attrs.type!;
                if (quote) end++;
                content = `${content.slice(0, start + offset)}type="module-shim"${content.slice(
                  end + offset
                )}`;
                offset += 18 - (end - start);
              }
            }

            // Then process inline module scripts
            for (const inlineModule of analyzed.inlineModules) {
              if (inlineModule.attrs.type?.value === 'module') {
                let { start, end, quote } = inlineModule.attrs.type!;
                if (quote) end++;
                content = `${content.slice(0, start + offset)}type="module-shim"${content.slice(
                  end + offset
                )}`;
                offset += 18 - (end - start);
              }
            }
          }

          let printedAvailableExports = false;
          const entries = getExportsEntries(
            projectConfig.name,
            projectConfig.exports,
            [...fileMTimes.keys()].map(key => relative(resolvedDir, key).replace(/\\/g, '/')),
            env
          );
          for (const module of [
            ...new Set([...analyzed.staticImports, ...analyzed.dynamicImports])
          ]) {
            if (
              module.startsWith('./') ||
              module.startsWith('../') ||
              module.startsWith('/') ||
              isURL(module)
            ) {
              // Validate local URL specifiers are in our known graph
              const resolved = new URL(module, analyzed.base).href;
              if (resolved.startsWith('file:')) {
                const modulePath = fileURLToPath(resolved);
                const inMap = mapDeps?.includes(modulePath);
                const relModule = relative(resolvedDir, modulePath).replace(/\\/g, '/');
                if (mapDeps && !inMap) {
                  lintMessage({
                    file: relativePath,
                    name: `Module ${c.bold(
                      c.cyan(relModule)
                    )} is not part of the JSPM project import map graph so may not load correctly`,
                    description: `To fix, add it as an entry point export in the ${c.bold(
                      'package.json'
                    )}.`,
                    code: {
                      title: 'package.json:',
                      snippet: exportsCodeSnippetForEntry(relModule, projectConfig.exports)
                    }
                  });
                }
              }
            } else {
              // Validate only top-level bare specifiers permitted must start with project name
              if (module !== projectConfig.name && !module.startsWith(`${projectConfig.name}/`)) {
                lintMessage({
                  file: relativePath,
                  name: `Bare module specifier import ${c.bold(
                    c.cyan(`'${module}'`)
                  )} is not mapped by the import map`,
                  description: `Only bare specifiers matching the project name ${c.cyan(
                    c.bold(`'${projectConfig.name}'`)
                  )} are mapped.`,
                  code: {
                    title: 'package.json:',
                    snippet: `<script type="module">import '${projectConfig.name}';</script>`
                  }
                });
              }
              // If we have no exports defined
              else if (Object.entries(entries).length === 0) {
                lintMessage({
                  file: relativePath,
                  name: `Bare module specifier import ${c.bold(
                    c.cyan(`'${module}'`)
                  )} is not mapped by the import map`,
                  description: `The project package.json file doesn't define any entry points in its "exports" field. Try adding one.`,
                  code: {
                    title: `To map import ${c.cyan(`'${projectConfig.name}'`)} in package.json:`,
                    snippet: `
  "exports": {
    ".": "./entrypoint.js"
  }
`
                  }
                });
              }
              // Validate bare specifiers are mappable
              else if (!Object.entries(entries).some(mod => mod[0] === module)) {
                lintMessage({
                  file: relativePath,
                  name: `Bare module specifier import ${c.bold(
                    c.cyan(`'${module}'`)
                  )} is not mapped by the import map`,
                  description: `To fix, either add it as an entry point exportor make sure to only import one of the defined entry points from the package.json.`,
                  code: printedAvailableExports
                    ? undefined
                    : Object.entries(entries).length > 0
                    ? {
                        title: 'Available package.json entry points:',
                        snippet: Object.entries(entries)
                          .map(
                            ([impt, modules]) =>
                              `${c.green(impt)} → ${modules.map(m => c.cyan(m)).join(', ')}`
                          )
                          .join('\n')
                      }
                    : {
                        title: 'package.json:',
                        snippet: exportsCodeSnippetForEntry('entrypoint.js')
                      }
                });
                printedAvailableExports = true;
              }
            }
          }

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content);
        } else {
          const content = await readFile(filePath);
          const contentType = mime.getType(filePath) || 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content);
        }
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          // Serve custom 404 page
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end(notFoundPage);
        } else {
          console.error(err);
          res.writeHead(500);
          res.end('500 Internal Server Error');
        }
      }
    } catch (err) {
      console.error(err);
      res.writeHead(500);
      res.end('500 Internal Server Error');
    }
  });

  server.listen(port, async () => {
    console.log('');
    console.log(`${c.blue('App name:\t')} ${c.dim(name)}`);
    console.log(`${c.blue('Server URL:\t')} ${c.bold(serverUrl)}`);
    console.log(`${c.blue('Serving Path:\t')} ${c.dim(resolvedDir)}`);
    if (flags.watch) {
      console.log(
        `${c.blue('Watcher:\t')} ${c.dim(
          `Enabled (pass --no-watch to disable)${
            flags.install
              ? ', reinstalling importmap.js on changes with hot reloading'
              : ' for hot reloading only'
          }`
        )}`
      );
    } else {
      console.log(`${c.blue('Watcher:\t')} ${c.dim('Disabled')}`);
    }
    if (flags.typeStripping) {
      console.log(
        `${c.blue('Middleware:\t')} ${c.dim(
          `TypeScript type stripping${
            flags.watch ? ', hot reloading via importmap.js injection' : ', importmap.js unmodified'
          }`
        )}`
      );
    } else {
      console.log(
        `${c.blue('Middleware:\t')} ${c.dim(
          `Type stripping disabled${
            flags.watch
              ? ', hot reloading via importmap.js injection'
              : ' - the server is performing no content modifications'
          }`
        )}`
      );
    }

    // Build import map using the JSPM generator
    flags.installMode = 'freeze';
    async function generateMap(): Promise<{
      deps: string[];
      map: IImportMap;
    } | null> {
      console.log('');
      let result;
      try {
        result = await install(flags);
        console.log('');
      } catch (e) {
        stopSpinner();
        console.error(`${c.red('Install Error:')} `, e instanceof JspmError ? e.message : e);
        return null;
      }
      if (!result) return null;
      const mapDeps = new Set<string>();
      const { staticDeps, dynamicDeps } = result;
      staticDeps.forEach(dep => {
        if (dep.startsWith('file:')) mapDeps.add(dep);
      });
      dynamicDeps.forEach(dep => {
        if (dep.startsWith('file:')) mapDeps.add(dep);
      });
      return {
        deps: [...mapDeps].map(fileUrl => fileURLToPath(fileUrl)),
        map: result.map
      };
    }
    let map: IImportMap | undefined;
    if (flags.install) {
      const { deps, map: map_ } = (await generateMap()) || {};
      if (deps) {
        mapDeps = deps;
        map = map_;
      }
    }

    if (flags.watch) {
      let processing = false;
      let mapError = false;
      let lastMap = JSON.stringify(map);

      // Start the watch interval
      setInterval(async () => {
        // skip if still processing an existing change
        if (processing) return;

        const changes: string[] = [];
        const currentFileList = await getFilesRecursively(
          resolvedDir,
          watchIgnore,
          watchInclude,
          getDisabledWarnings(flags)
        );

        // Check for new or modified files
        for (const filePath of currentFileList) {
          try {
            const stats = await stat(filePath);
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
          processing = true;
          hideShortcuts();
          const displayPath = relative(resolvedDir, changes[0]).replace(/\\/g, '/');
          console.log(
            `${c.blue('Watch:')} ${
              changes.length > 1 ? `${changes.length} files changed` : `${displayPath} changed`
            }`
          );

          // only regenerate maps for the files that affect them
          // -> JS and package.json (no lookups as this is not commonjs!)
          let newMap: IImportMap | undefined;
          if (
            generateMap &&
            (mapError ||
              changes.some(
                change =>
                  (mapDeps?.includes(change) &&
                    (change.endsWith('.js') ||
                      change.endsWith('.mjs') ||
                      change.endsWith('.ts') ||
                      change.endsWith('.mts'))) ||
                  basename(change) === 'package.json'
              ))
          ) {
            const { deps, map } = (await generateMap()) || {};
            if (deps) {
              mapDeps = deps;
              mapError = false;
              const stringified = JSON.stringify(map);
              if (stringified !== lastMap) {
                newMap = map;
                lastMap = stringified;
              }
            } else {
              mapError = true;
            }
          }
          notifyClients(clients, {
            files: changes.map(file => relative(resolvedDir, file).replace(/\\/g, '/')),
            newMap
          });

          showShortcuts(serverUrl, true);

          processing = false;
        }
      }, 500); // Check every 500 ms
    }

    console.log(`${c.magenta(c.bold('Keyboard shortcuts:'))}
 → ${c.bold(c.bgBlueBright(c.whiteBright(' o ')))} ${c.dim('Open server URL in the browser')}`);
    console.log(
      ` → ${c.bold(c.bgBlueBright(c.whiteBright(' q ')))} ${c.dim('Stop server (or Ctrl+C)')}`
    );
    console.log('');
    showShortcuts(serverUrl, flags.watch);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      throw new JspmError(
        `Port ${port} is already in use. Try a different port with --port option.`
      );
    } else {
      throw err;
    }
  });

  // Add proper cleanup for termination signals
  const cleanExit = () => {
    hideShortcuts();
    console.log(`\n${c.blue('Info:')} Server stopped`);
    process.exit(0);
  };

  // Handle various termination signals
  process.on('SIGINT', cleanExit);
  process.on('SIGTERM', cleanExit);
  process.on('SIGUSR2', cleanExit); // This is used by nodemon for restart

  // Keep the process running
  return new Promise<void>(() => {});
}

// Notify all connected SSE clients of an event
function notifyClients(clients: Set<ServerResponse>, data: any) {
  const event = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => {
    try {
      client.write(event);
    } catch (err) {
      // Client might have disconnected
    }
  });
}

function exportsCodeSnippetForEntry(entry: string, exports?: ProjectConfig['exports']): string {
  return `  "exports": {
    ".": "./${entry}"${exports ? `,\n  …\n` : ''}
  }`;
}
