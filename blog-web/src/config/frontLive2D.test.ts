/// <reference types="node" />

import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { frontLive2DConfig } from './frontLive2D'

type ModelEntry = {
  FileReferences: {
    Moc: string
    Textures: string[]
    Physics: string
    DisplayInfo: string
    Expressions: { File: string }[]
  }
}

describe('frontLive2DConfig', () => {
  it('启用艾玛模型且入口引用的资源完整', async () => {
    expect(frontLive2DConfig.model).toEqual({
      waifuPath: '/live2d/config/waifu-tips.json',
      cubism5Path:
        'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js',
      supportsModelSwitch: false,
      supportsTextureSwitch: false,
    })

    const modelDirectory = resolve('public/live2d/models/emma')
    const entry = JSON.parse(
      await readFile(resolve(modelDirectory, '艾玛.model3.json'), 'utf8'),
    ) as ModelEntry
    const references = entry.FileReferences
    const assetPaths = [
      references.Moc,
      references.Physics,
      references.DisplayInfo,
      ...references.Textures,
      ...references.Expressions.map(({ File }) => File),
    ]

    await expect(
      Promise.all(
        assetPaths.map((path) => access(resolve(modelDirectory, path))),
      ),
    ).resolves.toBeDefined()

    const texture = await readFile(
      resolve(modelDirectory, references.Textures[0]),
    )
    expect(
      Math.max(texture.readUInt32BE(16), texture.readUInt32BE(20)),
    ).toBeLessThanOrEqual(2048)
  })
})
