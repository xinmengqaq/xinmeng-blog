import { useEffect, useState } from 'react'

import { Button, FormField, Input, Modal } from '@/components/ui'

type TaxonomyQuickCreateDialogProps = {
  kind: 'category' | 'tag'
  open: boolean
  initialName: string
  loading: boolean
  onClose: () => void
  onSubmit: (name: string) => Promise<void>
}

export const TaxonomyQuickCreateDialog = ({
  kind,
  open,
  initialName,
  loading,
  onClose,
  onSubmit,
}: TaxonomyQuickCreateDialogProps) => {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(initialName)
      setError(null)
    }
  }, [initialName, open])

  const submit = async () => {
    const normalized = name.trim()
    if (!normalized) return setError('名称不能为空')
    if (normalized.length > 50) return setError('名称最多 50 个字符')
    await onSubmit(normalized)
  }

  return (
    <Modal
      open={open}
      title={`新建文章${kind === 'category' ? '分类' : '标签'}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button loading={loading} onClick={() => void submit()}>
            确认新建
          </Button>
        </>
      }
    >
      <FormField
        required
        error={error ?? undefined}
        htmlFor="quick-taxonomy-name"
        label="名称"
        hint={`${name.length}/50`}
      >
        <Input
          id="quick-taxonomy-name"
          maxLength={51}
          error={Boolean(error)}
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            setError(null)
          }}
        />
      </FormField>
    </Modal>
  )
}
