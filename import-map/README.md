# Import Map Utility

Generic ImportMap class utility for the manipulation and resolution of import maps, used by JSPM.

## Getting Started

### Installation

Node.js:
```
npm install @jspm/import-map
```

### Usage

`@jspm/import-map` only ships as an ES module.

example.mjs
```js
import { ImportMap } from '@jspm/import-map';

const mapUrl = import.meta.url;

const map = new ImportMap({
  mapUrl, // optional
  map: {
    imports: {
      react: 'https://cdn.com/react.js'
    },
    scopes: {
      'https://site.com/': {
        react: 'https://cdn.com/react2.js'
      }
    },
    integrity: {
      'https://cdn.com/react.js': 'sha384-...'
    }
  }
});

// Use the map resolver
map.resolve('react') === 'https://cdn.com/react.js';
map.resolve('react', 'https://site.com/') === 'https://cdn.com/react2.js';

// Supports normal URL resolution behaving a browser-compatible ES module resolver
map.resolve('./hello.js', 'https://site.com/') === 'https://site.com/hello.js';

// Mutate the map
map.set('react', './custom-react.js');
map.resolve('react') === new URL('./custom-react.js', mapUrl).href;

// Mutate the map inside a custom scope
map.set('react', './custom-react2.js', 'https://another.com/');
map.resolve('react', 'https://another.com/') === new URL('./custom-react2.js', mapUrl).href;

// Get the map JSON
console.log(JSON.stringify(map.toJSON(), null, 2));
// {
//   "imports": {
//     "react": "./custom-react.js"
//   },
//   "scopes": {
//     "https://site.com/": {
//       "react": "https://cdn.com/react2.js"
//     },
//     "https://another.com/": {
//       "react": "./custom-react2.js"
//     }
//   },
//   "integrity": {
//     "https://cdn.com/react.js": "sha384-..."
//   }
// }

// Rebase the map
map.rebase('./map/');
console.log(JSON.stringify(map.toJSON(), null, 2));
// {
//   "imports": {
//     "react": "../custom-react.js"
//   },
//   "scopes": {
//     "https://site.com/": {
//       "react": "https://cdn.com/react2.js"
//     },
//     "https://another.com/": {
//       "react": "../custom-react2.js"
//     }
//   },
//   "integrity": {
//     "https://cdn.com/react.js": "sha384-..."
//   }
// }

// Flatten the import map (removes unnecessary scope redundancy)
map.set('react', '../custom-react.js', 'https://site.com/');
map.flatten();
console.log(JSON.stringify(map.toJSON(), null, 2));
// {
//   "imports": {
//     "react": "../custom-react.js"
//   },
//   "scopes": {
//     "https://another.com/": {
//       "react": "../custom-react2.js"
//     }
//   },
//   "integrity": {
//     "https://cdn.com/react.js": "sha384-..."
//   }
// }

// Replace URLs in the map
map.replace('https://cdn.com/', 'https://cdn-mirror.com/');
map.replace('https://another.com/', 'https://another-site.com/');
console.log(JSON.stringify(map.toJSON(), null, 2));
// {
//   "imports": {
//     "react": "../custom-react.js"
//   },
//   "scopes": {
//     "https://another-site.com/": {
//       "react": "../custom-react2.js"
//     }
//   },
//   "integrity": {
//     "https://another.com/react.js": "sha384-..."
//   }
// }

// Combine subpaths in the map
// This is only supported for scopes and not top-level imports,
// to avoid losing dependency information from imports.
// (all non-returning methods support chaining)
console.log(new ImportMap({
  map: {
    scopes: {
      "/": {
        "pkg/a.js": "/pkg/a.js",
        "pkg/b.js": "/pkg/b.js"
      }
    }
  }
}).combineSubpaths().toJSON());
// {
//   "imports": {},
//   "scopes": {
//     "/": {
//       "pkg/": "/pkg/"
//     }
//   }
//  }
```

## API

See [src/map.ts](https://github.com/jspm/import-map/blob/main/src/map.ts).

Support is also provided for conditional maps supporting a way to manage generic maps for multiple environment targets, before serializing or resolving for exact environment targets.

### License

MIT
