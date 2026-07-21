'use client';

import { useRef, useLayoutEffect, useEffect } from 'react';
import katex from 'katex';

interface PostContentProps {
  html: string;
}

interface CodeBlockInfo {
  language: string;
  code: string;
  element: HTMLElement;
}

/**
 * PostContent — 论坛帖子内容渲染组件
 * 功能：
 * 1. 渲染 HTML 内容（dangerouslySetInnerHTML）
 * 2. 美化代码块 → VS Code 风格，带行号、语言标签、复制按钮
 * 3. 渲染 Mermaid 图表 → 可缩放、可下载
 * 4. 渲染 KaTeX 公式 → 行内 \( \) 和块级 \[ \]
 */
export default function PostContent({ html }: PostContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mermaidReadyRef = useRef(false);
  const processedRef = useRef(false);

  // ---- 1. 初始化 Mermaid ----
  useEffect(() => {
    (async () => {
      try {
        const mermaidMod = await import('mermaid');
        const mm = mermaidMod.default || mermaidMod;
        mm.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
        });
        (window as any).__mermaid = mm;
      } catch (e) {
        console.error('Mermaid init error:', e);
      }
      mermaidReadyRef.current = true;
    })();
  }, []);

  // ---- 2. 内容注入后处理（非 Mermaid 部分：KaTeX、代码块、表格等） ----
  // 仅在首次挂载 + html 变化时执行，用 processedRef 防止 React 重渲染覆盖
  useLayoutEffect(() => {
    if (!containerRef.current || !html) return;
    if (processedRef.current) return;
    processedRef.current = true;
    const root = containerRef.current;

    // 逐项执行，各自 try-catch 隔离
    const safeProcess = (fn: () => void, name: string) => {
      try { fn(); } catch (e) { console.warn('[PostContent] ' + name + ' error:', e); }
    };

    safeProcess(() => renderKaTeXFormulas(root), 'KaTeX');
    safeProcess(() => enhanceCodeBlocks(root), 'code blocks');
    safeProcess(() => enhanceTables(root), 'tables');
    safeProcess(() => enhanceBlockquotes(root), 'blockquotes');
    safeProcess(() => enhanceHeadings(root), 'headings');
  }, [html]);

  // ---- 3. Mermaid 渲染（轮询等待初始化完成） ----
  useEffect(() => {
    if (!containerRef.current || !html) return;
    const checkReady = () => {
      if (!mermaidReadyRef.current || !containerRef.current) {
        setTimeout(checkReady, 200);
        return;
      }
      const root = containerRef.current;
      (async () => {
        await renderMermaidDiagrams(root);
      })();
    };
    checkReady();
  }, [html]);

  return (
    <div className="post-content" ref={containerRef}>
      <div
        className="post-content-inner"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

// ============================================================
// Helper: 增强代码块 (VS Code 风格)
// ============================================================
function enhanceCodeBlocks(root: HTMLElement) {
  const preBlocks = root.querySelectorAll('pre');
  preBlocks.forEach((pre, index) => {
    try {
      // 跳过已处理的
      if (pre.classList.contains('vscode-enhanced')) return;
      // 跳过 Mermaid blocks
      if (pre.classList.contains('mermaid')) return;

      const codeEl = pre.querySelector('code');
      if (!codeEl) return;

    let code = codeEl.textContent || '';
    const className = codeEl.className || '';
    const langMatch = className.match(/language-(\w+)/);
    const language = langMatch ? langMatch[1] : 'text';
    const lines = code.split('\n');

    pre.classList.add('vscode-enhanced');
    pre.style.cssText = '';

    // --- 构建 VS Code 风格外壳 ---
    const wrapper = document.createElement('div');
    wrapper.className = 'vscode-block';
    wrapper.dataset.index = String(index);

    // 顶部栏：语言标签 + 操作按钮
    const header = document.createElement('div');
    header.className = 'vscode-header';

    const langLabel = document.createElement('span');
    langLabel.className = 'vscode-lang';
    langLabel.textContent = getLanguageLabel(language || 'text');

    const actions = document.createElement('div');
    actions.className = 'vscode-actions';

    // 复制按钮
    const copyBtn = document.createElement('button');
    copyBtn.className = 'vscode-btn vscode-copy-btn';
    copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
    copyBtn.title = '复制代码';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(code).then(() => {
        copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6BCB77" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
        setTimeout(() => {
          copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
        }, 2000);
      });
    });

    actions.appendChild(copyBtn);
    header.appendChild(langLabel);
    header.appendChild(actions);

    // --- 代码内容区域：行号 + 代码行 ---
    const codeArea = document.createElement('div');
    codeArea.className = 'vscode-code-area';

    // 行号列
    const lineNumbers = document.createElement('div');
    lineNumbers.className = 'vscode-line-numbers';
    lines.forEach((_, i) => {
      const num = document.createElement('span');
      num.className = 'vscode-line-number';
      num.textContent = String(i + 1);
      lineNumbers.appendChild(num);
    });

    // 代码列（保留原始 code 内容用于语法高亮）
    const codeContent = document.createElement('div');
    codeContent.className = 'vscode-code-content';

    // 对代码行应用简单的语法高亮
    const highlightedLines = highlightSyntax(code, language || 'text');

    lines.forEach((line, i) => {
      const lineEl = document.createElement('div');
      lineEl.className = 'vscode-code-line';
      lineEl.innerHTML = highlightedLines[i] || escapeHtml(line) || '&nbsp;';
      codeContent.appendChild(lineEl);
    });

    codeArea.appendChild(lineNumbers);
    codeArea.appendChild(codeContent);

    wrapper.appendChild(header);
    wrapper.appendChild(codeArea);

    // 替换原有的 <pre> 标签
    pre.parentNode?.replaceChild(wrapper, pre);
    } catch {
      // 单个代码块处理失败不影响其他块
    }
  });
}

// ============================================================
// Helper: 渲染 Mermaid 图表
// ============================================================
// Helper: 渲染 Mermaid 图表
// ============================================================
async function renderMermaidDiagrams(root: HTMLElement) {
  const mermaidBlocks = Array.from(root.querySelectorAll<HTMLElement>('pre.mermaid'));
  if (mermaidBlocks.length === 0) return;

  const mm = (window as any).__mermaid as typeof import('mermaid').default | undefined;
  if (!mm) {
    mermaidBlocks.forEach(block => {
      block.innerHTML = '<div class="mermaid-error">⚠️ Mermaid 未初始化</div>';
    });
    return;
  }

  // 1. 先同步清理定义，保留 <pre class="mermaid"> 结构给 mermaid.run() 使用
  const blockDefinitions = new Map<HTMLElement, string>();
  mermaidBlocks.forEach((block) => {
    if (block.dataset.mermaidProcessed === 'true') return;
    block.dataset.mermaidProcessed = 'true';

    const codeEl = block.querySelector('code');
    if (!codeEl) return;
    const definition = codeEl.textContent || '';
    if (!definition.trim()) return;

    const cleanDef = sanitizeMermaidDefinition(definition);
    blockDefinitions.set(block, cleanDef);
  });

  // 2. 逐块渲染 Mermaid — 使用 render() 而非 run()，避免 DOM 结构问题
  let renderIndex = 0;
  for (const block of mermaidBlocks) {
    const def = blockDefinitions.get(block);
    if (!def) continue;
    try {
      const { svg } = await mm.render(`mermaid-render-${renderIndex++}`, def);
      block.innerHTML = svg;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.warn('Mermaid block render warning:', msg);
      block.innerHTML = `<div class="mermaid-error">⚠️ 图表渲染失败</div>`;
    }
  }

  // 3. 渲染完成后，为每个块添加自定义工具栏和交互
  let mermaidIndex = 0;
  for (const block of mermaidBlocks) {
    const index = mermaidIndex++;
    const svgEl = block.querySelector('svg');
    if (!svgEl) {
      block.innerHTML = '<div class="mermaid-error">⚠️ 图表渲染失败：未生成 SVG</div>';
      continue;
    }

    // 包装成 mermaid-wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'mermaid-wrapper';

    const svgContainer = document.createElement('div');
    svgContainer.className = 'mermaid-svg-container';
    svgContainer.style.cssText = 'padding:1.5rem;overflow:auto;max-height:600px;cursor:grab;min-height:100px;';

    // 把 SVG 从 <pre> 移到 svgContainer
    svgContainer.appendChild(svgEl);
    svgEl.style.maxWidth = '100%';
    svgEl.style.height = 'auto';
    svgEl.style.display = 'block';

    // 工具栏
    const toolbar = document.createElement('div');
    toolbar.className = 'mermaid-toolbar';

    const zoomGroup = document.createElement('div');
    zoomGroup.className = 'mermaid-toolbar-group';

    const zoomInBtn = document.createElement('button');
    zoomInBtn.className = 'mermaid-tb-btn';
    zoomInBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`;
    zoomInBtn.title = '放大';
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.className = 'mermaid-tb-btn';
    zoomOutBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`;
    zoomOutBtn.title = '缩小';
    const zoomResetBtn = document.createElement('button');
    zoomResetBtn.className = 'mermaid-tb-btn';
    zoomResetBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;
    zoomResetBtn.title = '重置缩放';
    zoomGroup.appendChild(zoomInBtn);
    zoomGroup.appendChild(zoomOutBtn);
    zoomGroup.appendChild(zoomResetBtn);

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'mermaid-tb-btn';
    downloadBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
    downloadBtn.title = '下载图片 (PNG)';

    const copyCodeBtn = document.createElement('button');
    copyCodeBtn.className = 'mermaid-tb-btn';
    copyCodeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
    copyCodeBtn.title = '复制源码';

    toolbar.appendChild(zoomGroup);
    toolbar.appendChild(copyCodeBtn);
    toolbar.appendChild(downloadBtn);

    wrapper.appendChild(svgContainer);
    wrapper.appendChild(toolbar);

    // 替换原来的 pre.mermaid
    block.parentNode?.replaceChild(wrapper, block);

    // --- 缩放 ---
    let scale = 1;
    const setScale = (s: number) => {
      scale = Math.max(0.3, Math.min(3, s));
      svgEl.style.transform = `scale(${scale})`;
      svgEl.style.transformOrigin = 'top left';
    };
    zoomInBtn.addEventListener('click', () => setScale(scale + 0.2));
    zoomOutBtn.addEventListener('click', () => setScale(scale - 0.2));
    zoomResetBtn.addEventListener('click', () => setScale(1));
    svgContainer.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setScale(scale + (e.deltaY > 0 ? -0.1 : 0.1));
      }
    });

    // --- 拖拽 ---
    let isPanning = false, startX = 0, startY = 0, scrollLeft = 0, scrollTop = 0;
    svgContainer.addEventListener('mousedown', (e) => {
      isPanning = true;
      startX = e.pageX - svgContainer.offsetLeft;
      startY = e.pageY - svgContainer.offsetTop;
      scrollLeft = svgContainer.scrollLeft;
      scrollTop = svgContainer.scrollTop;
      svgContainer.style.cursor = 'grabbing';
    });
    svgContainer.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      e.preventDefault();
      svgContainer.scrollLeft = scrollLeft - (e.pageX - svgContainer.offsetLeft - startX);
      svgContainer.scrollTop = scrollTop - (e.pageY - svgContainer.offsetTop - startY);
    });
    ['mouseup', 'mouseleave'].forEach(evt => {
      svgContainer.addEventListener(evt, () => { isPanning = false; svgContainer.style.cursor = 'grab'; });
    });

    // --- 下载 PNG ---
    downloadBtn.addEventListener('click', () => {
      const svgData = svgContainer.innerHTML;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        ctx!.scale(2, 2);
        ctx!.fillStyle = '#FFFFFF';
        ctx!.fillRect(0, 0, canvas.width, canvas.height);
        ctx!.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `mermaid-diagram-${index}.png`;
        a.click();
      };
      img.src = url;
    });

    // --- 复制源码 ---
    const def = blockDefinitions.get(block) || '';
    copyCodeBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(def).then(() => {
        const orig = copyCodeBtn.innerHTML;
        copyCodeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6BCB77" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
        setTimeout(() => { copyCodeBtn.innerHTML = orig; }, 2000);
      });
    });
  }
}

// ============================================================
// Helper: 渲染 KaTeX 公式
// ============================================================
function renderKaTeXFormulas(root: HTMLElement) {
  // 单次遍历处理所有 <code> 元素，同时处理行内公式 \(...\) 和块级公式 \[...\]
  const codeElements = root.querySelectorAll('code');
  codeElements.forEach((codeEl) => {
    // 如果已经不在 DOM 中（被前一次迭代替换了），跳过
    if (!codeEl.isConnected) return;

    const text = codeEl.textContent || '';
    const trimmed = text.trim();

    // 块级公式 \[ ... \]（优先匹配，因为同时包含 \[ 时 \( 也在其中）
    if (trimmed.startsWith('\\[') && trimmed.endsWith('\\]')) {
      const formula = trimmed.slice(2, -2).trim();
      if (!formula) return;
      try {
        const wrapper = document.createElement('div');
        wrapper.className = 'katex-block-wrapper';
        const span = document.createElement('span');
        span.className = 'katex-block';
        katex.render(formula, span, { displayMode: true, throwOnError: false });
        wrapper.appendChild(span);
        codeEl.parentNode?.replaceChild(wrapper, codeEl);
        // 移除因 KaTeX 替换而变空的 <pre> 父标签
        const preParent = wrapper.parentElement;
        if (preParent && preParent.tagName === 'PRE' && !preParent.querySelector('code')) {
          preParent.parentNode?.replaceChild(wrapper, preParent);
        }
      } catch { /* 保持原样 */ }
      return;
    }

    // 行内公式 \( ... \)
    if (text.includes('\\(') && text.includes('\\)')) {
      const inlineMatch = text.match(/^\\\(([\s\S]*?)\\\)$/);
      if (!inlineMatch) return;
      const formula = inlineMatch[1]?.trim();
      if (!formula) return;
      try {
        const span = document.createElement('span');
        span.className = 'katex-inline';
        katex.render(formula, span, { displayMode: false, throwOnError: false });
        codeEl.parentNode?.replaceChild(span, codeEl);
      } catch { /* 保持原样 */ }
    }
  });
}

// ============================================================
// Helper: 美化表格
// ============================================================
function enhanceTables(root: HTMLElement) {
  const tables = root.querySelectorAll('table');
  tables.forEach((table) => {
    if (table.classList.contains('enhanced-table')) return;
    table.classList.add('enhanced-table');

    // 添加表格容器
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    table.parentNode?.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
}

// ============================================================
// Helper: 美化引用块
// ============================================================
function enhanceBlockquotes(root: HTMLElement) {
  const quotes = root.querySelectorAll('blockquote');
  quotes.forEach((bq, i) => {
    if (bq.classList.contains('enhanced-bq')) return;
    bq.classList.add('enhanced-bq');
    // 嵌套引用添加缩进标记
    const parentBq = bq.parentElement?.closest('blockquote');
    if (parentBq) {
      bq.classList.add('nested-bq');
    }
  });
}

// ============================================================
// Helper: 美化标题
// ============================================================
function enhanceHeadings(root: HTMLElement) {
  root.querySelectorAll('h1, h2, h3').forEach((h) => {
    if (h.classList.contains('enhanced-h')) return;
    h.classList.add('enhanced-h');
    // h1 加装饰线
    if (h.tagName === 'H1') {
      h.classList.add('heading-h1');
    }
  });
}

// ============================================================
// Helper: 遍历文本节点
// ============================================================
function walkTextNodes(root: Node, callback: (node: Text) => void) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    callback(node);
  }
}

// ============================================================
// Helper: 清理 Mermaid 定义中的中文文本
// Mermaid 的解析器不支持裸中文，需要在中文标签外包裹引号
// 这里只做保守的替换，复杂的表格已由帖子内容自身保证格式正确
// ============================================================
function sanitizeMermaidDefinition(def: string): string {
  let result = def;

  // 1. 单行标签加引号:  A[中文] → A["中文"], B{中文} → B{"中文"}
  result = result.replace(/(\w+)\[([^\]]*[\u4e00-\u9fff][^\]]*)\]/g, (_, id, label) => {
    if (/^["']/.test(label)) return _;
    return `${id}["${label}"]`;
  });
  result = result.replace(/(\w+)\{([^}]*[\u4e00-\u9fff][^}]*)\}/g, (_, id, label) => {
    if (/^["']/.test(label)) return _;
    return `${id}{"${label}"}`;
  });

  // 2. 饼图中文标签: 中文 : 数字 → "中文" : 数字
  result = result.replace(/^([ \t]*)([\u4e00-\u9fff][^\d\n]*?)([ \t]*:\d)/gm, '$1"$2"$3');

  // 3. Gantt section 和 title 中文
  result = result.replace(/^(section[ \t]+)([\u4e00-\u9fff][^\n]*)/gm, (_, p, n) => {
    if (/^["']/.test(n.trim())) return _;
    return p + '"' + n.trim() + '"';
  });
  result = result.replace(/^(title[ \t]+)([\u4e00-\u9fff][^\n]*)/gm, (_, p, n) => {
    if (/^["']/.test(n.trim())) return _;
    return p + '"' + n.trim() + '"';
  });

  return result;
}

// ============================================================
// Helper: 简单的语法高亮
// ============================================================
function highlightSyntax(code: string, language: string): string[] {
  const lines = code.split('\n');
  return lines.map(line => highlightLine(line, language));
}

function highlightLine(line: string, lang: string): string {
  let escaped = escapeHtml(line);

  if (lang === 'javascript' || lang === 'js' || lang === 'typescript' || lang === 'ts') {
    // 注释
    escaped = escaped.replace(/(\/\/.*)/g, '<span class="hl-comment">$1</span>');
    // 字符串
    escaped = escaped.replace(/(["'`])(?:(?!\1|\\).|\\.)*\1/g, '<span class="hl-string">$&</span>');
    // 关键字
    const keywords = /\b(function|const|let|var|return|if|else|for|while|class|interface|type|import|export|from|async|await|new|throw|try|catch|finally|typeof|instanceof|in|of|this|super|extends|implements|enum|as|void|null|undefined|true|false|switch|case|default|break|continue|do|yield)\b/g;
    escaped = escaped.replace(keywords, '<span class="hl-keyword">$1</span>');
    // 数字
    escaped = escaped.replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>');
  } else if (lang === 'python' || lang === 'py') {
    escaped = escaped.replace(/(#.*)/g, '<span class="hl-comment">$1</span>');
    escaped = escaped.replace(/(["'])(?:(?!\1|\\).|\\.)*\1/g, '<span class="hl-string">$&</span>');
    const kw = /\b(def|class|return|if|elif|else|for|while|import|from|as|with|try|except|finally|raise|pass|break|continue|in|is|not|and|or|True|False|None|async|await|yield|lambda|self)\b/g;
    escaped = escaped.replace(kw, '<span class="hl-keyword">$1</span>');
    escaped = escaped.replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>');
  } else if (lang === 'css') {
    escaped = escaped.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>');
    escaped = escaped.replace(/(--[\w-]+)/g, '<span class="hl-variable">$1</span>');
    escaped = escaped.replace(/(#[0-9a-fA-F]{3,8})/g, '<span class="hl-hexcolor">$1</span>');
    escaped = escaped.replace(/(\d+\.?\d*)(px|rem|em|vh|vw|%|s|ms)/g, '<span class="hl-number">$1</span><span class="hl-unit">$2</span>');
    escaped = escaped.replace(/([{}])/g, '<span class="hl-brace">$1</span>');
  } else if (lang === 'sql') {
    escaped = escaped.replace(/(--.*)/g, '<span class="hl-comment">$1</span>');
    const sqlKw = /\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|INDEX|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|IN|LIKE|BETWEEN|IS|NULL|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|COUNT|SUM|AVG|MIN|MAX|PRIMARY|KEY|FOREIGN|REFERENCES|CASCADE|DEFAULT|CONSTRAINT|INTEGER|VARCHAR|TEXT|BOOLEAN|TIMESTAMP|UUID|CURRENT_TIMESTAMP|NOW|TRUE|FALSE)\b/gi;
    escaped = escaped.replace(sqlKw, '<span class="hl-keyword">$1</span>');
  } else if (lang === 'bash' || lang === 'sh') {
    escaped = escaped.replace(/(#.*)/g, '<span class="hl-comment">$1</span>');
    escaped = escaped.replace(/(["'`])(?:(?!\1|\\).|\\.)*\1/g, '<span class="hl-string">$&</span>');
  } else if (lang === 'json') {
    escaped = escaped.replace(/(["'])(?:(?!\1|\\).|\\.)*\1/g, '<span class="hl-string">$&</span>');
    escaped = escaped.replace(/\b(true|false|null)\b/g, '<span class="hl-keyword">$1</span>');
    escaped = escaped.replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>');
  }

  // 通用：函数调用
  escaped = escaped.replace(/\b([a-zA-Z_$][\w$]*)\s*\(/g, '<span class="hl-function">$1</span>(');
  // 通用：类型标注
  escaped = escaped.replace(/: (\w+)/g, ': <span class="hl-type">$1</span>');

  return escaped;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getLanguageLabel(lang: string): string {
  const labels: Record<string, string> = {
    js: 'JavaScript', javascript: 'JavaScript',
    ts: 'TypeScript', typescript: 'TypeScript',
    py: 'Python', python: 'Python',
    css: 'CSS',
    sql: 'SQL',
    json: 'JSON',
    bash: 'Bash', sh: 'Shell',
    html: 'HTML',
    xml: 'XML',
    yaml: 'YAML', yml: 'YAML',
    md: 'Markdown', markdown: 'Markdown',
    text: 'Text',
  };
  return labels[lang] || lang.toUpperCase();
}
