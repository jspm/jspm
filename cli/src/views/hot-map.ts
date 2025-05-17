export default function createHotMap(map) {
  return `/**
 * JSPM Hot Reloading Injection Script
 * Uses ES Module Shims for hot reloading, and works with both shim mode and polyfill mode.
 * Using shim mode is recommended.
 */
(map => {
  const mapUrl = document.currentScript.src;
  const pkgBase = new URL('.', mapUrl);

  const resolve = imports => Object.fromEntries(Object.entries(imports).map(([k, v]) => [k, new URL(v, mapUrl).href]));
  function resolveMap(map) {
    return {
      imports: map.imports ? resolve(map.imports) : {},
      scopes: map.scopes ? Object.fromEntries(Object.entries(map.scopes).map(([k, v]) => [new URL(k, mapUrl).href, resolve(v)])) : {},
      integrity: map.integrity ? Object.fromEntries(Object.entries(map.integrity).map(([k, v]) => [new URL(k, mapUrl).href, v])) : {}
    };
  }
  map = resolveMap(map);

  // First, put ES Module Shims into Shim Mode, and enable hot reloading
  esmsInitOptions = { hotReload: true, shimMode: true };

  const log = msg => console.log('%c[JSPM Watch]%c ' + msg, 'color: cyan', '');

  // Setup the hot reload change events
  function createHotReloadSource() {
    let source = new EventSource('/_events');
    source.onmessage = evt => {
      const data = JSON.parse(evt.data);
      if (data.newMap) {
        importShim.addImportMap(data.newMap);
      }
      data.files?.forEach(file => {
        const resolvedUrl = new URL(file, pkgBase).href;
        if (importShim?.hotReload?.(resolvedUrl))
          log(\`Reloaded \${file}\`);
        for (const style of [...document.querySelectorAll('link[rel=stylesheet]')]) {
          if (style.href.slice(0, resolvedUrl.length) !== resolvedUrl) continue;
          const newLink = document.createElement('link');
          newLink.rel = 'stylesheet';
          newLink.href = resolvedUrl + (resolvedUrl.includes('?') ? '&' : '?') + 'v=' + Date.now();
          document.head.appendChild(newLink);
          newLink.onload = () => {
            style.parentNode.removeChild(style);
            log(\`Reloaded stylesheet \${file}\`);
          };
        }
      });
    };
    source.onerror = evt => {
      if (source.readyState === EventSource.CLOSED) {
        console.info('JSPM hot reload connection closed, restarting...');
        clearTimeout(t);
        source = createHotReloadSource();
      }
    };
    const t = setTimeout(() => {
      source.close();
      createHotReloadSource();
    }, 90_000);
    return source;
  }
  createHotReloadSource();

  // Inject the import map as a Shim Mode import map
  document.head.appendChild(Object.assign(document.createElement("script"), {
    type: "importmap-shim",
    innerHTML: JSON.stringify(map)
  }));

  // Create an importShim wrapper that polls for the real importShim to be defined
  _is = async function (impt) {
    while (typeof importShim === 'undefined')
      await new Promise(resolve => setTimeout(resolve, 10));
    return importShim(impt);
  };

  /*
  * This implements the native import map patch hack - supporting the native imports via a
  * native import map that bridges into the shim loader with a data: URL approach.
  * The remaining limitation is that we don't provide named exports for these imports, but
  * that is the tradeoff that is made (and again, if this is not the case, use shim mode
  * scripts for hot reloading rather!).
  */
  document.head.appendChild(Object.assign(document.createElement("script"), {
    type: "importmap",
    innerHTML: JSON.stringify({
      imports: Object.fromEntries(Object.entries(map.imports || {}).map(([impt, target]) =>
        !impt.endsWith('/')
        // Remap the native \`import 'app'\` to importShim('app')
        ? [impt, \`data:text/javascript,await _is(\${JSON.stringify(target)})\`]

        /*
        * The last hack here is handling trailing '/' mappings, which can't be known in advance.
        * We implement this with an import.meta.url trick for self-inspection with a JS comment
        * used to make this valid JS in the data URL. This is because, for an import map with:
        * 
        * {
        *   "imports": {
        *     "app/": "data:text/javascript,console.log(import.meta.url.slice(61))//"
        *   }
        * }
        * 
        * \`import('app/foo')\` will import the data URL with \`/foo\` appended to the data URL which
        * would result in an invalid JS source if we didn't have the comment at the end. We then
        * slice its own length to be able to get its own subpath string at runtime (61 in the above
        * example, and 93 in the below usage, being the length of the data URL itself).
        */
        : [impt, 'data:text/javascript,await _is(JSON.stringify(target) + import.meta.url.slice(96)); //']
      ))
    })
  }));
})
(${JSON.stringify(map, null, 2)});
`;
}
