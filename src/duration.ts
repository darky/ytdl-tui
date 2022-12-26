import { ns } from 'repl-ns'
import type { State } from 'src/types'

export const durationNS = ns('duration', {
  calcDuration(state: State) {
    const startSec = durationNS().time2Seconds(state.startTime)
    const endSec = durationNS().time2Seconds(state.endTime)
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
})
