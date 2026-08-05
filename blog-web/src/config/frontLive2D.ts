export type FrontLive2DModelConfig = {
  waifuPath: string
  cubism2Path?: string
  cubism5Path?: string
  supportsModelSwitch: boolean
  supportsTextureSwitch: boolean
}

type FrontLive2DConfig = {
  desktopMediaQuery: string
  model: FrontLive2DModelConfig | null
}

export const frontLive2DConfig: FrontLive2DConfig = {
  desktopMediaQuery: '(min-width: 768px)',
  model: {
    waifuPath: '/live2d/config/waifu-tips.json',
    cubism5Path:
      'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js',
    supportsModelSwitch: false,
    supportsTextureSwitch: false,
  },
}
