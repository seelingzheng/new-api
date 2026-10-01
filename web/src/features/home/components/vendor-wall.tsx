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
import { useTranslation } from 'react-i18next'

import { getLobeIcon } from '@/lib/lobe-icon'

import { AI_APPLICATIONS, AI_MODELS } from '../constants'

/**
 * Vendor wall: two counter-drifting rows of the models and applications the
 * gateway speaks to. Icons come from the bundled `@lobehub/icons` set through
 * `getLobeIcon`, so nothing is hot-linked from a vendor site and the wall
 * still renders on an air-gapped deployment.
 */

const ROWS = [
  { items: AI_MODELS, direction: 'forward' as const },
  { items: AI_APPLICATIONS, direction: 'reverse' as const },
]

function displayName(iconName: string): string {
  // Icon names carry variants and chained props, e.g. "Claude.Color" or
  // "OpenAI.Avatar.type={'platform'}". Only the vendor name should be shown.
  return iconName.split('.')[0] ?? iconName
}

function VendorChip({ iconName }: { iconName: string }) {
  return (
    <span className='glass-2 border-border/50 text-foreground/85 flex shrink-0 items-center gap-2.5 rounded-full border py-1.5 pr-4 pl-1.5 text-sm font-medium dark:border-border/25'>
      <span className='bg-card/70 ring-border/40 ring-1 ring-inset flex size-7 items-center justify-center rounded-full'>
        {getLobeIcon(iconName, 18)}
      </span>
      {displayName(iconName)}
    </span>
  )
}

// A row is only seamless when one half is at least as wide as the viewport.
// Short lists are repeated until they clear that floor, so the -50% translate
// never exposes a gap.
const MIN_CHIPS_PER_HALF = 8

interface WallSlot {
  key: string
  iconName: string
}

function fillRow(items: readonly string[], rowName: string): WallSlot[] {
  const slots: WallSlot[] = []
  let pass = 0
  while (slots.length < MIN_CHIPS_PER_HALF) {
    for (const iconName of items) {
      slots.push({ key: `${rowName}-${pass}-${iconName}`, iconName })
    }
    pass += 1
    if (items.length >= MIN_CHIPS_PER_HALF) break
  }
  return slots
}

function MarqueeRow({
  items,
  direction,
}: {
  items: readonly string[]
  direction: 'forward' | 'reverse'
}) {
  const slots = fillRow(items, direction)
  const half = (
    <div className='flex gap-3 pr-3'>
      {slots.map((slot) => (
        <VendorChip key={slot.key} iconName={slot.iconName} />
      ))}
    </div>
  )

  return (
    <div className='marquee fade-x overflow-hidden'>
      <div className='marquee-track' data-direction={direction}>
        {half}
        {/* Second identical half is what makes the -50% translate seamless. */}
        <div aria-hidden>{half}</div>
      </div>
    </div>
  )
}

export function VendorWall() {
  const { t } = useTranslation()

  return (
    <section
      aria-labelledby='vendor-wall-title'
      className='border-border/40 border-y py-12'
    >
      <h2
        id='vendor-wall-title'
        className='text-muted-foreground mb-7 text-center text-xs font-semibold tracking-[0.18em] uppercase'
      >
        {t('Models and applications the gateway speaks to')}
      </h2>
      <div className='flex flex-col gap-3'>
        {ROWS.map((row) => (
          <MarqueeRow
            key={row.direction}
            items={row.items}
            direction={row.direction}
          />
        ))}
      </div>
    </section>
  )
}
