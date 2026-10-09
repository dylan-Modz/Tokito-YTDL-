# Tokito YTDL 🧊

**v1.0.0** · Biblioteca Node.js · **Dylan Modz**

Biblioteca para pesquisar vídeos, consultar informações, gerar links temporários de áudio/vídeo e baixar arquivos MP3/MP4 do YouTube.

> O código JavaScript é independente do Vreden, mas usa o executável **yt-dlp** para extração. O GitHub hospeda o código, não os arquivos de mídia. Links temporários podem expirar, exigir cabeçalhos ou depender do IP.

## Requisitos

- Node.js 18+
- yt-dlp instalado no PATH: https://github.com/yt-dlp/yt-dlp
- FFmpeg para converter MP3 e combinar áudio/vídeo MP4
- Internet e acesso ao YouTube

Confira com os comandos:
 
    yt-dlp --version
    ffmpeg -version

Versões recentes do yt-dlp também podem exigir um runtime JavaScript para extrair vídeos do YouTube.

## Instalação

Enquanto o repositório mantiver o nome atual:

    npm install github:dylan-Modz/Tokito-YTDL-

O nome do pacote instalado é **tokito-ytdl**.

## Utilização

    const yt = require('tokito-ytdl')

    async function exemplo() {
      const busca = await yt.search('lofi hip hop', 3)
      const link = busca.results[0]?.url
      if (!link) return

      const dados = await yt.info(link)
      console.log(dados.title)

      const audio = await yt.audio(link)
      console.log(audio.url) // Link temporário

      const video = await yt.video(link)
      console.log(video.url) // Link temporário

      const mp3 = await yt.mp3(link, { quality: 128 })
      console.log(mp3.path) // Arquivo MP3 salvo

      const mp4 = await yt.mp4(link, { quality: 720 })
      console.log(mp4.path) // Arquivo MP4 salvo
    }

    exemplo().catch(console.error)

## Funções

| Função | Retorno |
| --- | --- |
| search(termo, limite=5) | status, query, results |
| info(url) | status, id, title, url, duration, channel, thumbnail, views |
| audio(url) | status, url, temporary |
| video(url) | status, url, temporary |
| mp3(url, options) | status, path, filename, size |
| mp4(url, options) | status, path, filename, size |

As funções de link não convertem MP3. Para enviar música no WhatsApp, é melhor baixar o arquivo antes do envio. Use try/catch para tratar erros de rede ou do extrator. A qualidade solicitada é uma preferência e não melhora o áudio original.

## Configuração

A variável de ambiente TOKITO_YTDLP pode definir o caminho do executável yt-dlp.

## Testes

    npm test

Os testes simulam o executável yt-dlp e **não garantem um download real do YouTube**. Mantenha o yt-dlp atualizado e verifique downloads reais no dispositivo do bot.

Use apenas mídias que você tenha permissão para acessar e baixar.

MIT © 2026 Dylan Modz
