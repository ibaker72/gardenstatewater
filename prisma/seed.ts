/**
 * Seed: 3 zones, 8 customers (residential / commercial / event), 20 orders,
 * 7 invoices (2 overdue · 3 paid · 2 pending), inventory (50 jugs owned =
 * 20 in stock + 30 at customers), a supplier with purchase history, and
 * 2 competitors — so every dashboard widget has something to show.
 *
 * Run with: npm run db:seed
 */
import { PrismaClient, type Customer, type Order } from '@prisma/client';
import { addDays } from 'date-fns';
import { launchDeals, launchPlans, launchServiceZipRows } from '../src/config/launch-service-area';

const prisma = new PrismaClient();

const day = (offset: number) => {
  const d = addDays(new Date(), offset);
  d.setHours(0, 0, 0, 0);
  return d;
};

const JUG_PRICE = 8;

async function main() {
  console.log('Seeding Garden State Water…');

  // Wipe in dependency order so the seed is re-runnable.
  await prisma.$transaction([
    prisma.routeStop.deleteMany(),
    prisma.route.deleteMany(),
    prisma.notificationLog.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.portalRequest.deleteMany(),
    prisma.commLog.deleteMany(),
    prisma.referralCredit.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.serviceZip.deleteMany(),
    prisma.zone.deleteMany(),
    prisma.waitlistEntry.deleteMany(),
    prisma.deal.deleteMany(),
    prisma.sitePlan.deleteMany(),
    prisma.inventoryMovement.deleteMany(),
    prisma.inventoryItem.deleteMany(),
    prisma.supplierPurchase.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.competitorPrice.deleteMany(),
    prisma.pricingConfig.deleteMany(),
  ]);

  // ── Pricing config (NJ-realistic) ──────────────────────────────
  await prisma.pricingConfig.create({
    data: {
      id: 'default',
      jugRefillPrice: JUG_PRICE,
      jugPurchasePrice: 35,
      dispenserRentalPrice: 7,
      bottleCasePrice: 8.99,
      oneTimeJugPrice: 11.99,
      oneTimeDeliveryFee: 4.99,
      dispenserPurchasePrice: 129,
      jugDepositPrice: 10,
      annualFreeMonths: 1,
      firstDeliveryDiscountPct: 50,
      weeklyDiscountPct: 10,
      biweeklyDiscountPct: 5,
      bulkBuyQty: 10,
      bulkFreeQty: 1,
      costPerGallon: 0.35,
      gasCostPerMile: 0.2,
      businessName: 'Garden State Water',
      // No businessPhone: the real number isn't confirmed yet, and the public
      // site hides the phone entirely until a non-fictional one is configured.
      businessEmail: 'hello@gardenstatewater.com',
      businessAddress: 'Newark, NJ',
    },
  });

  // ── Zones ──────────────────────────────────────────────────────
  const [zone1, zone2, zone3] = await Promise.all([
    prisma.zone.create({
      data: { name: 'Zone 1 — Newark core', deliveryFee: 0, deliveryDays: [1, 4], zips: ['07102', '07103', '07104', '07105'] },
    }),
    prisma.zone.create({
      data: { name: 'Zone 2 — East Orange / Irvington', deliveryFee: 2, deliveryDays: [2, 5], zips: ['07017', '07018', '07111'] },
    }),
    prisma.zone.create({
      data: { name: 'Zone 3 — Elizabeth / Union', deliveryFee: 5, deliveryDays: [3, 6], zips: ['07201', '07202', '07208', '07083'] },
    }),
  ]);

  // ── Customers (8 — jugsWithCustomer totals 30) ─────────────────
  const maria = await prisma.customer.create({
    data: {
      name: 'Maria Alvarez',
      phone: '(973) 555-0142',
      email: 'maria.alvarez@example.com',
      address: '212 Ferry St',
      city: 'Newark',
      zip: '07105',
      deliveryNotes: 'Ring bell twice, 2nd floor',
      plan: 'WEEKLY',
      planJugs: 3,
      preferredDay: 1,
      zoneId: zone1.id,
      jugsWithCustomer: 3,
      paymentPref: 'VENMO',
      lat: 40.7282,
      lng: -74.1568,
      startedAt: addDays(new Date(), -220),
    },
  });
  const troy = await prisma.customer.create({
    data: {
      name: "Troy's Barbershop",
      phone: '(973) 555-0177',
      email: 'troy@troyscuts.example.com',
      address: '480 Central Ave',
      city: 'East Orange',
      zip: '07018',
      accountType: 'COMMERCIAL',
      deliveryNotes: 'Deliver before 10am — leave by the register',
      plan: 'WEEKLY',
      planJugs: 5,
      preferredDay: 1,
      zoneId: zone2.id,
      jugsWithCustomer: 5,
      paymentPref: 'CASH',
      lat: 40.7623,
      lng: -74.2205,
      startedAt: addDays(new Date(), -400),
    },
  });
  const denise = await prisma.customer.create({
    data: {
      name: 'Denise Whitfield',
      phone: '(908) 555-0129',
      email: 'denisew@example.com',
      address: '95 Westfield Ave',
      city: 'Elizabeth',
      zip: '07208',
      deliveryNotes: 'Leave at back gate, beware of sprinklers',
      plan: 'BIWEEKLY',
      planJugs: 2,
      preferredDay: 3,
      zoneId: zone3.id,
      jugsWithCustomer: 2,
      dispenserRental: true,
      paymentPref: 'CASHAPP',
      lat: 40.6668,
      lng: -74.2263,
      startedAt: addDays(new Date(), -150),
    },
  });
  const sunrise = await prisma.customer.create({
    data: {
      name: 'Sunrise Daycare LLC',
      phone: '(973) 555-0163',
      email: 'office@sunrisedaycare.example.com',
      address: '77 Springfield Ave',
      city: 'Irvington',
      zip: '07111',
      accountType: 'COMMERCIAL',
      plan: 'WEEKLY',
      planJugs: 6,
      preferredDay: 4,
      zoneId: zone2.id,
      jugsWithCustomer: 6,
      paymentPref: 'STRIPE',
      lat: 40.7324,
      lng: -74.2107,
      startedAt: addDays(new Date(), -320),
    },
  });
  const jerome = await prisma.customer.create({
    data: {
      name: 'Jerome Carter',
      phone: '(862) 555-0114',
      email: 'jcarter@example.com',
      address: '31 Mount Prospect Ave',
      city: 'Newark',
      zip: '07104',
      plan: 'ON_DEMAND',
      planJugs: 2,
      zoneId: zone1.id,
      jugsWithCustomer: 0,
      lat: 40.7614,
      lng: -74.1687,
      // Hasn't ordered in a while — shows the at-risk flag.
      startedAt: addDays(new Date(), -90),
    },
  });
  const kim = await prisma.customer.create({
    data: {
      name: "Kim's Deli & Grocery",
      phone: '(973) 555-0188',
      email: 'kimsdeli@example.com',
      address: '318 Broad St',
      city: 'Newark',
      zip: '07104',
      accountType: 'COMMERCIAL',
      deliveryNotes: 'Use the service door on Gouverneur St',
      plan: 'MONTHLY',
      planJugs: 4,
      preferredDay: 2,
      zoneId: zone1.id,
      jugsWithCustomer: 6,
      dispenserRental: true,
      paymentPref: 'ZELLE',
      lat: 40.7589,
      lng: -74.1701,
      startedAt: addDays(new Date(), -260),
    },
  });
  const rosa = await prisma.customer.create({
    data: {
      name: 'Rosa Nguyen',
      phone: '(908) 555-0151',
      email: 'rosa.n@example.com',
      address: '140 Salem Rd',
      city: 'Union',
      zip: '07083',
      plan: 'WEEKLY',
      planJugs: 2,
      preferredDay: 5,
      zoneId: zone3.id,
      jugsWithCustomer: 4,
      paymentPref: 'CASH',
      lat: 40.6976,
      lng: -74.2632,
      startedAt: addDays(new Date(), -60),
    },
  });
  const diaz = await prisma.customer.create({
    data: {
      name: 'Diaz Family Reunion',
      phone: '(201) 555-0175',
      email: 'ldiaz@example.com',
      address: '10 Watsessing Park Dr',
      city: 'East Orange',
      zip: '07017',
      accountType: 'EVENT',
      deliveryNotes: 'Annual park event — call on arrival, pavilion #2',
      plan: 'ON_DEMAND',
      planJugs: 10,
      zoneId: zone2.id,
      jugsWithCustomer: 4,
      paymentPref: 'VENMO',
      lat: 40.7534,
      lng: -74.2001,
      startedAt: addDays(new Date(), -35),
    },
  });

  // ── Inventory & supplier (50 owned = 20 in stock + 30 at customers) ──
  const jugItem = await prisma.inventoryItem.create({
    data: { sku: 'JUG_5GAL', name: '5-gallon jug', category: 'jug', quantity: 20, unitCost: 6.5, reorderThreshold: 15, reorderAmount: 30 },
  });
  await prisma.inventoryItem.createMany({
    data: [
      { sku: 'CAPS', name: 'Snap-on caps', category: 'consumable', quantity: 140, unit: 'caps', unitCost: 0.08, reorderThreshold: 50, reorderAmount: 200 },
      { sku: 'SEALS', name: 'Tamper seals', category: 'consumable', quantity: 35, unit: 'seals', unitCost: 0.05, reorderThreshold: 40, reorderAmount: 200 },
      { sku: 'SANITIZER', name: 'Food-grade sanitizer', category: 'consumable', quantity: 3, unit: 'bottles', reorderThreshold: 2, reorderAmount: 4, unitCost: 12 },
      { sku: 'DISPENSER', name: 'Countertop dispenser', category: 'equipment', quantity: 8, unitCost: 22, reorderThreshold: 3, reorderAmount: 6 },
    ],
  });

  const supplier = await prisma.supplier.create({
    data: {
      name: 'Pure Spring Water Co.',
      contact: 'Vinnie',
      phone: '(201) 555-0190',
      email: 'orders@purespring.example.com',
      address: '400 Industrial Way, Paterson NJ',
      notes: 'Open 6am–2pm weekdays. Ask about volume discount at 500 gal.',
    },
  });
  await prisma.supplierPurchase.createMany({
    data: [
      { supplierId: supplier.id, date: addDays(new Date(), -21), gallons: 300, costPerGallon: 0.38, total: 114 },
      { supplierId: supplier.id, date: addDays(new Date(), -10), gallons: 350, costPerGallon: 0.35, total: 122.5 },
      { supplierId: supplier.id, date: addDays(new Date(), -3), gallons: 400, costPerGallon: 0.35, otherCost: 18, total: 158 },
    ],
  });
  await prisma.inventoryMovement.createMany({
    data: [
      { itemId: jugItem.id, delta: 30, reason: 'purchase', createdAt: addDays(new Date(), -21) },
      { itemId: jugItem.id, delta: -12, reason: 'delivery', createdAt: addDays(new Date(), -14) },
      { itemId: jugItem.id, delta: 24, reason: 'purchase', createdAt: addDays(new Date(), -10) },
      { itemId: jugItem.id, delta: -2, reason: 'lost', createdAt: addDays(new Date(), -6) },
    ],
  });

  // ── Competitors ────────────────────────────────────────────────
  await prisma.competitorPrice.createMany({
    data: [
      { competitor: 'ReadyRefresh', jugRefill: 12.49, jugPurchase: 44.99, dispenserRent: 9.99, deliveryFee: 3.99 },
      { competitor: 'Local Depot', jugRefill: 9.5, jugPurchase: 39, bottleCase: 7.5, deliveryFee: 0 },
    ],
  });

  // ── Orders (13 past + 7 today/upcoming = 20) ───────────────────
  const mkItems = (jugs: number, price = JUG_PRICE) => ({
    create: [
      {
        productType: 'JUG_REFILL' as const,
        description: `5-gal refill ×${jugs}`,
        quantity: jugs,
        unitPrice: price,
        lineTotal: jugs * price,
      },
    ],
  });

  type PastOrder = {
    customer: Customer;
    offset: number;
    jugs: number;
    discountPct: number;
    fee: number;
    paid: boolean;
  };
  // paid=false orders stay DELIVERED — they're covered by invoices below.
  const pastOrders: PastOrder[] = [
    { customer: maria, offset: -21, jugs: 3, discountPct: 10, fee: 0, paid: true },
    { customer: maria, offset: -14, jugs: 3, discountPct: 10, fee: 0, paid: false }, // → PAID invoice
    { customer: maria, offset: -7, jugs: 3, discountPct: 10, fee: 0, paid: true },
    { customer: troy, offset: -14, jugs: 5, discountPct: 10, fee: 2, paid: true },
    { customer: troy, offset: -7, jugs: 5, discountPct: 10, fee: 2, paid: false }, // → OVERDUE invoice
    { customer: denise, offset: -12, jugs: 2, discountPct: 5, fee: 5, paid: false }, // → PAID invoice
    { customer: sunrise, offset: -8, jugs: 6, discountPct: 10, fee: 2, paid: false }, // → OVERDUE invoice
    { customer: jerome, offset: -45, jugs: 2, discountPct: 0, fee: 0, paid: true },
    { customer: kim, offset: -28, jugs: 4, discountPct: 0, fee: 0, paid: true },
    { customer: kim, offset: -5, jugs: 4, discountPct: 0, fee: 0, paid: false }, // → SENT invoice
    { customer: rosa, offset: -13, jugs: 2, discountPct: 10, fee: 5, paid: true },
    { customer: rosa, offset: -6, jugs: 2, discountPct: 10, fee: 5, paid: false }, // → SENT invoice
    { customer: diaz, offset: -30, jugs: 10, discountPct: 0, fee: 2, paid: false }, // → PAID invoice
  ];
  const madeOrders: Order[] = [];
  for (const o of pastOrders) {
    const subtotal = o.jugs * JUG_PRICE;
    const discount = Math.round(subtotal * o.discountPct) / 100;
    const total = subtotal - discount + o.fee;
    madeOrders.push(
      await prisma.order.create({
        data: {
          customerId: o.customer.id,
          deliveryDate: day(o.offset),
          deliveredAt: day(o.offset),
          status: o.paid ? 'PAID' : 'DELIVERED',
          paymentMethod: o.paid ? 'CASH' : null,
          jugsReturned: o.jugs,
          fromSubscription: o.customer.plan !== 'ON_DEMAND',
          subtotal,
          discount,
          deliveryFee: o.fee,
          total,
          items: mkItems(o.jugs),
        },
      })
    );
  }

  // Direct payments for orders paid on the spot (no invoice)
  for (const [i, o] of pastOrders.entries()) {
    if (!o.paid) continue;
    await prisma.payment.create({
      data: {
        customerId: o.customer.id,
        method: i % 2 === 0 ? 'CASH' : 'VENMO',
        amount: madeOrders[i].total,
        reference: i % 2 === 0 ? null : '@' + o.customer.name.split(' ')[0].toLowerCase(),
        receivedAt: day(o.offset),
        note: `Order #${madeOrders[i].number}`,
      },
    });
  }

  // ── Invoices: 2 overdue · 3 paid · 2 pending ───────────────────
  const orderFor = (customer: Customer, offset: number) =>
    madeOrders[pastOrders.findIndex((o) => o.customer.id === customer.id && o.offset === offset)];

  const mkInvoice = async (
    customer: Customer,
    order: Order,
    opts: { status: 'OVERDUE' | 'PAID' | 'SENT'; issuedDaysAgo: number; dueOffset: number }
  ) => {
    const invoice = await prisma.invoice.create({
      data: {
        customerId: customer.id,
        status: opts.status,
        issueDate: day(-opts.issuedDaysAgo),
        dueDate: day(opts.dueOffset),
        subtotal: order.subtotal,
        discount: order.discount,
        deliveryFees: order.deliveryFee,
        total: order.total,
        amountPaid: opts.status === 'PAID' ? order.total : 0,
        sentAt: day(-opts.issuedDaysAgo),
        orders: { connect: { id: order.id } },
      },
    });
    if (opts.status === 'PAID') {
      await prisma.$transaction([
        prisma.payment.create({
          data: {
            customerId: customer.id,
            invoiceId: invoice.id,
            method: customer.paymentPref ?? 'CASH',
            amount: order.total,
            receivedAt: day(opts.dueOffset - 1),
            note: `Invoice #${invoice.number}`,
          },
        }),
        prisma.order.update({ where: { id: order.id }, data: { status: 'PAID', paymentMethod: customer.paymentPref ?? 'CASH' } }),
      ]);
    }
    return invoice;
  };

  await mkInvoice(sunrise, orderFor(sunrise, -8), { status: 'OVERDUE', issuedDaysAgo: 18, dueOffset: -10 });
  await mkInvoice(troy, orderFor(troy, -7), { status: 'OVERDUE', issuedDaysAgo: 20, dueOffset: -12 });
  await mkInvoice(maria, orderFor(maria, -14), { status: 'PAID', issuedDaysAgo: 14, dueOffset: -4 });
  await mkInvoice(denise, orderFor(denise, -12), { status: 'PAID', issuedDaysAgo: 12, dueOffset: -2 });
  await mkInvoice(diaz, orderFor(diaz, -30), { status: 'PAID', issuedDaysAgo: 30, dueOffset: -16 });
  await mkInvoice(kim, orderFor(kim, -5), { status: 'SENT', issuedDaysAgo: 5, dueOffset: 9 });
  await mkInvoice(rosa, orderFor(rosa, -6), { status: 'SENT', issuedDaysAgo: 6, dueOffset: 8 });

  // ── Today's + upcoming deliveries (7) ──────────────────────────
  const upcoming = [
    { customer: maria, offset: 0, jugs: 3, discountPct: 10, fee: 0 },
    { customer: troy, offset: 0, jugs: 5, discountPct: 10, fee: 2 },
    { customer: denise, offset: 0, jugs: 2, discountPct: 5, fee: 5 },
    { customer: rosa, offset: 0, jugs: 2, discountPct: 10, fee: 5 },
    { customer: sunrise, offset: 1, jugs: 6, discountPct: 10, fee: 2 },
    { customer: kim, offset: 1, jugs: 4, discountPct: 0, fee: 0 },
    { customer: jerome, offset: 2, jugs: 2, discountPct: 0, fee: 0 },
  ];
  for (const o of upcoming) {
    const subtotal = o.jugs * JUG_PRICE;
    const discount = Math.round(subtotal * o.discountPct) / 100;
    await prisma.order.create({
      data: {
        customerId: o.customer.id,
        deliveryDate: day(o.offset),
        status: 'SCHEDULED',
        fromSubscription: o.customer.plan !== 'ON_DEMAND',
        instructions: o.customer.deliveryNotes,
        subtotal,
        discount,
        deliveryFee: o.fee,
        total: subtotal - discount + o.fee,
        items: mkItems(o.jugs),
      },
    });
  }

  // ── Marketing site: plans, deals, serviceable ZIPs, waitlist ───
  await prisma.sitePlan.createMany({
    data: launchPlans.map((p) => ({
      key: p.key,
      name: p.name,
      tagline: p.tagline,
      monthlyPrice: p.monthlyPrice,
      priceUnit: p.priceUnit,
      jugsPerMonth: p.jugsPerMonth,
      badge: p.badge,
      features: [...p.features],
      isSubscription: p.isSubscription,
      customQuote: p.customQuote,
      sortOrder: p.sortOrder,
    })),
  });
  await prisma.deal.createMany({
    data: launchDeals.map((d) => ({
      slot: d.slot,
      title: d.title,
      description: d.description,
      badge: d.badge,
      sortOrder: d.sortOrder,
    })),
  });
  const zipRows = launchServiceZipRows();
  // The existing operational zone ZIPs stay serviceable too.
  const zoneZips: { zip: string; zoneId: string; name: string }[] = [
    ...zone1.zips.map((zip) => ({ zip, zoneId: zone1.id, name: 'Newark' })),
    ...zone2.zips.map((zip) => ({ zip, zoneId: zone2.id, name: 'East Orange' })),
    ...zone3.zips.map((zip) => ({ zip, zoneId: zone3.id, name: 'Elizabeth' })),
  ];
  await prisma.serviceZip.createMany({
    data: [
      ...zoneZips.map((z) => ({
        zip: z.zip,
        town: z.name,
        state: 'NJ',
        region: 'North Jersey',
        slug: `${z.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-nj`,
        zoneId: z.zoneId,
      })),
      ...zipRows.filter((r) => !zoneZips.some((z) => z.zip === r.zip)),
    ],
  });
  await prisma.waitlistEntry.createMany({
    data: [
      { name: 'Priya Raman', phone: '(551) 555-0123', zip: '07302', source: 'homepage' },
      { name: 'Dan Kowalski', phone: '(973) 555-0197', zip: '07940', town: 'Madison', source: 'homepage' },
    ],
  });

  // ── Referral program flavor ────────────────────────────────────
  await prisma.customer.update({ where: { id: maria.id }, data: { referralCode: 'GSW-MARIA1' } });
  await prisma.customer.update({
    where: { id: rosa.id },
    data: { referralCode: 'GSW-ROSA22', referredById: maria.id },
  });
  await prisma.referralCredit.createMany({
    data: [
      { customerId: maria.id, jugs: 1, reason: 'Referred Rosa Nguyen' },
      { customerId: rosa.id, jugs: 1, reason: 'Signed up with code GSW-MARIA1', redeemedAt: day(-30) },
    ],
  });

  // ── Comm log + portal request flavor ───────────────────────────
  await prisma.commLog.createMany({
    data: [
      { customerId: troy.id, channel: 'CALL', note: 'Asked about adding a second dispenser — quote next visit.' },
      { customerId: denise.id, channel: 'TEXT', note: 'Confirmed Wednesday works better than Tuesday.' },
      { customerId: jerome.id, channel: 'NOTE', note: 'Moved apartments — verify address before next order.' },
      { customerId: kim.id, channel: 'IN_PERSON', note: 'Wants the invoice emailed on the 1st of each month.' },
    ],
  });
  await prisma.portalRequest.create({
    data: { customerId: maria.id, kind: 'EXTRA_DELIVERY', detail: '2 extra jugs before the weekend party 🎉' },
  });

  console.log('Seed complete:');
  console.log(`  customers: 8 (portal example: /portal/${maria.portalToken})`);
  console.log('  orders: 20 · invoices: 7 (2 overdue, 3 paid, 2 pending)');
  console.log('  jugs: 50 owned = 20 in stock + 30 at customers · competitors: 2');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
