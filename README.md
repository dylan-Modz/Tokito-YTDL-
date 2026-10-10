<div align="center">

# 🧊 TOKITO YTDL

**Biblioteca Node.js para pesquisa, metadados e download de áudio e vídeo do YouTube.**

![Version](https://img.shields.io/badge/version-1.0.2-38bdf8?style=flat-square)
![Node](https://img.shields.io/badge/Node.js-22%2B-43853d?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

**Desenvolvido por Dylan Modz**

</div>

---

## ✨ Recursos

- 🔎 **Pesquisa**: encontre vídeos do YouTube por título.
- 🎼 **Informações**: título, canal, duração, capa e visualizações.
- 🎧 **Áudio**: obtenha a URL temporária do fluxo de áudio.
- 🎬 **Vídeo**: obtenha a URL temporária do fluxo de vídeo.
- 📥 **MP3**: converta e salve áudio no disco.
- 📹 **MP4**: baixe e salve vídeo no disco.
- 📱 **Vídeo compatível**: prepara o MP4 para reprodução em aplicativos como WhatsApp.
- ⚙️ **Node.js**: uso em bots, aplicações e APIs.

## 📦 Instalação

Instale a biblioteca diretamente deste repositório:

```bash
npm install github:dylan-Modz/Tokito-YTDL-
```

> O pacote instalado se chama `tokito-ytdl`, independentemente do nome do repositório.

### Pré-requisitos

O Tokito YTDL usa [yt-dlp](https://github.com/yt-dlp/yt-dlp) como motor de extração e [FFmpeg](https://ffmpeg.org/) para conversão de áudio e combinação de vídeo. Eles **não são instalados pelo npm**.

- **Node.js 22 ou superior** (o módulo ativa `--js-runtimes node` no yt-dlp).
- **yt-dlp atualizado**, com o suporte JavaScript necessário ao YouTube.
- **FFmpeg instalado**, para operações MP3/MP4 que precisam de processamento.

Confira o ambiente:

```bash
node -v
yt-dlp --version
ffmpeg -version
```

No Termux, instale os pacotes e atualize o extrator:

```bash
pkg install python python-pip ffmpeg -y
python -m pip install -U "yt-dlp[default]"
```

Em um servidor Linux, instale os mesmos executáveis pelo gerenciador apropriado. Para o yt-dlp, consulte as [instruções oficiais](https://github.com/yt-dlp/yt-dlp#installation).

## 🚀 Exemplos

### CommonJS

```js
const yt = require('tokito-ytdl')

async function main() {
  const busca = await yt.search('lofi hip hop', 3)
  console.log(busca.results)

  const link = busca.results[0]?.url
  if (!link) return

  const info = await yt.info(link)
  console.log(info.title, info.channel, info.duration)

  const arquivo = await yt.mp3(link, { quality: 128 })
  console.log(arquivo.path)
}

main().catch(console.error)
```

### ESM — projetos com `"type": "module"`

```js
import tokito from 'tokito-ytdl'

const resultado = await tokito.search('minha música', 5)
console.log(resultado.results)
```

### Download MP4

```js
const video = await yt.mp4('https://www.youtube.com/watch?v=VIDEO_ID', {
  quality: 720,
  outputDir: './downloads'
})
console.log(video.path, video.size)
```

## 🧩 Referência de funções

| Função | O que faz |
| :--- | :--- |
| `search(texto, limite = 5)` | Pesquisa até 20 vídeos. Retorna `{ status, query, results }`. |
| `info(url)` | Consulta `id`, `title`, `channel`, `duration`, `thumbnail`, `views`. |
| `audio(url)` | Retorna `{ status, url, temporary: true }`. |
| `video(url)` | Retorna `{ status, url, temporary: true }`. |
| `mp3(url, options)` | Salva MP3. Retorna `{ status, path, filename, size }`. |
| `mp4(url, options)` | Salva MP4. Retorna `{ status, path, filename, size }`. |

### Compatibilidade de vídeo para WhatsApp

Desde a versão 1.0.2, o módulo verifica os arquivos MP4 e faz os ajustes necessários para melhorar a reprodução nos aplicativos de mensagens. É necessário ter FFmpeg e FFprobe instalados; em aparelhos menos potentes, vídeos longos podem levar mais tempo para processar. Para bots, recomendamos começar com qualidade 480p.

**Opções de download:** `quality` (MP3 em kbps; MP4 em altura máxima) e `outputDir` (diretório de saída).

Exemplo de resposta de pesquisa:

```json
{
  "status": true,
  "query": "lofi hip hop",
  "results": [
    {
      "id": "VIDEO_ID",
      "title": "Título do vídeo",
      "url": "https://www.youtube.com/watch?v=VIDEO_ID",
      "duration": 210,
      "channel": "Nome do canal",
      "thumbnail": "https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg"
    }
  ]
}
```

*O JSON acima é ilustrativo; os dados reais dependem do YouTube.*

## 🌐 Integração com APIs e sites


É possível chamar o Tokito YTDL dentro de rotas Express ou outros servidores Node.js. Faça pesquisa e metadados no backend e transmita os arquivos baixados ao cliente por uma rota própria.

**Importante:** `audio()` e `video()` retornam **URLs diretas e temporárias**, não arquivos MP3/MP4 prontos. Para downloads processados utilize `mp3()` ou `mp4()`.

## 🔧 Configuração e erros

- Use `TOKITO_YTDLP` para definir o caminho do executável yt-dlp quando ele não está no PATH.
- Trate exceções com `try/catch`: indisponibilidade de vídeo, mudanças no YouTube, rede, restrições e erros de conversão podem interromper uma operação.
- Para servidores públicos, implemente limites por IP, fila/concor­rência, limpezas de arquivos e autenticação.
- URLs diretas podem expirar, depender do IP ou de cabeçalhos HTTP, e nem sempre funcionam em outros servidores.
- A qualidade selecionada não melhora a qualidade da mídia original.

## ✅ Testes

```bash
npm test
```

Os testes automatizados usam um executável **simulado**; uma execução bem-sucedida **não comprova downloads reais do YouTube**. Teste no seu próprio ambiente com acesso à internet.

## 📄 Licença

MIT © 2026 **Dylan Modz**. Utilize conteúdos que você tenha autorização para acessar e baixar.
