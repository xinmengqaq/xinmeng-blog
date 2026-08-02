import { create } from 'zustand'

import type { CurrentUser } from '@/types/auth'
import { storage } from '@/utils/storage'

const TOKEN_KEY = 'blog-web:token'
const USER_KEY = 'blog-web:user'

type AuthState = {
  token: string | null
  currentUser: CurrentUser | null
  isAuthenticated: boolean
  setAuth: (token: string, currentUser: CurrentUser) => void
  setCurrentUser: (currentUser: CurrentUser) => void
  setToken: (token: string) => void
  clearAuth: () => void
  hydrateAuth: () => void
}

const getInitialToken = () => storage.get<string>(TOKEN_KEY)
const getInitialUser = () => storage.get<CurrentUser>(USER_KEY)

export const useAuthStore = create<AuthState>((set) => ({
  token: getInitialToken(),
  currentUser: getInitialUser(),
  isAuthenticated: Boolean(getInitialToken()),

  setAuth: (token, currentUser) => {
    storage.set(TOKEN_KEY, token)
    storage.set(USER_KEY, currentUser)
    set({ token, currentUser, isAuthenticated: true })
  },

  setCurrentUser: (currentUser) => {
    storage.set(USER_KEY, currentUser)
    set({ currentUser })
  },

  setToken: (token) => {
    storage.set(TOKEN_KEY, token)
    set({ token, isAuthenticated: true })
  },

  clearAuth: () => {
    storage.remove(TOKEN_KEY)
    storage.remove(USER_KEY)
    set({ token: null, currentUser: null, isAuthenticated: false })
  },

  hydrateAuth: () => {
    const token = getInitialToken()
    set({
      token,
      currentUser: getInitialUser(),
      isAuthenticated: Boolean(token),
    })
  },
}))
