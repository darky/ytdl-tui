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

export const indexNS = ns(
  'index',
  {
    Index: () => {
      const url = useStore(indexNS().url$)
      const path = useStore(indexNS().path$)
      const startTime = useStore(indexNS().startTime$)
      const endTime = useStore(indexNS().endTime$)
      const downloaded = useStore(indexNS().downloaded$)
      const downloadInProgress = useStore(indexNS().downloadInProgress$)
      const downloadError = useStore(indexNS().downloadError$)
      const resolution = useStore(indexNS().resolution$)

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
              {...indexNS().formProps({ url, path, startTime, endTime, resolution })}
              onSubmit={state => {
                indexNS().downloadError$.set(null)
                indexNS().downloaded$.set(false)
                indexNS().downloadInProgress$.set(true)
                indexNS().onDownload(state as State)
              }}
            />
          </Box>
        </Box>
      )
    },

    formProps: ({ url, path, startTime, endTime, resolution }: State) =>
      ({
        onChange: (state: State) => {
          indexNS().url$.set(state.url)
          indexNS().path$.set(state.path)
          indexNS().startTime$.set(state.startTime)
          indexNS().endTime$.set(state.endTime)
          indexNS().resolution$.set(state.resolution)
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
        indexNS().downloadInProgress$.set(false)
        indexNS().downloaded$.set(true)
        indexNS().downloadError$.set(null)
      }
      const renderErr = (err: Error) => {
        indexNS().downloadInProgress$.set(false)
        indexNS().downloaded$.set(false)
        indexNS().downloadError$.set(err)
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
                  ffmpegStream = ffmpegStream.setDuration(indexNS().calcDuration(state))
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
      const startSec = indexNS().time2Seconds(state.startTime)
      const endSec = indexNS().time2Seconds(state.endTime)
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
  },
  {
    async after() {
      if (process.env['NODE_ENV'] === 'test') return

      const Index = indexNS().Index
      render(<Index />)
    },
  }
)
