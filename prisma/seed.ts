/**
 * Seed: 3 zones, 5 customers, 12 orders across the week, inventory,
 * a supplier with purchase history, competitor prices, and a couple of
 * invoices/payments so every dashboard widget has something to show.
 *
 * Run with: npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import { addDays } from 'date-fns';

const prisma = new PrismaClient();

const day = (offset: number) => {
  const d = addDays(new Date(), offset);
  d.setHours(0, 0, 0, 0);
  return d;
};

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
    prisma.customer.deleteMany(),
    prisma.zone.deleteMany(),
    prisma.inventoryMovement.deleteMany(),
    prisma.inventoryItem.deleteMany(),
    prisma.supplierPurchase.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.competitorPrice.deleteMany(),
    prisma.pricingConfig.deleteMany(),
  ]);

  // ── Pricing config ─────────────────────────────────────────────
  await prisma.pricingConfig.create({
    data: { id: 'default', jugRefillPrice: 8, jugPurchasePrice: 35, dispenserRentalPrice: 7 },
  });

  // ── Zones ──────────────────────────────────────────────────────
  const [zone1, zone2, zone3] = await Promise.all([
    prisma.zone.create({
      data: { name: 'Zone 1 — Newark core', deliveryFee: 0, zips: ['07102', '07103', '07104'] },
    }),
    prisma.zone.create({
      data: { name: 'Zone 2 — East Orange / Irvington', deliveryFee: 2, zips: ['07017', '07018', '07111'] },
    }),
    prisma.zone.create({
      data: { name: 'Zone 3 — Elizabeth / Union', deliveryFee: 5, zips: ['07201', '07202', '07083'] },
    }),
  ]);

  // ── Customers ──────────────────────────────────────────────────
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

  // ── Inventory & supplier ───────────────────────────────────────
  const jugItem = await prisma.inventoryItem.create({
    data: { sku: 'JUG_5GAL', name: '5-gallon jug', category: 'jug', quantity: 42, unitCost: 6.5, reorderThreshold: 20, reorderAmount: 30 },
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

  // ── Orders ─────────────────────────────────────────────────────
  const mkItems = (jugs: number, price = 8) => ({
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

  // Delivered history (past two weeks)
  const pastOrders = [
    { customer: maria, offset: -14, jugs: 3, discountPct: 10, fee: 0, paid: true },
    { customer: maria, offset: -7, jugs: 3, discountPct: 10, fee: 0, paid: true },
    { customer: troy, offset: -14, jugs: 5, discountPct: 10, fee: 2, paid: true },
    { customer: troy, offset: -7, jugs: 5, discountPct: 10, fee: 2, paid: false },
    { customer: denise, offset: -12, jugs: 2, discountPct: 5, fee: 5, paid: true },
    { customer: sunrise, offset: -8, jugs: 6, discountPct: 10, fee: 2, paid: false },
    { customer: jerome, offset: -45, jugs: 2, discountPct: 0, fee: 0, paid: true },
  ];
  const madeOrders = [];
  for (const o of pastOrders) {
    const subtotal = o.jugs * 8;
    const discount = Math.round(subtotal * o.discountPct) / 100;
    const total = subtotal - discount + o.fee;
    madeOrders.push(
      await prisma.order.create({
        data: {
          customerId: o.customer.id,
          deliveryDate: day(o.offset),
          deliveredAt: addDays(day(o.offset), 0),
          status: o.paid ? 'PAID' : 'DELIVERED',
          paymentMethod: o.paid ? 'CASH' : null,
          jugsReturned: o.jugs,
          fromSubscription: true,
          subtotal,
          discount,
          deliveryFee: o.fee,
          total,
          items: mkItems(o.jugs),
        },
      })
    );
  }

  // Payments for the paid orders
  for (const [i, o] of pastOrders.entries()) {
    if (!o.paid) continue;
    await prisma.payment.create({
      data: {
        customerId: o.customer.id,
        method: i % 2 === 0 ? 'CASH' : 'VENMO',
        amount: madeOrders[i].total,
        reference: i % 2 === 0 ? null : '@' + o.customer.name.split(' ')[0].toLowerCase(),
        receivedAt: addDays(day(o.offset), 0),
        note: `Order #${madeOrders[i].number}`,
      },
    });
  }

  // An open invoice for Sunrise Daycare (delivered, unpaid, 3 days overdue)
  const sunriseOrder = madeOrders[5];
  await prisma.invoice.create({
    data: {
      customerId: sunrise.id,
      status: 'OVERDUE',
      issueDate: addDays(new Date(), -8),
      dueDate: addDays(new Date(), -3),
      subtotal: sunriseOrder.subtotal,
      discount: sunriseOrder.discount,
      deliveryFees: sunriseOrder.deliveryFee,
      total: sunriseOrder.total,
      sentAt: addDays(new Date(), -8),
      orders: { connect: { id: sunriseOrder.id } },
    },
  });

  // Today's + upcoming deliveries
  const upcoming = [
    { customer: maria, offset: 0, jugs: 3, discountPct: 10, fee: 0 },
    { customer: troy, offset: 0, jugs: 5, discountPct: 10, fee: 2 },
    { customer: denise, offset: 0, jugs: 2, discountPct: 5, fee: 5 },
    { customer: sunrise, offset: 1, jugs: 6, discountPct: 10, fee: 2 },
    { customer: jerome, offset: 2, jugs: 2, discountPct: 0, fee: 0 },
  ];
  for (const o of upcoming) {
    const subtotal = o.jugs * 8;
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

  // ── Comm log + portal request flavor ───────────────────────────
  await prisma.commLog.createMany({
    data: [
      { customerId: troy.id, channel: 'CALL', note: 'Asked about adding a second dispenser — quote next visit.' },
      { customerId: denise.id, channel: 'TEXT', note: 'Confirmed Wednesday works better than Tuesday.' },
      { customerId: jerome.id, channel: 'NOTE', note: 'Moved apartments — verify address before next order.' },
    ],
  });
  await prisma.portalRequest.create({
    data: { customerId: maria.id, kind: 'EXTRA_DELIVERY', detail: '2 extra jugs before the weekend party 🎉' },
  });

  console.log('Seed complete:');
  console.log(`  customers: 5 (portal example: /portal/${maria.portalToken})`);
  console.log('  orders: 12 · zones: 3 · inventory: 5 items · supplier purchases: 3');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
