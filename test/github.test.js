'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const {
  githubFile, cleanupGithubExpired,
  startGithubCleanup, stopGithubCleanup
} = require('..')

test('exige token GitHub sem vazar segredos', async () => {
  const old = process.env.TOKITO_GITHUB_TOKEN
  delete process.env.TOKITO_GITHUB_TOKEN
  try {
    await assert.rejects(githubFile('nada.mp3'), /TOKITO_GITHUB_TOKEN/)
  } finally {
    if (old === undefined) delete process.env.TOKITO_GITHUB_TOKEN
    else process.env.TOKITO_GITHUB_TOKEN = old
  }
})

test('publica asset no GitHub e registra expiração de 60 segundos', async () => {
  const originalFetch = globalThis.fetch
  const oldToken = process.env.TOKITO_GITHUB_TOKEN
  const oldRepo = process.env.TOKITO_GITHUB_REPO
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tokito-test-gh-'))
  const file = path.join(dir, 'meu-audio.mp3')
  await fs.writeFile(file, Buffer.from('audio-de-teste'))

  process.env.TOKITO_GITHUB_TOKEN = 'token-apenas-teste'
  process.env.TOKITO_GITHUB_REPO = 'dylan-Modz/Tokito-YTDL-'
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), method: init.method, body: init.body })
    if (init.method === 'POST' && String(url).endsWith('/releases')) {
      return mock(201, {
        id: 8888,
        upload_url: 'https://uploads.github.com/repos/dylan-Modz/Tokito-YTDL-/releases/8888/assets{?name,label}'
      })
    }
    if (init.method === 'POST' && String(url).startsWith('https://uploads.github.com/')) {
      return mock(201, { browser_download_url: 'https://github.com/dylan-Modz/Tokito-YTDL-/releases/download/temp/audio.mp3' })
    }
    if (init.method === 'PATCH') return mock(200, { id: 8888 })
    throw new Error('Requisição inesperada: ' + init.method + ' ' + url)
  }

  try {
    const result = await githubFile(file)
    assert.equal(result.status, true)
    assert.equal(result.expiresIn, 60)
    assert.equal(result.temporary, true)
    assert.match(result.url, /^https:\/\/github\.com\//)
    assert.equal(calls.length, 3)
    assert.equal(calls[0].method, 'POST')
    assert.equal(calls[1].method, 'POST')
    assert.equal(calls[2].method, 'PATCH')
    assert.equal(JSON.parse(calls[0].body).prerelease, true)
    assert.match(JSON.parse(calls[2].body).body, /^tokito-ytdl-temp\nexpiresAt:\d+$/)
  } finally {
    globalThis.fetch = originalFetch
    if (oldToken === undefined) delete process.env.TOKITO_GITHUB_TOKEN
    else process.env.TOKITO_GITHUB_TOKEN = oldToken
    if (oldRepo === undefined) delete process.env.TOKITO_GITHUB_REPO
    else process.env.TOKITO_GITHUB_REPO = oldRepo
    await fs.rm(dir, { recursive: true, force: true })
  }
})

test('limpeza apaga apenas releases temporários vencidos', async () => {
  const originalFetch = globalThis.fetch
  const oldToken = process.env.TOKITO_GITHUB_TOKEN
  process.env.TOKITO_GITHUB_TOKEN = 'token-apenas-teste'
  const deletes = []
  const expired = {
    id: 123,
    tag_name: 'tokito-temp-abc',
    body: 'tokito-ytdl-temp\nexpiresAt:' + (Date.now() - 3000)
  }
  const normal = {
    id: 124,
    tag_name: 'v1.1.0',
    body: 'release normal'
  }
  globalThis.fetch = async (url, init) => {
    if (init.method === 'GET') return mock(200, [expired, normal])
    if (init.method === 'DELETE') {
      deletes.push(String(url))
      return mock(204)
    }
    throw new Error('Método inesperado')
  }
  try {
    const removed = await cleanupGithubExpired()
    assert.equal(removed, 1)
    assert.equal(deletes.length, 2)
    assert.ok(deletes[0].endsWith('/releases/123'))
    assert.ok(deletes[1].endsWith('/git/refs/tags/tokito-temp-abc'))
  } finally {
    globalThis.fetch = originalFetch
    if (oldToken === undefined) delete process.env.TOKITO_GITHUB_TOKEN
    else process.env.TOKITO_GITHUB_TOKEN = oldToken
    stopGithubCleanup()
  }
})

function mock(status, data) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return data },
    async text() { return JSON.stringify(data ?? {}) }
  }
}
