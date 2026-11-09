import Decimal from 'decimal.js';

const SUFFIXES = [
  '',
  'K',
  'M',
  'B',
  'T',
  'Qa',
  'Qi',
  'Sx',
  'Sp',
  'Oc',
  'No',
  'Dc',
  'UDc',
  'DDc',
  'TDc',
  'QaDc',
  'QiDc',
];

const toDecimal = (value: Decimal.Value): Decimal =>
  value instanceof Decimal ? value : new Decimal(value);

/**
 * Compact game-number formatting. Uses Decimal so exponential scaling remains
 * exact long after Number loses integer precision.
 */
export function formatCompact(value: Decimal.Value, precision = 1): string {
  const decimal = toDecimal(value);
  if (!decimal.isFinite()) return '∞';
  if (decimal.lt(0)) return `-${formatCompact(decimal.neg(), precision)}`;
  if (decimal.lt(1000)) {
    if (decimal.lt(10) && !decimal.isInteger()) {
      return decimal.toDecimalPlaces(precision).toString();
    }
    return decimal.floor().toString();
  }

  const exponent = decimal.e === 0 ? 0 : decimal.e;
  const tier = Math.min(SUFFIXES.length - 1, Math.floor(exponent / 3));
  if (tier === 0) return decimal.floor().toString();
  const scaled = decimal.div(Decimal.pow(10, tier * 3));
  const fixed = scaled.toDecimalPlaces(scaled.gte(100) ? 0 : precision).toString();
  return `${fixed}${SUFFIXES[tier]}`;
}

export function formatCurrency(value: Decimal.Value): string {
  return formatCompact(value, 1);
}

export function formatPercent(value: number, precision = 0): string {
  return `${(value * 100).toFixed(precision)}%`;
}

export function formatTimer(seconds: number): string {
  if (seconds <= 0) return 'NOW';
  return `${Math.max(0, seconds).toFixed(1)}s`;
}

export function formatMultiplier(value: number): string {
  return `×${value.toFixed(value % 1 === 0 ? 0 : 1)}`;
}
