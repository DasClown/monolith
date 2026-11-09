/// <reference lib="deno.ns" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type PaddleEvent = {
  event_type?: string;
  data?: {
    id?: string;
    custom_data?: { user_id?: string; product_id?: string };
    items?: Array<{ price?: { id?: string } }>;
    status?: string;
  };
};

const encoder = new TextEncoder();

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function parseSignature(header: string): { ts: string; h1: string } | null {
  const values = new Map<string, string>();
  for (const part of header.split(';')) {
    const [key, value] = part.split('=');
    if (key && value) values.set(key.trim(), value.trim());
  }
  const ts = values.get('ts');
  const h1 = values.get('h1');
  return ts && h1 ? { ts, h1 } : null;
}

const PRODUCT_BY_PRICE: Record<string, string> = Object.fromEntries(
  [
    [Deno.env.get('PADDLE_PRICE_SUPPORTER') ?? '', 'supporter'],
    [Deno.env.get('PADDLE_PRICE_COIN_DOUBLER') ?? '', 'coin_doubler'],
    [Deno.env.get('PADDLE_PRICE_BATTLE_PASS') ?? '', 'battle_pass'],
  ].filter(([priceId]) => Boolean(priceId)),
);

const FLAG_BY_PRODUCT: Record<string, string> = {
  supporter: 'supporter',
  coin_doubler: 'coin_doubler',
  battle_pass: 'battle_pass',
  ad_free: 'ad_free',
};

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const secret = Deno.env.get('PADDLE_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret || !supabaseUrl || !serviceRole) {
    return new Response('Server is not configured', { status: 500 });
  }

  const signatureHeader = request.headers.get('Paddle-Signature') ?? '';
  const signature = parseSignature(signatureHeader);
  if (!signature) return new Response('Missing signature', { status: 401 });

  const rawBody = await request.text();
  const timestamp = Number(signature.ts);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) {
    return new Response('Expired signature', { status: 401 });
  }
  const expected = await hmacHex(secret, `${signature.ts}:${rawBody}`);
  if (!safeEqual(signature.h1, expected)) {
    return new Response('Invalid signature', { status: 401 });
  }

  let event: PaddleEvent;
  try {
    event = JSON.parse(rawBody) as PaddleEvent;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (event.event_type !== 'transaction.completed') {
    return Response.json({ ok: true, ignored: event.event_type ?? 'unknown' });
  }

  const transactionId = event.data?.id;
  const userId = event.data?.custom_data?.user_id;
  if (!transactionId || !userId) {
    return new Response('Missing transaction or user', { status: 400 });
  }

  const priceId = event.data?.items?.[0]?.price?.id ?? '';
  const productId = PRODUCT_BY_PRICE[priceId] ?? '';
  const flag = FLAG_BY_PRODUCT[productId];
  if (!flag) {
    return Response.json({ ok: true, ignored: 'unknown_product', productId });
  }

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing } = await supabase
    .from('purchases')
    .select('transaction_id')
    .eq('transaction_id', transactionId)
    .maybeSingle();
  if (existing) return Response.json({ ok: true, idempotent: true });

  const { error: purchaseError } = await supabase.from('purchases').insert({
    transaction_id: transactionId,
    user_id: userId,
    product_id: productId,
    provider: 'paddle',
    status: event.data?.status ?? 'completed',
  });
  if (purchaseError) return new Response(purchaseError.message, { status: 500 });

  const { error: entitlementError } = await supabase.from('entitlements').upsert(
    {
      user_id: userId,
      [flag]: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (entitlementError) return new Response(entitlementError.message, { status: 500 });

  return Response.json({ ok: true, productId });
});
