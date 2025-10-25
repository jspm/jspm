import { Generator } from '@jspm/generator';
import assert from 'assert';

const generator = new Generator({
  customProviders: {
    custom: {
      ownsUrl (url) {
        return url.startsWith('https://framerusercontent.com/') || url.startsWith('https://framerusercontent.dev/');
      },
      // Framer does not support package.json config files currently for customizing package resolutions with exports
      // or imports, or for supporting dependency version ranges
      getPackageConfig (url) {
        return null;
      }
    }
  }
});

await generator.link('https://framerusercontent.com/modules/hbDCoHjvQqMyIH6I6akS/JpP37lZcTYRA5qoY1Tdv/Qhb7p35zo.js');
const map = generator.getMap();
assert.ok(map.imports.framer);
