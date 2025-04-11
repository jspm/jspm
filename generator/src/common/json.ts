import { JspmError } from "./err.js";
import { SourceStyle, detectStyle } from "./source-style.js";

export function parseStyled(
  source: string,
  fileName?: string
): { json: any; style: SourceStyle } {
  // remove any byte order mark
  if (source.startsWith("\uFEFF")) source = source.substr(1);

  let style = detectStyle(source);
  try {
    return { json: JSON.parse(source), style };
  } catch (e) {
    throw new JspmError(
      `Error parsing JSON file${fileName ? " " + fileName : ""}`
    );
  }
}

export function stringifyStyled(json: any, style: SourceStyle) {
  let jsonString = JSON.stringify(json, null, style.tab);

  return (
    style.indent +
    jsonString
      .replace(/([^\\])""/g, "$1" + style.quote + style.quote) // empty strings
      .replace(/([^\\])"/g, "$1" + style.quote)
      .replace(/\n/g, style.newline + style.indent) +
    (style.trailingNewline || "")
  );
}
