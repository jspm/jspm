import type { BaseFlags } from './cli.ts';
import { clearCache as _clearCache } from '@jspm/generator';
import c from 'picocolors';

export default async function clearCache(flags: BaseFlags) {
  await _clearCache();
  !flags.quiet && console.warn(`${c.green('Ok:')} Cache cleared successfully`);
}
