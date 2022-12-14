import * as React from 'react'

import { downloadNS } from 'src/download'
import { test } from 'uvu'
import { render } from 'ink-testing-library'
import { statusNS } from 'src/status'
import assert from 'assert'

test('render error status', () => {
  downloadNS().downloadStatus$.set({ status: 'error', payload: new Error('test').message })

  const Status = statusNS().Status

  const r = render(<Status />)
  try {
    assert.match(r.lastFrame() ?? '', /test/)
  } finally {
    r.unmount()
  }
})

test('render downloaded status', () => {
  downloadNS().downloadStatus$.set({ status: 'completed', payload: '' })

  const Status = statusNS().Status

  const r = render(<Status />)
  try {
    assert.match(r.lastFrame() ?? '', /✅ Video downloaded\!/)
  } finally {
    r.unmount()
  }
})

test('render downloading status', () => {
  downloadNS().downloadStatus$.set({ status: 'downloading', payload: '' })

  const Status = statusNS().Status

  const r = render(<Status />)
  try {
    assert.match(r.lastFrame() ?? '', /Downloading/)
  } finally {
    r.unmount()
  }
})

test('render downloading progress', () => {
  downloadNS().downloadStatus$.set({ status: 'downloading', payload: '2 of 3' })

  const Status = statusNS().Status

  const r = render(<Status />)
  try {
    assert.match(r.lastFrame() ?? '', /2 of 3/)
  } finally {
    r.unmount()
  }
})

test('render processing status', () => {
  downloadNS().downloadStatus$.set({ status: 'processing', payload: '' })

  const Status = statusNS().Status

  const r = render(<Status />)
  try {
    assert.match(r.lastFrame() ?? '', /Processing/)
  } finally {
    r.unmount()
  }
})

test('render processing progress', () => {
  downloadNS().downloadStatus$.set({ status: 'processing', payload: '00.01.03' })

  const Status = statusNS().Status

  const r = render(<Status />)
  try {
    assert.match(r.lastFrame() ?? '', /00\.01\.03/)
  } finally {
    r.unmount()
  }
})
