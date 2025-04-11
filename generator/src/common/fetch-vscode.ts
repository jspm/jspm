import { WrappedFetch, wrappedFetch } from "./fetch-common.js";
import { fetch as _fetch } from "./fetch-native.js";
export { clearCache } from "./fetch-native.js";

function sourceResponse(buffer) {
  return {
    status: 200,
    async text() {
      return buffer.toString();
    },
    async json() {
      return JSON.parse(buffer.toString());
    },
    arrayBuffer() {
      return buffer.buffer || buffer;
    },
  };
}

const dirResponse = {
  status: 200,
  async text() {
    return "";
  },
  async json() {
    throw new Error("Not JSON");
  },
  arrayBuffer() {
    return new ArrayBuffer(0);
  },
};

// @ts-ignore
const vscode = require("vscode");

export const fetch: WrappedFetch = wrappedFetch(async function (
  url: URL,
  opts?: Record<string, any>
) {
  const urlString = url.toString();
  const protocol = urlString.slice(0, urlString.indexOf(":") + 1);
  switch (protocol) {
    case "file:":
      if (urlString.endsWith("/")) {
        try {
          await vscode.workspace.fs.readFile(vscode.Uri.parse(urlString));
          return { status: 404, statusText: "Directory does not exist" };
        } catch (e) {
          if (e.code === "FileIsADirectory") return dirResponse;
          throw e;
        }
      }
      try {
        return sourceResponse(
          new TextDecoder().decode(
            await vscode.workspace.fs.readFile(vscode.Uri.parse(urlString))
          )
        );
      } catch (e) {
        if (e.code === "FileIsADirectory") return dirResponse;
        if (
          e.code === "Unavailable" ||
          e.code === "EntryNotFound" ||
          e.code === "FileNotFound"
        )
          return { status: 404, statusText: e.toString() };
        return { status: 500, statusText: e.toString() };
      }
    case "data:":
    case "http:":
    case "https:":
      // @ts-ignore
      return _fetch(url, opts);
  }
});
