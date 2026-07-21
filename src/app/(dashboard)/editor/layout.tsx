// 编辑器布局 -- 全屏深色
export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#1E1E28', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {children}
    </div>
  );
}
