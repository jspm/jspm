import { isWindows } from "./env.js";

export interface SourceStyle {
  tab: string;
  newline: string;
  trailingNewline: string;
  indent: string;
  quote: string;
}

export const defaultStyle = {
  tab: "  ",
  newline: isWindows ? "\r\n" : "\n",
  trailingNewline: isWindows ? "\r\n" : "\n",
  indent: "",
  quote: '"',
};

export function detectNewline(source: string) {
  let newLineMatch = source.match(/\r?\n|\r(?!\n)/);
  if (newLineMatch) return newLineMatch[0];
  return isWindows ? "\r\n" : "\n";
}

export function detectIndent(source: string, newline: string) {
  let indent: string | undefined = undefined;
  // best-effort tab detection
  // yes this is overkill, but it avoids possibly annoying edge cases
  let lines = source.split(newline);
  for (const line of lines) {
    const curIndent = line.match(/^\s*[^\s]/);
    if (curIndent && (indent === undefined || curIndent.length < indent.length))
      indent = curIndent[0].slice(0, -1);
  }
  indent = indent || "";
  lines = lines.map((line) => line.slice(indent!.length));
  let tabSpaces = lines.map((line) => line.match(/^[ \t]*/)?.[0] || "") || [];
  let tabDifferenceFreqs = new Map<number, number>();
  let lastLength = 0;
  tabSpaces.forEach((tabSpace) => {
    let diff = Math.abs(tabSpace.length - lastLength);
    if (diff !== 0)
      tabDifferenceFreqs.set(diff, (tabDifferenceFreqs.get(diff) || 0) + 1);
    lastLength = tabSpace.length;
  });
  let bestTabLength = 0;
  for (const tabLength of tabDifferenceFreqs.keys()) {
    if (
      !bestTabLength ||
      tabDifferenceFreqs.get(tabLength)! >=
        tabDifferenceFreqs.get(bestTabLength)!
    )
      bestTabLength = tabLength;
  }
  // having determined the most common spacing difference length,
  // generate samples of this tab length from the end of each line space
  // the most common sample is then the tab string
  let tabSamples = new Map<string, number>();
  tabSpaces.forEach((tabSpace) => {
    let sample = tabSpace.substr(tabSpace.length - bestTabLength);
    tabSamples.set(sample, (tabSamples.get(sample) || 0) + 1);
  });
  let bestTabSample = "";
  for (const [sample, freq] of tabSamples) {
    if (!bestTabSample || freq > tabSamples.get(bestTabSample)!)
      bestTabSample = sample;
  }
  if (
    lines.length < 5 &&
    lines.reduce((cnt, line) => cnt + line.length, 0) < 100
  )
    bestTabSample = "  ";
  return { indent: indent || "", tab: bestTabSample };
}

export function detectStyle(source: string): SourceStyle {
  let style = Object.assign({}, defaultStyle);

  style.newline = detectNewline(source);

  let { indent, tab } = detectIndent(source, style.newline);
  style.indent = indent;
  style.tab = tab;

  let quoteMatch = source.match(/"|'/);
  if (quoteMatch) style.quote = quoteMatch[0];

  style.trailingNewline =
    source && source.match(new RegExp(style.newline + "$"))
      ? style.newline
      : "";

  return style;
}
