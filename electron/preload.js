// ============================================================
// 星之匣 Electron Preload 脚本
// contextIsolation + nodeIntegration=false，通过 contextBridge 暴露安全 API
// 目前只暴露版本信息；后续如需 IPC 可在这里扩展
// ============================================================

const { contextBridge, app, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('stellarChest', {
  version: app?.getVersion?.() || 'unknown',
  platform: process.platform,
  // 占位：后续可在这里加 IPC 通道（比如打开文件对话框、保存文件到系统等）
});
