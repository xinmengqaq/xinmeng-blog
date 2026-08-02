import { Button } from './Button'
import { Modal } from './Modal'
import './ui.css'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmText: string
  cancelText?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmText,
  cancelText = '取消',
  danger,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => (
  <Modal
    open={open}
    title={title}
    onClose={onCancel}
    footer={
      <>
        <Button onClick={onCancel} variant="secondary">
          {cancelText}
        </Button>
        <Button
          loading={loading}
          onClick={onConfirm}
          variant={danger ? 'danger' : 'primary'}
        >
          {confirmText}
        </Button>
      </>
    }
  >
    <div className="ui-confirm-dialog">
      <p>{description}</p>
    </div>
  </Modal>
)
