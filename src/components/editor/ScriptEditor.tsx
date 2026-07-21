// Monaco Editor封装组件 - 集成galgameScript Monarch语法注册和自定义主题
// 支持指令addAction快捷插入、行号高亮当前执行行
// 脚本内容变化时通过onChange回调通知父组件
'use client';

import { useCallback, useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { registerGalgameLanguage } from './MonacoLanguageRegister';
import type * as Monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
// 本地打包 Monaco（仅 editor.api 子集，避免引入全部语言 worker 导致包体膨胀）。
// 关键：不要用 @monaco-editor/react 默认的 CDN（cdn.jsdelivr.net）加载 —— 浏览器 Tracking Prevention
// 会拦截跨源存储访问使编辑器加载失败，且加载失败会向上抛错连带拖垮同页的游戏预览。
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';

if (typeof window !== 'undefined') {
  // 自定义 galgameScript 仅用 Monarch 主线程分词 + 补全，基础 editor.worker 即可支撑编辑能力
  (window as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
    getWorker: () =>
      new Worker(
        new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url),
        { type: 'module' },
      ),
  };
  loader.config({ monaco: monaco as any });
}

import { allInstructionHandlers } from '@/engine/instructions/index';
import { INSTRUCTION_FIELDS } from '@/components/editor/InstructionInspector';

/** 指令 inline 补全是否已注册（语言级 provider 只注册一次） */
let galgameCompletionRegistered = false;

/**
 * Monaco 指令 inline 补全 —— 对标 avg-engine 的「Tab 菜单插 Block」。
 * 模式1：输入 `@` 触发，列出全部指令（带分类/格式/描述），选中后插入带参数骨架的 snippet。
 * 模式2：在 `@directive ` 后输入空格触发，列出该指令尚未使用的参数 key，一键插入 `key=$1`。
 */
function provideGalgameCompletions(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel,
  position: Monaco.Position,
): { suggestions: Monaco.languages.CompletionItem[] } {
  const lineUntil = model.getValueInRange({
    startLineNumber: position.lineNumber,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  });
  const suggestions: Monaco.languages.CompletionItem[] = [];

  // 模式1：指令名补全 —— 光标前形如 `@prefix`
  const atMatch = lineUntil.match(/@(\w*)$/);
  if (atMatch) {
    const prefix = atMatch[1] ?? '';
    const startCol = position.column - prefix.length; // 落在 @ 之后
    const range = new monaco.Range(position.lineNumber, startCol, position.lineNumber, position.column);
    for (const h of allInstructionHandlers) {
      const fields = INSTRUCTION_FIELDS[h.name];
      let snippet = '';
      if (fields && fields.length) {
        snippet = ' ' + fields
          .map((f, i) => {
            const ph = f.type === 'select' ? (f.options?.[0] ?? '') : (f.type === 'number' ? '0' : '');
            return `${f.key}=\${${i + 1}:${ph}}`;
          })
          .join(' ') + ' \$0';
      } else {
        snippet = ' \$0';
      }
      suggestions.push({
        label: '@' + h.name,
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: h.name + snippet,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        detail: `[${h.category}] ${h.format || ''}`,
        documentation: h.description || '',
        sortText: h.category + h.name,
        range,
      });
    }
    return { suggestions };
  }

  // 模式2：参数 key 补全 —— 整行是 @指令 且光标位于参数区
  const lineFull = model.getLineContent(position.lineNumber);
  const instrMatch = lineFull.match(/^@(\w+)\s/);
  if (instrMatch) {
    const name = instrMatch[1] ?? '';
    const fields = INSTRUCTION_FIELDS[name];
    if (fields && fields.length) {
      const afterInstr = lineUntil.slice(('@' + name).length);
      const keyPrefixMatch = afterInstr.match(/(?:^|\s)([a-zA-Z_]\w*)$/);
      if (keyPrefixMatch) {
        const prefix = keyPrefixMatch[1] ?? '';
        const startCol = position.column - prefix.length;
        const range = new monaco.Range(position.lineNumber, startCol, position.lineNumber, position.column);
        const used = new Set(
          (afterInstr.match(/([a-zA-Z_]\w*)=/g) || []).map((s) => s.slice(0, -1)),
        );
        let idx = 1;
        for (const f of fields) {
          if (used.has(f.key) || !f.key.startsWith(prefix)) continue;
          suggestions.push({
            label: f.key,
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: `${f.key}=\${${idx}}`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: f.label + (f.options ? ` (${f.options.join('/')})` : ''),
            documentation: f.type,
            sortText: '0' + f.key,
            range,
          });
          idx += 1;
        }
        if (suggestions.length) return { suggestions };
      }
    }
  }

  return { suggestions: [] };
}

/** ScriptEditor属性 */
interface ScriptEditorProps {
  /** 编辑器内容（脚本文本） */
  value: string;
  /** 内容变化回调 */
  onChange?: (value: string) => void;
  /** 当前引擎执行行号（用于高亮） */
  currentLine?: number;
  /** 编辑器语言（默认galgameScript） */
  language?: string;
  /** 是否只读模式 */
  readOnly?: boolean;
  /** 自定义CSS类名 */
  className?: string;
  /** 编辑器高度 */
  height?: string;
}

/** ScriptEditor组件 */
export default function ScriptEditor({
  value,
  onChange,
  currentLine = -1,
  language = 'galgameScript',
  readOnly = false,
  className = '',
  height = '100%',
}: ScriptEditorProps): React.JSX.Element {
  /** Monaco Editor实例ref */
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  /** Monaco全局对象ref */
  const monacoRef = useRef<typeof Monaco | null>(null);
  /** 是否已注册自定义语言 */
  const registeredRef = useRef<boolean>(false);

  /** Monaco Editor挂载回调 */
  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // 注册galgameScript自定义语言和主题
    if (!registeredRef.current) {
      registerGalgameLanguage(monaco as any);
      registeredRef.current = true;
    }

    // 注册指令 inline 补全（语言级 provider 全局只注册一次）
    if (!galgameCompletionRegistered) {
      monaco.languages.registerCompletionItemProvider('galgameScript', {
        triggerCharacters: ['@', ' '],
        provideCompletionItems: (model: Monaco.editor.ITextModel, position: Monaco.Position) =>
          provideGalgameCompletions(monaco as any, model, position),
      });
      galgameCompletionRegistered = true;
    }

    // 设置自定义主题
    monaco.editor.setTheme('galgameTheme');

    // 强制布局刷新以适应父容器宽度
    setTimeout(() => editor.layout(), 100);

    // 注册addAction快捷插入指令
    registerEditorActions(editor, monaco);

    // 光标位置变化 → 更新状态栏
    editor.onDidChangeCursorPosition((e) => {
      void window.dispatchEvent(new CustomEvent('galgame-cursor', {
        detail: { line: e.position.lineNumber, column: e.position.column },
      }));
    });
  }, []);

  /** 内容变化回调 */
  const handleEditorChange = useCallback((newValue: string | undefined) => {
    if (onChange && newValue !== undefined) {
      onChange(newValue);
    }
  }, [onChange]);

  // 窗口大小变化时重新布局编辑器
  useEffect(() => {
    const onResize = () => {
      editorRef.current?.layout();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Listen for insert-at-cursor commands from InstructionReference
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent).detail?.text as string;
      const editor = editorRef.current;
      if (!editor || !text) return;
      const pos = editor.getPosition();
      if (!pos) return;
      editor.executeEdits('galgame-insert-external', [{
        range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column },
        text,
      }]);
      editor.focus();
    };
    window.addEventListener('galgame-insert', handler);
    return () => window.removeEventListener('galgame-insert', handler);
  }, []);

  // Listen for whole-line replacement requests from InstructionInspector (property inspector).
  // Uses model.applyEdits so it updates text WITHOUT stealing focus from the inspector form.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { lineNumber?: number; text?: string } | undefined;
      const lineNumber = detail?.lineNumber;
      const text = detail?.text;
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (!editor || !monaco || typeof lineNumber !== 'number' || text == null) return;
      const model = editor.getModel();
      if (!model) return;
      const line = Math.max(1, Math.min(lineNumber, model.getLineCount()));
      const lineContent = model.getLineContent(line);
      model.applyEdits([{
        range: new monaco.Range(line, 1, line, lineContent.length + 1),
        text,
        forceMoveMarkers: true,
      }]);
    };
    window.addEventListener('galgame-replace-line', handler);
    return () => window.removeEventListener('galgame-replace-line', handler);
  }, []);

  // Listen for "jump to line" requests (from flow chart nodes and asset reference analysis).
  // Reveals the target line centered and moves the cursor there without a forced focus steal war.
  useEffect(() => {
    const handler = (e: Event) => {
      const line = (e as CustomEvent).detail?.line as number | undefined;
      const editor = editorRef.current;
      if (!editor || typeof line !== 'number' || line < 1) return;
      const model = editor.getModel();
      const maxLine = model ? model.getLineCount() : line;
      const target = Math.min(line, maxLine);
      editor.revealLineInCenter(target);
      editor.setPosition({ lineNumber: target, column: 1 });
      editor.focus();
    };
    window.addEventListener('galgame-goto-line', handler);
    return () => window.removeEventListener('galgame-goto-line', handler);
  }, []);

  /** 高亮当前执行行 */
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || currentLine < 0) return;

    // 清除之前的高亮装饰
    const decorations = editor.deltaDecorations(
      [],
      [
        {
          range: {
            startLineNumber: currentLine + 1,
            startColumn: 1,
            endLineNumber: currentLine + 1,
            endColumn: 1,
          },
          options: {
            isWholeLine: true,
            className: 'current-line-highlight',
            glyphMarginClassName: 'current-line-glyph',
          },
        },
      ],
    );

    // 清理装饰
    return () => {
      editor.deltaDecorations(decorations, []);
    };
  }, [currentLine]);

  /** 注册编辑器快捷操作（addAction） */
  function registerEditorActions(editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco): void {
    // Ctrl+S: 保存
    editor.addAction({
      id: 'save-script',
      label: '保存脚本',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => void window.dispatchEvent(new CustomEvent('galgame-save')),
    });

    // Ctrl+Enter: 预览
    editor.addAction({
      id: 'preview-run',
      label: '预览运行',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => void window.dispatchEvent(new CustomEvent('galgame-preview')),
    });

    // Ctrl+I: 切换指令速查面板
    editor.addAction({
      id: 'toggle-reference',
      label: '指令速查手册',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI],
      run: () => void window.dispatchEvent(new CustomEvent('galgame-toggle-reference')),
    });

    // Ctrl+Space: 切换AI面板
    editor.addAction({
      id: 'toggle-ai',
      label: 'AI助手面板',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space],
      run: () => void window.dispatchEvent(new CustomEvent('galgame-toggle-ai')),
    });

    // Ctrl+Shift+A: AI续写
    editor.addAction({
      id: 'ai-continue',
      label: 'AI续写',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyA],
      run: () => void window.dispatchEvent(new CustomEvent('galgame-ai-continue')),
    });

    // Ctrl+Shift+G: 切换流程图
    editor.addAction({
      id: 'toggle-flow',
      label: '流程图',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyG],
      run: () => void window.dispatchEvent(new CustomEvent('galgame-toggle-flow')),
    });

    // Ctrl+D: 快速插入对话模板
    editor.addAction({
      id: 'insert-dialog',
      label: '插入对话模板',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD],
      run: () => {
        const pos = editor.getPosition();
        if (pos) {
          editor.executeEdits('dialog-template', [{
            range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column },
            text: '\n角色名：\n',
          }]);
        }
      },
    });

    // Ctrl+B: 快速插入@bg指令
    editor.addAction({
      id: 'insert-bg',
      label: '插入背景指令',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB],
      run: () => {
        const pos = editor.getPosition();
        if (pos) {
          editor.executeEdits('bg-template', [{
            range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column },
            text: '\n@bg \n',
          }]);
        }
      },
    });

    // Ctrl+/ (CtrlCmd | Slash): 切换快捷键面板
    editor.addAction({
      id: 'toggle-shortcuts',
      label: '快捷键速查',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash],
      run: () => void window.dispatchEvent(new CustomEvent('galgame-toggle-shortcuts')),
    });
  }

  /** Monaco Editor配置选项 */
  const editorOptions: Monaco.editor.IStandaloneEditorConstructionOptions = {
    readOnly,
    minimap: { enabled: false },
    fontSize: 16,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordWrap: 'on',
    theme: 'galgameTheme',
    padding: { top: 10 },
    glyphMargin: true,
    folding: false,
    lineDecorationsWidth: 20,
    overviewRulerLanes: 0,
    scrollbar: {
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
  };

  return (
    <div className={`${className}`} style={{ height }}>
      {/* 自定义行高亮CSS */}
      <style>{`
        .current-line-highlight {
          background: rgba(255, 107, 157, 0.15) !important;
          border-left: 3px solid #FF6B9D !important;
        }
        .current-line-glyph {
          background: #FF6B9D;
          width: 4px !important;
          margin-left: 3px;
        }
      `}</style>

      <Editor
        height={height}
        language={language}
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorMount}
        options={editorOptions}
        loading={
          <div className="flex items-center justify-center h-full bg-[#1E1E28] text-white/60">
            加载编辑器...
          </div>
        }
      />
    </div>
  );
}
