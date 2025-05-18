import babel from '@babel/core';
import assert from 'assert';

const { code } = babel.transform(`export var p = 5;`);
assert.equal(code, 'export var p = 5;');
