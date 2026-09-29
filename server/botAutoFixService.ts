import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// 1x1 transparent PNG buffer for placeholder image generation
const TRANSPARENT_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const DUMMY_PNG_BUFFER = Buffer.from(TRANSPARENT_PNG_BASE64, 'base64');

// Common Python library mappings from import statements
const IMPORT_TO_PACKAGE: Record<string, string> = {
  telebot: 'pyTelegramBotAPI',
  telegram: 'python-telegram-bot',
  aiogram: 'aiogram',
  pyrogram: 'pyrogram',
  requests: 'requests',
  aiohttp: 'aiohttp',
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
  feedparser: 'feedparser'
};

// Python built-in modules to ignore
const BUILT_IN_MODULES = new Set([
  'os', 'sys', 're', 'time', 'datetime', 'math', 'random', 'json', 'sqlite3',
  'urllib', 'http', 'collections', 'itertools', 'functools', 'logging',
  'threading', 'multiprocessing', 'asyncio', 'typing', 'pathlib', 'io',
  'string', 'shutil', 'tempfile', 'subprocess', 'hashlib', 'base64', 'uuid',
  'ssl', 'socket', 'pickle', 'csv', 'traceback', 'copy', 'inspect', 'platform'
]);

export interface AutoFixResult {
  fixesApplied: string[];
  resolvedEntry: string;
  detectedPackages: string[];
  createdFolders: string[];
  createdFiles: string[];
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

  if (!fs.existsSync(botDir)) {
    return {
      fixesApplied: ['Bot directory not found'],
      resolvedEntry: 'bot.py',
      detectedPackages: [],
      createdFolders: [],
      createdFiles: []
    };
  }

  // 1. Flatten single nested folder if any (e.g. MyBot-main/)
  try {
    const rootItems = fs.readdirSync(botDir).filter((f) => f !== '_archive.zip');
    if (rootItems.length === 1) {
      const nestedPath = path.join(botDir, rootItems[0]);
      if (fs.statSync(nestedPath).isDirectory()) {
        const subItems = fs.readdirSync(nestedPath);
        for (const sub of subItems) {
          const src = path.join(nestedPath, sub);
          const dest = path.join(botDir, sub);
          if (!fs.existsSync(dest)) {
            fs.renameSync(src, dest);
          }
        }
        try { fs.rmdirSync(nestedPath); } catch {}
        fixesApplied.push('📁 নেস্টেড ফোল্ডার আনপ্যাক করে রুট ফোল্ডারে আনা হয়েছে (Unpacked nested folder)');
      }
    }
  } catch (err) {
    console.error('Flatten nested error:', err);
  }

  // Collect all files recursively in the bot directory
  const allBotFiles: string[] = [];
  function walkDir(current: string) {
    try {
      const items = fs.readdirSync(current);
      for (const item of items) {
        if (item === '__pycache__' || item === '.git' || item === 'node_modules' || item === '.venv') continue;
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

  // 2. Scan Python files for imports and referenced paths (photos, data, config, etc.)
  const neededImports = new Set<string>();
  const referencedPaths = new Set<string>();
  const referencedFolders = new Set<string>(['photos', 'images', 'assets', 'data']);

  for (const filePath of allBotFiles) {
    if (filePath.endsWith('.py')) {
      try {
        const code = fs.readFileSync(filePath, 'utf-8');

        // Regex for imports: "import xyz" or "from xyz import ..."
        const importMatches = code.matchAll(/(?:^|\n)\s*(?:import|from)\s+([a-zA-Z0-9_]+)/g);
        for (const match of importMatches) {
          const mod = match[1];
          if (!BUILT_IN_MODULES.has(mod) && IMPORT_TO_PACKAGE[mod]) {
            neededImports.add(IMPORT_TO_PACKAGE[mod]);
          }
        }

        // Regex for file opening / asset references:
        // open('photos/logo.png'), open('data/users.json'), 'images/banner.jpg', etc.
        const pathMatches = code.matchAll(/['"]((?:photos?|images?|assets?|media|pics|pictures|banners?|downloads?|data|database)\/[a-zA-Z0-9_./-]+\.(?:png|jpg|jpeg|gif|webp|ico|svg|json|txt|db|sqlite|sqlite3|csv))['"]/gi);
        for (const pm of pathMatches) {
          referencedPaths.add(pm[1]);
        }

        // Regex for standalone JSON references like open('users.json') or open('config.json')
        const jsonMatches = code.matchAll(/open\s*\(\s*['"]([a-zA-Z0-9_-]+\.json)['"]/gi);
        for (const jm of jsonMatches) {
          referencedPaths.add(jm[1]);
        }

        // Regex for referenced directory names
        const folderMatches = code.matchAll(/['"]([a-zA-Z0-9_.-]+)\/['"]/g);
        for (const fm of folderMatches) {
          const fName = fm[1].toLowerCase();
          if (['photos', 'images', 'assets', 'media', 'data', 'database', 'downloads', 'temp'].includes(fName)) {
            referencedFolders.add(fName);
          }
        }
      } catch (err) {
        console.error('Error scanning python file:', filePath, err);
      }
    }
  }

  // 3. Auto-fix missing directories (especially photos, images, assets, data)
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
    fixesApplied.push(`📸 মিসিং মিডিয়া/ফটো ফোল্ডার তৈরি হয়েছে: ${createdFolders.join(', ')}`);
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
        if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.svg'].includes(ext)) {
          // Create placeholder image so bot doesn't crash on FileNotFoundError
          fs.writeFileSync(fullPath, DUMMY_PNG_BUFFER);
          createdFiles.push(relPath);
        } else if (ext === '.json') {
          // Create empty valid JSON
          const initialContent = relPath.toLowerCase().includes('config')
            ? JSON.stringify({ token: options?.defaultToken || '', admins: [], settings: {} }, null, 2)
            : relPath.toLowerCase().includes('user') || relPath.toLowerCase().includes('data')
            ? JSON.stringify({}, null, 2)
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
  if (createdFiles.length > 0) {
    fixesApplied.push(`🖼️ মিসিং ফটো/ডাটা ফাইল ফিক্স করা হয়েছে: ${createdFiles.slice(0, 5).join(', ')}${createdFiles.length > 5 ? ` (+${createdFiles.length - 5} more)` : ''}`);
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
    fixesApplied.push(`📦 ডিপেনডেন্সি অটো-জেনারেট/আপডেট হয়েছে (requirements.txt): ${packagesToAdd.join(', ')}`);
  }

  // 6. Auto-fix .env & Token injection
  const effectiveToken = (options?.defaultToken || '').trim();
  const envPath = path.join(botDir, '.env');
  if (effectiveToken) {
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
    if (!envContent.includes(effectiveToken)) {
      envContent += `\nBOT_TOKEN=${effectiveToken}\nTOKEN=${effectiveToken}\nTELEGRAM_BOT_TOKEN=${effectiveToken}\n`;
      fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
      fixesApplied.push('🔑 টেলিগ্রাম বট টোকেন এনভায়রনমেন্ট ফাইলে (.env) স্বয়ংক্রিয়ভাবে সিঙ্ক করা হয়েছে');
    }
  }

  // 7. Resolve entry script
  let resolvedEntry = options?.requestedEntry || 'bot.py';
  if (!fs.existsSync(path.join(botDir, resolvedEntry))) {
    if (fs.existsSync(path.join(botDir, 'bot.py'))) {
      resolvedEntry = 'bot.py';
    } else if (fs.existsSync(path.join(botDir, 'main.py'))) {
      resolvedEntry = 'main.py';
    } else if (fs.existsSync(path.join(botDir, 'app.py'))) {
      resolvedEntry = 'app.py';
    } else if (fs.existsSync(path.join(botDir, 'run.py'))) {
      resolvedEntry = 'run.py';
    } else {
      const topPyFiles = fs.readdirSync(botDir).filter((f) => f.endsWith('.py'));
      if (topPyFiles.length > 0) {
        resolvedEntry = topPyFiles[0];
      }
    }
    if (resolvedEntry !== options?.requestedEntry) {
      fixesApplied.push(`🚀 মেইন স্ক্রিপ্ট ফাইল অটো সনাক্ত করা হয়েছে: ${resolvedEntry}`);
    }
  }

  // If entry file still does not exist, create a safe fallback
  const finalEntryPath = path.join(botDir, resolvedEntry);
  if (!fs.existsSync(finalEntryPath)) {
    fs.writeFileSync(
      finalEntryPath,
      `# Auto-generated entry point for Telegram Bot\nimport os\nprint("Telegram Bot Running...")\n`,
      'utf-8'
    );
    fixesApplied.push(`📄 এন্ট্রি স্ক্রিপ্ট ফাইল (${resolvedEntry}) তৈরি করা হয়েছে`);
  }

  return {
    fixesApplied,
    resolvedEntry,
    detectedPackages,
    createdFolders,
    createdFiles
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
} {
  const tempDir = path.join('/tmp', `bot-inspect-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
  try {
    fs.mkdirSync(tempDir, { recursive: true });
    const zipPath = path.join(tempDir, 'inspect.zip');
    fs.writeFileSync(zipPath, Buffer.from(zipBase64, 'base64'));

    try {
      execSync(`python3 -m zipfile -e "${zipPath}" "${tempDir}"`);
    } catch (e: any) {
      return {
        success: false,
        fixes: ['জিপ ফাইল আনজিপ করতে সমস্যা হয়েছে: ' + (e.message || 'Invalid ZIP archive')],
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
      filesInZip
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
