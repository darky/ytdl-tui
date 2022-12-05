import * as React from 'react'

import { Box, render, Text } from 'ink'
import BigText from 'ink-big-text'
import { ns } from 'repl-ns'
import { Form, FormProps } from 'ink-form'
import Spinner from 'ink-spinner'
import yt from 'ytdl-core-muxer'
import fs from 'fs'
import { atom, SetStateAction, useAtom } from 'jotai'

type State = { url: string; path: string }

const mainNS = ns('main', {
  Main: () => {
    const [url, setUrl] = useAtom(mainNS().url$)
    const [path, setPath] = useAtom(mainNS().path$)
    const [downloaded, setDownloaded] = useAtom(mainNS().downloaded$)
    const [downloadInProgress, setDownloadInProgress] = useAtom(mainNS().downloadInProgress$)

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
          ) : null}
        </Box>
        <Box>
          <Form
            {...mainNS().formProps({ url, path }, { setUrl, setPath })}
            onSubmit={obj => {
              setDownloaded(() => false)
              setDownloadInProgress(() => true)
              mainNS().onDownload(obj as State, setDownloaded, setDownloadInProgress)
            }}
          />
        </Box>
      </Box>
    )
  },

  formProps: (
    { url, path }: State,
    {
      setUrl,
      setPath,
    }: { setUrl: (update: SetStateAction<string>) => void; setPath: (update: SetStateAction<string>) => void }
  ) =>
    ({
      onChange: (state: State) => {
        setUrl(() => state.url)
        setPath(() => state.path)
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
            ],
          },
        ],
      },
    } as FormProps),

  onDownload(
    obj: State,
    setDownloaded: (update: SetStateAction<boolean>) => void,
    setDownloadInProgress: (update: SetStateAction<boolean>) => void
  ) {
    yt(obj.url)
      .pipe(fs.createWriteStream(obj.path))
      .on('finish', () => {
        setDownloadInProgress(() => false)
        setDownloaded(() => true)
      })
  },

  url$: atom(''),

  path$: atom(''),

  downloaded$: atom(false),

  downloadInProgress$: atom(false),
})

;(async () => {
  await mainNS.ready

  const Main = mainNS().Main
  render(<Main />)
})()
