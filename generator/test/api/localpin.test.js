import { Generator } from '@jspm/generator';
import assert from 'assert';

{
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'jspm.io',
    env: ['production', 'browser']
  });

  await generator.link('./local/pkg/jquery.js');
  const json = generator.getMap();

  assert.ok(Object.values(json.imports.jquery));
}

{
  const generator = new Generator({
    mapUrl: 'https://google.com',
    baseUrl: 'https://google.com',
    defaultProvider: 'jspm.io',
    env: ['production', 'browser'],
    flattenScopes: false,
    scopedLink: true
  });

  await generator.link(
    new URL('./local/pkg/jquery.js', import.meta.url).href,
    new URL('./local/', import.meta.url).href
  );
  const json = generator.getMap();
  assert.ok(Object.values(json.scopes)[0]['jquery']);
}
