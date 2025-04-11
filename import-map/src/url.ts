export let baseUrl: URL;
// @ts-ignore
if (typeof Deno !== "undefined") {
  // @ts-ignore
  baseUrl = new URL("file://" + Deno.cwd() + "/");
} else if (typeof process !== "undefined" && process.versions?.node) {
  baseUrl = new URL("file://" + process.cwd() + "/");
} else if ((typeof document as any) !== "undefined") {
  const baseEl: any | null = document.querySelector("base[href]");
  if (baseEl)
    baseUrl = new URL(baseEl.href + (baseEl.href.endsWith("/") ? "" : "/"));
  else if (typeof location !== "undefined")
    baseUrl = new URL("../", new URL(location.href));
}

export function getCommonBase(a: string, b: string): string {
  if (a.startsWith(b)) return b;
  if (b.startsWith(a)) return a;
  const aSegments = a.split("/");
  const bSegments = b.split("/");
  let i = 0;
  while (aSegments[i] === bSegments[i]) i++;
  return aSegments.slice(0, i).join("/") + "/";
}

export function sameOrigin(url: URL, baseUrl: URL) {
  return (
    url.protocol === baseUrl.protocol &&
    url.host === baseUrl.host &&
    url.port === baseUrl.port &&
    url.username === baseUrl.username &&
    url.password === baseUrl.password
  );
}

export function resolve(url: string, mapUrl: URL, rootUrl: URL | null): string {
  if (url.startsWith("/"))
    return rootUrl
      ? new URL("." + url.slice(url[1] === "/" ? 1 : 0), rootUrl).href
      : url;
  return new URL(url, mapUrl).href;
}

/**
 * Rebase the given URL to the baseURL and rootURL
 * 
 * @param url URL to rebase
 * @param baseUrl Import map baseUrl
 *                URLs will be based relative to this path if the same origin as the URL.
 * @param rootUrl Optional URL ending in / of the root HTML URL.
 *                When provided and possible, will be used as the base of the form '/...'
 * @returns relative URL string
 */
export function rebase(url: string, baseUrl: URL, rootUrl: URL | null = null) {
  let resolved;
  if (url.startsWith("/") || url.startsWith("//")) {
    if (rootUrl === null) return url;
    resolved = new URL(url, rootUrl);
  } else {
    resolved = new URL(url, baseUrl);
  }
  if (rootUrl && resolved.href.startsWith(rootUrl.href))
    return resolved.href.slice(rootUrl.href.length - 1);
  if (rootUrl && rootUrl.href.startsWith(resolved.href)) {
    // edge-case
    return "/" + relative(resolved, rootUrl);
  }
  if (sameOrigin(resolved, baseUrl)) return relative(resolved, baseUrl);
  return resolved.href;
}

export function relative(url: URL, baseUrl: URL) {
  const baseUrlPath = baseUrl.pathname;
  const urlPath = url.pathname;
  const minLen = Math.min(baseUrlPath.length, urlPath.length);
  let sharedBaseIndex = -1;
  for (let i = 0; i < minLen; i++) {
    if (baseUrlPath[i] !== urlPath[i]) break;
    if (urlPath[i] === "/") sharedBaseIndex = i;
  }
  const backtracks =
    baseUrlPath.slice(sharedBaseIndex + 1).split("/").length - 1;
  return (
    (backtracks ? "../".repeat(backtracks) : "./") +
    urlPath.slice(sharedBaseIndex + 1) +
    url.search +
    url.hash
  );
}

export function isURL(specifier: string) {
  try {
    if (specifier[0] === "#") return false;
    new URL(specifier);
  } catch {
    return false;
  }
  return true;
}

export function isPlain(specifier: string) {
  return !isRelative(specifier) && !isURL(specifier);
}

export function isRelative(specifier: string) {
  return (
    specifier.startsWith("./") ||
    specifier.startsWith("../") ||
    specifier.startsWith("/")
  );
}
