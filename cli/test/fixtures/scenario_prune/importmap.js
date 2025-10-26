(map => {
  const mapUrl = document.currentScript.src;
  const resolve = imports => Object.fromEntries(Object.entries(imports).map(([k, v]) => [k, new URL(v, mapUrl).href]));
  document.head.appendChild(Object.assign(document.createElement("script"), {
    type: "importmap-shim",
    innerHTML: JSON.stringify({
      imports: resolve(map.imports),
      scopes: Object.fromEntries(Object.entries(map.scopes).map(([k, v]) => [new URL(k, mapUrl).href, resolve(v)]))
    })
  }));
})
({
  "imports": {
    "mediabunny": "https://ga.jspm.io/npm:mediabunny@1.24.1/dist/modules/src/index.js",
    "app": "./index.js"
  },
  "scopes": {
    "./": {
      "mediabunny": "https://ga.jspm.io/npm:mediabunny@1.24.1/dist/modules/src/index.js"
    },
    "https://ga.jspm.io/": {
      "#dist/modules/src/node.js": "https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/@empty.js"
    },
    "https://ga.jspm.io/npm:mediabunny@1.24.1/": {
      "#dist/modules/src/node.js": "https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/@empty.js"
    }
  }
});
