import { test } from 'node:test';
import { ok } from 'node:assert';
import { mapDirectory, run } from './scenarios.ts';

test('build with rollup config', async () => {
  const filesBuild = await mapDirectory('fixtures/scenario_build_app');
  await run({
    files: filesBuild,
    commands: ['jspm build --out dist'],
    validationFn: async (files: Map<string, string>) => {
      // Verify main entry point is built
      ok(files.has('dist/app.js'), 'Entry point app.js should be built');

      // Verify source maps are generated
      ok(files.has('dist/app.js.map'), 'Source map for app.js should be generated');

      // Verify utils file is in the output
      ok(files.has('dist/utils.js'), 'Utils.js should be in the output directory');

      // Verify import statements are correctly handled (check for lit-element import)
      const appJs = files.get('dist/app.js')!;
      ok(appJs.includes('3.2.1'), 'Built app.js should include lit-element 3.2.1 inlined');

      // Verify the code was correctly bundled (check for a function from utils.js)
      ok(
        appJs.includes('litElementVersions'),
        'Built app.js should include function from utils.js'
      );

      // Verify CSS imports are correctly handled
      ok(appJs.includes('padding:16px'), 'Built app.js should include CSS styles from styles.css');
      ok(appJs.includes('font-family:sans-serif'), 'Built app.js should include inline CSS styles');

      // Verify CSS URL rebasing is working
      ok(
        !appJs.includes("url('../images/background.png')"),
        'Original relative URL should not be present'
      );
      ok(
        !appJs.includes('url("../images/icon.svg")'),
        'Original relative URL should not be present'
      );

      // Check that URLs have been rebased correctly
      ok(
        appJs.includes(`url('\${new URL('images/background.png', import.meta.url).href}')`),
        'CSS URLs should be rebased to use proper relative paths'
      );

      // Verify JSON data imports are correctly handled
      ok(appJs.includes('"Test Component Data"'), 'Built app.js should include imported JSON data');
      ok(appJs.includes('"theme": "light"'), 'Built app.js should include settings from JSON data');

      // Verify TypeScript compilation
      ok(
        appJs.includes('UserManager'),
        'Built app.js should include the UserManager class from TypeScript'
      );
      ok(appJs.includes('getActiveUsers'), 'Built app.js should include TypeScript class methods');
      ok(appJs.includes('TYPESCRIPT_VERSION'), 'Built app.js should include TypeScript constants');
      ok(
        appJs.includes('getAllUsers'),
        'Built app.js should include correctly compiled TypeScript code'
      );
      ok(
        appJs.includes('filter(user => user.isActive)'),
        'Built app.js should include TypeScript arrow functions'
      );

      // Verify the utils export point is handled correctly
      const utilsJs = files.get('dist/utils.js')!;
      ok(utilsJs.includes('export { add }'), 'Utils.js should be correctly built with exports');
      ok(utilsJs.includes("import 'react'"), 'Utils.js should have react external');
    }
  });
});
