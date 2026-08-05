import { createContext, useContext } from 'react'

export const FrontPageTransitionContext = createContext(false)
export const FrontHomeHeroSettledContext = createContext<() => void>(
  () => undefined,
)

export const useFrontPageTransitionActive = () =>
  useContext(FrontPageTransitionContext)

export const useReportFrontHomeHeroSettled = () =>
  useContext(FrontHomeHeroSettledContext)
