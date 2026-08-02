import {
  Archive,
  Eye,
  Pin,
  PinOff,
  Send,
  Star,
  StarOff,
  Trash2,
} from 'lucide-react'

import { Menu } from '@/components/ui'
import {
  useUpdateArticleRecommendMutation,
  useUpdateArticleStatusMutation,
  useUpdateArticleTopMutation,
} from '@/queries/article'
import type { ArticleVO } from '@/types/article'
import { toApiError } from '@/utils/request'

type ArticleListActionsProps = {
  article: ArticleVO
  onDelete: (article: ArticleVO) => void
  onError: (message: string) => void
}

export const ArticleListActions = ({
  article,
  onDelete,
  onError,
}: ArticleListActionsProps) => {
  const statusMutation = useUpdateArticleStatusMutation()
  const topMutation = useUpdateArticleTopMutation()
  const recommendMutation = useUpdateArticleRecommendMutation()
  const run = async (action: () => Promise<unknown>) => {
    try {
      await action()
    } catch (error) {
      onError(toApiError(error).message)
    }
  }

  const nextStatus =
    article.status === 'published'
      ? { status: 'draft' as const, label: '转为草稿', icon: <Archive /> }
      : { status: 'published' as const, label: '发布文章', icon: <Send /> }

  return (
    <Menu
      label={`${article.title} 更多操作`}
      items={[
        {
          label: nextStatus.label,
          icon: nextStatus.icon,
          onSelect: () =>
            void run(() =>
              statusMutation.mutateAsync({
                id: article.id,
                status: nextStatus.status,
              }),
            ),
        },
        ...(article.status !== 'hidden'
          ? [
              {
                label: '隐藏文章',
                icon: <Eye />,
                onSelect: () =>
                  void run(() =>
                    statusMutation.mutateAsync({
                      id: article.id,
                      status: 'hidden',
                    }),
                  ),
              },
            ]
          : []),
        {
          label: article.isTop ? '取消置顶' : '置顶文章',
          icon: article.isTop ? <PinOff /> : <Pin />,
          onSelect: () =>
            void run(() =>
              topMutation.mutateAsync({
                id: article.id,
                isTop: !article.isTop,
              }),
            ),
        },
        {
          label: article.isRecommend ? '取消推荐' : '推荐文章',
          icon: article.isRecommend ? <StarOff /> : <Star />,
          onSelect: () =>
            void run(() =>
              recommendMutation.mutateAsync({
                id: article.id,
                isRecommend: !article.isRecommend,
              }),
            ),
        },
        {
          label: '删除文章',
          icon: <Trash2 />,
          danger: true,
          separatorBefore: true,
          onSelect: () => onDelete(article),
        },
      ]}
    />
  )
}
