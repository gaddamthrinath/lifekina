import { Currency } from './types';

export const CURRENCIES: Currency[] = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: 'IN' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: 'US' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: 'EU' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: 'GB' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: 'JP' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: 'AE' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: 'SG' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: 'AU' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', flag: 'CA' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: 'CH' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: 'CN' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: 'HK' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: 'MY' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', flag: 'SA' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: 'TH' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: 'NZ' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: 'KR' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: 'BR' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: 'ZA' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', flag: 'MX' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: 'ID' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', flag: 'PK' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', flag: 'BD' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: 'NG' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', flag: 'EG' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QR', flag: 'QA' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD', flag: 'KW' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: 'NO' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: 'SE' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', flag: 'DK' },
];

export function getCurrencyByCode(code: string): Currency | undefined {
  return CURRENCIES.find(c => c.code === code);
}

export function formatAmount(amount: number, symbol: string): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `${symbol}${formatted}`;
}
