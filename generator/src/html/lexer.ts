let source: string, i: number;

export interface ParsedTag {
  tagName: string;
  start: number;
  end: number;
  attributes: ParsedAttribute[];
  innerStart: number;
  innerEnd: number;
}

export interface ParsedAttribute {
  nameStart: number;
  nameEnd: number;
  valueStart: number;
  valueEnd: number;
}

const alwaysSelfClosing = ["link", "base"];

export function parseHtml(
  _source: string,
  tagNames: string[] = ["script", "link", "base", "!--"]
) {
  const scripts: ParsedTag[] = [];
  source = _source;
  i = 0;

  let curScript: ParsedTag = {
    tagName: undefined,
    start: -1,
    end: -1,
    attributes: [],
    innerStart: -1,
    innerEnd: -1,
  };
  while (i < source.length) {
    while (source.charCodeAt(i++) !== 60 /*<*/)
      if (i === source.length) return scripts;
    const start = i - 1;
    const tagName = readTagName()?.toLowerCase();
    if (tagName === "!--") {
      while (
        source.charCodeAt(i) !== 45 /*-*/ ||
        source.charCodeAt(i + 1) !== 45 /*-*/ ||
        source.charCodeAt(i + 2) !== 62 /*>*/
      )
        if (++i === source.length) return scripts;
      scripts.push({
        tagName: "!--",
        start: start,
        end: i + 3,
        attributes: [],
        innerStart: start + 3,
        innerEnd: i,
      });
      i += 3;
    } else if (tagName === undefined) {
      return scripts;
    } else if (tagNames.includes(tagName)) {
      curScript.tagName = tagName;
      curScript.start = i - tagName.length - 2;
      const attributes = curScript.attributes;
      let attr;
      while ((attr = scanAttr())) attributes.push(attr);
      let selfClosing = alwaysSelfClosing.includes(tagName);
      if (
        source.charCodeAt(i - 2) === 47 /*/*/ &&
        source.charCodeAt(i - 1) === 62 /*>*/
      )
        selfClosing = true;
      if (selfClosing) {
        curScript.end = i;
      } else {
        curScript.innerStart = i;
        while (true) {
          while (source.charCodeAt(i++) !== 60 /*<*/)
            if (i === source.length) return scripts;
          const tag = readTagName();
          if (tag === undefined) return scripts;
          if (tag === `/${curScript.tagName}`) {
            curScript.innerEnd = i - 8;
            while (scanAttr());
            curScript.end = i;
            break;
          }
        }
      }
      scripts.push(curScript);
      curScript = {
        tagName: undefined,
        start: -1,
        end: -1,
        attributes: [],
        innerStart: -1,
        innerEnd: -1,
      };
    } else {
      while (scanAttr());
    }
  }
  return scripts;
}

function readTagName(): string | null {
  let start = i;
  let ch;
  while (!isWs((ch = source.charCodeAt(i++))) && ch !== 62 /*>*/)
    if (i === source.length) return null;
  return source.slice(start, ch === 62 ? --i : i - 1);
}

function scanAttr(): ParsedAttribute | null {
  let ch;
  while (isWs((ch = source.charCodeAt(i))))
    if (++i === source.length) return null;
  if (
    ch === 62 /*>*/ ||
    (ch === 47 /*/*/ && (ch = source.charCodeAt(++i)) === 62) /*>*/
  ) {
    i++;
    return null;
  }
  const nameStart = i;
  while (!isWs((ch = source.charCodeAt(i++))) && ch !== 61 /*=*/) {
    if (i === source.length) return null;
    if (ch === 62 /*>*/) {
      if (nameStart + 2 === i && source.charCodeAt(nameStart) === 47 /*/*/)
        return null;
      return { nameStart, nameEnd: --i, valueStart: -1, valueEnd: -1 };
    }
  }
  const nameEnd = i - 1;
  if (ch !== 61 /*=*/) {
    while (isWs((ch = source.charCodeAt(i))) && ch !== 61 /*=*/) {
      if (++i === source.length) return null;
      if (ch === 62 /*>*/) return null;
    }
    if (ch !== 61 /*=*/)
      return { nameStart, nameEnd, valueStart: -1, valueEnd: -1 };
  }
  while (isWs((ch = source.charCodeAt(i++)))) {
    if (i === source.length) return null;
    if (ch === 62 /*>*/) return null;
  }
  if (ch === 34 /*"*/) {
    const valueStart = i;
    while (source.charCodeAt(i++) !== 34 /*"*/)
      if (i === source.length) return null;
    return { nameStart, nameEnd, valueStart, valueEnd: i - 1 };
  } else if (ch === 39 /*'*/) {
    const valueStart = i;
    while (source.charCodeAt(i++) !== 39 /*'*/)
      if (i === source.length) return null;
    return { nameStart, nameEnd, valueStart, valueEnd: i - 1 };
  } else {
    const valueStart = i - 1;
    i++;
    while (!isWs((ch = source.charCodeAt(i))) && ch !== 62 /*>*/)
      if (++i === source.length) return null;
    return { nameStart, nameEnd, valueStart, valueEnd: i };
  }
}

export function isWs(ch) {
  return ch === 32 || (ch < 14 && ch > 8);
}

// function logScripts (source: string, scripts: ParsedTag[]) {
//   for (const script of scripts) {
//     for (const { nameStart, nameEnd, valueStart, valueEnd } of script.attributes) {
//       console.log('Name: ' + source.slice(nameStart, nameEnd));
//       if (valueStart !== -1)
//         console.log('Value: ' + source.slice(valueStart, valueEnd));
//     }
//     console.log('"' + source.slice(script.innerStart, script.innerEnd) + '"');
//     console.log('"' + source.slice(script.start, script.end) + '"');
//   }
// }
