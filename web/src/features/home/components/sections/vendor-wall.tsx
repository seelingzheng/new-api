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
import { Claude, DeepSeek, Gemini, OpenAI, Qwen, Zhipu } from '@lobehub/icons'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

type Vendor = {
  name: string
  Icon: ComponentType<{ size?: number }>
}

type MarqueeRowConfig = {
  id: string
  reverse: boolean
  vendors: Vendor[]
}

const VENDOR_ROWS: MarqueeRowConfig[] = [
  {
    id: 'vendors-forward',
    reverse: false,
    vendors: [
      { name: '通义千问', Icon: Qwen.Color },
      { name: 'DeepSeek', Icon: DeepSeek.Color },
      { name: 'Google Gemini', Icon: Gemini.Color },
      { name: 'Anthropic', Icon: Claude.Color },
      { name: 'OpenAI', Icon: OpenAI },
      { name: '智谱 GLM', Icon: Zhipu.Color },
    ],
  },
  {
    id: 'vendors-reverse',
    reverse: true,
    vendors: [
      { name: 'OpenAI', Icon: OpenAI },
      { name: '智谱 GLM', Icon: Zhipu.Color },
      { name: 'Anthropic', Icon: Claude.Color },
      { name: '通义千问', Icon: Qwen.Color },
      { name: 'Google Gemini', Icon: Gemini.Color },
      { name: 'DeepSeek', Icon: DeepSeek.Color },
    ],
  },
]

// The second copy exists only to close the gap when the track loops.
const MARQUEE_COPIES = ['visible', 'looped'] as const

function VendorChip(props: { vendor: Vendor }) {
  const Icon = props.vendor.Icon

  return (
    <span className='nextoken-vendor-chip'>
      <span className='nextoken-vendor-logo' aria-hidden='true'>
        <Icon size={20} />
      </span>
      {props.vendor.name}
    </span>
  )
}

function MarqueeRow(props: { row: MarqueeRowConfig }) {
  return (
    <div
      className={cn(
        'nextoken-marquee',
        props.row.reverse && 'nextoken-marquee-reverse'
      )}
    >
      <div className='nextoken-marquee-track'>
        {MARQUEE_COPIES.map((copy) => (
          <div
            key={copy}
            className='nextoken-marquee-group'
            aria-hidden={copy === 'looped' || undefined}
          >
            {props.row.vendors.map((vendor) => (
              <VendorChip key={vendor.name} vendor={vendor} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function VendorWall(props: { className?: string }) {
  const { t } = useTranslation()

  return (
    <div className={cn('nextoken-vendor-zone', props.className)}>
      <div className='nextoken-vendor-label'>
        {t('Leading model vendors, continuously added')}
      </div>
      {VENDOR_ROWS.map((row) => (
        <MarqueeRow key={row.id} row={row} />
      ))}
    </div>
  )
}
