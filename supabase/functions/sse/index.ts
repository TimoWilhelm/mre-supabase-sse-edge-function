import { corsHeaders } from '../_shared/cors.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import type { Handler } from 'https://deno.land/std@0.168.0/http/server.ts';

interface ServerSentEvent<T> {
  id: string;
  event: string;
  data: T;
}

const serializeSSE = <T>(sse: ServerSentEvent<T>) =>
  `id: ${sse.id}\nevent: ${sse.event}\ndata: ${JSON.stringify(sse.data)}\n\n`;

async function writeSSE<T>(writable: WritableStream<Uint8Array>, sse: ServerSentEvent<T>) {
  const encoder = new TextEncoder();
  const writer = writable.getWriter();

  try {
    await writer.ready;
    await writer.write(encoder.encode(serializeSSE(sse)));
  } finally {
    writer.releaseLock();
  }
}

function writeToStream(writable: WritableStream<Uint8Array>, abortSignal: AbortSignal) {
  let i = 0;

  const intervalHandle = self.setInterval(async () => {
    i += 1;
    try {
      console.log('writing to stream', i);

      abortSignal.throwIfAborted(); // https://github.com/denoland/deno/issues/10829

      await writeSSE(writable, {
        id: i.toString(),
        event: 'message',
        data: 'This is a message',
      });
    } catch {
      console.log('aborting stream', i);
      self.clearInterval(intervalHandle);

      try {
        // clean up the stream
        await writable.abort();
      } catch {
        // ignore
      }
    }
  }, 1_000);
}

const handler: Handler = (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();

  writeToStream(writable, req.signal);

  return new Response(readable, {
    status: 200,
    statusText: 'ok',
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
};

serve(handler);
