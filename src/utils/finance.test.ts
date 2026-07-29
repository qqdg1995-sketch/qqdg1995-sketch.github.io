import { describe, expect, it } from 'vitest';
import { calculateAverageCost } from './finance';

describe('calculateAverageCost', () => {
  it('calculates average-cost holding and realized profit chronologically', () => {
    const result = calculateAverageCost([
      { date: '2026-01-01', type: 'buy', quantity: 100, value: 400 },
      { date: '2026-02-01', type: 'buy', quantity: 100, value: 600 },
      { date: '2026-03-01', type: 'sell', quantity: 50, value: 300 },
    ]);

    expect(result.holding).toBe(150);
    expect(result.costBasis).toBe(750);
    expect(result.realizedProfit).toBe(50);
    expect(result.totalBuyCost).toBe(1000);
  });

  it('rejects a sale that exceeds the holding available on that date', () => {
    expect(() => calculateAverageCost([
      { date: '2026-01-01', type: 'buy', quantity: 10, value: 100 },
      { date: '2026-02-01', type: 'sell', quantity: 11, value: 120 },
      { date: '2026-03-01', type: 'buy', quantity: 10, value: 90 },
    ])).toThrow('超过当前持仓');
  });

  it('returns the same result even when input records are out of order', () => {
    const result = calculateAverageCost([
      { date: '2026-03-01', type: 'sell', quantity: 5, value: 75 },
      { date: '2026-01-01', type: 'buy', quantity: 10, value: 100 },
    ]);

    expect(result.holding).toBe(5);
    expect(result.costBasis).toBe(50);
    expect(result.realizedProfit).toBe(25);
  });
});
