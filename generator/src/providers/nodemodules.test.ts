import { createProvider } from '@jspm/generator/providers/nodemodules.js';
import assert from 'assert';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = await mkdtemp(join(tmpdir(), 'jspm-nodemodules-test-'));
try {
  // Set up a fixture directory structure:
  //   package.json
  //   src/
  //     index.js
  //     utils/
  //       helper.js
  //   node_modules/    <- should be excluded
  //     dep/
  //       index.js
  //   .git/            <- should be excluded
  //     config
  await mkdir(join(dir, 'src', 'utils'), { recursive: true });
  await mkdir(join(dir, 'node_modules', 'dep'), { recursive: true });
  await mkdir(join(dir, '.git'), { recursive: true });
  await writeFile(join(dir, 'package.json'), '{}');
  await writeFile(join(dir, 'src', 'index.js'), '');
  await writeFile(join(dir, 'src', 'utils', 'helper.js'), '');
  await writeFile(join(dir, 'node_modules', 'dep', 'index.js'), '');
  await writeFile(join(dir, '.git', 'config'), '');

  const pkgUrl = `${pathToFileURL(dir)}/`;
  const provider = createProvider(pkgUrl, false);

  // getFileList should return all files except those under node_modules/ and .git/
  const fileList = await provider.getFileList!.call({} as any, pkgUrl);
  assert.ok(fileList instanceof Set, 'getFileList should return a Set');

  const files = [...fileList].sort();
  assert.deepStrictEqual(files, ['package.json', 'src/index.js', 'src/utils/helper.js']);

  // Second call should return the cached result (same reference)
  const fileList2 = await provider.getFileList!.call({} as any, pkgUrl);
  assert.strictEqual(fileList, fileList2, 'getFileList should return cached result');

  console.log('nodemodules getFileList: all tests passed');
} finally {
  await rm(dir, { recursive: true });
}
