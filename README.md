<div align="center">

# 🧊 TOKITO YTDL

**Biblioteca Node.js para pesquisa, metadados e download de áudio e vídeo do YouTube.**

![Version](https://img.shields.io/badge/version-1.1.0-38bdf8?style=flat-square)
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
- ⏱️ **GitHub temporário (experimental)**: upload e exclusão programada em 60 segundos.
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

## ⏱️ Links temporários pelo GitHub (experimental)

Este recurso é **opcional** e não altera os métodos atuais de busca, áudio ou vídeo.

O Tokito YTDL pode baixar um MP3 ou MP4, enviar para um **GitHub Release público e temporário** e devolver uma URL do próprio github.com. O backend programa a **exclusão do Release e sua tag após 60 segundos**.

### Configurar token

1. Crie um [Personal Access Token (fine-grained)](https://github.com/settings/personal-access-tokens/new), com acesso **apenas a este repositório** e permissão **Contents: Read and write**.
2. Configure o token **no servidor**, nunca no frontend nem no repositório público.
3. Opcionalmente, configure outro repositório por meio da variável TOKITO_GITHUB_REPO.

~~~bash
export TOKITO_GITHUB_TOKEN="TOKEN_AQUI"
export TOKITO_GITHUB_REPO="dylan-Modz/Tokito-YTDL-"
~~~

### Exemplo

~~~js
const yt = require('tokito-ytdl')

// Execute uma vez na inicialização do backend:
// procura e exclui Releases expirados que ficaram após reinícios.
yt.startGithubCleanup()

async function exemplo() {
  const audio = await yt.githubAudio('https://youtu.be/VIDEO_ID')
  console.log(audio.url, audio.expiresIn) // URL do GitHub, 60 segundos

  const video = await yt.githubVideo('https://youtu.be/VIDEO_ID', { quality: 360 })
  console.log(video.url)
}

exemplo().catch(console.error)
~~~

Também dá para enviar uma mídia MP3/MP4 já existente no disco:

~~~js
const resultado = await yt.githubFile('/caminho/meu-audio.mp3', { type: 'mp3' })
console.log(resultado)
~~~

Exemplo **fictício** do retorno:

~~~json
{
  "status": true,
  "url": "https://github.com/dylan-Modz/Tokito-YTDL-/releases/download/tokito-temp-EXEMPLO/media-EXEMPLO.mp3",
  "expiresIn": 60,
  "expiresAt": "2026-10-09T23:00:00.000Z",
  "temporary": true,
  "provider": "github-releases"
}
~~~

### Limitações

- O GitHub **não oferece expiração nativa de URLs de Releases**. O backend precisa executar a exclusão; caches podem manter o link acessível depois.
- Se o servidor parar, não há exclusão enquanto estiver desligado. A função **startGithubCleanup()** verifica o que venceu ao reiniciar e depois a cada 30 segundos.
- Só são removidos Releases temporários do próprio módulo, nunca lançamentos convencionais.
- Limite experimental de **48 MiB** por arquivo.
- GitHub Releases é público. Não use para arquivos privados, nem para conteúdo sem autorização de publicação.
- Muitas criações/exclusões podem exceder **limites e políticas do GitHub**. Não use o GitHub como CDN de uma API pública.
- **Ainda não houve teste real de upload** com token desta conta. Faça um teste pequeno usando arquivo próprio primeiro.

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
