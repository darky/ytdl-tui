import { copyFile, mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import { ns } from 'repl-ns'
import fs from 'fs'

export const fsNS = ns('fs', {
  async createTempFilePath() {
    return `${await mkdtemp(`${tmpdir()}/ytdl-tui-`)}/video.mp4`
  },

  writeTempFile(path: string) {
    return fs.createWriteStream(path)
  },

  async cpFile(from: string, to: string) {
    await copyFile(from, to)
  },
})
