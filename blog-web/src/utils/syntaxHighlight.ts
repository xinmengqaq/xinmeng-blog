import Prism from 'prismjs'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-powershell'

const LANGUAGE_ALIASES: Record<string, string> = {
  bash: 'bash',
  css: 'css',
  htm: 'markup',
  html: 'markup',
  java: 'java',
  javascript: 'javascript',
  js: 'javascript',
  json: 'json',
  jsx: 'jsx',
  markdown: 'markdown',
  md: 'markdown',
  markup: 'markup',
  powershell: 'powershell',
  ps1: 'powershell',
  py: 'python',
  python: 'python',
  shell: 'bash',
  sh: 'bash',
  sql: 'sql',
  ts: 'typescript',
  tsx: 'tsx',
  typescript: 'typescript',
  xml: 'markup',
  yaml: 'yaml',
  yml: 'yaml',
  zsh: 'bash',
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[character] ?? character,
  )

export const normalizeCodeLanguage = (language?: string | null) =>
  LANGUAGE_ALIASES[language?.trim().toLowerCase() ?? '']

export const highlightCode = (code: string, language?: string | null) => {
  const normalizedLanguage = normalizeCodeLanguage(language)
  const grammar = normalizedLanguage
    ? Prism.languages[normalizedLanguage]
    : undefined

  return grammar
    ? Prism.highlight(code, grammar, normalizedLanguage)
    : escapeHtml(code)
}
