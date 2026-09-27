// language.ts
var preferenceKey = "cordon.language";
function isLanguage(value) {
  return value === "ru" || value === "en";
}
function browserLanguage(languages2) {
  return /^ru(?:-|$)/i.test(languages2[0] ?? "") ? "ru" : "en";
}
function readPreference(storage) {
  try {
    const value = storage?.getItem(preferenceKey);
    return isLanguage(value) ? value : null;
  } catch {
    return null;
  }
}
function preferredLanguage(languages2, saved2) {
  return saved2 ?? browserLanguage(languages2);
}
function localizedUrl(current, language) {
  const url = new URL(current);
  url.pathname = url.pathname.replace(/(?:ru|en)\/(?:index\.html)?$/, "").replace(/index\.html$/, "").replace(/\/?$/, "/") + language + "/";
  return url;
}

// route.ts
var saved = null;
try {
  saved = readPreference(localStorage);
} catch {
}
var languages = navigator.languages?.length ? navigator.languages : [navigator.language];
location.replace(localizedUrl(location.href, preferredLanguage(languages, saved)).href);
