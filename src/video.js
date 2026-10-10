'use strict'
const { getInfo, progressiveFormat, decipher } = require('./engine')
module.exports = async function video(link) {
  const { yt, data } = await getInfo(link)
  const format = progressiveFormat(data)
  if (!format) throw new Error('Não há um vídeo MP4 com áudio em uma única URL.')
  const direct = await decipher(format, yt)
  return { status: true, url: direct, temporary: true, mimetype: 'video/mp4' }
}
