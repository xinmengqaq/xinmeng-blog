import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { StaticWasm, fontSplit } from 'cn-font-split/dist/wasm/index.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const cacheDir = path.join(root, '.cache', 'front-fonts', 'v3.750')
const outputDir = path.join(root, 'public', 'fonts', 'chill-round-gothic')
const cssFile = path.join(
  root,
  'src',
  'styles',
  'generated',
  'chill-round-gothic.css',
)
const reportFile = path.join(
  root,
  'scripts',
  'front-fonts',
  'build-report.json',
)
const wasmFile = path.join(
  root,
  'node_modules',
  'cn-font-split',
  'dist',
  'libffi-wasm32-wasip1.wasm',
)

const upstream = {
  repository: 'https://github.com/Warren2060/ChillRoundGothic',
  tag: 'v3.750',
  commit: '728e7b3fd2795fb469ec21974dd3d18a147dbd6f',
}
const sources = [
  [
    'Regular',
    '400',
    'de98671a4c02196bfe79b67dc739fe8008c1dd7f',
    'a2e9730e3afca78ec04e6197ea284244043cc0957dbbee16dfb42e26c387bc50',
  ],
  [
    'Medium',
    '500',
    'c77195f5550caab6a8c42886848d3d17b34065b9',
    '924e885560e79583d304252e59460939d7ddcc06cebe0072d9baad0a9081fcfa',
  ],
  [
    'Bold',
    '700',
    '159e95e03a509c013b8f49d33be62eaf1d8abc01',
    '9ab1f11f337fcf94e2f5ea3499bf6be08c138925dba9fc737b861bf0eca24298',
  ],
  [
    'Heavy',
    '900',
    'ab4081b558d3c3b2fb4423e0e11897304797c464',
    'ccb92d843ca5d3026b0de853d459cbb7ab44ebdba795fcb0f0c11b332cc4dc87',
  ],
].map(([name, weight, blob, hash]) => ({ name, weight, blob, hash }))
const license = {
  blob: '49e245a9b96a3094ac68ca24892d510417d2ab05',
  hash: 'bdefa7c6496762298804550255762c4532124282910e976db960b24d04665ad4',
}
const digest = (data) => createHash('sha256').update(data).digest('hex')

function findPreloads(css, text) {
  const blocks = css.match(/@font-face\{[\s\S]*?\}/g) ?? []
  const files = new Set()
  for (const character of text) {
    const codePoint = character.codePointAt(0)
    const block = blocks.find((item) =>
      [...item.matchAll(/U\+([0-9A-F]+)(?:-([0-9A-F]+))?/g)].some((match) => {
        const start = Number.parseInt(match[1], 16)
        const end = Number.parseInt(match[2] ?? match[1], 16)
        return codePoint >= start && codePoint <= end
      }),
    )
    const url = block?.match(/url\("([^"]+)"\)/)?.[1]
    if (!url) throw new Error(`未找到关键字符分片：${character}`)
    files.add(url)
  }
  return [...files]
}

async function downloadBlob(blob, expectedHash, target) {
  let data
  try {
    data = await readFile(target)
  } catch {
    const response = await fetch(
      `https://api.github.com/repos/Warren2060/ChillRoundGothic/git/blobs/${blob}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'blog-web-font-builder',
        },
      },
    )
    if (!response.ok) throw new Error(`字体源下载失败：HTTP ${response.status}`)
    const payload = await response.json()
    data = Buffer.from(payload.content.replace(/\s/g, ''), 'base64')
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, data)
  }
  if (digest(data) !== expectedHash)
    throw new Error(`字体源摘要不匹配：${path.basename(target)}`)
  return data
}

async function splitFont(runtime, source) {
  const input = await downloadBlob(
    source.blob,
    source.hash,
    path.join(cacheDir, `${source.name}.otf`),
  )
  const outputs = (
    await fontSplit(
      {
        input: new Uint8Array(input),
        outDir: source.weight,
        targetType: 'woff2',
        chunkSize: 384 * 1024,
        maxAllowSubsetsCount: 40,
        autoSubset: true,
        languageAreas: false,
        fontFeature: true,
        reduceMins: true,
        reporter: true,
        testHtml: false,
        renameOutputFont: '[hash:8].woff2',
        silent: true,
        css: {
          fontFamily: 'Chill Round Gothic',
          fontWeight: source.weight,
          fontStyle: 'normal',
          fontDisplay: 'swap',
          commentUnicodes: false,
          compress: false,
          fileName: `${source.weight}.css`,
        },
      },
      runtime.WasiHandle,
      { logger: () => {} },
    )
  ).filter(Boolean)

  const files = []
  let css = ''
  let hasReporter = false
  for (const output of outputs) {
    if (output.name.endsWith('.woff2')) {
      const target = path.join(outputDir, source.weight, output.name)
      await mkdir(path.dirname(target), { recursive: true })
      await writeFile(target, output.data)
      files.push({
        file: `${source.weight}/${output.name}`,
        bytes: output.data.length,
        sha256: digest(output.data),
      })
    } else if (output.name.endsWith('.css')) {
      css = Buffer.from(output.data).toString('utf8')
    } else if (output.name === 'reporter.bin') {
      hasReporter = true
    }
  }
  if (!css || !hasReporter || files.length === 0)
    throw new Error(`字体分片产物不完整：${source.name}`)
  return {
    css: css
      .replaceAll('local("Chill Round Gothic"),', '')
      .replaceAll(
        'url("./',
        `url("/fonts/chill-round-gothic/${source.weight}/`,
      ),
    files,
  }
}

async function main() {
  const wasm = await readFile(wasmFile)
  const wasmHash =
    '05a88dcb9a0b0d1e14daf0f429d9af6e2ac8d94d9e574523a76d3e9f440dccc9'
  if (digest(wasm) !== wasmHash)
    throw new Error('cn-font-split WASM 摘要不匹配')

  await rm(outputDir, { recursive: true, force: true })
  await mkdir(outputDir, { recursive: true })
  const runtime = new StaticWasm(new Uint8Array(wasm))
  const results = []
  for (const source of sources) {
    process.stdout.write(`正在生成 ${source.name} (${source.weight})...\n`)
    results.push({ source, ...(await splitFont(runtime, source)) })
  }

  const licenseData = await downloadBlob(
    license.blob,
    license.hash,
    path.join(cacheDir, 'OFL-1.1.txt'),
  )
  await writeFile(path.join(outputDir, 'OFL-1.1.txt'), licenseData)
  await mkdir(path.dirname(cssFile), { recursive: true })
  await writeFile(
    cssFile,
    `${results.map((result) => result.css).join('\n')}\n`,
  )

  const report = {
    generatedAt: new Date().toISOString(),
    upstream,
    splitter: {
      packageVersion: '7.4.3',
      engineVersion: '7.6.8',
      wasmSha256: wasmHash,
    },
    inputs: sources.map(({ name, weight, blob, hash }) => ({
      name,
      weight,
      blob,
      sha256: hash,
    })),
    licenseSha256: license.hash,
    preloads: findPreloads(
      results.find(({ source }) => source.weight === '900').css,
      '薪梦集',
    ),
    outputs: results.map(({ source, files }) => ({
      weight: source.weight,
      chunks: files.length,
      bytes: files.reduce((total, file) => total + file.bytes, 0),
      files,
    })),
  }
  await writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`)
  process.stdout.write('字体分片、许可和构建报告已生成。\n')
}

await main()
