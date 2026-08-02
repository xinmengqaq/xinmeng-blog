import type { Area } from 'react-easy-crop'

const getRadianAngle = (rotation: number): number => (rotation * Math.PI) / 180

const getRotatedSize = (
  width: number,
  height: number,
  rotation: number,
): { width: number; height: number } => {
  const radians = getRadianAngle(rotation)

  return {
    width:
      Math.abs(Math.cos(radians) * width) +
      Math.abs(Math.sin(radians) * height),
    height:
      Math.abs(Math.sin(radians) * width) +
      Math.abs(Math.cos(radians) * height),
  }
}

const loadImage = (sourceUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片无法加载'))
    image.src = sourceUrl
  })

const canvasToBlob = (canvas: HTMLCanvasElement, type: string): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
          return
        }

        reject(new Error('无法生成裁剪图片'))
      },
      type,
      type === 'image/png' ? undefined : 0.92,
    )
  })

export const createCroppedImageBlob = async (
  sourceUrl: string,
  croppedArea: Area,
  rotation: number,
  type: string,
): Promise<Blob> => {
  const image = await loadImage(sourceUrl)
  const width = image.naturalWidth
  const height = image.naturalHeight

  if (!width || !height) {
    throw new Error('图片尺寸无效')
  }

  const rotatedSize = getRotatedSize(width, height, rotation)
  const sourceCanvas = document.createElement('canvas')
  sourceCanvas.width = Math.ceil(rotatedSize.width)
  sourceCanvas.height = Math.ceil(rotatedSize.height)
  const sourceContext = sourceCanvas.getContext('2d')

  if (!sourceContext) {
    throw new Error('浏览器不支持图片裁剪')
  }

  sourceContext.translate(sourceCanvas.width / 2, sourceCanvas.height / 2)
  sourceContext.rotate(getRadianAngle(rotation))
  sourceContext.translate(-width / 2, -height / 2)
  sourceContext.drawImage(image, 0, 0, width, height)

  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = croppedArea.width
  outputCanvas.height = croppedArea.height
  const outputContext = outputCanvas.getContext('2d')

  if (!outputContext) {
    throw new Error('浏览器不支持图片裁剪')
  }

  outputContext.drawImage(
    sourceCanvas,
    croppedArea.x,
    croppedArea.y,
    croppedArea.width,
    croppedArea.height,
    0,
    0,
    croppedArea.width,
    croppedArea.height,
  )

  return canvasToBlob(outputCanvas, type)
}
