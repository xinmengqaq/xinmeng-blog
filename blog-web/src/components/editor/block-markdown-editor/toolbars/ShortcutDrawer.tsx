import { X } from 'lucide-react'

const shortcutGroups = [
  {
    title: '基础编辑',
    items: [
      ['Ctrl + S', '保存文章'],
      ['Ctrl + Z', '撤销'],
      ['Ctrl + Shift + Z / Ctrl + Y', '重做'],
      ['Esc', '关闭当前浮层'],
      ['/', '打开块类型菜单'],
    ],
  },
  {
    title: '块操作',
    items: [
      ['Alt + ↑ / Alt + ↓', '移动当前块'],
      ['Ctrl + Shift + D', '复制当前块'],
      ['Ctrl + Backspace', '删除当前空块'],
      ['Enter', '新建下一块'],
      ['Shift + Enter', '块内换行'],
    ],
  },
  {
    title: '文字格式',
    items: [
      ['Ctrl + B', '加粗'],
      ['Ctrl + I', '斜体'],
      ['Ctrl + U', '下划线'],
      ['Ctrl + Shift + X', '删除线'],
      ['Ctrl + E', '行内代码'],
      ['Ctrl + K', '设置链接'],
    ],
  },
  {
    title: '列表',
    items: [
      ['Tab / Shift + Tab', '调整列表缩进'],
      ['Enter', '新建同级列表项'],
    ],
  },
  {
    title: '表格',
    items: [
      ['Ctrl + Enter', '在下方插入新行'],
      ['Ctrl + Shift + Enter', '在上方插入新行'],
    ],
  },
] as const

export const ShortcutDrawer = ({ onClose }: { onClose: () => void }) => (
  <aside
    aria-label="快捷键概览"
    aria-modal="false"
    className="block-editor__shortcut-drawer"
    role="dialog"
  >
    <header>
      <h2>快捷键概览</h2>
      <button aria-label="关闭快捷键概览" type="button" onClick={onClose}>
        <X aria-hidden="true" />
      </button>
    </header>
    <div className="block-editor__shortcut-groups">
      {shortcutGroups.map((group) => (
        <section key={group.title}>
          <h3>{group.title}</h3>
          <dl>
            {group.items.map(([keys, action]) => (
              <div key={`${keys}-${action}`}>
                <dt>{action}</dt>
                <dd>
                  <kbd>{keys}</kbd>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  </aside>
)
