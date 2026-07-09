import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { updateCustomer } from '@/server/actions/customers';
import { CustomerForm } from '@/components/CustomerForm';
import { PageHeader } from '@/components/ui';

export default async function EditCustomerPage({ params }: { params: { id: string } }) {
  const [customer, zones] = await Promise.all([
    prisma.customer.findUnique({ where: { id: params.id } }),
    prisma.zone.findMany({ orderBy: { name: 'asc' } }),
  ]);
  if (!customer) notFound();

  const update = updateCustomer.bind(null, customer.id);
  return (
    <>
      <PageHeader title={`Edit ${customer.name}`} />
      <CustomerForm customer={customer} zones={zones} action={update} />
    </>
  );
}
