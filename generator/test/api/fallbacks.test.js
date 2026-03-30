import { Generator } from '@jspm/generator';
import assert from 'assert';

// When an inputMap has a flattened scope with entities@4.5.0 (from
// htmlparser2@8.0.1), and react-html-parser is linked pulling in
// htmlparser2@3.10.1 which needs entities@^1.1.1, the flattened
// entities@4.5.0 must not be used for htmlparser2@3.10.1's resolution.

const inputMap = {
  imports: {
    htmlparser2: 'https://ga.jspm.io/npm:htmlparser2@8.0.1/lib/esm/index.js'
  },
  scopes: {
    'https://ga.jspm.io/': {
      entities: 'https://ga.jspm.io/npm:entities@4.5.0/lib/esm/index.js',
      'entities/lib/': 'https://ga.jspm.io/npm:entities@4.5.0/lib/',
      'entities/lib/decode.js': 'https://ga.jspm.io/npm:entities@4.5.0/lib/esm/decode.js',
      'entities/lib/escape.js': 'https://ga.jspm.io/npm:entities@4.5.0/lib/esm/escape.js',
      domelementtype: 'https://ga.jspm.io/npm:domelementtype@2.3.0/lib/esm/index.js',
      domhandler: 'https://ga.jspm.io/npm:domhandler@5.0.3/lib/esm/index.js',
      domutils: 'https://ga.jspm.io/npm:domutils@3.1.0/lib/esm/index.js',
      'dom-serializer': 'https://ga.jspm.io/npm:dom-serializer@2.0.0/lib/esm/index.js'
    },
    'https://ga.jspm.io/npm:react-html-parser@2.0.2/': {
      htmlparser2: 'https://ga.jspm.io/npm:htmlparser2@3.10.1/lib/index.js'
    },
    'https://ga.jspm.io/npm:htmlparser2@3.10.1/': {
      domelementtype: 'https://ga.jspm.io/npm:domelementtype@1.3.1/index.js',
      domutils: 'https://ga.jspm.io/npm:domutils@1.7.0/index.js',
      domhandler: 'https://ga.jspm.io/npm:domhandler@2.4.2/index.js'
    }
  }
};

// inputMapFallbacks: 'semver-compatible' — rejects incompatible flattened locks
{
  const generator = new Generator({
    inputMap,
    mapUrl: new URL('about:blank'),
    defaultProvider: 'jspm.io',
    env: ['production', 'browser'],
    inputMapFallbacks: 'semver-compatible'
  });

  await generator.link('react-html-parser');

  const map = generator.getMap();
  const gaScope = map.scopes?.['https://ga.jspm.io/'];

  assert.ok(
    gaScope?.['entities/lib/decode_codepoint.js']?.includes(':entities@1.'),
    'semver-compatible: entities/lib/decode_codepoint.js must resolve to entities@1.x'
  );

  assert.ok(
    !gaScope?.['entities/lib/']?.includes(':entities@4.'),
    'semver-compatible: entities/lib/ prefix must not route to entities@4.x'
  );
}

// inputMapFallbacks: false — ignores all flattened locks
{
  const generator = new Generator({
    inputMap,
    mapUrl: new URL('about:blank'),
    defaultProvider: 'jspm.io',
    env: ['production', 'browser'],
    inputMapFallbacks: false
  });

  await generator.link('react-html-parser');

  const map = generator.getMap();
  const gaScope = map.scopes?.['https://ga.jspm.io/'];

  assert.ok(
    gaScope?.['entities/lib/decode_codepoint.js']?.includes(':entities@1.'),
    'false: entities/lib/decode_codepoint.js must resolve to entities@1.x'
  );

  assert.ok(
    !gaScope?.['entities/lib/']?.includes(':entities@4.'),
    'false: entities/lib/ prefix must not route to entities@4.x'
  );

  // With false, the flattened entities@4.5.0 should not appear at all
  // for packages that didn't independently resolve to it
  const hp2Scope = map.scopes?.['https://ga.jspm.io/npm:htmlparser2@3.10.1/'];
  const hp2Entities = hp2Scope?.['entities'] || '';
  assert.ok(
    !hp2Entities.includes(':entities@4.'),
    'false: htmlparser2@3.10.1 must not have entities@4.x'
  );
}
