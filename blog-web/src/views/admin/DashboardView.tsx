import { useNavigate } from 'react-router-dom'

import { AdminAvatar } from '@/components/admin'
import { Button, ErrorState, LoadingState, PageHeader } from '@/components/ui'
import { useAdminProfileQuery } from '@/queries/admin'
import { useAuthStore } from '@/store/auth'
import { toApiError } from '@/utils/request'

import './adminPages.css'

export const DashboardView = () => {
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const currentUser = useAuthStore((state) => state.currentUser)
  const profileQuery = useAdminProfileQuery({
    enabled: Boolean(token && !currentUser),
  })
  const admin = currentUser ?? profileQuery.data ?? null

  if (!admin && profileQuery.isLoading) {
    return <LoadingState description="正在读取当前管理员资料。" />
  }

  if (!admin && profileQuery.isError) {
    return (
      <ErrorState
        description={toApiError(profileQuery.error).message}
        onRetry={() => void profileQuery.refetch()}
      />
    )
  }

  return (
    <section className="admin-page">
      <PageHeader title="后台首页" description="你已登录个人博客后台。" />

      <div className="admin-dashboard-panel">
        <div className="admin-dashboard-identity">
          <AdminAvatar label="当前管理员头像" size="lg" src={admin?.avatar} />
          <div>
            <strong>{admin?.name ?? '资料加载中'}</strong>
            <span>当前管理员</span>
          </div>
        </div>

        <dl className="admin-summary-list">
          <div>
            <dt>用户名</dt>
            <dd>{admin?.username ?? '资料加载中'}</dd>
          </div>
          <div>
            <dt>角色</dt>
            <dd>{admin?.role ?? '资料加载中'}</dd>
          </div>
        </dl>

        <div className="admin-dashboard-actions">
          <Button
            onClick={() => navigate('/admin/settings/admin')}
            variant="link"
          >
            进入管理员设置
          </Button>
        </div>
      </div>
    </section>
  )
}
