import type { RouteObject } from 'react-router-dom'

import { AdminLayout } from '@/layout/AdminLayout'
import { BlankLayout } from '@/layout/BlankLayout'
import { FrontLayout } from '@/layout/FrontLayout'
import { ArticleEditorRoute } from '@/router/ArticleEditorRoute'
import { RouteGuard } from '@/router/guards'
import { AdminSettingsView } from '@/views/admin/AdminSettingsView'
import { ArticleListView as AdminArticleListView } from '@/views/admin/articles/ArticleListView'
import { CategoryListView } from '@/views/admin/taxonomy/CategoryListView'
import { TagListView } from '@/views/admin/taxonomy/TagListView'
import { DashboardView } from '@/views/admin/DashboardView'
import { LoginView } from '@/views/admin/LoginView'
import { SiteSettingsView } from '@/views/admin/SiteSettingsView'
import { NotFoundView } from '@/views/error/NotFoundView'
import { HomeView } from '@/views/front/HomeView'
import { ArticleListView as FrontArticleListView } from '@/views/front/articles/ArticleListView'
import { ArticleDetailView } from '@/views/front/article-detail/ArticleDetailView'

export const routes: RouteObject[] = [
  {
    element: <FrontLayout />,
    children: [
      { path: '/', element: <HomeView /> },
      { path: '/articles', element: <FrontArticleListView /> },
      { path: '/articles/:id', element: <ArticleDetailView /> },
    ],
  },
  {
    element: <RouteGuard guestOnly />,
    children: [
      {
        element: <BlankLayout />,
        children: [{ path: '/admin/login', element: <LoginView /> }],
      },
    ],
  },
  {
    element: <RouteGuard requiresAuth />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/admin', element: <DashboardView /> },
          { path: '/admin/settings/admin', element: <AdminSettingsView /> },
          { path: '/admin/settings/site', element: <SiteSettingsView /> },
          { path: '/admin/articles', element: <AdminArticleListView /> },
          {
            path: '/admin/articles/categories',
            element: <CategoryListView />,
          },
          { path: '/admin/articles/tags', element: <TagListView /> },
          {
            path: '/admin/articles/new',
            element: <ArticleEditorRoute mode="create" />,
          },
          {
            path: '/admin/articles/:id/edit',
            element: <ArticleEditorRoute mode="edit" />,
          },
        ],
      },
    ],
  },
  {
    element: <BlankLayout />,
    children: [
      { path: '/error/404', element: <NotFoundView /> },
      { path: '*', element: <NotFoundView /> },
    ],
  },
]
