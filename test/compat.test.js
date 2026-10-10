'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { garantirMp4 } = require('../src/compat')

function existe(nome) {
  try { execFileSync(nome, ['-version'], { stdio: 'ignore', timeout: 3000 }); return true }
  catch { return false }
}

const temFFmpeg = existe('ffmpeg') && existe('ffprobe')

test('converte video incompatível para H264 yuv420p e AAC', { skip: !temFFmpeg }, async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tokito-h264-test-'))
  const source = path.join(dir, 'source.mp4')
  try {
    execFileSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
      '-f', 'lavfi', '-i', 'color=c=red:s=160x120:r=5',
      '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100',
      '-t', '1', '-c:v', 'mpeg4', '-c:a', 'aac', source
    ], { timeout: 20000 })
    const dest = await garantirMp4(source)
    const info = JSON.parse(execFileSync('ffprobe', [
      '-v', 'error', '-show_entries', 'stream=codec_type,codec_name,pix_fmt',
      '-of', 'json', dest
    ], { encoding: 'utf8' }))
    const video = info.streams.find(s => s.codec_type === 'video')
    const audio = info.streams.find(s => s.codec_type === 'audio')
    assert.equal(video.codec_name, 'h264')
    assert.equal(video.pix_fmt, 'yuv420p')
    assert.equal(audio.codec_name, 'aac')
    assert.equal(await garantirMp4(dest), dest)
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

test('rejeita vídeo inválido para não enviar mídia quebrada', { skip: !temFFmpeg }, async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tokito-invalid-'))
  try {
    const file = path.join(dir, 'invalid.mp4')
    await fs.writeFile(file, 'no video here')
    await assert.rejects(garantirMp4(file), /ffprobe falhou/i)
  } finally { await fs.rm(dir, { recursive: true, force: true }) }
})
