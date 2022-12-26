import * as React from 'react'

import { Box, render } from 'ink'
import BigText from 'ink-big-text'
import { ns } from 'repl-ns'
import ffmpegPath from 'ffmpeg-static'
import { formNS } from 'src/form'
import { statusNS } from 'src/status'

if (ffmpegPath) process.env['FFMPEG_PATH'] = ffmpegPath

export const indexNS = ns(
  'index',
  {
    Index: () => {
      const Form = formNS().Form
      const Status = statusNS().Status

      return (
        <Box flexDirection="column">
          <Box>
            <BigText text="YOUTUBE DOWNLOAD"></BigText>
          </Box>
          <Box marginBottom={1}>
            <Status />
          </Box>
          <Box>
            <Form />
          </Box>
        </Box>
      )
    },
  },
  {
    async after() {
      if (process.env['NODE_ENV'] === 'test') return

      const Index = indexNS().Index
      render(<Index />)
    },
  }
)
