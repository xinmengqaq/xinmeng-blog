import { createContext, useContext } from 'react'

export const FrontPageTransitionContext = createContext(false)

export const useFrontPageTransitionActive = () =>
  useContext(FrontPageTransitionContext)
