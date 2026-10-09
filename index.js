'use strict'

const search = require('./src/search')
const info = require('./src/info')
const audio = require('./src/audio')
const video = require('./src/video')
const { mp3, mp4 } = require('./src/download')

const { githubAudio, githubVideo, githubFile, cleanupGithubExpired, startGithubCleanup, stopGithubCleanup } = require('./src/github')

module.exports = {
  search, info, audio, video, mp3, mp4,
  githubAudio, githubVideo, githubFile,
  cleanupGithubExpired, startGithubCleanup, stopGithubCleanup
}
