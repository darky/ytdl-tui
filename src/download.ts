import yt from 'ytdl-core-muxer-by-darky'
import ffmpeg from 'fluent-ffmpeg'
import { atom } from 'nanostores-cjs'
import type { Context } from 'src/types'
import { ns } from 'repl-ns'
import { durationNS } from 'src/duration'
import ffmpegPath from 'ffmpeg-static'
import pEvent from 'p-event'
import { on } from 'events'
import { match, P } from 'ts-pattern'
import { fsNS } from 'src/fs'

if (ffmpegPath) process.env['FFMPEG_PATH'] = ffmpegPath

export const downloadNS = ns('download', {
  async onDownload(ctx: Context) {
    const isBusy = match(downloadNS().downloadStatus$.get().status)
      .with(P.union('nothing', 'completed', 'error'), () => false)
      .with(P.union('downloading', 'processing'), () => true)
      .exhaustive()

    if (isBusy) {
      return
    }

    const ac = new AbortController()
    downloadNS().renderDownloading()

    try {
      const cachedTempFilePath = fsNS().cachedTempFilePath(ctx.url)
      const temporaryFilePath = cachedTempFilePath ?? (await fsNS().createTempFilePath())

      if (!cachedTempFilePath) {
        const ytDownloading = downloadNS().youtubeDownload(ctx.url)

        process.nextTick(async () => {
          try {
            for await (const [, downloadedBytes, totalBytes] of on(ytDownloading, 'progress', { signal: ac.signal })) {
              downloadNS().renderDownloading(
                `${(downloadedBytes / 1024 / 1024).toFixed(0)} of ${(totalBytes / 1024 / 1024).toFixed(0)} MB`
              )
            }
          } catch {}
        })

        await pEvent(
          ytDownloading
            .on('error', downloadNS().renderErr)
            .pipe(fsNS().writeTempFile(temporaryFilePath).on('error', downloadNS().renderErr)),
          'finish'
        )
      }

      if (ctx.startTime || ctx.endTime || ctx.resolution !== 'highest') {
        downloadNS().renderProcessing()

        const ffmpegStream = await Promise.resolve(downloadNS().createFfmpeg(temporaryFilePath))
          .then(ff => (ctx.startTime ? ff.setStartTime(ctx.startTime) : ff))
          .then(ff => (ctx.endTime ? ff.setDuration(durationNS().calcDuration(ctx)) : ff))
          .then(ff => (ctx.resolution === 'highest' ? ff : ff.size(`?x${ctx.resolution}`)))

        process.nextTick(async () => {
          try {
            for await (const [{ timemark }] of on(ffmpegStream, 'progress', { signal: ac.signal })) {
              downloadNS().renderProcessing(timemark)
            }
          } catch {}
        })

        await pEvent(ffmpegStream.saveToFile(ctx.path), 'end')
      } else {
        await fsNS().cpFile(temporaryFilePath, ctx.path)
      }

      !cachedTempFilePath && fsNS().setCachedTempFilePath(ctx.url, temporaryFilePath)
      downloadNS().renderComplete()
    } catch (err) {
      downloadNS().renderErr(err as Error)
    } finally {
      ac.abort()
    }
  },

  youtubeDownload(url: string) {
    return yt(url)
  },

  createFfmpeg(path: string) {
    return ffmpeg(path)
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
