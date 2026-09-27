import english from './locales/en.json'
import { browserLanguage, isLanguage, localizedUrl, readPreference, preferenceKey } from './language'
const catalog: Record<string, string> = english
export const language = document.documentElement.lang === 'en' ? 'en' : 'ru'
export function t(value: string): string {
  if (language === 'ru') return value
  const trimmed = value.trim()
  return catalog[trimmed] ? value.replace(trimmed, catalog[trimmed]) : value
}
function save(language: string) { try { localStorage.setItem(preferenceKey, language) } catch { /* Navigation still works without storage. */ } }
export function setupLanguage() {
  const links = document.querySelectorAll<HTMLAnchorElement>('[data-language]')
  function updateLinks() {
    links.forEach(link => {
      const target = link.dataset.language
      if (!isLanguage(target)) return
      const url = localizedUrl(location.href, target)
      const selected = document.querySelector<HTMLElement>('[data-case][aria-pressed="true"]')?.dataset.case
      const branch = document.querySelector<HTMLElement>('[data-branch][aria-pressed="true"]')?.dataset.branch
      const install = document.querySelector<HTMLElement>('[data-install][aria-pressed="true"]')?.dataset.install
      if (selected) url.searchParams.set('case', selected)
      if (branch) url.searchParams.set('branch', branch)
      if (install) url.searchParams.set('install', install)
      url.searchParams.set('motion', document.documentElement.classList.contains('motion-paused') ? 'off' : 'on')
      let section = 'home'
      document.querySelectorAll<HTMLElement>('main section[id], #evidence, #setup').forEach(item => {
        if (item.getBoundingClientRect().top <= innerHeight * .4) section = item.id
      })
      url.hash = section
      link.href = url.href
    })
  }
  updateLinks()
  let scheduled = false
  window.addEventListener('scroll', () => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => { scheduled = false; updateLinks() })
  }, { passive: true })
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null
    const link = target?.closest<HTMLAnchorElement>('[data-language]')
    if (link && isLanguage(link.dataset.language)) { updateLinks(); save(link.dataset.language) }
    else updateLinks()
  })
  const suggestion = document.querySelector<HTMLElement>('.language-suggestion')!
  let saved = null
  try { saved = readPreference(localStorage) } catch { /* Storage may be disabled. */ }
  const detected = browserLanguage(navigator.languages?.length ? navigator.languages : [navigator.language])
  if (!saved && detected !== language) suggestion.hidden = false
  document.querySelector<HTMLButtonElement>('#keep-language')!.addEventListener('click', () => {
    save(language)
    suggestion.hidden = true
    document.querySelector<HTMLAnchorElement>('.masthead [data-language][aria-current="true"]')?.focus({ preventScroll: true })
  })
  suggestion.addEventListener('keydown', event => {
    if (event.key === 'Escape') document.querySelector<HTMLButtonElement>('#keep-language')!.click()
  })
}
