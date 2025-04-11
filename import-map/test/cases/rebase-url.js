import { rebase } from '../../lib/url.js';
import assert from 'assert';

let url = 'file:///test/';
let mapUrl = new URL('file:///test/a/');
let rootUrl = new URL('file:///test/a/');
assert.equal(rebase(url, mapUrl, rootUrl), '/../');

url = 'file:///test/';
mapUrl = new URL('file:///test/a/');
rootUrl = new URL('file:///test/a/b/');
assert.equal(rebase(url, mapUrl, rootUrl), '/../../');
