import { useEffect, useState } from 'react'

import { Alert, Button, FormField, Input, Modal } from '@/components/ui'
import type {
  CategorySaveParams,
  CategoryStatus,
  CategoryVO,
  TagVO,
} from '@/types/taxonomy'

type TaxonomyDialogProps =
  | {
      kind: 'category'
      open: boolean
      item?: CategoryVO | null
      loading: boolean
      requestError?: string | null
      onClose: () => void
      onSubmit: (params: CategorySaveParams) => Promise<void>
    }
  | {
      kind: 'tag'
      open: boolean
      item?: TagVO | null
      loading: boolean
      requestError?: string | null
      onClose: () => void
      onSubmit: (params: { name: string }) => Promise<void>
    }

export const TaxonomyDialog = (props: TaxonomyDialogProps) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [status, setStatus] = useState<CategoryStatus>('visible')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!props.open) return
    setName(props.item?.name ?? '')
    setDescription(
      props.kind === 'category' ? (props.item?.description ?? '') : '',
    )
    setSortOrder(props.kind === 'category' ? (props.item?.sortOrder ?? 0) : 0)
    setStatus(
      props.kind === 'category' ? (props.item?.status ?? 'visible') : 'visible',
    )
    setError(null)
  }, [props.item, props.kind, props.open])

  const submit = async () => {
    const normalizedName = name.trim()
    if (!normalizedName) {
      setError('名称不能为空')
      return
    }
    if (normalizedName.length > 50) {
      setError('名称最多 50 个字符')
      return
    }
    if (props.kind === 'category' && description.length > 200) {
      setError('描述最多 200 个字符')
      return
    }

    if (props.kind === 'category') {
      await props.onSubmit({
        name: normalizedName,
        description: description.trim() || null,
        sortOrder,
        status,
      })
    } else {
      await props.onSubmit({ name: normalizedName })
    }
  }

  const title = `${props.item ? '编辑' : '新建'}${props.kind === 'category' ? '文章分类' : '文章标签'}`

  return (
    <Modal
      open={props.open}
      title={title}
      onClose={props.onClose}
      footer={
        <>
          <Button onClick={props.onClose} variant="secondary">
            取消
          </Button>
          <Button loading={props.loading} onClick={() => void submit()}>
            {props.item ? '保存修改' : '确认新建'}
          </Button>
        </>
      }
    >
      <div className="taxonomy-dialog-form">
        {props.requestError ? (
          <Alert type="error">{props.requestError}</Alert>
        ) : null}
        <FormField
          required
          error={error ?? undefined}
          htmlFor="taxonomy-name"
          label="名称"
          hint={`${name.length}/50`}
        >
          <Input
            id="taxonomy-name"
            maxLength={51}
            value={name}
            error={Boolean(error)}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
          />
        </FormField>
        {props.kind === 'category' ? (
          <>
            <FormField
              htmlFor="category-description"
              label="描述"
              hint={`${description.length}/200`}
            >
              <textarea
                className="taxonomy-textarea"
                id="category-description"
                maxLength={201}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </FormField>
            <div className="taxonomy-dialog-form__row">
              <FormField htmlFor="category-sort-order" label="排序值">
                <Input
                  id="category-sort-order"
                  min={0}
                  type="number"
                  value={sortOrder}
                  onChange={(event) => setSortOrder(Number(event.target.value))}
                />
              </FormField>
              <FormField htmlFor="category-status" label="显示状态">
                <select
                  className="taxonomy-select"
                  id="category-status"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as CategoryStatus)
                  }
                >
                  <option value="visible">显示</option>
                  <option value="hidden">隐藏</option>
                </select>
              </FormField>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  )
}
