import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseSecretKey &&
  !supabaseUrl.includes('your-project-ref') &&
  !supabaseSecretKey.includes('your-supabase-secret-key') &&
  !supabaseSecretKey.includes('your-supabase-service-role-key')
);

export const supabaseAdmin: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * Extracts and verifies the caller's JWT token from the Authorization header.
 * Returns the Supabase User or null.
 */
export async function verifyUserToken(authHeader?: string) {
  if (!supabaseAdmin || !authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      return null;
    }
    return data.user;
  } catch (err) {
    console.warn('Supabase token verification error:', err);
    return null;
  }
}

/**
 * Creates a short-lived signed URL (60 minutes) for viewing private images in crop-images bucket.
 */
export async function getSignedImageUrl(imageStoragePath: string, expiresInSeconds: number = 3600): Promise<string | null> {
  if (!supabaseAdmin || !imageStoragePath) return null;
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('crop-images')
      .createSignedUrl(imageStoragePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn('Failed to create signed URL:', error);
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    console.warn('Signed URL exception:', err);
    return null;
  }
}

