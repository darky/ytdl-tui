import assert from 'assert'
import { downloadNS } from 'src/download'
import { test } from 'uvu'
import sinon from 'sinon'
import { PassThrough } from 'stream'
import { setTimeout } from 'timers/promises'
import EventEmitter from 'events'

test.before.each(() => {
  const ns = downloadNS()

  sinon.stub(ns, 'createTempFilePath').returns(Promise.resolve('test-temp-path'))
  sinon.stub(ns, 'youtubeDownload').callsFake(() => {
    const stream = new PassThrough()
    setImmediate(() => stream.end())
    return stream
  })
  sinon.stub(ns, 'writeTempFile').callsFake(() => {
    const stream = new PassThrough()
    setImmediate(() => stream.end())
    return stream as any
  })
  sinon.stub(ns, 'cpFile').returns(Promise.resolve())
  sinon.stub(ns, 'createFfmpeg').callsFake(() => {
    const obj = {
      setStartTime() {
        return obj
      },
      setDuration() {
        return obj
      },
      size() {
        return obj
      },
      saveToFile() {
        const em = new EventEmitter()
        setImmediate(() => em.emit('end'))
        return em
      },
    }
    return obj as any
  })
})

test.after.each(() => sinon.restore())

test('complete state', () => {
  downloadNS().renderComplete()

  assert.strictEqual(downloadNS().downloadStatus$.get().status, 'completed')
})

test('downloading state', () => {
  downloadNS().renderDownloading()

  assert.strictEqual(downloadNS().downloadStatus$.get().status, 'downloading')
})

test('processing state', () => {
  downloadNS().renderProcessing()

  assert.strictEqual(downloadNS().downloadStatus$.get().status, 'processing')
})

test('error state', () => {
  const err = new Error('test')
  downloadNS().renderErr(err)

  assert.strictEqual(downloadNS().downloadStatus$.get().status, 'error')
  assert.strictEqual(downloadNS().downloadStatus$.get().payload, 'test')
})

test('set downloading, when call onDownload', async () => {
  const ns = downloadNS()
  const s = sinon.stub(ns, 'renderDownloading')
  await downloadNS().onDownload({
    path: '',
    startTime: '',
    endTime: '',
    resolution: 'highest',
    url: '',
  })

  assert.strictEqual(s.callCount, 1)
})

test('set processing, when call onDownload with settings', async () => {
  const ns = downloadNS()
  const s = sinon.stub(ns, 'renderProcessing')
  await downloadNS().onDownload({
    path: '',
    startTime: '00:00:00',
    endTime: '00:00:06',
    resolution: 'highest',
    url: '',
  })

  assert.strictEqual(s.callCount, 1)
})

test('set completed, when onDownload called without settings', async () => {
  const ns = downloadNS()
  const s = sinon.stub(ns, 'renderComplete')
  await downloadNS().onDownload({
    path: '',
    startTime: '',
    endTime: '',
    resolution: 'highest',
    url: '',
  })

  assert.strictEqual(s.callCount, 1)
})

test('set error, when something wrong with temp file creation', async () => {
  const ns = downloadNS()
  const s = sinon.stub(ns, 'renderErr')
  ;(ns.createTempFilePath as any).restore()
  sinon.stub(ns, 'createTempFilePath').rejects('err')
  await downloadNS().onDownload({
    path: '',
    startTime: '',
    endTime: '',
    resolution: 'highest',
    url: '',
  })

  assert.strictEqual(s.callCount, 1)
  assert.strictEqual((s.args[0] as any)[0].name, 'err')
})

test('set error, when something wrong with youtube download', async () => {
  const ns = downloadNS()
  const s = sinon.stub(ns, 'renderErr')
  ;(ns.youtubeDownload as any).restore()
  sinon.stub(ns, 'youtubeDownload').callsFake(() => {
    const stream = new PassThrough()
    setImmediate(() => stream.emit('error', 'err'))
    return stream
  })
  await downloadNS().onDownload({
    path: '',
    startTime: '',
    endTime: '',
    resolution: 'highest',
    url: '',
  })

  assert.strictEqual(s.callCount, 1)
  assert.strictEqual((s.args[0] as any)[0], 'err')
})

test('should call youtube with url', async () => {
  let url = ''
  const ns = downloadNS()
  ;(ns.youtubeDownload as any).restore()
  sinon.stub(ns, 'youtubeDownload').callsFake(u => {
    url = u
    const stream = new PassThrough()
    setImmediate(() => stream.end())
    return stream
  })
  await downloadNS().onDownload({
    path: '',
    startTime: '',
    endTime: '',
    resolution: 'highest',
    url: 'test-url',
  })

  assert.strictEqual(url, 'test-url')
})

test('set error, when something wrong with file writing to fs', async () => {
  const ns = downloadNS()
  const s = sinon.stub(ns, 'renderErr')
  ;(ns.writeTempFile as any).restore()
  sinon.stub(ns, 'writeTempFile').callsFake(() => {
    const stream = new PassThrough()
    setImmediate(() => stream.emit('error', 'err'))
    return stream as any
  })
  await downloadNS().onDownload({
    path: '',
    startTime: '',
    endTime: '',
    resolution: 'highest',
    url: '',
  })
  await setTimeout(1)
  assert.strictEqual(s.callCount, 1)
  assert.strictEqual((s.args[0] as any)[0], 'err')
})

test('should copy file from temporary for basic settings', async () => {
  let from = ''
  let to = ''
  const ns = downloadNS()
  ;(ns.cpFile as any).restore()
  const s = sinon.stub(ns, 'cpFile').callsFake(async (f, t) => {
    from = f
    to = t
  })
  await downloadNS().onDownload({
    path: 'to-test',
    startTime: '',
    endTime: '',
    resolution: 'highest',
    url: '',
  })

  assert.strictEqual(s.callCount, 1)
  assert.strictEqual(from, 'test-temp-path')
  assert.strictEqual(to, 'to-test')
})

test('set completed, when onDownload called with settings', async () => {
  const ns = downloadNS()
  const s = sinon.stub(ns, 'renderComplete')
  await downloadNS().onDownload({
    path: '',
    startTime: '00:00:00',
    endTime: '',
    resolution: 'highest',
    url: '',
  })

  assert.strictEqual(s.callCount, 1)
})

test('set error, when something wrong with ffmpeg saving file', async () => {
  const ns = downloadNS()
  const s = sinon.stub(ns, 'renderErr')
  ;(ns.createFfmpeg as any).restore()
  sinon.stub(ns, 'createFfmpeg').callsFake(() => {
    const obj = {
      setStartTime() {
        return obj
      },
      setDuration() {
        return obj
      },
      size() {
        return obj
      },
      saveToFile() {
        const em = new EventEmitter()
        setImmediate(() => em.emit('error', 'err'))
        return em
      },
    }
    return obj as any
  })
  await downloadNS().onDownload({
    path: '',
    startTime: '00:00:00',
    endTime: '',
    resolution: 'highest',
    url: '',
  })

  assert.strictEqual(s.callCount, 1)
  assert.strictEqual((s.args[0] as any)[0], 'err')
})

test('should set ffmpeg start time', async () => {
  let time = ''
  const ns = downloadNS()
  ;(ns.createFfmpeg as any).restore()
  sinon.stub(ns, 'createFfmpeg').callsFake(() => {
    const obj = {
      setStartTime(t: string) {
        time = t
        return obj
      },
      setDuration() {
        return obj
      },
      size() {
        return obj
      },
      saveToFile() {
        const em = new EventEmitter()
        setImmediate(() => em.emit('end'))
        return em
      },
    }
    return obj as any
  })
  await downloadNS().onDownload({
    path: '',
    startTime: '00:00:00',
    endTime: '',
    resolution: 'highest',
    url: '',
  })

  assert.strictEqual(time, '00:00:00')
})

test('should set ffmpeg duration', async () => {
  let duration = 0
  const ns = downloadNS()
  ;(ns.createFfmpeg as any).restore()
  sinon.stub(ns, 'createFfmpeg').callsFake(() => {
    const obj = {
      setStartTime() {
        return obj
      },
      setDuration(d: number) {
        duration = d
        return obj
      },
      size() {
        return obj
      },
      saveToFile() {
        const em = new EventEmitter()
        setImmediate(() => em.emit('end'))
        return em
      },
    }
    return obj as any
  })
  await downloadNS().onDownload({
    path: '',
    startTime: '00:00:00',
    endTime: '00:00:06',
    resolution: 'highest',
    url: '',
  })

  assert.strictEqual(duration, 6)
})

test('should set ffmpeg size', async () => {
  let size = ''
  const ns = downloadNS()
  ;(ns.createFfmpeg as any).restore()
  sinon.stub(ns, 'createFfmpeg').callsFake(() => {
    const obj = {
      setStartTime() {
        return obj
      },
      setDuration() {
        return obj
      },
      size(s: string) {
        size = s
        return obj
      },
      saveToFile() {
        const em = new EventEmitter()
        setImmediate(() => em.emit('end'))
        return em
      },
    }
    return obj as any
  })
  await downloadNS().onDownload({
    path: '',
    startTime: '',
    endTime: '',
    resolution: '360',
    url: '',
  })

  assert.strictEqual(size, '?x360')
})
