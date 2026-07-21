// 搜索栏组件 - galgame风格搜索输入
'use client';

import { useState } from 'react';
import Input from './Input';
import Button from './Button';

/** 搜索栏属性 */
interface SearchBarProps {
  /** 搜索回调 */
  onSearch: (keyword: string) => void;
  /** 占位文字 */
  placeholder?: string;
  /** 初始搜索关键词 */
  initialValue?: string;
}

/** Galgame风格搜索栏组件 */
export default function SearchBar({
  onSearch,
  placeholder = '搜索...',
  initialValue = '',
}: SearchBarProps): React.JSX.Element {
  const [keyword, setKeyword] = useState<string>(initialValue);

  /** 处理搜索提交 */
  const handleSearch = (): void => {
    onSearch(keyword.trim());
  };

  /** 处理键盘回车搜索 */
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  /** 处理清空搜索 */
  const handleClear = (): void => {
    setKeyword('');
    onSearch('');
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1" onKeyDown={handleKeyDown}>
        <Input
          placeholder={placeholder}
          value={keyword}
          onChange={setKeyword}
        />
      </div>
      <Button variant="primary" size="md" onClick={handleSearch}>
        搜索
      </Button>
      {keyword && (
        <Button variant="ghost" size="md" onClick={handleClear}>
          清空
        </Button>
      )}
    </div>
  );
}
