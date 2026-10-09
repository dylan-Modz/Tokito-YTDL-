'use strict'

const { run, parseJSON } = require('./core')
const { url } = require('./validate')

module.exports = async function info(link) {
  const data = parseJSON(await run([
    '--no-playlist', '--dump-single-json', '--skip-download', '--', url(link)
  ], 90000))
  return {
    status: true,
    id: data.id || null,
    title: data.title || null,
    url: data.webpage_url || link,
    duration: data.duration ?? null,
    channel: data.channel || data.uploader || null,
    thumbnail: data.thumbnail || null,
    views: data.view_count ?? null
  }
}
