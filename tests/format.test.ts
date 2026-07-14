import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { upcomingDeliveryDates } from '../src/lib/format';

describe('upcomingDeliveryDates', () => {
  // Wed Jul 15 2026 (a fixed reference so assertions are deterministic)
  const from = new Date('2026-07-15T12:00:00');

  it('starts tomorrow, never today', () => {
    const [first] = upcomingDeliveryDates([], 5, from);
    assert.equal(first.toISOString().slice(0, 10), '2026-07-16');
  });

  it('returns only the zone’s weekdays', () => {
    const dates = upcomingDeliveryDates([1, 4], 6, from); // Mondays + Thursdays
    assert.equal(dates.length, 6);
    for (const d of dates) assert.ok([1, 4].includes(d.getDay()), `${d} is not Mon/Thu`);
    assert.equal(dates[0].toISOString().slice(0, 10), '2026-07-16'); // Thu
    assert.equal(dates[1].toISOString().slice(0, 10), '2026-07-20'); // Mon
  });

  it('an empty schedule means every day works', () => {
    const dates = upcomingDeliveryDates([], 7, from);
    assert.equal(dates.length, 7);
    const days = dates.map((d) => d.toISOString().slice(0, 10));
    assert.deepEqual(days.slice(0, 3), ['2026-07-16', '2026-07-17', '2026-07-18']);
  });

  it('caps the search window instead of looping forever on nonsense', () => {
    const dates = upcomingDeliveryDates([1], 100, from);
    assert.ok(dates.length > 0 && dates.length < 100);
  });
});
