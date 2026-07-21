import { getPublicAddOns, getPublicPlans, getServiceRegions } from '@/lib/marketing';
import { displayPrice, perJugPrice } from '@/lib/plan-pricing';
import { PRODUCTION_APP_URL } from '@/lib/env';

export const revalidate = 3600;

/**
 * /llms.txt — a machine-readable business summary for AI search and answer
 * engines (the emerging llms.txt convention). Everything here renders from
 * the same live data as the site, so it can never drift from the real prices
 * or coverage.
 */
export async function GET() {
  const [plans, addOns, regions] = await Promise.all([
    getPublicPlans(),
    getPublicAddOns(),
    getServiceRegions(),
  ]);

  const planLines = plans.map((p) => {
    if (p.customQuote) return `- ${p.name}: from ${displayPrice(p.monthlyPrice)}/month, ${p.jugsPerMonth}+ jugs/month, custom volume, dedicated delivery day, Net-30 invoicing. Contact for quote.`;
    if (!p.isSubscription) return `- ${p.name}: ${displayPrice(p.monthlyPrice)}/jug plus ${displayPrice(addOns.oneTimeDeliveryFee)} delivery fee. No commitment.`;
    return `- ${p.name}: ${displayPrice(p.monthlyPrice)}/month for ${p.jugsPerMonth} five-gallon jugs (${displayPrice(perJugPrice(p.monthlyPrice, p.jugsPerMonth))}/jug), free weekly delivery and jug exchange.${p.badge ? ` (${p.badge})` : ''}`;
  });

  const areaLines = regions.map(
    (r) => `- ${r.region}, ${r.state}: ${r.towns.map((t) => t.town).join(', ')}`
  );

  const body = `# Garden State Water

> Local family-owned 5-gallon spring water delivery service for homes and
> businesses across New Jersey and the New York metro area. Weekly jug
> exchange on a fixed route day, free delivery on all subscription plans,
> no contracts, pause or cancel anytime. New subscriptions get
> ${Math.round(addOns.firstDeliveryDiscountPct)}% off the first delivery.

## Plans & pricing
${planLines.join('\n')}

Add-ons: dispenser rental ${displayPrice(addOns.dispenserRentalPrice)}/month (free on Family and Office plans),
dispenser purchase ${displayPrice(addOns.dispenserPurchasePrice)}, refundable bottle deposit ${displayPrice(addOns.jugDepositPrice)}/jug,
case of 16.9oz bottles ${displayPrice(addOns.bottleCasePrice)}. Annual billing gets ${addOns.annualFreeMonths} month${addOns.annualFreeMonths === 1 ? '' : 's'} free.

## Service areas
${areaLines.join('\n')}

## Key pages
- [Homepage](${PRODUCTION_APP_URL}/): plans, pricing, ZIP checker
- [Start a subscription](${PRODUCTION_APP_URL}/signup)
- [All service areas](${PRODUCTION_APP_URL}/water-delivery): per-town delivery pages
- [Customer portal](${PRODUCTION_APP_URL}/portal)

## How it works
1. Pick a plan by jugs per month.
2. Delivery lands the same day each week with a text reminder the night before.
3. Leave empties out; they are exchanged for full, sealed jugs. No signature needed.
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
