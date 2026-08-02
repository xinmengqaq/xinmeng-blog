import { FrontAssetImage, FrontIcon } from '@/components/front/visual'
import { useFrontMotionPreference } from '@/hooks/front/motionPreference'
import { usePetalPreference } from '@/hooks/front/petalPreference'

type Props = {
  variant: 'desktop' | 'mobile'
}

export const FrontPetalToggle = ({ variant }: Props) => {
  const { enabled, setEnabled } = usePetalPreference()
  const { reducedMotion } = useFrontMotionPreference()
  const running = enabled && !reducedMotion
  const action = enabled ? '关闭花瓣飘落' : '开启花瓣飘落'
  const stateText = reducedMotion
    ? '已按系统设置静止'
    : running
      ? '正在运行'
      : '已经停止'

  return (
    <button
      className={`front-motion-toggle front-motion-toggle--${variant}`}
      type="button"
      aria-pressed={enabled}
      aria-label={action}
      onClick={() => setEnabled(!enabled)}
      title={`花瓣飘落${stateText}，点击${action}`}
    >
      <FrontAssetImage
        className="front-motion-toggle__signal"
        name={running ? 'motionActive' : 'motionStopped'}
        fallback={
          <FrontIcon
            name={running ? 'home' : 'close'}
            size={32}
            state={running ? 'active' : 'disabled'}
          />
        }
      />
      <span className="front-motion-toggle__label">
        花瓣飘落：{running ? '运行' : '停止'}
      </span>
    </button>
  )
}
