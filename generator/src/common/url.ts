declare global {
  // @ts-ignore
  var document: any;
  // @ts-ignore
  var location: any;
}

export function isFetchProtocol(protocol) {
  return (
    protocol === "file:" ||
    protocol === "https:" ||
    protocol === "http:" ||
    protocol === "data:"
  );
}

export let baseUrl: URL;
// @ts-ignore
if (typeof Deno !== "undefined") {
  // @ts-ignore
  const denoCwd = Deno.cwd();
  baseUrl = new URL(
    "file://" + (denoCwd[0] === "/" ? "" : "/") + denoCwd + "/"
  );
} else if (typeof process !== "undefined" && process.versions.node) {
  baseUrl = new URL("file://" + process.cwd() + "/");
} else if ((typeof document as any) !== "undefined") {
  baseUrl = new URL(document.baseURI);
}
if (!baseUrl && typeof location !== "undefined") {
  baseUrl = new URL(location.href);
}
baseUrl.search = baseUrl.hash = "";

export function resolveUrl(
  url: string,
  mapUrl: URL,
  rootUrl: URL | null
): string {
  if (url.startsWith("/"))
    return rootUrl
      ? new URL("." + url.slice(url[1] === "/" ? 1 : 0), rootUrl).href
      : url;
  return new URL(url, mapUrl).href;
}

export function importedFrom(parentUrl?: string | URL) {
  if (!parentUrl) return "";
  return ` imported from ${parentUrl}`;
}

function matchesRoot(url: URL, baseUrl: URL) {
  return (
    url.protocol === baseUrl.protocol &&
    url.host === baseUrl.host &&
    url.port === baseUrl.port &&
    url.username === baseUrl.username &&
    url.password === baseUrl.password
  );
}

export function relativeUrl(url: URL, baseUrl: URL, absolute = false) {
  const href = url.href;
  let baseUrlHref = baseUrl.href;
  if (!baseUrlHref.endsWith("/")) baseUrlHref += "/";
  if (href.startsWith(baseUrlHref))
    return (absolute ? "/" : "./") + href.slice(baseUrlHref.length);
  if (!matchesRoot(url, baseUrl)) return url.href;
  if (absolute) return url.href;
  const baseUrlPath = baseUrl.pathname;
  const urlPath = url.pathname;
  const minLen = Math.min(baseUrlPath.length, urlPath.length);
  let sharedBaseIndex = -1;
  for (let i = 0; i < minLen; i++) {
    if (baseUrlPath[i] !== urlPath[i]) break;
    if (urlPath[i] === "/") sharedBaseIndex = i;
  }
  return (
    "../".repeat(baseUrlPath.slice(sharedBaseIndex + 1).split("/").length - 1) +
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

export function urlToNiceStr(url: string) {
  if (url.startsWith(baseUrl.href))
    return "./" + url.slice(baseUrl.href.length);
}
