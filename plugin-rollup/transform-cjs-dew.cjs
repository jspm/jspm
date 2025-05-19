const { parse } = require('@babel/parser');
const { basename, extname } = require('path');
const stage3Syntax = ['asyncGenerators', 'classProperties', 'optionalCatchBinding', 'objectRestSpread', 'numericSeparator', 'dynamicImport', 'importMeta'];

// possibly have this binding configurable to an import in future
// (nodeRequireModule, nodeRequireExport)
// that could support taking import.meta and using import.meta.resolve / import.meta.url
function getNodeRequireBinding (path, state) {
  if (!state.nodeRequireBinding)
    state.nodeRequireBinding = path.scope.getProgramParent().generateUidIdentifier(state.opts.browserOnly ? 'nullRequire' : 'nodeRequire');
  return state.nodeRequireBinding;
}

const strictReservedOrKeyword = Object.assign(
  Object.create(null), {
  // strict reserved
  "implements":1, "interface":1, "let":1, "package":1, "private":1, "protected":1, "public":1, "static":1, "yield":1, "arguments":1, "eval":1, "await":1, "enum":1,
  // keyword
  "break":1, "case":1, "catch":1, "continue":1, "debugger":1, "default":1, "do":1, "else":1, "finally":1, "for":1, "function":1, "if":1, "return":1, "switch":1,
  "throw":1, "try":1, "var":1, "while":1, "with":1, "null":1, "true":1, "false":1, "instanceof":1, "typeof":1, "void":1, "delete":1, "new":1, "in":1, "this":1, "const":1,
  "class":1, "extends":1, "export":1, "import":1, "super":1,
});

function hasBinding (path, bindingName) {
  return path.scope.hasBinding(bindingName);
}

function isLive(path) {
  const seen = new Set();
  let curPath = path;
  while (curPath) {
    if (seen.has(curPath)) return false;
    seen.add(curPath);
    curPath = curPath.parentPath;
  }
  return true;
}

const topLevelReserved = Object.assign(
  Object.create(null), {
  "global":1, "self":1, "globalThis":1
});

const transformIds = Object.assign(
  Object.create(null), {
    // transform-specific!
    "process":1, "Buffer":1, "global":1, "exports":1, "module":1
});

function createProcessGuard (guardFn) {
  return {
    enter (path, state) {
      // hasProcess being set to true is always gated on the process guard, so this is reliable in both enter and exit
      // even if it werent, once we have process that's the same as a positive process guard anyway
      if (state.hasProcess)
        return;
      if (!guardFn(path, state))
        return;
      // this is invariant of visitation
      if (hasBinding(path, 'process'))
        return;
      state.processGuard++;
    },
    exit (path, state) {
      if (state.hasProcess)
        return;
      if (!guardFn(path, state))
        return;
      if (hasBinding(path, 'process'))
        return;
      state.processGuard--;
    }
  };
}

module.exports = function ({ types: t }) {
  const exportsIdentifier = t.identifier('exports');
  const moduleIdentifier = t.identifier('module');
  const dewIdentifier = t.identifier('dew');
  const dewInterop = t.identifier('__dew');
  const defaultIdentifier = t.identifier('default');

  const globalThis = t.identifier('globalThis');
  const globalThisPredicate = t.binaryExpression('!==', t.unaryExpression('typeof', globalThis), t.stringLiteral('undefined'));
  const selfIdentifier = t.identifier('self');
  const ifSelfPredicate = t.binaryExpression('!==', t.unaryExpression('typeof', selfIdentifier), t.stringLiteral('undefined'));
  const requireSub = (dep) => {
    if (dep.dew && dep.ns) {
      const interopExpression = t.memberExpression(dep.id, dewInterop);
      return t.conditionalExpression(interopExpression, t.callExpression(interopExpression, []), t.memberExpression(dep.id, defaultIdentifier));
    }
    return dep.dew ? t.callExpression(dep.id, []) : dep.id;
  };
  const nodeRequire = (path, state, depNode) => {
    return t.callExpression(getNodeRequireBinding(path, state), [depNode]);
  };
  const moduleDeclarator = t.variableDeclaration('var', [
    t.variableDeclarator(moduleIdentifier, t.objectExpression([
      t.objectProperty(exportsIdentifier, exportsIdentifier)
    ]))
  ]);

  // we detect optional require based on pattern matching:
  // try { const? x = require('x') } catch (e) { ... }
  function isOptionalRequire (path) {
    if (t.isMemberExpression(path.parentPath))
      return isOptionalRequire(path.parentPath);
    const secondParent = path.parentPath && path.parentPath.parentPath;
    const fourthParent = secondParent.parentPath && secondParent.parentPath.parentPath;
    return secondParent && fourthParent &&
        t.isTryStatement(fourthParent) && fourthParent.node.block.body.length >= 1 &&
        (t.isVariableDeclarator(path.parentPath) && t.isVariableDeclaration(secondParent) ||
         t.isAssignmentExpression(path.parentPath) && t.isExpressionStatement(secondParent));
  }

  function getFunctionScope (path) {
    let fnPath = path;
    while (fnPath.parent && !((t.isFunctionDeclaration(fnPath.parent) || t.isFunctionExpression(fnPath.parent)) && fnPath.parent.body === fnPath.node))
      fnPath = fnPath.parentPath;
    return fnPath.parent && fnPath;
  }

  const cjsScopeVars = ['require', 'module', 'exports', '__filename', '__dirname'];

  function resolvePartialWildcardString (node, lastIsWildcard, exprs) {
    if (t.isStringLiteral(node))
      return node.value;
    
    if (t.isTemplateLiteral(node)) {
      let str = '';
      for (let i = 0; i < node.quasis.length; i++) {
        const quasiStr = node.quasis[i].value.cooked;
        if (quasiStr.length) {
          str += quasiStr;
          lastIsWildcard = false;
        }
        const nextNode = node.expressions[i];
        if (nextNode) {
          const nextStr = resolvePartialWildcardString(nextNode, lastIsWildcard, exprs);
          if (nextStr.length) {
            lastIsWildcard = nextStr.endsWith('*');
            str += nextStr;
          }
        }
      }
      return str;
    }

    if (t.isBinaryExpression(node) && node.operator === '+') {
      const leftResolved = resolvePartialWildcardString(node.left, lastIsWildcard, exprs);
      if (leftResolved.length)
        lastIsWildcard = leftResolved.endsWith('*');
      const rightResolved = resolvePartialWildcardString(node.right, lastIsWildcard, exprs);
      return leftResolved + rightResolved;
    }

    if (t.isIdentifier(node, { name: '__dirname' })) {
      return '.';
    }
    
    exprs.push(node);
    return lastIsWildcard ? '' : '*';
  }

  function canResolvePartialWildcardString (node) {
    return t.isStringLiteral(node) || t.isTemplateLiteral(node) && node.quasis[0].value.cooked.length || t.isBinaryExpression(node) || t.isIdentifier(node) && node.name === '__dirname';
  }

  // typeof setImmediate [!=]== 
  function isLogicalOrConditionalBinaryExpression (path) {
    return t.isBinaryExpression(path.node) && (
      t.isConditionalExpression(path.parentPath.node) && path.parentPath.node.test === path.node ||
      t.isLogicalExpression(path.parentPath.node) && path.parentPath.node.left === path.node
    );
  }

  function addDependency (path, state, depModuleArg, optional = false) {
    if (path.parentPath && path.parentPath.data === 'dead')
      return null;
    const exprs = [];
    let depModule = resolvePartialWildcardString(depModuleArg, false, exprs);

    // no support for fully dynamic require
    if (depModule === '*') {
      return nodeRequire(path, state, depModuleArg);
    }

    let depResolved;

    if (depModule.indexOf('*') !== -1) {
      depResolved = state.opts.resolve(depModule, { wildcard: true, optional });

      if (typeof depResolved === 'string' && depResolved.indexOf('*') !== -1)
        return null;

      if (!depResolved)
        return nodeRequire(path, state, depModuleArg);

      if (depResolved instanceof Array) {
        // add each module as a dependency (still using resolver)
        // (we're kind of relying on .node wildcards not being common, could be added though)
        const depExprs = depResolved.map(m => generateDependency(m, path, state));

        const exprIds = exprs.map((_expr, i) => t.Identifier('e' + (i === 0 ? '' : i + 1)));

        // trailing * means we must permit wildcardExtensions variations
        const wildcardExtensions = depModule.endsWith('*') && state.opts.wildcardExtensions;

        const regEx = new RegExp(depModule.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '(.*)'));
        const matchExprs = depResolved.map(resolved => {
          const match = resolved.match(regEx);
          return exprs.map((_expr, i) => t.binaryExpression('===', exprIds[i], t.stringLiteral(match[i + 1]))).reduce((reduction, next, i) => {
            if (i === exprs.length - 1 && wildcardExtensions) {
              const str = match[i + 1];
              const ext = wildcardExtensions.find(ext => str.endsWith(ext));
              if (ext)
                next = t.logicalExpression('||', next, t.binaryExpression('===', exprIds[i], t.stringLiteral(str.substr(0, str.length - ext.length))));
            }
            if (reduction)
              return t.logicalExpression('&&', reduction, next);
            return next;
          }, null);
        });

        const matchExpression = matchExprs.reverse().reduce((reduction, next, i) => {
          return t.conditionalExpression(next, depExprs[matchExprs.length - i - 1], reduction);
        }, t.nullLiteral());
        
        return t.callExpression(t.functionExpression(null, exprIds, t.blockStatement([t.returnStatement(matchExpression)])), exprs);
      }
    }
    else {
      depResolved = state.opts.resolve(depModule, { optional });
    }

    if (depResolved === undefined)
      depResolved = depModule;

    if (depResolved === null || depResolved.endsWith('.node'))
      return nodeRequire(path, state, depModuleArg);

    return generateDependency(depResolved, path, state);
  }

  function generateDependency (depResolved, path, state) {
    if (typeof depResolved !== 'string')
      throw new Error('Expected a string.');
    if (depResolved === '@empty')
      return t.objectExpression([]);
    for (let dep of state.deps) {
      if (dep.literal.value === depResolved)
        return requireSub(dep, state);
    }
    let dew = true, ns = false;
    const esmDependency = state.opts.esmDependencies && state.opts.esmDependencies(depResolved);
    if (esmDependency === 'interop')
      dew = true, ns = true;
    else if (esmDependency === 'namespace')
      ns = true, dew = false;
    else if (esmDependency === 'namespace-interop')
      ns = true, dew = false;
    else if (esmDependency)
      dew = false;
    const uidName = basename(depResolved);
    const uidExt = extname(uidName);
    const name = uidName.substr(0, uidName.length - uidExt.length);
    const depName = path.scope.getProgramParent().generateUid(name);
    const moduleName = esmDependency === 'namespace-interop' ? path.scope.getProgramParent().generateUid(name) : depName;
    const dep = {
      literal: t.stringLiteral(depResolved),
      id: t.identifier(depName + (dew && !ns ? 'Dew' : '')),
      mid: t.identifier(moduleName + (dew && !ns ? 'Dew' : '')),
      dew,
      ns
    };
    state.deps.push(dep);
    return requireSub(dep, state);
  }

  function dce (path) {
    let parentNode = path.parentPath.node;

    // inline direct string equalities as "true" or "false"
    if (t.isBinaryExpression(parentNode)) {
      if (parentNode.operator === '===' || parentNode.operator === '==') {
        if (t.isStringLiteral(parentNode.left) && t.isStringLiteral(parentNode.right)) {
          path.parentPath.replaceWith(t.booleanLiteral(parentNode.left.value === parentNode.right.value));
          dce(path.parentPath);
        }
      }
      if (parentNode.operator === '!==' || parentNode.operator === '!=') {
        if (t.isStringLiteral(parentNode.left) && t.isStringLiteral(parentNode.right)) {
          path.parentPath.replaceWith(t.booleanLiteral(parentNode.left.value !== parentNode.right.value));
          dce(path.parentPath);
        }
      }
    }
    // bubble up "true" and "false" through logical expressions where possible
    if (t.isLogicalExpression(parentNode)) {
      if (parentNode.operator === '&&') {
        if (t.isBooleanLiteral(parentNode.left)) {
          // true && X -> X
          if (parentNode.left.value) {
            path.parentPath.replaceWith(parentNode.right);
            dce(path.parentPath);
          }
          // false && X -> false
          else {
            path.parentPath.replaceWith(t.booleanLiteral(false));
            dce(path.parentPath);
          }
        }
        // null && X -> null
        else if (t.isNullLiteral(parentNode.left)) {
          path.parentPath.replaceWith(t.nullLiteral());
          dce(path.parentPath);
        }
      }
      else if (parentNode.operator === '||') {
        // false || null || X -> X
        if (t.isBooleanLiteral(parentNode.left) && !parentNode.left.value || t.isNullLiteral(parentNode.left)) {
          path.parentPath.replaceWith(parentNode.right);
          dce(path.parentPath);
        }
        // true || X -> true
        else if (t.isBooleanLiteral(parentNode.left) && parentNode.left.value) {
          path.parentPath.replaceWith(t.booleanLiteral(true));
          dce(path.parentPath);
        }
      }
    }
    // if we have a direct boolean in an IfStatement, remove the falsy branch
    else if (t.isIfStatement(parentNode) && path.node === parentNode.test) {
      let knownPredicate = false;
      let truthy = false;

      if (t.isBooleanLiteral(parentNode.test)) {
        knownPredicate = true;
        truthy = parentNode.test.value;
      }
      if (t.isIdentifier(parentNode.test, { name: 'undefined' })) {
        knownPredicate = true;
        truthy = false;
      }

      if (knownPredicate) {
        let consequent = path.parentPath.get('consequent');
        let alternate = path.parentPath.get('alternate');

        path.skip();
  
        if (truthy) {
          if (alternate.node) {
            alternate.skip();
            alternate.remove();
          }
          if (t.isBlockStatement(consequent.node)) {
            if (consequent.node.body.length === 1 && t.isExpressionStatement(consequent.node.body[0])) {
              path.parentPath.replaceWith(consequent.node.body[0]);
            }
          }
          else {
            path.parentPath.replaceWith(consequent);
          }
        }
        else {
          if (consequent.node) {
            consequent.skip();
            consequent.remove();
          }
          if (t.isBlockStatement(alternate.node)) {
            if (alternate.node.body.length === 1 && t.isExpressionStatement(alternate.node.body[0])) {
              path.parentPath.replaceWith(alternate.node.body[0]);
            }
          }
          else if (alternate.node) {
            path.parentPath.replaceWith(alternate);
          }
          else {
            path.parentPath.remove();
          }
        }  
      }
    }
    // if we have a direct boolean in a ConditionalExpression, inline the truthy branch
    else if (t.isConditionalExpression(parentNode) && path.node === parentNode.test && t.isBooleanLiteral(parentNode.test)) {
      let consequent = path.parentPath.get('consequent');
      let alternate = path.parentPath.get('alternate');

      path.skip();

      if (parentNode.test.value) {
        alternate.data = 'dead';
        path.parentPath.replaceWith(consequent);
      }
      else {
        consequent.data = 'dead';
        path.parentPath.replaceWith(alternate);
      }
    }
    else if (t.isUnaryExpression(parentNode) && parentNode.operator === 'typeof') {
      if (t.isIdentifier(path.node, { name: 'undefined' })) {
        path.parentPath.replaceWith(t.stringLiteral('undefined'));
        dce(path.parentPath);
      }
    }
  }
  function getIfTypeOfCheck (node, identifierName, typeString) {
    if (!t.isBinaryExpression(node))
      return null;
    let truthy = false;
    if (node.operator === '==' || node.operator === '===') {
      truthy = true;
    }
    else if (node.operator !== '!=' && node.operator !== '!==') {
      return null;
    }
    if (t.isUnaryExpression(node.left, { operator: 'typeof' }) && t.isIdentifier(node.left.argument, { name: identifierName })) {
      if (!t.isStringLiteral(node.right))
        return null;
      if (node.right.value === 'undefined')
        truthy = !truthy;
      else if (node.right.value !== typeString)
        return null;
    }
    else if (t.isUnaryExpression(node.right, { operator: 'typeof' }) && t.isIdentifier(node.right.argument, { name: identifierName })) {
      if (!t.isStringLiteral(node.left))
        return null;
      if (node.left.value === 'undefined')
        truthy = !truthy;
      else if (node.left.value !== typeString)
        return null;
    }
    else {
      return null;
    }
    return truthy;
  }

  let thisOrGlobal;
  let filenameReplace;
  let dirnameReplace;
  let moduleNode;

  return {
    visitor: {
      Program: {
        enter (path, state) {
          thisOrGlobal = null;
          moduleNode = path.node;
          state.processGuard = 0;
          state.source = path.getSource();

          if (path.hub.file.shebang)
            path.hub.file.shebang = '';

          path.node.directives.forEach((d, index) => {
            if (d.value && d.value.value === 'use strict') {
              state.isStrict = true;
              path.node.directives.splice(index, 1);
            }
          });

          if (state.opts.filename) {
            filenameReplace = parse('(' + state.opts.filename + ')', { sourceType: 'module', plugins: stage3Syntax }).program.body[0].expression;
          }
          if (state.opts.dirname) {
            dirnameReplace = parse('(' + state.opts.dirname + ')', { sourceType: 'module', plugins: stage3Syntax }).program.body[0].expression;
          }

          state.define = {};
          state.opts.resolve = state.opts.resolve || (m => m);
          if (state.opts.define)
            Object.keys(state.opts.define).forEach(defineName => {
              let parts = defineName.split('.');
              if (parts.length === 1) {
                state.define[defineName] = state.opts.define[defineName];
                return;
              }
              let part = parts.shift();
              let curDefineObj = state.define[part] = {
                defineName: undefined,
                defineProperty: undefined
              };
              while (part = parts.shift()) {
                curDefineObj.defineName = part;

                if (parts.length)
                  curDefineObj = curDefineObj.defineProperty = {
                    defineName: undefined,
                    defineProperty: undefined
                  };
              }

              let defineSource = state.opts.define[defineName];
              if (defineSource === defineName)
                throw new Error('Defining into own name for ' + defineName + ' not permitted. Use quotes to define strings.');
              curDefineObj.defineProperty = state.opts.define[defineName];
            });

          state.deps = [];
          state.functionDepth = 0;
          state.classDepth = 0;
          state.globalIdentifier = path.scope.generateUidIdentifier('global');
          state.usesGlobal = false;
          state.usesModule = false;
          state.usesExports = false;
          state.usesDynamicRequire = false;
          state.moduleDotExports = [];
          state.inserting = false;
          state.nodeRequireBinding = undefined;
          state.requireResolve = false;
          state.globalRefs = new Set();

          if (path.node.body.length !== 1 ||
              !t.isExpressionStatement(path.node.body[0]) ||
              !t.isCallExpression(path.node.body[0].expression) ||
              !t.isFunctionExpression(path.node.body[0].expression.callee) ||
              path.node.body[0].expression.arguments.length !== 1)
            return;
          const arg = path.node.body[0].expression.arguments[0];
          if (!t.isConditionalExpression(arg) ||
              !t.isLogicalExpression(arg.test, { operator: '&&' }) ||
              !t.isBinaryExpression(arg.test.left, { operator: '===' }) ||
              !(
                (t.isUnaryExpression(arg.test.left.left, { operator: 'typeof' }) &&
                  t.isIdentifier(arg.test.left.left.argument, { name: 'define' }) &&
                  t.isStringLiteral(arg.test.left.right, { value: 'function' })) ||
                (t.isUnaryExpression(arg.test.left.right, { operator: 'typeof' }) &&
                  t.isIdentifier(arg.test.left.right.argument, { name: 'define' }) &&
                  t.isStringLiteral(arg.test.left.left, { value: 'function' }))
              ) ||
              !t.isMemberExpression(arg.test.right, { computed: false }) ||
              !t.isIdentifier(arg.test.right.object) ||
              !t.isIdentifier(arg.test.right.property, { name: 'amd' }) ||
              !t.isFunctionExpression(arg.alternate) ||
              arg.alternate.params.length !== 1 ||
              !t.isIdentifier(arg.alternate.params[0]) ||
              !t.isExpressionStatement(arg.alternate.body.body[0]) ||
              !t.isAssignmentExpression(arg.alternate.body.body[0].expression, { operator: '=' }))
            return;
          const expr = arg.alternate.body.body[0].expression;
          if (!t.isMemberExpression(expr.left, { computed: false }) ||
              !t.isIdentifier(expr.left.object, { name: 'module' }) ||
              !t.isIdentifier(expr.left.property, { name: 'exports' }) ||
              !t.isCallExpression(expr.right) ||
              !t.isIdentifier(expr.right.callee, { name: arg.alternate.params[0].name }) ||
              expr.right.arguments.length !== 1 ||
              !t.isIdentifier(expr.right.arguments[0], { name: 'require' }))
            return;
          let strictBody = t.isExpressionStatement(path.node.body[0].expression.callee.body.body[0]) &&
              t.isStringLiteral(path.node.body[0].expression.callee.body.body[0].expression, { value: 'use strict' });
          if (path.node.body[0].expression.callee.body.body.length !== strictBody + 1)
            return;
          const fn = path.node.body[0].expression.callee.body.body[+strictBody];
          if (!t.isExpressionStatement(fn) ||
              !t.isCallExpression(fn.expression) ||
              !t.isIdentifier(fn.expression.callee, { name: arg.test.right.object.name }) ||
              fn.expression.arguments.length !== 1 ||
              !t.isFunctionExpression(fn.expression.arguments[0]) ||
              fn.expression.arguments[0].params.length !== 1 ||
              !t.isIdentifier(fn.expression.arguments[0].params[0], { name: 'require' }))
            return;
          path.get('body.0.expression.callee.body.body.' + +strictBody + '.expression.arguments.0.params.0').remove();
          path.get('body.0.expression.arguments.0.alternate.body.body.0.expression.right.arguments.0').remove();
        },
        exit (path, state) {
          state.functionDepth = -1;
          state.classDepth = -1;

          let exportsReturn = state.usesModule ? t.memberExpression(moduleIdentifier, exportsIdentifier) : exportsIdentifier;
          let needsExports = true;
          let namedExportsId = state.usesModule ? t.memberExpression(moduleIdentifier, exportsIdentifier) : exportsIdentifier;

          /*
           * Replace module.exports with exports if module not used
           */
          function isRequireAssign (moduleDotExport) {
            const parentNode = moduleDotExport.parentPath.node;
            return t.isExpressionStatement(moduleDotExport.parentPath.parentPath.node) &&
                t.isAssignmentExpression(parentNode, { operator: '=' }) &&
                parentNode.left === moduleDotExport.node &&
                t.isIdentifier(parentNode.right) &&
                state.deps.some(dep => parentNode.right === dep.id)
          }
          if (!state.usesModule) {
            if (!state.usesExports && state.opts.nowrap)
              needsExports = state.moduleDotExports.some(moduleDotExport => !isRequireAssign(moduleDotExport) && !t.isUnaryExpression(moduleDotExport.parentPath.node, { operator: 'typeof' }));

            if (!needsExports) {
              const requireAssign = state.moduleDotExports.find(isRequireAssign);
              const onlyExport = state.moduleDotExports.every(moduleDotExport => moduleDotExport === requireAssign || t.isUnaryExpression(moduleDotExport.parentPath.node, { operator: 'typeof' }));

              if (requireAssign && onlyExport && requireAssign.parentPath &&
                  requireAssign.parentPath.parentPath && requireAssign.parentPath.parentPath.node &&
                  requireAssign.parentPath.parentPath.parentPath &&
                  requireAssign.parentPath.parentPath.parentPath.node === path.node) {
                exportsReturn = null;
              }
              else if (!requireAssign) {
                exportsReturn = t.objectExpression([]);
              }
            }

            for (const moduleDotExport of state.moduleDotExports) {
              if (t.isUnaryExpression(moduleDotExport.parentPath.node, { operator: 'typeof' })) {
                moduleDotExport.parentPath.replaceWith(t.stringLiteral('object'));
                dce(moduleDotExport.parentPath);
              }
              else if (isRequireAssign(moduleDotExport)) {
                if (!exportsReturn) {
                  // as a sneaky optimization we use a non-capturing default export in the identifier import case
                  const expression = moduleDotExport.parentPath.node.right;
                  if (t.isIdentifier(expression) && state.deps.some(dep => expression === dep.id)) {
                    moduleDotExport.parentPath.parentPath.replaceWith(t.exportNamedDeclaration(null, [t.exportSpecifier(expression, defaultIdentifier)]));
                    // named exports now link to this id
                    namedExportsId = expression;
                  }
                  else if (!state.opts.namedExports) {
                    moduleDotExport.parentPath.parentPath.replaceWith(t.exportDefaultDeclaration(expression));
                  }
                  else {
                    // revert to exports for named exports from a module.exports expression
                    exportsReturn = state.usesModule ? t.memberExpression(moduleIdentifier, exportsIdentifier) : exportsIdentifier;
                    needsExports = true;
                  }
                }
                else {
                  if (needsExports)
                    moduleDotExport.parentPath.parentPath.replaceWith(t.assignmentExpression('=', exportsIdentifier, moduleDotExport.parentPath.node.right));
                  else
                    moduleDotExport.parentPath.parentPath.replaceWith(t.variableDeclaration('var', [t.variableDeclarator(exportsIdentifier, moduleDotExport.parentPath.node.right)]));
                }
              }
              else {
                moduleDotExport.replaceWith(exportsIdentifier);
                dce(moduleDotExport);
              }
            }
          }

          /*
           * Add process and Buffer imports
           */
          if (state.hasProcess) {
            let dep = addDependency(path, state, t.stringLiteral('process'));
            if (dep) {
              path.unshiftContainer('body', t.variableDeclaration('var', [
                t.variableDeclarator(t.identifier('process'), dep)
              ]));
            }
          }

          if (state.processId) {
            let dep = addDependency(path, state, t.stringLiteral('process'));
            if (dep) {
              path.unshiftContainer('body', t.variableDeclaration('var', [
                t.variableDeclarator(state.processId, dep)
              ]));
            }
          }

          if (state.hasBuffer) {
            let dep = addDependency(path, state, t.stringLiteral('buffer'));
            if (dep) {
              path.unshiftContainer('body', t.variableDeclaration('var', [
                t.variableDeclarator(t.identifier('Buffer'), t.memberExpression(dep, t.identifier('Buffer')))
              ]));
            }
          }

          /*
           * nodeRequire special cases
           */
          if (state.nodeRequireBinding) {
            if (state.opts.browserOnly) {
              const e = t.identifier('e');
              const id = t.identifier('id');
              if (state.requireResolve) {
                path.unshiftContainer('body', t.expressionStatement(t.assignmentExpression('=', 
                  t.memberExpression(state.nodeRequireBinding, t.identifier('resolve')),
                  state.nodeRequireBinding
                )));
              }
              path.unshiftContainer('body', t.functionDeclaration(state.nodeRequireBinding, [id], t.blockStatement([
                t.variableDeclaration('var', [
                  t.variableDeclarator(e, t.newExpression(t.identifier('Error'), [
                    t.binaryExpression('+', t.binaryExpression('+', t.stringLiteral("Cannot find module '"), id), t.stringLiteral("'"))
                  ]))
                ]),
                t.expressionStatement(t.assignmentExpression('=', t.memberExpression(e, t.identifier('code')), t.stringLiteral('MODULE_NOT_FOUND'))),
                t.throwStatement(e)
              ])));
            }
            else {
              const module = addDependency(path, state, t.stringLiteral('module'));
              const Module = t.identifier('Module');
              const m = t.identifier('m');
              const e = t.identifier('e');
              const id = t.identifier('id');
              const filename = t.identifier('filename');

              let requireFn = t.callExpression(
                t.memberExpression(t.memberExpression(m, t.identifier('require')), t.identifier('bind')),
                [m]
              );

              if (state.requireResolve) {
                requireFn = t.callExpression(
                  t.memberExpression(t.identifier('Object'), t.identifier('assign')),
                  [
                    requireFn,
                    t.objectExpression([
                      t.objectProperty(t.identifier('resolve'), t.functionExpression(null, [id], t.blockStatement([
                        t.returnStatement(t.callExpression(t.memberExpression(Module, t.identifier('_resolveFilename')), [id, m]))
                      ])))
                    ])
                  ]
                );
              }

              path.unshiftContainer('body', t.variableDeclaration('var', [
                t.variableDeclarator(state.nodeRequireBinding, t.callExpression(t.functionExpression(null, [], t.blockStatement([
                  t.variableDeclaration('var', [
                    t.variableDeclarator(Module, t.memberExpression(module, Module))
                  ]),
                  t.ifStatement(Module, t.blockStatement([
                    t.variableDeclaration('var', [
                      t.variableDeclarator(m, t.newExpression(Module, [t.stringLiteral('')]))
                    ]),
                    t.expressionStatement(t.assignmentExpression('=',
                      t.memberExpression(m, filename),
                      t.callExpression(
                        t.memberExpression(t.memberExpression(
                          t.metaProperty(t.identifier('import'), t.identifier('meta')),
                          t.identifier('url')
                        ), t.identifier('substr')),
                        [t.binaryExpression('+',
                          t.numericLiteral(7),
                          t.binaryExpression('>',
                            t.memberExpression(t.memberExpression(t.callExpression(t.memberExpression(Module, t.identifier('_nodeModulePaths')), [t.stringLiteral('/')]), t.numericLiteral(0), true), t.identifier('length')),
                            t.numericLiteral(13)
                          )
                        )]
                      )
                    )),
                    t.expressionStatement(t.assignmentExpression('=',
                      t.memberExpression(m, t.identifier('paths')),
                      t.callExpression(t.memberExpression(Module, t.identifier('_nodeModulePaths')), [
                        t.callExpression(t.memberExpression(t.memberExpression(m, filename), t.identifier('substr')), [
                          t.numericLiteral(0),
                          t.callExpression(t.memberExpression(t.memberExpression(m, filename), t.identifier('lastIndexOf')), [t.stringLiteral('/')])
                        ])
                      ])
                    )),
                    t.returnStatement(requireFn)
                  ]), t.blockStatement([t.returnStatement(t.functionExpression(state.nodeRequireBinding, [id], t.blockStatement([
                    t.variableDeclaration('var', [
                      t.variableDeclarator(e, t.newExpression(t.identifier('Error'), [
                        t.binaryExpression('+', t.binaryExpression('+', t.stringLiteral("Cannot find module '"), id), t.stringLiteral("'"))
                      ]))
                    ]),
                    t.expressionStatement(t.assignmentExpression('=', t.memberExpression(e, t.identifier('code')), t.stringLiteral('MODULE_NOT_FOUND'))),
                    t.throwStatement(e)
                  ])))]))
                ])), []))
              ]));
            }
          }

          /*
           * Construct the full body wrapper
           */
          // path to ensure bindings are created for exports and __dew__
          // tracking at https://github.com/babel/babel/issues/8358
          function unshiftBody (path, newNode) {
            const [newPath] = path.unshiftContainer('body', newNode);
            if (t.isVariableDeclaration(newPath)) {
              for (const decl of newPath.get('declarations')) {
                path.scope.registerBinding(decl.node.id.name, decl.get('id'));
              }
            }
          }
          function pushBody (path, newNode) {
            const [newPath] = path.pushContainer('body', newNode);
            if (t.isVariableDeclaration(newPath)) {
              for (const decl of newPath.get('declarations')) {
                path.scope.registerBinding(decl.node.id.name, decl.get('id'));
              }
            }
          }

          if (state.opts.nowrap) {
            state.inserting = true;

            let curChildren;
            if (state.topLevelReturn) {
              curChildren = [];
              for (const childPath of path.get('body')) {
                curChildren.push(childPath);
              }
            }

            if (state.usesModule)
              unshiftBody(path, moduleDeclarator);
            if (needsExports)
              unshiftBody(path, t.variableDeclaration('var', [
                t.variableDeclarator(exportsIdentifier, t.objectExpression([]))
              ]));
            if (state.usesGlobal)
              unshiftBody(path, 
                t.variableDeclaration('var', [t.variableDeclarator(state.globalIdentifier,
                  t.conditionalExpression(globalThisPredicate, globalThis, t.conditionalExpression(ifSelfPredicate, selfIdentifier, t.identifier('global')))
                )]));
            for (let i = state.deps.length - 1; i >= 0; i--) {
              const dep = state.deps[i];
              if (dep.ns && dep.mid.name !== dep.id.name) {
                unshiftBody(path, t.tryStatement(t.blockStatement([
                  t.ifStatement(
                    t.binaryExpression('in', t.stringLiteral('default'), dep.mid),
                    t.expressionStatement(t.assignmentExpression('=', dep.id, t.memberExpression(dep.mid, defaultIdentifier)))
                  )
                ]), t.catchClause(t.identifier('e'), t.blockStatement([]))));
                unshiftBody(path, t.variableDeclaration('var', [t.variableDeclarator(dep.id, dep.mid)]));
              }
              unshiftBody(path, 
                t.importDeclaration([
                  dep.dew && !dep.ns ? t.importSpecifier(dep.mid, dewIdentifier) : (dep.ns ? t.importNamespaceSpecifier : t.importDefaultSpecifier)(dep.mid)
                ], dep.literal)
              );
            }
            // top-level return still requires a wrapper
            if (state.topLevelReturn) {
              pushBody(path, 
                t.expressionStatement(t.callExpression(t.functionExpression(null, [], t.blockStatement(curChildren.map(path => path.node))), []))
              );
              for (const path of curChildren)
                path.remove();
            }

            if ((!state.opts.namedExports || !state.opts.namedExports.includes('default')) && exportsReturn)
              pushBody(path,
                t.exportDefaultDeclaration(exportsReturn)
              );

            if (state.opts.namedExports && state.opts.namedExports.length) {
              const exportDeclarations = [];
              const namedExports = [];
              const varDeclarations = [];
              for (const name of state.opts.namedExports) {
                const id = t.identifier(name);
                if (name === 'default') {
                  if (exportsReturn)
                    pushBody(path, t.exportDefaultDeclaration(exportsReturn));
                }
                else if (!hasBinding(path, name) && !strictReservedOrKeyword[name] && !transformIds[name] && !state.globalRefs.has(name)) {
                  exportDeclarations.push(t.variableDeclarator(id, t.memberExpression(namedExportsId, id)));
                }
                else {
                  const uid = path.scope.generateUidIdentifier(name);
                  varDeclarations.push(t.variableDeclarator(uid, t.memberExpression(namedExportsId, id)));
                  namedExports.push(t.exportSpecifier(uid, id));
                }
              }
              if (exportDeclarations.length)
                pushBody(path, t.exportNamedDeclaration(t.variableDeclaration('const', exportDeclarations), []));
              if (varDeclarations.length)
                pushBody(path, t.variableDeclaration('const', varDeclarations), []);
              if (namedExports.length)
                pushBody(path, t.exportNamedDeclaration(null, namedExports));
            }
            return;
          }

          let dewBodyWrapper = [];

          state.deps.forEach(dep => {
            dewBodyWrapper.push(
              t.importDeclaration([
                dep.dew && !dep.ns ? t.importSpecifier(dep.mid, dewIdentifier) : (dep.ns ? t.importNamespaceSpecifier : t.importDefaultSpecifier)(dep.mid)
              ], dep.literal)
            );
            if (dep.ns && dep.mid.name !== dep.id.name) {
              dewBodyWrapper.push(
                t.variableDeclaration('var', [t.variableDeclarator(dep.id, dep.mid)])
              );
              dewBodyWrapper.push(t.tryStatement(t.blockStatement([
                t.ifStatement(
                  t.binaryExpression('in', t.stringLiteral('default'), dep.mid),
                  t.expressionStatement(t.assignmentExpression('=', dep.id, t.memberExpression(dep.mid, defaultIdentifier)))
                )
              ]), t.catchClause(t.identifier('e'), t.blockStatement([]))));
            }
          });

          const execIdentifier = path.scope.generateUidIdentifier('dewExec');

          dewBodyWrapper.push(t.variableDeclaration('var', [
            t.variableDeclarator(exportsIdentifier, t.objectExpression([])),
            t.variableDeclarator(execIdentifier, t.booleanLiteral(false))
          ]));

          if (state.usesModule)
            dewBodyWrapper.push(moduleDeclarator);

          if (state.usesGlobal)
            dewBodyWrapper.push(
              t.variableDeclaration('var', [t.variableDeclarator(state.globalIdentifier,
                t.conditionalExpression(globalThisPredicate, globalThis, t.conditionalExpression(ifSelfPredicate, selfIdentifier, t.identifier('global')))
              )]));

          dewBodyWrapper.push(
            t.exportNamedDeclaration(
              t.functionDeclaration(dewIdentifier, [], t.blockStatement([
                t.ifStatement(execIdentifier, t.returnStatement(exportsReturn)),
                t.expressionStatement(t.assignmentExpression('=', execIdentifier, t.booleanLiteral(true))),
                ...path.node.body,
                t.returnStatement(exportsReturn)
              ])),
              []
            )
          );

          for (const childPath of path.get('body')) {
            childPath.remove();
          }

          state.inserting = true;
          
          for (let i = 0; i < dewBodyWrapper.length; i++)
            pushBody(path, dewBodyWrapper[i]);
        }
      },

      // octal upgrades
      NumericLiteral (path) {
        if (path.node.extra)
          delete path.node.extra;
      },
      StringLiteral (path) {
        if (path.node.extra)
          delete path.node.extra;
      },

      /*
       * Support eval('require')
       */
      CallExpression (path, state) {
        if (!state.opts.browserOnly && t.isIdentifier(path.node.callee, { name: 'eval' }) && !path.scope.getBinding('eval') &&
            path.node.arguments.length === 1 && t.isStringLiteral(path.node.arguments[0], { value: 'require' })) {
          path.replaceWith(t.identifier('require'));
        }
      },

      /*
       * Define plugin
       * Detect unsupported require lookups
       */
      MemberExpression (path, state) {
        if (state.inserting)
          return;
        if (t.isIdentifier(path.node.object, { name: 'require' }) && !hasBinding(path, 'require')) {
          let name = path.node.computed ? path.node.property.value : path.node.property.name;
          if (name)
          switch (name) {
            case 'resolve':
              if (t.isCallExpression(path.parent) && path.parent.callee === path.node &&
                  path.parent.arguments.length === 1) {
                state.requireResolve = true;
                const expr = path.parent.arguments[0];
                const arg = resolvePartialWildcardString(expr, false, []);
                // browser resolve wildcards not currently supported
                let resolved = arg.indexOf('*') !== -1 ? null : state.opts.resolve(arg, { browserResolve: true });
                if (resolved === undefined)
                  resolved = arg;
                const requireBinding = getNodeRequireBinding(path,  state);
                if (state.opts.browserOnly) {
                  if (resolved === null) {
                    // _nodeRequire(expr)
                    path.parentPath.replaceWith(t.callExpression(requireBinding, [expr]));
                  }
                  else {
                    // './browser-string';
                    path.parentPath.replaceWith(t.stringLiteral(resolved));
                  }
                }
                else {
                  if (resolved === null) {
                    // (_nodeRequire.resolve || _nodeRequire)(expr)  
                    path.parentPath.replaceWith(t.callExpression(t.logicalExpression('||',
                      t.memberExpression(requireBinding, t.identifier('resolve')),
                      requireBinding
                    ), [expr]));
                  }
                  else {
                    // _nodeRequire.resolve ? _nodeRequire.resolve(expr) : './browser-string';
                    path.parentPath.replaceWith(t.conditionalExpression(
                      t.memberExpression(requireBinding, t.identifier('resolve')),
                      t.callExpression(t.memberExpression(requireBinding, t.identifier('resolve')), [expr]),
                      t.stringLiteral(resolved)
                    ));
                  }
                }
              }
              // non-call of require.resolve
              else {
                state.requireResolve = true;
                path.get('object').replaceWith(getNodeRequireBinding(path,  state));
              }
            break;
            // TODO: require.main === module -> import.meta.main
            case 'main':
              path.replaceWith(t.identifier('undefined'));
            break;
            case 'extensions':
            case 'cache':
              path.replaceWith(t.objectExpression([]));
            break;
            default:
              path.replaceWith(t.identifier('undefined'));
          }
        }
        else if (state.functionDepth > 0 && t.isIdentifier(path.node.object, { name: 'arguments' }) && t.isIdentifier(path.node.property, { name: 'callee' })) {
          let funcPath = path;
          let func = funcPath.scope.block;
          while (!t.isFunction(func)) {
            funcPath = funcPath.parentPath;
            func = funcPath.scope.block;
          }
          if (!func.id) {
            func.id = funcPath.scope.generateUidIdentifier();
          }
          path.replaceWith(func.id);
        }
      },

      Scope: {
        enter (path, state) {
          if (t.isFunction(path.scope.block))
            state.functionDepth++;
        },
        exit (path, state) {
          if (t.isFunction(path.scope.block))
            state.functionDepth--;
        }
      },

      Class: {
        enter (path, state) {
          state.classDepth++;
        },
        exit (path, state) {
          state.classDepth--;
        }
      },

      // labelled function declarations not ES6
      LabeledStatement (path) {
        if (t.isFunctionDeclaration(path.node.body))
          path.replaceWith(path.node.body);
      },

      // with statement eval
      WithStatement (path, state) {
        let scope = path.scope;
        let allBindings = new Set();
        do {
          for (const name of Object.keys(scope.bindings)) {
            allBindings.add(name);
          }
        } while (scope = scope.parentScope);
        const id = path.scope.generateUidIdentifier();
        path.replaceWith(t.expressionStatement(t.callExpression(
          t.newExpression(t.identifier('Function'), [
            t.stringLiteral(id.name),
            ...[...allBindings].map(name => t.stringLiteral(name)),
            t.templateLiteral([
              t.templateElement({ raw: `with (${id.name}) { ${state.source.slice(path.node.body.start, path.node.body.end).replace(/`/g, '\\`')} }` })
            ], [])
          ]),
          [path.node.object, ...[...allBindings].map(name => t.identifier(name))]
        )));
      },

      FunctionDeclaration (path, state) {
        if (state.inserting)
          return;
        const binding = path.scope.getBinding(path.node.id.name);
        if (!binding)
          return;

        const bindingNode = path.node;

        // not a real constant violation, if its a declaration inside of a function
        const isFunctionBinding = t.isFunction(path.node);
        const constantViolations = binding.constantViolations.filter(violation => {
          if (!isFunctionBinding) return true;
          let path = violation;
          do {
            if (path.node === bindingNode) {
              return false;
            }
            if (path.parentPath && path.parentPath.node === bindingNode && bindingNode.params.includes(path.node)) {
              return true;
            }
          } while (path = path.parentPath);
          return true;
        });

        // if there are function declarations after this one,
        // remove this and them except the last
        if (constantViolations.length) {
          const includesThisPath = constantViolations.some(refPath => refPath.node === path.node);
          const fnPaths = [...includesThisPath ? [] : [path], ...constantViolations]
            .filter(path => t.isFunctionDeclaration(path.node))
            .sort((pathA, pathB) => pathA.node.start > pathB.node.start ? 1 : -1);

          if (fnPaths.length > 1) {
            const newBinding = fnPaths.pop();
            for (const refPath of fnPaths)
              refPath.remove();
            // ensure the last function path is registered as the binding
            path.parentPath.scope.registerBinding(newBinding.node.id.name, newBinding.get('id'));
          }
        }

        // replace all duplicate vars with assignments
        for (const refPath of constantViolations) {
          if (t.isVariableDeclarator(refPath.node)) {
            if (t.isIdentifier(refPath.node.id)) {
              if (t.isForOfStatement(refPath.parentPath.parentPath) ||
                  t.isForInStatement(refPath.parentPath.parentPath)) {
                refPath.parentPath.replaceWith(refPath.node.id);
              }
              else if (t.isForStatement(refPath.parentPath.parentPath)) {
                if (refPath.node.init === null)
                  refPath.parentPath.replaceWith(refPath.node.id);
                else
                  refPath.parentPath.replaceWith(t.assignmentExpression('=', refPath.node.id, refPath.node.init));
              }
              else if (refPath.node.init === null) {
                const name = refPath.node.id.name;
                refPath.remove();
                path.parentPath.scope.registerBinding(name, path.get('id'));
              }
              else if (refPath.parentPath.node.declarations && refPath.parentPath.node.declarations.length === 1) {
                refPath.parentPath.replaceWith(t.expressionStatement(t.assignmentExpression('=', refPath.node.id, refPath.node.init)));
              }
            }
          }
        }
      },

      VariableDeclarator (path, state) {
        if (state.inserting)
          return;

        const binding = path.scope.getBinding(path.node.id.name);
        if (!binding)
          return;

        if (binding.constantViolations.some(path => t.isFunction(path.node) && path.node.id && path.node.id.name === binding.identifier.name)) {
          const newBinding = binding.constantViolations.find(path => t.isFunction(path.node));
          if (t.isIdentifier(path.node.id)) {
            if (t.isForOfStatement(path.parentPath.parentPath) ||
                t.isForInStatement(path.parentPath.parentPath)) {
              path.parentPath.replaceWith(path.node.id);
            }
            else if (t.isForStatement(path.parentPath.parentPath)) {
              if (path.node.init === null)
                path.parentPath.replaceWith(path.node.id);
              else
                path.parentPath.replaceWith(t.assignmentExpression('=', path.node.id, path.node.init));
            }
            else if (path.node.init === null) {
              const name = path.node.id.name;
              path.skip();
              path.remove();
              path.parentPath.scope.registerBinding(name, newBinding.get('id'));
            }
            else if (path.parentPath.node.declarations && path.parentPath.node.declarations.length === 1) {
              path.parentPath.replaceWith(t.expressionStatement(t.assignmentExpression('=', path.node.id, path.node.init)));
            }
          }
        }
      },

      BindingIdentifier (path, state) {
        if (state.inserting)
          return;
        // duplicate function args
        if ((t.isFunctionDeclaration(path.parentPath.node) || t.isFunctionExpression(path.parentPath.node)) &&
            path.parentPath.node !== path.node) {
          const params = path.parentPath.node.params;
          const usedParams = new Set();
          for (let i = params.length - 1; i >= 0; i--) {
            const param = params[i];
            // duplicates only supported for identifiers
            if (!t.isIdentifier(param))
              break;
            if (usedParams.has(param.name))
              path.parentPath.get(`params.${i}`).replaceWith(path.scope.generateUidIdentifier(param.name));
            else
              usedParams.add(param.name);
          }
        }
        // reserved identifiers
        let identifierName = path.node.name;
        if (strictReservedOrKeyword[identifierName] || state.functionDepth === 0 && topLevelReserved[identifierName]) {
          path.scope.rename(identifierName);
          return;
        }

        if (identifierName === 'exports' && !hasBinding(path, identifierName))
          state.usesExports = true;
      },

      // Check process guards: don't include process statements guarded by typeof checks on process
      LogicalExpression: createProcessGuard((path, state) => {
        let truthy = false;
        if (path.node.operator === '&&')
          truthy = true;
        else if (path.node.operator !== '||' && path.node.operator !== '??')
          return;
        let processCheck = getIfTypeOfCheck(path.node.left, 'process', 'object');
        if (processCheck === null)
          return;
        if (processCheck === false)
          truthy = !truthy;
        return truthy;
      }),
      ConditionalExpression: createProcessGuard(function (path, state) {
        return getIfTypeOfCheck(path.node.test, 'process', 'object');
      }),
      IfStatement: createProcessGuard(function (path, state) {
        // support any logical expression on:
        // - typeof process === 'object' && ... && ...
        // - typeof process !== 'object' || ... || ...
        // further variations could be added here in future as needed
        if (t.isLogicalExpression(path.node.test)) {
          let truthy = false;
          if (path.node.test.operator === '&&')
            truthy = true;
          else if (path.node.test.operator !== '||' && path.node.test.operator !== '??')
            return;
          let processCheck = getIfTypeOfCheck(path.node.test.left, 'process', 'object');
          if (processCheck === null)
            return;
          if (processCheck === false)
            truthy = !truthy;
          return truthy;
        } else {
          return getIfTypeOfCheck(path.node.test.left, 'process', 'object');
        }
      }),

      /*
       * process / Buffer become imports
       * global renames to global alias
       * detect usage of module
       */
      ReferencedIdentifier (path, state) {
        if (state.inserting || !isLive(path))
          return;
        let identifierName = path.node.name;

        if (state.argsId && identifierName === 'arguments' && state.functionDepth > 0 && path.scope.getBinding(identifierName) === undefined) {
          const fnPath = getFunctionScope(path);
          if (fnPath.node === state.argsFn)
            path.replaceWith(state.argsId);
          return;
        }

        if (!hasBinding(path, identifierName)) {
          state.globalRefs.add(path.node.name);
          if (strictReservedOrKeyword[identifierName] && identifierName !== 'null') {
            state.usesGlobal = true;
            path.replaceWith(t.memberExpression(state.globalIdentifier, path.node));
            return;
          }
        }

        // either a member "x" about to be referenced more deeply
        // ot a direct identifier "y"
        if (state.define.hasOwnProperty(identifierName)) {
          let definePath = path;
          let definedIdentifier = state.define[identifierName];
          while (typeof definedIdentifier !== 'string') {
            let parent = definePath.parentPath.node;
            if (!t.isMemberExpression(parent) || parent.object !== definePath.node ||
                !t.isIdentifier(parent.property, { name: definedIdentifier.defineName })) {
              definePath = undefined;
              break;
            }
            definePath = definePath.parentPath;
            definedIdentifier = definedIdentifier.defineProperty;
          }
          if (definePath &&
              !(t.isAssignmentExpression(definePath.parentPath) && definePath.parentPath.node.left === definePath.node)) {
            definePath.replaceWithSourceString(definedIdentifier);
            dce(definePath);
            return;
          }
        }

        /*
         * Require support
         */
        function isRequireFunctionWrapper (binding) {
          if (!binding)
            return false;
          return t.isFunction(binding.path.parent) && binding.path.parent.params[0] === binding.path.node &&
            t.isCallExpression(binding.path.parentPath.parentPath) && binding.path.parentPath.parentPath.node.arguments[0] === binding.path.parent;
        }
        if (identifierName === 'require' && (!hasBinding(path, 'require') || isRequireFunctionWrapper(path.scope.getBinding('require')))) {
          let parentPath = path.parentPath;
          if (t.isCallExpression(parentPath) && parentPath.node.callee === path.node) {
            const parentParentNode = parentPath.parentPath && parentPath.parentPath.node;
            // Promise.resolve(require(dyn)) -> Promise.resolve(import(dyn))
            if (t.isCallExpression(parentParentNode) &&
                parentParentNode.arguments.length === 1 &&
                parentParentNode.arguments[0] === parentPath.node &&
                t.isMemberExpression(parentParentNode.callee) &&
                t.isIdentifier(parentParentNode.callee.object, { name: 'Promise' }) &&
                t.isIdentifier(parentParentNode.callee.property, { name: 'resolve' }) &&
                !canResolvePartialWildcardString(parentPath.node.arguments[0])) {
              parentPath.replaceWith(
                t.callExpression(
                  t.memberExpression(t.callExpression(t.import(), parentPath.node.arguments), t.identifier('then')),
                  [t.arrowFunctionExpression([t.identifier('m')], t.memberExpression(t.identifier('m'), defaultIdentifier))]
                )
              );
            }
            else {
              const dep = addDependency(path, state, parentPath.node.arguments[0], isOptionalRequire(parentPath));
              if (dep) {
                try {
                  parentPath.replaceWith(dep);
                }
                catch (e) {
                  if (e.message !== 'Container is falsy')
                    throw e;
                }
              }
            }
          }
          else {
            // require escape
            if (!t.isMemberExpression(path.parentPath) || path.parentPath.node.object !== path.node) {
              if (!state.opts.browserOnly) {
                state.requireResolve = true;
                path.replaceWith(getNodeRequireBinding(path, state));
              }
              else {
                path.replaceWith(t.identifier('null'));
              }
            }
          }
        }
        else if (!state.opts.browserOnly && identifierName === '__non_webpack_require__') {
          path.replaceWith(getNodeRequireBinding(path, state));
        }
        else if (!state.hasProcess && !state.processGuard && identifierName === 'process' && !hasBinding(path, 'process')) {
          state.hasProcess = true;
        }
        else if (!state.hasBuffer && !state.bufferGuard && identifierName === 'Buffer' && !hasBinding(path, 'Buffer')) {
          state.hasBuffer = true;
        }
        else if (identifierName === 'module' && !hasBinding(path, 'module')) {
          let parentPath = path.parentPath;
          let parentNode = parentPath.node;
          if (t.isMemberExpression(parentNode) && parentNode.object === path.node) {
            let name = parentNode.computed ? parentNode.property.value : parentNode.property.name;
            if (name)
            switch (name) {
              case 'id':
              case 'filename':
                if (state.opts.filename)
                  parentPath.replaceWith(filenameReplace);
              break;
              case 'parent':
                parentPath.replaceWith(t.identifier('undefined'));
              break;
              case 'loaded':
              break;
              case 'children':
                parentPath.replaceWith(t.objectExpression([]));
              break;
              case 'paths':
                parentPath.replaceWith(t.arrayExpression([]));
              break;
              // require alternative
              case 'require':
                if (t.isCallExpression(parentPath.parent) && parentPath.parent.callee === parentPath.node) {
                  const dep = addDependency(parentPath, state, parentPath.parent.arguments[0], isOptionalRequire(parentPath.parentPath));
                  if (dep)
                    parentPath.parentPath.replaceWith(dep);
                }
                else {
                  state.usesDynamicRequire = true;
                }
              break;
              case 'exports':
                if (!hasBinding(path, 'exports')) {
                  state.moduleDotExports.push(parentPath);
                  break;
                }
              default:
                // need module
                state.usesModule = true;
            }
            return;
          }
          else if (t.isLogicalExpression(parentNode) && parentNode.left === path.node && parentNode.operator === '&&') {
            path.replaceWith(t.booleanLiteral(true));
          }
          else {
            state.usesModule = true;
          }
        }

        if (identifierName === '__filename' && state.opts.filename && !hasBinding(path, '__filename')) {
          path.replaceWith(filenameReplace);
        }
        else if (identifierName === '__dirname' && state.opts.dirname && !hasBinding(path, '__dirname')) {
          path.replaceWith(dirnameReplace);
        }
        else if (identifierName === 'global' && !hasBinding(path, 'global')) {
          state.usesGlobal = true;
          path.replaceWith(state.globalIdentifier);
        }
        else if (identifierName === 'define' && !hasBinding(path, 'define')) {
          path.replaceWith(t.identifier('undefined'));
          dce(path);
        }
        else if (identifierName === 'exports' && !hasBinding(path, 'exports')) {
          state.usesExports = true;
        }
        else if (identifierName === 'setImmediate' && !hasBinding(path, 'setImmediate')) {
          if (t.isUnaryExpression(path.parentPath.node, { operator: 'typeof' }) && isLogicalOrConditionalBinaryExpression(path.parentPath.parentPath)) {
            return;
          }
          if (t.isConditionalExpression(path.parentPath) && isLogicalOrConditionalBinaryExpression(path.parentPath.get('test')) && t.isUnaryExpression(path.parentPath.node.test.right, { operator: 'typeof' }) && t.isIdentifier(path.parentPath.node.test.right.argument, { name: 'setImmediate' })) {
            return;
          }
          if (hasBinding(path, 'process')) {
            state.processId = state.processId || path.scope.generateUidIdentifier('process');
            path.replaceWith(t.memberExpression(state.processId, t.identifier('nextTick')));
          }
          else {
            state.hasProcess = true;
            path.replaceWith(t.memberExpression(t.identifier('process'), t.identifier('nextTick')));
          }
        }
      },

      /*
       * Top-level return must be falsy
       */
      ReturnStatement (path, state) {
        if (state.inserting)
          return;
        if (state.functionDepth === 0) {
          if (state.opts.nowrap) {
            state.topLevelReturn = true;
          }
          else if (path.node.argument) {
            if (t.isLogicalExpression(path.node.argument) && t.isIdentifier(path.node.argument.right, { name: 'undefined' }))
              return;
            path.get('argument').replaceWith(t.logicalExpression('&&', path.node.argument, t.identifier('undefined')));
          }
        }
      },

      /*
       * top-level this.X -> exports.X
       */
      ThisExpression (path, state) {
        if (state.inserting)
          return;
        if (state.functionDepth === 0) {
          state.usesExports = true;
          path.replaceWith(exportsIdentifier);
        }
        else if (!state.isStrict && state.classDepth === 0) {
          state.usesGlobal = true;
          const parentPath = path.parentPath;
          const directCall = t.isMemberExpression(parentPath.node) && parentPath.node.object === path.node
              && t.isCallExpression(parentPath.parentPath.node) && parentPath.parentPath.node.callee === parentPath.node;
          if (!directCall) {
            thisOrGlobal = thisOrGlobal || t.logicalExpression('||', t.thisExpression(), state.globalIdentifier);
            if (parentPath.node !== thisOrGlobal)
              path.replaceWith(thisOrGlobal);
          }
        }
      },

      /*
       * Unbound global handling
       */
      AssignmentExpression (path, state) {
        if (state.inserting)
          return;
        if (t.isIdentifier(path.node.left)) {
          let identifierName = path.node.left.name;

          // arguments assignment
          if (identifierName === 'arguments' && path.scope.getBinding(identifierName) === undefined && state.functionDepth > 0) {
            const fnPath = getFunctionScope(path);
            if (fnPath) {
              const uid = path.scope.generateUidIdentifier('arguments');
              fnPath.unshiftContainer('body', [t.variableDeclaration('let', [t.variableDeclarator(uid, t.identifier('arguments'))])]);
              state.argsId = uid;
              state.argsFn = fnPath.node;
              path.get('left').replaceWith(uid);
            }
            return;
          }

          /*
           * Strict conversion (should really be extended to all assignment forms: destructuring, update expression, iterator assignment)
           * p = 5; where p is unbound -> p added to top scope
           */
          if (!state.isStrict && !hasBinding(path, identifierName) && cjsScopeVars.indexOf(identifierName) === -1) {
            state.usesGlobal = true;
            path.replaceWith(t.assignmentExpression('=', t.memberExpression(state.globalIdentifier, path.node.left), path.node.right));
          }
        }
      },

      UnaryExpression (path, state) {
        if (state.inserting)
          return;
        if (path.node.operator === 'typeof') {
          if (t.isIdentifier(path.node.argument)) {
            let identifierName = path.node.argument.name;
            if (identifierName === 'require' && !hasBinding(path, identifierName)) {
              path.replaceWith(t.stringLiteral('function'));
              dce(path);
            }
            else if (identifierName === 'module' && !hasBinding(path, identifierName)) {
              path.replaceWith(t.stringLiteral('object'));
              dce(path);
            }
            else if (identifierName === 'exports' && !hasBinding(path, identifierName)) {
              path.replaceWith(t.stringLiteral('object'));
              dce(path);
            }
          }
        }
        if (path.node.operator === 'delete' && t.isIdentifier(path.node.argument)) {
          path.skip();
          path.remove();
        }
      }
    }
  };
}
