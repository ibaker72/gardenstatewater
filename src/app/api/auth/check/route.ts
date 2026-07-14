import { NextResponse } from 'next/server';
import { getOwnerEmail, getSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Login diagnostics for the caller's own session. Never reveals the owner
 * email itself — only whether the current session matches it.
 */
export async function GET() {
  const env = getSupabaseEnv();
  const ownerEmail = getOwnerEmail();
  const ownerEmailSet = Boolean(ownerEmail);

  if (env.status === 'unconfigured') {
    // Local dev mode — the proxy lets everything through.
    return NextResponse.json({
      configured: false,
      ownerEmailSet,
      authenticated: false,
      email: null,
      isOwner: true,
    });
  }

  if (env.status === 'invalid') {
    return NextResponse.json({
      configured: true,
      configProblem: env.problem,
      ownerEmailSet,
      authenticated: false,
      email: null,
      isOwner: false,
    });
  }

  const supabase = (await createClient())!;
  let email: string | null = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
  } catch {
    email = null;
  }
  const isOwner = Boolean(email && ownerEmailSet && email.trim().toLowerCase() === ownerEmail);

  return NextResponse.json({
    configured: true,
    ownerEmailSet,
    authenticated: Boolean(email),
    email,
    isOwner,
  });
}
