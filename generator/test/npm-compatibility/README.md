# NPM Compatibility

We want to match the behaviour of `npm` for installs and updates, for better
ecosystem alignment. The main question is: when does a primary/secondary
dependency's version get bumped? This obviously depends on the constraint in
your `package.json`, and what version (if any) is already installed in your
`package-lock.json`. Since `@jspm/generator` doesn't currently have a lockfile,
we treat all top-level `"imports"` in your map as primary dependencies, and any
transitive dependencies in your `"scopes"` as secondary dependencies.

The package we're using for testing this stuff is `wayfarer@6.6.2`, since it
has a single dependency on `xtend@^4.0.1`, and multiple versions in the `6.6.x`
range. To see the behaviour for your current version of `npm`, you can run
`./npm-behaviour.sh`. Each of the four cases below has a corresponding test
against the generator to catch regressions.


## Test Cases

### `npm install <primary>`

Primary in range: *bumped to latest in range*
Primary out of range: *bumped to latest in range*
Secondary in range: *kept at current version*
Secondary out of range: *bumped to latest in range*
Primary not latest, secondary in range: *primary bumped, secondary kept*
Primary not latest, secondary out range: *primary bumped, secondary bumped*
 
### `npm install`

Primary in range: *kept at current version*
Primary out of range: *bumped to latest in range*
Secondary in range: *kept at current version*
Secondary out of range: *bumped to latest in range*
Primary not latest, secondary in range: *primary kept, secondary kept*
Primary not latest, secondary out range: *primary kept, secondary bumped*

### `npm update <primary>`

Primary in range: *bumped to latest in range*
Primary out of range: *bumped to latest in range*
Secondary in range: *kept at current version*
Secondary out of range: *bumped to latest in range*
Primary not latest, secondary in range: *primary bumped, secondary kept*
Primary not latest, secondary out range: *primary bumped, secondary bumped*

### `npm update`

Primary in range: *bumped to latest in range*
Primary out of range: *bumped to latest in range*
Secondary in range: *bumped to latest in range*
Secondary out of range: *bumped to latest in range*
Primary not latest, secondary in range: *primary bumped, secondary bumped*
Primary not latest, secondary out range: *primary bumped, secondary bumped*


## Common Rules

An argumentless `update` bumps the versions of everything to latest compatible.

An argumentless `install` bumps everything that is out-of-range to latest
compatible.

An intentful `install <pkg>`, always bumps the primary to latest compatible, 
and bumps the secondaries only if they're out of range. An intentful
`update <pkg>` has exactly the same behaviour.
