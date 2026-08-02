import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import './admin.css'

type AdminNavItemProps = {
  label: string
  to: string
  icon: LucideIcon
}

export const AdminNavItem = ({ label, to, icon: Icon }: AdminNavItemProps) => (
  <NavLink
    className={({ isActive }) =>
      `admin-nav-item ${isActive ? 'admin-nav-item--active' : ''}`
    }
    to={to}
    end={to === '/admin'}
  >
    <Icon aria-hidden="true" />
    <span>{label}</span>
  </NavLink>
)
