import yt from 'ytdl-core-muxer-by-darky'
import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import { copyFile, mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import { atom } from 'nanostores-cjs'
import type { State } from 'src/types'
import { ns } from 'repl-ns'
import { durationNS } from 'src/duration'
import ffmpegPath from 'ffmpeg-static'
import pEvent from 'p-event'

if (ffmpegPath) process.env['FFMPEG_PATH'] = ffmpegPath

export const downloadNS = ns('download', {
  async onDownload(state: State) {
    downloadNS().renderInProgress()

    try {
      const temporaryFilePath = await downloadNS().createTempFilePath()

      await pEvent(
        downloadNS()
          .youtubeDownload(state.url)
          .on('error', downloadNS().renderErr)
          .pipe(downloadNS().writeTempFile(temporaryFilePath).on('error', downloadNS().renderErr)),
        'finish'
      )

      if (state.startTime || state.endTime || state.resolution !== 'highest') {
        let ffmpegStream = downloadNS().createFfmpeg(temporaryFilePath)
        if (state.startTime) {
          ffmpegStream = ffmpegStream.setStartTime(state.startTime)
        }
        if (state.endTime) {
          ffmpegStream = ffmpegStream.setDuration(durationNS().calcDuration(state))
        }
        if (state.resolution !== 'highest') {
          ffmpegStream = ffmpegStream.size(`?x${state.resolution}`)
        }
        await pEvent(ffmpegStream.saveToFile(state.path), 'end')
      } else {
        await downloadNS().cpFile(temporaryFilePath, state.path)
      }

      downloadNS().renderComplete()
    } catch (err) {
      downloadNS().renderErr(err as Error)
    }
  },

  async createTempFilePath() {
    return `${await mkdtemp(`${tmpdir()}/ytdl-tui-`)}/video.mp4`
  },

  youtubeDownload(url: string) {
    return yt(url)
  },

  writeTempFile(path: string) {
    return fs.createWriteStream(path)
  },

  createFfmpeg(path: string) {
    return ffmpeg(path)
  },

  async cpFile(from: string, to: string) {
    await copyFile(from, to)
  },

  renderComplete() {
    downloadNS().downloadStatus$.set({ status: 'completed', payload: '' })
  },

  renderErr(err: Error) {
    downloadNS().downloadStatus$.set({ status: 'error', payload: err.message })
  },

  renderInProgress() {
    downloadNS().downloadStatus$.set({ status: 'in progress', payload: '' })
  },

  downloadStatus$: atom<{ status: 'nothing' | 'in progress' | 'error' | 'completed'; payload: string }>({
    status: 'nothing',
    payload: '',
  }),
})
