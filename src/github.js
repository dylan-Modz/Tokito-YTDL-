'use strict'

const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { mkdtemp, rm } = fs
const { randomBytes } = require('node:crypto')
const { mp3, mp4 } = require('./download')

const DEFAULT_REPO = 'dylan-Modz/Tokito-YTDL-'
const PREFIX = 'tokito-temp-'
const TTL = 60_000
const MAX_BYTES = 48 * 1024 * 1024
const scheduled = new Map()
let sweeper = null

function config() {
  const token = process.env.TOKITO_GITHUB_TOKEN
  const repo = process.env.TOKITO_GITHUB_REPO || DEFAULT_REPO
  if (!token) throw new Error('Configure TOKITO_GITHUB_TOKEN no servidor. Nunca inclua tokens no GitHub ou frontend.')
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('TOKITO_GITHUB_REPO inválido.')
  return { token, repo }
}

async function request(url, { token, method = 'GET', json, binary, mime, timeout = 90_000 } = {}) {
  const headers = {
    accept: 'application/vnd.github+json',
    authorization: 'Bearer ' + token,
    'x-github-api-version': '2022-11-28'
  }
  let body
  if (json !== undefined) {
    headers['content-type'] = 'application/json'
    body = JSON.stringify(json)
  } else if (binary) {
    headers['content-type'] = mime || 'application/octet-stream'
    headers['content-length'] = String(binary.byteLength)
    body = binary
  }
  const res = await fetch(url, {
    method, headers, body, signal: AbortSignal.timeout(timeout)
  })
  if (res.status === 404 && method === 'DELETE') return null
  if (!res.ok) {
    const msg = await res.text().catch(() => '')
    let detail = msg.slice(0, 350)
    try { detail = JSON.parse(msg).message || detail } catch {}
    throw new Error('GitHub HTTP ' + res.status + ': ' + detail)
  }
  return res.status === 204 ? null : res.json()
}

function endpoints(settings) {
  const root = 'https://api.github.com/repos/' + settings.repo
  return {
    release: root + '/releases',
    refs: root + '/git/refs/tags/'
  }
}

async function deleteRelease(settings, id, tag) {
  const ep = endpoints(settings)
  let error
  try {
    await request(ep.release + '/' + id, { token: settings.token, method: 'DELETE' })
  } catch (e) { error = e }
  try {
    await request(ep.refs + encodeURIComponent(tag), { token: settings.token, method: 'DELETE' })
  } catch (e) { error = error || e }
  if (error) throw error
}

function schedule(settings, id, tag, expiresAt) {
  const key = settings.repo + '/' + id
  const old = scheduled.get(key)
  if (old) clearTimeout(old)
  const timer = setTimeout(() => {
    scheduled.delete(key)
    deleteRelease(settings, id, tag).catch(err => {
      console.warn('[TOKITO YTDL / GITHUB] Falha na exclusão:', err.message)
    })
  }, Math.max(0, expiresAt - Date.now()))
  timer.unref?.()
  scheduled.set(key, timer)
}

async function githubFile(filePath, { type = 'mp3' } = {}) {
  const settings = config()
  if (type !== 'mp3' && type !== 'mp4') throw new TypeError('Formato deve ser mp3 ou mp4.')
  const stat = await fs.stat(filePath)
  if (!stat.isFile() || stat.size === 0 || stat.size > MAX_BYTES) {
    throw new Error('Arquivo precisa ter entre 1 byte e 48 MiB.')
  }

  const ep = endpoints(settings)
  const tag = PREFIX + Date.now().toString(36) + '-' + randomBytes(5).toString('hex')
  const extension = type === 'mp3' ? 'audio/mpeg' : 'video/mp4'
  const name = 'media-' + randomBytes(6).toString('hex') + '.' + type
  const marker = expiresAt => 'tokito-ytdl-temp\nexpiresAt:' + expiresAt
  const release = await request(ep.release, {
    token: settings.token,
    method: 'POST',
    json: {
      tag_name: tag,
      name: 'Tokito temporário ' + tag,
      body: marker(Date.now() + TTL),
      draft: false,
      prerelease: true,
      make_latest: 'false'
    }
  })

  try {
    const uploadUrl = new URL(release.upload_url.split('{')[0])
    if (uploadUrl.hostname !== 'uploads.github.com') throw new Error('Upload URL inesperada do GitHub.')
    uploadUrl.searchParams.set('name', name)
    const binary = await fs.readFile(filePath)
    const uploaded = await request(uploadUrl.href, {
      token: settings.token, method: 'POST', binary, mime: extension
    })
    const expiresAt = Date.now() + TTL
    await request(ep.release + '/' + release.id, {
      token: settings.token, method: 'PATCH',
      json: { body: marker(expiresAt) }
    })
    schedule(settings, release.id, tag, expiresAt)
    return {
      status: true,
      url: uploaded.browser_download_url,
      expiresIn: 60,
      expiresAt: new Date(expiresAt).toISOString(),
      temporary: true,
      provider: 'github-releases'
    }
  } catch (error) {
    await deleteRelease(settings, release.id, tag).catch(() => {})
    throw error
  }
}

async function githubMedia(link, type, options = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'tokito-github-'))
  try {
    const media = type === 'mp3'
      ? await mp3(link, { quality: options.quality ?? 128, outputDir: dir })
      : await mp4(link, { quality: options.quality ?? 720, outputDir: dir })
    return await githubFile(media.path, { type })
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

function githubAudio(link, options) { return githubMedia(link, 'mp3', options) }
function githubVideo(link, options) { return githubMedia(link, 'mp4', options) }

async function cleanupGithubExpired() {
  const settings = config()
  const ep = endpoints(settings)
  let count = 0
  for (let page = 1; page <= 5; page++) {
    const releases = await request(ep.release + '?per_page=100&page=' + page, { token: settings.token })
    if (!Array.isArray(releases) || releases.length === 0) break
    for (const release of releases) {
      if (!release.tag_name?.startsWith(PREFIX)) continue
      const match = /^tokito-ytdl-temp\nexpiresAt:(\d+)$/.exec(release.body || '')
      if (!match || Number(match[1]) > Date.now()) continue
      await deleteRelease(settings, release.id, release.tag_name)
      count++
    }
    if (releases.length < 100) break
  }
  return count
}

function startGithubCleanup(intervalMs = 30_000) {
  if (sweeper) return
  if (!Number.isInteger(intervalMs) || intervalMs < 10_000) {
    throw new RangeError('Intervalo mínimo de limpeza: 10 segundos.')
  }
  const sweep = () => cleanupGithubExpired().catch(err => {
    console.warn('[TOKITO YTDL / GITHUB] Falha na limpeza:', err.message)
  })
  void sweep()
  sweeper = setInterval(sweep, intervalMs)
  sweeper.unref?.()
}

function stopGithubCleanup() {
  if (sweeper) clearInterval(sweeper)
  sweeper = null
}

module.exports = {
  githubAudio, githubVideo, githubFile,
  cleanupGithubExpired, startGithubCleanup, stopGithubCleanup
}
