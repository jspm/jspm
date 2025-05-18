import { fetch } from '@jspm/generator';
import assert from 'assert';

const pcfg = await (await fetch('https://ga.jspm.io/npm:jquery@3.6.0/package.json')).json();
assert.strictEqual(pcfg.name, 'jquery');
