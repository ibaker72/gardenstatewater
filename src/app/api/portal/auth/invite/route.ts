import { NextRequest, NextResponse } from 'next/server';
import { createPortalSession, customerByPortalToken } from '@/lib/portal-auth';

export const dynamic = 'force-dynamic';

/**
 * Invite links (gardenstatewater.com/portal?token=XXXX) land here: the token
 * is the customer's long-lived portal token, so opening the link signs them
 * in for 30 days and drops them on their account page.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const customer = token ? await customerByPortalToken(token) : null;
  if (!customer) {
    return NextResponse.redirect(new URL('/portal?error=invalid-link', req.nextUrl));
  }
  await createPortalSession(customer.id);
  return NextResponse.redirect(new URL(`/portal/${customer.portalToken}`, req.nextUrl));
}
