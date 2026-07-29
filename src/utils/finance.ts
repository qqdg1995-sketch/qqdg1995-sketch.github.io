export interface AverageCostRecord {
  date: string;
  type: 'buy' | 'sell';
  quantity: number;
  value: number;
}

export interface AverageCostResult {
  holding: number;
  costBasis: number;
  realizedProfit: number;
  totalBuyCost: number;
}

export function calculateAverageCost(records: AverageCostRecord[]): AverageCostResult {
  let holding = 0;
  let costBasis = 0;
  let realizedProfit = 0;
  let totalBuyCost = 0;

  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  for (const record of sorted) {
    if (record.type === 'buy') {
      holding += record.quantity;
      costBasis += record.value;
      totalBuyCost += record.value;
      continue;
    }

    if (record.quantity > holding) {
      throw new Error(`卖出数量 ${record.quantity} 超过当前持仓 ${holding}`);
    }

    const averageCost = holding > 0 ? costBasis / holding : 0;
    const soldCost = record.quantity * averageCost;
    holding -= record.quantity;
    costBasis = Math.max(0, costBasis - soldCost);
    realizedProfit += record.value - soldCost;
  }

  return { holding, costBasis, realizedProfit, totalBuyCost };
}

export function getHoldingBefore(
  records: AverageCostRecord[],
  target: AverageCostRecord,
): number {
  const preceding = records.filter((record) => (
    record !== target
    && (record.date < target.date || (record.date === target.date && record.type === 'buy'))
  ));
  return calculateAverageCost(preceding).holding;
}

