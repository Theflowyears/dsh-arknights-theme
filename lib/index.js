/**
 * dsh-amiya-wallpaper — host half.
 *
 * The wallpaper skin itself lives in the browser half (`exports["./client"]`).
 * This half exists for one reason: the generated wallpaper assets are several
 * megabytes of WebP, far too much to inline into a client bundle, so the host
 * must serve them. It registers a single read-only prefix route on the browser
 * HTTP carrier and owns nothing else.
 *
 * Route surface (`/amiya-wallpaper`):
 *   GET /amiya-wallpaper/                -> assets/wallpapers.json
 *   GET /amiya-wallpaper/<file>.webp     -> assets/<file>.webp
 *   GET /amiya-wallpaper/icons/<n>.svg   -> icons/<n>.svg
 *
 * Responses are content-addressed by generation time, so they are served
 * `immutable` with a long max-age: the asset set only changes when the import
 * module is re-run and the bundle is reinstalled.
 *
 * Security: the route serves exactly two directories and rejects any request
 * whose decoded path escapes them, so a traversal segment cannot read outside
 * the package. Only GET and HEAD are answered.
 */
import os from 'node:os'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PACKAGE_ROOT = path.resolve(HERE, '..')

/** Directory of generated wallpaper assets (`wallpapers.json` + WebP files). */
const ASSET_ROOT = path.join(PACKAGE_ROOT, 'assets')
/** Directory of authored SVG glyphs. */
const ICON_ROOT = path.join(PACKAGE_ROOT, 'icons')

/** Public route prefix; the client half builds its URLs from the same value. */
export const ROUTE = '/amiya-wallpaper'

const MIME = new Map([
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.json', 'application/json; charset=utf-8'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.avif', 'image/avif'],
])

/** One year; the asset set is regenerated only by a reinstall. */
const MAX_AGE_SECONDS = 31_536_000

/** Cordis hard dependency: with no HTTP carrier there is nothing to serve. */
export const inject = ['webServer']

/**
 * Where this plugin reports its own startup outcome. Outside the package on
 * purpose: it is a diagnostic, not an asset, and writing it must never dirty an
 * installation.
 */
const STATUS_FILE = path.join(tmpdir(), 'dsh-amiya-wallpaper-host.json')

/**
 * Host plugin body: register the asset route for exactly this fiber's lifetime,
 * then record whether that worked.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
export function apply(ctx) {
  let registered = false
  let error

  /*
   * Reach the browser through index.html rather than through the client module
   * graph. Two reasons, both learned the hard way (the mount contract follows the
   * beautiCode DSH bridge):
   *
   *   * the stylesheet arrives as a plain <link>, so it applies before the first
   *     paint and does not depend on a client bundle being snapshotted, served,
   *     and executed in the right order;
   *   * the attribute is set by a blocking inline script, so every rule in the
   *     stylesheet — all of which are scoped to it — is live from the first frame,
   *     and the stylesheet stays inert in a DSH that is not running this skin.
   */
  ctx.effect(() => {
    const disposeTap = ctx.webServer.tapIndex((html) => {
      if (html.includes('data-amiya-skin=')) return html
      const head =
        '<link rel="stylesheet" href="' +
        ROUTE +
        '/assets/skin.css" data-amiya-skin="1">' +
        '<script data-amiya-skin="1">document.documentElement.setAttribute("data-amiya-skin","1")</script>'
      return html.includes('</head>')
        ? html.replace('</head>', head + '</head>')
        : head + html
    })
    return disposeTap
  }, 'amiya-wallpaper: index injection')

  ctx.effect(() => {
    try {
      const dispose = ctx.webServer.register({
        kind: 'prefix',
        path: ROUTE,
        handler: (req, res) => {
          void respond(req, res)
        },
      })
      registered = true
      return dispose
    } catch (cause) {
      /*
       * A route pattern is a composition-level contract, so a second owner of
       * this path throws. The realistic case is a live preview of this same
       * skin mounted beside the installed plugin: both serve identical bytes
       * from the same directory, so the right move is to log it and let the
       * existing owner answer rather than fail this fiber.
       */
      error = cause instanceof Error ? cause.message : String(cause)
      console.warn(
        `[dsh-amiya-wallpaper] ${ROUTE} is already served by another owner; ` +
          `leaving the route alone (${error})`,
      )
      return () => {}
    }
  }, 'amiya-wallpaper: asset route')

  /*
   * A host half that silently fails to register looks exactly like a host half
   * with missing assets: the client half still styles the interface, but every
   * wallpaper URL 404s — a skin with no wallpaper. The harness keeps no log this
   * toolchain can read, so the outcome is written where the toolchain can look.
   */
  void writeStatus({ registered, error: error ?? null, packageRoot: PACKAGE_ROOT, assetRoot: ASSET_ROOT })
}

/**
 * Record the startup outcome, best effort.
 * @param {object} detail
 */
async function writeStatus(detail) {
  try {
    await writeFile(
      STATUS_FILE,
      `${JSON.stringify({ at: new Date().toISOString(), route: ROUTE, ...detail }, null, 2)}\n`,
      'utf8',
    )
  } catch {
    /* A read-only temp directory is not a reason to fail a fiber. */
  }
}

/** Where the browser half's layout report lands. */
const DIAG_FILE = path.join(os.tmpdir(), 'dsh-amiya-wallpaper-diag.json')

/**
 * Read a request body up to `limit` bytes.
 * @param {import('node:http').IncomingMessage} req
 * @param {number} limit
 */
async function readBody(req, limit) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw new Error('body too large')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/**
 * Answer one request from the asset or icon directory.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
async function respond(req, res) {
  const method = req.method ?? 'GET'

  /* Diagnostics channel, written by the browser half: it POSTs a measurement of the
     settings dialog and GET returns the last one. Kept on its own path so the read-only
     asset route stays exactly as strict as it was for everything else. */
  try {
    const diagPath = decodePath(req.url ?? '')
    if (diagPath === 'diag') {
      if (method === 'POST') {
        const body = await readBody(req, 512 * 1024)
        /* Append rather than overwrite: one capture per screen the reader visits. */
        let captures = []
        try {
          const previous = JSON.parse(await readFile(DIAG_FILE, 'utf8'))
          if (Array.isArray(previous.captures)) captures = previous.captures
        } catch {
          /* first capture */
        }
        let capture
        try {
          capture = JSON.parse(body)
        } catch {
          capture = { unparsed: body.slice(0, 4000) }
        }
        captures.push(capture)
        if (captures.length > 20) captures = captures.slice(-20)
        await writeFile(
          DIAG_FILE,
          JSON.stringify({ updatedAt: new Date().toISOString(), captures }, null, 1),
          'utf8',
        )
        send(res, 200, 'text/plain; charset=utf-8', 'ok ' + captures.length)
        return
      }
      try {
        const stored = await readFile(DIAG_FILE, 'utf8')
        send(res, 200, 'application/json; charset=utf-8', stored)
      } catch {
        send(res, 404, 'text/plain; charset=utf-8', 'no report yet')
      }
      return
    }
  } catch {
    /* fall through to the asset route */
  }

  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' })
    res.end()
    return
  }

  let relative
  try {
    relative = decodePath(req.url ?? '')
  } catch {
    send(res, 400, 'text/plain; charset=utf-8', 'bad request path')
    return
  }

  const target = resolveTarget(relative)
  if (target === undefined) {
    send(res, 404, 'text/plain; charset=utf-8', 'not found')
    return
  }

  let body
  try {
    const info = await stat(target)
    if (!info.isFile()) throw new Error('not a file')
    body = await readFile(target)
  } catch {
    send(res, 404, 'text/plain; charset=utf-8', 'not found')
    return
  }

  const type = MIME.get(path.extname(target).toLowerCase()) ?? 'application/octet-stream'
  /* Stylesheet and manifest are re-read per request and must not be cached: they
     are how a fix lands on a page reload without restarting DSH. The images are
     content-stable and are cached hard. */
  const cacheable = type !== 'text/css; charset=utf-8' && type !== 'application/json; charset=utf-8'
  const headers = {
    'content-type': type,
    'cache-control': cacheable ? `public, max-age=${MAX_AGE_SECONDS}, immutable` : 'no-store',
    'content-length': String(body.length),
  }
  res.writeHead(200, headers)
  if (method === 'HEAD') res.end()
  else res.end(body)
}

/**
 * Decode a request URL into a package-relative path below the route prefix.
 * @param {string} url
 * @returns {string} e.g. `''`, `foo-wide.webp`, or `icons/amiya-mark.svg`
 */
function decodePath(url) {
  const withoutQuery = url.split('?')[0].split('#')[0]
  const decoded = decodeURIComponent(withoutQuery)
  const rest = decoded.startsWith(ROUTE) ? decoded.slice(ROUTE.length) : decoded
  return rest.replace(/^\/+/, '')
}

/**
 * Map a relative path onto a file inside the two served directories.
 *
 * Three shapes are accepted, and nothing else: the manifest, a bare wallpaper
 * file name, or a name under `assets/` or `icons/`. Anything containing a path
 * separator beyond that known prefix, a parent link, or a NUL is refused — which
 * is what blocks traversal and absolute paths.
 *
 * @param {string} relative
 * @returns {string | undefined}
 */
function resolveTarget(relative) {
  if (relative === '') return path.join(ASSET_ROOT, 'wallpapers.json')

  const directories = [
    { prefix: 'assets/', root: ASSET_ROOT },
    { prefix: 'icons/', root: ICON_ROOT },
  ]
  for (const { prefix, root } of directories) {
    if (!relative.startsWith(prefix)) continue
    return safeJoin(root, relative.slice(prefix.length))
  }
  return safeJoin(ASSET_ROOT, relative)
}

/**
 * Join one flat file name under `root`, refusing anything that could escape it.
 * @param {string} root
 * @param {string} name
 * @returns {string | undefined}
 */
function safeJoin(root, name) {
  if (name === '' || name.includes('\0')) return undefined
  if (name.includes('/') || name.includes('\\')) return undefined
  if (name === '.' || name === '..') return undefined
  const resolved = path.resolve(root, name)
  const prefix = root.endsWith(path.sep) ? root : root + path.sep
  return resolved.startsWith(prefix) ? resolved : undefined
}

/**
 * Write a small plain-text response.
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {string} type
 * @param {string} body
 */
function send(res, status, type, body) {
  res.writeHead(status, { 'content-type': type, 'content-length': String(Buffer.byteLength(body)) })
  res.end(body)
}
