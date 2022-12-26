import { Text } from 'ink'
import Spinner from 'ink-spinner'
import * as React from 'react'

import { ns } from 'repl-ns'
import { downloadNS } from 'src/download'
import { useStore } from 'src/useStore'

export const statusNS = ns('status', {
  Status: () => {
    const downloaded = useStore(downloadNS().downloaded$)
    const downloadInProgress = useStore(downloadNS().downloadInProgress$)
    const downloadError = useStore(downloadNS().downloadError$)

    return (
      <>
        {downloadInProgress ? (
          <Spinner type="aesthetic" />
        ) : downloaded ? (
          <Text color={'green'}>✅ Video downloaded!</Text>
        ) : downloadError ? (
          <Text color={'red'}>{downloadError.message}</Text>
        ) : null}
      </>
    )
  },
})
