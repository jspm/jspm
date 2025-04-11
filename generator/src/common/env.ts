export const isWindows = globalThis.process?.platform === "win32";

export const PATH = isWindows
  ? Object.keys(globalThis.process?.env).find((e) =>
      Boolean(e.match(/^PATH$/i))
    ) || "Path"
  : "PATH";

export const PATHS_SEP = globalThis.process?.platform === "win32" ? ";" : ":";
