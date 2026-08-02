import { Link } from 'react-router-dom'

import { FrontArticleImage, FrontArticleMeta } from '@/components/front/article'
import { HomeContentMotion } from '@/components/front/home/HomeContentMotion'
import { HomeStationHero } from '@/components/front/home/HomeStationHero'
import { FrontIcon, FrontState } from '@/components/front/visual'
import { usePublicHomeQuery } from '@/queries/publicContent'
import type { PublicArticleListItem } from '@/types/publicContent'

const FeaturedSection = ({
  articles,
}: {
  articles: PublicArticleListItem[]
}) => {
  const [lead, ...minorArticles] = articles

  return (
    <section
      className={`home-featured home-featured--count-${articles.length}`}
      aria-labelledby="home-featured-title"
    >
      <div className="home-featured__inner">
        <div className="home-featured__header">
          <h2 className="front-section-title" id="home-featured-title">
            精选文章
          </h2>
        </div>
        <div className="home-featured__canvas">
          <Link className="home-featured__anchor" to={`/articles/${lead.id}`}>
            <div className="home-featured__anchor-media">
              <FrontArticleImage src={lead.coverUrl} alt={lead.title} />
            </div>
            <div className="home-featured__anchor-copy">
              <div className="home-featured__anchor-heading">
                <h3>{lead.title}</h3>
              </div>
              <p>{lead.summary || '沿着春天的铁轨，读一段慢慢抵达的文字。'}</p>
              <FrontArticleMeta {...lead} showCategory={false} />
            </div>
          </Link>

          {minorArticles.length > 0 ? (
            <div className="home-featured__index" aria-label="更多精选文章">
              {minorArticles.map((article) => (
                <Link
                  key={article.id}
                  to={`/articles/${article.id}`}
                  className="home-featured__index-item"
                >
                  <div className="home-featured__index-media">
                    <FrontArticleImage
                      src={article.coverUrl}
                      alt={article.title}
                    />
                  </div>
                  <div className="home-featured__index-copy">
                    <h3>{article.title}</h3>
                    <FrontArticleMeta {...article} showCategory={false} />
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

const LatestSection = ({ articles }: { articles: PublicArticleListItem[] }) => (
  <section className="home-latest" aria-labelledby="home-latest-title">
    <h2 className="front-section-title" id="home-latest-title">
      最近抵达
    </h2>
    <div className="home-latest__list">
      {articles.map((article, index) => (
        <Link
          key={article.id}
          to={`/articles/${article.id}`}
          className={`home-latest__row ${index % 2 ? 'is-reverse' : ''}`}
        >
          <div className="home-latest__image">
            <FrontArticleImage src={article.coverUrl} alt={article.title} />
          </div>
          <div className="home-latest__copy">
            <h3>{article.title}</h3>
            <p>{article.summary || '把沿途的风景写下来，留给下一站的自己。'}</p>
            <FrontArticleMeta {...article} showCategory={false} />
          </div>
        </Link>
      ))}
    </div>
    <Link className="home-latest__all front-link" to="/articles">
      <FrontIcon name="articles" size={24} />
      查看全部文章
    </Link>
  </section>
)

const HomeSkeleton = () => (
  <div className="home-skeleton" role="status" aria-label="正在读取公开文章">
    <section className="home-skeleton__featured" aria-hidden="true">
      <span className="home-skeleton__title" />
      <div className="home-skeleton__featured-canvas">
        <div className="home-skeleton__anchor">
          <span className="home-skeleton__anchor-media" />
          <div className="home-skeleton__anchor-copy">
            <span className="home-skeleton__line home-skeleton__line--wide" />
            <span className="home-skeleton__line" />
            <span className="home-skeleton__line home-skeleton__line--short" />
          </div>
        </div>
        <div className="home-skeleton__index">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="home-skeleton__index-item" key={index}>
              <span />
              <i>
                <b />
                <b />
              </i>
            </div>
          ))}
        </div>
      </div>
    </section>
    <section className="home-skeleton__latest" aria-hidden="true">
      <span className="home-skeleton__title" />
      {Array.from({ length: 3 }, (_, index) => (
        <div className="home-skeleton__latest-row" key={index}>
          <span />
          <i>
            <b />
            <b />
            <b />
          </i>
        </div>
      ))}
    </section>
  </div>
)

export const HomeView = () => {
  const home = usePublicHomeQuery()
  const featured = (home.data?.featuredArticles ?? []).slice(0, 4)
  const latest = (home.data?.latestArticles ?? []).slice(0, 5)
  const noArticles =
    home.isSuccess && featured.length === 0 && latest.length === 0

  return (
    <div className="front-home">
      <HomeStationHero />

      <main className="front-home__body">
        {home.isLoading ? <HomeSkeleton /> : null}
        {home.isError ? (
          <div className="home-state">
            <FrontState
              variant="error"
              title="站台暂时没有回应"
              description="暂时无法读取公开文章，请稍后重试。"
              onAction={() => void home.refetch()}
            />
          </div>
        ) : null}
        {noArticles ? (
          <div className="home-state">
            <FrontState
              variant="empty"
              title="今天还没有文章抵达"
              description="等一等，新的文字会沿着轨道过来。"
            />
          </div>
        ) : null}
        {home.isSuccess && !noArticles ? (
          <HomeContentMotion
            featuredCount={featured.length}
            latestCount={latest.length}
          >
            {featured.length > 0 ? (
              <FeaturedSection articles={featured} />
            ) : null}
            {latest.length > 0 ? <LatestSection articles={latest} /> : null}
          </HomeContentMotion>
        ) : null}
      </main>
    </div>
  )
}
