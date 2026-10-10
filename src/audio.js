'use strict'
const { getInfo, audioFormat, decipher } = require('./engine')
module.exports = async function audio(link) {
  const { yt, data } = await getInfo(link)
  const format = audioFormat(data)
  const direct = await decipher(format, yt)
  return { status: true, url: direct, temporary: true, mimetype: format.mime_type?.split(';')[0] || null }
}
