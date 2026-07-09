import type { PricingConfig } from '@prisma/client';

export type Plan = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'ON_DEMAND';

export function planDiscountPct(config: PricingConfig, plan: Plan): number {
  switch (plan) {
    case 'WEEKLY':
      return config.weeklyDiscountPct;
    case 'BIWEEKLY':
      return config.biweeklyDiscountPct;
    case 'MONTHLY':
      return config.monthlyDiscountPct;
    default:
      return 0;
  }
}

export interface QuoteInput {
  refillJugs: number;
  newJugs?: number;
  bottleCases?: number;
  dispenserMonths?: number;
  plan: Plan;
  zoneDeliveryFee?: number | null; // null/undefined → use flat fee
}

export interface QuoteLine {
  productType: 'JUG_REFILL' | 'JUG_PURCHASE' | 'BOTTLE_CASE' | 'DISPENSER_RENTAL';
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Quote {
  lines: QuoteLine[];
  subtotal: number;
  discount: number; // subscription % discount on refills
  bulkFreeJugs: number; // jugs given free from the bulk deal
  deliveryFee: number;
  total: number;
}

/**
 * The pricing engine. Applies, in order:
 *  1. base prices from config
 *  2. bulk deal on refills (buy N get M free — free jugs come off the bill)
 *  3. subscription plan % discount on refill jugs
 *  4. zone delivery fee (or flat fee when the customer has no zone)
 */
export function quoteOrder(config: PricingConfig, input: QuoteInput): Quote {
  const lines: QuoteLine[] = [];
  const refills = Math.max(0, Math.floor(input.refillJugs));

  let bulkFreeJugs = 0;
  if (config.bulkBuyQty > 0 && config.bulkFreeQty > 0 && refills >= config.bulkBuyQty) {
    const dealSize = config.bulkBuyQty + config.bulkFreeQty;
    bulkFreeJugs = Math.floor(refills / dealSize) * config.bulkFreeQty;
    // A partial group past a full "buy" block also earns the free jugs:
    const remainder = refills % dealSize;
    if (remainder >= config.bulkBuyQty) bulkFreeJugs += remainder - config.bulkBuyQty;
    bulkFreeJugs = Math.min(bulkFreeJugs, Math.floor(refills / dealSize + 1) * config.bulkFreeQty);
  }

  const billedRefills = refills - bulkFreeJugs;
  if (refills > 0) {
    lines.push({
      productType: 'JUG_REFILL',
      description:
        bulkFreeJugs > 0
          ? `5-gal refill ×${refills} (${bulkFreeJugs} free — bulk deal)`
          : `5-gal refill ×${refills}`,
      quantity: refills,
      unitPrice: config.jugRefillPrice,
      lineTotal: round2(billedRefills * config.jugRefillPrice),
    });
  }
  if (input.newJugs && input.newJugs > 0) {
    lines.push({
      productType: 'JUG_PURCHASE',
      description: `New 5-gal jug ×${input.newJugs}`,
      quantity: input.newJugs,
      unitPrice: config.jugPurchasePrice,
      lineTotal: round2(input.newJugs * config.jugPurchasePrice),
    });
  }
  if (input.bottleCases && input.bottleCases > 0) {
    lines.push({
      productType: 'BOTTLE_CASE',
      description: `16oz bottle case ×${input.bottleCases}`,
      quantity: input.bottleCases,
      unitPrice: config.bottleCasePrice,
      lineTotal: round2(input.bottleCases * config.bottleCasePrice),
    });
  }
  if (input.dispenserMonths && input.dispenserMonths > 0) {
    lines.push({
      productType: 'DISPENSER_RENTAL',
      description: `Dispenser rental ×${input.dispenserMonths} mo`,
      quantity: input.dispenserMonths,
      unitPrice: config.dispenserRentalPrice,
      lineTotal: round2(input.dispenserMonths * config.dispenserRentalPrice),
    });
  }

  const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const refillLine = lines.find((l) => l.productType === 'JUG_REFILL');
  const discountPct = planDiscountPct(config, input.plan);
  const discount = refillLine ? round2((refillLine.lineTotal * discountPct) / 100) : 0;
  const deliveryFee =
    input.zoneDeliveryFee === null || input.zoneDeliveryFee === undefined
      ? config.flatDeliveryFee
      : input.zoneDeliveryFee;
  const total = round2(subtotal - discount + deliveryFee);

  return { lines, subtotal, discount, bulkFreeJugs, deliveryFee, total };
}

// ── Profit calculator ────────────────────────────────────────────────────────

export interface ProfitInput {
  costPerGallon: number;
  jugsPerWeek: number;
  avgRevenuePerJug: number; // post-discount realized price
  milesPerWeek: number;
  gasCostPerMile: number;
  hoursPerWeek: number;
  laborCostPerHour: number;
  fixedWeeklyCosts: number; // insurance, phone, etc.
  weeklyProfitGoal: number;
}

export interface ProfitOutput {
  revenuePerWeek: number;
  cogsPerWeek: number; // water cost (5 gal per jug)
  fuelPerWeek: number;
  laborPerWeek: number;
  grossProfit: number;
  netProfit: number;
  marginPct: number;
  profitPerJug: number;
  breakEvenJugs: number;
  jugsNeededForGoal: number;
  customersNeededForGoal: number; // assuming current jugs/customer ratio of 2/wk
}

export function profitCalc(i: ProfitInput): ProfitOutput {
  const GALLONS_PER_JUG = 5;
  const revenuePerWeek = i.jugsPerWeek * i.avgRevenuePerJug;
  const cogsPerWeek = i.jugsPerWeek * GALLONS_PER_JUG * i.costPerGallon;
  const fuelPerWeek = i.milesPerWeek * i.gasCostPerMile;
  const laborPerWeek = i.hoursPerWeek * i.laborCostPerHour;
  const grossProfit = revenuePerWeek - cogsPerWeek;
  const netProfit = grossProfit - fuelPerWeek - laborPerWeek - i.fixedWeeklyCosts;
  const marginPct = revenuePerWeek > 0 ? (netProfit / revenuePerWeek) * 100 : 0;

  const variableCostPerJug = GALLONS_PER_JUG * i.costPerGallon;
  const contributionPerJug = i.avgRevenuePerJug - variableCostPerJug;
  const weeklyOverhead = fuelPerWeek + laborPerWeek + i.fixedWeeklyCosts;
  const breakEvenJugs = contributionPerJug > 0 ? Math.ceil(weeklyOverhead / contributionPerJug) : 0;
  const jugsNeededForGoal =
    contributionPerJug > 0 ? Math.ceil((weeklyOverhead + i.weeklyProfitGoal) / contributionPerJug) : 0;
  const customersNeededForGoal = Math.ceil(jugsNeededForGoal / 2);

  return {
    revenuePerWeek: round2(revenuePerWeek),
    cogsPerWeek: round2(cogsPerWeek),
    fuelPerWeek: round2(fuelPerWeek),
    laborPerWeek: round2(laborPerWeek),
    grossProfit: round2(grossProfit),
    netProfit: round2(netProfit),
    marginPct: round2(marginPct),
    profitPerJug: round2(contributionPerJug),
    breakEvenJugs,
    jugsNeededForGoal,
    customersNeededForGoal,
  };
}

/** Suggested price to hit a target margin over the landed cost of a jug. */
export function suggestedPrice(costPerGallon: number, targetMarginPct: number, perJugOverhead = 0.75) {
  const cost = costPerGallon * 5 + perJugOverhead;
  if (targetMarginPct >= 100) return cost * 2;
  return round2(cost / (1 - targetMarginPct / 100));
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}
