export const FrontArticleBadges = ({
  isTop,
  isRecommend,
}: {
  isTop?: boolean | null
  isRecommend?: boolean | null
}) => (
  <span className="front-badges">
    {isTop ? <span className="front-badge front-badge--top">置顶</span> : null}
    {isRecommend ? (
      <span className="front-badge front-badge--recommend">精选</span>
    ) : null}
  </span>
)
