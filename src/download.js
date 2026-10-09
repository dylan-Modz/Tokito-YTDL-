'use strict'

const fs = require('node:fs/promises')
const path = require('node:path')
const { run } = require('./core')
const { url, inteiro } = require('./validate')

const nome = '%(title).80s [%(id)s].%(ext)s'

async function preparar(options) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('As opções devem ser um objeto.')
  }
  const dir = path.resolve(options.outputDir || path.join(process.cwd(), 'downloads'))
  await fs.mkdir(dir, { recursive: true })
  return path.join(dir, nome)
}

async function resultado(args) {
  const output = await run(args, 300000)
  const arquivo = output.split('\n').map(x => x.trim()).filter(Boolean).at(-1)
  if (!arquivo) throw new Error('O yt-dlp não informou o arquivo baixado.')
  const stat = await fs.stat(arquivo).catch(() => null)
  if (!stat?.isFile()) throw new Error('O arquivo baixado não foi encontrado no disco.')
  return { status: true, path: arquivo, filename: path.basename(arquivo), size: stat.size }
}

async function mp3(link, options = {}) {
  const valid = url(link)
  const quality = inteiro(options?.quality, 128, 64, 320, 'Qualidade de áudio (kbps)')
  const output = await preparar(options)
  return resultado([
    '--no-playlist', '-f', 'bestaudio/best',
    '-x', '--audio-format', 'mp3', '--audio-quality', quality + 'K',
    '--restrict-filenames', '-o', output,
    '--print', 'after_move:filepath', '--', valid
  ])
}

async function mp4(link, options = {}) {
  const valid = url(link)
  const quality = inteiro(options?.quality, 720, 144, 2160, 'Resolução máxima (p)')
  const output = await preparar(options)
  const max = '[height<=' + quality + ']'
  const format = 'bestvideo' + max + '[ext=mp4]+bestaudio[ext=m4a]/best' + max + '[ext=mp4]/best[ext=mp4]'
  return resultado([
    '--no-playlist', '-f', format, '--merge-output-format', 'mp4',
    '--restrict-filenames', '-o', output,
    '--print', 'after_move:filepath', '--', valid
  ])
}

module.exports = { mp3, mp4 }
