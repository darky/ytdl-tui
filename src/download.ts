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
import { on } from 'events'
import { match, P } from 'ts-pattern'

if (ffmpegPath) process.env['FFMPEG_PATH'] = ffmpegPath

export const downloadNS = ns('download', {
  async onDownload(state: State) {
    const isBusy = match(downloadNS().downloadStatus$.get().status)
      .with(P.union('nothing', 'completed', 'error'), () => false)
      .with(P.union('downloading', 'processing'), () => true)
      .exhaustive()

    if (isBusy) {
      return
    }

    downloadNS().renderDownloading()

    try {
      const temporaryFilePath = await downloadNS().createTempFilePath()
      const ytDownloading = downloadNS().youtubeDownload(state.url)

      process.nextTick(async () => {
        try {
          for await (const [, downloadedBytes, totalBytes] of on(ytDownloading, 'progress')) {
            downloadNS().renderDownloading(
              `${(downloadedBytes / 1024 / 1024).toFixed(0)} of ${(totalBytes / 1024 / 1024).toFixed(0)} MB`
            )
          }
        } catch {}
      })

      await pEvent(
        ytDownloading
          .on('error', downloadNS().renderErr)
          .pipe(downloadNS().writeTempFile(temporaryFilePath).on('error', downloadNS().renderErr)),
        'finish'
      )

      if (state.startTime || state.endTime || state.resolution !== 'highest') {
        downloadNS().renderProcessing()

        const ffmpegStream = await Promise.resolve(downloadNS().createFfmpeg(temporaryFilePath))
          .then(ff => (state.startTime ? ff.setStartTime(state.startTime) : ff))
          .then(ff => (state.endTime ? ff.setDuration(durationNS().calcDuration(state)) : ff))
          .then(ff => (state.resolution === 'highest' ? ff : ff.size(`?x${state.resolution}`)))

        process.nextTick(async () => {
          try {
            for await (const [{ timemark }] of on(ffmpegStream, 'progress')) {
              downloadNS().renderProcessing(timemark)
            }
          } catch {}
        })

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

  renderDownloading(payload = '') {
    downloadNS().downloadStatus$.set({ status: 'downloading', payload })
  },

  renderProcessing(payload = '') {
    downloadNS().downloadStatus$.set({ status: 'processing', payload })
  },

  downloadStatus$: atom<{ status: 'nothing' | 'downloading' | 'processing' | 'error' | 'completed'; payload: string }>({
    status: 'nothing',
    payload: '',
  }),
})
