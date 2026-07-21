// 项目文件树组件 -- 深色主题，支持右键菜单、CRUD、键盘快捷键
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import React from 'react';
import {
  FileCode, Image, Music, File, Folder, FolderOpen, Plus, Trash2,
  Copy, Scissors, Clipboard, Pencil, ChevronRight, ChevronDown,
  FilePlus, FolderPlus, Loader2,
} from 'lucide-react';

interface FileItemData {
  name: string;
  type: 'script' | 'image' | 'audio' | 'other';
  path: string;
  id: string;
  active?: boolean;
}

interface FileTreeProps {
  projectId: string;
  files?: FileItemData[];
  activeFile?: string;
  onFileClick?: (filePath: string) => void;
  onFileCreate?: (name: string, parentPath: string) => void;
  onFolderCreate?: (name: string, parentPath: string) => void;
  onFileDelete?: (fileId: string) => void;
  onFileCopy?: (fileIds: string[]) => void;
  onFileCut?: (fileIds: string[]) => void;
  onFilePaste?: (targetFolder: string) => void;
  onFileRename?: (fileId: string, newName: string) => void;
  isLoading?: boolean;
  collapsible?: boolean;
  className?: string;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  script: FileCode,
  image: Image,
  audio: Music,
  other: File,
};

const TYPE_LABELS: Record<string, string> = {
  script: 'Scripts',
  image: 'Images',
  audio: 'Audio',
  other: 'Other',
};

const TYPE_COLORS: Record<string, string> = {
  script: '#7EC8E3',
  image: '#FFD700',
  audio: '#FF85AB',
  other: '#8E8E8E',
};

interface TreeNode {
  name: string;
  path: string;
  id: string;
  type: 'script' | 'image' | 'audio' | 'other';
  fileType: string;
  isFolder: boolean;
  children: TreeNode[];
}

function buildTree(files: FileItemData[]): TreeNode[] {
  const root: TreeNode[] = [];
  const map = new Map<string, TreeNode>();

  // First pass: create all nodes
  for (const file of files) {
    const isFolder = file.type === 'other' && file.name.endsWith('/');
    const node: TreeNode = {
      name: isFolder ? file.name.replace(/\/$/, '') : file.name.split('/').pop() || file.name,
      path: file.path,
      id: file.id,
      type: file.type,
      fileType: file.type,
      isFolder,
      children: [],
    };
    map.set(file.path, node);
  }

  // Second pass: build tree hierarchy
  for (const file of files) {
    const node = map.get(file.path);
    if (!node) continue;

    const pathParts = file.path.split('/');
    if (pathParts.length <= 1) {
      // Top-level item
      if (node.isFolder && !root.find(n => n.path === file.path)) {
        root.push(node);
      } else if (!node.isFolder) {
        root.push(node);
      }
    } else {
      // Nested item - find parent folder
      const parentPath = pathParts.slice(0, -1).join('/') + '/';
      const parent = map.get(parentPath);
      if (parent && parent.isFolder) {
        if (!parent.children.find(c => c.id === node.id)) {
          parent.children.push(node);
        }
      } else {
        // Look for folder type entry
        const folderEntry = files.find(f => f.name === parentPath && f.type === 'other');
        if (folderEntry) {
          const folderNode = map.get(folderEntry.path);
          if (folderNode && folderNode.isFolder) {
            if (!folderNode.children.find(c => c.id === node.id)) {
              folderNode.children.push(node);
            }
          }
        } else {
          root.push(node);
        }
      }
    }
  }

  // Sort: folders first, then alphabetically
  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    return nodes.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };

  sortNodes(root);
  for (const node of root) {
    sortNodes(node.children);
  }

  return root;
}

/** 右键菜单项 */
interface ContextMenuItem {
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  danger?: boolean;
}

export default function FileTree({
  projectId: _projectId,
  files = [],
  activeFile = '',
  onFileClick,
  onFileCreate,
  onFolderCreate,
  onFileDelete,
  onFileCopy,
  onFileCut,
  onFilePaste,
  onFileRename,
  isLoading = false,
  collapsible = true,
  className = '',
}: FileTreeProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['scripts']));
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: TreeNode | null;
    items: ContextMenuItem[];
  } | null>(null);
  const [clipboard, setClipboard] = useState<{ fileIds: string[]; isCut: boolean } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [creatingInFolder, setCreatingInFolder] = useState<string | null>(null);
  const [createType, setCreateType] = useState<'file' | 'folder' | null>(null);
  const [createValue, setCreateValue] = useState('');
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  const tree = buildTree(files);

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Focus rename input
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  // Focus create input
  useEffect(() => {
    if (creatingInFolder && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [creatingInFolder]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+C - copy selected file
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const selectedNode = findNodeByPath(tree, activeFile);
        if (selectedNode && !selectedNode.isFolder) {
          e.preventDefault();
          setClipboard({ fileIds: [selectedNode.id], isCut: false });
        }
      }
      // Ctrl+X - cut selected file
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        const selectedNode = findNodeByPath(tree, activeFile);
        if (selectedNode && !selectedNode.isFolder) {
          e.preventDefault();
          setClipboard({ fileIds: [selectedNode.id], isCut: true });
        }
      }
      // Ctrl+V - paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (clipboard) {
          e.preventDefault();
          const targetFolder = getActiveFolder();
          handlePaste(targetFolder);
        }
      }
      // Delete - delete selected file
      if (e.key === 'Delete') {
        const selectedNode = findNodeByPath(tree, activeFile);
        if (selectedNode && !selectedNode.isFolder) {
          e.preventDefault();
          if (window.confirm(`确定要删除 "${selectedNode.name}" 吗？`)) {
            handleDelete(selectedNode.id);
          }
        }
      }
      // F2 - rename selected file
      if (e.key === 'F2') {
        const selectedNode = findNodeByPath(tree, activeFile);
        if (selectedNode) {
          e.preventDefault();
          startRename(selectedNode);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, clipboard, tree, onFileDelete, onFileRename, onFileCopy, onFilePaste]);

  const findNodeByPath = (nodes: TreeNode[], path: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.path === path || (!node.isFolder && (node.path === path || `/${node.path}` === path))) return node;
      const found = findNodeByPath(node.children, path);
      if (found) return found;
    }
    return null;
  };

  const getActiveFolder = (): string => {
    if (!activeFile) return '';
    const parts = activeFile.split('/');
    if (parts.length <= 1) return '';
    return parts.slice(0, -1).join('/') + '/';
  };

  const handleFileClickInternal = useCallback((filePath: string, node: TreeNode) => {
    if (node.isFolder) {
      setExpandedFolders(prev => {
        const next = new Set(prev);
        if (next.has(node.path)) {
          next.delete(node.path);
        } else {
          next.add(node.path);
        }
        return next;
      });
    } else if (onFileClick) {
      onFileClick(filePath);
    }
  }, [onFileClick]);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: TreeNode, isParentFolder: boolean = false) => {
    e.preventDefault();
    e.stopPropagation();

    const items: ContextMenuItem[] = [];

    if (node.isFolder) {
      items.push({
        label: 'New File...',
        icon: <FilePlus size={14} />,
        action: () => startCreate(node.path, 'file'),
      });
      items.push({
        label: 'New Folder...',
        icon: <FolderPlus size={14} />,
        action: () => startCreate(node.path, 'folder'),
      });
      items.push({ label: '', icon: null as unknown as React.ReactNode, action: () => {} }); // separator
    }

    if (!node.isFolder) {
      items.push({
        label: 'Copy',
        icon: <Copy size={14} />,
        shortcut: 'Ctrl+C',
        action: () => {
          setClipboard({ fileIds: [node.id], isCut: false });
          setContextMenu(null);
        },
      });
      items.push({
        label: 'Cut',
        icon: <Scissors size={14} />,
        shortcut: 'Ctrl+X',
        action: () => {
          setClipboard({ fileIds: [node.id], isCut: true });
          setContextMenu(null);
        },
      });
    }

    if (clipboard && clipboard.fileIds.length > 0) {
      const target = node.isFolder ? node.path : getParentPath(node.path);
      items.push({
        label: clipboard.isCut ? 'Paste (move here)' : 'Paste (copy here)',
        icon: <Clipboard size={14} />,
        shortcut: 'Ctrl+V',
        action: () => {
          handlePaste(target);
          setContextMenu(null);
        },
      });
    }

    if (!isParentFolder) {
      items.push({ label: '', icon: null as unknown as React.ReactNode, action: () => {} }); // separator
      items.push({
        label: 'Rename',
        icon: <Pencil size={14} />,
        shortcut: 'F2',
        action: () => {
          startRename(node);
          setContextMenu(null);
        },
      });
      items.push({
        label: 'Delete',
        icon: <Trash2 size={14} />,
        shortcut: 'Del',
        action: () => {
          if (window.confirm(`确定要删除 "${node.name}" 吗？`)) {
            handleDelete(node.id);
          }
          setContextMenu(null);
        },
        danger: true,
      });
    }

    setContextMenu({ x: e.clientX, y: e.clientY, node, items: items.filter(i => i.label !== '') });
  }, [clipboard, onFileCopy, onFileCut, onFilePaste, onFileDelete, onFileRename, onFolderCreate, onFileCreate]);

  const handleDelete = (fileId: string) => {
    if (onFileDelete) onFileDelete(fileId);
  };

  const handlePaste = (targetFolder: string) => {
    if (clipboard && onFilePaste) {
      onFilePaste(targetFolder);
      if (clipboard.isCut) {
        setClipboard(null);
      }
    }
  };

  const startRename = (node: TreeNode) => {
    setRenamingId(node.id);
    setRenameValue(node.name);
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim() && onFileRename) {
      onFileRename(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const startCreate = (parentPath: string, type: 'file' | 'folder') => {
    setCreatingInFolder(parentPath);
    setCreateType(type);
    setCreateValue('');
  };

  const commitCreate = () => {
    if (creatingInFolder !== null && createValue.trim()) {
      if (createType === 'file' && onFileCreate) {
        onFileCreate(createValue.trim(), creatingInFolder);
      } else if (createType === 'folder' && onFolderCreate) {
        onFolderCreate(createValue.trim(), creatingInFolder);
      }
    }
    setCreatingInFolder(null);
    setCreateType(null);
    setCreateValue('');
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const getParentPath = (filePath: string): string => {
    const parts = filePath.split('/');
    if (parts.length <= 1) return '';
    return parts.slice(0, -1).join('/') + '/';
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    const isActive = !node.isFolder && node.path === activeFile;
    const isExpanded = node.isFolder && expandedFolders.has(node.path);
    const isRenaming = renamingId === node.id;
    const isCreating = creatingInFolder === node.path;
    const Icon = node.isFolder ? (isExpanded ? FolderOpen : Folder) : (TYPE_ICONS[node.type] || File);
    const iconColor = node.isFolder ? '#8ECAE6' : (TYPE_COLORS[node.type] || '#8E8E8E');

    return (
      <div key={node.id || node.path}>
        <div
          className="group flex items-center px-1 py-1 text-xs transition-all cursor-pointer rounded-sm mx-1"
          style={{
            color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
            background: isActive ? 'rgba(255,126,179,0.12)' : 'transparent',
            paddingLeft: `${12 + depth * 16}px`,
          }}
          onClick={() => handleFileClickInternal(node.path, node)}
          onContextMenu={(e) => handleContextMenu(e, node)}
        >
          {/* Expand/Collapse arrow for folders */}
          {node.isFolder ? (
            <span
              className="flex-shrink-0 mr-0.5 cursor-pointer"
              style={{ color: 'rgba(255,255,255,0.3)' }}
              onClick={(e) => { e.stopPropagation(); toggleFolder(node.path); }}
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
          ) : (
            <span className="w-4 flex-shrink-0 mr-0.5" />
          )}

          {/* Icon */}
          <span className="flex-shrink-0 mr-1.5">
            <Icon size={14} color={iconColor} />
          </span>

          {/* Name / Rename input */}
          {isRenaming ? (
            <input
              ref={renameInputRef}
              className="flex-1 bg-transparent border-b outline-none text-xs px-0.5"
              style={{ color: '#FFFFFF', borderColor: '#FF9BB5' }}
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setRenamingId(null);
              }}
              onBlur={commitRename}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="truncate flex-1">{node.name}</span>
          )}

          {/* Hover actions - add file to folder */}
          {node.isFolder && !isRenaming && (
            <span
              className="opacity-0 group-hover:opacity-100 flex-shrink-0 mr-0.5 cursor-pointer"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              onClick={(e) => {
                e.stopPropagation();
                startCreate(node.path, 'file');
              }}
              title="New File"
            >
              <Plus size={12} />
            </span>
          )}
        </div>

        {/* Create inline input */}
        {isCreating && (
          <div
            className="flex items-center px-1 py-1 text-xs"
            style={{ paddingLeft: `${12 + (depth + 1) * 16}px` }}
          >
            {createType === 'folder' ? (
              <FolderPlus size={14} color="#8ECAE6" className="mr-1.5 flex-shrink-0" />
            ) : (
              <FilePlus size={14} color="#FF9BB5" className="mr-1.5 flex-shrink-0" />
            )}
            <input
              ref={createInputRef}
              className="flex-1 bg-transparent border-b outline-none text-xs px-0.5"
              style={{ color: '#FFFFFF', borderColor: '#FF9BB5' }}
              value={createValue}
              placeholder={createType === 'folder' ? 'folder name' : 'file name'}
              onChange={e => setCreateValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitCreate();
                if (e.key === 'Escape') {
                  setCreatingInFolder(null);
                  setCreateType(null);
                }
              }}
              onBlur={commitCreate}
              onClick={e => e.stopPropagation()}
            />
          </div>
        )}

        {/* Children */}
        {node.isFolder && isExpanded && node.children.length > 0 && (
          <div>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}

        {/* Empty folder state */}
        {node.isFolder && isExpanded && node.children.length === 0 && (
          <div
            className="text-xs py-1 italic"
            style={{
              color: 'rgba(255,255,255,0.25)',
              paddingLeft: `${12 + (depth + 1) * 16}px`,
            }}
          >
            (empty)
          </div>
        )}
      </div>
    );
  };

  const renderFlatGrouped = () => {
    // Fallback for flat file list (no folder structure)
    const grouped = files.reduce<Record<string, FileItemData[]>>((acc, file) => {
      if (!acc[file.type]) acc[file.type] = [];
      acc[file.type]!.push(file);
      return acc;
    }, {});

    return (
      <>
        {Object.entries(grouped).map(([type, typeFiles]) => (
          <div key={type}>
            <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
              style={{ color: 'rgba(255,255,255,0.3)' }}>
              {TYPE_LABELS[type] || type}
            </div>
            {typeFiles.map((file) => {
              const isActive = file.path === activeFile;
              return (
                <button
                  key={file.path}
                  className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-all cursor-pointer"
                  style={{
                    color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
                    background: isActive ? 'rgba(255,126,179,0.12)' : 'transparent',
                    borderLeft: isActive ? '2px solid #FF7EB3' : '2px solid transparent',
                  }}
                  onClick={() => handleFileClickInternal(file.path, {
                    name: file.name,
                    path: file.path,
                    id: file.id,
                    type: file.type,
                    fileType: file.type,
                    isFolder: false,
                    children: [],
                  })}
                  onContextMenu={(e) => handleContextMenu(e, {
                    name: file.name,
                    path: file.path,
                    id: file.id,
                    type: file.type,
                    fileType: file.type,
                    isFolder: false,
                    children: [],
                  })}>
                  <span className="flex-shrink-0" style={{ width: 24 }}>
                    {React.createElement(TYPE_ICONS[file.type] || File, { size: 14, color: TYPE_COLORS[file.type] || '#8E8E8E' })}
                  </span>
                  <span className="truncate">{file.name}</span>
                </button>
              );
            })}
          </div>
        ))}
      </>
    );
  };

  const hasFolderStructure = tree.length > 0 && tree.some(n => n.isFolder);

  return (
    <div className={className} style={{ background: '#16161D', position: 'relative', userSelect: 'none' }}>
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-3 py-2 text-xs font-semibold cursor-pointer uppercase tracking-wider"
        style={{ color: 'rgba(255,255,255,0.5)' }}
        onClick={() => collapsible && setCollapsed(!collapsed)}>
        <span>Project Files</span>
        <div className="flex items-center gap-1">
          {/* Clipboard indicator */}
          {clipboard && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(255,155,181,0.15)', color: '#FF9BB5' }}>
              {clipboard.isCut ? 'cut' : 'copy'} ({clipboard.fileIds.length})
            </span>
          )}
          {collapsible && (
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
              {collapsed ? '+' : '-'}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="overflow-y-auto">
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <Loader2 size={16} className="animate-spin mr-2" />
              <span className="text-xs">Loading files...</span>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && files.length === 0 && (
            <div className="text-center py-8 px-4">
              <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                No files — create one
              </p>
              <button
                onClick={() => startCreate('', 'file')}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={{
                  background: 'rgba(255,126,179,0.15)',
                  color: '#FF7EB3',
                }}
              >
                <FilePlus size={12} className="inline mr-1" />
                Create File
              </button>
            </div>
          )}

          {/* File tree */}
          {!isLoading && files.length > 0 && (
            <div>
              {hasFolderStructure ? (
                tree.map(node => renderTreeNode(node, 0))
              ) : (
                renderFlatGrouped()
              )}
            </div>
          )}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 py-1 rounded-lg shadow-xl border min-w-[180px]"
          style={{
            background: '#1E1E28',
            borderColor: 'rgba(255,255,255,0.08)',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={e => e.stopPropagation()}
        >
          {contextMenu.items.map((item, idx) => (
            <button
              key={idx}
              className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-all"
              style={{
                color: item.danger ? '#FF6B7A' : 'rgba(255,255,255,0.75)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
              onClick={(e) => {
                e.stopPropagation();
                item.action();
              }}
            >
              <span className="flex-shrink-0 w-4" style={{ color: item.danger ? '#FF6B7A' : 'rgba(255,255,255,0.4)' }}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.shortcut && (
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {item.shortcut}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
