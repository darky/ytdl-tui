import * as React from 'react'

import { Form, FormProps } from 'ink-form'
import { atom } from 'nanostores-cjs'
import { ns } from 'repl-ns'
import { useStore } from 'src/useStore'
import type { State } from 'src/types'
import { downloadNS } from 'src/download'

export const formNS = ns('form', {
  Form: () => {
    const url = useStore(formNS().url$)
    const path = useStore(formNS().path$)
    const startTime = useStore(formNS().startTime$)
    const endTime = useStore(formNS().endTime$)
    const resolution = useStore(formNS().resolution$)

    return (
      <Form
        {...formNS().formProps({ url, path, startTime, endTime, resolution })}
        onSubmit={state => {
          downloadNS().onDownload(state as State)
        }}
      />
    )
  },

  formProps: ({ url, path, startTime, endTime, resolution }: State) =>
    ({
      onChange: (state: State) => {
        formNS().url$.set(state.url)
        formNS().path$.set(state.path)
        formNS().startTime$.set(state.startTime)
        formNS().endTime$.set(state.endTime)
        formNS().resolution$.set(state.resolution)
      },
      form: {
        title: 'Please setup form for downloading video from Youtube',
        sections: [
          {
            title: '',
            fields: [
              {
                type: 'string',
                name: 'url',
                label: 'Youtube URL',
                regex: RegExp('^https://.*$'),
                initialValue: url,
              },
              {
                type: 'string',
                name: 'path',
                label: 'File location',
                initialValue: path || `${process.cwd()}/video.mp4`,
              },
              {
                type: 'string',
                name: 'startTime',
                label: 'Start time (optional)',
                regex: RegExp('(^\\d\\d:\\d\\d:\\d\\d$|^$)'),
                initialValue: startTime,
              },
              {
                type: 'string',
                name: 'endTime',
                label: 'End time (optional)',
                regex: RegExp('(^\\d\\d:\\d\\d:\\d\\d$|^$)'),
                initialValue: endTime,
              },
              {
                type: 'select',
                name: 'resolution',
                label: 'Resolution',
                initialValue: resolution ?? 'highest',
                options: [
                  { label: 'highest', value: 'highest' },
                  { label: '720p', value: '720' },
                  { label: '360p', value: '360' },
                ],
              },
            ],
          },
        ],
      },
    } as FormProps),

  url$: atom(''),

  path$: atom(''),

  startTime$: atom(''),

  endTime$: atom(''),

  resolution$: atom<State['resolution']>('highest'),
})
