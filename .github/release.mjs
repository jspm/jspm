import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const packages = read('package.json').workspaces.map(dir => ({
  dir,
  ...read(`${dir}/package.json`)
}));
const run = (cmd, ...args) =>
  execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const git = (...args) => run('git', ...args);
const published = (name, version) => {
  try {
    return run('npm', 'view', `${name}@${version}`, 'version');
  } catch {
    return '';
  }
};
const fail = msg => {
  console.error(msg);
  process.exit(1);
};

// The CLI tag is the bare version, every other package tags as name@version
const tagOf = (name, version) => (name === 'jspm' ? version : `${name}@${version}`);
const parseTag = tag => {
  const at = tag.lastIndexOf('@');
  return at > 0
    ? { name: tag.slice(0, at), version: tag.slice(at + 1) }
    : { name: 'jspm', version: tag };
};
const semver = v => /^\d+\.\d+\.\d+$/.test(v) && v.split('.').map(Number);
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const byName = name => packages.find(p => p.name === name) ?? fail(`Unknown package ${name}`);

const prevTag = (name, version) =>
  git('tag', '-l', name === 'jspm' ? '[0-9]*' : `${name}@*`)
    .split('\n')
    .map(tag => ({ tag, v: semver(parseTag(tag).version) }))
    .filter(t => t.v && cmp(t.v, semver(version)) < 0)
    .sort((a, b) => cmp(b.v, a.v))[0]?.tag ?? '';

const repo = process.env.GITHUB_REPOSITORY ?? 'jspm/jspm';
const isReleaseCommit = subject => /^(\S+@)?\d+\.\d+\.\d+(\s|$)/.test(subject);

const [cmd, arg] = process.argv.slice(2);
switch (cmd) {
  case 'dir':
    console.log(byName(arg).dir);
    break;

  // Package name or tag -> GITHUB_OUTPUT lines, verifying a tag against the workspace version
  case 'info': {
    const isTag = /^\d/.test(arg) || arg.lastIndexOf('@') > 0;
    const { name, version } = isTag ? parseTag(arg) : { name: arg };
    const pkg = byName(name);
    if (isTag && pkg.version !== version)
      fail(`Tag ${arg} does not match ${pkg.dir}/package.json version ${pkg.version}`);
    if (!semver(pkg.version)) fail(`Unsupported version ${pkg.version}`);
    console.log(
      `name=${name}\nversion=${pkg.version}\ndir=${pkg.dir}\ntag=${tagOf(name, pkg.version)}\nprev=${prevTag(name, pkg.version)}\npublished=${published(name, pkg.version)}`
    );
    break;
  }

  // Point a package's workspace dependencies at the versions it is developed against
  case 'sync-deps': {
    const pkg = byName(arg);
    const json = read(`${pkg.dir}/package.json`);
    for (const dep of packages)
      if (json.dependencies?.[dep.name]) json.dependencies[dep.name] = `^${dep.version}`;
    writeFileSync(new URL(`${pkg.dir}/package.json`, root), JSON.stringify(json, null, 2) + '\n');
    break;
  }

  // Release notes from the package directory's own history since its previous tag
  case 'notes': {
    const pkg = byName(arg);
    const tag = tagOf(pkg.name, pkg.version);
    const prev = prevTag(pkg.name, pkg.version);
    const lines = git('log', '--format=%s', prev ? `${prev}..HEAD` : 'HEAD', '--', pkg.dir)
      .split('\n')
      .filter(subject => subject && !isReleaseCommit(subject))
      .map(
        subject => '* ' + subject.replace(/\(#(\d+)\)$/, `(https://github.com/${repo}/pull/$1)`)
      );
    console.log(lines.join('\n'));
    if (prev)
      console.log(`\n**Full Changelog**: https://github.com/${repo}/compare/${prev}...${tag}`);
    break;
  }

  // Tags for every package whose version changed since the given commit
  case 'changed': {
    try {
      git('cat-file', '-e', `${arg}^{commit}`);
    } catch {
      break;
    }
    for (const pkg of packages) {
      let before;
      try {
        before = JSON.parse(git('show', `${arg}:${pkg.dir}/package.json`)).version;
      } catch {}
      if (before !== pkg.version && semver(pkg.version)) console.log(tagOf(pkg.name, pkg.version));
    }
    break;
  }

  default:
    fail('Usage: release.mjs dir|info|sync-deps|notes <package> | changed <commit>');
}
