import yt from 'ytdl-core-muxer'
import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import { copyFile, mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import { atom } from 'nanostores-cjs'
import type { State } from 'src/types'
import { ns } from 'repl-ns'
import { durationNS } from 'src/duration'

export const downloadNS = ns('download', {
  async onDownload(state: State) {
    const renderComplete = () => {
      downloadNS().downloadInProgress$.set(false)
      downloadNS().downloaded$.set(true)
      downloadNS().downloadError$.set(null)
    }
    const renderErr = (err: Error) => {
      downloadNS().downloadInProgress$.set(false)
      downloadNS().downloaded$.set(false)
      downloadNS().downloadError$.set(err)
    }

    downloadNS().downloadError$.set(null)
    downloadNS().downloaded$.set(false)
    downloadNS().downloadInProgress$.set(true)

    try {
      const temporaryFilePath = `${await mkdtemp(`${tmpdir()}/ytdl-tui-`)}/video.mp4`

      yt(state.url)
        .on('error', err => renderErr(err))
        .pipe(fs.createWriteStream(temporaryFilePath).on('error', err => renderErr(err)))
        .on('finish', async () => {
          try {
            if (state.startTime || state.endTime) {
              let ffmpegStream = ffmpeg(temporaryFilePath)
              if (state.startTime) {
                ffmpegStream = ffmpegStream.setStartTime(state.startTime)
              }
              if (state.endTime) {
                ffmpegStream = ffmpegStream.setDuration(durationNS().calcDuration(state))
              }
              if (state.resolution !== 'highest') {
                ffmpegStream = ffmpegStream.size(`?x${state.resolution}`)
              }
              ffmpegStream
                .saveToFile(state.path)
                .on('error', err => renderErr(err))
                .on('end', () => renderComplete())
            } else {
              await copyFile(temporaryFilePath, state.path)
              renderComplete()
            }
          } catch (err) {
            renderErr(err as Error)
          }
        })
    } catch (err) {
      renderErr(err as Error)
    }
  },

  downloaded$: atom(false),

  downloadInProgress$: atom(false),

  downloadError$: atom<Error | null>(null),
})
