(map => {
  document.head.appendChild(Object.assign(document.createElement("script"), {
    type: "importmap",
    innerHTML: JSON.stringify({
      imports: map.imports,
      scopes: map.scopes
    })
  }));
})
({
  "scopes": {
    "https://framer.com/": {
      "react": "https://ga.jspm.io/npm:react@19.1.1/dev.index.js"
    },
    "https://framerusercontent.dev/": {
      "react": "https://ga.jspm.io/npm:react@19.1.1/dev.index.js",
      "react/jsx-runtime": "https://ga.jspm.io/npm:react@19.1.1/dev.jsx-runtime.js",
      "three/addons/tsl/display/": "https://ga.jspm.io/npm:three@0.180.0/examples/jsm/tsl/display/",
      "three/examples/fonts/helvetiker_regular.typeface.json": "https://ga.jspm.io/npm:three@0.180.0/examples/fonts/helvetiker_regular.typeface.json.js",
      "three/examples/jsm/": "https://ga.jspm.io/npm:three@0.180.0/examples/jsm/",
      "three/tsl": "https://ga.jspm.io/npm:three@0.180.0/build/three.tsl.js",
      "three/webgpu": "https://ga.jspm.io/npm:three@0.180.0/build/three.webgpu.js"
    },
    "https://ga.jspm.io/": {
      "react": "https://ga.jspm.io/npm:react@19.1.1/dev.index.js",
      "three": "https://ga.jspm.io/npm:three@0.180.0/build/three.module.js",
      "three/tsl": "https://ga.jspm.io/npm:three@0.180.0/build/three.tsl.js",
      "three/webgpu": "https://ga.jspm.io/npm:three@0.180.0/build/three.webgpu.js"
    }
  }
});
