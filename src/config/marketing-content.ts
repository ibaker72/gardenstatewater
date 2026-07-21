/**
 * All landing-page copy in one typed place, so wording changes never require
 * touching component code.
 *
 * Positioning: premium but neighborly. We are NOT the cheap option — the
 * supermarket sells $6.99 exchange jugs you haul yourself; we are the "never
 * think about water again" service for busy NJ + NY households. Local family
 * business, not corporate.
 */

export const hero = {
  eyebrow: 'Spring water delivery · New Jersey & New York',
  headline: 'Pure water, delivered to your door. Never haul a jug again.',
  /**
   * Alternate headlines for the owner to A/B swap in (just replace
   * `headline` above):
   *  1. 'Your water guy, on schedule. Heavy lifting included.'
   *  2. 'The last time you carry a 42-lb jug is the day before we start.'
   */
  subhead:
    '5-gallon spring water delivery across New Jersey & New York. Subscribe and save — first delivery 50% off.',
  primaryCta: 'Start My Subscription',
  secondaryCta: 'See Plans & Pricing',
  trustStrip: [
    'Local family-owned',
    'Free dispenser rental on annual plans',
    'No contracts, cancel anytime',
  ],
} as const;

export interface ProcessStep {
  title: string;
  copy: string;
}

export const howItWorks: { heading: string; supporting: string; steps: ProcessStep[] } = {
  heading: 'Set it once. Sip forever.',
  supporting: 'Three steps, and the last two are ours.',
  steps: [
    {
      title: 'Pick your plan',
      copy: 'Choose how many jugs your household goes through in a month. Not sure? Start with Hydrate — you can change or pause anytime.',
    },
    {
      title: 'We deliver on your day',
      copy: 'Same delivery day every week, with a text reminder the night before. You don’t need to be home — we follow your drop-off instructions.',
    },
    {
      title: 'Swap empties, sip fresh',
      copy: 'Leave your empties out and we exchange them for full, sealed jugs. No signature, no lifting, no thinking about water again.',
    },
  ],
};

export const comparison = {
  eyebrow: 'Why us',
  heading: 'The supermarket jug is $6.99. Here’s what it actually costs.',
  supporting:
    'Exchange racks are fine — if you enjoy wrestling 42-pound jugs into a trunk every week. We built the version where water simply appears.',
  theirLabel: 'Supermarket exchange',
  oursLabel: 'Garden State Water',
  rows: [
    { label: 'Price per jug', theirs: '$6.99 + your time & gas', ours: 'from $8.63, delivered' },
    { label: 'Hauling 42-lb jugs', theirs: 'You', ours: 'Us' },
    { label: 'Remembering to go', theirs: 'You', ours: 'Automatic — same day every week' },
    { label: 'Delivery', theirs: 'None', ours: 'Free on all plans' },
    { label: 'Dispenser', theirs: 'Buy your own', ours: 'Included or rented from us' },
    { label: 'Support', theirs: 'A 1-800 number', ours: 'Text your delivery guy directly' },
  ],
} as const;

export const pricingCopy = {
  eyebrow: 'Plans & pricing',
  heading: 'Simple plans. Free delivery. No contracts.',
  supporting:
    'Every subscription includes free weekly delivery and jug exchange. Pause, change, or cancel anytime — no fees, no fine print.',
  annualNote: 'Pay yearly and get 1 month free.',
  addOnsHeading: 'Add-ons & extras',
  firstDeliveryOffer: 'First delivery 50% off every new subscription — applied automatically at checkout.',
} as const;

export const serviceAreaCopy = {
  eyebrow: 'Service area',
  heading: 'Delivering across the NY–NJ metro.',
  supporting:
    'From the Jersey Shore to Westchester, our routes cover the neighborhoods below — and we add new towns based on the waitlist.',
  checkerHeading: 'Do we deliver to you?',
  checkerSupporting: 'Enter your ZIP to check availability.',
  waitlistHeading: 'Join the waitlist',
  waitlistSupporting:
    'We open new routes where the waitlist is strongest — leave your number and we’ll text you when we arrive.',
} as const;

export const dealsCopy = {
  eyebrow: 'Deals & offers',
  heading: 'Good water. Better welcome.',
  supporting: 'Current offers for new and existing customers.',
} as const;

export const testimonialsCopy = {
  eyebrow: 'Neighbors',
  heading: 'Word travels fast on a delivery route.',
  exampleNote:
    'Example quotes shown for illustration — real customer reviews are added by the owner and replace these.',
} as const;

export interface FaqItem {
  question: string;
  answer: string;
}

export const faqs: FaqItem[] = [
  {
    question: 'Where does the water come from?',
    answer:
      'We deliver natural spring water, bottled and sealed in sanitized 5-gallon jugs by our licensed regional supplier. Every jug arrives capped and tamper-sealed, and we sanitize bottles between every exchange.',
  },
  {
    question: 'What if I’m not home on delivery day?',
    answer:
      'No problem — most of our deliveries happen while people are out. Leave your empties in your usual spot (porch, garage, side door, front desk) and we swap them for full jugs. No signature needed, and we text you a reminder the night before plus a confirmation when we’ve been by.',
  },
  {
    question: 'Can I skip a week or pause my subscription?',
    answer:
      'Yes, anytime. Skip a delivery, pause for a vacation, or change your jug count from your customer portal — as long as it’s before 8pm the night before your delivery day, it takes effect immediately. Paused months aren’t billed.',
  },
  {
    question: 'Is there a contract?',
    answer:
      'No contracts, ever. Plans are month-to-month and you can cancel anytime from your portal or by texting us. Annual plans are simply pre-paid for the discount (1 month free) — if you cancel early, we refund the unused months at the monthly rate.',
  },
  {
    question: 'What areas do you serve?',
    answer:
      'Most of the NY–NJ metro: North Jersey, Morris & Essex, Central Jersey, South Jersey, and the Jersey Shore, plus Manhattan below 96th St, brownstone Brooklyn, Westchester, and Staten Island. Enter your ZIP in the checker above for a definitive answer — and if we’re not in your neighborhood yet, the waitlist literally decides where we expand next.',
  },
  {
    question: 'How does the jug exchange work?',
    answer:
      'Your first delivery includes your full jugs (plus a dispenser if you added one). From then on, leave your empties out on delivery day and we exchange them one-for-one for full jugs. The jugs stay ours, so there’s nothing to store or return if you ever cancel — we just pick up the last empties.',
  },
  {
    question: 'What’s the bottle deposit?',
    answer:
      'First-time customers pay a one-time $10 deposit per jug in rotation, fully refundable when you return them. It simply covers the bottles while they live at your place — it’s not a fee, and it comes back to you if you ever stop service.',
  },
  {
    question: 'Do I need a dispenser?',
    answer:
      'If you already own one, your jugs will fit it — the 5-gallon format is standard. Otherwise rent one from us for $7/month (free on Family and Office plans, and free for 3 months on Family annual signups) or buy one outright for $129. We deliver, set up, and swap it if it ever acts up.',
  },
];

export const faqCopy = {
  eyebrow: 'Questions',
  heading: 'Frequently asked questions',
  supporting: 'Everything else — just text or email us. A real person answers.',
} as const;

export const finalCta = {
  heading: 'Your first delivery is 50% off.',
  copy: 'Check your ZIP, pick a plan, and never carry water again.',
  primaryCta: 'Check your ZIP →',
  secondaryCta: 'See Plans & Pricing',
} as const;

export const consentCopy =
  'By submitting, you agree that Garden State Water may contact you about service availability and your delivery request. Consent is not a condition of purchase.';
