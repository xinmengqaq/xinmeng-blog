let notoSansScPromise: Promise<unknown> | undefined

export const loadNotoSansSc = () => {
  notoSansScPromise ??= import('@fontsource-variable/noto-sans-sc/wght.css')
  return notoSansScPromise
}
