import { LayoutDashboard, Music2, Settings2, UserCog } from 'lucide-react'

import { AdminNavItem } from './AdminNavItem'
import { AdminArticleNavGroup } from './AdminArticleNavGroup'
import './admin.css'

export const AdminSidebar = () => (
  <aside className="admin-sidebar" aria-label="后台导航">
    <div className="admin-sidebar__brand">
      <strong>个人博客后台</strong>
    </div>
    <nav className="admin-sidebar__nav">
      <AdminNavItem label="后台首页" to="/admin" icon={LayoutDashboard} />
      <AdminArticleNavGroup />
      <AdminNavItem label="音乐管理" to="/admin/music" icon={Music2} />
      <AdminNavItem
        label="管理员设置"
        to="/admin/settings/admin"
        icon={UserCog}
      />
      <AdminNavItem
        label="站点设置"
        to="/admin/settings/site"
        icon={Settings2}
      />
    </nav>
  </aside>
)
