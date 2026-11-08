import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

let clientInstance: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient | null> | null = null;

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (clientInstance) return clientInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    let url = (import.meta as any).env?.VITE_SUPABASE_URL;
    let publishableKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY
      || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

    // If not in Vite env, fetch from server config endpoint
    if (!url || !publishableKey || url.includes('your-project-ref')) {
      try {
        const resp = await fetch('/api/config');
        if (resp.ok) {
          const cfg = await resp.json();
          url = cfg.supabaseUrl;
          publishableKey = cfg.supabasePublishableKey || cfg.supabaseAnonKey;
        }
      } catch (e) {
        console.warn('Could not fetch public Supabase client config:', e);
      }
    }

    if (url && publishableKey && !url.includes('your-project-ref')) {
      clientInstance = createClient(url, publishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      return clientInstance;
    }

    return null;
  })();

  return initPromise;
}

/**
 * Ensures an active session exists. If none exists, creates an anonymous guest session.
 */
export async function ensureGuestOrAuthSession(): Promise<{ user: User | null; session: Session | null; isAnonymous: boolean }> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    return { user: null, session: null, isAnonymous: true };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const isAnon = (session.user as any).is_anonymous ?? Boolean(session.user.app_metadata?.provider === 'anonymous');
      return { user: session.user, session, isAnonymous: isAnon };
    }

    // Attempt anonymous sign-in
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.session) {
      console.warn('Anonymous sign-in unavailable or disabled:', error?.message);
      return { user: null, session: null, isAnonymous: true };
    }

    return { user: data.user, session: data.session, isAnonymous: true };
  } catch (err) {
    console.warn('Session initialization error:', err);
    return { user: null, session: null, isAnonymous: true };
  }
}

/**
 * Trigger Google OAuth sign in or identity linking
 */
export async function signInWithGoogle() {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured. Check SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in .env.');
  }

  const { data: { session } } = await supabase.auth.getSession();

  // If user has an anonymous session, link the Google identity
  if (session?.user && (session.user as any).is_anonymous) {
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      throw error;
    }
  } else {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) throw error;
  }
}

/**
 * Sign out
 */
export async function signOutUser() {
  const supabase = await getSupabaseClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
}

/**
 * Retrieves the current session's access token, or null if unauthenticated.
 */
export async function getAuthToken(): Promise<string | null> {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Authenticated fetch helper: automatically injects Authorization Bearer header.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
}

/**
 * Upload an image buffer/blob to the private crop-images bucket under {user_id}/{crop_cycle_id}/{filename}
 */
export async function uploadPrivateCropImage(
  fileOrBase64: File | string,
  userId: string,
  cropCycleId: string
): Promise<string | null> {
  const supabase = await getSupabaseClient();
  if (!supabase || !userId) return null;

  try {
    let blob: Blob;
    if (typeof fileOrBase64 === 'string') {
      const resp = await fetch(fileOrBase64);
      blob = await resp.blob();
    } else {
      blob = fileOrBase64;
    }

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const filePath = `${userId}/${cropCycleId}/${timestamp}_${randomSuffix}.jpg`;

    const { error } = await supabase.storage
      .from('crop-images')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.warn('Storage upload error:', error);
      return null;
    }

    return filePath;
  } catch (err) {
    console.warn('Failed to upload image to storage:', err);
    return null;
  }
}

/**
 * Get a short-lived signed URL for a private image
 */
export async function getPrivateImageSignedUrl(imageStoragePath: string): Promise<string | null> {
  const supabase = await getSupabaseClient();
  if (!supabase || !imageStoragePath) return null;

  try {
    const { data, error } = await supabase.storage
      .from('crop-images')
      .createSignedUrl(imageStoragePath, 3600); // 1 hour

    if (error || !data?.signedUrl) {
      return null;
    }
    return data.signedUrl;
  } catch {
    return null;
  }
}

