import { Link } from 'react-router-dom'

export const NotFoundView = () => (
  <section className="page">
    <h1>页面不存在</h1>
    <p>当前访问路径没有匹配页面。</p>
    <Link to="/">回到首页</Link>
  </section>
)
