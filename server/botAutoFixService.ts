import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import AdmZip from 'adm-zip';

// 1x1 transparent PNG buffer for placeholder image generation
const TRANSPARENT_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const DUMMY_PNG_BUFFER = Buffer.from(TRANSPARENT_PNG_BASE64, 'base64');

// 1x1 valid minimal JPEG buffer for Telegram photo compatibility (has valid SOI, SOF0, SOS, EOI markers)
const DUMMY_JPEG_BUFFER = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64'
);

// Comprehensive Python library mappings from import statements
const IMPORT_TO_PACKAGE: Record<string, string> = {
  telebot: 'pyTelegramBotAPI',
  telegram: 'python-telegram-bot[all]',
  aiogram: 'aiogram',
  pyrogram: 'pyrogram',
  telethon: 'telethon',
  requests: 'requests',
  aiohttp: 'aiohttp',
  httpx: 'httpx[http2]',
  h2: 'h2',
  pyotp: 'pyotp',
  dotenv: 'python-dotenv',
  pytz: 'pytz',
  PIL: 'Pillow',
  bs4: 'beautifulsoup4',
  qrcode: 'qrcode',
  flask: 'flask',
  fastapi: 'fastapi',
  uvicorn: 'uvicorn',
  schedule: 'schedule',
  pymongo: 'pymongo',
  redis: 'redis',
  asyncpg: 'asyncpg',
  psycopg2: 'psycopg2-binary',
  cryptography: 'cryptography',
  web3: 'web3',
  googletrans: 'googletrans==4.0.0-rc1',
  yt_dlp: 'yt-dlp',
  feedparser: 'feedparser',
  psutil: 'psutil',
  dateutil: 'python-dateutil',
  yaml: 'pyyaml',
  cv2: 'opencv-python-headless',
  motor: 'motor',
  pydantic: 'pydantic',
  humanize: 'humanize',
  tabulate: 'tabulate',
  colorama: 'colorama',
  rich: 'rich',
  tqdm: 'tqdm',
  openpyxl: 'openpyxl',
  websocket: 'websocket-client',
  attr: 'attrs',
  attrs: 'attrs',
  fake_useragent: 'fake-useragent',
  cloudscraper: 'cloudscraper'
};

// Python built-in modules to ignore
const BUILT_IN_MODULES = new Set([
  'os', 'sys', 're', 'time', 'datetime', 'math', 'random', 'json', 'sqlite3',
  'urllib', 'http', 'collections', 'itertools', 'functools', 'logging',
  'threading', 'multiprocessing', 'asyncio', 'typing', 'pathlib', 'io',
  'string', 'shutil', 'tempfile', 'subprocess', 'hashlib', 'base64', 'uuid',
  'ssl', 'socket', 'pickle', 'csv', 'traceback', 'copy', 'inspect', 'platform',
  'glob', 'signal', 'operator', 'queue', 'select', 'gc', 'mimetypes', 'enum',
  'struct', 'binascii', 'zlib', 'gzip', 'tarfile', 'zipfile', 'xml', 'secrets'
]);

export interface AutoFixResult {
  fixesApplied: string[];
  resolvedEntry: string;
  detectedPackages: string[];
  createdFolders: string[];
  createdFiles: string[];
  detectedToken?: string;
}

/**
 * Safely extracts a zip archive using AdmZip, with fallbacks to python zipfile and unzip.
 */
export function extractZipSafely(zipPath: string, destDir: string): boolean {
  try {
    fs.mkdirSync(destDir, { recursive: true });
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(destDir, true);
    return true;
  } catch (err: any) {
    console.warn('AdmZip extract failed, trying python zipfile fallback:', err?.message);
    try {
      execSync(`python3 -m zipfile -e "${zipPath}" "${destDir}"`);
      return true;
    } catch (err2: any) {
      console.warn('Python zipfile extract failed, trying unzip fallback:', err2?.message);
      try {
        execSync(`unzip -o -q "${zipPath}" -d "${destDir}"`);
        return true;
      } catch (err3: any) {
        console.error('All zip extraction methods failed:', err3?.message);
        return false;
      }
    }
  }
}

/**
 * Cleans macOS/Windows junk files and flattens nested repo folders (e.g. MyBot-main/).
 */
export function unpackAndCleanDirectory(botDir: string): string[] {
  const fixes: string[] = [];

  // 1. Remove garbage folders/files
  const junkPatterns = ['__MACOSX', '.DS_Store', 'Thumbs.db', '.git'];
  for (const junk of junkPatterns) {
    const junkPath = path.join(botDir, junk);
    if (fs.existsSync(junkPath)) {
      try {
        fs.rmSync(junkPath, { recursive: true, force: true });
      } catch {}
    }
  }

  // 2. Recursively check if root has only 1 directory containing the actual files
  try {
    let items = fs.readdirSync(botDir).filter((f) => f !== '_archive.zip' && !f.startsWith('.'));
    while (items.length === 1) {
      const singleItem = path.join(botDir, items[0]);
      if (fs.existsSync(singleItem) && fs.statSync(singleItem).isDirectory()) {
        const subItems = fs.readdirSync(singleItem);
        for (const sub of subItems) {
          const src = path.join(singleItem, sub);
          const dest = path.join(botDir, sub);
          if (!fs.existsSync(dest)) {
            fs.renameSync(src, dest);
          } else {
            // Merge or overwrite
            try {
              if (fs.statSync(src).isDirectory()) {
                // If directory, copy contents
                const inner = fs.readdirSync(src);
                for (const inn of inner) {
                  const innSrc = path.join(src, inn);
                  const innDest = path.join(dest, inn);
                  if (!fs.existsSync(innDest)) {
                    fs.renameSync(innSrc, innDest);
                  }
                }
              }
            } catch {}
          }
        }
        try { fs.rmSync(singleItem, { recursive: true, force: true }); } catch {}
        fixes.push('📁 নেস্টেড সাব-ফোল্ডার আনপ্যাক করে রুট ফোল্ডারে আনা হয়েছে (Unpacked nested folder to root)');
        items = fs.readdirSync(botDir).filter((f) => f !== '_archive.zip' && !f.startsWith('.'));
      } else {
        break;
      }
    }
  } catch (err) {
    console.error('Directory unpack error:', err);
  }

  return fixes;
}

/**
 * Scans a bot directory, detects missing photos/assets, data files, configs,
 * dependencies (requirements.txt), and fixes them automatically in 1-click.
 */
export function scanAndAutoFixBotDirectory(
  botDir: string,
  options?: { defaultToken?: string; requestedEntry?: string }
): AutoFixResult {
  const fixesApplied: string[] = [];
  const detectedPackages: string[] = [];
  const createdFolders: string[] = [];
  const createdFiles: string[] = [];
  let foundToken: string | undefined = options?.defaultToken?.trim();

  if (!fs.existsSync(botDir)) {
    return {
      fixesApplied: ['Bot directory not found'],
      resolvedEntry: 'bot.py',
      detectedPackages: [],
      createdFolders: [],
      createdFiles: []
    };
  }

  // 1. Unpack single nested folder if any & clean junk files
  const unpackFixes = unpackAndCleanDirectory(botDir);
  fixesApplied.push(...unpackFixes);

  // Collect all files recursively in the bot directory
  const allBotFiles: string[] = [];
  function walkDir(current: string) {
    try {
      const items = fs.readdirSync(current);
      for (const item of items) {
        if (item === '__pycache__' || item === '.git' || item === 'node_modules' || item === '.venv' || item === '__MACOSX') continue;
        const full = path.join(current, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          walkDir(full);
        } else {
          allBotFiles.push(full);
        }
      }
    } catch {}
  }
  walkDir(botDir);

  // 2. Scan Python files for imports, referenced paths, token, and bot signatures
  const neededImports = new Set<string>();
  const referencedPaths = new Set<string>();
  const referencedFolders = new Set<string>(['photos', 'images', 'assets', 'data', 'downloads', 'media']);
  const pythonFiles: { relPath: string; fullPath: string; isBotMain: boolean; score: number }[] = [];

  for (const filePath of allBotFiles) {
    if (filePath.endsWith('.py')) {
      const relPath = path.relative(botDir, filePath);
      let isBotMain = false;
      let score = 0;

      try {
        const code = fs.readFileSync(filePath, 'utf-8');

        // Check for Telegram Bot signatures
        if (/import\s+telebot|from\s+telebot/i.test(code)) { score += 10; isBotMain = true; }
        if (/import\s+telegram|from\s+telegram/i.test(code)) { score += 10; isBotMain = true; }
        if (/import\s+aiogram|from\s+aiogram/i.test(code)) { score += 10; isBotMain = true; }
        if (/import\s+pyrogram|from\s+pyrogram/i.test(code)) { score += 10; isBotMain = true; }
        if (/import\s+telethon|from\s+telethon/i.test(code)) { score += 10; isBotMain = true; }
        if (/polling|run_polling|infinity_polling|start_polling/i.test(code)) { score += 15; isBotMain = true; }
        if (/TeleBot\(|ApplicationBuilder\(|Updater\(|Bot\(|Dispatcher\(/i.test(code)) { score += 15; isBotMain = true; }
        if (/CommandHandler|MessageHandler|CallbackQueryHandler/i.test(code)) { score += 10; isBotMain = true; }
        if (/on_message|message_handler/i.test(code)) { score += 8; isBotMain = true; }

        // Prefer files named bot.py, main.py, app.py, run.py
        const baseName = path.basename(filePath).toLowerCase();
        if (baseName === 'bot.py') score += 20;
        else if (baseName === 'main.py') score += 18;
        else if (baseName === 'app.py') score += 15;
        else if (baseName === 'run.py') score += 14;
        else if (baseName === 'server.py') score += 10;

        pythonFiles.push({ relPath, fullPath: filePath, isBotMain, score });

        // Check if token exists in code if we don't have one yet
        if (!foundToken) {
          const tokenMatch = code.match(/["']([0-9]{8,14}:[a-zA-Z0-9_-]{25,50})["']/);
          if (tokenMatch && tokenMatch[1]) {
            foundToken = tokenMatch[1];
          }
        }

        // Regex for imports: "import xyz" or "from xyz import ..."
        const importMatches = code.matchAll(/(?:^|\n)\s*(?:import|from)\s+([a-zA-Z0-9_]+)/g);
        for (const match of importMatches) {
          const mod = match[1];
          if (!BUILT_IN_MODULES.has(mod)) {
            // Check if this module is a local file in botDir
            const localPy = path.join(botDir, `${mod}.py`);
            const localDir = path.join(botDir, mod);
            if (!fs.existsSync(localPy) && !fs.existsSync(localDir)) {
              if (IMPORT_TO_PACKAGE[mod]) {
                neededImports.add(IMPORT_TO_PACKAGE[mod]);
              } else if (!mod.startsWith('_')) {
                neededImports.add(mod);
              }
            }
          }
        }

        // Regex for file opening / asset references:
        // open('photos/logo.png'), open('start.jpg'), open('data/users.json'), 'images/banner.jpg', etc.
        const pathMatches = code.matchAll(/['"]((?:photos?|images?|assets?|media|pics|pictures|banners?|downloads?|data|database)\/[a-zA-Z0-9_./-]+\.(?:png|jpg|jpeg|gif|webp|ico|svg|json|txt|db|sqlite|sqlite3|csv))['"]/gi);
        for (const pm of pathMatches) {
          referencedPaths.add(pm[1]);
        }

        // Regex for standalone image/photo references (e.g. 'start.jpg', 'welcome.png', 'banner.jpeg', open('photo.png'))
        const imageMatches = code.matchAll(/['"]([a-zA-Z0-9_.-]+\.(?:png|jpg|jpeg|gif|webp|ico|svg))['"]/gi);
        for (const im of imageMatches) {
          const imgName = im[1];
          if (!imgName.startsWith('http') && !imgName.includes('://')) {
            referencedPaths.add(imgName);
          }
        }

        // Regex for open() calls on any data or photo files
        const openMatches = code.matchAll(/open\s*\(\s*['"]([a-zA-Z0-9_./-]+\.(?:png|jpg|jpeg|gif|webp|ico|svg|json|txt|db|sqlite|sqlite3|csv))['"]/gi);
        for (const om of openMatches) {
          referencedPaths.add(om[1]);
        }

        // Regex for variable assignments holding filenames (e.g. USER_DATA_FILE = "users.json", CUSTOM_SERVICES_FILE = "custom_services.json")
        const varMatches = code.matchAll(/[A-Za-z0-9_]+\s*=\s*['"]([a-zA-Z0-9_./-]+\.(?:json|txt|db|sqlite|sqlite3|csv))['"]/gi);
        for (const vm of varMatches) {
          referencedPaths.add(vm[1]);
        }

        // Regex for standalone JSON references like 'users.json', 'datarange.json', 'custom_services.json'
        const jsonMatches = code.matchAll(/['"]([a-zA-Z0-9_-]+\.json)['"]/gi);
        for (const jm of jsonMatches) {
          referencedPaths.add(jm[1]);
        }

        // Regex for referenced directory names
        const folderMatches = code.matchAll(/['"]([a-zA-Z0-9_.-]+)\/['"]/g);
        for (const fm of folderMatches) {
          const fName = fm[1].toLowerCase();
          if (['photos', 'images', 'assets', 'media', 'data', 'database', 'downloads', 'temp', 'logs'].includes(fName)) {
            referencedFolders.add(fName);
          }
        }
      } catch (err) {
        console.error('Error scanning python file:', filePath, err);
      }
    }
  }

  // Check token in .env or config.json if still not found
  const envPath = path.join(botDir, '.env');
  if (!foundToken && fs.existsSync(envPath)) {
    try {
      const envRaw = fs.readFileSync(envPath, 'utf-8');
      const m = envRaw.match(/([0-9]{8,14}:[a-zA-Z0-9_-]{25,50})/);
      if (m && m[1]) foundToken = m[1];
    } catch {}
  }
  const configPath = path.join(botDir, 'config.json');
  if (!foundToken && fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (cfg.token && typeof cfg.token === 'string') foundToken = cfg.token;
      else if (cfg.bot_token && typeof cfg.bot_token === 'string') foundToken = cfg.bot_token;
    } catch {}
  }

  // 3. Auto-fix missing directories (especially photos, images, assets, data, downloads)
  ['photos', 'images', 'assets', 'data', 'downloads'].forEach((defFolder) => {
    referencedFolders.add(defFolder);
  });

  for (const folder of referencedFolders) {
    const targetDir = path.join(botDir, folder);
    if (!fs.existsSync(targetDir)) {
      try {
        fs.mkdirSync(targetDir, { recursive: true });
        createdFolders.push(`${folder}/`);
      } catch {}
    }
  }
  if (createdFolders.length > 0) {
    fixesApplied.push(`📸 মিসিং মিডিয়া/ফটো ও ডাটা ফোল্ডার তৈরি হয়েছে: ${createdFolders.join(', ')}`);
  }

  // 4. Auto-fix missing referenced files (Photos, JSONs, SQLite DBs)
  for (const relPath of referencedPaths) {
    const fullPath = path.join(botDir, relPath);
    if (!fs.existsSync(fullPath)) {
      try {
        const parentDir = path.dirname(fullPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }

        const ext = path.extname(relPath).toLowerCase();
        if (['.jpg', '.jpeg'].includes(ext)) {
          // Create standard valid JPEG image so Telegram send_photo never crashes
          fs.writeFileSync(fullPath, DUMMY_JPEG_BUFFER);
          createdFiles.push(relPath);
        } else if (['.png', '.webp', '.gif', '.ico', '.svg'].includes(ext)) {
          // Create placeholder PNG image so bot doesn't crash on FileNotFoundError
          fs.writeFileSync(fullPath, DUMMY_PNG_BUFFER);
          createdFiles.push(relPath);
        } else if (ext === '.json') {
          // Create valid JSON (never empty string)
          const lowerRel = relPath.toLowerCase();
          const initialContent = lowerRel.includes('config')
            ? JSON.stringify({ token: foundToken || '', admins: [], settings: {} }, null, 2)
            : lowerRel.includes('logs') || lowerRel.includes('banned') || lowerRel.includes('service')
            ? '[]'
            : lowerRel.includes('user') || lowerRel.includes('data') || lowerRel.includes('range') || lowerRel.includes('stats') || lowerRel.includes('withdraw') || lowerRel.includes('settings')
            ? '{}'
            : '{}';
          fs.writeFileSync(fullPath, initialContent, 'utf-8');
          createdFiles.push(relPath);
        } else if (['.db', '.sqlite', '.sqlite3'].includes(ext)) {
          // Create empty db file
          fs.writeFileSync(fullPath, '', 'utf-8');
          createdFiles.push(relPath);
        } else if (ext === '.txt' || ext === '.csv') {
          fs.writeFileSync(fullPath, '', 'utf-8');
          createdFiles.push(relPath);
        }
      } catch (err) {
        console.error('Error creating placeholder file:', relPath, err);
      }
    }
  }

  // Ensure standard default JSON files always exist with valid JSON
  const standardJsons = [
    'users.json',
    'user_stats.json',
    'paid_sms.json',
    'banned_users.json',
    'activity_logs.json',
    'referral_data.json',
    'withdraw_requests.json',
    'datarange.json',
    'custom_services.json',
    'bot_settings.json'
  ];
  for (const sj of standardJsons) {
    const p = path.join(botDir, sj);
    if (!fs.existsSync(p)) {
      try {
        const isArr = sj.includes('logs') || sj.includes('banned') || sj.includes('service');
        fs.writeFileSync(p, isArr ? '[]' : '{}', 'utf-8');
        createdFiles.push(sj);
      } catch {}
    }
  }

  const createdPhotos = createdFiles.filter((f) => /\.(png|jpg|jpeg|gif|webp|ico|svg)$/i.test(f));
  const createdDataFiles = createdFiles.filter((f) => !/\.(png|jpg|jpeg|gif|webp|ico|svg)$/i.test(f));

  if (createdPhotos.length > 0) {
    fixesApplied.push(`📸 মিসিং ফটো/ইমেজ ফাইল স্বয়ংক্রিয়ভাবে তৈরি করা হয়েছে (${createdPhotos.length}টি)`);
  }
  if (createdDataFiles.length > 0) {
    fixesApplied.push(`💾 মিসিং ডাটাবেজ ফাইল ফিক্স করা হয়েছে: ${createdDataFiles.slice(0, 4).join(', ')}`);
  }

  // 5. Auto-fix dependencies & requirements.txt
  const reqPath = path.join(botDir, 'requirements.txt');
  let existingRequirements = '';
  if (fs.existsSync(reqPath)) {
    existingRequirements = fs.readFileSync(reqPath, 'utf-8');
  }

  // Default to pyTelegramBotAPI if no bot framework detected
  if (neededImports.size === 0) {
    neededImports.add('pyTelegramBotAPI');
    neededImports.add('requests');
  }

  const packagesToAdd: string[] = [];
  for (const pkg of neededImports) {
    detectedPackages.push(pkg);
    const basePkg = pkg.split('==')[0].toLowerCase();
    if (!existingRequirements.toLowerCase().includes(basePkg)) {
      packagesToAdd.push(pkg);
    }
  }

  if (packagesToAdd.length > 0) {
    const updatedReq = (existingRequirements.trim() + '\n' + packagesToAdd.join('\n')).trim() + '\n';
    fs.writeFileSync(reqPath, updatedReq, 'utf-8');
    fixesApplied.push(`📦 ডিপেনডেন্সি অটো-আপডেট হয়েছে (requirements.txt): ${packagesToAdd.slice(0, 5).join(', ')}${packagesToAdd.length > 5 ? ` (+${packagesToAdd.length - 5})` : ''}`);
  }

  // 6. Auto-fix .env & Token injection
  if (foundToken) {
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
    let updatedEnv = false;
    const standardKeys = ['BOT_TOKEN', 'TOKEN', 'TELEGRAM_BOT_TOKEN', 'API_TOKEN', 'TELEGRAM_TOKEN'];
    for (const key of standardKeys) {
      if (!envContent.includes(`${key}=`)) {
        envContent += `\n${key}=${foundToken}`;
        updatedEnv = true;
      }
    }
    if (updatedEnv) {
      fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
      fixesApplied.push('🔑 টেলিগ্রাম বট টোকেন এনভায়রনমেন্ট ফাইলে (.env) স্বয়ংক্রিয়ভাবে সিঙ্ক করা হয়েছে');
    }

    // Also update config.json if present and empty
    if (fs.existsSync(configPath)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        let cfgUpdated = false;
        if (!cfg.token || cfg.token.includes('YOUR_') || cfg.token.trim() === '') {
          cfg.token = foundToken;
          cfgUpdated = true;
        }
        if (!cfg.bot_token || cfg.bot_token.includes('YOUR_') || cfg.bot_token.trim() === '') {
          cfg.bot_token = foundToken;
          cfgUpdated = true;
        }
        if (cfgUpdated) {
          fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8');
          fixesApplied.push('⚙️ config.json এ টেলিগ্রাম টোকেন সিঙ্ক করা হয়েছে');
        }
      } catch {}
    }
  }

  // 7. Resolve entry script accurately
  let resolvedEntry = options?.requestedEntry || 'bot.py';

  // Check if requested entry actually exists
  if (!fs.existsSync(path.join(botDir, resolvedEntry))) {
    // Sort pythonFiles by score descending
    pythonFiles.sort((a, b) => b.score - a.score);

    if (pythonFiles.length > 0) {
      resolvedEntry = pythonFiles[0].relPath;
      fixesApplied.push(`🚀 মেইন স্ক্রিপ্ট ফাইল অটো সনাক্ত করা হয়েছে: ${resolvedEntry}`);
    } else {
      // Check standard names
      const fallbacks = ['bot.py', 'main.py', 'app.py', 'run.py', 'server.py'];
      const found = fallbacks.find((f) => fs.existsSync(path.join(botDir, f)));
      if (found) {
        resolvedEntry = found;
        fixesApplied.push(`🚀 মেইন স্ক্রিপ্ট ফাইল সনাক্ত করা হয়েছে: ${resolvedEntry}`);
      }
    }
  }

  // If entry file still does not exist, create a safe fallback
  const finalEntryPath = path.join(botDir, resolvedEntry);
  if (!fs.existsSync(finalEntryPath)) {
    fs.writeFileSync(
      finalEntryPath,
      `# Auto-generated entry point for Telegram Bot\nimport os\nimport time\nprint("Telegram Bot Started and running 24/7...")\nwhile True:\n    time.sleep(60)\n`,
      'utf-8'
    );
    fixesApplied.push(`📄 এন্ট্রি স্ক্রিপ্ট ফাইল (${resolvedEntry}) তৈরি করা হয়েছে`);
  }

  return {
    fixesApplied,
    resolvedEntry,
    detectedPackages,
    createdFolders,
    createdFiles,
    detectedToken: foundToken
  };
}

/**
 * Inspects a base64-encoded zip file in a temporary folder, applies fixes,
 * and returns details so the user can preview missing data and fixes in 1-click!
 */
export function inspectZipAndDetectMissing(
  zipBase64: string,
  options?: { defaultToken?: string; requestedEntry?: string }
): {
  success: boolean;
  fixes: string[];
  resolvedEntry: string;
  detectedPackages: string[];
  createdFolders: string[];
  createdFiles: string[];
  filesInZip: string[];
  detectedToken?: string;
} {
  const tempDir = path.join('/tmp', `bot-inspect-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
  try {
    fs.mkdirSync(tempDir, { recursive: true });
    const zipPath = path.join(tempDir, 'inspect.zip');
    fs.writeFileSync(zipPath, Buffer.from(zipBase64, 'base64'));

    const extracted = extractZipSafely(zipPath, tempDir);
    if (!extracted) {
      return {
        success: false,
        fixes: ['জিপ ফাইল আনজিপ করতে সমস্যা হয়েছে। অনুগ্রহ করে একটি বৈধ জিপ ফাইল আপলোড করুন।'],
        resolvedEntry: options?.requestedEntry || 'bot.py',
        detectedPackages: [],
        createdFolders: [],
        createdFiles: [],
        filesInZip: []
      };
    }

    try { fs.unlinkSync(zipPath); } catch {}

    const filesInZip: string[] = [];
    function scanTemp(dir: string, prefix = '') {
      try {
        const items = fs.readdirSync(dir);
        for (const it of items) {
          const full = path.join(dir, it);
          const rel = prefix ? `${prefix}/${it}` : it;
          if (fs.statSync(full).isDirectory()) {
            scanTemp(full, rel);
          } else {
            filesInZip.push(rel);
          }
        }
      } catch {}
    }
    scanTemp(tempDir);

    const fixResult = scanAndAutoFixBotDirectory(tempDir, options);

    return {
      success: true,
      fixes: fixResult.fixesApplied,
      resolvedEntry: fixResult.resolvedEntry,
      detectedPackages: fixResult.detectedPackages,
      createdFolders: fixResult.createdFolders,
      createdFiles: fixResult.createdFiles,
      filesInZip,
      detectedToken: fixResult.detectedToken
    };
  } catch (err: any) {
    return {
      success: false,
      fixes: ['স্ক্যানিং এরর: ' + (err.message || 'Error inspecting zip')],
      resolvedEntry: options?.requestedEntry || 'bot.py',
      detectedPackages: [],
      createdFolders: [],
      createdFiles: [],
      filesInZip: []
    };
  } finally {
    // Clean up temporary inspection folder
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}
  }
}
