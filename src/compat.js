'use strict'

const fs = require('node:fs/promises')
const path = require('node:path')
const { spawn } = require('node:child_process')

function executar(comando, args, limite = 900000) {
  return new Promise((resolve, reject) => {
    const child = spawn(comando, args, { shell: false, windowsHide: true })
    let output = ''
    let error = ''
    let settled = false
    let expired = false
    const timer = setTimeout(() => {
      expired = true
      child.kill('SIGKILL')
    }, limite)
    const done = (err, data) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      err ? reject(err) : resolve(data)
    }
    child.stdout?.on('data', data => { output = (output + data.toString('utf8')).slice(-200000) })
    child.stderr?.on('data', data => { error = (error + data.toString('utf8')).slice(-6000) })
    child.on('error', err => done(new Error(err.code === 'ENOENT'
      ? comando + ' não encontrado. Instale FFmpeg e FFprobe.'
      : 'Erro ao executar ' + comando + ': ' + err.message)))
    child.on('close', code => {
      if (expired) return done(new Error(comando + ' excedeu o tempo limite.'))
      if (code !== 0) return done(new Error(comando + ' falhou (' + code + '): ' + (error.trim() || 'erro desconhecido')))
      done(null, output.trim())
    })
  })
}

async function analisar(arquivo) {
  const comando = process.env.TOKITO_FFPROBE || 'ffprobe'
  const saida = await executar(comando, [
    '-v', 'error', '-show_entries', 'stream=codec_type,codec_name,pix_fmt',
    '-of', 'json', arquivo
  ], 30000)
  let dados
  try { dados = JSON.parse(saida) } catch { throw new Error('FFprobe retornou uma análise inválida.') }
  const streams = dados?.streams || []
  const video = streams.find(s => s.codec_type === 'video')
  const audio = streams.find(s => s.codec_type === 'audio')
  if (!video) throw new Error('O arquivo não contém uma faixa de vídeo válida.')
  return { video, audio }
}

async function garantirMp4(arquivo) {
  const ext = path.extname(arquivo).toLowerCase()
  const original = await analisar(arquivo)
  if (ext === '.mp4' && original.video.codec_name === 'h264' &&
    original.video.pix_fmt === 'yuv420p' && original.audio?.codec_name === 'aac') return arquivo

  const temporario = path.join(path.dirname(arquivo),
    path.parse(arquivo).name + '.tokito-' + process.pid + '-' + Date.now() + '.mp4')
  const comando = process.env.TOKITO_FFMPEG || 'ffmpeg'
  try {
    await executar(comando, [
      '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
      '-i', arquivo, '-map', '0:v:0', '-map', '0:a:0?',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
      '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart', '-f', 'mp4', temporario
    ])
    const final = await analisar(temporario)
    if (final.video.codec_name !== 'h264' || final.video.pix_fmt !== 'yuv420p' ||
        (final.audio && final.audio.codec_name !== 'aac')) {
      throw new Error('Não foi possível preparar o vídeo em H.264/AAC.')
    }
    const destino = path.join(path.dirname(arquivo), path.parse(arquivo).name + '.mp4')
    await fs.rename(temporario, destino)
    if (arquivo !== destino) await fs.rm(arquivo, { force: true })
    return destino
  } catch (err) {
    await fs.rm(temporario, { force: true }).catch(() => {})
    throw err
  }
}

module.exports = { garantirMp4 }
