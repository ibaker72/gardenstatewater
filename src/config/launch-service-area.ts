/**
 * Launch-time serviceable towns for the NY–NJ metro rollout.
 *
 * This is only the STARTING dataset: it seeds the `service_zips` table (dev
 * seed + production migration insert-if-absent), and after that the database
 * is the single source of truth — the owner adds/removes ZIPs from
 * Settings → Website without touching code.
 *
 * ZIPs are each town's primary residential codes; missing ones can be added
 * from the admin at any time.
 */

export interface LaunchTown {
  town: string;
  state: 'NJ' | 'NY';
  region: string;
  zips: string[];
}

/** "Short Hills" + "NJ" → "short-hills-nj" (the /water-delivery/[slug] page). */
export function townSlug(town: string, state: string): string {
  return `${town.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${state.toLowerCase()}`;
}

export const launchTowns: LaunchTown[] = [
  // ── New Jersey ────────────────────────────────────────────────────────────
  { town: 'Paterson', state: 'NJ', region: 'North Jersey', zips: ['07501', '07502', '07503', '07504', '07505', '07522', '07524'] },
  { town: 'Clifton', state: 'NJ', region: 'North Jersey', zips: ['07011', '07012', '07013', '07014'] },
  { town: 'Wayne', state: 'NJ', region: 'North Jersey', zips: ['07470'] },
  { town: 'Ridgewood', state: 'NJ', region: 'North Jersey', zips: ['07450', '07451'] },
  { town: 'Montclair', state: 'NJ', region: 'North Jersey', zips: ['07042', '07043'] },
  { town: 'Hackensack', state: 'NJ', region: 'North Jersey', zips: ['07601'] },
  { town: 'Fort Lee', state: 'NJ', region: 'North Jersey', zips: ['07024'] },
  { town: 'Englewood', state: 'NJ', region: 'North Jersey', zips: ['07631'] },

  { town: 'Morristown', state: 'NJ', region: 'Morris & Essex', zips: ['07960'] },
  { town: 'Madison', state: 'NJ', region: 'Morris & Essex', zips: ['07940'] },
  { town: 'Chatham', state: 'NJ', region: 'Morris & Essex', zips: ['07928'] },
  { town: 'Short Hills', state: 'NJ', region: 'Morris & Essex', zips: ['07078'] },
  { town: 'Millburn', state: 'NJ', region: 'Morris & Essex', zips: ['07041'] },
  { town: 'Livingston', state: 'NJ', region: 'Morris & Essex', zips: ['07039'] },
  { town: 'Summit', state: 'NJ', region: 'Morris & Essex', zips: ['07901'] },

  { town: 'Edison', state: 'NJ', region: 'Central Jersey', zips: ['08817', '08820', '08837'] },
  { town: 'Princeton', state: 'NJ', region: 'Central Jersey', zips: ['08540', '08542'] },
  { town: 'New Brunswick', state: 'NJ', region: 'Central Jersey', zips: ['08901'] },
  { town: 'Westfield', state: 'NJ', region: 'Central Jersey', zips: ['07090'] },
  { town: 'Cranford', state: 'NJ', region: 'Central Jersey', zips: ['07016'] },

  { town: 'Cherry Hill', state: 'NJ', region: 'South Jersey', zips: ['08002', '08003', '08034'] },
  { town: 'Moorestown', state: 'NJ', region: 'South Jersey', zips: ['08057'] },
  { town: 'Haddonfield', state: 'NJ', region: 'South Jersey', zips: ['08033'] },
  { town: 'Marlton', state: 'NJ', region: 'South Jersey', zips: ['08053'] },
  { town: 'Voorhees', state: 'NJ', region: 'South Jersey', zips: ['08043'] },

  { town: 'Red Bank', state: 'NJ', region: 'Jersey Shore', zips: ['07701'] },
  { town: 'Rumson', state: 'NJ', region: 'Jersey Shore', zips: ['07760'] },
  { town: 'Colts Neck', state: 'NJ', region: 'Jersey Shore', zips: ['07722'] },
  { town: 'Holmdel', state: 'NJ', region: 'Jersey Shore', zips: ['07733'] },

  // ── New York ──────────────────────────────────────────────────────────────
  {
    town: 'Manhattan',
    state: 'NY',
    region: 'Manhattan (below 96th St)',
    zips: [
      '10001', '10002', '10003', '10004', '10005', '10006', '10007', '10009',
      '10010', '10011', '10012', '10013', '10014', '10016', '10017', '10018',
      '10019', '10021', '10022', '10023', '10024', '10025', '10028', '10036',
      '10038', '10065', '10075', '10128',
    ],
  },
  { town: 'Park Slope', state: 'NY', region: 'Brooklyn', zips: ['11215', '11217'] },
  { town: 'Brooklyn Heights', state: 'NY', region: 'Brooklyn', zips: ['11201'] },
  { town: 'Williamsburg', state: 'NY', region: 'Brooklyn', zips: ['11211', '11249'] },

  { town: 'Scarsdale', state: 'NY', region: 'Westchester', zips: ['10583'] },
  { town: 'Rye', state: 'NY', region: 'Westchester', zips: ['10580'] },
  { town: 'Bronxville', state: 'NY', region: 'Westchester', zips: ['10708'] },
  { town: 'White Plains', state: 'NY', region: 'Westchester', zips: ['10601', '10605'] },

  {
    town: 'Staten Island',
    state: 'NY',
    region: 'Staten Island',
    zips: ['10301', '10302', '10303', '10304', '10305', '10306', '10308', '10310', '10312', '10314'],
  },
];

/** Flat rows ready for `service_zips` inserts. */
export function launchServiceZipRows() {
  return launchTowns.flatMap((t) =>
    t.zips.map((zip) => ({
      zip,
      town: t.town,
      state: t.state,
      region: t.region,
      slug: townSlug(t.town, t.state),
    }))
  );
}

/** The launch pricing tiers — seeds `site_plans`; DB rows win afterwards. */
export const launchPlans = [
  {
    key: 'one_time',
    name: 'One-Time Delivery',
    tagline: 'No commitment — good for trying us out.',
    monthlyPrice: 11.99,
    priceUnit: 'jug',
    jugsPerMonth: 1,
    badge: null as string | null,
    isSubscription: false,
    customQuote: false,
    sortOrder: 1,
    features: ['No commitment', '$4.99 delivery fee', 'Same 5-gallon spring water', 'Order again whenever you like'],
  },
  {
    key: 'hydrate',
    name: 'Hydrate',
    tagline: 'The essentials for most households.',
    monthlyPrice: 39,
    priceUnit: 'month',
    jugsPerMonth: 4,
    badge: 'Most Popular',
    isSubscription: true,
    customQuote: false,
    sortOrder: 2,
    features: ['4 jugs/month — weekly delivery', 'FREE delivery', 'Free jug exchange', 'Works out to $9.75/jug', 'Pause or cancel anytime'],
  },
  {
    key: 'family',
    name: 'Family',
    tagline: 'Bigger households, home gyms, heavy hydrators.',
    monthlyPrice: 69,
    priceUnit: 'month',
    jugsPerMonth: 8,
    badge: null as string | null,
    isSubscription: true,
    customQuote: false,
    sortOrder: 3,
    features: ['8 jugs/month — weekly delivery', 'FREE delivery', 'Free dispenser rental included ($7/mo value)', 'Priority delivery windows', 'Works out to $8.63/jug'],
  },
  {
    key: 'office',
    name: 'Office & Commercial',
    tagline: 'Offices, gyms, salons, and shops.',
    monthlyPrice: 99,
    priceUnit: 'month',
    jugsPerMonth: 12,
    badge: null as string | null,
    isSubscription: true,
    customQuote: true,
    sortOrder: 4,
    features: ['12+ jugs/month, custom volume', 'Dedicated delivery day', 'Net-30 invoicing available', 'Free dispenser + cup dispenser', 'Contact us for a custom quote'],
  },
] as const;

/** The launch offers — seeds `deals`; owner edits them from Settings → Website. */
export const launchDeals = [
  {
    slot: 'banner',
    title: 'Summer special: first delivery 50% off every new subscription.',
    description: null as string | null,
    badge: null as string | null,
    sortOrder: 0,
  },
  {
    slot: 'offer',
    title: 'First delivery 50% off',
    description: 'Start any subscription and your first delivery is half price — applied automatically at checkout.',
    badge: 'New customers',
    sortOrder: 1,
  },
  {
    slot: 'offer',
    title: 'Refer a neighbor, both get a free jug',
    description: 'Share your referral code from the customer portal. When a neighbor signs up with it, you each get a free jug credit on your next delivery.',
    badge: 'Everyone',
    sortOrder: 2,
  },
  {
    slot: 'offer',
    title: '3 months free dispenser rental',
    description: 'Sign up for the Family plan with annual billing and we waive the dispenser rental for your first 3 months.',
    badge: 'Family annual',
    sortOrder: 3,
  },
] as const;
