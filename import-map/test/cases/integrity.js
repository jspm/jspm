import assert, { strictEqual, deepStrictEqual } from 'assert';
import { ImportMap } from '@jspm/import-map';

{
  const map = new ImportMap({
    map: {
      integrity: {
        'a': 'a integrity',
        'b': 'b integrity'
      }
    }
  });

  map.setIntegrity('./c', 'c integrity');

  strictEqual(map.getIntegrity('c'), 'c integrity');
  strictEqual(map.getIntegrity('./c'), 'c integrity');

  map.setIntegrity('c', 'new c integrity');
  strictEqual(map.getIntegrity('./c'), 'new c integrity');

  map.rebase();
  deepStrictEqual(map.toJSON(), {
    integrity: {
      './a': 'a integrity',
      './b': 'b integrity',
      './c': 'new c integrity'
    }
  });
}
