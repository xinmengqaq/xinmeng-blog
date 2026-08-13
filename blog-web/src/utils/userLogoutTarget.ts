export const getUserLogoutTarget = (pathname: string) =>
  pathname === '/profile'
    ? { redirectTo: '/', replace: true as const }
    : { redirectTo: pathname, replace: false as const }
