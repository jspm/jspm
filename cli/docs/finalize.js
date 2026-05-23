import { readFileSync, writeFileSync } from 'node:fs';

let docs = readFileSync('docs-generated.md', 'utf8');

// links
docs = docs.replace(/<conditions>/g, '&lt;[conditions](#conditions)&gt;');
docs = docs.replace(/<provider>/g, '&lt;[providers](#providers)&gt;');
docs = docs.replace(/<resolutions>/g, '&lt;[resolutions](#resolutions)&gt;');

docs = docs.replace(/\x1B\[[0-9;]*m/g, '');
docs = docs.replace(/jspm\/[^\n]+\n/g, '');
docs = docs.replace(/^([a-z-_]+):$/gim, '**$1**');
docs = docs.replace(/  ((-[a-z], )?--[a-z-_]+)/gi, '* `$1`');
docs = docs.replace(/\$ (jspm[^\n]+)\n/g, '\n```\n$1\n```');
docs = docs.replace(/<([a-z0-9]+)>/gi, '_&lt;$1&gt;_'); // <opts>
docs = docs.replace(/\[mode\]/g, '_[mode]_'); // --preload [mode]

docs = docs.replace(/^Γûú.*\r?\n\r?\n/gm, '');

const intro = readFileSync('docs/intro.md', 'utf8');
const config = readFileSync('docs/config.md', 'utf8');

writeFileSync('docs.md', `${intro}
${docs.slice(docs.indexOf('#'))}
${config}
`);
