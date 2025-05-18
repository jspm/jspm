import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative } from 'node:path';
import { createInterface } from 'node:readline/promises';
import c from 'picocolors';
import {
  JspmError,
  exists,
  getGenerator,
  getLatestEsms,
  getPackageJson,
  isDirectory
} from './utils.ts';
import type { BaseFlags } from './cli.ts';
import { getOption } from './terminal-utils.ts';

/**
 * ProjectConfig interface representing validated package.json contents
 * with additional JSPM-specific fields
 */
export interface ProjectConfig {
  // Standard package.json fields
  name: string;
  version?: string;
  registry?: string;
  exports?: Record<string, string | Record<string, string>>;
  main?: string;
  files?: string[];
  ignore?: string[];
  description?: string;
  license?: string;
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  devDependencies: Record<string, string>;

  // Path to the project root directory
  projectPath: string;
}

/**
 * Interactive function to create or update a package.json
 *
 * @param dir Directory to create/update package.json in
 * @returns ProjectConfig object with the created package.json fields
 */
/**
 * Initialize a project by creating or updating package.json
 * @param directory optional directory argument from CLI
 * @param flags flags and options from CLI
 */
export async function initCreate(
  directory?: string,
  flags: BaseFlags = {}
): Promise<ProjectConfig> {
  // Use either explicit directory argument, the package flag, or current directory
  const projectDir = directory || (flags.dir ? flags.dir : process.cwd());

  await mkdir(projectDir, { recursive: true });

  // Check if package.json already exists
  const packageJsonPath = join(projectDir, 'package.json');
  let existingPackageJson: any = null;
  let mode = 'Creating';

  try {
    const content = await readFile(packageJsonPath, 'utf8');
    existingPackageJson = JSON.parse(content);
    mode = 'Updating';
  } catch (e) {}

  // Use readline for interactive prompts
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  let closed = false;
  readline.on('SIGINT', () => {
    process.exit(0);
  });

  try {
    if (!flags.quiet) {
      console.log(c.bold(`\n${mode} package.json in ${projectDir}\n`));
    }

    // Set default values based on existing package.json or directory name
    // Use basename to extract just the directory name, not the full path
    const defaultName =
      existingPackageJson?.name || basename(projectDir).replace(/[^a-zA-Z0-9-_]/g, '-');
    const defaultVersion = existingPackageJson?.version || '0.1.0';
    const defaultDescription = existingPackageJson?.description || '';

    // Handle exports/main for default entry point
    let defaultExport: string | false = 'src/index.js';
    if (existingPackageJson?.exports) {
      if (typeof existingPackageJson.exports === 'string') {
        defaultExport = existingPackageJson.exports.replace(/^\.\//, '');
      } else if (
        existingPackageJson.exports['.'] &&
        typeof existingPackageJson.exports['.'] === 'string'
      ) {
        defaultExport = existingPackageJson.exports['.'].replace(/^\.\//, '');
      } else {
        defaultExport = false;
      }
    } else if (existingPackageJson?.main) {
      defaultExport = existingPackageJson.main;
    }

    // Gather information from the user with existing values as defaults
    // Format defaults with bold but no highlight
    const name = await readline.question(
      `${c.cyan('Package Name: ')}${c.bold(`(${defaultName})`)} `
    );

    const version = await readline.question(
      `${c.cyan('Version: ')}${c.bold(`(${defaultVersion})`)} `
    );

    const description = await readline.question(
      `${c.cyan('Description: ')}${defaultDescription ? c.bold(`(${defaultDescription})`) : ''} `
    );

    // Initialize variables for optional features
    let useTypeScript = false;
    let createdAiFile: string | null = null;
    let shouldCreateHtml = false;
    let shouldCreateGitignore = false;

    // Only ask about TypeScript, claude.md, and HTML example for new projects
    if (mode === 'Creating') {
      // Ask if TypeScript should be enabled
      const enableTypeScript = await readline.question(
        `${c.cyan('Enable TypeScript with type stripping? ')}${c.bold('(y/n)')} `
      );
      useTypeScript =
        enableTypeScript.toLowerCase() === 'y' ||
        enableTypeScript.toLowerCase() === 'yes' ||
        enableTypeScript === '';
    }

    // Ask for exports entry point - always asked regardless of new/existing project
    // Default should be "src/index.js" for JavaScript or "src/index.ts" for TypeScript
    const defaultEntryPoint = useTypeScript
      ? 'src/index.ts'
      : mode === 'Creating'
      ? 'src/index.js'
      : defaultExport;

    const exportPath =
      defaultExport !== false
        ? await readline.question(
            `${c.cyan('Exports Entry Point: ')}${c.bold(`(${defaultEntryPoint})`)} `
          )
        : undefined;

    // Continue with the rest of the optional features for new projects
    if (mode === 'Creating') {
      // Ask about creating .gitignore file
      const createGitignore = await readline.question(
        `${c.cyan('Create a .gitignore file with JavaScript defaults? ')}${c.bold('(y/n)')} `
      );
      shouldCreateGitignore =
        createGitignore.toLowerCase() === 'y' ||
        createGitignore.toLowerCase() === 'yes' ||
        createGitignore === '';
    }

    // Ask about creating index.html example app
    const htmlPath = join(projectDir, 'index.html');
    const htmlExists = exists(htmlPath);
    if (mode === 'Creating' || !htmlExists) {
      const createHtmlExample = await readline.question(
        `${c.cyan('Create an index.html example app file? ')}${c.bold('(y/n)')} `
      );
      shouldCreateHtml =
        createHtmlExample.toLowerCase() === 'y' ||
        createHtmlExample.toLowerCase() === 'yes' ||
        createHtmlExample === '';
    }

    // Readline is now closed in the AI file section for both modes

    // Ask about creating AI rules file
    if (mode === 'Creating') {
      // First ask a simple yes/no question
      const createAiFile = await readline.question(
        `${c.cyan('Create an AI prompt file? ')}${c.bold('(y/n)')} `
      );
      
      const wantAiFile = createAiFile.toLowerCase() === 'y' || 
                       createAiFile.toLowerCase() === 'yes' || 
                       createAiFile === '';
      
      // Close the readline interface before using the getOption function
      closed = true;
      readline.close();
      
      if (wantAiFile) {
        // Show AI rules file selection options
        const aiRuleOptions = [
          { name: 'AGENTS.md', description: 'OpenAI' },
          { name: 'CLAUDE.md', description: 'Anthropic Claude' },
          { name: '.clinerules', description: 'Cline' },
          { name: '.cursorrules', description: 'Cursor' },
          { name: '.windsurfrules', description: 'Windsurf' },
          { name: 'none', description: 'No AI file' }
        ];

        createdAiFile = await getOption('Which AI prompt file would you like to create?', aiRuleOptions);
      }
    } else {
      // Close the readline interface for non-creating mode
      closed = true;
      readline.close();
    }

    // Create the package.json content, preserving other fields
    const packageJson: any = {
      ...existingPackageJson,
      name: name || defaultName,
      version: version || defaultVersion,
      description: description || defaultDescription,
      type: 'module'
    };

    // Add exports if the user wants them
    let exportsValue: string | undefined;
    if (defaultExport !== false) {
      exportsValue = exportPath || (useTypeScript ? 'src/index.ts' : defaultExport);
      packageJson.exports = { '.': `./${exportsValue}` };
    }

    const projectDirRel = relative(process.cwd(), projectDir).replace(/\\/g, '/');

    if (!flags.quiet) console.log('');

    // Create tsconfig.json if TypeScript is enabled
    if (useTypeScript) {
      const tsconfigPath = join(projectDir, 'tsconfig.json');
      const tsconfigExists = exists(tsconfigPath);

      if (!tsconfigExists) {
        const tsconfigContent = JSON.stringify(
          {
            compilerOptions: {
              target: 'esnext',
              module: 'nodenext',
              lib: ['esnext', 'DOM', 'DOM.Iterable'],
              allowArbitraryExtensions: true,
              resolveJsonModule: true,
              rewriteRelativeImportExtensions: true,
              erasableSyntaxOnly: true,
              verbatimModuleSyntax: true
            }
          },
          null,
          2
        );

        await writeFile(tsconfigPath, tsconfigContent);
        if (!flags.quiet)
          console.log(
            `${c.green('✓')}  ${c.cyan(`${projectDirRel || '.'}/tsconfig.json`)} created`
          );
      }
    }

    // Create .gitignore file if requested
    if (shouldCreateGitignore) {
      const gitignorePath = join(projectDir, '.gitignore');
      const gitignoreExists = exists(gitignorePath);

      if (!gitignoreExists) {
        const gitignoreContent = createGitignore(useTypeScript);
        await writeFile(gitignorePath, gitignoreContent);

        if (!flags.quiet)
          console.log(`${c.green('✓')}  ${c.cyan(`${projectDirRel || '.'}/.gitignore`)} created`);
      }
    }

    // Create index.html example if requested
    if (shouldCreateHtml) {
      const htmlContent = await createExampleHtml(packageJson, exportsValue !== undefined);

      await writeFile(htmlPath, htmlContent);
      if (!flags.quiet)
        console.log(`${c.green('✓')}  ${c.cyan(`${projectDirRel || '.'}/index.html`)} created`);

      // Check if entry point file exists, create it if not
      if (exportsValue) {
        const entrypointPath = join(projectDir, exportsValue);
        const lastSlashIndex = entrypointPath.lastIndexOf('/');
        const lastBackslashIndex = entrypointPath.lastIndexOf('\\');
        const lastSeparatorIndex = Math.max(lastSlashIndex, lastBackslashIndex);

        // Only extract directory if path contains a separator
        const entrypointDir =
          lastSeparatorIndex > 0 ? entrypointPath.substring(0, lastSeparatorIndex) : null;

        if (!exists(entrypointPath) && mode === 'Creating') {
          if (entrypointDir && entrypointDir !== projectDir && !exists(entrypointDir))
            await mkdir(entrypointDir, { recursive: true });
          await writeFile(entrypointPath, exampleEntry());

          if (!flags.quiet)
            console.log(
              `${c.green('✓')}  ${c.cyan(`${projectDirRel || '.'}/${exportsValue}`)} created`
            );

          // Also write the example landing component
          await writeFile(join(dirname(entrypointPath), 'landing.js'), exampleLandingJs);
          await writeFile(join(dirname(entrypointPath), 'landing.css'), exampleLandingCss);
          if (!flags.quiet)
            console.log(
              `${c.green('✓')}  ${c.cyan(
                `${projectDirRel || '.'}/${join(dirname(exportsValue), 'landing.js').replace(
                  /\\/g,
                  '/'
                )}`
              )} created`
            );

          if (!flags.quiet)
            console.log(
              `${c.green('✓')}  ${c.cyan(
                `${projectDirRel || '.'}/${join(dirname(exportsValue), 'landing.css').replace(
                  /\\/g,
                  '/'
                )}`
              )} created`
            );
        }
      }
    }

    // Create selected AI rules file
    if (createdAiFile && createdAiFile !== 'none') {
      const aiRulePath = join(projectDir, createdAiFile);
      if (!exists(aiRulePath)) {
        await writeFile(aiRulePath, aiFile(useTypeScript));

        const aiRuleFileRel = relative(process.cwd(), aiRulePath).replace(/\\/g, '/');

        if (!flags.quiet) console.log(`${c.green('✓')}  ${c.cyan(aiRuleFileRel)} created`);
      }
    }

    // Write the package.json file
    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), {
      encoding: 'utf8'
    });
    console.log(
      `${c.green('✓')}  ${c.cyan(`${projectDirRel || '.'}/package.json`)} ${mode
        .toLowerCase()
        .replace('ing', 'ed')}`
    );

    console.log(`\n${c.green('Ok:')} Initialization complete.`);
    console.log(
      `${c.blue('Info:')} Next, run ${
        projectDirRel ? `${c.bold(`cd ${projectDirRel}`)} and ` : ''
      }${c.bold('jspm serve')} to start a local server.\n`
    );

    // Return the project config
    const config: ProjectConfig = {
      name: packageJson.name,
      version: packageJson.version,
      exports: packageJson.exports,
      main: packageJson.main,
      projectPath: projectDir,
      dependencies: packageJson.dependencies,
      devDependencies: packageJson.devDependencies,
      peerDependencies: packageJson.peerDependencies
    };

    return config;
  } finally {
    if (!closed) readline.close();
  }
}

/**
 * Initializes a project by validating package.json and extracting required fields.
 * Throws errors for missing required fields.
 *
 * @param options Configuration options
 * @returns ProjectConfig object with validated fields
 */
export async function initProject(flags: BaseFlags): Promise<ProjectConfig> {
  const directory = flags.dir || process.cwd();

  // Verify directory exists
  if (!(await isDirectory(directory))) {
    throw new JspmError(`Directory does not exist: ${directory}`);
  }

  // Find package.json
  const packageResult = await getPackageJson(directory);
  if (!packageResult) {
    // No package.json found, ask if the user wants to create one
    if (flags.quiet) {
      throw new JspmError(
        `No package.json found${
          flags.dir ? ` in ${flags.dir}` : ''
        }. Please create a package.json file in your project directory.`
      );
    }

    const readline = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      const answer = await readline.question(
        `${c.cyan('No package.json found. Would you like to create one?')} ${c.bold('(y)')} `
      );
      readline.close();

      if (
        answer.toLowerCase() === 'y' ||
        answer.toLowerCase() === 'yes' ||
        answer.toLowerCase() === ''
      ) {
        return await initCreate(directory, { quiet: flags.quiet });
      } else {
        throw new JspmError(
          `No package.json found. Please create a package.json file to continue.`
        );
      }
    } catch (e) {
      readline.close();
      throw e;
    }
  }

  const { packageJson, packagePath } = packageResult;
  // Validate package.json
  if (!packageJson.name) {
    throw new JspmError(
      "Missing required field 'name' in package.json. Please specify a package name."
    );
  }

  // Base config from package.json
  const config: ProjectConfig = {
    name: packageJson.name,
    version: packageJson.version || undefined,
    exports: packageJson.exports || undefined,
    main: packageJson.main || undefined,
    files: packageJson.files || undefined,
    registry: packageJson.repository?.url || undefined,
    projectPath: packagePath,
    dependencies: packageJson.dependencies,
    devDependencies: packageJson.devDependencies,
    peerDependencies: packageJson.peerDependencies
  };

  // Override with jspm field if present
  if (packageJson.jspm) {
    if (typeof packageJson.jspm !== 'object') {
      throw new JspmError("Invalid 'jspm' field in package.json. Expected an object.");
    }

    // Extract JSPM-specific settings
    if (packageJson.jspm.name) config.name = packageJson.jspm.name;
    if (packageJson.jspm.version) config.version = packageJson.jspm.version;
    if (packageJson.jspm.registry) config.registry = packageJson.jspm.registry;
    if (packageJson.jspm.exports) config.exports = packageJson.jspm.exports;
    if (packageJson.jspm.files) config.files = packageJson.jspm.files;
    if (packageJson.jspm.ignore) config.ignore = packageJson.jspm.ignore;
  }

  // @ts-expect-error exports types
  config.exports =
    typeof config.exports === 'string' ||
    (typeof config.exports === 'object' &&
      config.exports !== null &&
      !Object.keys(config.exports).every(key => key.startsWith('.')))
      ? { '.': config.exports }
      : config.exports || {};

  return config;
}

const createExampleHtml = async (packageJson, hasEntry: boolean) => {
  let esmsUrl;
  try {
    esmsUrl = await getLatestEsms(await getGenerator({}), 'jspm.io');
  } catch {
    console.log(
      `${c.yellow('Warning:')} ${c.red(
        'Offline'
      )} - unable to locate es-module-shims for HTML generation, try again or install it manually via npm install es-module-shims.`
    );
    esmsUrl = 'es-module-shims.js';
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${packageJson.name}</title>
  <script src="importmap.js"></script>
  <script async crossorigin="anonymous" src="${esmsUrl}"></script>${
    hasEntry
      ? `
<script type="module">import '${packageJson.name}';</script>`
      : ''
  }
</head>
<body></body>
</html>
`;
};

const aiFile = (tsEnabled: boolean) => `
# Claude Configuration

## JSPM Conventions

### Project Overview

- package.json: Main package manifest
- src/**/*: Source folder

### Package Configuration

The package.json to defines:

* "name": Package name, which is how the package entry points are imported, by its own name.
* "version": Package version
* "dependencies": Package dependencies
* "devDependencies": Package development dependencies
* "exports": Package entry points

### Entry Points

The package "name" and package entry points "exports" must be defined for import map generation.

Exports may be a string for a single entry point or an object with a \`"."\` property. Export targets may be objects mapping conditions to subpaths, or may be direct subpath strings. All subpaths must start with \`"./"\`. Exports may use \`"*"\` patterns for mapping rules.

### Module Types

#### CSS

Stylesheets ending in \`.css\` may be imported via \`import style from './module.css' with { type: 'css' }\`.

When imported the stylesheet may be appended into the page with \`document.adoptedStylesheets.push(style)\`.

This is the recommended pattern for all CSS and fully supports hot reloading with the watching server.

#### JSON

JSON modules may be imported similarly via \`import json from './file.json' with { type: 'json' }\`.

#### JavaScript

Native vanilla JavaScript modules are being used in the browser. These support loading external packages with the import map JSPM will automatically generated when running \`jspm install\` as well as importing relative paths via \`../dependency.js\` and \`./dependency.js\`. Always use full file extensions for imports.
${
  tsEnabled
    ? `
#### TypeScript

TypeScript ending in \`.ts\` or \`.mts\` may be imported.

TypeStripping is used which comes with the limitations of not supporting features requiring transformations:

* Enum declarations
* Namespace with runtime code
* Legacy module with runtime code
* Parameter properties
* Import aliases

The \`import type\` or \`import { type T }\` import type forms should be used whenever possible.
`
    : ''
}
### Assets

JavaScript code may obtain URLs to assets using the \`new URL('./asset', import.meta.url)\` relative URL pattern.

While stylesheets may be co-located with modules in the \`src\` folder, it is advisable to write assets into a separate \`assets\` folder.

### HTML

HTML files may exist at any nesting level. And the server root may also be variable. For this reason absolute paths should never be used, and instead stylesheets should always use relative paths to assets and HTML files should use HTML-relative paths to assets.

### Hot Reloading

Hot reloading is supported including supoprt for \`import.meta.hot?.accept?()\` to accept changes both to the module itself and its direct dependencies. Without \`import.meta.hot.accept\` changed dependencies and all their parent importers will be reloaded, which results in double executions. Where possible idempotency should be maintained to allow hot reloading workflows.

### Framework

If the user wants to use a framework requiring JSX, use the \`htm\` library to handle JSX as JS templates.

If the user has not provided an explicit framework to use, use the below vanilla framework pattern.

src/components/title.js:
\`\`\`js
import style from './title.css' with { type: 'css' };
import DOMPurify from 'dompurify';

// CSS injection that supports hot reloading without duplication
if (!document.adoptedStyleSheets.includes(style))
  document.adoptedStyleSheets.push(style);

// Render nests other component renders in turn
export function render ({ title }) {
  // always sanitize user inputs
  return \`<h1>\${DOMPurify.sanitize(title, { ALLOWED_TAGS: [] })}</h1>\`;
}

// Attach attaches other component attachments in turn based on container selectors
export function attach (container, { title }) {
  let cnt = 0;
  const h = container.querySelector('h1');
  h.addEventListener('click', () => {
    h.innerText = \`\${title} \${++cnt}\`;
  });
}
\`\`\`

src/index.js:
\`\`\`js
import * as page from './components/page.js';

const title = 'hello world';
document.body.innerHTML = page.render({ title });
page.attach(body, { title });
\`\`\`

Include all HTML elements via the render chain into the main static render function. Avoid dynamic body injections unless necessary for features like popups or toast elements.

Assume the renderer successfully injected elements that were specified when performing attachment, such that in the attch function \`container.querySelector('el')\` will always return the expected element from the HTML render.

### Dependencies

Import utility libraries and dependencies as needed.

Dependencies not needed for the page load that can be loaded asynchronously should be loaded via dynamic \`import()\`.

\`jspm install\` or \`jspm serve --watch\` will automatically update the \`importmap.js\` file whenever a new dependency is added to a code path that is statically traceable from one of the entry points defined in the package.json "exports".

package.json "dependencies" and "devDependencies" ranges will be respected. While modules may be imported without being present in this manifest it is recommended to still look up the package and include its range in the package.json.

The \`importmap.js\` behaves like a lock file itself in that once installed a dependency will remain stable through subsequent reinvocations of \`jspm install\`.

### Development Commands
- \`jspm ls\`: Check local entry points available
- \`jspm ls pkg\`: Lookup an external package version and entry points available
- \`jspm install\`: Generate importmap.js from package.json entry points and dependencies.
- \`jspm serve --watch\`: Run the local dev server
- \`jspm build -o dist\`: Build the application
`;

const exampleEntry = () => `import * as landing from './landing.js';
document.body.innerHTML = landing.render();
landing.attach(document.body);
`;

const exampleLandingCss = `:root {
  --primary-color: #4dabf7;
  --secondary-color: #72cc82;
  --background-color: #121212;
  --surface-color: #1e1e1e;
  --text-color: #e0e0e0;
  --accent-color: #a4a4a4;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--background-color);
  color: var(--text-color);
}

.container {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  position: relative;
}

.landing {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  z-index: 1;
}

.logo-container {
  position: relative;
  width: 280px;
  height: 280px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 2rem;
}

.logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: 2;
  position: relative;
  cursor: pointer;
  transform: scale(1);
}

.logo.fade-in {
  transition: opacity 1s ease, transform 0.3s ease-out;
}

.logo:hover {
  transform: scale(1.05);
}

.glow {
  position: absolute;
  top: -10%;
  left: -10%;
  width: 120%;
  height: 120%;
  border-radius: 20%;
  background: radial-gradient(circle, rgb(129 118 71 / 20%) 40%, rgb(255 255 255 / 5%) 50%, rgb(255 255 385 / 0%) 0%);
  filter: blur(20px);
  z-index: 1;
}

.glow.glow-animate {
  animation: glow-pulse 3s ease-in-out infinite;
}

.gradient-text {
  background: linear-gradient(90deg, #808080, #78a7d8, #808080, #78a7d8);
  background-size: 300% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-weight: bold;
  font-size: 5rem;
  margin: 0 0 0.5rem 0;
  letter-spacing: 2px;
  animation: gradient-shift 10s linear infinite;
}

.gradient-text.move-up {
  animation: gradient-shift 10s linear infinite, move-up 1s ease-out forwards;
}

.tagline {
  color: var(--text-color);
  font-size: 1.6rem;
  font-weight: 300;
  margin: 0;
}

.gradient-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  background: #121212;
  overflow: hidden;
}


.gradient-blob {
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.25;
  animation: float-blob 20s ease-in-out infinite, pulse-opacity 10s ease-in-out infinite;
  transform-origin: center center;
}

.gradient-blob-1 {
  background: #4285f4; /* Blue */
  top: 15%;
  left: 25%;
  animation-delay: 0s;
  width: 500px;
  height: 500px;
}

.gradient-blob-2 {
  background: #ffc107;
  top: 60%;
  right: 25%;
  animation-delay: -7s;
  width: 450px;
  height: 450px;
}

.gradient-blob-3 {
  background: #ea4c89;
  top: 30%;
  left: 60%;
  width: 480px;
  height: 480px;
  animation-delay: -14s;
}

@keyframes gradient-shift {
  0% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

@keyframes move-up {
  0% { transform: translateY(20px); }
  100% { transform: translateY(0); }
}

@keyframes float-blob {
  0% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(30px, -30px) scale(1.05); }
  50% { transform: translate(-20px, 40px) scale(0.95); }
  75% { transform: translate(-40px, -25px) scale(1.05); }
  100% { transform: translate(0, 0) scale(1); }
}

@keyframes pulse-opacity {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.3; }
}

.fade-in {
  opacity: 0;
  transition: opacity 1s ease;
}

.move-up {
  animation: move-up 1s ease-out forwards;
}

@media (max-width: 768px) {
  .logo-container { width: 220px; height: 220px; }
  .gradient-text { font-size: 3.5rem; }
  .tagline { font-size: 1.2rem; }
}
`;

const exampleLandingJs = `import style from './landing.css' with { type: 'css' };

if (!document.adoptedStyleSheets.includes(style))
  document.adoptedStyleSheets.push(style);

// Render landing page
export function render() {
  return \`
    <div class="container">
      <div class="gradient-background">
        <div class="gradient-blob gradient-blob-1"></div>
        <div class="gradient-blob gradient-blob-2"></div>
        <div class="gradient-blob gradient-blob-3"></div>
      </div>
      <div class="landing">
        <div class="logo-container">
          <div class="glow"></div>
          <img class="logo fade-in" src="/jspm.png" alt="JSPM Logo">
        </div>
        <h1 class="gradient-text fade-in">JSPM</h1>
        <p class="tagline fade-in">Standards-based import map package management</p>
      </div>
    </div>
  \`;
}

// Attach animations and interactions
export function attach(container) {
  const logo = container.querySelector('.logo');
  const glow = container.querySelector('.glow');
  const fadeElements = container.querySelectorAll('.fade-in');
  
  // Trigger fade-ins and move animations with delay
  fadeElements.forEach((el, i) => {
    const targetOpacity = el.classList.contains('logo') ? '0.8' : '1';
    setTimeout(() => {
      el.style.opacity = targetOpacity;
      
      // Add classes for animations
      if (el.classList.contains('gradient-text')) {
        el.classList.add('move-up');
      } else if (el.classList.contains('tagline')) {
        el.classList.add('move-up');
      }
    }, 300 + i * 500);
  });
  
  // Add glow pulse animation
  glow.classList.add('glow-animate');
  
  // Add confetti on logo click
  logo.addEventListener('click', async () => {
    const confetti = (await import('canvas-confetti')).default;
    const rect = logo.getBoundingClientRect();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { 
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight
      },
      colors: ['#78a7d8', '#FFD966', '#d0d0d0']
    });
  });
}
`;

/**
 * Creates a minimal JavaScript .gitignore file content
 * @param useTypeScript Whether TypeScript is enabled in the project
 * @returns The content for the .gitignore file
 */
const createGitignore = (_useTypeScript: boolean) => `node_modules/
dist/
.vscode/
.DS_Store
`;
