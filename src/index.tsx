import * as React from 'react'

import { Box, render, Text } from 'ink'
import BigText from 'ink-big-text'
import { ns } from 'repl-ns'
import { Form, FormProps } from 'ink-form'
import Spinner from 'ink-spinner'
import yt from 'ytdl-core-muxer'
import { atom, SetStateAction, useAtom } from 'jotai'
import ffmpegPath from 'ffmpeg-static'
import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import { copyFile, mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'

if (ffmpegPath) process.env['FFMPEG_PATH'] = ffmpegPath

type State = { url: string; path: string; startTime: string; endTime: string; resolution: 'highest' | '720' | '360' }

export const mainNS = ns('main', {
  Main: () => {
    const [url, setUrl] = useAtom(mainNS().url$)
    const [path, setPath] = useAtom(mainNS().path$)
    const [startTime, setStartTime] = useAtom(mainNS().startTime$)
    const [endTime, setEndTime] = useAtom(mainNS().endTime$)
    const [downloaded, setDownloaded] = useAtom(mainNS().downloaded$)
    const [downloadInProgress, setDownloadInProgress] = useAtom(mainNS().downloadInProgress$)
    const [downloadError, setDownloadError] = useAtom(mainNS().downloadError$)
    const [resolution, setResolution] = useAtom(mainNS().resolution$)

    return (
      <Box flexDirection="column">
        <Box>
          <BigText text="YOUTUBE DOWNLOAD"></BigText>
        </Box>
        <Box marginBottom={1}>
          {downloadInProgress ? (
            <Spinner type="aesthetic" />
          ) : downloaded ? (
            <Text color={'green'}>✅ Video downloaded!</Text>
          ) : downloadError ? (
            <Text color={'red'}>{downloadError.message}</Text>
          ) : null}
        </Box>
        <Box>
          <Form
            {...mainNS().formProps(
              { url, path, startTime, endTime, resolution },
              { setUrl, setPath, setStartTime, setEndTime, setResolution }
            )}
            onSubmit={obj => {
              setDownloadError(() => null)
              setDownloaded(() => false)
              setDownloadInProgress(() => true)
              mainNS().onDownload(obj as State, { setDownloaded, setDownloadInProgress, setDownloadError })
            }}
          />
        </Box>
      </Box>
    )
  },

  formProps: (
    { url, path, startTime, endTime, resolution }: State,
    {
      setUrl,
      setPath,
      setStartTime,
      setEndTime,
      setResolution,
    }: {
      setUrl: (update: SetStateAction<string>) => void
      setPath: (update: SetStateAction<string>) => void
      setStartTime: (update: SetStateAction<string>) => void
      setEndTime: (update: SetStateAction<string>) => void
      setResolution: (update: SetStateAction<State['resolution']>) => void
    }
  ) =>
    ({
      onChange: (state: State) => {
        setUrl(() => state.url)
        setPath(() => state.path)
        setStartTime(() => state.startTime)
        setEndTime(() => state.endTime)
        setResolution(() => state.resolution)
      },
      form: {
        title: 'Please setup form for downloading video from Youtube',
        sections: [
          {
            title: '',
            fields: [
              {
                type: 'string',
                name: 'url',
                label: 'Youtube URL',
                regex: RegExp('^https://.*$'),
                initialValue: url,
              },
              {
                type: 'string',
                name: 'path',
                label: 'File location',
                initialValue: path || `${process.cwd()}/video.mp4`,
              },
              {
                type: 'string',
                name: 'startTime',
                label: 'Start time (optional)',
                regex: RegExp('(^\\d\\d:\\d\\d:\\d\\d$|^$)'),
                initialValue: startTime,
              },
              {
                type: 'string',
                name: 'endTime',
                label: 'End time (optional)',
                regex: RegExp('(^\\d\\d:\\d\\d:\\d\\d$|^$)'),
                initialValue: endTime,
              },
              {
                type: 'select',
                name: 'resolution',
                label: 'Resolution',
                initialValue: resolution ?? 'highest',
                options: [
                  { label: 'highest', value: 'highest' },
                  { label: '720p', value: '720' },
                  { label: '360p', value: '360' },
                ],
              },
            ],
          },
        ],
      },
    } as FormProps),

  async onDownload(
    obj: State,
    {
      setDownloaded,
      setDownloadInProgress,
      setDownloadError,
    }: {
      setDownloaded: (update: SetStateAction<boolean>) => void
      setDownloadInProgress: (update: SetStateAction<boolean>) => void
      setDownloadError: (update: SetStateAction<Error | null>) => void
    }
  ) {
    const renderComplete = () => {
      setDownloadInProgress(() => false)
      setDownloaded(() => true)
      setDownloadError(() => null)
    }
    const renderErr = (err: Error) => {
      setDownloadInProgress(() => false)
      setDownloaded(() => false)
      setDownloadError(() => err)
    }

    try {
      const temporaryFilePath = `${await mkdtemp(`${tmpdir()}/ytdl-tui-`)}/video.mp4`

      yt(obj.url)
        .on('error', err => renderErr(err))
        .pipe(fs.createWriteStream(temporaryFilePath).on('error', err => renderErr(err)))
        .on('finish', async () => {
          try {
            if (obj.startTime || obj.endTime) {
              let ffmpegStream = ffmpeg(temporaryFilePath)
              if (obj.startTime) {
                ffmpegStream = ffmpegStream.setStartTime(obj.startTime)
              }
              if (obj.endTime) {
                ffmpegStream = ffmpegStream.setDuration(mainNS().calcDuration(obj))
              }
              if (obj.resolution !== 'highest') {
                ffmpegStream = ffmpegStream.size(`?x${obj.resolution}`)
              }
              ffmpegStream
                .saveToFile(obj.path)
                .on('error', err => renderErr(err))
                .on('end', () => renderComplete())
            } else {
              await copyFile(temporaryFilePath, obj.path)
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

  calcDuration(obj: State) {
    const startSec = mainNS().time2Seconds(obj.startTime)
    const endSec = mainNS().time2Seconds(obj.endTime)
    const duration = endSec - startSec

    if (duration <= 0) {
      throw new Error("End time can't be less than start time")
    }

    return duration
  },

  time2Seconds(time: string) {
    const [hh = 0, mm = 0, ss = 0] = (time ?? '').split(':').map(Number)
    return ss + mm * 60 + hh * 60 * 60
  },

  url$: atom(''),

  path$: atom(''),

  startTime$: atom(''),

  endTime$: atom(''),

  downloaded$: atom(false),

  downloadInProgress$: atom(false),

  downloadError$: atom<Error | null>(null),

  resolution$: atom<State['resolution']>('highest'),
})

if (process.env['NODE_ENV'] !== 'test') {
  ;(async () => {
    await mainNS.ready

    const Main = mainNS().Main
    render(<Main />)
  })()
}
