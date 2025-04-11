import { strictEqual, deepStrictEqual } from 'assert';
import { ImportMap } from '@jspm/import-map';

const mapBase = new URL('.', import.meta.url);

const map = new ImportMap({
  mapUrl: mapBase,
  map: {
    imports: {
      react: 'https://cdn.com/react.js'
    },
    scopes: {
      'https://site.com/': {
        react: 'https://cdn.com/react2.js'
      }
    }
  }
});

strictEqual(map.resolve('react', mapBase), 'https://cdn.com/react.js');
strictEqual(map.resolve('react', 'https://site.com/'), 'https://cdn.com/react2.js');

strictEqual(map.resolve('./hello.js', 'https://site.com/'), 'https://site.com/hello.js');

map.set('react', './custom-react.js');
strictEqual(map.resolve('react'), new URL('./custom-react.js', mapBase).href);

map.set('react', './custom-react2.js', 'https://another.com/');
strictEqual(map.resolve('react', 'https://another.com/'), new URL('./custom-react2.js', mapBase).href);

deepStrictEqual(map.toJSON(), {
  "imports": {
    "react": "./custom-react.js"
  },
  "scopes": {
    "https://site.com/": {
      "react": "https://cdn.com/react2.js"
    },
    "https://another.com/": {
      "react": "./custom-react2.js"
    }
  }
});

// Rebase the map
map.rebase(new URL('./map/', mapBase));

deepStrictEqual(map.toJSON(), {
  "imports": {
    "react": "../custom-react.js"
  },
  "scopes": {
    "https://site.com/": {
      "react": "https://cdn.com/react2.js"
    },
    "https://another.com/": {
      "react": "../custom-react2.js"
    }
  }
});

// Flatten the import map (removes unnecessary scope redundancy)
map.set('react', '../custom-react.js', 'https://site.com/');
map.flatten();
deepStrictEqual(map.toJSON(), {
  "imports": {
    "react": "../custom-react.js"
  },
  "scopes": {
    "https://another.com/": {
      "react": "../custom-react2.js"
    }
  }
});

// Replace URLs in the map
map.replace('https://cdn.com/', 'https://cdn-mirror.com/');
map.replace('https://another.com/', 'https://another-site.com/');
deepStrictEqual(map.toJSON(), {
  "imports": {
    "react": "../custom-react.js"
  },
  "scopes": {
    "https://another-site.com/": {
      "react": "../custom-react2.js"
    }
  }
});
