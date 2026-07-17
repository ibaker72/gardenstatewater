'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

// Owner-managed website content (behind the admin auth wall).

export async function addTestimonial(form: FormData) {
  const name = (form.get('name') as string | null)?.trim();
  const quote = (form.get('quote') as string | null)?.trim();
  if (!name || !quote) return;
  await prisma.testimonial.create({ data: { name, quote } });
  revalidatePath('/settings');
  revalidatePath('/');
}

export async function deleteTestimonial(id: string) {
  await prisma.testimonial.delete({ where: { id } });
  revalidatePath('/settings');
  revalidatePath('/');
}
