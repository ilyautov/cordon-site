import { preferredLanguage, readPreference, localizedUrl } from './language'
let saved = null
try { saved = readPreference(localStorage) } catch { /* Fall back to the browser language. */ }
const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
location.replace(localizedUrl(location.href, preferredLanguage(languages, saved)).href)
