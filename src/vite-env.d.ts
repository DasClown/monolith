/// <reference types="vite/client" />


interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_PADDLE_CLIENT_TOKEN?: string;
  readonly VITE_PADDLE_ENV?: 'sandbox' | 'production';
  readonly VITE_PADDLE_PRICE_SUPPORTER?: string;
  readonly VITE_PADDLE_PRICE_COIN_DOUBLER?: string;
  readonly VITE_PADDLE_PRICE_BATTLE_PASS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
