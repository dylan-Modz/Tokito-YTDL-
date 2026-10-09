'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const yt = require('..')

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tokito-ytdl-test-'))
const bin = path.join(root, 'fake-dlp')
const stub = [
  '#!/usr/bin/env node',
  "const fs = require('fs')",
  "const a = process.argv.slice(2)",
  "if (a.includes('--dump-single-json')) {",
  "  if (a.some(x => x.startsWith('ytsearch'))) console.log(JSON.stringify({entries:[{id:'dQw4w9WgXcQ',title:'Teste',duration:42}]}))",
  "  else console.log(JSON.stringify({id:'dQw4w9WgXcQ',title:'Teste',duration:42,webpage_url:a.at(-1)}))",
  "} else if (a.includes('-g')) {",
  "  console.log('https://example.com/stream')",
  "} else if (a.includes('--print')) {",
  "  const target = a[a.indexOf('-o')+1].replace('%(title).80s','Teste').replace('%(id)s','dQw4w9WgXcQ').replace('%(ext)s',a.includes('--audio-format')?'mp3':'mp4')",
  "  fs.writeFileSync(target, 'test-media')",
  "  console.log(target)",
  "} else process.exit(1)"
].join('\n') + '\n'

fs.writeFileSync(bin, stub)
fs.chmodSync(bin, 0o755)
process.env.TOKITO_YTDLP = bin

test('API exportada', () => {
  for (const name of ['search', 'info', 'audio', 'video', 'mp3', 'mp4']) {
    assert.equal(typeof yt[name], 'function')
  }
})

test('validacao de entradas', async () => {
  await assert.rejects(yt.audio('https://example.com'), /YouTube/)
  await assert.rejects(yt.info('javascript:alert(1)'), /YouTube/)
  await assert.rejects(yt.search(' '), /pesquisa/)
  await assert.rejects(yt.search('ok', 99), /Limite/)
})

test('pesquisa e informacoes', async () => {
  const data = await yt.search('teste', 3)
  assert.equal(data.results[0].title, 'Teste')
  const info = await yt.info(data.results[0].url)
  assert.equal(info.title, 'Teste')
})

test('links de audio e video', async () => {
  const url = 'https://youtu.be/dQw4w9WgXcQ'
  assert.equal((await yt.audio(url)).url, 'https://example.com/stream')
  assert.equal((await yt.video(url)).temporary, true)
})

test('downloads produzem arquivos', async () => {
  const url = 'https://youtu.be/dQw4w9WgXcQ'
  const a = await yt.mp3(url, { outputDir: root, quality: 128 })
  const v = await yt.mp4(url, { outputDir: root, quality: 720 })
  assert.equal(path.extname(a.path), '.mp3')
  assert.equal(path.extname(v.path), '.mp4')
  assert.equal(a.size, 10)
  assert.equal(v.size, 10)
})
