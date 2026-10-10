<div align="center">

# 🧊 TOKITO YTDL

**Biblioteca Node.js para pesquisa, informações e download de mídias do YouTube.**

![Version](https://img.shields.io/badge/version-1.1.0-38bdf8?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-22%2B-43853d?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

**Desenvolvido por Dylan Modz**

</div>

## Novidade — motor JavaScript

A versão **1.1.0** substitui a execução de yt-dlp pelo pacote **youtubei.js** (YouTube.js) para pesquisar e extrair mídia. Não precisa instalar yt-dlp nem Python na hospedagem.

Para converter MP3 real, o módulo usa **ffmpeg-static**, instalado pelo npm. Para vídeo, prefere MP4 compatível e usa a mesma dependência quando precisa unir faixas ou converter formatos.

**Importante:** a extração é JavaScript, mas a conversão ainda utiliza o executável FFmpeg incluído pelo npm. A hospedagem deve permitir executar esse programa. O GitHub hospeda somente o código, nunca músicas ou vídeos.

## Instalação

Requer Node.js 22 ou superior:

~~~bash
npm install "tokito-ytdl@github:dylan-Modz/Tokito-YTDL-#main"
~~~

As dependências youtubei.js e ffmpeg-static são instaladas pelo npm.

## Exemplos

### CommonJS

~~~js
const yt = require('tokito-ytdl')

async function main() {
  const pesquisa = await yt.search('Bruno Mars', 5)
  console.log(pesquisa.results)

  const link = pesquisa.results[0]?.url
  if (!link) throw new Error('Vídeo não encontrado')

  console.log(await yt.info(link))
  console.log(await yt.audio(link))
  console.log(await yt.video(link))

  const audio = await yt.mp3(link, { quality: 128 })
  const video = await yt.mp4(link, { quality: 480 })
  console.log(audio.path, video.path)
}

main().catch(console.error)
~~~

### ESM

~~~js
import yt from 'tokito-ytdl'

const resultado = await yt.search('lofi', 5)
console.log(resultado.results)
~~~

## Métodos

| Função | Retorno |
| --- | --- |
| search(texto, limite = 5) | Pesquisa até 20 vídeos; results com id, title, url, duration, channel, thumbnail. |
| info(url) | Informações do vídeo: título, canal, duração, capa e views. |
| audio(url) | URL temporária do áudio original, que **não é necessariamente MP3**. |
| video(url) | URL temporária de MP4 contendo áudio, quando disponível. |
| mp3(url, options) | MP3 real convertido, com path, filename e size. |
| mp4(url, options) | MP4 baixado, combinando faixas quando necessário. |

### Notas importantes

- As funções preservam nomes e parâmetros da versão anterior.
- Links diretos do YouTube são temporários e podem depender de sessão, IP ou cabeçalhos HTTP.
- Para enviar MP3 pela rota /api/youtube-audio, use search() e mp3(), e só transmita depois que terminar a conversão.
- O FFmpeg vem pelo npm, mas hospedagens que bloqueiam execução de binários ainda podem impedir MP3 ou certos MP4.
- A qualidade é um limite máximo e depende dos formatos disponibilizados pelo YouTube.
- Crie pastas temporárias distintas para requisições simultâneas e remova os arquivos após o envio.
- Vídeos privados, restritos, mudanças no YouTube ou bloqueios de rede podem impedir downloads.
- Use apenas mídias cujo download seja permitido.

## Testes

~~~bash
npm test
~~~

Os testes automatizados simulam respostas do YouTube e verificam conversão local. **Não substituem testes reais na hospedagem.**

## Licença

MIT © 2026 Dylan Modz.
