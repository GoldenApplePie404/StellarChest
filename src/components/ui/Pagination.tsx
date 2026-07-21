// 分页组件 - galgame风格分页导航
'use client';

import Button from './Button';

/** 分页属性 */
interface PaginationProps {
  /** 当前页码 */
  currentPage: number;
  /** 总页数 */
  totalPages: number;
  /** 页码变化回调 */
  onPageChange: (page: number) => void;
}

/** Galgame风格分页组件 */
export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps): React.JSX.Element | null {
  // 总页数为0或1时不显示分页
  if (totalPages <= 1) return null;

  /** 计算显示的页码范围 */
  const getPageNumbers = (): number[] => {
    const pages: number[] = [];
    const maxVisible = 5; // 最多显示5个页码

    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    // 调整起始位置确保显示足够的页码
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {/* 上一页按钮 */}
      <Button
        variant="ghost"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        上一页
      </Button>

      {/* 首页按钮（当前不在前3页时显示） */}
      {currentPage > 3 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(1)}
        >
          1
        </Button>
      )}

      {/* 省略号 */}
      {currentPage > 4 && (
        <span className="text-text-secondary px-1">...</span>
      )}

      {/* 页码按钮 */}
      {pageNumbers.map((page) => (
        <Button
          key={page}
          variant={page === currentPage ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onPageChange(page)}
        >
          {page}
        </Button>
      ))}

      {/* 省略号 */}
      {currentPage < totalPages - 3 && (
        <span className="text-text-secondary px-1">...</span>
      )}

      {/* 末页按钮（当前不在后3页时显示） */}
      {currentPage < totalPages - 2 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(totalPages)}
        >
          {totalPages}
        </Button>
      )}

      {/* 下一页按钮 */}
      <Button
        variant="ghost"
        size="sm"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        下一页
      </Button>
    </div>
  );
}
