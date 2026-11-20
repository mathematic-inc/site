import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const port = Number(process.env.PORT ?? 4183);
/** @type {Readonly<Partial<Record<string, string>>>} */
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".xml": "application/xml",
  ".ttf": "font/ttf",
  ".bib": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};
/**
 * @param {unknown} error
 * @returns {boolean}
 */
function isMissingFile(error) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error.code === "ENOENT" || error.code === "ENOTDIR")
  );
}

/** @import { IncomingMessage, ServerResponse } from "node:http" */

/**
 * @param {IncomingMessage} request
 * @param {ServerResponse} response
 */
async function handleRequest(request, response) {
  try {
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end();
      return;
    }
    const url = new URL(request.url, "http://localhost");
    let path = resolve(root, decodeURIComponent(url.pathname.slice(1)));
    if (path !== root.slice(0, -1) && !path.startsWith(root.endsWith(sep) ? root : root + sep)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }
    try {
      if ((await stat(path)).isDirectory()) {
        if (!url.pathname.endsWith("/")) {
          response.writeHead(301, { Location: `${url.pathname}/${url.search}` });
          response.end();
          return;
        }
        path = resolve(path, "index.html");
      }
      const data = await readFile(path);
      response.writeHead(200, {
        "Content-Type": types[extname(path)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(request.method === "HEAD" ? undefined : data);
    } catch (error) {
      if (!isMissingFile(error)) {
        throw error;
      }
      response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      response.end(
        request.method === "HEAD" ? undefined : await readFile(resolve(root, "404.html")),
      );
    }
  } catch (error) {
    response.writeHead(error instanceof URIError ? 400 : 500);
    response.end(
      error instanceof URIError ? "Invalid path encoding" : "Could not serve this request.",
    );
    console.error(error instanceof Error ? error.message : error);
  }
}

createServer((request, response) => {
  void handleRequest(request, response);
}).listen(port, "127.0.0.1", () => {
  console.log(`Preview ready at http://127.0.0.1:${port}/`);
});
