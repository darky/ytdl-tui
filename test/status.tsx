import * as React from 'react'

import { downloadNS } from 'src/download'
import { test } from 'uvu'
import { render } from 'ink-testing-library'
import { statusNS } from 'src/status'
import assert from 'assert'

test('render error status', () => {
  downloadNS().downloadError$.set(new Error('test'))
  downloadNS().downloadInProgress$.set(false)
  downloadNS().downloaded$.set(false)

  const Status = statusNS().Status

  const r = render(<Status />)
  try {
    assert.match(r.lastFrame() ?? '', /test/)
  } finally {
    r.unmount()
  }
})

test('render downloaded status', () => {
  downloadNS().downloadError$.set(null)
  downloadNS().downloadInProgress$.set(false)
  downloadNS().downloaded$.set(true)

  const Status = statusNS().Status

  const r = render(<Status />)
  try {
    assert.match(r.lastFrame() ?? '', /✅ Video downloaded\!/)
  } finally {
    r.unmount()
  }
})

test('render in progress status', () => {
  downloadNS().downloadError$.set(null)
  downloadNS().downloadInProgress$.set(true)
  downloadNS().downloaded$.set(false)

  const Status = statusNS().Status

  const r = render(<Status />)
  try {
    assert.match(r.lastFrame() ?? '', /▰▱▱▱▱▱▱/)
  } finally {
    r.unmount()
  }
})
