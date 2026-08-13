import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui'

type MusicPaginationProps = {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

export const MusicPagination = ({
  page,
  totalPages,
  total,
  onPageChange,
}: MusicPaginationProps) => (
  <footer aria-label="音乐分页" className="music-pagination">
    <span>共 {total} 首</span>
    <div className="music-pagination__controls">
      <Button
        disabled={page <= 1}
        icon={<ChevronLeft />}
        onClick={() => onPageChange(page - 1)}
        size="sm"
        variant="secondary"
      >
        上一页
      </Button>
      <span>
        {page} / {totalPages || 1}
      </span>
      <Button
        disabled={page >= totalPages}
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
