import { cli } from '../dist/cli.js';

const commands = ['link', 'install', 'uninstall', 'update', 'clear-cache', 'config', 'build', 'deploy', 'provider', 'serve', 'ls'];

for (const command of commands) {
  console.log(`## ${command}`);
  cli.parse(['node', 'jspm', command, '--help']);
}
