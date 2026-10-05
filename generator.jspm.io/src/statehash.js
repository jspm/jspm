import { scriptTemplate } from './mapapp.js';

let zlib, Buffer;
const initPromise = (async () => {
  [zlib, { Buffer }] = await Promise.all([import('@jspm/core/nodelibs/zlib'), import('@jspm/core/nodelibs/buffer')]);
})();

const gzipPrefix = new Uint8Array([31, 139, 8, 0, 0, 0, 0, 0, 2, 3]);
const gzipSuffix = new Uint8Array([0, 0]);

const ENV_DEVELOPMENT = 0x1;
const ENV_PRODUCTION = 0x2;
const ENV_BROWSER = 0x4;
const ENV_NODE = 0x8;
const OUTPUT_SYSTEM = 0x10;
const OUTPUT_BOILERPLATE = 0x20;
const OUTPUT_MINIFY = 0x40;
const OUTPUT_JSON = 0x80;
const OUTPUT_INTEGRITY = 0x100;
const OUTPUT_PRELOAD = 0x200;
const ENV_MODULE = 0x400;
const ENV_DENO = 0x800;
const PROVIDER_SHIFT = 15;

const providers = ['jspm.io', 'esm.sh', 'unpkg', 'jsdelivr'];
function getProvider (providerName) {
  const providerIndex = providers.indexOf(providerName);
  if (providerIndex === -1)
    throw new Error('Cannot serialize provider ' + providerName);
  return providerIndex;
}

function getProviderName (providerIndex) {
  return providers[providerIndex];
}

const BIT1 = 0x1;
const BIT2 = 0x2;
const BIT3 = 0x4;
const BIT4 = 0x8;
const BIT5 = 0x10;
const BIT6 = 0x20;
const BIT7 = 0x40;
const BIT8 = 0x80;

function compressState (state) {
  const bitField =
    state.env.development * ENV_DEVELOPMENT |
    state.env.production * ENV_PRODUCTION |
    state.env.browser * ENV_BROWSER |
    state.env.node * ENV_NODE |
    state.env.module * ENV_MODULE |
    state.env.deno * ENV_DENO |
    state.output.boilerplate * OUTPUT_BOILERPLATE |
    state.output.minify * OUTPUT_MINIFY |
    state.output.json * OUTPUT_JSON |
    state.output.integrity * OUTPUT_INTEGRITY |
    state.output.preload * OUTPUT_PRELOAD |
    (getProvider(state.provider) << PROVIDER_SHIFT);
  const strs = state.name + '\0' + state.deps.map(dep => dep[0]).join('\0');
  const strBuffer = new TextEncoder().encode(strs);
  const bitFieldBuffer = new Buffer(4);
  const preloadLen = Math.ceil(state.deps.length / 8);
  const preloadBuffer = new Buffer(Math.ceil(state.deps.length / 8) + 1);
  preloadBuffer[0] = state.deps.length;
  for (let i = 0; i < preloadLen; i++) {
    preloadBuffer[i * 8 + 1] = state.deps[i][1] * BIT1 |
      (state.deps[i * 8 + 1] || [])[1] * BIT2 |
      (state.deps[i * 8 + 2] || [])[1] * BIT3 |
      (state.deps[i * 8 + 3] || [])[1] * BIT4 |
      (state.deps[i * 8 + 4] || [])[1] * BIT5 |
      (state.deps[i * 8 + 5] || [])[1] * BIT6 |
      (state.deps[i * 8 + 6] || [])[1] * BIT7 |
      (state.deps[i * 8 + 8] || [])[1] * BIT8;
  }
  bitFieldBuffer.writeUInt32LE(bitField, 0);
  return Buffer.concat([bitFieldBuffer, preloadBuffer, strBuffer]);
}

function decompressState (buffer) {
  const bitField = buffer.readUInt32LE(0);
  const depCnt = buffer[4];
  const preloadLen = Math.ceil(depCnt / 8);
  const preloadBuffer = buffer.slice(5, 5 + preloadLen);
  const strs = new TextDecoder().decode(buffer.slice(5 + preloadLen));
  const name = strs.slice(0, strs.indexOf('\0'));
  const deps = [];
  const depStrs = strs.slice(strs.indexOf('\0') + 1).split('\0');
  if (depCnt > 0) {
    if (depStrs.length !== depCnt)
      throw new Error('Internal error.');
    for (let i = 0; i < depStrs.length; i++)
      deps.push([depStrs[i], false]);
  }
  for (let i = 0; i < preloadLen; i++) {
    const bitField = preloadBuffer[i];
    if (bitField & BIT1)
      deps[i * 8][1] = true;
    if (bitField & BIT2)
      deps[i * 8 + 1][1] = true;
    if (bitField & BIT3)
      deps[i * 8 + 2][1] = true;
    if (bitField & BIT4)
      deps[i * 8 + 3][1] = true;
    if (bitField & BIT5)
      deps[i * 8 + 4][1] = true;
    if (bitField & BIT6)
      deps[i * 8 + 5][1] = true;
    if (bitField & BIT7)
      deps[i * 8 + 6][1] = true;
    if (bitField & BIT8)
      deps[i * 8 + 7][1] = true;
  }
  return {
    name,
    deps,
    provider: getProviderName((bitField >> PROVIDER_SHIFT) & 0xf),
    env: {
      development: bitField & ENV_DEVELOPMENT ? true : false,
      production: bitField & ENV_PRODUCTION ? true : false,
      browser: bitField & ENV_BROWSER ? true : false,
      node: bitField & ENV_NODE ? true : false,
      module: bitField & ENV_MODULE ? true : false,
      deno: bitField & ENV_DENO ? true : false
    },
    output: {
      boilerplate: bitField & OUTPUT_BOILERPLATE ? true : false,
      minify: bitField & OUTPUT_MINIFY ? true : false,
      json: bitField & OUTPUT_JSON ? true : false,
      integrity: bitField & OUTPUT_INTEGRITY ? true : false,
      preload: bitField & OUTPUT_PRELOAD ? true : false
    }
  };
}

export async function stateToHash (state) {
  await initPromise;
  const gzipped = zlib.gzipSync(compressState(state), { level: 9 });
  for (let i = 0; i < gzipPrefix.length; i++) {
    if (gzipped[i] !== gzipPrefix[i]) {
      // console.log(gzipped);
      // console.log(gzipPrefix);
      throw new Error('Internal Error.');
    }
  }
  for (let i = 0; i < gzipSuffix.length; i++) {
    if (gzipped[gzipped.length - gzipSuffix.length + i] !== gzipSuffix[i]) {
      // console.log(gzipped);
      // console.log(gzipSuffix);
      throw new Error('Internal Error.');
    }
  }
  return '#' + gzipped.slice(gzipPrefix.length, -gzipSuffix.length).toString('base64').replace(/=+$/, '');
}
export async function hashToState (hash) {
  await initPromise;
  const gzipped = Buffer.concat([gzipPrefix, Buffer.from(hash.slice(1), 'base64'), gzipSuffix]);
  return decompressState(zlib.gunzipSync(gzipped));
}

export async function getSandboxHash (name, importMap) {
  return '#' + zlib.gzipSync(Buffer.from(JSON.stringify({
    'importmap.js': `(map => {
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
(${JSON.stringify(importMap, null, 2)});`,
    'index.js': scriptTemplate(importMap),
  }))).toString('base64');
}