import fs from 'fs';
import path from 'path';
import { WalletTransaction } from '../src/types';

const HOSTED_BOTS_DIR = path.join(process.cwd(), 'hosted_bots');
const TRANSACTIONS_FILE = path.join(HOSTED_BOTS_DIR, 'wallet_transactions.json');
const ACCOUNTS_FILE = path.join(HOSTED_BOTS_DIR, 'accounts.json');

export function getTransactions(): WalletTransaction[] {
  try {
    if (!fs.existsSync(HOSTED_BOTS_DIR)) {
      fs.mkdirSync(HOSTED_BOTS_DIR, { recursive: true });
    }
    if (fs.existsSync(TRANSACTIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf-8'));
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.error('Error loading wallet_transactions.json:', err);
  }
  return [];
}

export function saveTransactions(transactions: WalletTransaction[]): void {
  try {
    if (!fs.existsSync(HOSTED_BOTS_DIR)) {
      fs.mkdirSync(HOSTED_BOTS_DIR, { recursive: true });
    }
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving wallet_transactions.json:', err);
  }
}

function getAccounts(): any[] {
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'));
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.error('Error reading accounts.json:', err);
  }
  return [];
}

function saveAccounts(accounts: any[]): void {
  try {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing accounts.json:', err);
  }
}

/**
 * Atomically modify a user's USD wallet balance and record a ledger transaction
 */
export function modifyUserWallet(
  userId: string,
  amount: number,
  type: WalletTransaction['type'],
  description: string,
  source: string,
  referenceId?: string
): { success: boolean; newBalanceUsd?: number; transaction?: WalletTransaction; error?: string } {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { success: false, error: 'অবৈধ টাকার পরিমাণ (Invalid amount)' };
  }

  const accounts = getAccounts();
  const user = accounts.find((a) => a.id === userId || (a.email && a.email.toLowerCase() === userId.toLowerCase()));
  if (!user) {
    return { success: false, error: 'ইউজার খুঁজে পাওয়া যায়নি (User not found)' };
  }

  const currentBalance = typeof user.balanceUsd === 'number' ? user.balanceUsd : 0;
  const newBalance = parseFloat((currentBalance + amount).toFixed(4));

  // If deducting, balance cannot fall below 0
  if (amount < 0 && newBalance < 0) {
    return {
      success: false,
      error: `অপর্যাপ্ত USD ব্যালেন্স! প্রয়োজন: $${Math.abs(amount).toFixed(2)}, বর্তমান ব্যালেন্স: $${currentBalance.toFixed(2)}`
    };
  }

  user.balanceUsd = Math.max(0, newBalance);
  saveAccounts(accounts);

  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const transaction: WalletTransaction = {
    id: txId,
    userId: user.id,
    userEmail: user.email,
    type,
    amount,
    balanceBefore: currentBalance,
    balanceAfter: user.balanceUsd,
    description,
    timestamp: new Date().toISOString(),
    status: 'completed',
    source,
    referenceId: referenceId || txId
  };

  const transactions = getTransactions();
  transactions.unshift(transaction);
  if (transactions.length > 2000) transactions.splice(2000);
  saveTransactions(transactions);

  return {
    success: true,
    newBalanceUsd: user.balanceUsd,
    transaction
  };
}

/**
 * Get transactions filtered by user ID or user email
 */
export function getUserTransactions(userId: string, userEmail?: string): WalletTransaction[] {
  const all = getTransactions();
  const lowerEmail = (userEmail || '').toLowerCase();
  return all.filter((tx) => tx.userId === userId || (lowerEmail && tx.userEmail?.toLowerCase() === lowerEmail));
}
