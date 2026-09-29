import fs from 'fs';
import path from 'path';
import { FirebaseSync } from './firebaseSync';

export interface DepositMethodItem {
  id: string;
  name: string;
  subtitle: string;
  category: 'mfs' | 'crypto' | 'custom';
  currency: 'USDT' | 'USD' | 'BDT';
  accountValue: string;
  accountLabel: string;
  memoOrTag?: string;
  instructions: string;
  logoType: 'bkash' | 'nagad' | 'binance' | 'bep20' | 'trc20' | 'polygon' | 'ton' | 'custom';
  logoUrl?: string;
  qrImageUrl?: string;
  enabled: boolean;
  rateToBdt?: number;
  color?: string;
}

const HOSTED_BOTS_DIR = path.join(process.cwd(), 'hosted_bots');
const DEPOSIT_METHODS_FILE = path.join(HOSTED_BOTS_DIR, 'deposit_methods.json');

export const DEFAULT_DEPOSIT_METHODS: DepositMethodItem[] = [
  {
    id: 'bkash',
    name: 'bKash',
    subtitle: 'Send Money',
    category: 'mfs',
    currency: 'BDT',
    accountValue: '01614572747',
    accountLabel: 'বিকাশ পার্সোনাল নম্বর (Send Money):',
    instructions: 'বিকাশ পার্সোনাল নাম্বারে Send Money করুন। টাকা পাঠানো শেষে TrxID ও যে নাম্বার থেকে পাঠিয়েছেন তা নিচে লিখে কনফার্ম করুন।',
    logoType: 'bkash',
    enabled: true,
    rateToBdt: 120,
    color: '#E2136E'
  },
  {
    id: 'nagad',
    name: 'Nagad',
    subtitle: 'Send Money',
    category: 'mfs',
    currency: 'BDT',
    accountValue: '01304104492',
    accountLabel: 'নগদ পার্সোনাল নম্বর (Send Money):',
    instructions: 'নগদ পার্সোনাল নাম্বারে Send Money করুন। টাকা পাঠানো শেষে TrxID ও যে নাম্বার থেকে পাঠিয়েছেন তা নিচে লিখে কনফার্ম করুন।',
    logoType: 'nagad',
    enabled: true,
    rateToBdt: 120,
    color: '#F15A24'
  },
  {
    id: 'binance_pay',
    name: 'Binance Pay / UID',
    subtitle: 'BINANCE_PAY',
    category: 'crypto',
    currency: 'USDT',
    accountValue: '922593999',
    accountLabel: 'Binance Pay ID / UID:',
    instructions: 'Binance Pay ID / UID তে ডলার সেন্ড করুন (০% ফি ও তাৎক্ষণিক)। পেমেন্ট শেষ হলে Binance Order ID / Trx ID দিন।',
    logoType: 'binance',
    enabled: true,
    color: '#F3BA2F'
  },
  {
    id: 'usdt_bep20',
    name: 'USDT (BEP-20)',
    subtitle: 'BEP20',
    category: 'crypto',
    currency: 'USDT',
    accountValue: '0xadf20566382613a481f39f62cd50b872314db1d3',
    accountLabel: 'BNB Smart Chain (BEP-20) ওয়ালেট এড্রেস:',
    instructions: 'শুধুমাত্র BNB Smart Chain (BEP-20) নেটওয়ার্কে USDT সেন্ড করবেন। পেমেন্ট শেষ হলে ট্রানজেকশন হ্যাশ (TxID) নিচে দিন।',
    logoType: 'bep20',
    enabled: true,
    color: '#F59E0B'
  },
  {
    id: 'usdt_trc20',
    name: 'USDT (TRC-20)',
    subtitle: 'TRC20',
    category: 'crypto',
    currency: 'USDT',
    accountValue: 'TX7aA8b9qZ4eR2p3u5v6w7x8y9z0a1b2c3',
    accountLabel: 'Tron (TRC-20) ওয়ালেট এড্রেস:',
    instructions: 'শুধুমাত্র Tron (TRC-20) নেটওয়ার্কে USDT সেন্ড করবেন। পেমেন্ট সম্পন্ন হলে ট্রানজেকশন হ্যাশ (TxID) নিচে দিন।',
    logoType: 'trc20',
    enabled: true,
    color: '#EF4444'
  }
];

export function getDepositMethods(): DepositMethodItem[] {
  try {
    if (!fs.existsSync(HOSTED_BOTS_DIR)) {
      fs.mkdirSync(HOSTED_BOTS_DIR, { recursive: true });
    }
    if (fs.existsSync(DEPOSIT_METHODS_FILE)) {
      const data = JSON.parse(fs.readFileSync(DEPOSIT_METHODS_FILE, 'utf-8'));
      if (Array.isArray(data)) {
        return data;
      }
    }
    // If file doesn't exist, seed default methods
    saveDepositMethods(DEFAULT_DEPOSIT_METHODS);
    return DEFAULT_DEPOSIT_METHODS;
  } catch (err) {
    console.error('Error reading deposit methods:', err);
    return DEFAULT_DEPOSIT_METHODS;
  }
}

export function saveDepositMethods(methods: DepositMethodItem[]): void {
  try {
    if (!fs.existsSync(HOSTED_BOTS_DIR)) {
      fs.mkdirSync(HOSTED_BOTS_DIR, { recursive: true });
    }
    fs.writeFileSync(DEPOSIT_METHODS_FILE, JSON.stringify(methods, null, 2) + '\n', 'utf-8');
    FirebaseSync.syncDepositMethodsToCloud(methods).catch(() => {});
  } catch (err) {
    console.error('Error saving deposit methods:', err);
  }
}

export function addOrUpdateDepositMethod(item: DepositMethodItem): DepositMethodItem[] {
  const list = getDepositMethods();
  const index = list.findIndex((m) => m.id === item.id);
  if (index >= 0) {
    list[index] = { ...list[index], ...item };
  } else {
    list.push(item);
  }
  saveDepositMethods(list);
  return list;
}

export function deleteDepositMethod(id: string): DepositMethodItem[] {
  const list = getDepositMethods();
  const filtered = list.filter((m) => m.id !== id);
  saveDepositMethods(filtered);
  return filtered;
}

export function resetDepositMethods(): DepositMethodItem[] {
  saveDepositMethods(DEFAULT_DEPOSIT_METHODS);
  return DEFAULT_DEPOSIT_METHODS;
}
