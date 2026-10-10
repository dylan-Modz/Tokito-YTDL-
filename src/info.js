'use strict'
const { getInfo, mediaInfo } = require('./engine')
module.exports = async function info(link) {
  const { id, data } = await getInfo(link)
  return mediaInfo(data, id)
}
