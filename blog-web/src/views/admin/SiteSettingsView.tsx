import { Alert, PageHeader } from '@/components/ui'
import { usePublicSiteBackgroundQuery } from '@/queries/siteConfig'
import { toApiError } from '@/utils/request'

import { SiteBackgroundEditor } from './site-settings/SiteBackgroundEditor'

export const SiteSettingsView = () => {
  const backgroundQuery = usePublicSiteBackgroundQuery()
  const currentBackground = backgroundQuery.data?.backgroundUrl ?? ''

  return (
    <section className="admin-page admin-page--site-settings">
      <PageHeader title="站点设置" />
      {backgroundQuery.isError ? (
        <Alert type="error">{toApiError(backgroundQuery.error).message}</Alert>
      ) : null}
      <SiteBackgroundEditor
        currentBackground={currentBackground}
        isLoading={backgroundQuery.isLoading}
      />
    </section>
  )
}
