export default function createHotMap(map) {
  return `/**
 * JSPM Hot Reloading Injection Script
 */
(map => {
  const mapUrl = document.currentScript.src;
  const baseUrl = document.baseURI;

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
  esmsInitOptions = {
    hotReload: true,
    shimMode: true
  };

  const log = msg => console.log('%c[JSPM Watch]%c ' + msg, 'color: cyan', '');

  // Setup the hot reload change events
  function createHotReloadSource() {
    let source = new EventSource('/_events');
    source.onmessage = evt => {
      const data = JSON.parse(evt.data);
      if (data.newMap) {
        const map = importShim.getImportMap();
        importShim.addImportMap(mapDiff(map, resolveMap(data.newMap)));
      }
      data.files?.forEach(file => {
        const resolvedUrl = new URL(file, baseUrl).href;
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

  function mapDiff(lastMap, newMap) {
    const diffMap = {};
    if (newMap.imports) {
      const diffImports = {};
      let hasImportsDiff = false;
      for (const key in newMap.imports) {
        if (!lastMap.imports || lastMap.imports[key] !== newMap.imports[key]) {
          diffImports[key] = newMap.imports[key];
          hasImportsDiff = true;
        }
      }
      if (hasImportsDiff)
        diffMap.imports = diffImports;
    }
    if (newMap.scopes) {
      const diffScopes = {};
      let hasScopesDiff = false;
      for (const scope in newMap.scopes) {
        const newScopeImports = newMap.scopes[scope];
        const lastScopeImports = lastMap.scopes?.[scope];
        if (!lastScopeImports) {
          diffScopes[scope] = { ...newScopeImports };
          hasScopesDiff = true;
          continue;
        }
        const scopeDiff = {};
        let hasScopeDiff = false;
        for (const key in newScopeImports) {
          if (lastScopeImports[key] !== newScopeImports[key]) {
            scopeDiff[key] = newScopeImports[key];
            hasScopeDiff = true;
          }
        }
        if (hasScopeDiff) {
          diffScopes[scope] = scopeDiff;
          hasScopesDiff = true;
        }
      }
      if (hasScopesDiff)
        diffMap.scopes = diffScopes;
    }
    if (newMap.integrity) {
      const diffIntegrity = {};
      let hasIntegrityDiff = false;
      for (const url in newMap.integrity) {
        if (!lastMap.integrity || lastMap.integrity[url] !== newMap.integrity[url]) {
          diffIntegrity[url] = newMap.integrity[url];
          hasIntegrityDiff = true;
        }
      }
      if (hasIntegrityDiff)
        diffMap.integrity = diffIntegrity;
    }
    return diffMap;
  }
})
(${JSON.stringify(map, null, 2)});
`;
}
