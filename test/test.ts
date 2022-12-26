import { test } from 'uvu'
import { indexNS } from 'src/index'
import assert from 'assert'

test('calcDuration seconds', () => {
  const duration = indexNS().calcDuration({
    startTime: '00:00:10',
    endTime: '00:00:25',
    path: '',
    url: '',
    resolution: 'highest',
  })
  assert.strictEqual(duration, 15)
})

test('calcDuration minutes', () => {
  const duration = indexNS().calcDuration({
    startTime: '00:00:10',
    endTime: '00:01:25',
    path: '',
    url: '',
    resolution: 'highest',
  })
  assert.strictEqual(duration, 75)
})

test('calcDuration hours', () => {
  const duration = indexNS().calcDuration({
    startTime: '00:00:10',
    endTime: '01:01:25',
    path: '',
    url: '',
    resolution: 'highest',
  })
  assert.strictEqual(duration, 3675)
})

test('calcDuration without startTime', () => {
  const duration = indexNS().calcDuration({
    startTime: '',
    endTime: '01:00:01',
    path: '',
    url: '',
    resolution: 'highest',
  })
  assert.strictEqual(duration, 3601)
})

test('calcDuration error when startTime == endTime', () => {
  assert.throws(() =>
    indexNS().calcDuration({
      startTime: '01:00:01',
      endTime: '01:00:01',
      path: '',
      url: '',
      resolution: 'highest',
    })
  )
})

test('calcDuration error when startTime > endTime', () => {
  assert.throws(() =>
    indexNS().calcDuration({
      startTime: '01:01:01',
      endTime: '01:00:01',
      path: '',
      url: '',
      resolution: 'highest',
    })
  )
})

test.run()
