import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui'

type ArticleListPaginationProps = {
  page: number
  pages: number
  total: number
  onPageChange: (page: number) => void
}

export const ArticleListPagination = ({
  page,
  pages,
  total,
  onPageChange,
}: ArticleListPaginationProps) => (
  <footer className="article-pagination" aria-label="文章分页">
    <span>共 {total} 条</span>
    <div className="article-pagination__controls">
      <Button
        aria-label="上一页"
        disabled={page <= 1}
        icon={<ChevronLeft />}
        onClick={() => onPageChange(page - 1)}
        size="sm"
        variant="secondary"
      >
        上一页
      </Button>
      <span>
        {page} / {pages || 1}
      </span>
      <Button
        aria-label="下一页"
        disabled={page >= pages}
        icon={<ChevronRight />}
        iconPosition="right"
        onClick={() => onPageChange(page + 1)}
        size="sm"
        variant="secondary"
      >
        下一页
      </Button>
    </div>
  </footer>
)
