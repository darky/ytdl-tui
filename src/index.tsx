import * as React from 'react'

import { Box, Instance, render } from 'ink'
import BigText from 'ink-big-text'
import { ns } from 'repl-ns'
import ffmpegPath from 'ffmpeg-static'
import { formNS } from 'src/form'
import { statusNS } from 'src/status'

// process.env['NODE_ENV'] = 'test'

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

    instance: null as null | Instance,
  },
  {
    async before(payload) {
      payload?.instance?.unmount()
    },

    async after(payload) {
      if (process.env['NODE_ENV'] === 'test') {
        // for tests not render UI again
        // also freeze node.js via setTimeout for REPL driven development in tests
        setTimeout(() => {}, 1000 * 60 * 60)
        return
      }

      const Index = indexNS().Index
      payload.instance = render(<Index />)
    },
  }
)
