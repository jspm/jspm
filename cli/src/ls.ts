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

import { relative } from 'node:path';
import { getPackageConfig, lookup } from '@jspm/generator';
import c from 'picocolors';
import {
  JspmError,
  getExportsEntries,
  getFilesRecursively,
  startSpinner,
  stopSpinner
} from './utils.ts';
import { withType } from './logger.ts';
import type { LsFlags } from './cli.ts';
import { initProject } from './init.ts';

/**
 * Lists the exports of the current project
 */
async function listCurrentProjectExports(flags: LsFlags) {
  try {
    // Initialize using the specified package directory or current directory
    const projectDir = flags.dir || process.cwd();
    const projectConfig = await initProject({
      quiet: flags.quiet,
      dir: projectDir
    });

    !flags.quiet &&
      startSpinner(`Scanning exports for current project: ${c.bold(projectConfig.name)}...`);

    if (!projectConfig.exports) {
      stopSpinner();
      !flags.quiet &&
        console.log(
          `\n${c.yellow('Warning:')} Project "${
            projectConfig.name
          }" has no exports defined in package.json.`
        );
      return;
    }

    // Get all files in the project to match against exports
    const files = await getFilesRecursively(
      projectConfig.projectPath,
      projectConfig.ignore,
      projectConfig.files
    );
    const fileList = files.map(file => relative(projectConfig.projectPath, file));

    // Get the exports entries
    const entries = await getExportsEntries(
      projectConfig.name,
      projectConfig.exports as any,
      fileList,
      []
    );

    stopSpinner();

    // Format and display project information
    console.log(
      `${c.bold('Package')}:\t${c.bold(projectConfig.name)}@${c.bold(
        projectConfig.version || 'local'
      )}`
    );

    if (!flags.quiet) {
      if (projectConfig.description) {
        console.log(`${c.bold('Description:')}\t${projectConfig.description}`);
      }

      if (projectConfig.license) {
        console.log(`${c.bold('License:')}\t${c.yellow(projectConfig.license)}`);
      }
    }

    // Print the exports
    !flags.quiet && console.log(`\n${c.bold(c.black(`Current Project Exports`))}`);

    // Get entries as an array for filtering
    const exportEntries = Object.entries(entries);

    let displayedEntries = 0;
    const limit = flags.limit ? parseInt(flags.limit.toString()) : 20;
    const filteredEntries = exportEntries.filter(
      ([subpath]) => !flags.filter || subpath.toLowerCase().includes(flags.filter.toLowerCase())
    );

    // Get the total count after filtering
    const totalFilteredCount = filteredEntries.length;

    for (const [subpath, filePaths] of filteredEntries) {
      // Exit if we've reached the display limit
      if (displayedEntries >= limit) {
        break;
      }

      const formattedSubpath = c.green(subpath);
      const formattedTarget = c.cyan(filePaths.join(', '));

      !flags.quiet && console.log(`${formattedSubpath} → ${formattedTarget}`);
      displayedEntries++;
    }

    // Show message about remaining entries
    if (displayedEntries > 0 && displayedEntries < totalFilteredCount) {
      const remainingCount = totalFilteredCount - displayedEntries;
      !flags.quiet &&
        console.log(
          `\n${c.yellow('...')}${c.bold(remainingCount)} more ${
            remainingCount === 1 ? 'item' : 'items'
          } (use ${c.cyan('--filter')} or ${c.cyan('--limit')} to extend listing)`
        );
    } else if (flags.filter && displayedEntries === 0) {
      !flags.quiet && console.log(`${c.yellow('No exports match the filter:')} ${flags.filter}`);
    } else if (displayedEntries === 0) {
      !flags.quiet &&
        console.log(
          `${c.yellow(
            'Note:'
          )} Project has exports defined but they may not match any files in the project or are not in the expected format.`
        );
    }

    // Add an extra newline at the end
    !flags.quiet && console.log('');
  } catch (error) {
    stopSpinner();
    if (error instanceof JspmError) {
      throw error;
    }
    throw new JspmError(`Failed to list project exports: ${error.message}`);
  }
}

export default async function ls(packageSpec: string, flags: LsFlags) {
  const log = withType('ls/ls');

  if (!packageSpec) {
    // When no package is specified, list the current project's exports
    return listCurrentProjectExports(flags);
  }

  log(`Listing package exports for: ${packageSpec}`);

  try {
    !flags.quiet && startSpinner(`Looking up package ${c.bold(packageSpec)}...`);

    // First, look up the package to get the exact resolved version
    const lookupOptions = flags.provider ? { provider: flags.provider } : {};
    const lookupResult = await lookup(packageSpec, lookupOptions);

    if (!lookupResult || !lookupResult.resolved) {
      stopSpinner();
      throw new JspmError(`Package "${packageSpec}" not found`);
    }

    const resolvedPackage = lookupResult.resolved;
    log(`Resolved package: ${JSON.stringify(resolvedPackage)}`);

    // Get package configuration using the resolved package info
    const pjson: any = await getPackageConfig(resolvedPackage, lookupOptions);
    stopSpinner();

    if (!pjson) {
      throw new JspmError(`Package "${packageSpec}" found but failed to fetch its configuration`);
    }

    // Format the resolved package for display
    console.log(
      `${c.bold('Package')}:\t${c.bold(resolvedPackage.name)}@${c.bold(resolvedPackage.version)}`
    );

    // Show package info
    if (!flags.quiet) {
      if (pjson.description) {
        console.log(`${c.bold('Description:')}\t${pjson.description}`);
      }

      // Handle author information (could be string or object)
      // if (pjson.author) {
      //   let authorInfo = '';
      //   if (typeof pjson.author === 'string') {
      //     authorInfo = pjson.author;
      //   } else if (pjson.author.name) {
      //     authorInfo = pjson.author.name;
      //     if (pjson.author.email) {
      //       authorInfo += ` <${pjson.author.email}>`;
      //     }
      //     if (pjson.author.url) {
      //       authorInfo += ` (${pjson.author.url})`;
      //     }
      //   }
      //   if (authorInfo) {
      //     console.log(`${c.bold("Author:")}\t\t${authorInfo}`);
      //   }
      // }

      // Show contributors if available
      // if (pjson.contributors && Array.isArray(pjson.contributors) && pjson.contributors.length > 0) {
      //   const contributorCount = pjson.contributors.length;
      //   console.log(`${c.bold("Contributors:")}\t${contributorCount} ${contributorCount === 1 ? 'person' : 'people'}`);
      // }

      if (pjson.license) {
        console.log(`${c.bold('License:')}\t${c.yellow(pjson.license)}`);
      }

      if (pjson.homepage) {
        console.log(`${c.bold('Homepage:')}\t${c.blue(pjson.homepage)}`);
      }

      // Display GitHub repo if available
      if (pjson.repository) {
        let repoUrl = '';
        if (typeof pjson.repository === 'string') {
          repoUrl = pjson.repository;
        } else if (pjson.repository.url) {
          repoUrl = pjson.repository.url;
        }

        // Format GitHub URLs nicely
        if (repoUrl) {
          repoUrl = repoUrl
            .replace(/^git\+|\.git$/g, '')
            .replace('git://', 'https://')
            .replace('git@github.com:', 'https://github.com/');
          console.log(`${c.bold('Repository:')}\t${c.blue(repoUrl)}`);
        }
      }
    }

    // Check if exports field exists
    if (!pjson.exports) {
      !flags.quiet &&
        console.log(
          `\n${c.yellow('Warning:')} Package "${resolvedPackage.name}@${
            resolvedPackage.version
          }" has no exports defined.`
        );
      return;
    }

    // Print the exports
    !flags.quiet && console.log(`\n${c.bold(c.black(`Package Exports`))}`);

    // Format and display each export, applying filter and limit if provided
    const exportEntries =
      typeof pjson.exports === 'string' ||
      (typeof pjson.exports === 'object' &&
        pjson.exports !== null &&
        Object.keys(pjson.exports).every(expt => !expt.startsWith('.')))
        ? ['.', pjson.exports as any]
        : Object.entries(pjson.exports);

    let displayedEntries = 0;
    const limit = flags.limit ? parseInt(flags.limit.toString()) : 20;
    const filteredEntries = exportEntries.filter(
      ([subpath]) =>
        (!flags.filter || subpath.toLowerCase().includes(flags.filter.toLowerCase())) &&
        !subpath.endsWith('!cjs')
    );

    // Get the total count after filtering
    const totalFilteredCount = filteredEntries.length;

    for (const [subpath, target] of filteredEntries) {
      // Exit if we've reached the display limit
      if (displayedEntries >= limit) {
        break;
      }

      const formattedSubpath = c.green(subpath);
      const formattedTarget = c.cyan(JSON.stringify(target, null, 2));

      !flags.quiet && console.log(`${formattedSubpath} → ${formattedTarget}`);
      displayedEntries++;
    }

    // Show message about remaining entries
    if (displayedEntries > 0 && displayedEntries < totalFilteredCount) {
      const remainingCount = totalFilteredCount - displayedEntries;
      !flags.quiet &&
        console.log(
          `\n${c.yellow('...')}${c.bold(remainingCount)} more ${
            remainingCount === 1 ? 'item' : 'items'
          } (use ${c.cyan('--filter')} or ${c.cyan('--limit')} to extend listing)`
        );
    } else if (flags.filter && displayedEntries === 0) {
      !flags.quiet && console.log(`${c.yellow('No exports match the filter:')} ${flags.filter}`);
    } else if (displayedEntries === 0) {
      !flags.quiet &&
        console.log(
          `${c.yellow(
            'Note:'
          )} Package has exports defined but they are not in the expected format.`
        );
    }

    // Add an extra newline at the end
    !flags.quiet && console.log('');
  } catch (error) {
    stopSpinner();
    if (error instanceof JspmError) {
      throw error;
    }
    throw new JspmError(`Failed to list package exports: ${error.message}`);
  }
}
