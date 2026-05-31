export const chf = (n, opts = {}) =>
  new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 0,
    ...opts,
  }).format(n);

export const num = (n) => new Intl.NumberFormat('de-CH').format(n);
