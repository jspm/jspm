import { getExports, getVersions, resolvePkg } from "./api.js";
import "./progress.js";
import { toast } from "./toast.js";

let deps, depsListener, subpathCnt, metadataPromise;

function sortDeps() {
  deps = deps.sort(([a], [b]) => (a > b ? 1 : -1));
}

const progressBar = document.querySelector("progress-bar.deps");
progressBar.setEstimate(5000);

const renderSubpath = (subpath) => `
      <div class="subpath">
        <span>${subpath.subpath.replace(/\./g, '<span class="dot">.</span>')}${
  subpath.subpath === "." ? ' <span class="info">[main entry]</span>' : ""
}</span>
        <div class="right">
          <div class="preload">
            <label for="preload${++subpathCnt}">Preload</label>
            <div class="button r">
              <input type="checkbox" class="checkbox" id="preload${subpathCnt}"${
  subpath.preload ? " checked" : ""
}>
              <div class="knobs"><div class="knob"></div></div>
              <div class="layer"></div>
            </div>
          </div>
          <div class="remove"></div>
        </div>
      </div>
`;

const renderDep = (opts, collapsed) => `
  <div class="dependency${collapsed ? "" : " expanded"}">
    <div class="main">
      <div class="expand"></div>
      <div class="name">${opts.name}</div>
      <div class="right">
        <select-box class="version borderless unsized loading">
          <div class="selected"><span>${opts.version}</span></div>
          <div class="options"></div>
        </select-box>
        <div class="remove"></div>
      </div>
    </div>
    <div class="subpaths-container">
      <div class="subpaths">
        ${opts.subpaths.map((subpath) => renderSubpath(subpath)).join("\n")}
        <div class="subpath add-export">
          <select-box class="borderless loading new-export">
            <div class="selected"><span>Add Package Export</span></div>
            <div class="options">
              <div class="option"><span>Option</span></div>
            </div>
          </select-box>
        </div>
      </div>
    </div>
  </div>
`;

function getDepEl(name) {
  for (const dep of document.querySelectorAll(".dependencies .name")) {
    if (dep.innerHTML === name) return dep.parentNode.parentNode;
  }
}

async function loadAndInjectExports({ name, version }) {
  const depEl = getDepEl(name);
  if (!depEl) return;
  depEl.querySelector("select-box.new-export").className =
    "new-export borderless loading";
  depEl.querySelector("select-box.new-export .options").innerHTML = "";
  const exports = await getExports(name, version);
  if (!exports) return;
  depEl.querySelector("select-box.new-export .options").innerHTML = exports
    .map(
      (e) =>
        `<div class="option"><span>${e}${
          e === "." ? ' <span class="info">[main entry]</span>' : ""
        }</span></div>`
    )
    .join("\n");
  depEl.querySelector("select-box.new-export").className =
    "new-export borderless";
}

async function loadAndInjectMetadata({ name, version }) {
  await Promise.all([
    getVersions(name).then((versions) => {
      if (!versions) return;
      const depEl = getDepEl(name);
      if (!depEl) return;
      depEl.querySelector("select-box.version .options").innerHTML = versions
        .map((v) => `<div class="option"><span>${v}</span></div>`)
        .join("\n");
      depEl.querySelector("select-box.version").className =
        "version borderless unsized";
    }),
    loadAndInjectExports({ name, version }),
  ]);
  progressBar.completeWork();
}

export async function initDependencies(_deps) {
  deps = _deps;
  sortDeps();

  // clear existing dependencies
  detachDependencies();
  let renderedDeps = [];

  const depMap = new Map();
  for (const [dep, preload] of deps) {
    const { name, version, subpath } = fromPkgStr(dep);
    const existing = depMap.get(name);
    if (existing) existing.subpaths.push({ subpath, preload });
    else depMap.set(name, { name, version, subpaths: [{ subpath, preload }] });
  }

  subpathCnt = 0;
  for (const dep of depMap.values()) renderedDeps.push(renderDep(dep));

  document.querySelector(".dependencies-container").innerHTML =
    renderedDeps.join("\n");
  attachDependencies();

  progressBar.addWork(depMap.size);
  metadataPromise = Promise.all(
    [...depMap.values()].map(loadAndInjectMetadata)
  );
  await metadataPromise;
}

export function onDepChange(listener) {
  depsListener = listener;
}

function sanitizeExport(option) {
  return option.replace(
    /^(<span class="dot">)?\.?(<\/span>)? ?(<span class="info">)?\[main entry\](<\/span>)?$/,
    "."
  );
}

function getSubpathInfo(subpathEl) {
  const { name, version } = getDepInfo(
    subpathEl.parentNode.parentNode.parentNode
  );
  const subpath = sanitizeExport(subpathEl.querySelector("span").innerText);
  return { name, version, subpath };
}

function getDepInfo(depEl) {
  const name = depEl.querySelector(".name").innerHTML;
  const version = depEl.querySelector(".version .selected span").innerHTML;
  return { name, version };
}

function toPkgStr({ name, version, subpath }) {
  return name + "@" + version + subpath.slice(1);
}
function fromPkgStr(pkg) {
  const versionIndex = pkg.indexOf("@", 1);
  const name = pkg.slice(0, versionIndex);
  let subpathIndex = pkg.indexOf("/", versionIndex);
  if (subpathIndex === -1) subpathIndex = pkg.length;
  const version = pkg.slice(versionIndex + 1, subpathIndex);
  const subpath = "." + pkg.slice(name.length + version.length + 1);
  return { name, version, subpath };
}

function removeSubpath(subpathEl) {
  const pkgStr = toPkgStr(getSubpathInfo(subpathEl));
  subpathEl.parentNode.removeChild(subpathEl);
  depsListener((deps = deps.filter(([dep]) => dep !== pkgStr)));
}

function collapseAllExcept(el) {
  for (const depEl of document.querySelectorAll(".dependency")) {
    if (depEl === el) depEl.className = "dependency expanded";
    else depEl.className = "dependency";
  }
}

function expandRemoveHandler(e) {
  if (
    e.target.className === "expand" ||
    e.target.className === "main" ||
    e.target.className === "name" ||
    (e.target.className === "right" && e.target.parentNode.className === "main")
  ) {
    const dep =
      e.target.className === "main"
        ? e.target.parentNode
        : e.target.parentNode.parentNode;
    if (dep.className.split(" ").includes("expanded"))
      dep.className = "dependency";
    else dep.className = "dependency expanded";
  } else if (e.target.className === "remove") {
    if (e.target.parentNode.parentNode.className === "main") {
      const depEl = e.target.parentNode.parentNode.parentNode;
      const { name } = getDepInfo(depEl);
      depEl.removeEventListener("click", expandRemoveHandler);
      depEl.removeEventListener("change", changeHandler);
      depEl.parentNode.removeChild(depEl);
      depsListener(
        (deps = deps.filter(([dep]) => !dep.startsWith(name + "@")))
      );
    } else if (e.target.parentNode.parentNode.className === "subpath") {
      removeSubpath(e.target.parentNode.parentNode);
    }
  }
}

function changeHandler(e) {
  const classes = e.target.className.split(" ");
  if (classes.includes("checkbox")) {
    // preload state change
    const pkgStr = toPkgStr(
      getSubpathInfo(e.target.parentNode.parentNode.parentNode.parentNode)
    );
    depsListener(
      (deps = deps.map(([dep, preload]) => {
        if (dep === pkgStr) return [dep, e.target.checked ? true : false];
        return [dep, preload];
      }))
    );
  } else if (classes.includes("version")) {
    // version change
    const { name } = getDepInfo(e.target.parentNode.parentNode.parentNode);
    updateVersion(name, e.detail.old, e.detail.new);
    loadAndInjectExports({ name, version: e.detail.new });
    depsListener(deps);
  } else if (classes.includes("new-export")) {
    e.target.set("Add Package Export");
    // export add
    const { name, version } = getDepInfo(
      e.target.parentNode.parentNode.parentNode.parentNode
    );
    injectDep(name, version, sanitizeExport(e.detail.new));
  }
}

function updateVersion(name, oldVersion, newVersion) {
  const oldPkgStr = name + "@" + oldVersion;
  const newPkgStr = name + "@" + newVersion;
  deps = deps.map(([dep, preload]) => {
    if (dep === oldPkgStr || dep.startsWith(oldPkgStr + "/"))
      return [newPkgStr + dep.slice(oldPkgStr.length), preload];
    return [dep, preload];
  });
}

function htmlToElement(html) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  let node = wrapper.childNodes[0];
  while (node.nodeType !== 1) node = node.nextSibling;
  return node;
}

async function injectDep(name, version, subpath, validate) {
  const newDep = subpath ? [toPkgStr({ name, version, subpath }), true] : null;

  const depEl = getDepEl(name);

  if (depEl && validate) collapseAllExcept(depEl);

  if (newDep && deps.some(([dep]) => dep === newDep[0])) return;

  let subpathEl;
  if (depEl) {
    const info = getDepInfo(depEl);
    if (info.version !== version) {
      depEl.querySelector("select-box.version").set(version);
      updateVersion(name, info.version, version);
    }
    if (newDep && !deps.some(([dep]) => dep === newDep[0])) {
      deps = [...deps, newDep];
      sortDeps();
      const insertAt = deps.indexOf(newDep);

      const pkgStr = name + "@" + version;
      const subpathStartIndex = deps.findIndex(
        ([dep]) => dep === pkgStr || dep.startsWith(pkgStr + "/")
      );
      const subpathIndex = insertAt - subpathStartIndex;
      subpathEl = htmlToElement(renderSubpath({ subpath, preload: true }));
      depEl
        .querySelector(".subpaths")
        .insertBefore(
          subpathEl,
          depEl.querySelectorAll("div.subpath")[subpathIndex]
        );
    }
  } else {
    if (newDep) {
      deps = [...deps, newDep];
      sortDeps();
    }
    const insertAt = deps.indexOf(newDep);

    const depEl = htmlToElement(
      renderDep({
        name,
        version,
        subpaths: newDep ? [{ subpath, preload: true }] : [],
      })
    );
    subpathEl = depEl.querySelector(".subpath");
    progressBar.addWork();
    document
      .querySelector(".dependencies-container")
      .insertBefore(depEl, document.querySelectorAll(".dependency")[insertAt]);
    if (validate) collapseAllExcept(depEl);
    depEl.addEventListener("click", expandRemoveHandler);
    depEl.addEventListener("change", changeHandler);
    loadAndInjectMetadata({ name, version });
  }

  if (validate) {
    const exports = await getExports(name, version);
    if (!exports || !exports.includes(subpath)) {
      toast(
        `"${subpath}" is not a valid export of ${name}@${version}. Select a valid export from the list via Add Package Export.`
      );
      removeSubpath(subpathEl);
      return;
    }
  }

  depsListener(deps);
}

function detachDependencies() {
  for (const dep of [...document.querySelectorAll(".dependency")]) {
    dep.removeEventListener("click", expandRemoveHandler);
    dep.removeEventListener("change", changeHandler);
    dep.parentNode.removeChild(dep);
  }
}

function attachDependencies() {
  for (const dep of [...document.querySelectorAll(".dependency")]) {
    dep.addEventListener("click", expandRemoveHandler);
    dep.addEventListener("change", changeHandler);
  }
}

document.querySelector(".add input").addEventListener("keydown", async (e) => {
  if (e.code === "Enter") {
    const value = e.target.value;
    progressBar.addWork();
    const { name, version, subpath, err } = await resolvePkg(
      value.trim().replace(/^(@[^/]+\/)?[^/]+/, (pkg) => pkg.toLowerCase())
    );
    progressBar.completeWork();
    if (err) {
      toast("Error: " + err);
      if (!name) return;
    }
    injectDep(name, version, subpath, true);
    e.target.value = "";
  }
});
