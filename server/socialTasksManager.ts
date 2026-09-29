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
  status: 'pending' | 'approved' | 'rejected';
  screenshotUrl?: string;
  proofNote?: string;
  submittedAt: string;
  completedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectReason?: string;
}

const HOSTED_BOTS_DIR = path.join(process.cwd(), 'hosted_bots');
const TASK_PROOFS_DIR = path.join(HOSTED_BOTS_DIR, 'task_proofs');
const SOCIAL_TASKS_FILE = path.join(HOSTED_BOTS_DIR, 'social_tasks.json');
const TASK_COMPLETIONS_FILE = path.join(HOSTED_BOTS_DIR, 'task_completions.json');

if (!fs.existsSync(TASK_PROOFS_DIR)) {
  fs.mkdirSync(TASK_PROOFS_DIR, { recursive: true });
}

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
      if (Array.isArray(data)) {
        return data.map((d: any) => ({
          ...d,
          status: d.status || 'approved',
          submittedAt: d.submittedAt || d.completedAt || new Date().toISOString()
        }));
      }
    }
  } catch (err) {
    console.error('Error reading task completions:', err);
  }
  return [];
}

export function saveTaskCompletions(logs: TaskCompletionLog[]): void {
  try {
    fs.writeFileSync(TASK_COMPLETIONS_FILE, JSON.stringify(logs, null, 2) + '\n', 'utf-8');
    FirebaseSync.syncTaskCompletionsToCloud(logs).catch(() => {});
  } catch (err) {
    console.error('Error saving task completions:', err);
  }
}

/**
 * Returns task IDs that this user has completed or has pending approval.
 * Rejected tasks are excluded so the user can re-try if they want.
 */
export function getUserCompletedTaskIds(userId: string): string[] {
  if (!userId) return [];
  const logs = getTaskCompletions();
  return logs
    .filter((l) => l.userId === userId && (l.status === 'pending' || l.status === 'approved'))
    .map((l) => l.taskId);
}

/**
 * Get all submissions by a specific user
 */
export function getUserTaskSubmissions(userId: string): TaskCompletionLog[] {
  if (!userId) return [];
  const logs = getTaskCompletions();
  return logs
    .filter((l) => l.userId === userId)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

/**
 * User submits task proof (screenshot + optional note) for Admin approval
 */
export async function submitSocialTaskProof(
  userId: string,
  userName: string,
  userEmail: string,
  taskId: string,
  screenshotDataUrl?: string,
  proofNote?: string
): Promise<{ success: boolean; submission?: TaskCompletionLog; error?: string }> {
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
  const existing = logs.find((l) => l.userId === userId && l.taskId === taskId && l.status !== 'rejected');
  if (existing) {
    if (existing.status === 'pending') {
      return { success: false, error: 'আপনি ইতিমধ্যে এই টাস্কের স্ক্রিনশট জমা দিয়েছেন। এডমিন পর্যালোচনার পর অ্যাপ্রুভ করা হবে।' };
    }
    return { success: false, error: 'আপনি ইতিমধ্যে এই টাস্কটি সম্পন্ন করে রিওয়ার্ড গ্রহণ করেছেন।' };
  }

  const reward = typeof task.rewardUsd === 'number' && task.rewardUsd > 0 ? task.rewardUsd : 0.01;
  const subId = `task_sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let screenshotUrl: string | undefined = undefined;

  // Save screenshot image file if base64 data URL provided
  if (screenshotDataUrl && typeof screenshotDataUrl === 'string' && screenshotDataUrl.startsWith('data:image')) {
    try {
      const match = screenshotDataUrl.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        const base64Data = match[2];
        const fileName = `${subId}.${ext}`;
        const filePath = path.join(TASK_PROOFS_DIR, fileName);
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        screenshotUrl = `/api/task-proofs/${fileName}`;
      } else {
        screenshotUrl = screenshotDataUrl;
      }
    } catch (err) {
      console.error('Failed to save screenshot file:', err);
      screenshotUrl = screenshotDataUrl;
    }
  } else if (screenshotDataUrl) {
    screenshotUrl = screenshotDataUrl;
  }

  const newSubmission: TaskCompletionLog = {
    id: subId,
    taskId: task.id,
    userId,
    userName: userName || 'User',
    userEmail: userEmail || '',
    platform: task.platform,
    taskTitle: task.titleBn || task.title,
    rewardUsd: reward,
    status: 'pending',
    screenshotUrl,
    proofNote: proofNote?.trim() || '',
    submittedAt: new Date().toISOString()
  };

  logs.unshift(newSubmission);
  saveTaskCompletions(logs);

  return {
    success: true,
    submission: newSubmission
  };
}

/**
 * Admin approves a task submission and credits USD to the user's wallet
 */
export async function approveSocialTaskSubmission(
  submissionId: string,
  reviewerName: string = 'Admin'
): Promise<{ success: boolean; submission?: TaskCompletionLog; newBalance?: number; error?: string }> {
  const logs = getTaskCompletions();
  const submission = logs.find((l) => l.id === submissionId);
  if (!submission) {
    return { success: false, error: 'সাবমিশন রেকর্ড পাওয়া যায়নি।' };
  }

  if (submission.status === 'approved') {
    return { success: false, error: 'এই টাস্কটি ইতিমধ্যে অ্যাপ্রুভ করা হয়েছে।' };
  }

  const reward = submission.rewardUsd || 0.01;

  // Credit USD to user wallet
  const walletResult = modifyUserWallet(
    submission.userId,
    reward,
    'task_reward',
    `সোশ্যাল টাস্ক অ্যাপ্রুভড: ${submission.taskTitle} (+${reward} USD)`,
    'reward'
  );

  if (!walletResult.success) {
    return { success: false, error: walletResult.error || 'ওয়ালেটে ব্যালেন্স ক্রেডিট করতে ব্যর্থ হয়েছে।' };
  }

  // Update status
  submission.status = 'approved';
  submission.completedAt = new Date().toISOString();
  submission.reviewedAt = new Date().toISOString();
  submission.reviewedBy = reviewerName;
  delete submission.rejectReason;

  // Increment totalCompletions on task
  const tasks = getSocialTasks();
  const task = tasks.find((t) => t.id === submission.taskId);
  if (task) {
    task.totalCompletions = (task.totalCompletions || 0) + 1;
    saveSocialTasks(tasks);
  }

  saveTaskCompletions(logs);

  return {
    success: true,
    submission,
    newBalance: walletResult.newBalanceUsd
  };
}

/**
 * Admin rejects a task submission
 */
export async function rejectSocialTaskSubmission(
  submissionId: string,
  reason: string,
  reviewerName: string = 'Admin'
): Promise<{ success: boolean; submission?: TaskCompletionLog; error?: string }> {
  const logs = getTaskCompletions();
  const submission = logs.find((l) => l.id === submissionId);
  if (!submission) {
    return { success: false, error: 'সাবমিশন রেকর্ড পাওয়া যায়নি।' };
  }

  submission.status = 'rejected';
  submission.reviewedAt = new Date().toISOString();
  submission.reviewedBy = reviewerName;
  submission.rejectReason = (reason || 'স্ক্রিনশট বা প্রুফ সঠিক নয়').trim();

  saveTaskCompletions(logs);

  return {
    success: true,
    submission
  };
}

// Keep legacy claimSocialTaskReward as an immediate claim wrapper if needed
export async function claimSocialTaskReward(
  userId: string,
  userName: string,
  userEmail: string,
  taskId: string,
  proofNote?: string
): Promise<{ success: boolean; task?: SocialTask; rewardUsd?: number; newBalance?: number; error?: string }> {
  const res = await submitSocialTaskProof(userId, userName, userEmail, taskId, undefined, proofNote);
  if (!res.success || !res.submission) {
    return { success: false, error: res.error };
  }
  const appRes = await approveSocialTaskSubmission(res.submission.id, 'System Auto-Approve');
  if (!appRes.success) {
    return { success: false, error: appRes.error };
  }
  const tasks = getSocialTasks();
  const task = tasks.find((t) => t.id === taskId);
  return {
    success: true,
    task,
    rewardUsd: res.submission.rewardUsd,
    newBalance: appRes.newBalance
  };
}
