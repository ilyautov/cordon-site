export type Language = 'ru' | 'en'
export const preferenceKey = 'cordon.language'
export function isLanguage(value: unknown): value is Language { return value === 'ru' || value === 'en' }
export function browserLanguage(languages: readonly string[]): Language {
  return /^ru(?:-|$)/i.test(languages[0] ?? '') ? 'ru' : 'en'
}
export function readPreference(storage: Pick<Storage, 'getItem'> | undefined): Language | null {
  try { const value = storage?.getItem(preferenceKey); return isLanguage(value) ? value : null } catch { return null }
}
export function preferredLanguage(languages: readonly string[], saved: Language | null): Language {
  return saved ?? browserLanguage(languages)
}
export function localizedUrl(current: string, language: Language): URL {
  const url = new URL(current)
  url.pathname = url.pathname.replace(/(?:ru|en)\/(?:index\.html)?$/, '').replace(/index\.html$/, '').replace(/\/?$/, '/') + language + '/'
  return url
}
export function readDemoState(search: string): { selectedCase: 'reviews' | 'analytics' | 'files'; branch: 'normal' | 'suspicious'; install: 'claude' | 'gemini' | 'mcp' | 'langchain'; paused: boolean } {
  const params = new URLSearchParams(search)
  const selectedCase = params.get('case')
  const branch = params.get('branch')
  const install = params.get('install')
  return {
    selectedCase: selectedCase === 'reviews' || selectedCase === 'files' ? selectedCase : 'analytics' as const,
    branch: branch === 'normal' ? 'normal' as const : 'suspicious' as const,
    install: install === 'gemini' || install === 'mcp' || install === 'langchain' ? install : 'claude',
    paused: params.get('motion') === 'off',
  }
}
