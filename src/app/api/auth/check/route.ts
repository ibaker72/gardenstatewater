import { NextResponse } from 'next/server';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Login diagnostics for the caller's own session. Never reveals the owner
 * email itself — only whether the current session matches it.
 */
export async function GET() {
  const configured = supabaseConfigured();
  const ownerEmailSet = Boolean((process.env.OWNER_EMAIL ?? '').trim());

  if (!configured) {
    // Local dev mode — middleware lets everything through.
    return NextResponse.json({ configured, ownerEmailSet, authenticated: false, email: null, isOwner: true });
  }

  const supabase = createClient()!;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? null;
  const isOwner =
    Boolean(email) &&
    ownerEmailSet &&
    email!.trim().toLowerCase() === process.env.OWNER_EMAIL!.trim().toLowerCase();

  return NextResponse.json({ configured, ownerEmailSet, authenticated: Boolean(user), email, isOwner });
}
