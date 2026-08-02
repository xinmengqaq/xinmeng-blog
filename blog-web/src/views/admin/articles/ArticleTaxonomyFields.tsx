import { Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Alert, Button, FormField, Input } from '@/components/ui'
import {
  useCreateCategoryMutation,
  useCreateTagMutation,
  useCategoriesQuery,
  useTagsQuery,
} from '@/queries/taxonomy'
import { toApiError } from '@/utils/request'

import { TaxonomyQuickCreateDialog } from './TaxonomyQuickCreateDialog'

type ArticleTaxonomyFieldsProps = {
  categoryId: number | null
  tagIds: number[]
  onCategoryChange: (categoryId: number | null) => void
  onTagIdsChange: (tagIds: number[]) => void
  onAvailabilityChange: (available: boolean) => void
}

export const ArticleTaxonomyFields = ({
  categoryId,
  tagIds,
  onCategoryChange,
  onTagIdsChange,
  onAvailabilityChange,
}: ArticleTaxonomyFieldsProps) => {
  const categoriesQuery = useCategoriesQuery()
  const tagsQuery = useTagsQuery()
  const createCategoryMutation = useCreateCategoryMutation()
  const createTagMutation = useCreateTagMutation()
  const [categorySearch, setCategorySearch] = useState('')
  const [tagSearch, setTagSearch] = useState('')
  const [quickKind, setQuickKind] = useState<'category' | 'tag' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const available = !categoriesQuery.isError && !tagsQuery.isError

  useEffect(() => {
    onAvailabilityChange(available)
  }, [available, onAvailabilityChange])

  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  )
  const tags = useMemo(() => tagsQuery.data ?? [], [tagsQuery.data])
  const visibleCategories = useMemo(
    () =>
      categories
        .filter((item) => item.status === 'visible' || item.id === categoryId)
        .filter((item) =>
          item.name.toLowerCase().includes(categorySearch.trim().toLowerCase()),
        ),
    [categories, categoryId, categorySearch],
  )
  const filteredTags = useMemo(
    () =>
      tags.filter((item) =>
        item.name.toLowerCase().includes(tagSearch.trim().toLowerCase()),
      ),
    [tags, tagSearch],
  )
  const selectedTags = tags.filter((tag) => tagIds.includes(tag.id))

  const quickCreate = async (name: string) => {
    try {
      if (quickKind === 'category') {
        const result = await createCategoryMutation.mutateAsync({
          name,
          description: null,
          sortOrder: 0,
          status: 'visible',
        })
        onCategoryChange(result.id)
      } else {
        const result = await createTagMutation.mutateAsync({ name })
        onTagIdsChange([...new Set([...tagIds, result.id])])
      }
      setQuickKind(null)
      setError(null)
    } catch (nextError) {
      setError(toApiError(nextError).message)
    }
  }

  if (categoriesQuery.isLoading || tagsQuery.isLoading)
    return <p className="article-taxonomy-loading">正在加载分类和标签。</p>

  return (
    <div className="article-taxonomy-fields">
      {!available ? (
        <Alert type="error">分类或标签加载失败，暂时不能保存文章。</Alert>
      ) : null}
      {error ? <Alert type="error">{error}</Alert> : null}
      <FormField htmlFor="article-category-search" label="文章分类">
        <Input
          id="article-category-search"
          leftIcon={<Search />}
          placeholder="筛选分类"
          value={categorySearch}
          onChange={(event) => setCategorySearch(event.target.value)}
        />
        <select
          className="article-select"
          value={categoryId ?? ''}
          onChange={(event) =>
            onCategoryChange(
              event.target.value ? Number(event.target.value) : null,
            )
          }
        >
          <option value="">不设置分类</option>
          {visibleCategories.map((category) => (
            <option
              key={category.id}
              value={category.id}
              disabled={
                category.status === 'hidden' && category.id !== categoryId
              }
            >
              {category.name}
              {category.status === 'hidden' ? '（已隐藏）' : ''}
            </option>
          ))}
        </select>
        {categorySearch.trim() &&
        !categories.some((item) => item.name === categorySearch.trim()) ? (
          <Button
            icon={<Plus />}
            size="sm"
            variant="link"
            onClick={() => setQuickKind('category')}
          >
            新建“{categorySearch.trim()}”
          </Button>
        ) : null}
      </FormField>
      <FormField htmlFor="article-tag-search" label="文章标签">
        <Input
          id="article-tag-search"
          leftIcon={<Search />}
          placeholder="筛选标签"
          value={tagSearch}
          onChange={(event) => setTagSearch(event.target.value)}
        />
        {selectedTags.length ? (
          <div className="article-selected-tags">
            {selectedTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() =>
                  onTagIdsChange(tagIds.filter((id) => id !== tag.id))
                }
              >
                {tag.name}
                <X />
              </button>
            ))}
          </div>
        ) : (
          <span className="article-taxonomy-empty">尚未选择标签</span>
        )}
        <div className="article-tag-options">
          {filteredTags.map((tag) => (
            <label key={tag.id}>
              <input
                type="checkbox"
                checked={tagIds.includes(tag.id)}
                onChange={(event) =>
                  onTagIdsChange(
                    event.target.checked
                      ? [...new Set([...tagIds, tag.id])]
                      : tagIds.filter((id) => id !== tag.id),
                  )
                }
              />
              <span>{tag.name}</span>
            </label>
          ))}
        </div>
        {tagSearch.trim() &&
        !tags.some((item) => item.name === tagSearch.trim()) ? (
          <Button
            icon={<Plus />}
            size="sm"
            variant="link"
            onClick={() => setQuickKind('tag')}
          >
            新建“{tagSearch.trim()}”
          </Button>
        ) : null}
      </FormField>
      <TaxonomyQuickCreateDialog
        kind={quickKind ?? 'tag'}
        open={quickKind !== null}
        initialName={quickKind === 'category' ? categorySearch : tagSearch}
        loading={
          createCategoryMutation.isPending || createTagMutation.isPending
        }
        onClose={() => setQuickKind(null)}
        onSubmit={quickCreate}
      />
    </div>
  )
}
