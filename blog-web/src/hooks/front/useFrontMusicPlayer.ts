import { useContext } from 'react'

import { FrontMusicPlayerContext } from './frontMusicPlayerContext'

export const useFrontMusicPlayer = () => {
  const value = useContext(FrontMusicPlayerContext)
  if (!value) throw new Error('前台音乐播放器必须在 Provider 内使用')
  return value
}
