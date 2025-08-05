import { test } from 'node:test';
import { run } from './scenarios.ts';

test('Install package with build failure', async () => {
  await run({
    files: new Map([
      [
        'package.json',
        JSON.stringify({
          name: 'test-package',
          version: '1.0.0',
          dependencies: {
            'expo-camera': '16.1.11'
          },
          exports: {
            '.': './index.js'
          }
        })
      ],
      ['index.js', 'import "expo-camera"']
    ]),
    commands: ['jspm install -o importmap.json'],
    expectError: true
  });
});
