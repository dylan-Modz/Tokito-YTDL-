'use strict'

const { run } = require('./core')
const { url } = require('./validate')

module.exports = async function audio(link) {
  const output = await run([
    '--no-playlist', '-f', 'bestaudio/best', '-g', '--', url(link)
  ], 90000)
  const mediaUrl = output.split('\n').filter(Boolean)[0]
  if (!mediaUrl || !/^https?:\/\//.test(mediaUrl)) {
    throw new Error('Não foi possível obter um link de áudio válido.')
  }
  return { status: true, url: mediaUrl, temporary: true }
}
