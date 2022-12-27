// TODO temporary old useStore for React 17 support, which used by ink
// https://github.com/nanostores/react/blob/cb48a410acc21018a03c2981bb9a8498efbf1d15/index.js

import { listenKeys, WritableAtom } from 'nanostores-cjs'
import React from 'react'

export function useStore<T>(store: WritableAtom<T>, opts: { keys?: string[] } = {}): T {
  let [, forceRender] = React.useState({})

  React.useEffect(() => {
    let rerender = () => {
      forceRender({})
    }
    if (opts.keys) {
      return listenKeys(store as any, opts.keys, rerender)
    } else {
      return store.listen(rerender)
    }
  }, [store, '' + opts.keys])

  return store.get()
}
