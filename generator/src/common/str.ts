const wsRegEx = /^\s+/;

export class Replacer {
  source: string;
  offsetTable: [number, number][] = [];
  constructor(source: string) {
    this.source = source;
  }

  replace(start: number, end: number, replacement: string) {
    const startOffset = findOffset(this.offsetTable, start);
    const endOffset = findOffset(this.offsetTable, end);

    this.source =
      this.source.slice(0, start + startOffset) +
      replacement +
      this.source.slice(end + endOffset);
    addOffset(
      this.offsetTable,
      end,
      replacement.length - (end + endOffset - start - startOffset)
    );
  }

  remove(start: number, end: number, trimWs: boolean | RegExp = false) {
    this.replace(start, end, "");
    if (trimWs) {
      if (typeof trimWs === "boolean") trimWs = wsRegEx;
      const endIndex = this.idx(end);
      const [wsMatch] = this.source.slice(endIndex).match(trimWs) ?? [];
      this.source =
        this.source.slice(0, endIndex) +
        this.source.slice(endIndex + (wsMatch?.length ?? 0));
      addOffset(this.offsetTable, end, -(wsMatch?.length ?? 0));
    }
  }

  idx(idx: number) {
    return idx + findOffset(this.offsetTable, idx);
  }
}

function addOffset(
  offsetTable: [number, number][],
  idx: number,
  offset: number
) {
  let i = offsetTable.length,
    eq = false;
  while (i-- > 0) {
    const [offsetIdx] = offsetTable[i];
    if (offsetIdx < idx || (offsetIdx === idx && (eq = true))) break;
  }
  if (eq) offsetTable.splice(i, 1, [idx, offset + offsetTable[i][1]]);
  else offsetTable.splice(i + 1, 0, [idx, offset]);
}

function findOffset(offsetTable: [number, number][], idx: number) {
  let curOffset = 0;
  for (const [offsetIdx, offset] of offsetTable) {
    if (offsetIdx > idx) break;
    curOffset += offset;
  }
  return curOffset;
}
