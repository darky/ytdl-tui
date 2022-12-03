import * as React from 'react'

import { Box, render } from 'ink'
import BigText from 'ink-big-text'
import { ns } from 'repl-ns'
import { Form, FormProps } from 'ink-form'
import yt from 'ytdl-core-muxer'
import fs from 'fs'

const main = ns('main', {
  Main: () => (
    <Box flexDirection="column">
      <Box>
        <BigText text="YOUTUBE DOWNLOAD"></BigText>
      </Box>
      <Box>
        <Form {...main().formProps()} onSubmit={obj => main().onDownload(obj as { url: string; path: string })} />
      </Box>
    </Box>
  ),

  formProps: () =>
    ({
      form: {
        title: 'Please setup form for downloading video from Youtube',
        sections: [
          {
            fields: [
              {
                type: 'string',
                name: 'url',
                label: 'Youtube URL',
                regex: RegExp('^https://.*$'),
              },
              {
                type: 'string',
                name: 'path',
                label: 'File location',
                initialValue: `${process.cwd()}/video.mp4`,
              },
            ],
          },
        ],
      },
    } as FormProps),

  onDownload(obj: { url: string; path: string }) {
    yt(obj.url).pipe(fs.createWriteStream(obj.path))
  },
})

;(async () => {
  await main.ready

  const Main = main().Main
  render(<Main />)
})()
