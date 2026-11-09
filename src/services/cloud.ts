import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { Entitlements } from '../core/types';
import type { SaveData } from '../game/save';
import { parseSaveText } from '../game/save';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

export const isCloudConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (!isCloudConfigured) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

function redirectUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`;
}

/**
 * Create the Supabase client at app startup. This is important for magic-link
 * redirects: detectSessionInUrl only runs once the client exists.
 */
export function bootstrapCloud(): void {
  if (!isCloudConfigured) return;
  void getCloudSession().catch(() => undefined);
}

export async function getCloudSession(): Promise<Session | null> {
  const supabase = getClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}

export async function getCloudUser(): Promise<User | null> {
  return (await getCloudSession())?.user ?? null;
}

export function onCloudAuthChange(callback: (session: Session | null) => void): () => void {
  const supabase = getClient();
  if (!supabase) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function sendMagicLink(email: string): Promise<{ ok: boolean; message: string }> {
  const supabase = getClient();
  if (!supabase) return { ok: false, message: 'Cloud login is not configured.' };
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectUrl() },
  });
  return error
    ? { ok: false, message: error.message }
    : { ok: true, message: 'MAGIC LINK SENT · CHECK YOUR INBOX' };
}

export async function signInWithGoogle(): Promise<{ ok: boolean; message: string }> {
  const supabase = getClient();
  if (!supabase) return { ok: false, message: 'Cloud login is not configured.' };
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUrl() },
  });
  return error
    ? { ok: false, message: error.message }
    : { ok: true, message: 'REDIRECTING TO GOOGLE' };
}

export async function signOutCloud(): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function upsertCloudProfile(name: string, tag: string): Promise<void> {
  const supabase = getClient();
  const user = await getCloudUser();
  if (!supabase || !user) return;
  await supabase.from('profiles').upsert(
    {
      id: user.id,
      display_name: name,
      player_tag: tag,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
}

export async function loadCloudSave(): Promise<SaveData | null> {
  const supabase = getClient();
  const user = await getCloudUser();
  if (!supabase || !user) return null;
  const { data, error } = await supabase
    .from('saves')
    .select('data')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error || !data?.data) return null;
  return parseSaveText(JSON.stringify(data.data));
}

export async function saveCloudSave(save: SaveData): Promise<boolean> {
  const supabase = getClient();
  const user = await getCloudUser();
  if (!supabase || !user) return false;
  const { error } = await supabase.from('saves').upsert(
    {
      user_id: user.id,
      data: save,
      version: save.version,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  return !error;
}

let cloudSaveTimer: number | null = null;
let pendingCloudSave: SaveData | null = null;
let autoSyncEnabled = false;

/** Auto-upload is opt-in after the first explicit sync, so a fresh device
 * cannot overwrite an existing cloud save just by signing in. */
export function enableCloudAutoSync(): void {
  autoSyncEnabled = true;
}

export function disableCloudAutoSync(): void {
  autoSyncEnabled = false;
}

/** Debounced cloud upload. No-op while signed out or before the first sync. */
export function scheduleCloudSave(save: SaveData): void {
  if (!isCloudConfigured || !autoSyncEnabled) return;
  pendingCloudSave = save;
  if (cloudSaveTimer !== null) window.clearTimeout(cloudSaveTimer);
  cloudSaveTimer = window.setTimeout(() => {
    cloudSaveTimer = null;
    const next = pendingCloudSave;
    pendingCloudSave = null;
    if (next) void saveCloudSave(next).catch(() => undefined);
  }, 5000);
}

export async function loadCloudEntitlements(): Promise<Partial<Entitlements> | null> {
  const supabase = getClient();
  const user = await getCloudUser();
  if (!supabase || !user) return null;
  const { data, error } = await supabase
    .from('entitlements')
    .select('coin_doubler, ad_free, battle_pass, starter_pack, supporter')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    coinDoubler: Boolean(data.coin_doubler),
    adFree: Boolean(data.ad_free),
    battlePass: Boolean(data.battle_pass),
    starterPack: Boolean(data.starter_pack),
    supporter: Boolean(data.supporter),
  };
}
