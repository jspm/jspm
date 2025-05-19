import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { rollup } from 'rollup';
import jspmRollup from '@jspm/plugin-rollup';
import c from 'picocolors';
import {
  JspmError,
  getDisabledWarnings,
  getEnv,
  getExportsEntries,
  getFilesRecursively,
  getGenerator,
  sanitizeTemplateStr,
  startSpinner,
  stopSpinner
} from './utils.ts';
import type { BuildFlags } from './cli.ts';
import { initProject } from './init.ts';

export default async function build(flags: BuildFlags) {
  // Try to validate the project configuration
  const projectConfig = await initProject(flags);
  const env = await getEnv(flags);

  // Get entrypoints from package.json
  const currentFileList = (
    await getFilesRecursively(
      projectConfig.projectPath,
      [
        ...(projectConfig.ignore || []),
        // always ignore the outdir itself to avoid recursive nesting
        relative(projectConfig.projectPath, resolve(flags.out!)).replace(/\\/g, '/')
      ],
      projectConfig.files,
      getDisabledWarnings(flags)
    )
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
      input[
        relative(projectConfig.projectPath, file)
          .replace(/\\/g, '/')
          .replace(/\.ts$/, '.js')
          .replace(/\.mts$/, '.mjs')
      ] = pathToFileURL(file).href;
    }
  }

  const generator = await getGenerator(flags);

  try {
    if (!flags.quiet) startSpinner(`Building package ${c.cyan(projectConfig.name)}...`);

    const baseUrl = pathToFileURL(projectConfig.projectPath).href;
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
          generator,
          baseUrl,
          env,
          minify: flags.minify
        }) as any,
        cssPlugin({
          baseUrl,
          minify: flags.minify
        })
      ]
    });

    const { output } = await bundle.generate({
      format: 'esm',
      assetFileNames: '[name][extname]',
      entryFileNames: '[name]',
      chunkFileNames: '[name]',
      sourcemap: true,
      compact: flags.minify
    });

    // Create output directory if it doesn't exist
    await mkdir(flags.out!, { recursive: true });

    // Write all generated chunks to the output directory
    for (const chunk of output) {
      const outPath = join(flags.out!, chunk.fileName);
      const outDir = dirname(outPath);

      // Ensure the directory exists
      await mkdir(outDir, { recursive: true });

      // Write the chunk
      await writeFile(outPath, chunk.type === 'chunk' ? chunk.code : chunk.source);

      // Write the source map if available
      if (chunk.type === 'chunk' && chunk.map) {
        await writeFile(`${outPath}.map`, JSON.stringify(chunk.map));
      }
    }

    // Copy all files from currentFileList to output directory (unless they already exist as chunks)
    const generatedFiles = new Set(output.map(chunk => chunk.fileName));

    // Copy the package.json across with the "exports" field patched for .ts -> .js renames
    {
      // already read it previously so this should pass
      const pjson = JSON.parse(
        readFileSync(join(projectConfig.projectPath, 'package.json'), 'utf8')
      );
      // TODO: do this properly!
      pjson.exports = JSON.parse(
        JSON.stringify(pjson.exports)
          .replace(/\.ts"/g, '.js"')
          .replace(/\.mts"/g, '.mjs"')
      );
      const outPath = join(flags.out!, 'package.json');
      const outDir = dirname(outPath);
      await mkdir(outDir, { recursive: true });
      await writeFile(outPath, JSON.stringify(pjson, null, 2));
      generatedFiles.add('package.json');
    }
    generatedFiles.add('importmap.js');

    for (const file of currentFileList) {
      if (!generatedFiles.has(file)) {
        const sourcePath = join(projectConfig.projectPath, file);
        const outPath = join(flags.out!, file);
        const outDir = dirname(outPath);

        // Ensure the directory exists
        await mkdir(outDir, { recursive: true });

        // Copy the file
        await copyFile(sourcePath, outPath);
      }
    }

    stopSpinner();

    if (!flags.quiet) {
      console.log(`${c.green('✓')} Built ${c.cyan(projectConfig.name)} to ${c.cyan(flags.out!)}`);
    }
  } catch (e) {
    stopSpinner();
    throw e;
  }
}

// Taken from https://github.com/jleeson/rollup-plugin-import-css, Jacob Leeson, MIT
function cssPlugin({ minify, baseUrl }) {
  const basePath = fileURLToPath(baseUrl);

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
    async transform(code: string, id: string) {
      if (!id.endsWith('.css')) return;
      const moduleInfo = this.getModuleInfo(id);
      if ((moduleInfo.attributes || moduleInfo.assertions)?.type !== 'css')
        throw new Error(
          `CSS file "${id}" imported without 'with { type: "css" }' assertion. Only CSSStyleSheet imports are supported.`
        );

      const cssUrlRegEx = /url\(\s*(?:(["'])((?:\\.|[^\n\\"'])+)\1|((?:\\.|[^\s,"'()\\])+))\s*\)/g;

      // Rebase all relative URLs in the CSS
      const processedCode = code.replace(cssUrlRegEx, (match, quotes = '', relUrl1, relUrl2) => {
        const resolved = new URL(relUrl1 || relUrl2, id).href;
        if (!resolved.startsWith('file:')) return match;
        const fileId = this.emitFile({
          type: 'asset',
          name: relative(basePath, fileURLToPath(resolved)).replace(/\\/g, '/'),
          source: readFileSync(fileURLToPath(resolved))
        });
        return `url(${quotes}import.meta.ROLLUP_FILE_URL_${fileId}}${quotes})`;
      });

      const transformedCode = minify ? minifyCSS(processedCode) : processedCode;

      return {
        code: `const sheet = new CSSStyleSheet();sheet.replaceSync(\`${sanitizeTemplateStr(
          transformedCode
        ).replace(
          /import\.meta\.ROLLUP_FILE_URL_/g,
          '${import.meta.ROLLUP_FILE_URL_'
        )}\`);export default sheet;`,
        map: { mappings: '' }
      };
    }
  };
}
