import { prisma } from '@/lib/prisma';
import { createCustomer } from '@/server/actions/customers';
import { CustomerForm } from '@/components/CustomerForm';
import { PageHeader } from '@/components/ui';

export default async function NewCustomerPage() {
  const zones = await prisma.zone.findMany({ orderBy: { name: 'asc' } });
  return (
    <>
      <PageHeader title="Add customer" subtitle="Under 30 seconds — only name and address are required." />
      <CustomerForm zones={zones} action={createCustomer} />
    </>
  );
}
