'use strict'

const { url } = require('./validate')
let pending
let injected

async function client() {
  if (injected) return injected
  if (!pending) {
    pending = import('youtubei.js')
      .then(({ Innertube }) => Innertube.create({ lang: 'pt', location: 'BR' }))
      .catch(err => { pending = null; throw new Error('Não foi possível iniciar o motor do YouTube: ' + err.message) })
  }
  return pending
}

function setTestClient(value) { injected = value; pending = null }

function idOf(link) {
  const parsed = new URL(url(link))
  let id = parsed.hostname.endsWith('youtu.be') ? parsed.pathname.split('/')[1] : parsed.searchParams.get('v')
  if (!id) {
    const parts = parsed.pathname.split('/').filter(Boolean)
    if (['shorts', 'live', 'embed'].includes(parts[0])) id = parts[1]
  }
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id || '')) {
    throw new TypeError('O link não contém um ID de vídeo válido do YouTube.')
  }
  return id
}

function asText(value) {
  if (typeof value === 'string') return value
  if (typeof value?.text === 'string') return value.text
  if (typeof value?.toString === 'function' && value.toString !== Object.prototype.toString) {
    const s = String(value)
    return s === '[object Object]' ? '' : s
  }
  return ''
}

function thumb(id, item) {
  const thumbs = item?.thumbnail ?? item?.thumbnails ?? []
  return (Array.isArray(thumbs) ? thumbs.at(-1)?.url : thumbs?.url) ||
    (id ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' : null)
}

function mediaInfo(data, id) {
  const b = data?.basic_info || {}
  return {
    status: true,
    id: b.id || id,
    title: b.title || null,
    url: b.url_canonical || 'https://www.youtube.com/watch?v=' + id,
    duration: b.duration ?? null,
    channel: b.channel?.name || b.author || null,
    thumbnail: thumb(id, b),
    views: b.view_count ?? null
  }
}

async function getInfo(link) {
  const id = idOf(link)
  const yt = await client()
  const data = await yt.getBasicInfo(id)
  if (!data?.basic_info) throw new Error('YouTube não retornou informações desse vídeo.')
  return { id, yt, data }
}

function formats(data) {
  const d = data?.streaming_data
  return [...(d?.formats || []), ...(d?.adaptive_formats || [])]
    .filter(f => Number.isInteger(f?.itag))
}

function audioFormat(data) {
  const list = formats(data).filter(f => f.has_audio && !f.has_video)
  const mp4 = list.filter(f => /audio\/mp4/i.test(f.mime_type || ''))
  const chosen = (mp4.length ? mp4 : list).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0]
  if (!chosen) throw new Error('Nenhuma faixa de áudio disponível para este vídeo.')
  return chosen
}

function progressiveFormat(data, quality = Infinity) {
  const list = formats(data).filter(f => f.has_audio && f.has_video &&
    /video\/mp4/i.test(f.mime_type || '') && (f.height || 0) <= quality)
  list.sort((a, b) => (b.height || 0) - (a.height || 0))
  return list[0] || null
}

function videoFormat(data, quality) {
  const list = formats(data).filter(f => f.has_video &&
    (f.height || 0) <= quality && /video\/mp4/i.test(f.mime_type || ''))
  list.sort((a, b) => {
    const d = (b.height || 0) - (a.height || 0)
    if (d) return d
    const aH264 = /avc1/i.test(a.mime_type || '') ? 1 : 0
    const bH264 = /avc1/i.test(b.mime_type || '') ? 1 : 0
    return bH264 - aH264 || Number(b.has_audio) - Number(a.has_audio)
  })
  return list[0] || null
}

async function decipher(format, yt) {
  const direct = await format.decipher(yt.session.player)
  if (typeof direct !== 'string' || !/^https:\/\//i.test(direct)) {
    throw new Error('Não foi possível obter a URL de mídia do YouTube.')
  }
  return direct
}

module.exports = {
  client, setTestClient, idOf, asText, thumb, mediaInfo, getInfo,
  formats, audioFormat, progressiveFormat, videoFormat, decipher
}
