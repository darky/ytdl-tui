import * as React from 'react'

import { Box, render, Text } from 'ink'
import BigText from 'ink-big-text'
import { ns } from 'repl-ns'
import { Form, FormProps } from 'ink-form'
import Spinner from 'ink-spinner'
import yt from 'ytdl-core-muxer'
import ffmpegPath from 'ffmpeg-static'
import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import { copyFile, mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import { atom } from 'nanostores-cjs'
import { useStore } from 'src/useStore'

if (ffmpegPath) process.env['FFMPEG_PATH'] = ffmpegPath

type State = { url: string; path: string; startTime: string; endTime: string; resolution: 'highest' | '720' | '360' }

export const mainNS = ns('main', {
  Main: () => {
    const url = useStore(mainNS().url$)
    const path = useStore(mainNS().path$)
    const startTime = useStore(mainNS().startTime$)
    const endTime = useStore(mainNS().endTime$)
    const downloaded = useStore(mainNS().downloaded$)
    const downloadInProgress = useStore(mainNS().downloadInProgress$)
    const downloadError = useStore(mainNS().downloadError$)
    const resolution = useStore(mainNS().resolution$)

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
            {...mainNS().formProps({ url, path, startTime, endTime, resolution })}
            onSubmit={state => {
              mainNS().downloadError$.set(null)
              mainNS().downloaded$.set(false)
              mainNS().downloadInProgress$.set(true)
              mainNS().onDownload(state as State)
            }}
          />
        </Box>
      </Box>
    )
  },

  formProps: ({ url, path, startTime, endTime, resolution }: State) =>
    ({
      onChange: (state: State) => {
        mainNS().url$.set(state.url)
        mainNS().path$.set(state.path)
        mainNS().startTime$.set(state.startTime)
        mainNS().endTime$.set(state.endTime)
        mainNS().resolution$.set(state.resolution)
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

  async onDownload(state: State) {
    const renderComplete = () => {
      mainNS().downloadInProgress$.set(false)
      mainNS().downloaded$.set(true)
      mainNS().downloadError$.set(null)
    }
    const renderErr = (err: Error) => {
      mainNS().downloadInProgress$.set(false)
      mainNS().downloaded$.set(false)
      mainNS().downloadError$.set(err)
    }

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
                ffmpegStream = ffmpegStream.setDuration(mainNS().calcDuration(state))
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

  calcDuration(state: State) {
    const startSec = mainNS().time2Seconds(state.startTime)
    const endSec = mainNS().time2Seconds(state.endTime)
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
