'use strict'

const { query, inteiro } = require('./validate')
const { client, asText, thumb } = require('./engine')

module.exports = async function search(texto, limite = 5) {
  const termo = query(texto)
  const quantidade = inteiro(limite, 5, 1, 20, 'Limite')
  const yt = await client()
  const data = await yt.search(termo, { type: 'video' })
  const results = []
  for (const item of data?.videos || []) {
    const id = item?.id || item?.video_id
    if (!/^[a-zA-Z0-9_-]{11}$/.test(id || '')) continue
    const seconds = item?.duration?.seconds
    results.push({
      id, title: asText(item.title) || 'Sem título',
      url: 'https://www.youtube.com/watch?v=' + id,
      duration: typeof seconds === 'number' ? seconds : null,
      channel: item?.author?.name || item?.channel?.name || null,
      thumbnail: thumb(id, item)
    })
    if (results.length >= quantidade) break
  }
  return { status: true, query: termo, results }
}
