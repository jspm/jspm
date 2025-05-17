import type { Generator } from '@jspm/generator';

export type IImportMap = ReturnType<Generator['getMap']>;

// JSPM supports an optional a non-standard "env" field to import maps, which
// when set, is used to specify the environment that the import map was generated
// for.
export type IImportMapJspm = IImportMap & { env?: string[] };
