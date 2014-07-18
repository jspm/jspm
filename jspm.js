#!/usr/bin/env node
/*
 *   Copyright 2014 Guy Bedford (http://guybedford.com)
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

var ui = require('./lib/ui');
var config = require('./lib/config');
var pkg = require('./lib/package');
var core = require('./lib/core');
var bundle = require('./lib/bundle');
var semver = require('./lib/semver');

var build = require('./lib/build');

process.on('uncaughtException', function(err) {
  ui.log('err', err.stack || err);
});

if (require.main !== module)
  return;

(function() {
  function showInstructions() {
    ui.log('\n'
      + '  \033[47m\033[1m      \033[0m\n'
      + '  \033[47m\033[93m\033[1m jspm \033[0m\033[90m  '
      + 'Browser Package Management'
      + ' \033[0m\n'
      + '  \033[47m\033[1m      \033[0m\n'
      + '\n'
      + 'jspm install <name[=version]> [-o {package override}] [-f --force] \n'
      + '  install                         Install / update from package.json\n'
      + '  install jquery                  Install a package from the registry\n'
      + '  install npm:underscore          Install latest version from NPM\n'
      + '  install jquery@1.1              Install latest minor version\n'
      + '  install jquery@1.1.1            Install an exact version\n'
      + '  install jquery npm:underscore   Install multiple packages\n'
      + '  install jquery=1.1.1            Install a package to a specific version\n'
      + '  install jquery@1.2=1.2.3        Install a version range to a specific version\n'
      + '\n'
      + 'jspm inject <name[=version]> [-o {package override}] [-f --force] \n'
      + '  inject jquery                   Identical to install, but injects config\n'
      + '                                  only instead of downloading the package\n'
      + '\n'
      + 'jspm uninstall name               Uninstall a package and any orphaned deps\n'
      + '\n'
      + 'jspm update [-f -force]           Check and update existing modules\n'
      + '\n'
      + 'jspm init                         Create / recreate the configuration file\n'
      + '\n'
      + 'jspm dl-loader                    Download the jspm browser loader\n'
      + '\n'
      + 'jspm setmode <mode>\n'
      + '  setmode local                   Switch to locally downloaded libraries\n'
      + '  setmode remote                  Switch to CDN external package sources\n'
      + '  setmode dev                     Switch to the development baseURL\n'
      + '  setmode production              Switch to the production baseURL\n'
      + '\n'
      + ''
      + 'jspm depcache [moduleName]        Stores dep cache in config for flat pipelining\n'
      + 'jspm bundle [moduleName] [file]   Creates a single-file bundle for a module\n'
      + '\n'
      + 'jspm config <property> <value>    Set global configuration\n'
      + '  config github.username githubusername \n'
      + '  config github.password githubpassword \n'
    );
  }

  var args = process.argv.splice(2);
  switch(args[0]) {
    case 'inject':
      var inject = true;

    case 'install':
      var options = readOptions(args, ['--force', '--https', '--override']);
      options.inject = inject;

      var args = options.args;

      var depMap;
      for (var i = 1; i < (options.override || args.length); i++) {
        depMap = depMap || {};
        var name, target;
        var arg = args[i];
        if (arg.indexOf('=') == -1) {
          // install jquery@1.2.3 -> install jquery=^1.2.3
          name = arg.split('@')[0];
          target = arg.split('@')[1] || '';

          // valid semver -> make semver compatibility default
          if (target && target.match(semver.semverRegEx))
            target = '^' + target;
        }
        else {
          name = arg.split('=')[0];
          target = arg.split('=')[1];
        }
        depMap[name] = target;
      }

      if (options.override)
        options.override = eval('(' + args.splice(options.override).join(' ') + ')');

      if (options.https)
        pkg.https = true;

      // no install package -> install from package.json dependencies
      (depMap ? core.install(depMap, options) : core.install(true, options))
      .then(function() {
        return core.checkDlLoader()
      })
      .then(function() {
        return core.setMode(inject ? 'remote' : 'local')
      })
      .then(function() {
        ui.log('');
        ui.log('ok', 'Install complete');
        process.exit();
      }, function(err) {
        // something happened (cancel / err)
        ui.log('err', err.stack || err);
        ui.log('warn', 'Installation changes not saved');
        process.exit(1);
      });

    break;
    case 'update':
      var options = readOptions(args, ['--force', '--https']);

      core.install(true, options)
      .then(function() {
        ui.log('');
        ui.log('ok', 'Update complete');
      }, function(err) {
        ui.log('err', err.stack || err);
        ui.log('warn', 'Update changes not saved');
        process.exit(1);
      });

    break;

    case 'uninstall':
      core.uninstall(args.splice(1))
      .then(function(removed) {
        if (removed) {
          ui.log('');
          ui.log('ok', 'Uninstall complete');
        }
        else
          ui.log('info', 'Nothing to remove');
      }, function(err) {
        ui.log('err', err.stack || err);
        ui.log('warn', 'Uninstall changes not saved');
        process.exit(1);
      });
    break;

    case 'clean':
      core.clean();

    break;

    case 'init':
      core.init();
    break; 

    case 'prune':
      core.prune();
    break;


    case 'dl-loader':
      core.dlLoader();
    break;

    case 'setmode':
      core.setMode(args[1]);
    break;

    case 'depcache':
      bundle.depCache(args[1]);
    break;

    case 'bundle':
      if (args.length < 2) {
        ui.log('warn', 'No main entry point is provided, please specify the module to build');
      }
      else {
        var secondLastArg = args[args.length - 2].trim();
        var signChar = secondLastArg.substr(secondLastArg.length - 1, 1);

        // we can write: jspm bundle app + other
        if (["+", "-"].indexOf(signChar) != -1) {
          bundle.bundle(args.splice(1, args.length - 1).join(' '));
        }
        // or we can write: jspm bundle app + other out.js
        else {
          bundle.bundle(args.splice(1, args.length - 2).join(' '), args[args.length - 1]);
        }
      }
    break;

    case 'build':
      core.build()
    break;



    case 'compile':
      var options = readOptions(args, ['--transpile', '--minify', '--removeJSExtensions'], ['--map', '--format']);
      if (options.map) {
        var mapParts = options.map.split('=');
        options.map = {};
        options.map[mapParts[0]] = mapParts[1];
      }

      build.compileDir(args[1], options)
      .then(function() {
        ui.log('ok', 'Compilation complete');
      }, function(e) {
        ui.log('err', e.stack || e);
      });

    break;
    case 'config':
      var property = args[1];
      var value = args.splice(2).join(' ');
      config.set(property, value);

    break;
    case '--help':
    case '-h':
      showInstructions();
    
    break;
    default:
      if (args[0])
        ui.log('Invalid argument ' + args[0]);
      showInstructions();
  }
})();

function readOptions(args, flags, settings) {
  settings = settings || [];
  var argOptions = { args: [] };
  for (var i = 0; i < args.length; i++) {
    if (args[i].substr(0, 2) == '--') {
      for (var j = 0; j < flags.length; j++)
        if (flags[j] == args[i])
          argOptions[flags[j].substr(2)] = i;
      for (var j = 0; j < settings.length; j++)
        if (settings[j] == args[i])
          argOptions[settings[j].substr(2)] = args[++i];
    }
    else if (args[i].substr(0, 1) == '-') {
      var opts = args[i].substr(1);
      for (var j = 0; j < opts.length; j++) {
        for (var k = 0; k < flags.length; k++) {
          if (flags[k].substr(2, 1) == opts[j])
            argOptions[flags[k].substr(2)] = argOptions.args.length;
        }
      }
    }
    else
      argOptions.args.push(args[i]);
  }
  return argOptions;
}

