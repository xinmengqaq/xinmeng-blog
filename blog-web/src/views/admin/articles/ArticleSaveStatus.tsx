export type ArticleSaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'failed'

const saveStateLabels: Record<ArticleSaveState, string> = {
  clean: '保存状态：未修改',
  dirty: '保存状态：有未保存修改',
  saving: '保存状态：保存中',
  saved: '保存状态：已保存',
  failed: '保存状态：保存失败',
}

type ArticleSaveStatusProps = {
  state: ArticleSaveState
}

export const ArticleSaveStatus = ({ state }: ArticleSaveStatusProps) => (
  <span
    className={`article-save-status article-save-status--${state}`}
    role="status"
  >
    {saveStateLabels[state]}
  </span>
)
