import { Generator } from '@jspm/generator';
import assert from 'assert';

const generator = new Generator({
  mapUrl: new URL('./versionbumps/importmap.json', import.meta.url),
  baseUrl: new URL('./versionbumps/', import.meta.url),

  inputMap: {
    imports: {
      'es-module-lexer': 'https://ga.jspm.io/npm:es-module-lexer@0.10.5/dist/lexer.js'
    }
  }
});

await generator.link('x');

const json = generator.getMap();
assert.strictEqual(
  json.imports['es-module-lexer'],
  'https://ga.jspm.io/npm:es-module-lexer@0.10.5/dist/lexer.js'
);

// Link takes module specifiers only; package targets and invalid specifiers throw:
{
  const generator = new Generator({
    mapUrl: import.meta.url,
    defaultProvider: 'jspm.io',
    env: ['production', 'browser']
  });
  const target = /package target/;
  await assert.rejects(generator.link('lit/directives/'), target);
  await assert.rejects(generator.link('react@17.0.2'), target);
  await assert.rejects(generator.link('@lit'), /not a valid module specifier/);
}
