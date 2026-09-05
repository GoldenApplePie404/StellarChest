// ============================================================
// 星之匣 Electron 主进程
// 负责：后台启动 Next.js Server（本地） + 创建 BrowserWindow
//
// 桌面化改造（2026-09-02）
// - APP_MODE=desktop 注入到 Next.js 环境
// - DESKTOP_DATA_DIR 指向 OS 用户数据目录（隔离于安装目录）
// - 所有云端路由走 proxy.ts 的转发逻辑（已在 Next.js 侧实现）
// - 开发模式: npm run dev:desktop
// - 生产打包: npm run build:desktop:win → electron-builder
//
// 打包布局 (extraResources):
//   resources/app.asar       ← 我们的 electron/main.js + public/ (几 MB, 归档快)
//   resources/app/           ← 真实文件目录
//     ├── node_modules/     ← Next.js 依赖 (完整)
//     ├── .next/            ← 构建产物
//     ├── package.json
//     └── prisma/
// ============================================================

const { app, BrowserWindow, Tray, Menu, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');

// ========== 配置 ==========
const PORT = process.env.PORT || 3000;
const IS_DEV = !app.isPackaged; // 开发模式: npm run dev:desktop；生产:打包后

// ========== 核心：PROJECT_ROOT 的两种情况 ==========
//   开发时: electron/main.js → ../ → galgame_toolkit/（项目根）
//   打包后: main.js 来自 app.asar，但真实运行文件在 resources/app/ (extraResources)
//           process.resourcesPath = release/win-unpacked/resources
//           所以 PROJECT_ROOT = path.join(resourcesPath, 'app')
const PROJECT_ROOT = IS_DEV
  ? path.resolve(__dirname, '..')
  : path.join(process.resourcesPath, 'app');

// OS 用户数据目录（数据库 / 项目文件 / AI 配置都放这里，隔离于安装目录）
const USER_DATA_DIR = app.getPath('userData');
if (!fs.existsSync(USER_DATA_DIR)) {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}

// ========== 全局引用 ==========
let mainWindow = null;
let nextServer = null;
let tray = null;

// ========== 工具：等待端口就绪 ==========
function waitForPort(port, timeout = 45000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const net = require('net');

    const tryConnect = () => {
      if (Date.now() - start > timeout) {
        reject(new Error(`等待 Next.js server 超时（${timeout}ms）`));
        return;
      }
      const socket = net.connect(port, '127.0.0.1', () => {
        socket.destroy();
        resolve();
      });
      socket.on('error', () => {
        setTimeout(tryConnect, 300);
      });
    };
    tryConnect();
  });
}

// ========== 工具：确保 Prisma 数据文件在用户数据目录 ==========
// Prisma schema 和数据库需要在可写路径（用户数据目录）
function ensurePrismaInUserData() {
  const schemaDest = path.join(USER_DATA_DIR, 'schema.prisma');

  // 如果用户数据目录还没有 schema.prisma，从安装目录复制一份
  if (!fs.existsSync(schemaDest)) {
    const schemaSrc = path.join(PROJECT_ROOT, 'prisma', 'schema.prisma');
    if (fs.existsSync(schemaSrc)) {
      fs.copyFileSync(schemaSrc, schemaDest);
      console.log(`[Electron] schema.prisma 已复制到用户数据目录`);
    } else {
      console.warn(`[Electron] 未找到 prisma/schema.prisma 于 ${schemaSrc}`);
    }
  }

  return schemaDest;
}

// ========== 启动 Next.js Server ==========
function startNextServer() {
  // 确保 prisma schema 在用户数据目录
  ensurePrismaInUserData();

  // 桌面模式环境变量
  const env = {
    ...process.env,
    APP_MODE: 'desktop',
    DESKTOP_DATA_DIR: USER_DATA_DIR,
    PORT: String(PORT),
    // Prisma 指向用户数据目录下的 schema
    PRISMA_SCHEMA_PATH: path.join(USER_DATA_DIR, 'schema.prisma'),
  };

  const nextBin = path.join(PROJECT_ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
  const args = [IS_DEV ? 'dev' : 'start', '-p', String(PORT)];

  console.log(`[Electron] 启动 Next.js server (${IS_DEV ? 'dev' : 'prod'}) on port ${PORT}...`);
  console.log(`[Electron] PROJECT_ROOT=${PROJECT_ROOT}`);
  console.log(`[Electron] APP_MODE=desktop, DATA_DIR=${USER_DATA_DIR}`);

  // 验证 PROJECT_ROOT 下关键文件存在
  const checks = ['node_modules', '.next', 'package.json'];
  for (const f of checks) {
    const fp = path.join(PROJECT_ROOT, f);
    const exists = fs.existsSync(fp);
    if (!exists) {
      console.error(`[Electron] ⚠️  关键文件/目录不存在: ${fp}`);
    } else {
      console.log(`[Electron] ✓ ${fp}`);
    }
  }

  // 用 fork 启动 Node.js 子进程
  // fork 自动使用父进程的 Node runtime (Electron 自带)，不需要指定 nodeCmd
  // fork 必须有 'ipc' 在 stdio 里
  try {
    nextServer = fork(nextBin, args, {
      cwd: PROJECT_ROOT,
      env,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      // 不使用 detached，让子进程随父进程退出
    });
  } catch (err) {
    console.error(`[Electron] fork 启动失败:`, err);
    dialog.showErrorBox(
      '启动失败',
      `无法启动 Next.js server：\n${err.message}\n\n` +
      `PROJECT_ROOT: ${PROJECT_ROOT}\n` +
      `nextBin: ${nextBin}`
    );
    app.isQuiting = true;
    app.quit();
    return;
  }

  nextServer.stdout.on('data', (data) => {
    process.stdout.write(`[Next.js] ${data}`);
  });

  nextServer.stderr.on('data', (data) => {
    process.stderr.write(`[Next.js] ${data}`);
  });

  nextServer.on('exit', (code) => {
    console.log(`[Electron] Next.js server 退出，code=${code}`);
    nextServer = null;
    if (!app.isQuiting) {
      app.isQuiting = true;
      app.quit();
    }
  });

  nextServer.on('error', (err) => {
    console.error(`[Electron] Next.js server 启动失败:`, err);
    dialog.showErrorBox('启动失败', `无法启动 Next.js server：\n${err.message}`);
    app.isQuiting = true;
    app.quit();
  });
}

// ========== 创建主窗口 ==========
async function createMainWindow() {
  try {
    await waitForPort(PORT, IS_DEV ? 60000 : 45000);
  } catch (err) {
    dialog.showErrorBox(
      '启动失败',
      `Next.js server 未能在规定时间内启动：\n${err.message}\n\n` +
      `可能原因：\n` +
      `1. 端口 ${PORT} 被占用\n` +
      `2. .next 构建产物缺失（先执行 npm run build）\n` +
      `3. node_modules 不完整（执行 npm install）`,
    );
    app.quit();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: '星之匣 StellarChest',
    backgroundColor: '#FFF5F7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  // 开发时自动打开 DevTools
  if (IS_DEV) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // 外链用系统浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 窗口关闭时最小化到托盘
  mainWindow.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      mainWindow.hide();
      showTray();
    }
  });
}

// ========== 系统托盘 ==========
function showTray() {
  if (tray) return;
  const iconPath = IS_DEV
    ? path.join(PROJECT_ROOT, 'public', 'favicon.ico')
    : path.join(process.resourcesPath, 'app.asar', 'public', 'favicon.ico');
  try {
    tray = new Tray(iconPath);
  } catch {
    return;
  }
  const menu = Menu.buildFromTemplate([
    { label: '显示星之匣', click: () => { mainWindow.show(); mainWindow.focus(); } },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuiting = true;
        app.quit();
      },
    },
  ]);
  tray.setToolTip('星之匣 StellarChest');
  tray.setContextMenu(menu);
  tray.on('click', () => { mainWindow.show(); mainWindow.focus(); });
}

// ========== 应用生命周期 ==========
app.whenReady().then(async () => {
  app.isQuiting = false;
  startNextServer();
  await createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuiting = true;
  if (nextServer) {
    console.log('[Electron] 终止 Next.js server...');
    try {
      nextServer.kill('SIGTERM');
    } catch (e) {
      // fork 子进程可能已经退出
    }
  }
});

// ========== 崩溃保护 ==========
process.on('uncaughtException', (err) => {
  console.error('[Electron] 未捕获异常:', err);
});

// ========== 日志：方便排查生产问题 ==========
process.on('warning', (warning) => {
  console.warn('[Electron] Node warning:', warning.message);
});
