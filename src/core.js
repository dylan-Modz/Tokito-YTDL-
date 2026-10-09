'use strict'

const { spawn } = require('node:child_process')

function run(args, timeout = 60000) {
  return new Promise((resolve, reject) => {
    const command = process.env.TOKITO_YTDLP || 'yt-dlp'
    const child = spawn(command, [
      '--ignore-config', '--no-warnings', '--no-progress', ...args
    ], { windowsHide: true, shell: false })

    let stdout = ''
    let stderr = ''
    let settled = false
    let expired = false
    const maxBytes = 12 * 1024 * 1024

    const timer = setTimeout(() => {
      expired = true
      child.kill('SIGKILL')
    }, timeout)

    const done = (error, data) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (error) reject(error)
      else resolve(data)
    }

    child.stdout?.on('data', chunk => {
      stdout += chunk.toString('utf8')
      if (Buffer.byteLength(stdout) > maxBytes) child.kill('SIGKILL')
    })
    child.stderr?.on('data', chunk => {
      stderr = (stderr + chunk.toString('utf8')).slice(-8192)
    })

    child.on('error', error => {
      done(new Error(error.code === 'ENOENT'
        ? 'yt-dlp não encontrado. Instale o yt-dlp e deixe-o disponível no PATH.'
        : 'Erro ao executar yt-dlp: ' + error.message))
    })

    child.on('close', code => {
      if (expired) return done(new Error('yt-dlp excedeu o tempo limite.'))
      if (Buffer.byteLength(stdout) > maxBytes) return done(new Error('Resposta do yt-dlp muito grande.'))
      if (code !== 0) return done(new Error('Falha no yt-dlp (' + code + '): ' + (stderr.trim() || 'erro desconhecido')))
      done(null, stdout.trim())
    })
  })
}

function parseJSON(texto) {
  try { return JSON.parse(texto) } catch {
    throw new Error('O yt-dlp retornou um JSON inválido.')
  }
}

module.exports = { run, parseJSON }
