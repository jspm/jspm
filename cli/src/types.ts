import type { Generator } from "@jspm/generator";

export type IImportMap = ReturnType<Generator["getMap"]>;

// JSPM adds a non-standard "env" field to import maps, which is used to
// specify the environment that the import map was generated for. This is a
// deliberate choice to make sure users are aware of the fact that import maps
// are environment-specific:
export type IImportMapJspm = IImportMap & { env?: string[] };
