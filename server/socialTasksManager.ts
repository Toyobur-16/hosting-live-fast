import fs from 'fs';
import path from 'path';
import { FirebaseSync } from './firebaseSync';
import { modifyUserWallet } from './walletManager';

export type SocialPlatform =
  | 'telegram'
  | 'youtube'
  | 'facebook'
  | 'instagram'
  | 'twitter'
  | 'tiktok'
  | 'website'
  | 'discord'
  | 'custom';

export interface SocialTask {
  id: string;
  platform: SocialPlatform;
  title: string;
  titleBn?: string;
  description: string;
  descriptionBn?: string;
  link: string;
  rewardUsd: number;
  badgeText?: string;
  timerSeconds?: number;
  requiresProof?: boolean;
  enabled: boolean;
  order: number;
  totalCompletions: number;
  createdAt: string;
}

export interface TaskCompletionLog {
  id: string;
  taskId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  platform: SocialPlatform;
  taskTitle: string;
  rewardUsd: number;
  completedAt: string;
  proofNote?: string;
}

const HOSTED_BOTS_DIR = path.join(process.cwd(), 'hosted_bots');
const SOCIAL_TASKS_FILE = path.join(HOSTED_BOTS_DIR, 'social_tasks.json');
const TASK_COMPLETIONS_FILE = path.join(HOSTED_BOTS_DIR, 'task_completions.json');

export const DEFAULT_SOCIAL_TASKS: SocialTask[] = [
  {
    id: 'task_tg_channel',
    platform: 'telegram',
    title: 'Join Official Telegram Channel',
    titleBn: 'অফিসিয়াল টেলিগ্রাম চ্যানেলে জয়েন করুন',
    description: 'Join our announcement channel to get updates and hosting discounts.',
    descriptionBn: 'আমাদের অফিসিয়াল টেলিগ্রাম চ্যানেলে জয়েন হয়ে সকল আপডেট ও অফার পান।',
    link: 'https://t.me/hostinglivefast',
    rewardUsd: 0.05,
    badgeText: 'HOT',
    timerSeconds: 8,
    requiresProof: false,
    enabled: true,
    order: 1,
    totalCompletions: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: 'task_tg_group',
    platform: 'telegram',
    title: 'Join Telegram Community Group',
    titleBn: 'টেলিগ্রাম কমিউনিটি সাপোর্ট গ্রুপে জয়েন করুন',
    description: 'Join our active group for 24/7 community support and bot hosting help.',
    descriptionBn: '২৪/৭ সাপোর্ট ও আলোচনা করতে আমাদের টেলিগ্রাম গ্রুপে যুক্ত হোন।',
    link: 'https://t.me/toyoburrahman',
    rewardUsd: 0.03,
    badgeText: 'COMMUNITY',
    timerSeconds: 8,
    requiresProof: false,
    enabled: true,
    order: 2,
    totalCompletions: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: 'task_yt_sub',
    platform: 'youtube',
    title: 'Subscribe YouTube Channel',
    titleBn: 'অফিসিয়াল ইউটিউব চ্যানেলে সাবস্ক্রাইব করুন',
    description: 'Subscribe to our YouTube channel for Telegram bot tutorials and hosting guides.',
    descriptionBn: 'ইউটিউব চ্যানেলে সাবস্ক্রাইব করে বট ডেভেলপমেন্ট ও হোস্টিং টিউটোরিয়াল দেখুন।',
    link: 'https://youtube.com/@hostinglivefast',
    rewardUsd: 0.05,
    badgeText: 'POPULAR',
    timerSeconds: 10,
    requiresProof: false,
    enabled: true,
    order: 3,
    totalCompletions: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: 'task_fb_page',
    platform: 'facebook',
    title: 'Like & Follow Facebook Page',
    titleBn: 'ফেসবুক অফিসিয়াল পেজ লাইক ও ফলো করুন',
    description: 'Follow our official Facebook page for latest platform announcements.',
    descriptionBn: 'আমাদের অফিসিয়াল ফেসবুক পেজ লাইক ও ফলো করে সাথে থাকুন।',
    link: 'https://facebook.com/hostinglivefast',
    rewardUsd: 0.04,
    badgeText: 'EASY',
    timerSeconds: 8,
    requiresProof: false,
    enabled: true,
    order: 4,
    totalCompletions: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: 'task_insta_follow',
    platform: 'instagram',
    title: 'Follow on Instagram',
    titleBn: 'ইনস্টাগ্রামে ফলো করুন',
    description: 'Follow our Instagram profile for tech stories and behind-the-scenes.',
    descriptionBn: 'আমাদের ইনস্টাগ্রাম প্রোফাইল ফলো করুন।',
    link: 'https://instagram.com/hostinglivefast',
    rewardUsd: 0.03,
    badgeText: 'EASY',
    timerSeconds: 8,
    requiresProof: false,
    enabled: true,
    order: 5,
    totalCompletions: 0,
    createdAt: new Date().toISOString()
  }
];

if (!fs.existsSync(HOSTED_BOTS_DIR)) {
  fs.mkdirSync(HOSTED_BOTS_DIR, { recursive: true });
}

export function getSocialTasks(): SocialTask[] {
  try {
    if (fs.existsSync(SOCIAL_TASKS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SOCIAL_TASKS_FILE, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.error('Error reading social tasks:', err);
  }
  return DEFAULT_SOCIAL_TASKS;
}

export function saveSocialTasks(tasks: SocialTask[]): void {
  try {
    fs.writeFileSync(SOCIAL_TASKS_FILE, JSON.stringify(tasks, null, 2) + '\n', 'utf-8');
    // Sync with Firebase Firestore
    FirebaseSync.syncSocialTasksToCloud(tasks).catch(() => {});
  } catch (err) {
    console.error('Error saving social tasks:', err);
  }
}

export function getTaskCompletions(): TaskCompletionLog[] {
  try {
    if (fs.existsSync(TASK_COMPLETIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(TASK_COMPLETIONS_FILE, 'utf-8'));
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.error('Error reading task completions:', err);
  }
  return [];
}

export function saveTaskCompletions(logs: TaskCompletionLog[]): void {
  try {
    fs.writeFileSync(TASK_COMPLETIONS_FILE, JSON.stringify(logs, null, 2) + '\n', 'utf-8');
  } catch (err) {
    console.error('Error saving task completions:', err);
  }
}

export function getUserCompletedTaskIds(userId: string): string[] {
  if (!userId) return [];
  const logs = getTaskCompletions();
  return logs.filter((l) => l.userId === userId).map((l) => l.taskId);
}

export async function claimSocialTaskReward(
  userId: string,
  userName: string,
  userEmail: string,
  taskId: string,
  proofNote?: string
): Promise<{ success: boolean; task?: SocialTask; rewardUsd?: number; newBalance?: number; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User login required' };
  }

  const tasks = getSocialTasks();
  const task = tasks.find((t) => t.id === taskId);
  if (!task) {
    return { success: false, error: 'টাস্কটি খুঁজে পাওয়া যায়নি।' };
  }

  if (task.enabled === false) {
    return { success: false, error: 'এই টাস্কটি বর্তমানে বন্ধ রয়েছে।' };
  }

  const logs = getTaskCompletions();
  const alreadyDone = logs.some((l) => l.userId === userId && l.taskId === taskId);
  if (alreadyDone) {
    return { success: false, error: 'আপনি ইতিমধ্যে এই টাস্কটি সম্পন্ন করে রিওয়ার্ড গ্রহণ করেছেন।' };
  }

  const reward = typeof task.rewardUsd === 'number' && task.rewardUsd > 0 ? task.rewardUsd : 0.01;

  // Credit USD directly to user wallet
  const walletResult = modifyUserWallet(
    userId,
    reward,
    'task_reward',
    `সোশ্যাল টাস্ক রিওয়ার্ড: ${task.titleBn || task.title} (+${reward} USD)`,
    'reward'
  );

  if (!walletResult.success) {
    return { success: false, error: walletResult.error || 'ওয়ালেট ব্যালেন্স ক্রেডিট করতে সমস্যা হয়েছে।' };
  }

  // Increment completion counter on the task
  task.totalCompletions = (task.totalCompletions || 0) + 1;
  saveSocialTasks(tasks);

  // Add completion log
  const newLog: TaskCompletionLog = {
    id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    taskId: task.id,
    userId,
    userName: userName || 'User',
    userEmail: userEmail || '',
    platform: task.platform,
    taskTitle: task.titleBn || task.title,
    rewardUsd: reward,
    completedAt: new Date().toISOString(),
    proofNote: proofNote?.trim() || ''
  };

  logs.unshift(newLog);
  saveTaskCompletions(logs);

  return {
    success: true,
    task,
    rewardUsd: reward,
    newBalance: walletResult.newBalanceUsd
  };
}
