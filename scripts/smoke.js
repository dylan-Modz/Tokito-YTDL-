'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const yt = require('..')

// Use um vídeo de que você tenha permissão para baixar.
const link = process.argv[2] || process.env.TOKITO_YT_TEST_URL
const withVideo = process.argv.includes('--video')

if (!link) {
  console.error('Uso: npm run test:live -- "https://www.youtube.com/watch?v=ID" [--video]')
  process.exit(2)
}

async function main() {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tokito-ytdl-live-'))
  try {
    const info = await yt.info(link)
    assert.equal(info.status, true)
    console.log('Informações do vídeo:', info.id, info.title)

    const audio = await yt.mp3(link, { quality: 64, outputDir })
    assert.equal(audio.status, true)
    assert.ok(audio.size > 0)
    console.log('MP3 gerado:', audio.size, 'bytes')

    if (withVideo) {
      const video = await yt.mp4(link, { quality: 360, outputDir })
      assert.equal(video.status, true)
      assert.ok(video.size > 0)
      console.log('MP4 gerado:', video.size, 'bytes')
    }

    console.log('TESTE REAL APROVADO')
  } finally {
    await fs.rm(outputDir, { recursive: true, force: true })
  }
}

main().catch(err => {
  console.error('TESTE REAL FALHOU:', err.stack || err.message)
  process.exitCode = 1
})
