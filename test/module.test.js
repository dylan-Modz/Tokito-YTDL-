'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const engine = require('../src/engine')
const yt = require('..')

const id = 'dQw4w9WgXcQ'
const link = 'https://youtu.be/' + id
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tokito-js-test-'))
let media = {}

function binary(buf) {
  return new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(buf)); controller.close() } })
}

const audio = { itag: 140, has_audio: true, has_video: false, bitrate: 128000,
  mime_type: 'audio/mp4; codecs="mp4a.40.2"', decipher: async () => 'https://rr.googlevideo.com/audio' }
const progressive = { itag: 18, has_audio: true, has_video: true, bitrate: 500000, height: 360,
  mime_type: 'video/mp4; codecs="avc1.42001E, mp4a.40.2"', decipher: async () => 'https://rr.googlevideo.com/video' }
const higher = { itag: 135, has_audio: false, has_video: true, bitrate: 900000, height: 480,
  mime_type: 'video/mp4; codecs="avc1.4d401f"', decipher: async () => 'https://rr.googlevideo.com/video480' }

const client = {
  session: { player: {} },
  async search() {
    return { videos: [{ id, title: { text: 'Teste' }, duration: { seconds: 42 }, author: { name: 'Canal' }, thumbnails: [] }] }
  },
  async getBasicInfo(videoId) {
    assert.equal(videoId, id)
    return {
      basic_info: { id, title: 'Teste', channel: { name: 'Canal' }, duration: 42, view_count: 150 },
      streaming_data: { formats: [progressive], adaptive_formats: [audio, higher] },
      async download({ itag }) {
        if (!media[itag]) throw new Error('Formato não preparado: ' + itag)
        return binary(media[itag])
      }
    }
  }
}
engine.setTestClient(client)

test('API pública preserva nomes e pesquisa em JavaScript', async () => {
  for (const key of ['search', 'info', 'audio', 'video', 'mp3', 'mp4']) assert.equal(typeof yt[key], 'function')
  const result = await yt.search('Teste', 1)
  assert.equal(result.results[0].channel, 'Canal')
  assert.equal(result.results[0].duration, 42)
  assert.equal((await yt.info(link)).views, 150)
})

test('URLs temporárias e validação de links', async () => {
  assert.equal((await yt.audio(link)).url, 'https://rr.googlevideo.com/audio')
  assert.equal((await yt.video(link)).url, 'https://rr.googlevideo.com/video')
  await assert.rejects(yt.audio('https://example.com/'), /YouTube/)
  await assert.rejects(yt.video('https://youtu.be/INVALID'), /ID de vídeo/)
  await assert.rejects(yt.search(' '), /pesquisa/)
})

test('seleção prioriza qualidade solicitada', () => {
  const data = { streaming_data: { formats: [progressive], adaptive_formats: [audio, higher] } }
  assert.equal(engine.videoFormat(data, 480).itag, 135)
  assert.equal(engine.videoFormat(data, 360).itag, 18)
  assert.equal(engine.audioFormat(data).itag, 140)
})

function hasFFmpeg() {
  try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return true }
  catch { return false }
}

test('MP3 real e MP4 válido sem yt-dlp', { skip: !hasFFmpeg() }, async () => {
  const mp3Source = path.join(dir, 'source.m4a')
  const mp4Source = path.join(dir, 'source.mp4')
  const videoSource = path.join(dir, 'v480.mp4')
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=450:sample_rate=44100', '-t', '1', '-c:a', 'aac', mp3Source], { timeout: 30000 })
  execFileSync('ffmpeg', [
    '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=red:s=320x180:r=10',
    '-f', 'lavfi', '-i', 'sine=frequency=300:sample_rate=44100',
    '-t', '1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', mp4Source
  ], { timeout: 30000 })
  execFileSync('ffmpeg', [
    '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=blue:s=640x480:r=10',
    '-t', '1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', videoSource
  ], { timeout: 30000 })
  media = { 140: fs.readFileSync(mp3Source), 18: fs.readFileSync(mp4Source), 135: fs.readFileSync(videoSource) }
  const prev = process.env.TOKITO_FFMPEG
  process.env.TOKITO_FFMPEG = 'ffmpeg'
  try {
    const a = await yt.mp3(link, { outputDir: dir, quality: 128 })
    const v = await yt.mp4(link, { outputDir: dir, quality: 360 })
    const h = await yt.mp4(link, { outputDir: dir, quality: 480 })
    assert.ok(a.size > 100 && v.size > 100 && h.size > 100)
    assert.match(a.filename, /\.mp3$/)
    assert.match(v.filename, /\.mp4$/)
    assert.match(h.filename, /\.mp4$/)
    const bytes = fs.readFileSync(a.path)
    assert.ok(bytes.subarray(0, 3).toString() === 'ID3' || bytes[0] === 0xff)
  } finally {
    if (prev === undefined) delete process.env.TOKITO_FFMPEG
    else process.env.TOKITO_FFMPEG = prev
  }
})

test('arquivos falsos são rejeitados', async () => {
  const fake = path.join(dir, 'fake.mp4')
  await fsp.writeFile(fake, 'not a video')
  await assert.rejects(require('../src/download').validateFile(fake, 'mp4'), /formato inválido/)
})
