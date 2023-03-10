import { corsHeaders } from '../_shared/cors.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { text } = await req.json();
  const data = {
    text,
  };

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
