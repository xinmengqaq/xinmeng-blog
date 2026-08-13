import { create } from 'zustand'

import type { CurrentUserProfile } from '@/types/userAuth'
import { storage } from '@/utils/storage'

const TOKEN_KEY = 'blog-web:user-token'
const PROFILE_KEY = 'blog-web:user-profile'

type UserAuthState = {
  token: string | null
  currentUser: CurrentUserProfile | null
  isAuthenticated: boolean
  setAuth: (token: string, currentUser: CurrentUserProfile) => void
  setCurrentUser: (currentUser: CurrentUserProfile) => void
  setToken: (token: string) => void
  clearAuth: () => void
  hydrateAuth: () => void
}

const getInitialToken = () => storage.get<string>(TOKEN_KEY)
const getInitialUser = () => storage.get<CurrentUserProfile>(PROFILE_KEY)

export const useUserAuthStore = create<UserAuthState>((set) => ({
  token: getInitialToken(),
  currentUser: getInitialUser(),
  isAuthenticated: Boolean(getInitialToken()),

  setAuth: (token, currentUser) => {
    storage.set(TOKEN_KEY, token)
    storage.set(PROFILE_KEY, currentUser)
    set({ token, currentUser, isAuthenticated: true })
  },

  setCurrentUser: (currentUser) => {
    storage.set(PROFILE_KEY, currentUser)
    set({ currentUser })
  },

  setToken: (token) => {
    storage.set(TOKEN_KEY, token)
    set({ token, isAuthenticated: true })
  },

  clearAuth: () => {
    storage.remove(TOKEN_KEY)
    storage.remove(PROFILE_KEY)
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
