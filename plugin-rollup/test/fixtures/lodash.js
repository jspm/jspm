import sortBy from 'lodash/sortBy.js';
import assert from 'assert';

var users = [
  { 'user': 'fred',   'age': 48 },
  { 'user': 'barney', 'age': 36 },
  { 'user': 'fred',   'age': 40 },
  { 'user': 'barney', 'age': 34 }
];
 
assert(sortBy(users, [o => o.user])[0].user === 'barney');
