import type { PricingConfig } from '@prisma/client';
import { prisma } from './prisma';

export * from './pricing-core';

export const DEFAULT_CONFIG_ID = 'default';

/** Fetch (or lazily create) the single pricing/business config row. */
export async function getConfig(): Promise<PricingConfig> {
  const existing = await prisma.pricingConfig.findUnique({ where: { id: DEFAULT_CONFIG_ID } });
  if (existing) return existing;
  return prisma.pricingConfig.create({ data: { id: DEFAULT_CONFIG_ID } });
}
