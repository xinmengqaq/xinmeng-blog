const REGISTERED_EMAIL_KEY = 'blog-web:registered-email'

const normalizeEmail = (email: string) => email.trim().toLowerCase()

export const markRegisteredEmail = (email: string) =>
  sessionStorage.setItem(REGISTERED_EMAIL_KEY, normalizeEmail(email))

export const consumeRegisteredEmail = (email: string): boolean => {
  const matches =
    sessionStorage.getItem(REGISTERED_EMAIL_KEY) === normalizeEmail(email)
  if (matches) sessionStorage.removeItem(REGISTERED_EMAIL_KEY)
  return matches
}
