import { ChevronDown, FileText, FolderTree, Tags } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import './admin.css'

export const AdminArticleNavGroup = () => {
  const location = useLocation()
  const inArticleModule = location.pathname.startsWith('/admin/articles')
  const inTaxonomyPage =
    location.pathname === '/admin/articles/categories' ||
    location.pathname === '/admin/articles/tags'
  const [expanded, setExpanded] = useState(inTaxonomyPage)

  useEffect(() => {
    if (inTaxonomyPage) setExpanded(true)
  }, [inTaxonomyPage])

  return (
    <div className="admin-nav-group">
      <div
        className={`admin-nav-group__parent ${inArticleModule ? 'admin-nav-group__parent--active' : ''}`}
      >
        <NavLink
          className={({ isActive }) =>
            `admin-nav-group__link ${isActive ? 'admin-nav-item--active' : ''}`
          }
          to="/admin/articles"
          end
        >
          <FileText aria-hidden="true" />
          <span>文章管理</span>
        </NavLink>
        <button
          aria-expanded={expanded}
          aria-label={expanded ? '收起文章管理子导航' : '展开文章管理子导航'}
          className="admin-nav-group__toggle"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          <ChevronDown aria-hidden="true" />
        </button>
      </div>
      <div
        className={`admin-nav-group__children ${expanded ? 'admin-nav-group__children--expanded' : ''}`}
      >
        <div>
          <NavLink className="admin-nav-child" to="/admin/articles/categories">
            <FolderTree aria-hidden="true" />
            <span>文章分类管理</span>
          </NavLink>
          <NavLink className="admin-nav-child" to="/admin/articles/tags">
            <Tags aria-hidden="true" />
            <span>文章标签管理</span>
          </NavLink>
        </div>
      </div>
    </div>
  )
}
