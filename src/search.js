'use strict'

const { run, parseJSON } = require('./core')
const { query, inteiro } = require('./validate')

module.exports = async function search(texto, limite = 5) {
  const termo = query(texto)
  const quantidade = inteiro(limite, 5, 1, 20, 'Limite')
  const output = await run([
    '--flat-playlist', '--dump-single-json', '--skip-download',
    '--ignore-errors', '--', 'ytsearch' + quantidade + ':' + termo
  ], 90000)
  const data = parseJSON(output)
  const results = (data.entries || []).filter(Boolean).map(item => ({
    id: item.id || null,
    title: item.title || 'Sem título',
    url: item.webpage_url || (item.id
      ? 'https://www.youtube.com/watch?v=' + item.id : item.url),
    duration: item.duration ?? null,
    channel: item.channel || item.uploader || null,
    thumbnail: item.id
      ? 'https://i.ytimg.com/vi/' + item.id + '/hqdefault.jpg'
      : (item.thumbnail || null)
  }))
  return { status: true, query: termo, results }
}
