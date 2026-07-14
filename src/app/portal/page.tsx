import { redirect } from 'next/navigation';
import { getPortalCustomer } from '@/lib/portal-auth';
import { PortalLogin } from '@/components/portal/PortalLogin';

export const dynamic = 'force-dynamic';

export default async function PortalEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  // Invite links: /portal?token=XXXX signs the customer in directly.
  if (token) redirect(`/api/portal/auth/invite?token=${encodeURIComponent(token)}`);

  // Already signed in? Straight to their account.
  const customer = await getPortalCustomer();
  if (customer) redirect(`/portal/${customer.portalToken}`);

  return <PortalLogin invalidLink={error === 'invalid-link'} />;
}
