import { Switch } from '@/components/ui'
import type { ArticleStatus } from '@/types/article'

type ArticlePublishFieldsProps = {
  status: ArticleStatus
  isTop: boolean
  isRecommend: boolean
  onStatusChange: (status: ArticleStatus) => void
  onTopChange: (isTop: boolean) => void
  onRecommendChange: (isRecommend: boolean) => void
}

const options: Array<{ value: ArticleStatus; label: string }> = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'hidden', label: '隐藏' },
]

export const ArticlePublishFields = ({
  status,
  isTop,
  isRecommend,
  onStatusChange,
  onTopChange,
  onRecommendChange,
}: ArticlePublishFieldsProps) => (
  <div className="article-publish-fields">
    <fieldset className="article-editor-status">
      <legend>状态</legend>
      {options.map((option) => (
        <label key={option.value}>
          <input
            checked={status === option.value}
            name="article-status"
            type="radio"
            value={option.value}
            onChange={() => onStatusChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
    <Switch
      checked={isTop}
      label="置顶文章"
      description={
        isTop ? '文章将在列表排序中优先展示。' : '文章按后端默认顺序展示。'
      }
      onChange={onTopChange}
    />
    <Switch
      checked={isRecommend}
      label="推荐文章"
      description={
        isRecommend ? '文章已进入推荐内容范围。' : '文章不会显示为推荐内容。'
      }
      onChange={onRecommendChange}
    />
  </div>
)
