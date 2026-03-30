import { CURRENCY_SYMBOL } from '../constants/app';

export const formatCurrency = (value: number) => {
  const amount = Number.isFinite(value) ? value : 0;
  const hasDecimals = amount % 1 !== 0;
  return `${CURRENCY_SYMBOL}${amount.toFixed(hasDecimals ? 2 : 0)}`;
};
