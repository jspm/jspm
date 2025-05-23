/**
 * Copyright 2022-2025 Guy Bedford
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import c from 'picocolors';
import open from 'open';
import {
  JspmError,
  cliHtmlHighlight,
  copyToClipboard,
  exists,
  getDisabledWarnings,
  getEnv,
  getFilesRecursively,
  getGenerator,
  runPackageScript,
  startSpinner,
  stopSpinner,
  writeOutput
} from './utils.ts';
import type { EjectFlags, PublishFlags } from './cli.ts';
import { withType } from './logger.ts';
import { loadConfig } from './config.ts';

function showShortcuts(directory?: string) {
  console.log(`${c.magenta(c.bold('\nKeyboard shortcuts:'))}
 → ${c.bold(c.bgBlueBright(c.whiteBright(' o ')))} ${c.dim('Open package URL in the browser')}
 → ${c.bold(c.bgBlueBright(c.whiteBright(' l ')))} ${c.dim(
    'Open package listing page in the browser'
  )}
 → ${c.bold(c.bgBlueBright(c.whiteBright(' c ')))} ${c.dim(
    'Copy HTML usage script code snippet to clipboard'
  )}
 → ${c.bold(c.bgBlueBright(c.whiteBright(' p ')))} ${c.dim(
    'Open self-contained preview URL in the browser'
  )}
 → ${c.bold(c.bgBlueBright(c.whiteBright(' r ')))} ${c.dim('Force republish')}
 → ${c.bold(c.bgBlueBright(c.whiteBright(' q ')))} ${c.dim('Stop (or Ctrl+C)')}`);

  console.log(`${c.blue('Info:')} Watching for changes in ${c.cyan(directory)}...`);

  process.stdin.setRawMode?.(true);
  process.stdin.resume();
}

function hideShortcuts() {
  process.stdin.setRawMode?.(false);
  console.log(`${'\x1b[1A\x1b[2K'.repeat(8)}\x1b[1A\x1b[2K\x1b[1A`);
}

async function readJsonFile(filePath: string, defaultValue: any = {}) {
  try {
    if (exists(filePath)) {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    throw new JspmError(`Unable to read package.json file ${filePath} - ${err.message}`);
  }
  return defaultValue;
}

export async function eject(flags: EjectFlags) {
  const log = withType('publish/eject');

  const pkg = flags.eject;

  if (!pkg.startsWith('app:')) {
    throw new JspmError(`Only the app: JSPM registry is currently supported for ejection.`);
  }

  const config = await loadConfig();
  log(
    `Loaded config with ${
      config.providers ? Object.keys(config.providers).length : 0
    } provider configurations`
  );

  const provider = flags.provider || config.defaultPublishProvider || 'jspm.io';

  const generator = await getGenerator(flags);

  let name = pkg.slice(4);
  if (name[0] !== '@') name = name.split('/')[0];
  else name = name.split('/').slice(0, 2).join('/');
  if (name.includes('@')) name = name.slice(0, name.indexOf('@'));

  const version = pkg.slice(4 + name.length + 1);

  startSpinner(`Ejecting ${c.bold(pkg)}...`);
  // --dir already set the baseUrl in the generator
  await generator.eject({ name, version, provider }, '.');
  stopSpinner();

  startSpinner(`Merging published import map for ${c.bold(pkg)}...`);
  const env = await getEnv(flags);
  await writeOutput(generator, null, env, flags, flags.quiet);
  stopSpinner();

  console.log(`${c.green('Ok:')} Package ${c.green(pkg)} ejected into ${c.bold(flags.dir)}`);
}

export async function publish(flags: PublishFlags = {}) {
  const log = withType('publish/publish');

  // Use initProject to get validated project configuration
  const { initProject } = await import('./init.ts');

  try {
    // Initialize project configuration with the specified directory
    const projectConfig = await initProject({
      quiet: flags.quiet
    });
    log(`Project initialized: ${projectConfig.name}`);

    if (projectConfig.private) {
      throw new JspmError(`Unable to publish. Package has "private": true in the package.json.`);
    }

    // Get include from jspm.json, ignore from either source
    const ignore = projectConfig.ignore || [];
    const include = projectConfig.files || [];

    // Get package.json for prepare script
    const packageJsonPath = path.join(projectConfig.projectPath, 'package.json');
    const packageJson = await readJsonFile(packageJsonPath);
    const prepareScript = packageJson.scripts?.prepare;

    // Use flags for name/version if provided, otherwise use from project config
    const name = flags.name || projectConfig.name;
    const version = flags.version || projectConfig.version;

    if (!version) {
      throw new JspmError(
        'No version specified. Please provide a version in package.json or use the --version flag.'
      );
    }

    const semverVersion = version.match(/^\d+\.\d+\.\d+(\-[a-zA-Z0-9_\-\.]+)?$/);

    if (flags.watch) {
      if (semverVersion || !version.match(/^[a-zA-Z0-9_\-]+$/)) {
        throw new JspmError(
          `Invalid version "${version}" for publish --watch. Watched publishes must be to mutable versions, which are alphanumeric only with - or _ separators.`
        );
      }
      return startWatchMode(
        name,
        version,
        projectConfig.projectPath,
        ignore,
        include,
        flags,
        prepareScript
      );
    }

    return publishOnce(
      name,
      version,
      projectConfig.projectPath,
      flags,
      flags.usage ?? true,
      prepareScript
    );
  } catch (error) {
    if (error instanceof JspmError) {
      throw error;
    }
    throw new JspmError(`Failed to initialize project: ${error.message}`);
  }
}

async function publishOnce(
  name: string,
  version: string,
  directory: string,
  flags: PublishFlags,
  logSnippet: boolean,
  prepareScript: string
) {
  const log = withType('publish');

  const config = await loadConfig();
  log(
    `Loaded config with ${
      config.providers ? Object.keys(config.providers).length : 0
    } provider configurations`
  );

  const publishProvider = flags.provider || config.defaultPublishProvider;

  if (!publishProvider) {
    throw new JspmError(
      `No publish provider specified. Please provide a provider with the --provider flag (e.g., jspm publish -p jspm.io) or set a default provider in your config.`
    );
  }

  if (prepareScript) {
    console.log(`${c.blue('Info:')} Running ${c.bold('prepare')} script...`);
    await runPackageScript(prepareScript, directory);
    console.log(`${c.blue('Info:')} ${c.bold('prepare')} script completed`);
  }

  startSpinner(`Publishing ${c.bold(`${name}@${version}`)} to ${publishProvider}...`);

  const generator = await getGenerator(flags, {
    mapUrl: pathToFileURL(`${directory}/`)
  });

  try {
    const { packageUrl, mapUrl, codeSnippet } = await generator.publish({
      package: pathToFileURL(directory).href,
      name,
      version,
      provider: publishProvider,
      importMap: true,
      install: true
    });

    stopSpinner();

    console.log(
      `${c.green('Ok:')} Package published to ${c.green(packageUrl)} with import map ${c.green(
        mapUrl
      )}`
    );

    if (codeSnippet && logSnippet) {
      console.log(
        `\n${c.magentaBright(c.bold('HTML Usage:'))}\n\n${c.greenBright(
          cliHtmlHighlight(codeSnippet)
        )}`
      );
    }

    return { packageUrl, mapUrl, codeSnippet };
  } catch (error) {
    stopSpinner();
    throw new JspmError(`Failed to publish: ${error.message}`);
  }
}

async function startWatchMode(
  name: string,
  version: string,
  directory: string,
  ignore: string[],
  include: string[],
  flags: PublishFlags,
  prepareScript: string
) {
  let lastPublishTime = 0;
  const fileMTimes = new Map<string, number>();

  let packageUrl, codeSnippet;
  let forcedRepublish = false;
  let lastRunWasError = false;
  let waiting = false;

  await watchLoop(true);

  const initialFileList = await getFilesRecursively(
    directory,
    ignore,
    include,
    getDisabledWarnings(flags)
  );
  for (const filePath of initialFileList) {
    try {
      const stats = await fs.stat(filePath);
      fileMTimes.set(filePath, stats.mtimeMs);
    } catch (err) {}
  }

  const intervalId = setInterval(watchLoop, 1000);

  function stopWatch() {
    clearInterval(intervalId);
    stopSpinner();
    if (waiting && !lastRunWasError) {
      hideShortcuts();
    }
    console.log(`\n${c.blue('Info:')} Watch mode stopped`);
    process.exit(0);
  }

  process.on('SIGINT', stopWatch);

  process.stdin.on('data', key => {
    switch (String(key)) {
      case '\u0003':
      case 'q':
        stopWatch();
        break;
      case 'o':
        if (packageUrl) open(packageUrl.endsWith('/') ? packageUrl.slice(0, -1) : packageUrl);
        break;
      case 'l':
        if (packageUrl) open(packageUrl.endsWith('/') ? packageUrl : `${packageUrl}/`);
        break;
      case 'r':
        forcedRepublish = true;
        break;
      case 'c':
        if (codeSnippet) copyToClipboard(codeSnippet);
        break;
      case 'p':
        if (codeSnippet)
          open(
            `data:text/html;base64,${Buffer.from(
              `<!doctype html>\n<body></body>\n${codeSnippet
                .split('\n')
                .filter(l => !l.startsWith('<!--') || !l.endsWith('-->'))
                .join('\n')
                .replace('.js', '.hot.js')}`
            ).toString('base64')}`,
            { app: { name: 'chrome' } }
          );
    }
  });

  async function watchLoop(firstRun) {
    try {
      // Skip if last publish was less than 2 seconds ago (debounce)
      if (Date.now() - lastPublishTime < 2000) {
        return;
      }

      const changes: string[] = [];
      const currentFileList = await getFilesRecursively(
        directory,
        ignore,
        include,
        getDisabledWarnings(flags)
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

      if (changes.length || forcedRepublish) {
        waiting = false;
        if (!firstRun) {
          if (lastRunWasError) stopSpinner();
          else hideShortcuts();
          console.log(
            `${c.blue('Info:')} ${
              forcedRepublish
                ? 'Requesting republish'
                : changes.length > 1
                ? 'Multiple changes detected'
                : `${path.relative(directory, changes[0]).replace(/\\/g, '/')} changed`
            }, republishing...`
          );
        }
        forcedRepublish = false;
        ({ packageUrl, codeSnippet } = await publishOnce(
          name,
          version,
          directory,
          flags,
          (flags.usage ?? true) && firstRun,
          prepareScript
        ));

        lastPublishTime = Date.now();
        showShortcuts(directory);
        lastRunWasError = false;
        waiting = true;
      }
    } catch (error) {
      lastRunWasError = true;
      console.error(`${c.red('Error:')} Watch mode error`);
      console.error(error);
      startSpinner('Waiting for update to fix the error...');
      waiting = true;
    }
  }
}
