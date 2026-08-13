export type AdminAuthRedirectInput = {
  isAuthenticated: boolean
  pathname: string
  requiresAuth?: boolean
  guestOnly?: boolean
}

export const getAdminAuthRedirect = ({
  isAuthenticated,
  requiresAuth,
  guestOnly,
}: AdminAuthRedirectInput): string | null => {
  if (requiresAuth && !isAuthenticated) return '/admin/login'
  if (guestOnly && isAuthenticated) return '/admin'
  return null
}

const userGuestPaths = new Set(['/login', '/register', '/forgot-password'])
const USER_LOGIN_REDIRECT_KEY = 'blog-web:user-login-redirect'

export const getSafeUserReturnTarget = (target: unknown): string | null => {
  if (typeof target !== 'string' || !target.startsWith('/')) return null
  if (target.startsWith('//')) return null

  const pathname = target.split(/[?#]/, 1)[0]
  return userGuestPaths.has(pathname) ? null : target
}

export const getUserGuestRedirect = (
  isAuthenticated: boolean,
  returnTo: unknown,
  allowAuthenticatedForgotPassword = false,
): string | null =>
  isAuthenticated && !allowAuthenticatedForgotPassword
    ? (getSafeUserReturnTarget(returnTo) ?? '/')
    : null

export const getUserLoginSuccessTarget = (returnTo: unknown): string =>
  getSafeUserReturnTarget(returnTo) ?? '/'

export type UserLoginRedirect = {
  returnTo: string | null
  message: string | null
}

export const recordUserLoginRedirect = (
  returnTo: unknown,
  message: string | null = null,
) => {
  const redirect: UserLoginRedirect = {
    returnTo: getSafeUserReturnTarget(returnTo),
    message,
  }
  sessionStorage.setItem(USER_LOGIN_REDIRECT_KEY, JSON.stringify(redirect))
}

export const consumeUserLoginRedirect = (): UserLoginRedirect | null => {
  const raw = sessionStorage.getItem(USER_LOGIN_REDIRECT_KEY)
  sessionStorage.removeItem(USER_LOGIN_REDIRECT_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<UserLoginRedirect>
    return {
      returnTo: getSafeUserReturnTarget(parsed.returnTo),
      message: typeof parsed.message === 'string' ? parsed.message : null,
    }
  } catch {
    return null
  }
}
