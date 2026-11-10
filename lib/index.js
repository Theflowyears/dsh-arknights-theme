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
 *   GET /amiya-wallpaper/user/<f>        -> an imported picture, if one is stored
 *   GET  /amiya-wallpaper/upload         -> the manifest of imported pictures
 *   POST /amiya-wallpaper/upload         -> store one imported picture (raw bytes + ?type=&name=)
 *   GET|POST /amiya-wallpaper/diag       -> the layout-capture channel (see below)
 *
 * Responses are content-addressed by generation time, so they are served
 * `immutable` with a long max-age: the asset set only changes when the import
 * module is re-run and the bundle is reinstalled. Imported pictures are named by
 * the hash of their own bytes, so they get the same treatment.
 *
 * Security: the route serves exactly three directories and rejects any request
 * whose decoded path escapes them, so a traversal segment cannot read outside
 * the package. The only writable endpoint stores under a generated name; nothing
 * accepts a caller-supplied path. GET, HEAD and POST are answered.
 */
import os from 'node:os'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
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
  /* Without this entry the stylesheet went out as `application/octet-stream`, and a browser silently
   * discards a `<link rel="stylesheet">` whose MIME is not `text/css` — so the whole skin was inert
   * while the file itself was fine and returned 200. Locally the client half masked it by injecting
   * the same CSS from the bundle; a from-scratch install has no such fallback. Reported in issue #1. */
  ['.css', 'text/css; charset=utf-8'],
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
 * Where a wallpaper the reader imported lands.
 *
 * Deliberately **outside** the package, next to the other two runtime files: an npm install lives
 * under `node_modules`, and writing into it would (a) be lost on the next upgrade or reinstall,
 * (b) dirty an installation the same way the diagnostics file must not, and (c) put user pictures
 * where a packaging tool could sweep them into a published tarball. A profile directory would be
 * just as wrong — it is Cordis's own state, not this plugin's scratch space.
 */
const USER_DIR = path.join(tmpdir(), 'dsh-amiya-wallpaper-user')
/** The manifest for the imported set, in the same directory as its images. */
const USER_MANIFEST = path.join(USER_DIR, 'manifest.json')

/**
 * Largest image accepted, in bytes. 24 MB covers a phone photo or a downloaded 4K artwork with room
 * to spare; above that the request is more likely a mistake than a wallpaper, and the body is held
 * in memory while it is decoded, so the cap is the guard.
 */
const MAX_UPLOAD_BYTES = 24 * 1024 * 1024

/** How many imported pictures one install keeps. Older ones are evicted oldest-first. */
const MAX_USER_WALLPAPERS = 24

/**
 * What `DELETE /upload?id=` may remove: a name this module generated, and nothing else.
 * `user-` + 32 hex digits + one of the accepted extensions. Anything that is not exactly that shape
 * is refused before it reaches the filesystem, so the route cannot be pointed at a file it did not
 * write — including by a caller who guesses a shipped asset's name.
 */
const USER_FILE_PATTERN = /^user-[0-9a-f]{32}\.[a-z]{3,4}$/

/**
 * Image types accepted, keyed by MIME → the extension written to disk. The browser half decodes the
 * bytes itself, so what matters here is that only real image formats are stored and served back.
 */
const UPLOAD_TYPES = new Map([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
  ['image/avif', '.avif'],
])

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
   *
   * **The mechanism changed in 1.0.3 because `tapIndex` is not enough any more.** DSH now has a
   * structured injection table (`webserver/index-inject`): rows are JSON data, and they feed two
   * renderers — the served index, and the boot payload a static/desktop deployment ships to a
   * page-side interpreter. `tapIndex` only exists in the first: it is a string transform applied to
   * a served index body, so on a build that serves a static index it never runs. That is exactly the
   * report in issue #1 — the asset route registered, the skin attribute read back `null`, and the
   * page fell through to the stylesheet-less fallback colour. Emitting rows instead makes the same
   * injection land in both deployments; the client half also sets the attribute as a last resort, so
   * a third mechanism appearing later cannot silently take the skin down again.
   */
  ctx.effect(() => {
    const listener = (table) => {
      table.push(
        {
          kind: 'html',
          placement: 'head',
          html:
            '<link rel="stylesheet" href="' +
            ROUTE +
            '/assets/skin.css" data-amiya-skin="1">',
        },
        {
          kind: 'script',
          placement: 'head',
          text: 'document.documentElement.setAttribute("data-amiya-skin","1")',
        },
      )
    }
    ctx.on('webserver/index-inject', listener)
    return () => ctx.off('webserver/index-inject', listener)
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
 * Answer `POST /amiya-wallpaper/upload` (store one imported picture) and
 * `GET /amiya-wallpaper/upload` (the manifest of what is stored).
 *
 * The bytes are written under a name this function generates — an id plus the extension taken from
 * the declared MIME type — because a file name arriving from the page would be a path we then serve
 * back out. Nothing here trusts the client's `name`; it is kept only as a label for the picker.
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {string} method
 */
async function handleUpload(req, res, method) {
  if (method === 'GET') {
    const manifest = await readUserManifest()
    send(res, 200, 'application/json; charset=utf-8', JSON.stringify(manifest))
    return
  }
  if (method === 'DELETE') {
    /* Forget one import. The id comes in the query and is resolved only through the manifest, so the
       caller names an entry rather than a path — and the generated-name pattern below means even a
       forged manifest row could not point outside the directory. */
    const query = new URL(req.url ?? '', 'http://localhost').searchParams
    const wanted = String(query.get('id') ?? '')
    const manifest = await readUserManifest()
    const kept = []
    const removed = []
    for (const entry of manifest.wallpapers) {
      if (entry.id === wanted && USER_FILE_PATTERN.test(String(entry.file))) removed.push(entry.file)
      else kept.push(entry)
    }
    if (removed.length === 0) {
      send(res, 404, 'text/plain; charset=utf-8', 'no such import')
      return
    }
    manifest.wallpapers = kept
    await writeUserManifest(manifest)
    for (const file of removed) {
      await rm(path.join(USER_DIR, file), { force: true }).catch(() => {})
    }
    send(res, 200, 'application/json; charset=utf-8', JSON.stringify({ ok: true, removed: removed.length }))
    return
  }
  if (method !== 'POST') {
    res.writeHead(405, { allow: 'GET, POST, DELETE' })
    res.end()
    return
  }

  const query = new URL(req.url ?? '', 'http://localhost').searchParams
  const declaredType = String(query.get('type') ?? '')
  const extension = UPLOAD_TYPES.get(declaredType)
  if (extension === undefined) {
    send(res, 415, 'text/plain; charset=utf-8', 'unsupported image type: ' + (declaredType || '(none)'))
    return
  }

  /* Raw bytes, not base64: a wallpaper is megabytes, and encoding it in the page would inflate the
     request by a third for nothing. `readBody` returns text, so the body is read through its own
     binary collector here. */
  const bytes = await readRawBody(req, MAX_UPLOAD_BYTES)
  if (bytes.length === 0) {
    send(res, 400, 'text/plain; charset=utf-8', 'empty body')
    return
  }

  /* A magic-number check, because the declared type arrives from the page and costs nothing to lie
     about. This is not a decoder — the browser half decodes the bytes anyway and will fail loudly if
     they are not an image — it is the guard that keeps an arbitrary blob out of a directory the same
     route serves files from. */
  if (!looksLikeImage(bytes, declaredType)) {
    send(res, 415, 'text/plain; charset=utf-8', 'body is not a ' + declaredType)
    return
  }

  const id = hashBytes(bytes).slice(0, 32)
  const fileName = 'user-' + id + extension
  await mkdir(USER_DIR, { recursive: true })

  const manifest = await readUserManifest()
  const already = manifest.wallpapers.some((entry) => entry.file === fileName)
  if (!already) {
    await writeFile(path.join(USER_DIR, fileName), bytes)
    /* A label is stored only when the caller supplies one. Otherwise the row stays nameless and the
       browser half numbers it ("导入 01"), because a file name taken off someone's disk —
       `IMG_2047.jpg`, or worse — is not something to print in their interface forever. */
    const supplied = sanitizeLabel(String(query.get('name') ?? ''))
    manifest.wallpapers.push({
      id,
      file: fileName,
      title: supplied.length > 0 ? supplied : '',
      bytes: bytes.length,
      addedAt: new Date().toISOString(),
    })
    /* Cap the set oldest-first, deleting the file with the entry so the directory cannot accumulate
       pictures no manifest mentions. */
    while (manifest.wallpapers.length > MAX_USER_WALLPAPERS) {
      const [oldest] = manifest.wallpapers.splice(0, 1)
      /* The entry is dropped from the manifest either way, so a file that will not delete is
         unreachable rather than leaked — but it is still attempted, or the directory grows. */
      if (oldest !== undefined) await rm(path.join(USER_DIR, oldest.file), { force: true }).catch(() => {})
    }
    await writeUserManifest(manifest)
  }

  /* The entry the page needs to paint: where the file is served from, and whether it was new. */
  const entry = manifest.wallpapers.find((candidate) => candidate.file === fileName)
  send(
    res,
    200,
    'application/json; charset=utf-8',
    JSON.stringify({ ok: true, reused: already, id, file: fileName, route: ROUTE + '/user/', entry }),
  )
}

/**
 * Read a request body as bytes up to `limit`.
 * @param {import('node:http').IncomingMessage} req
 * @param {number} limit
 */
async function readRawBody(req, limit) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw new Error('image too large (' + size + ' bytes; limit ' + limit + ')')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

/**
 * Check the first bytes against the declared format. PNG/JPEG/GIF/WebP/AVIF each have a fixed
 * signature; AVIF is a container, so its brand field is checked rather than a magic number.
 * @param {Buffer} bytes
 * @param {string} type
 * @returns {boolean}
 */
function looksLikeImage(bytes, type) {
  const head = bytes.subarray(0, 16)
  switch (type) {
    case 'image/png':
      return head.length > 8 && head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    case 'image/jpeg':
      return head.length > 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
    case 'image/gif':
      return head.length > 5 && (head.subarray(0, 3).toString('latin1') === 'GIF' || head.subarray(0, 6).toString('latin1') === 'GIF89a')
    case 'image/webp':
      return head.length > 12 && head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP'
    case 'image/avif':
      return head.length > 12 && head.subarray(4, 8).toString('latin1') === 'ftyp' && /avif|avis/.test(head.subarray(8, 12).toString('latin1'))
    default:
      return false
  }
}

/** SHA-256 of the bytes, hex. Content-addressed, so the same picture twice is one file. */
function hashBytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

/** Keep a label short and free of control characters; it is rendered as text in the picker. */
function sanitizeLabel(value) {
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 48)
}

/**
 * The imported set, always with its current shape. A missing or damaged file reads as empty rather
 * than throwing: losing the reader's imported list should never take the whole skin down.
 */
async function readUserManifest() {
  try {
    const parsed = JSON.parse(await readFile(USER_MANIFEST, 'utf8'))
    if (Array.isArray(parsed?.wallpapers)) return { wallpapers: parsed.wallpapers }
  } catch {
    /* first import */
  }
  return { wallpapers: [] }
}

/** Write the manifest next to the images it describes. */
async function writeUserManifest(manifest) {
  await mkdir(USER_DIR, { recursive: true })
  await writeFile(USER_MANIFEST, JSON.stringify({ ...manifest, updatedAt: new Date().toISOString() }, null, 1), 'utf8')
}

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

  /* Imported wallpapers. The browser half POSTs the raw bytes it just read from disk — with a local
     file there is no server to upload to and no form to submit, so the body *is* the image; the type
     travels in the query rather than in `Content-Type`, which a `fetch` of a Blob sets for us but
     which we do not trust here. Everything else about this route is the same shape as `diag`: its own
     path, its own limits, and the read-only asset route untouched underneath it. */
  try {
    if (decodePath(req.url ?? '').split('?')[0] === 'upload') {
      await handleUpload(req, res, method)
      return
    }
  } catch (error) {
    send(res, 400, 'text/plain; charset=utf-8', 'upload failed: ' + String(error?.message ?? error))
    return
  }

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
 * Map a relative path onto a file inside the served directories.
 *
 * Four shapes are accepted, and nothing else: the manifest, a bare wallpaper
 * file name, a name under `assets/` or `icons/`, or one under `user/` — the
 * directory holding pictures this plugin's own upload route wrote. Anything
 * containing a path separator beyond that known prefix, a parent link, or a NUL
 * is refused — which is what blocks traversal and absolute paths.
 *
 * @param {string} relative
 * @returns {string | undefined}
 */
function resolveTarget(relative) {
  if (relative === '') return path.join(ASSET_ROOT, 'wallpapers.json')

  const directories = [
    { prefix: 'assets/', root: ASSET_ROOT },
    { prefix: 'icons/', root: ICON_ROOT },
    /* The reader's own imports. Served through the same flat-name rule as everything else, so a
       request can only reach a file in that directory by its exact generated name. */
    { prefix: 'user/', root: USER_DIR },
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
