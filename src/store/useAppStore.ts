// ============================================================
// useAppStore — DAW 全局视图与 UI 状态 (独立于音频数据)
// 视图切换: Playlist / Piano Roll / Step Sequencer / Mixer
// ============================================================

import { create } from 'zustand';

/** 工作区视图类型 */
export type WorkspaceView = 'playlist' | 'piano-roll' | 'step' | 'mixer';

export interface AppStoreState {
  // --- View ---
  activeView: WorkspaceView;

  // --- UI Panels ---
  /** 左侧浏览器面板是否折叠 */
  sidebarCollapsed: boolean;
  /** 左侧浏览器面板宽度 (px) */
  sidebarWidth: number;

  // --- Actions ---
  setActiveView: (view: WorkspaceView) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
}

const MIN_SIDEBAR_WIDTH = 160;
const MAX_SIDEBAR_WIDTH = 360;
const DEFAULT_SIDEBAR_WIDTH = 200;

const useAppStore = create<AppStoreState>()((set, get) => ({
  // --- 初始状态 ---
  activeView: 'piano-roll',
  sidebarCollapsed: false,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,

  // --- Actions ---
  setActiveView: (view) => set({ activeView: view }),

  toggleSidebar: () => {
    const { sidebarCollapsed, sidebarWidth } = get();
    if (sidebarCollapsed) {
      set({ sidebarCollapsed: false, sidebarWidth: DEFAULT_SIDEBAR_WIDTH });
    } else {
      set({ sidebarCollapsed: true, sidebarWidth: 0 });
    }
  },

  setSidebarCollapsed: (collapsed) => {
    if (collapsed) {
      set({ sidebarCollapsed: true, sidebarWidth: 0 });
    } else {
      const w = get().sidebarWidth > 0 ? get().sidebarWidth : DEFAULT_SIDEBAR_WIDTH;
      set({ sidebarCollapsed: false, sidebarWidth: w });
    }
  },

  setSidebarWidth: (width) => {
    set({
      sidebarWidth: Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, width)),
    });
  },
}));

export default useAppStore;
