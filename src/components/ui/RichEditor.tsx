// 星墨富文本编辑器 — 基于 TipTap，支持大标题/小标题/列表/代码块/表格/任务列表等
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Code, Image as ImageIcon, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight, Highlighter,
  CheckSquare, Undo, Redo, Eye, FileEdit,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** 是否显示预览模式 */
  showPreview?: boolean;
  /** 预览模式切换回调 */
  onTogglePreview?: () => void;
}

const MenuButton = ({ onClick, active, children, title }: {
  onClick: () => void; active?: boolean; children: React.ReactNode; title?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className="w-8 h-8 flex items-center justify-center rounded transition-colors"
    style={{
      background: active ? '#FF9BB5' : 'transparent',
      color: active ? '#FFFFFF' : '#7A6F75',
    }}>
    {children}
  </button>
);

const Divider = () => (
  <div className="w-px h-6 mx-1" style={{ background: '#E8DCF0' }} />
);

export default function RichEditor({ content, onChange, placeholder, showPreview, onTogglePreview }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: placeholder || '开始撰写你的内容...',
      }),
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] px-6 py-4',
        style: 'color: #4A3F45; line-height: 1.8;',
      },
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('输入链接地址', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('输入图片URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  /** 打开文件选择器上传图片 */
  const handleUploadImage = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  /** 处理文件选择后上传 */
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    // 校验文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    // 校验文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'images');

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('galgame_token') || ''}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (result.code === 200 && result.data) {
        const imageUrl = result.data.url || `/api/files/download?key=${encodeURIComponent(result.data.fileKey || result.data.key)}`;
        editor.chain().focus().setImage({ src: imageUrl }).run();
      } else {
        alert(result.message || '图片上传失败');
      }
    } catch {
      alert('图片上传失败，请重试');
    } finally {
      setUploading(false);
      // 重置 file input 以便重复选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border rounded-xl overflow-hidden" style={{
      borderColor: '#E8DCF0',
      background: '#FFFFFF',
    }}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b" style={{
        background: '#FFFAF5',
        borderColor: '#E8DCF0',
      }}>
        <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="粗体"><Bold size={15} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="斜体"><Italic size={15} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="下划线"><UnderlineIcon size={15} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="删除线"><Strikethrough size={15} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="高亮"><Highlighter size={15} /></MenuButton>

        <Divider />

        <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="大标题"><Heading1 size={15} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="中标题"><Heading2 size={15} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="小标题"><Heading3 size={15} /></MenuButton>

        <Divider />

        <MenuButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="无序列表"><List size={15} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="有序列表"><ListOrdered size={15} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="任务清单"><CheckSquare size={15} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="引用"><Quote size={15} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="代码块"><Code size={15} /></MenuButton>

        <Divider />

        <MenuButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="左对齐"><AlignLeft size={15} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="居中"><AlignCenter size={15} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="右对齐"><AlignRight size={15} /></MenuButton>

        <Divider />

        <MenuButton onClick={setLink} active={editor.isActive('link')} title="插入链接"><LinkIcon size={15} /></MenuButton>
        <MenuButton onClick={handleUploadImage} title="上传图片" active={uploading}>
          {uploading ? <span className="text-xs animate-pulse">...</span> : <ImageIcon size={15} />}
        </MenuButton>
        <MenuButton onClick={addImage} title="输入图片URL">
          <span className="text-[10px] font-bold">URL</span>
        </MenuButton>

        {/* 隐藏的文件上传输入框 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <Divider />

        {onTogglePreview && (
          <MenuButton onClick={onTogglePreview} active={showPreview} title={showPreview ? '编辑模式' : '预览模式'}>
            {showPreview ? <FileEdit size={15} /> : <Eye size={15} />}
          </MenuButton>
        )}

        <div className="flex-1" />

        <MenuButton onClick={() => editor.chain().focus().undo().run()} title="撤销"><Undo size={15} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().redo().run()} title="重做"><Redo size={15} /></MenuButton>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />
    </div>
  );
}
