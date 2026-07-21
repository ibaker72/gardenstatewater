import type { PublicAddOns, PublicPlan, PublicTown } from './marketing';
import { displayPrice, perJugPrice } from './plan-pricing';

/**
 * Local-SEO content generation for the per-town landing pages.
 *
 * Every fact used here is real data (county, region, ZIPs, neighbor towns,
 * live plan prices) — no invented landmarks or fake local claims. Copy varies
 * deterministically per town so the 40+ pages read as genuinely distinct
 * documents instead of a mail-merged doorway template.
 */

/**
 * County by town slug — verified for the launch list. Owner-added towns that
 * aren't listed simply omit the county from copy (never guessed).
 */
const TOWN_COUNTY: Record<string, string> = {
  // New Jersey
  'paterson-nj': 'Passaic County',
  'clifton-nj': 'Passaic County',
  'wayne-nj': 'Passaic County',
  'ridgewood-nj': 'Bergen County',
  'montclair-nj': 'Essex County',
  'hackensack-nj': 'Bergen County',
  'fort-lee-nj': 'Bergen County',
  'englewood-nj': 'Bergen County',
  'morristown-nj': 'Morris County',
  'madison-nj': 'Morris County',
  'chatham-nj': 'Morris County',
  'short-hills-nj': 'Essex County',
  'millburn-nj': 'Essex County',
  'livingston-nj': 'Essex County',
  'summit-nj': 'Union County',
  'edison-nj': 'Middlesex County',
  'princeton-nj': 'Mercer County',
  'new-brunswick-nj': 'Middlesex County',
  'westfield-nj': 'Union County',
  'cranford-nj': 'Union County',
  'cherry-hill-nj': 'Camden County',
  'moorestown-nj': 'Burlington County',
  'haddonfield-nj': 'Camden County',
  'marlton-nj': 'Burlington County',
  'voorhees-nj': 'Camden County',
  'red-bank-nj': 'Monmouth County',
  'rumson-nj': 'Monmouth County',
  'colts-neck-nj': 'Monmouth County',
  'holmdel-nj': 'Monmouth County',
  // New York
  'manhattan-ny': 'New York County',
  'park-slope-ny': 'Kings County',
  'brooklyn-heights-ny': 'Kings County',
  'williamsburg-ny': 'Kings County',
  'scarsdale-ny': 'Westchester County',
  'rye-ny': 'Westchester County',
  'bronxville-ny': 'Westchester County',
  'white-plains-ny': 'Westchester County',
  'staten-island-ny': 'Richmond County',
};

export function countyForSlug(slug: string): string | null {
  return TOWN_COUNTY[slug] ?? null;
}

/** Small stable hash so each town keeps the same copy variant across builds. */
function slugHash(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  return hash;
}

const STATE_NAMES: Record<string, string> = { NJ: 'New Jersey', NY: 'New York' };

export interface TownContext {
  town: PublicTown & { region: string };
  neighbors: PublicTown[];
  plans: PublicPlan[];
  addOns: PublicAddOns;
}

/**
 * The page's opening paragraphs — one of several genuinely different framings,
 * picked deterministically per town, each built from real data.
 */
export function townIntro({ town, neighbors, plans }: TownContext): string[] {
  const county = countyForSlug(town.slug);
  const stateName = STATE_NAMES[town.state] ?? town.state;
  const hydrate = plans.find((p) => p.key === 'hydrate') ?? plans.find((p) => p.isSubscription);
  const perJug = hydrate ? displayPrice(perJugPrice(hydrate.monthlyPrice, hydrate.jugsPerMonth)) : null;
  const neighborNames = neighbors.slice(0, 3).map((n) => n.town);
  const routeLine =
    neighborNames.length > 0
      ? `Our route also serves ${neighborNames.join(', ')} — dense local stops are how delivery stays free.`
      : `Dense local routes are how delivery stays free.`;

  const variants: string[][] = [
    [
      `Garden State Water delivers 5-gallon spring water to ${town.town} homes and businesses every week — carried to your door, empties exchanged, no signature needed. If you've been hauling jugs from the supermarket exchange rack${county ? ` like most of ${county}` : ''}, this is the version where the water just shows up.`,
      routeLine,
    ],
    [
      `Weekly 5-gallon spring water delivery has arrived in ${town.town}${county ? `, ${county}` : ''}. Pick a plan, leave your empties out on delivery day, and we swap them for full, sealed jugs while you get on with your morning. A text the night before, no contracts, and delivery is always free.`,
      routeLine,
    ],
    [
      `${town.town} households go through more water than anyone wants to carry — and a 5-gallon jug weighs 42 pounds. We're a local family water delivery service covering ${town.town} and the surrounding ${stateName} area with weekly jug exchange${perJug ? ` from ${perJug} per jug delivered` : ''}.`,
      routeLine,
    ],
  ];
  return variants[slugHash(town.slug) % variants.length];
}

export interface TownFaq {
  question: string;
  answer: string;
}

/** Town-specific FAQs — rendered on the page AND emitted as FAQPage schema. */
export function townFaqs({ town, plans, addOns }: TownContext): TownFaq[] {
  const hydrate = plans.find((p) => p.key === 'hydrate') ?? plans.find((p) => p.isSubscription);
  const family = plans.find((p) => p.key === 'family');
  const oneTime = plans.find((p) => !p.isSubscription);
  const zipList = town.zips.join(', ');

  const priceAnswerParts = [
    hydrate
      ? `Most ${town.town} households start with the ${hydrate.name} plan at ${displayPrice(hydrate.monthlyPrice)}/month for ${hydrate.jugsPerMonth} jugs (${displayPrice(perJugPrice(hydrate.monthlyPrice, hydrate.jugsPerMonth))}/jug, free delivery).`
      : null,
    family
      ? `Bigger households choose ${family.name} at ${displayPrice(family.monthlyPrice)}/month for ${family.jugsPerMonth} jugs with a free dispenser rental included.`
      : null,
    oneTime
      ? `Not ready to subscribe? A one-time delivery is ${displayPrice(oneTime.monthlyPrice)}/jug plus a ${displayPrice(addOns.oneTimeDeliveryFee)} delivery fee.`
      : null,
    `New subscriptions get ${Math.round(addOns.firstDeliveryDiscountPct)}% off the first delivery.`,
  ].filter(Boolean);

  return [
    {
      question: `Which parts of ${town.town} do you deliver to?`,
      answer: `We currently serve ${town.town} ZIP code${town.zips.length === 1 ? '' : 's'} ${zipList}. If your ZIP isn't listed, check it on our homepage — out-of-area addresses can join the waitlist and we expand where demand is strongest.`,
    },
    {
      question: `How much does water delivery cost in ${town.town}?`,
      answer: priceAnswerParts.join(' '),
    },
    {
      question: `How does delivery work in ${town.town}?`,
      answer: `Your ${town.town} deliveries land on the same route day each week. We text you the night before, you leave your empty bottles in your usual spot (porch, garage, lobby, or front desk), and we exchange them for full, sealed 5-gallon jugs — no need to be home and no signature required.`,
    },
    {
      question: `Is there a contract for ${town.town} water delivery?`,
      answer: `No. Plans are month-to-month and you can pause, skip a week, or cancel anytime from your customer portal. Annual billing is optional and simply adds ${addOns.annualFreeMonths} free month${addOns.annualFreeMonths === 1 ? '' : 's'}.`,
    },
  ];
}
