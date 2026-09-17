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
type KatexModule = typeof import('katex')

let request: Promise<KatexModule> | null = null
let loaded: KatexModule | null = null

/**
 * KaTeX is 271 KB of font metric tables. It used to be a static import of
 * `components/ui/markdown.tsx`, which put all of it in the initial chunk even
 * though the overwhelming majority of rendered markdown has no math in it.
 *
 * Load it on first use instead: `renderMath` emits a placeholder until this
 * resolves, and `<Markdown>` re-renders once it does.
 */
export function loadKatex(): Promise<KatexModule> {
  if (!request) {
    request = import('katex').then((module) => {
      loaded = module
      return module
    })
  }
  return request
}

/** The already-loaded module, or `null` while the chunk is still in flight. */
export function getKatex(): KatexModule | null {
  return loaded
}
