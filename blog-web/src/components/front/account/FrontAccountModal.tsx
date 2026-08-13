import type { ReactNode } from 'react'

import { Modal, type ModalCloseReason } from '@/components/ui'
import { useFrontMotionPreference } from '@/hooks/front/motionPreference'

import './frontAccountModal.css'

type FrontAccountModalProps = {
  open: boolean
  title: string
  children: ReactNode
  footer?: ReactNode
  locked?: boolean
  onRequestClose: (reason: ModalCloseReason) => void
  closeLabel?: string
  panelClassName?: string
}

export const FrontAccountModal = ({
  open,
  title,
  children,
  footer,
  locked = false,
  onRequestClose,
  closeLabel,
  panelClassName,
}: FrontAccountModalProps) => {
  const { reducedMotion } = useFrontMotionPreference()

  return (
    <Modal
      closeLabel={closeLabel}
      footer={footer}
      locked={locked}
      motion
      onClose={onRequestClose}
      open={open}
      panelClassName={['front-account-modal', panelClassName]
        .filter(Boolean)
        .join(' ')}
      reducedMotion={reducedMotion}
      title={title}
    >
      {children}
    </Modal>
  )
}
