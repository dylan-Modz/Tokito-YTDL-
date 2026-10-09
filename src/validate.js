'use strict'

const HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com',
  'music.youtube.com', 'youtu.be', 'www.youtu.be',
  'youtube-nocookie.com', 'www.youtube-nocookie.com'
])

function url(input) {
  if (typeof input !== 'string' || input.length > 2048) {
    throw new TypeError('Informe um link válido do YouTube.')
  }

  let parsed
  try { parsed = new URL(input.trim()) } catch {
    throw new TypeError('Informe um link válido do YouTube.')
  }

  if (!['https:', 'http:'].includes(parsed.protocol) ||
      !HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new TypeError('Apenas links do YouTube são aceitos.')
  }
  return parsed.href
}

function query(input) {
  if (typeof input !== 'string' || !input.trim() || input.trim().length > 180) {
    throw new TypeError('A pesquisa deve ter entre 1 e 180 caracteres.')
  }
  return input.trim()
}

function inteiro(value, fallback, min, max, nome) {
  const n = value === undefined ? fallback : value
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new RangeError(nome + ' deve estar entre ' + min + ' e ' + max + '.')
  }
  return n
}

module.exports = { url, query, inteiro }
