/**
 * All landing-page copy in one typed place, so wording changes never require
 * touching component code — and so launch-stage language (no unconfirmed
 * prices, days, fees, or water-source claims) stays easy to review.
 */

export interface TrustPoint {
  label: string;
}

export const hero = {
  eyebrow: 'North Jersey Water Delivery',
  headline: 'Reliable 5-gallon water delivery, without the heavy lifting.',
  supporting:
    'Fresh water delivered directly to your home or workplace. Choose a schedule that fits your needs, leave your empty bottles out, and we handle the exchange.',
  primaryCta: 'Check My Address',
  secondaryCta: 'Explore Delivery Options',
  trustPoints: [
    { label: 'Flexible delivery schedules' },
    { label: 'Home and business service' },
    { label: 'Simple bottle exchange' },
  ] satisfies TrustPoint[],
} as const;

export interface DeliveryAudience {
  id: string;
  title: string;
  copy: string;
  benefits: string[];
  cta: string;
  customerType: 'home' | 'business';
}

export const deliveryAudiences: DeliveryAudience[] = [
  {
    id: 'home-delivery',
    title: 'Home Water Delivery',
    copy: 'Convenient bottle exchange for families, apartments, home offices, and anyone tired of carrying heavy jugs from the store.',
    benefits: [
      'Flexible recurring deliveries',
      'Easy empty-bottle exchange',
      'Dispenser options available',
      'Pause or adjust service when needed',
    ],
    cta: 'Explore Home Delivery',
    customerType: 'home',
  },
  {
    id: 'business-delivery',
    title: 'Office & Business Delivery',
    copy: 'Dependable recurring water delivery for offices, auto shops, gyms, salons, warehouses, medical practices, job sites, and local businesses.',
    benefits: [
      'Recurring commercial routes',
      'Multiple bottle quantities',
      'Dispenser options',
      'Business account support',
    ],
    cta: 'Request a Business Quote',
    customerType: 'business',
  },
];

export interface ProcessStep {
  title: string;
  copy: string;
}

export const howItWorks: { heading: string; steps: ProcessStep[] } = {
  heading: 'Water delivery made simple.',
  steps: [
    {
      title: 'Choose what you need',
      copy: 'Tell us how many bottles you use, whether you need a dispenser, and how often you would like delivery.',
    },
    {
      title: 'We confirm your route',
      copy: 'We verify your address, availability, pricing, bottle requirements, and first delivery date.',
    },
    {
      title: 'Leave the empties out',
      copy: 'On future delivery days, leave your empty bottles in the agreed location and we exchange them for full ones.',
    },
  ],
};

export interface Offering {
  id: string;
  title: string;
  copy: string;
  icon: 'exchange' | 'setup' | 'bottomLoad' | 'countertop' | 'office' | 'bulk';
  enabled: boolean;
}

export const deliveryOptions: { heading: string; note: string; offerings: Offering[] } = {
  heading: 'Choose the setup that fits your space.',
  note: 'Pricing and bottle requirements are confirmed after we verify your address and requested service.',
  offerings: [
    {
      id: 'bottle-exchange',
      title: '5-Gallon Bottle Exchange',
      copy: 'Recurring swaps of your empty bottles for full ones on your delivery day.',
      icon: 'exchange',
      enabled: true,
    },
    {
      id: 'first-time-setup',
      title: 'First-Time Bottle Setup',
      copy: 'We walk you through bottle counts, deposits or purchases, and your first drop-off.',
      icon: 'setup',
      enabled: true,
    },
    {
      id: 'bottom-load-dispenser',
      title: 'Bottom-Load Dispenser Rental',
      copy: 'A floor-standing dispenser that hides the bottle in a lower cabinet — no lifting.',
      icon: 'bottomLoad',
      enabled: true,
    },
    {
      id: 'countertop-dispenser',
      title: 'Countertop Dispenser Rental',
      copy: 'A compact top-load option for kitchens and break rooms with limited floor space.',
      icon: 'countertop',
      enabled: true,
    },
    {
      id: 'office-plans',
      title: 'Office Water Plans',
      copy: 'Recurring multi-bottle service sized for your team, with a single point of contact.',
      icon: 'office',
      enabled: true,
    },
    {
      id: 'bulk-requests',
      title: 'One-Time & Bulk Requests',
      copy: 'Events, job sites, and occasional top-ups — tell us what you need and when.',
      icon: 'bulk',
      enabled: true,
    },
  ],
};

export const benefits: { heading: string; items: { title: string; copy: string }[] } = {
  heading: 'Local service. Straightforward delivery.',
  items: [
    {
      title: 'Local North Jersey service',
      copy: 'We build dense neighborhood routes close to home, not a national call-center operation.',
    },
    {
      title: 'Flexible requests',
      copy: 'Recurring schedules or one-time deliveries — adjust as your needs change.',
    },
    {
      title: 'Homes and businesses',
      copy: 'The same dependable exchange service for kitchens, offices, gyms, and shops.',
    },
    {
      title: 'Easy bottle exchange',
      copy: 'Leave your empties in the agreed spot and we swap them for full bottles.',
    },
    {
      title: 'Online account access',
      copy: 'Customers get a portal to view deliveries, invoices, and make requests.',
    },
    {
      title: 'Responsive support',
      copy: 'A real person confirms your setup, schedule, and any changes to your service.',
    },
  ],
};

export const serviceArea = {
  heading: 'Launching route by route across North Jersey.',
  supporting:
    'We are opening service in select communities and expanding based on route density and customer demand. Enter your ZIP code to check current availability.',
  noAreasFallback: 'Service is currently being confirmed address by address.',
} as const;

export const foundingCustomer = {
  heading: 'Join the Founding Customer Program',
  copy: 'Early customers help us build efficient neighborhood routes and receive priority scheduling as service opens in their area.',
  benefits: [
    'Priority route consideration',
    'Direct onboarding support',
    'Early access to available delivery plans',
  ],
  cta: 'Join the Priority List',
} as const;

export interface FaqItem {
  question: string;
  answer: string;
}

export const faqs: FaqItem[] = [
  {
    question: 'What kind of water do you deliver?',
    answer:
      'We are finalizing our launch suppliers and available water options. The exact product, source, bottle type, and pricing will be confirmed before your first delivery.',
  },
  {
    question: 'Do I need to own 5-gallon bottles?',
    answer:
      'Bottle requirements depend on the service option you select. We will explain bottle purchases, exchanges, deposits, or rental terms before scheduling your first delivery.',
  },
  {
    question: 'How does the bottle exchange work?',
    answer:
      'After your initial setup, you leave your empty bottles in the agreed delivery location and we replace them with full bottles during your scheduled visit.',
  },
  {
    question: 'Can I pause or change my deliveries?',
    answer:
      'Available account options will depend on your delivery plan. Contact us before your next route date and we will help adjust your service.',
  },
  {
    question: 'Do you deliver to apartments?',
    answer:
      'Apartment delivery may be available depending on building access, stairs, parking, delivery instructions, and route coverage.',
  },
  {
    question: 'Do you serve businesses?',
    answer:
      'Yes. We accept requests from offices, retail locations, service businesses, gyms, warehouses, job sites, and other local organizations.',
  },
  {
    question: 'What happens if I am not home?',
    answer:
      'Many deliveries can be completed using an approved drop-off location. We will confirm access and delivery instructions during onboarding.',
  },
  {
    question: 'Do you rent water dispensers?',
    answer:
      'Dispenser options may be available based on inventory. Select your preferred setup when requesting service and we will confirm availability.',
  },
  {
    question: 'Which areas do you serve?',
    answer:
      'We are launching in select North Jersey communities and expanding route by route. Enter your ZIP code for the latest availability.',
  },
];

export const finalCta = {
  heading: 'Ready to stop carrying heavy water bottles?',
  copy: 'Check your address and tell us what you need. We will personally confirm availability and your first delivery details.',
  primaryCta: 'Check My Address',
  secondaryCta: 'Request Business Service',
} as const;

export const consentCopy =
  'By submitting, you agree that Garden State Water may contact you about service availability and your delivery request. Consent is not a condition of purchase.';
