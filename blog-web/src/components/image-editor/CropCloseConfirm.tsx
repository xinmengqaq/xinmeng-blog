import { Button, Modal } from '@/components/ui'

type CropCloseConfirmProps = {
  onContinue: () => void
  onDiscard: () => void
}

export const CropCloseConfirm = ({
  onContinue,
  onDiscard,
}: CropCloseConfirmProps) => (
  <Modal
    open
    title="放弃未确认的裁剪？"
    onClose={onContinue}
    panelClassName="image-crop-confirm-modal"
    footer={
      <>
        <Button
          data-modal-initial-focus
          onClick={onContinue}
          variant="secondary"
        >
          继续裁剪
        </Button>
        <Button onClick={onDiscard} variant="danger">
          放弃裁剪
        </Button>
      </>
    }
  >
    <p className="image-crop-dialog__close-copy">
      当前调整尚未使用，放弃后需要重新选择图片。
    </p>
  </Modal>
)
