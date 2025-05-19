import { cli } from '../dist/cli.js';

const commands = ['init', 'ls', 'install', 'serve', 'build', 'deploy', 'auth', 'clear-cache'];

for (const command of commands) {
  console.log(`## ${command.split('-').map(part => part[0].toUpperCase() + part.slice(1)).join(' ')}`);
  cli.parse(['node', 'jspm', command, '--help']);
}
