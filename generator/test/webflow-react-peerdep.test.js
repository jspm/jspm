import { Generator } from '@jspm/generator';
import assert from 'assert';

const generator = new Generator({
  mapUrl: import.meta.url,
  defaultProvider: 'unpkg',
});

await generator.install([
  '@webflow/react@1.0.2',
  'react@18.3.1',
  'react/jsx-runtime'
]);
const json = generator.getMap();

// The react dependency should remain at version 18
for (const [key, value] of Object.entries(json.imports || {})) {
  if (key === 'react' || key.startsWith('react/')) {
    console.log(`imports[${key}] = ${value}`);
    assert.ok(value.includes('react@18'), `Expected react@18 in imports but got ${value}`);
  }
}

// Check scopes for react references - they should all be react@18
for (const [scope, entries] of Object.entries(json.scopes || {})) {
  for (const [key, value] of Object.entries(entries)) {
    if (key === 'react' || key.startsWith('react/')) {
      console.log(`scopes[${scope}][${key}] = ${value}`);
      assert.ok(
        value.includes('react@18'),
        `Expected react@18 in scope ${scope} for ${key} but got ${value}`
      );
    }
  }
}
