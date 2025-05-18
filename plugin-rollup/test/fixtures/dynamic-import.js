import assert from 'assert';

import('chalk').then(({ default: chalk }) => {
  assert.strictEqual(chalk.red('test'), ``);
});