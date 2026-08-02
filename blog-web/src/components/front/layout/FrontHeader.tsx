import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import {
  FrontBrandMark,
  FrontDropdownSurface,
  FrontIcon,
} from '@/components/front/visual'
import { frontSite } from '@/config/frontSite'
import { usePublicCategoriesQuery } from '@/queries/publicContent'
import { FrontPetalToggle } from '@/components/front/atmosphere/FrontPetalToggle'

const canPreviewWithHover = () =>
  window.matchMedia('(min-width: 768px) and (hover: hover) and (pointer: fine)')
    .matches

export const FrontHeader = () => {
  const [open, setOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const categoryToggleRef = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()
  const categories = usePublicCategoriesQuery()
  const articleActive = pathname.startsWith('/articles')

  const closeCategories = useCallback((restoreFocus = false) => {
    setCategoriesOpen(false)
    if (restoreFocus) {
      window.requestAnimationFrame(() => {
        setCategoriesOpen(false)
        categoryToggleRef.current?.focus({ preventScroll: true })
      })
    }
  }, [])

  useEffect(() => {
    setOpen(false)
    setCategoriesOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!categoriesOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      closeCategories(true)
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [categoriesOpen, closeCategories])

  return (
    <header className="front-header">
      <div className="front-header__inner">
        <Link
          className="front-brand"
          to="/"
          aria-label={`${frontSite.name}首页`}
          onClick={() => setOpen(false)}
        >
          <FrontBrandMark />
        </Link>
        <button
          className="front-header__menu"
          aria-label={open ? '关闭导航' : '打开导航'}
          title={open ? '关闭导航' : '打开导航'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <FrontIcon name={open ? 'close' : 'menu'} size={24} />
        </button>
        <nav
          className={`front-nav ${open ? 'front-nav--open' : ''}`}
          aria-label="前台导航"
        >
          <NavLink
            className={({ isActive }) =>
              `front-nav__link ${isActive ? 'is-active' : ''}`
            }
            to="/"
            onClick={() => setOpen(false)}
          >
            <FrontIcon name="home" size={24} />
            首页
          </NavLink>
          <div
            className={`front-nav__group ${articleActive ? 'is-active' : ''}`}
            onPointerEnter={(event) => {
              if (event.pointerType === 'mouse' && canPreviewWithHover()) {
                setCategoriesOpen(true)
              }
            }}
            onPointerLeave={(event) => {
              if (event.pointerType === 'mouse' && canPreviewWithHover()) {
                closeCategories()
              }
            }}
            onFocusCapture={(event) => {
              if (!categoryToggleRef.current?.contains(event.target as Node)) {
                setCategoriesOpen(true)
              }
            }}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                closeCategories()
              }
            }}
          >
            <Link
              className="front-nav__link front-nav__link--articles"
              to="/articles"
              aria-current={articleActive ? 'page' : undefined}
              onClick={() => {
                setOpen(false)
                closeCategories()
              }}
            >
              <FrontIcon name="articles" size={24} />
              文章
            </Link>
            <button
              ref={categoryToggleRef}
              className="front-nav__category-toggle"
              aria-label={categoriesOpen ? '收起文章分类' : '展开文章分类'}
              title={categoriesOpen ? '收起文章分类' : '展开文章分类'}
              aria-expanded={categoriesOpen}
              onClick={() => setCategoriesOpen((value) => !value)}
              type="button"
            >
              <FrontIcon
                name={categoriesOpen ? 'collapse' : 'expand'}
                size={16}
              />
            </button>
            <FrontDropdownSurface
              className="front-nav__dropdown"
              open={categoriesOpen}
            >
              {categories.isError ? (
                <span className="front-nav__dropdown-empty">
                  分类暂时不可用
                </span>
              ) : categories.isLoading ? (
                <span className="front-nav__dropdown-empty">分类加载中</span>
              ) : categories.data?.length ? (
                categories.data.map((category) => (
                  <Link
                    className="front-dropdown-surface__option"
                    key={category.id}
                    to={`/articles?categoryId=${category.id}`}
                    onClick={() => {
                      setCategoriesOpen(false)
                      setOpen(false)
                    }}
                  >
                    <FrontIcon name="category" size={16} />
                    {category.name}
                  </Link>
                ))
              ) : (
                <span className="front-nav__dropdown-empty">暂无分类</span>
              )}
            </FrontDropdownSurface>
          </div>
          <FrontPetalToggle variant="mobile" />
        </nav>
      </div>
    </header>
  )
}
