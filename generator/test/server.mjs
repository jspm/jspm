import http from "http";
import fs from "fs";
import { once } from "events";
import { extname, resolve } from "path";
import { fileURLToPath } from "url";
import open from "open";
import kleur from "kleur";
import { spawn } from "child_process";
import glob from "glob";
import path from "path";

const port = 5776;

const rootURL = new URL("../../", import.meta.url);

const mimes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".json": "application/json",
  ".wasm": "application/wasm",
};

const shouldExit = !process.env.WATCH_MODE;
const testName = process.env.TEST_NAME ?? "test";
const skipPerf = process.env.SKIP_PERF !== undefined;

const testBase = resolve(fileURLToPath(import.meta.url) + "/../");
const tests = glob
  .sync(testBase + "/**/*.test.js")
  .map((test) => test.slice(testBase.length + 1, -3))
  .filter((test) => !test.startsWith("deno/") && !test.includes('skipbrowser') && (skipPerf === false || !test.endsWith('perf.test')))
  .sort((a, b) => a.endsWith('perf.test') ? 1 : b.endsWith('perf.test') ? -1 : 0);
// console.log(tests);

let failTimeout, browserTimeout;

function setBrowserTimeout() {
  if (!shouldExit) return;
  if (browserTimeout) clearTimeout(browserTimeout);
  browserTimeout = setTimeout(() => {
    console.log("No browser requests made to server for 30s, closing.");
    process.exit(failTimeout || process.env.CI_BROWSER ? 1 : 0);
  }, 240_000);
}

setBrowserTimeout();

http
  .createServer(async function (req, res) {
    setBrowserTimeout();
    if (req.url === "/debug") {
      console.log(req.headers.message);
      res.writeHead(200);
      res.end("");
      return;
    } else if (req.url.startsWith("/tests/ping")) {
      res.writeHead(200);
      res.end("");
      return;
    } else if (req.url.startsWith("/tests/list")) {
      res.writeHead(200, {
        "content-type": "application/json",
        "cache-control": "no-cache",
      });
      res.end(JSON.stringify(tests));
      return;
    } else if (req.url.startsWith("/done")) {
      console.log(kleur.green("Tests completed successfully."));
      const message = new URL(req.url, rootURL).searchParams.get("message");
      if (message) console.log(message);
      if (shouldExit) {
        process.exit();
      }
      return;
    } else if (req.url.startsWith("/error?")) {
      const cnt = req.url.slice(7);
      console.log(kleur.red(cnt + " test failures found."));

      // The reasons for the failures are in the request body:
      const body = await once(req, "data");
      const failures = JSON.parse(body);
      for (const [name, err] of failures) {
        console.log(kleur.red(`  ${name}: ${err}`));
      }

      if (shouldExit) {
        failTimeout = setTimeout(() => process.exit(1), 5000);
      }
    } else if (failTimeout) {
      clearTimeout(failTimeout);
      failTimeout = null;
    }

    const url = new URL(
      req.url[0] === "/" ? req.url.slice(1) : req.url,
      rootURL
    );
    const filePath = fileURLToPath(url);

    // redirect to test/test.html file by default
    if (url.href === rootURL.href) {
      res.writeHead(301, {
        location: "/test/test.html",
      });
      res.end();
      return;
    }

    let fileStream;
    try {
      fileStream = fs.createReadStream(filePath);
      await once(fileStream, "readable");
      if (filePath.endsWith(path.sep)) {
        console.log("404: " + filePath);
        fileStream.close();
        res.writeHead(404, {
          "content-type": "text/html",
        });
        res.end(`File not found.`);
        return;
      }
    } catch (e) {
      if (e.code === "EISDIR") {
        console.log("200: " + filePath);
        res.writeHead(200, { "content-type": "text/plain" });
        res.end("Directory");
      } else if (e.code === "ENOENT" || e.code === "ENOTDIR") {
        console.log("404: " + filePath);
        res.writeHead(404, {
          "content-type": "text/html",
        });
        res.end(`File not found.`);
      }
      return;
    }

    let mime;
    if (filePath.endsWith("javascript.css")) mime = "application/javascript";
    else if (filePath.endsWith("content-type-xml.json"))
      mime = "application/xml";
    else mime = mimes[extname(filePath)] || "text/plain";

    const headers = filePath.endsWith("content-type-none.json")
      ? {}
      : { "content-type": mime, "Cache-Control": "no-cache" };

    console.log("200: " + filePath);
    res.writeHead(200, headers);
    fileStream.pipe(res);
    await once(fileStream, "end");
    res.end();
  })
  .listen(port);

if (process.env.CI_BROWSER) {
  spawn(process.env.CI_BROWSER, [
    ...(process.env.CI_BROWSER_FLAGS
      ? process.env.CI_BROWSER_FLAGS.split(" ")
      : []),
    `http://localhost:${port}/generator/test/${testName}.html`,
  ]);
} else {
  open(`http://localhost:${port}/generator/test/${testName}.html`);
}
