import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Minimal static server for the exported site, so the browser tests exercise
 * exactly what gets deployed rather than the dev server. Deliberately
 * dependency-free.
 */
const root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "out",
);
const port = Number(process.env.PORT ?? 4321);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".woff2": "font/woff2",
};

async function resolve(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const candidate = path.resolve(root, "." + path.posix.sep + decoded);

  // Decoding can turn an escaped separator back into a real one, so the path
  // is only trustworthy once it has been resolved. Anything that lands outside
  // the export is not ours to serve.
  const within = candidate === root || candidate.startsWith(root + path.sep);
  if (!within) return null;

  // `output: "export"` with trailingSlash writes directory indexes.
  for (const file of [candidate, path.join(candidate, "index.html")]) {
    try {
      if ((await stat(file)).isFile()) return file;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

createServer(async (request, response) => {
  let file = null;
  try {
    file = await resolve(request.url ?? "/");
  } catch {
    // A malformed escape leaves nothing to serve.
  }

  if (!file) {
    response.writeHead(404, { "content-type": "text/plain" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": types[path.extname(file)] ?? "application/octet-stream",
  });
  createReadStream(file).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`serving ${root} on http://127.0.0.1:${port}`);
});
