export type FrontLive2DTool =
  'hitokoto' | 'switch-model' | 'switch-texture' | 'photo' | 'quit'

type ModelToolCapabilities = {
  supportsModelSwitch: boolean
  supportsTextureSwitch: boolean
}

export const selectFrontLive2DTools = ({
  supportsModelSwitch,
  supportsTextureSwitch,
}: ModelToolCapabilities): FrontLive2DTool[] => {
  const tools: FrontLive2DTool[] = ['hitokoto']

  if (supportsModelSwitch) tools.push('switch-model')
  if (supportsTextureSwitch) tools.push('switch-texture')

  tools.push('photo', 'quit')
  return tools
}
