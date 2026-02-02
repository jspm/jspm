import { test } from 'node:test';
import assert from 'assert';
import { mapFile, run } from './scenarios.ts';

const importMap = await mapFile('fixtures/importmap.js');

test('linking inline modules in HTML', async () => {
  await run({
    files: await mapFile(['fixtures/inlinemodules.html', 'fixtures/a.js', 'fixtures/b.js']),
    commands: ['jspm link inlinemodules.html -o inlinemodules.html'],
    validationFn: async files => {
      // The inline import of 'react-dom' should be linked:
      const html = files.get('inlinemodules.html')!;
      assert(html.includes('react-dom'));
    }
  });
});

test('linking specific package to HTML', async () => {
  await run({
    files: importMap,
    commands: ['jspm link react -o index.html'],
    validationFn: async (files: Map<string, string>) => {
      // The index.html should contain the react version from the import map,
      // but none of the other pins, and no preloads or integrity attributes:
      assert(files.get('index.html')!.includes('npm:react@17.0.1'));
      assert(!files.get('index.html')!.includes('npm:lodash@4.17.21'));
      assert(!files.get('index.html')!.includes('npm:react-dom@17.0.1'));
      assert(!files.get('index.html')!.includes('preload'));
      assert(!files.get('index.html')!.includes('integrity'));
    }
  });
});

test('linking all packages to HTML', async () => {
  await run({
    files: importMap,
    commands: ['jspm link -o index.html'],
    validationFn: async (files: Map<string, string>) => {
      // The index.html should contain the import map with all packages,
      // but no preloads or integrity attributes:
      const html = files.get('index.html')!;
      assert(html.includes('react'));
      assert(html.includes('lodash'));
      assert(html.includes('react-dom'));
      assert(!html.includes('preload'));
      assert(!html.includes('integrity'));
    }
  });
});

test('linking with static preload', async () => {
  await run({
    files: importMap,
    commands: ['jspm link react -o index.html --preload static'],
    validationFn: async (files: Map<string, string>) => {
      // The index.html should contain the react version from the import map,
      // and integrities for it, but nothing else:
      assert(files.get('index.html')!.includes('npm:react@17.0.1'));
      assert(!files.get('index.html')!.includes('npm:lodash@4.17.21'));
      assert(!files.get('index.html')!.includes('npm:react-dom@17.0.1'));
      assert(files.get('index.html')!.includes('preload'));
      assert(!files.get('index.html')!.includes('integrity'));
    }
  });
});

test('install to HTML output should produce non-empty importmap', async () => {
  await run({
    files: new Map([
      [
        'package.json',
        JSON.stringify({
          name: 'test-package',
          version: '1.0.0',
          exports: {
            '.': './index.js'
          },
          dependencies: {
            react: '17.0.1'
          }
        })
      ],
      ['index.js', "import 'react'; export default function main() {}"]
    ]),
    commands: ['jspm install -o app.html'],
    validationFn: async (files: Map<string, string>) => {
      const html = files.get('app.html')!;
      assert(html, 'app.html should exist');
      // The HTML output should contain a non-empty import map with the
      // installed package (regression test for #2691):
      assert(html.includes('importmap'), 'should contain an importmap script');
      assert(html.includes('react'), 'importmap should contain react');
      assert(html.includes('test-package'), 'importmap should contain the package name');
    }
  });
});

test('installing with preload and integrity', async () => {
  await run({
    files: importMap,
    commands: ['jspm link react -o index.html --preload --integrity -C production'],
    validationFn: async (files: Map<string, string>) => {
      // The index.html should contain all the pins, and integrities for them:
      // NOTE: this will break if we change the CDN build!
      const reactIntegrity =
        'sha384-y5ozcpbgsrkQFNWIQTtiGWstK6sGqPJu5Ptnvn8lAqJXDNI7ZdE9fMsYVgrq3PRG';
      assert(files.get('index.html')!.includes('npm:react@17.0.1'));
      assert(!files.get('index.html')!.includes('npm:lodash@4.17.21'));
      assert(!files.get('index.html')!.includes('npm:react-dom@17.0.1'));
      assert(files.get('index.html')!.includes('preload'));
      assert(files.get('index.html')!.includes(reactIntegrity));
    }
  });
});
