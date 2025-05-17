import { relative, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { rollup } from 'rollup';
import jspmRollup from '@jspm/plugin-rollup';
import { createFilter } from '@rollup/pluginutils';
import c from 'picocolors';
import fs from 'node:fs/promises';
import mkdirp from 'mkdirp';
import path from 'node:path';

import {
  JspmError,
  getEnv,
  getExportsEntries,
  getFilesRecursively,
  getGenerator,
  getInputMap,
  startSpinner,
  stopSpinner
} from './utils.ts';
import type { BuildFlags } from './cli.ts';
import { initProject } from './init.ts';

// CSS Import Plugin implementation
function createCssPlugin(options: any = {}) {
  if (!options.transform) options.transform = (code: string) => code;

  const styles: Record<string, string> = {};
  const alwaysOutput = options.alwaysOutput ?? false;
  const filter = createFilter(options.include ?? ['**/*.css'], options.exclude ?? []);

  /* function to sort the css imports in order - credit to rollup-plugin-postcss */
  const getRecursiveImportOrder = (id: string, getModuleInfo: Function, seen = new Set()) => {
    if (seen.has(id)) return [];

    seen.add(id);

    const result = [id];
    const moduleInfo = getModuleInfo(id);

    if (moduleInfo) {
      getModuleInfo(id).importedIds.forEach((importFile: string) => {
        result.push(...getRecursiveImportOrder(importFile, getModuleInfo, seen));
      });
    }

    return result;
  };

  /* minify css */
  const minifyCSS = (content: string) => {
    const calc_functions: string[] = [];
    const calc_regex = /\bcalc\(([^)]+)\)/g;
    const comments = /("(?:[^"\\]+|\\.)*"|'(?:[^'\\]+|\\.)*')|\/\*[\s\S]*?\*\//g;
    const syntax =
      /("(?:[^"\\]+|\\.)*"|'(?:[^'\\]+|\\.)*')|\s*([{};,>~])\s*|\s*([*$~^|]?=)\s*|\s+([+-])(?=.*\{)|([[(:])\s+|\s+([\])])|\s+(:)(?![^}]*\{)|^\s+|\s+$|(\s)\s+(?![^(]*\))/g;

    return content
      .replace(calc_regex, (_, group) => {
        calc_functions.push(group);
        return '__CALC__';
      })
      .replace(comments, '$1')
      .replace(syntax, '$1$2$3$4$5$6$7$8')
      .replace(/__CALC__/g, () => `calc(${calc_functions.shift()})`)
      .replace(/\n+/g, ' ');
  };

  return {
    name: 'import-css',

    /* convert the css file to a module and save the code for a file output */
    async transform(code: string, id: string) {
      if (!filter(id)) return;

      const transformedCode = options.minify
        ? minifyCSS(await options.transform(code))
        : await options.transform(code);

      /* cache the result */
      if (!styles[id] || styles[id] != transformedCode) {
        styles[id] = transformedCode;
      }

      /* Only support imports with assert { type: 'css' } / with type: 'css' */
      const moduleInfo = this.getModuleInfo(id);
      const attributes =
        moduleInfo.assertions != undefined ? moduleInfo.assertions : moduleInfo.attributes;
      
      if (attributes?.type == 'css') {
        return {
          code: `const sheet = new CSSStyleSheet();sheet.replaceSync(${JSON.stringify(
            transformedCode
          )});export default sheet;`,
          map: { mappings: '' }
        };
      }

      // For any other CSS imports, warn and skip
      this.warn(`CSS file "${id}" imported without 'with { type: "css" }' assertion. Only CSSStyleSheet imports are supported.`);
      
      return {
        code: `console.warn("CSS file was imported without 'with { type: \\"css\\" }' assertion.");
        export default {};`,
        map: { mappings: '' }
      };
    },

    /* We don't need to generate any separate CSS files anymore, as all CSS is now directly
       embedded in the CSSStyleSheet objects. This method is kept for compatibility with potential future updates. */
    generateBundle() {
      // Empty implementation - all CSS is now embedded in JavaScript modules
    }
  };
}

export default async function build(flags: BuildFlags) {
  // Try to validate the project configuration
  const projectConfig = await initProject(flags);
  const env = await getEnv(flags);

  // Get entrypoints from package.json
  const currentFileList = (
    await getFilesRecursively(projectConfig.projectPath, projectConfig.ignore, projectConfig.files)
  ).map(key => relative(projectConfig.projectPath, key).replace(/\\/g, '/'));
  const entries = getExportsEntries(
    projectConfig.name,
    projectConfig.exports,
    currentFileList,
    env
  );

  if (!Object.keys(entries).length) {
    throw new JspmError(
      'No entry points found in package.json to build. Make sure to set the "exports" field to provide a valid module file.'
    );
  }

  const input: Record<string, string> = {};
  for (const [, files] of Object.entries(entries)) {
    for (const file of files) {
      input[relative(projectConfig.projectPath, file).replace(/\\/g, '/')] =
        pathToFileURL(file).href;
    }
  }

  const generator = await getGenerator(flags);

  try {
    if (!flags.quiet) startSpinner(`Building package ${c.cyan(projectConfig.name)}...`);

    // @ts-ignore
    const externalPackages = Object.keys(projectConfig.dependencies || {});
    const bundle = await rollup({
      external: mod => {
        return externalPackages.some(
          pkg => mod.startsWith(pkg) && (pkg.length === mod.length || mod[pkg.length] === '/')
        );
      },
      input,
      plugins: [
        jspmRollup({
          // @ts-ignore
          generator,
          baseUrl: pathToFileURL(projectConfig.projectPath).href,
          env
        }) as any,
        createCssPlugin({
          minify: true,
          // Only support CSSStyleSheet imports:
          // import styles from './styles.css' with { type: 'css' }
        })
      ]
    });

    const { output } = await bundle.generate({
      format: 'esm',
      assetFileNames: '[name]',
      entryFileNames: '[name]',
      chunkFileNames: '[name]',
      sourcemap: true
    });

    // Create output directory if it doesn't exist
    await mkdirp(flags.out!);

    // Write all generated chunks to the output directory
    for (const chunk of output) {
      const outPath = join(flags.out!, chunk.fileName);
      const outDir = dirname(outPath);

      // Ensure the directory exists
      await mkdirp(outDir);

      // Write the chunk
      await fs.writeFile(outPath, chunk.type === 'chunk' ? chunk.code : chunk.source);

      // Write the source map if available
      if (chunk.type === 'chunk' && chunk.map) {
        await fs.writeFile(`${outPath}.map`, JSON.stringify(chunk.map));
      }
    }

    // Copy all files from currentFileList to output directory (unless they already exist as chunks)
    const generatedFiles = new Set(output.map(chunk => chunk.fileName));

    for (const file of currentFileList) {
      if (!generatedFiles.has(file)) {
        const sourcePath = join(projectConfig.projectPath, file);
        const outPath = join(flags.out!, file);
        const outDir = dirname(outPath);

        // Ensure the directory exists
        await mkdirp(outDir);

        // Copy the file
        await fs.copyFile(sourcePath, outPath);
      }
    }

    if (!flags.quiet) {
      console.log(`${c.green('✓')} Built ${c.cyan(projectConfig.name)} to ${c.cyan(flags.out!)}`);
    }
  } finally {
    stopSpinner();
  }
}
