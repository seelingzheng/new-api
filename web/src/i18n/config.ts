/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import i18n, { type BackendModule } from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import { convertDetectedLanguage } from './languages'
import en from './locales/en.json'

// Only English is bundled synchronously (it is the fallback language, ~86 KB
// gzipped). Every other locale is fetched on demand, which keeps ~830 KB of
// unused translation strings out of the initial bundle.
export const SUPPORTED_LANGUAGES = [
  'en',
  'zhCN',
  'fr',
  'ru',
  'ja',
  'vi',
  'zhTW',
] as const

// Each locale module is `{ translation: { ...key/value pairs } }`.
type LocaleModule = { default: { translation: Record<string, unknown> } }

const LAZY_LOCALE_LOADERS: Record<string, () => Promise<LocaleModule>> = {
  zhCN: () => import('./locales/zh.json'),
  zhTW: () => import('./locales/zh-TW.json'),
  fr: () => import('./locales/fr.json'),
  ru: () => import('./locales/ru.json'),
  ja: () => import('./locales/ja.json'),
  vi: () => import('./locales/vi.json'),
}

/**
 * Minimal i18next backend that resolves non-English locales from async chunks.
 * English never reaches this backend because it is provided via `resources`.
 */
const lazyLocaleBackend: BackendModule = {
  type: 'backend',
  init() {
    // no services required
  },
  async read(language, _namespace, callback) {
    const load = LAZY_LOCALE_LOADERS[language]
    if (!load) {
      callback(null, false)
      return
    }
    try {
      const module = await load()
      // `read()` must resolve with the namespace payload (the flat key/value
      // map), not with the whole `{ translation: ... }` module.
      callback(null, module.default.translation as never)
    } catch (error) {
      callback(error as Error, false)
    }
  },
}

const initPromise = i18n
  .use(lazyLocaleBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // `en` is already `{ translation: { ... } }`, so it maps directly onto the
    // `translation` namespace. Do NOT wrap it again.
    resources: { en },
    fallbackLng: 'en',
    supportedLngs: [...SUPPORTED_LANGUAGES],
    load: 'currentOnly',
    // Tell i18next that languages missing from `resources` are served by the
    // backend above instead of being treated as load failures.
    partialBundledLanguages: true,
    nsSeparator: false, // Allow literal colons in keys (e.g., URLs, labels)
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    // Locales are loaded asynchronously; never suspend the whole tree on them.
    // `bindI18nStore` makes components re-render when a lazily fetched locale
    // lands in the store (e.g. after the user switches language in settings).
    react: { useSuspense: false, bindI18nStore: 'added' },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      // Browsers report `zh-CN`/`zh-TW`/`zh`; map them onto our `zhCN`/`zhTW`
      // codes (non-Chinese codes pass through for normal supportedLngs matching).
      convertDetectedLanguage,
    },
  })

/**
 * Resolves once the active locale has been fetched. `main.tsx` awaits this
 * before mounting React so users never see a flash of English copy. The race
 * guarantees a hard 3s ceiling — if the chunk is slow or the backend errors we
 * still mount and fall back to English.
 */
export const i18nReady: Promise<unknown> = Promise.race([
  initPromise,
  new Promise((resolve) => {
    setTimeout(resolve, 3000)
  }),
])

export default i18n
