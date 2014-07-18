jspm CLI
===

Browser package management with modular dependency and version management.
https://jspm.io

* Installs version-managed modular packages along with their dependencies from any jspm endpoint, currently supporting GitHub, npm and the [jspm Registry](https://github.com/jspm/registry).
* Carefully resolves version ranges within semver compatibility clearly verifying any version forks.
* Creates the [SystemJS](https://github.com/systemjs/systemjs) version configuration file for the package.
* Supports [working with ES6 modules](#compiling-application-code).

[Build into a bundle](#1-creating--bundle) or [inject a flat dependency tree for flat multiplexing](#2-creating--dependency-cache) in production.

### Example

```
  jspm install npm:voxel-demo

No package.json found, would you like to create one? [yes]: 
Enter packages folder [jspm_packages]: 
Enter config file path [config.js]: 
Configuration file config.js not found, create it? [y]: 

     Checking versions for npm:voxel-demo
     Downloading npm:voxel-demo@0.0.1
     Checking versions for npm:gl-now
     Checking versions for npm:gl-tile-map
     Checking versions for npm:gl-vao
     Checking versions for npm:gl-buffer
     Checking versions for npm:gl-matrix
     Checking versions for npm:ndarray
     Checking versions for npm:ndarray-fill
     Checking versions for npm:ndarray-ops
     Checking versions for npm:ao-mesher
     Checking versions for npm:ao-shader
     Checking versions for npm:gl-shader
     Checking versions for github:jspm/nodelibs
     Downloading npm:gl-now@0.0.4
     Downloading npm:gl-tile-map@0.3.0
     Downloading npm:gl-buffer@0.1.2
     Downloading npm:gl-matrix@2.0.0
     Downloading npm:gl-vao@0.0.3
     Downloading github:jspm/nodelibs@0.0.2
     Downloading npm:ndarray-fill@0.1.0
     Downloading npm:ao-shader@0.2.3
     Downloading npm:ndarray-ops@1.1.1
     ...
```

The above populates a `jspm_packages` folder in the current directory, and generates a `config.js` file containing the SystemJS loader configuration.

We can load this demo with:

```html
<!doctype html>
  <script src="jspm_packages/system@0.6.js"></script>
  <script src="config.js"></script>
  <script>
    System.import('npm:voxel-demo')
    .catch(function(e) {
      setTimeout(function() {
        throw e;
      });
    });
  </script>
```


## Getting Started

1. Install jspm CLI:

  ```
    npm install jspm -g
  ```

2. Create a project:

  ```
  cd my-project
  jspm init
    
  No package.json found, would you like to create one? [yes]: 
  Enter packages folder [jspm_packages]: 
  Enter config file path [config.js]: 
  Configuration file config.js not found, create it? [y]: 
  ok   Loader files downloaded successfully
  ok   Verified package.json at package.json
       Verified config file at config.js
  ```
  
  The application name is used to require anything from the application code folder `lib`, instead of from the jspm registry.
  
  A require to `app/main` will load `lib/main.js` in this example.

  Sets up the package.json and configuration file.
  
3. Download the SystemJS loader files

  ```
    jspm dl-loader
    
     Downloading loader files to jspm_packages
       system@0.4.js
       es6-module-loader@0.4.1.js
       traceur@0.0.10.js
  ```

4. Install any packages from the jspm Registry, GitHub or npm:

  ```
    jspm install npm:lodash-node
    jspm install github:components/jquery
    jspm install jquery
  ```
  
  Any npm or Github package can be installed in this way.
  
  Most npm packages will install without any configuration necessary. Github packages may need to be configured for jspm first. [Read the guide here on configuring packages for jspm](https://github.com/jspm/registry/wiki/Configuring-Packages-for-jspm).
  
  All installs are saved into the package.json, so that the jspm_packages folder and configuration file can be entirely recreated with a single `jspm install` call with no arguments. This is ideal for version-controlled projects where third party packages aren't saved in the repo itself.
  
  The config.js file is updated with the version information and the version is locked down.

5. In an HTML page include the downloaded SystemJS loader along with the automatically generated configuration file (`config.js`), then load the modules:

  ```html
  <script src="jspm_packages/system@0.4.js"></script>
  <script src="config.js"></script>
  <script>
    System.import('npm:lodash-node/modern/objects/isEqual').then(function(isEqual) {
    });
    
    System.import('github:components/jquery').then(function($) {
    });
  
    System.import('jquery').then(function($) {
    });
  </script>
  ```

* Most npm modules should install without any additional configuration.
* Most Github modules that are not already in the [registry](https://github.com/jspm/registry), will need some package configuration in order to work correctly with `jspm install github:my/module`.

[Read the guide on configuring packages for jspm here](https://github.com/jspm/registry/wiki/Configuring-Packages-for-jspm).

_If you are having any trouble configuring a package for jspm, please just post an issue and we'll help get it configured._

## Installing

### Installing from the jspm Registry

```
  jspm install jquery
```

Automatically downloads and sets the configuration map for the loader.

This is equivalent to writing:

```
  jspm install jquery=github:components/jquery
```

The [jspm registry](https://github.com/jspm/registry) just provides a mapping from a name into an endpoint package name.

### Switching to CDN package sources

The npm and Github endpoints are both served by CDN, which is automatically configured in jspm.

We can switch the CDN version with a single command:

```
  jspm setmode remote
```

This updates the configuration to now load all the packages from the CDN directly instead of the `jspm_packages` folder. The app will still behave identically, but we retain the version-lock configuration.

Revert back to the local files with:

```
  jspm setmode local
```

### jspm inject

If using the CDN version, use `jspm inject` instead of `jspm install`. This will inject the configuration into `config.js` without
downloading the repo to `jspm_packages`, making it a quicker install.

```
  jspm inject jquery

     Looking up jquery in registry
     Checking versions for npm:jquery
ok   github:jspm/nodelibs@0.0.2 (0.0.2)
ok   Injected jquery as npm:jquery@^2.1.1 (2.1.1)
ok   Loader set to CDN library sources

ok   Install complete
```

Inject locks down exact versions allowing for a stable development environment.

### Update Installed Packages

```
  jspm update
```

All packages will be checked, and versions upgraded where necessary.

### Command Options

Use `-f` or `--force` with the install command to overwrite and redownload all dependencies.

Use `-h` or `--https` to download with https instead of alternative protocols.

Use `-o` or `--override` to force-set the package override for a package that needs extra configuration. See https://github.com/jspm/registry#testing-package-overrides.

## Production Workflows

There are two main workflows for production:
1. Compile into a bundle.
2. Cache the dependency tree for flat multiplexing via SPDY / HTTP2.

### 1. Creating a Bundle

```
  jspm bundle app/main build.js
```

Creates a file `build.js` containing `app/main` and all its dependencies.

We can then load this with a script tag in the page:

```html
<!doctype html>
  <script src="jspm_packages/system@0.6.js"></script>
  <script src="build.js"></script>
  <script>
    System.import('app/main')
    .catch(function(e) {
      setTimeout(function() {
        throw e;
      });
    });
  </script>
```

Note that bundles also support compiling ES6 code. To try out a demonstration of this, [clone the ES6 demo repo here](https://github.com/jspm/demo-es6).

### 2. Creating a Bundle excluding a dependency

```
  jspm bundle app/main - react build.js
```

Creates a file `build.js` containing `app/main` and all its dependencies (excluding react)

### 3. Creating a Bundle adding another dependency

```
  jspm bundle app/main + moment build.js
```

Creates a file `build.js` containing `app/main` and all its dependencies (adding moment)

### 4. Creating a Bundle both adding a dependency and excluding a dependency

```
  jspm bundle app/main - react + moment build.js
```

Creates a file `build.js` containing `app/main` and all its dependencies (excluding react / adding moment)

### 5. Creating a Dependency Cache

The jspm CDN uses SPDY, optimal cache headers, and minified files, making this workflow suitable for production use.

The remaining performance issue is the round trip latency required to load deep dependencies, as we only find out
the dependencies of a module once we have fetched that module, before fetching its dependencies in turn.

We can get around this by injecting the full dependency tree upfront into a dependency cache, so that all dependencies
can be fetched in parallel.

```
  jspm depcache app/main
```

The above will trace the full tree for `app/main` and inject it into the `config.js` **depCache**.

Now any imports will load the full tree in parallel, reducing the latency delay to one round trip.

### Rate Limits

To set GitHub authentication to avoid rate limits, enter your GitHub credentials with:

```
  jspm config github.username myusername
  jspm config github.password mypassword
```

### Further Reading

* Type `jspm --help` for command list.
* [Read the SystemJS documentation here](https://github.com/systemjs/systemjs).
* Add new items to the [jspm registry](https://github.com/jspm/registry) repo by providing a pull request.
* Read more on [configuring packages for jspm](https://github.com/jspm/registry/wiki/Configuring-Packages-for-jspm).

### License

Apache 2.0
