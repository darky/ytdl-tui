declare module 'ytdl-core-muxer' {
  import { Readable } from 'stream'
  export default function (url: string): Readable
}
