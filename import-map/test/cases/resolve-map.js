import { strictEqual } from 'assert';
import { ImportMap } from '@jspm/import-map';

const baseUrl = 'https://site.com/';
const map = new ImportMap({
  mapUrl: baseUrl,
  map: {
    imports: {
      test: '/test-map.js',
      'https://another.com/url.js': '/url-map.js'
    },
    scopes: {
      'https://another.com/': {
        '/url.js': '/scoped-map.js',
      }
    }
  }
});

strictEqual(map.resolve('test', baseUrl), 'https://site.com/test-map.js');
strictEqual(map.resolve('/url.js', 'https://another.com/'), 'https://site.com/url-map.js');
strictEqual(map.resolve('https://site.com/url.js', 'https://another.com/x'), 'https://site.com/scoped-map.js');
strictEqual(map.resolve('https://another.com/url.js', baseUrl), 'https://site.com/url-map.js');
