import * as fs from 'node:fs/promises';
import { extname } from 'node:path';
import { pathToFileURL } from 'url';
import c from 'picocolors';
import { type Generator } from '@jspm/generator';
import type { GenerateOutputFlags } from './cli.ts';
import {
  JspmError,
  getEnv,
  getGenerator,
  getInputMap,
  isJsExtension,
  startSpinner,
  stopSpinner,
  writeOutput
} from './utils.ts';
import { withType } from './logger.ts';
import { initProject } from './init.ts';

export default async function link(modules: string[], flags: GenerateOutputFlags) {
  const log = withType('link/link');

  log(`Linking modules: ${modules.join(', ')}`);
  log(`Flags: ${JSON.stringify(flags)}`);

  const fallbackMap = !modules[0] || isJsExtension(extname(modules[0])) ? undefined : modules[0];

  const env = await getEnv(flags);
  const generator = await getGenerator(flags, { scopedLink: true });

  let pins = null;
  if (modules.length === 0) {
    console.log('no modules');
    if (!flags.quiet) {
      startSpinner(`Linking import map`);
    }
    try {
      // First validate the project - this will warn about missing exports
      try {
        // Initialize project to validate package.json
        const projectConfig = await initProject({
          quiet: flags.quiet,
          dir: process.cwd()
        });

        log(`Project validated: ${projectConfig.name}`);
      } catch (e) {
        // Just log warnings for project validation issues but continue with freeze
        if (e instanceof JspmError && !flags.quiet) {
          console.warn(`${c.yellow('Warning:')} ${e.message}`);
        }
      }

      await generator.install('freeze');
    } finally {
      stopSpinner();
    }
  } else {
    const inlinePins: string[] = [];
    const resolvedModules = (
      await Promise.all(modules.map(spec => resolveModule(spec, inlinePins, generator)))
    ).filter(m => !!m);

    // The input map is either from a JSON file or extracted from an HTML file.
    // In the latter case we want to trace any inline modules from the HTML file
    // as well, since they may have imports that are not in the import map yet:
    const input = await getInputMap(flags, fallbackMap);
    pins = inlinePins.concat(resolvedModules.map(p => p.target));
    let allPins = pins;
    if (input) {
      allPins = pins.concat(await generator.addMappings(input));
    }

    log(`Input map parsed: ${input}`);
    log(`Trace installing: ${allPins.concat(pins).join(', ')}`);

    if (!flags.quiet) {
      startSpinner(
        `Linking ${c.bold(resolvedModules.map(p => p.alias || p.target).join(', '))}. (${env.join(
          ', '
        )})`
      );
    }

    try {
      await generator.link(allPins.concat(pins));
    } finally {
      stopSpinner();
    }

    pins = allPins.concat(pins);
  }

  // If the user has provided modules and the output path is different to the
  // input path, then we behave as an extraction from the input map. In all
  // other cases we behave as an update to the map:
  return await writeOutput(generator, pins, env, flags, flags.quiet);
}

async function resolveModule(p: string, inlinePins: string[], generator: Generator) {
  const log = withType('link/resolveModule');

  let res: { target: string; alias?: string };
  if (p.includes('=')) {
    const [alias, target] = p.split('=');
    res = { alias, target };
  } else {
    res = { target: p };
  }

  // If the user provides a bare specifier like 'app.js', we can check for
  // a local file of the same name ('./app.js') and use that as the target
  // rather. If the user really wants to link the 'app.js' package they can
  // prefix it with '%' as follows: '%app.js':
  if (res.target.startsWith('%')) {
    log(`Resolving target '${res.target}' as '${res.target.slice(1)}'`);
    res.target = res.target.slice(1);
  } else {
    try {
      await fs.access(res.target);
      const targetPath =
        res.target.startsWith('.') || res.target.startsWith('/') ? res.target : `./${res.target}`;

      log(`Resolving target '${res.target}' as '${targetPath}'`);
      res.target = targetPath;

      return handleLocalFile(res, inlinePins, generator);
    } catch (e) {
      // No file found, so we leave the target as-is.
    }
  }

  return res;
}

async function handleLocalFile(
  resolvedModule: { alias?: string; target: string },
  inlinePins: string[],
  generator: Generator
) {
  const source = await fs.readFile(resolvedModule.target, { encoding: 'utf8' });

  const babel = await import('@babel/core');

  try {
    babel.parse(source);
    return resolvedModule; // this is a javascript module, it parsed correctly
  } catch (e) {
    /* fallback to parsing it as html */
  }

  const targetUrl = pathToFileURL(resolvedModule.target);
  let pins;
  try {
    pins = await generator.linkHtml(source, targetUrl);
  } catch (e) {
    if ((e as any)?.jspmError) {
      (e as Error).message += `, linking HTML file "${resolvedModule.target}"`;
    }
    throw e;
  }
  if (!pins || pins.length === 0) {
    throw new JspmError('No inline HTML modules found to link.');
  }

  inlinePins.push(...pins);
}
