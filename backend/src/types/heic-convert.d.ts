declare module 'heic-convert' {
  interface ConvertOptions {
    buffer: ArrayBufferLike;
    format: 'JPEG' | 'PNG';
    quality?: number;
  }

  export default function convert(options: ConvertOptions): Promise<ArrayBuffer>;
}
