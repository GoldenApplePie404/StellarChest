// 星墨编辑器 -- VS Code 风格布局
// ActivityBar | SidePanel | Editor+Tabs+StatusBar | RightPanel(AI)
// 脚本数据来自后端API，localStorage仅作为离线缓存
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
// Monaco 是浏览器库，且我们改为本地打包（见 ScriptEditor）。用 ssr:false 隔离，
// 避免 SSR 阶段求值 monaco，也避免其加载失败时级联拖垮整页（含右侧游戏预览）。
const ScriptEditor = dynamic(() => import('@/components/editor/ScriptEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#1E1E28] text-white/60">
      加载编辑器...
    </div>
  ),
});
import ScriptCardView from '@/components/editor/ScriptCardView';
import GamePreviewEmbed from '@/components/editor/GamePreviewEmbed';
import PreviewErrorBoundary from '@/components/editor/PreviewErrorBoundary';
import InstructionReference from '@/components/editor/InstructionReference';
import ShortcutReference from '@/components/editor/ShortcutReference';
import FlowChartView from '@/components/editor/FlowChartView';
import RightPanel from '@/components/editor/RightPanel';
import FileTree from '@/components/editor/FileTree';
import ActivityBar from '@/components/editor/ActivityBar';
import EditorTabs from '@/components/editor/EditorTabs';
import Toast from '@/components/ui/Toast';
import { X, Sparkles, ArrowUp, ChevronRight, FolderOpen, Search, FileText, LayoutGrid, Columns2 } from 'lucide-react';

/** 编辑器视图模式 */
type ViewMode = 'text' | 'card' | 'split';
const VIEW_STORAGE_KEY = 'galgame_view_mode';
const VIEW_OPTIONS: { key: ViewMode; icon: typeof FileText; label: string }[] = [
  { key: 'text', icon: FileText, label: '纯文本' },
  { key: 'card', icon: LayoutGrid, label: '卡片' },
  { key: 'split', icon: Columns2, label: '双栏' },
];
import type { ProjectFile } from '@/types/project';

/** 新建项目时的最小模板脚本 */
const MINIMAL_TEMPLATE = `@chapter 第一章 - 开始

@bg default

主角：新的一天开始了...

@chapter_end
`;

/** 获取认证头 */
function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('galgame_token') || '' : '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

interface EditorTab {
  path: string;
  name: string;
  hasChanges: boolean;
}

export default function EditorPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const projectId = (params as Record<string, string>).projectId || '';

  // Core state
  const [scriptContent, setScriptContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  /** 自动保存状态机：saved=已保存 saving=保存中 unsaved=有改动未存 error=保存失败 */
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [activeFile, setActiveFile] = useState('main.txt');
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Tab system
  const [openTabs, setOpenTabs] = useState<EditorTab[]>([
    { path: 'main.txt', name: 'main.txt', hasChanges: false },
  ]);

  // Panel visibility
  const [sidePanelVisible, setSidePanelVisible] = useState(true);
  const [activeSideView, setActiveSideView] = useState('files'); // 'files' | 'search' | 'ai' | ''
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [referenceVisible, setReferenceVisible] = useState(false);
  const [shortcutsVisible, setShortcutsVisible] = useState(false);

  // AI panel on right
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStreamText, setAiStreamText] = useState('');
  const [aiInstruction, setAiInstruction] = useState('');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  // 保持最新脚本内容，避免 handleSave 因内容变化频繁重建
  const scriptContentRef = useRef(scriptContent);
  useEffect(() => {
    scriptContentRef.current = scriptContent;
  }, [scriptContent]);

  // 编辑器视图模式（纯文本 / 卡片 / 双栏），持久化到 localStorage
  // 注意：初始值必须确定性（始终 'text'），否则 SSR 与客户端首帧不一致会触发 hydration mismatch。
  // 持久化值改为挂载后在 useEffect 内读取，避免首帧属性不匹配。
  const [viewMode, setViewMode] = useState<ViewMode>('text');
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode | null;
    if (saved) setViewMode(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const changeView = (m: ViewMode) => {
    setViewMode(m);
    if (typeof window !== 'undefined') localStorage.setItem(VIEW_STORAGE_KEY, m);
  };

  const aiAbortRef = useRef<AbortController | null>(null);

  // 300ms 防抖后的脚本文本（用于流程图刷新）
  const [debouncedScript, setDebouncedScript] = useState('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 刷新文件列表 */
  const refreshFiles = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const filesRes = await fetch(`/api/projects/${projectId}/files`, { headers });
      const filesData = await filesRes.json();
      if (filesData.code === 200 && filesData.data) {
        setProjectFiles(filesData.data as ProjectFile[]);
      }
    } catch {
      // Silent fail on refresh
    }
  }, [projectId]);

  // Load project files and script from API on mount
  useEffect(() => {
    if (!projectId) return;

    const loadProjectData = async (): Promise<void> => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const headers = getAuthHeaders();

        // 1. Get file list
        const filesRes = await fetch(`/api/projects/${projectId}/files`, { headers });
        const filesData = await filesRes.json();

        if (filesData.code !== 200 || !filesData.data) {
          throw new Error(filesData.message || '获取文件列表失败');
        }

        const files: ProjectFile[] = filesData.data;
        setProjectFiles(files);

        // 2. Find first script file and load content
        const scriptFiles = files.filter((f: ProjectFile) => f.fileType === 'script');
        let targetFile: ProjectFile | null = scriptFiles.length > 0 ? (scriptFiles[0] ?? null) : null;

        if (!targetFile) {
          // No script files exist — create one via JSON API
          const createRes = await fetch(`/api/projects/${projectId}/files`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('galgame_token') || ''}`,
            },
            body: JSON.stringify({
              content: MINIMAL_TEMPLATE,
              filename: 'main.txt',
              fileType: 'script',
            }),
          });

          const createData = await createRes.json();
          if (createData.code !== 200 || !createData.data) {
            throw new Error(createData.message || '创建脚本文件失败');
          }

          targetFile = createData.data as ProjectFile;
          setProjectFiles((prev) => [...prev, targetFile!]);
        }

        // 3. Load file content
        if (targetFile) {
          setActiveFileId(targetFile.id);
          setActiveFile(targetFile.filename);

          const contentRes = await fetch(
            `/api/projects/${projectId}/files?action=content&fileId=${targetFile.id}`,
            { headers },
          );
          const contentData = await contentRes.json();

          if (contentData.code === 200 && contentData.data) {
            const content = contentData.data.content as string;
            setScriptContent(content);
            // Cache in localStorage as fallback
            localStorage.setItem(`galgame_script_${projectId}`, content);
          } else {
            // Fallback: try localStorage
            const cached = localStorage.getItem(`galgame_script_${projectId}`);
            setScriptContent(cached || MINIMAL_TEMPLATE);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '加载项目数据失败';
        setLoadError(message);
        // Fallback: localStorage
        const cached = localStorage.getItem(`galgame_script_${projectId}`);
        if (cached) {
          setScriptContent(cached);
          setLoadError(null);
        } else {
          setScriptContent(MINIMAL_TEMPLATE);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadProjectData();
  }, [projectId]);

  // 300ms 防抖：脚本内容变化后延迟更新流程图
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedScript(scriptContent);
    }, 300);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [scriptContent]);

  // Listen for Monaco keyboard shortcuts via custom events
  useEffect(() => {
    const onSave = () => handleSave();
    const onPreview = () => handlePreview();
    const onAIContinue = () => handleAIContinue();
    const onToggleRef = () => setReferenceVisible(v => !v);
    const onToggleAI = () => setAiPanelOpen(v => !v);
    const onToggleFlow = () => setRightPanelOpen(v => !v);
    const onToggleShortcuts = () => setShortcutsVisible(v => !v);

    window.addEventListener('galgame-save', onSave);
    window.addEventListener('galgame-preview', onPreview);
    window.addEventListener('galgame-ai-continue', onAIContinue);
    window.addEventListener('galgame-toggle-reference', onToggleRef);
    window.addEventListener('galgame-toggle-ai', onToggleAI);
    window.addEventListener('galgame-toggle-flow', onToggleFlow);
    window.addEventListener('galgame-toggle-shortcuts', onToggleShortcuts);

    return () => {
      window.removeEventListener('galgame-save', onSave);
      window.removeEventListener('galgame-preview', onPreview);
      window.removeEventListener('galgame-ai-continue', onAIContinue);
      window.removeEventListener('galgame-toggle-reference', onToggleRef);
      window.removeEventListener('galgame-toggle-ai', onToggleAI);
      window.removeEventListener('galgame-toggle-flow', onToggleFlow);
      window.removeEventListener('galgame-toggle-shortcuts', onToggleShortcuts);
    };
  }, [scriptContent, projectId, activeFileId]);

  const handleScriptChange = useCallback((value: string) => {
    setScriptContent(value);
    setHasUnsavedChanges(true);
    setSaveStatus('unsaved');
    setOpenTabs(prev => prev.map(t =>
      t.path === activeFile ? { ...t, hasChanges: true } : t
    ));
  }, [activeFile]);

  // Save — use PUT content API, localStorage as fallback cache.
  // opts.silent=true 用于自动保存：不弹 toast（避免每 1.5s 提示），仅通过状态指示器反馈。
  const handleSave = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    const currentContent = scriptContentRef.current;
    // Always cache in localStorage first
    localStorage.setItem(`galgame_script_${projectId}`, currentContent);

    if (!activeFileId) {
      if (!silent) setToast({ message: 'No file loaded to save', type: 'warning' });
      setSaveStatus('error');
      return;
    }

    setSaveStatus('saving');
    try {
      const headers = getAuthHeaders();
      const res = await fetch(
        `/api/projects/${projectId}/files?action=save&fileId=${activeFileId}`,
        {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: currentContent }),
        },
      );

      const data = await res.json();
      if (data.code === 200) {
        setHasUnsavedChanges(false);
        setSaveStatus('saved');
        setOpenTabs(prev => prev.map(t =>
          t.path === activeFile ? { ...t, hasChanges: false } : t
        ));
        if (!silent) setToast({ message: 'Saved', type: 'success' });
      } else {
        throw new Error(data.message || '保存失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存失败';
      setSaveStatus('error');
      if (!silent) {
        setToast({ message: `Save to server failed (cached locally): ${message}`, type: 'warning' });
      }
    }
  }, [projectId, activeFile, activeFileId]);

  // 防抖自动保存：内容有改动后 1.5s 自动落盘（silent 模式，不弹 toast，仅由状态指示器反馈）
  // 依赖使用稳定的 handleSave（通过 scriptContentRef 读取最新内容），避免每输入一个字符都重建保存函数
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const t = setTimeout(() => {
      void handleSave({ silent: true });
    }, 1500);
    return () => clearTimeout(t);
  }, [hasUnsavedChanges, handleSave]);

  const handlePreview = useCallback(() => {
    handleSave();
    router.push(`/projects/${projectId}/preview`);
  }, [projectId, router, handleSave]);

  // AI handlers
  const handleAIContinue = useCallback(async () => {
    setAiPanelOpen(true);
    setAiLoading(true);
    setAiStreamText('');

    try {
      const token = localStorage.getItem('galgame_token') || '';
      aiAbortRef.current?.abort();
      const controller = new AbortController();
      aiAbortRef.current = controller;

      const r = await fetch('/api/ai/script-continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ snippet: scriptContent.slice(-500), instruction: 'Continue writing, maintain style' }),
        signal: controller.signal,
      });
      const result = await r.json();
      setAiStreamText(result.code === 200 && result.data?.text ? result.data.text : '>> ' + (result.message || 'Failed'));
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setAiStreamText('>> Network error');
    } finally {
      setAiLoading(false);
    }
  }, [scriptContent]);

  const handleAIWithInstruction = useCallback(async () => {
    if (!aiInstruction.trim()) return;
    setAiLoading(true);
    setAiStreamText('');
    try {
      const token = localStorage.getItem('galgame_token') || '';
      const r = await fetch('/api/ai/script-continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ snippet: scriptContent.slice(-800), instruction: aiInstruction.trim() }),
      });
      const result = await r.json();
      setAiStreamText(result.code === 200 && result.data?.text ? result.data.text : '>> ' + (result.message || 'Failed'));
    } catch {
      setAiStreamText('>> Error');
    } finally {
      setAiLoading(false);
    }
  }, [scriptContent, aiInstruction]);

  const handleInsertAI = useCallback(() => {
    if (!aiStreamText || aiStreamText.startsWith('>>')) return;
    setScriptContent(prev => prev + '\n\n' + aiStreamText);
    setHasUnsavedChanges(true);
    setToast({ message: 'AI content inserted', type: 'success' });
    setAiStreamText('');
    setAiPanelOpen(false);
  }, [aiStreamText]);

  // Tab management — load file content from API on tab switch
  const handleFileClick = useCallback(async (filePath: string) => {
    // Find the file in projectFiles by filename
    const targetFile = projectFiles.find((f) => f.filename === filePath || f.storagePath.endsWith(filePath));
    const fileId = targetFile?.id || null;

    setActiveFile(filePath);
    setActiveFileId(fileId);

    if (fileId) {
      try {
        const headers = getAuthHeaders();
        const res = await fetch(
          `/api/projects/${projectId}/files/${fileId}/content`,
          { headers },
        );
        const data = await res.json();
        if (data.code === 200 && data.data) {
          setScriptContent(data.data.content as string);
        } else {
          // Fallback to localStorage
          const cached = localStorage.getItem(`galgame_file_${projectId}_${filePath}`);
          if (cached) setScriptContent(cached);
        }
      } catch {
        const cached = localStorage.getItem(`galgame_file_${projectId}_${filePath}`);
        if (cached) setScriptContent(cached);
      }
    } else {
      const cached = localStorage.getItem(`galgame_file_${projectId}_${filePath}`);
      if (cached) setScriptContent(cached);
    }

    // Add to tabs if not present
    setOpenTabs(prev => {
      if (prev.find(t => t.path === filePath)) return prev;
      return [...prev, { path: filePath, name: filePath.split('/').pop() || filePath, hasChanges: false }];
    });
  }, [projectId, projectFiles]);

  const handleTabClick = useCallback((path: string) => {
    handleFileClick(path);
  }, [handleFileClick]);

  const handleTabClose = useCallback((path: string) => {
    setOpenTabs(prev => prev.filter(t => t.path !== path));
    if (activeFile === path) {
      const remaining = openTabs.filter(t => t.path !== path);
      if (remaining.length > 0 && remaining[0]) handleTabClick(remaining[0].path);
    }
  }, [activeFile, openTabs, handleTabClick]);

  const handleViewChange = useCallback((view: string) => {
    if (view === 'ai') {
      setAiPanelOpen(v => !v);
      return;
    }
    if (view === 'flow') {
      setRightPanelOpen(v => !v);
      return;
    }
    if (view === 'shortcuts') {
      setShortcutsVisible(v => !v);
      return;
    }
    if (activeSideView === view) {
      setSidePanelVisible(v => !v);
    } else {
      setActiveSideView(view);
      setSidePanelVisible(true);
    }
  }, [activeSideView]);

  const handleInsertInstruction = useCallback((text: string) => {
    window.dispatchEvent(new CustomEvent('galgame-insert', { detail: { text: '\n' + text + '\n' } }));
  }, []);

  const handleFlowNodeClick = useCallback((lineIndex: number) => {
    window.dispatchEvent(new CustomEvent('galgame-goto-line', { detail: { line: lineIndex + 1 } }));
  }, []);

  // ===== FileTree CRUD Handlers =====

  const handleFileCreate = useCallback(async (name: string, parentPath: string) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('galgame_token') || ''}`,
      };
      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: '',
          filename: name,
          fileType: 'script',
          parentPath,
        }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setToast({ message: `File "${name}" created`, type: 'success' });
        await refreshFiles();
      } else {
        throw new Error(data.message || '创建文件失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '创建文件失败';
      setToast({ message, type: 'error' });
    }
  }, [projectId, refreshFiles]);

  const handleFolderCreate = useCallback(async (name: string, parentPath: string) => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`/api/projects/${projectId}/files/folder`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, parentPath }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setToast({ message: `Folder "${name}" created`, type: 'success' });
        await refreshFiles();
      } else {
        throw new Error(data.message || '创建文件夹失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '创建文件夹失败';
      setToast({ message, type: 'error' });
    }
  }, [projectId, refreshFiles]);

  const handleFileDelete = useCallback(async (fileId: string) => {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/files?fileId=${fileId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        },
      );
      const data = await res.json();
      if (data.code === 200) {
        setToast({ message: 'File deleted', type: 'success' });
        await refreshFiles();
        // If the deleted file was active, clear editor
        const deletedFile = projectFiles.find(f => f.id === fileId);
        if (deletedFile && (deletedFile.filename === activeFile || deletedFile.storagePath.endsWith(activeFile))) {
          setScriptContent('');
          setActiveFile('');
          setActiveFileId(null);
        }
      } else {
        throw new Error(data.message || '删除文件失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除文件失败';
      setToast({ message, type: 'error' });
    }
  }, [projectId, refreshFiles, projectFiles, activeFile]);

  const [clipboardFiles, setClipboardFiles] = useState<{ fileIds: string[]; isCut: boolean } | null>(null);

  const handleFileCopy = useCallback((fileIds: string[]) => {
    setClipboardFiles({ fileIds, isCut: false });
    setToast({ message: `${fileIds.length} file(s) copied`, type: 'info' });
  }, []);

  const handleFileCut = useCallback((fileIds: string[]) => {
    setClipboardFiles({ fileIds, isCut: true });
    setToast({ message: `${fileIds.length} file(s) cut`, type: 'info' });
  }, []);

  const handleFilePaste = useCallback(async (targetFolder: string) => {
    if (!clipboardFiles) return;
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`/api/projects/${projectId}/files/batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          operation: clipboardFiles.isCut ? 'move' : 'copy',
          fileIds: clipboardFiles.fileIds,
          targetFolder,
        }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setToast({
          message: clipboardFiles.isCut ? 'File(s) moved' : 'File(s) copied',
          type: 'success',
        });
        setClipboardFiles(null);
        await refreshFiles();
      } else {
        throw new Error(data.message || '操作失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '操作失败';
      setToast({ message, type: 'error' });
    }
  }, [projectId, clipboardFiles, refreshFiles]);

  const handleFileRename = useCallback(async (fileId: string, newName: string) => {
    // Rename via the content API as PATCH is not available; for simplicity,
    // we delete and recreate. A proper rename endpoint would be better.
    // For now, just refresh to show current state and show a toast.
    setToast({ message: 'Rename will be available in next update', type: 'info' });
    await refreshFiles();
  }, [refreshFiles]);

  // Convert ProjectFile[] to FileTree's expected FileItemData[]
  const fileTreeItems = projectFiles.map((f) => ({
    name: f.filename,
    type: f.fileType === 'script' ? 'script' as const
      : f.fileType === 'image' ? 'image' as const
      : f.fileType === 'audio' ? 'audio' as const
      : 'other' as const,
    path: f.filename,
    id: f.id,
  }));

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden" style={{ background: '#1E1E28' }}>
      {/* ===== ACTIVITY BAR (far left) ===== */}
      <ActivityBar
        activeView={activeSideView}
        onViewChange={handleViewChange}
        referenceVisible={referenceVisible}
        onToggleReference={() => setReferenceVisible(v => !v)}
        shortcutsVisible={shortcutsVisible}
        onToggleShortcuts={() => setShortcutsVisible(v => !v)}
      />

      {/* ===== SIDE PANEL ===== */}
      {sidePanelVisible && (
        <div className="w-[240px] flex-shrink-0 flex flex-col overflow-hidden"
          style={{ background: '#16161D', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Panel header */}
          <div className="flex items-center justify-between px-3 h-9 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'rgba(255,255,255,0.65)' }}>
            <span>{activeSideView === 'files' ? 'Explorer' : 'Search'}</span>
            <button onClick={() => setSidePanelVisible(false)} style={{ color: 'rgba(255,255,255,0.5)' }}>
              <X size={14} />
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto">
            {activeSideView === 'files' && (
              <FileTree
                projectId={projectId}
                files={fileTreeItems}
                activeFile={activeFile}
                onFileClick={handleFileClick}
                onFileCreate={handleFileCreate}
                onFolderCreate={handleFolderCreate}
                onFileDelete={handleFileDelete}
                onFileCopy={handleFileCopy}
                onFileCut={handleFileCut}
                onFilePaste={handleFilePaste}
                onFileRename={handleFileRename}
                isLoading={isLoading}
              />
            )}
            {activeSideView === 'search' && (
              <div className="p-3" style={{ color: 'rgba(255,255,255,0.65)' }}>
                <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Search size={14} />
                  <input placeholder="Search in files..." className="bg-transparent border-none outline-none text-xs flex-1"
                    style={{ color: '#E2D0F5' }} />
                </div>
                <p className="text-xs px-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Type to search across script files</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== MAIN EDITOR AREA ===== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <EditorTabs
          tabs={openTabs}
          activeTab={activeFile}
          onTabClick={handleTabClick}
          onTabClose={handleTabClose}
        />

        {/* Breadcrumb */}
        <div className="flex items-center px-3 text-xs gap-1 flex-shrink-0"
          style={{ background: '#1E1E28', color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.08)', height: 22 }}>
          <FolderOpen size={12} />
          <span>{projectId.slice(0, 8)}</span>
          <ChevronRight size={10} />
          <span style={{ color: '#FF7EB3' }}>{activeFile}</span>

          {/* 视图切换分段控件 */}
          <div className="flex items-center gap-0.5 px-1 rounded-md ml-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {VIEW_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = viewMode === opt.key;
              return (
                <button
                  key={opt.key}
                  title={opt.label}
                  onClick={() => changeView(opt.key)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all"
                  style={{
                    color: active ? '#FF7EB3' : 'rgba(255,255,255,0.4)',
                    background: active ? 'rgba(255,126,179,0.15)' : 'transparent',
                  }}
                >
                  <Icon size={13} />
                  <span className="hidden lg:inline">{opt.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1" />
          {/* 自动保存状态指示器 */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded text-xs select-none"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            {saveStatus === 'saving' && (
              <>
                <span className="inline-block w-2.5 h-2.5 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'rgba(255,255,255,0.25)', borderTopColor: '#FF7EB3' }} />
                <span>保存中</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#4ADE80' }} />
                <span>已保存</span>
              </>
            )}
            {saveStatus === 'unsaved' && (
              <>
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#FFD700' }} />
                <span>未保存</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#FF6B7A' }} />
                <span style={{ color: '#FF6B7A' }}>保存失败</span>
              </>
            )}
          </div>
          {/* Quick actions in breadcrumb */}
          <button onClick={() => handleSave()} title="Save (Ctrl+S)"
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all"
            style={{ color: hasUnsavedChanges ? '#FFD700' : 'rgba(255,255,255,0.35)' }}>
            Save
          </button>
          <button onClick={handlePreview} title="Preview (Ctrl+Enter)"
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all"
            style={{ color: 'rgba(255,255,255,0.35)' }}>
            Preview
          </button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center" style={{ background: '#1E1E28' }}>
            <div className="text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <div className="animate-spin w-6 h-6 border-2 rounded-full mx-auto mb-3"
                style={{ borderColor: 'rgba(255,126,179,0.3)', borderTopColor: '#FF7EB3' }} />
              <p className="text-sm">Loading project files...</p>
            </div>
          </div>
        )}

        {/* Load error state */}
        {!isLoading && loadError && (
          <div className="flex-1 flex items-center justify-center" style={{ background: '#1E1E28' }}>
            <div className="text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <p className="text-sm mb-2">Failed to load from server</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{loadError}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 px-4 py-1.5 rounded text-xs"
                style={{ background: 'rgba(255,126,179,0.2)', color: '#FF7EB3' }}>
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Editor */}
        {!isLoading && !loadError && (
          viewMode === 'card' ? (
            <div className="flex-1 overflow-hidden w-full h-full">
              <ScriptCardView value={scriptContent} onChange={handleScriptChange} />
            </div>
          ) : viewMode === 'split' ? (
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 overflow-hidden">
                <ScriptEditor
                  value={scriptContent}
                  onChange={handleScriptChange}
                  currentLine={-1}
                />
              </div>
              <div
                className="w-[42%] flex-shrink-0 overflow-hidden"
                style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}
              >
                <PreviewErrorBoundary>
                  <GamePreviewEmbed scriptText={scriptContent} projectId={projectId} />
                </PreviewErrorBoundary>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden w-full h-full">
              <ScriptEditor
                value={scriptContent}
                onChange={handleScriptChange}
                currentLine={-1}
              />
            </div>
          )
        )}
      </div>

      {/* ===== RIGHT PANEL (tabbed: 指令速查 / 快捷键 / 流程图) ===== */}
      {rightPanelOpen && (
        <RightPanel
          scriptText={debouncedScript}
          projectId={projectId}
          onNodeClick={handleFlowNodeClick}
          onClose={() => setRightPanelOpen(false)}
        />
      )}

      {/* ===== AI PANEL (right panel) ===== */}
      {aiPanelOpen && (
        <div className="w-[320px] flex-shrink-0 border-l flex flex-col overflow-hidden"
          style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#16161D' }}>
          <div className="flex items-center justify-between px-3 h-9 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'rgba(255,255,255,0.65)' }}>
            <div className="flex items-center gap-2">
              <Sparkles size={14} style={{ color: '#FFD700' }} />
              <span>AI Assistant</span>
            </div>
            <button onClick={() => setAiPanelOpen(false)} style={{ color: 'rgba(255,255,255,0.5)' }}>
              <X size={14} />
            </button>
          </div>

          <div className="p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <input
              value={aiInstruction}
              onChange={e => setAiInstruction(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAIWithInstruction()}
              placeholder="Tell the AI what to write..."
              disabled={aiLoading}
              className="w-full px-3 py-2 rounded-lg text-xs border-none outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#E2D0F5' }}
            />
            <div className="flex gap-2 mt-2">
              <button onClick={handleAIWithInstruction} disabled={aiLoading || !aiInstruction.trim()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{
                  background: aiInstruction.trim() ? '#FF7EB3' : 'rgba(255,255,255,0.06)',
                  color: aiInstruction.trim() ? '#FFF' : 'rgba(255,255,255,0.4)',
                }}>
                <ArrowUp size={10} /> Send
              </button>
              <button onClick={handleAIContinue} disabled={aiLoading}
                className="px-3 py-1.5 rounded-full text-xs"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                Quick Continue
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {aiLoading && (
              <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                <div className="animate-spin w-3 h-3 border-2 rounded-full" style={{ borderColor: 'rgba(255,126,179,0.3)', borderTopColor: '#FF7EB3' }} />
                <span className="text-xs">Thinking...</span>
              </div>
            )}
            {aiStreamText && !aiLoading && (
              <div>
                <pre className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: '#E2D0F5' }}>
                  {aiStreamText}
                </pre>
                {!aiStreamText.startsWith('>>') && (
                  <button onClick={handleInsertAI}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold mt-3"
                    style={{ background: '#FFD700', color: '#4A3045' }}>
                    Insert into Editor
                  </button>
                )}
              </div>
            )}
            {!aiStreamText && !aiLoading && (
              <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.3)' }}>
                <Sparkles size={28} className="mx-auto mb-2 opacity-20" />
                <p className="text-xs">Enter a prompt or use Quick Continue</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== INSTRUCTION REFERENCE (floating) ===== */}
      {referenceVisible && (
        <InstructionReference onInsertInstruction={handleInsertInstruction} />
      )}

      {/* ===== SHORTCUT REFERENCE (floating) ===== */}
      {shortcutsVisible && (
        <ShortcutReference />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
