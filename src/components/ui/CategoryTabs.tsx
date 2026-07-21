// 分类标签组件 - galgame风格标签切换
'use client';

/** 分类标签数据 */
interface CategoryTab {
  /** 标签值 */
  value: string;
  /** 标签显示文字 */
  label: string;
}

/** 分类标签属性 */
interface CategoryTabsProps {
  /** 标签列表 */
  tabs: CategoryTab[];
  /** 当前激活值 */
  activeValue: string;
  /** 标签切换回调 */
  onChange: (value: string) => void;
}

/** Galgame风格分类标签组件 */
export default function CategoryTabs({
  tabs,
  activeValue,
  onChange,
}: CategoryTabsProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 border-b border-primary/10 pb-2">
      {tabs.map((tab) => {
        const isActive = tab.value === activeValue;
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`px-4 py-2 rounded-btn text-sm font-medium transition-all duration-150 ${
              isActive
                ? 'shadow-sm font-bold'
                : 'hover:bg-sakura-pale'
            }`}
            style={isActive
              ? { background: 'linear-gradient(135deg, #F07A9A, #FF9BB5)', color: '#FFFFFF' }
              : { color: 'var(--ink-light)' }
            }
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
