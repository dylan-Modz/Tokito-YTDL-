'use strict'

const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')
const crypto = require('node:crypto')
const { pipeline } = require('node:stream/promises')
const { spawn } = require('node:child_process')
const { inteiro } = require('./validate')
const { getInfo, audioFormat, videoFormat, mediaInfo } = require('./engine')

function ffmpegPath() {
  const override = process.env.TOKITO_FFMPEG
  let executable = null
  try { executable = require('ffmpeg-static') } catch {}
  const bin = override || executable
  if (!bin) {
    throw new Error('FFmpeg do npm indisponível. Instale novamente as dependências com npm install e confira se a hospedagem permite executar binários.')
  }
  return bin
}

function ffmpeg(args, timeout = 600000) {
  const bin = ffmpegPath()
  return new Promise((resolve, reject) => {
    const child = spawn(bin, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', ...args],
      { windowsHide: true, shell: false })
    let stderr = ''
    let settled = false
    let expired = false
    const timer = setTimeout(() => { expired = true; child.kill('SIGKILL') }, timeout)
    const done = err => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      err ? reject(err) : resolve()
    }
    child.stderr?.on('data', c => { stderr = (stderr + c.toString()).slice(-5000) })
    child.on('error', err => done(new Error(err.code === 'EACCES'
      ? 'A hospedagem bloqueou a execução do FFmpeg incluído pelo npm.'
      : 'Erro ao iniciar FFmpeg: ' + err.message)))
    child.on('close', code => done(expired
      ? new Error('FFmpeg excedeu o tempo limite.')
      : code === 0 ? null : new Error('FFmpeg falhou (' + code + '): ' + (stderr.trim() || 'erro desconhecido'))))
  })
}

function optionsDir(options) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('As opções devem ser um objeto.')
  }
  if (options.outputDir !== undefined && typeof options.outputDir !== 'string') {
    throw new TypeError('outputDir deve ser um caminho de pasta.')
  }
  return path.resolve(options.outputDir || path.join(process.cwd(), 'downloads'))
}

function filename(info, ext) {
  const title = String(info.title || 'youtube').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '')
    .replace(/\s+/g, ' ').trim().slice(0, 75) || 'youtube'
  return title + ' [' + info.id + '].' + ext
}

async function streamFile(info, format, destination) {
  const stream = await info.download({ itag: format.itag })
  if (!stream) throw new Error('YouTube não retornou um fluxo de mídia.')
  await pipeline(stream, fs.createWriteStream(destination))
  const stat = await fsp.stat(destination)
  if (!stat.isFile() || stat.size === 0) throw new Error('O YouTube retornou uma mídia vazia.')
}

async function validateFile(file, type) {
  const handle = await fsp.open(file, 'r')
  let actual
  try {
    const bytes = Buffer.alloc(16)
    const { bytesRead } = await handle.read(bytes, 0, 16, 0)
    if (type === 'mp3') {
      actual = bytesRead >= 3 && (bytes.toString('ascii', 0, 3) === 'ID3' ||
        (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0))
    } else {
      actual = bytesRead >= 12 && bytes.toString('ascii', 4, 8) === 'ftyp'
    }
  } finally { await handle.close() }
  if (!actual) throw new Error('O arquivo ' + type.toUpperCase() + ' foi gerado em formato inválido.')
  const stat = await fsp.stat(file)
  if (!stat.isFile() || stat.size === 0) throw new Error('Arquivo gerado está vazio.')
  return stat.size
}

async function mp3(link, options = {}) {
  const quality = inteiro(options?.quality, 128, 64, 320, 'Qualidade de áudio (kbps)')
  const dir = optionsDir(options)
  const { data, id } = await getInfo(link)
  const metadata = mediaInfo(data, id)
  const format = audioFormat(data)
  await fsp.mkdir(dir, { recursive: true })
  const dest = path.join(dir, filename(metadata, 'mp3'))
  const temp = path.join(dir, '.tokito-' + process.pid + '-' + crypto.randomUUID() + '.audio')
  try {
    await streamFile(data, format, temp)
    await ffmpeg(['-i', temp, '-vn', '-c:a', 'libmp3lame', '-b:a', quality + 'k', '-f', 'mp3', dest])
    const size = await validateFile(dest, 'mp3')
    return { status: true, path: dest, filename: path.basename(dest), size }
  } catch (err) {
    await fsp.rm(dest, { force: true }).catch(() => {})
    throw err
  } finally {
    await fsp.rm(temp, { force: true }).catch(() => {})
  }
}

async function mp4(link, options = {}) {
  const quality = inteiro(options?.quality, 720, 144, 2160, 'Resolução máxima (p)')
  const dir = optionsDir(options)
  const { data, id } = await getInfo(link)
  const metadata = mediaInfo(data, id)
  const format = videoFormat(data, quality)
  if (!format) throw new Error('Não há vídeo MP4 disponível até ' + quality + 'p.')
  await fsp.mkdir(dir, { recursive: true })
  const dest = path.join(dir, filename(metadata, 'mp4'))
  const prefix = '.tokito-' + process.pid + '-' + crypto.randomUUID()
  const vtemp = path.join(dir, prefix + '-video.mp4')
  const atemp = path.join(dir, prefix + '-audio')
  const h264 = /avc1/i.test(format.mime_type || '')
  const hasAudio = Boolean(format.has_audio)
  try {
    await streamFile(data, format, vtemp)
    if (!hasAudio) {
      const afmt = audioFormat(data)
      await streamFile(data, afmt, atemp)
    }
    const compatibleAudio = hasAudio ? /mp4a/i.test(format.mime_type || '') :
      /mp4a/i.test(audioFormat(data).mime_type || '')
    if (hasAudio && h264 && compatibleAudio) {
      await fsp.rename(vtemp, dest)
    } else {
      const input = ['-i', vtemp]
      if (!hasAudio) input.push('-i', atemp, '-map', '0:v:0', '-map', '1:a:0')
      const codec = ['-c:v', h264 ? 'copy' : 'libx264']
      if (!h264) codec.push('-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '23')
      codec.push('-c:a', compatibleAudio ? 'copy' : 'aac', '-b:a', '128k',
        '-movflags', '+faststart', '-f', 'mp4', dest)
      await ffmpeg([...input, ...codec])
    }
    const size = await validateFile(dest, 'mp4')
    return { status: true, path: dest, filename: path.basename(dest), size }
  } catch (err) {
    await fsp.rm(dest, { force: true }).catch(() => {})
    throw err
  } finally {
    await Promise.all([vtemp, atemp].map(file => fsp.rm(file, { force: true }).catch(() => {})))
  }
}

module.exports = { mp3, mp4, validateFile }
