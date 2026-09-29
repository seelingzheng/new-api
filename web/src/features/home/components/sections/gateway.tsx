/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/
import { Claude, DeepSeek, Gemini, OpenAI } from '@lobehub/icons'
import {
  AppWindow,
  ArrowLeftRight,
  Braces,
  CircleDot,
  LayoutGrid,
  Wallet,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'

type Node = {
  label: string
  Icon: ComponentType<{ size?: number }>
  official?: boolean
}

const upstreamNodes: Node[] = [
  { label: 'OpenAI', Icon: OpenAI, official: true },
  { label: 'Anthropic', Icon: Claude.Color, official: true },
  { label: 'Gemini', Icon: Gemini.Color, official: true },
  { label: 'DeepSeek', Icon: DeepSeek.Color, official: true },
]

const downstreamNodes: Node[] = [
  { label: 'Unified API', Icon: Braces },
  { label: 'Model switching', Icon: ArrowLeftRight },
  { label: 'Unified billing', Icon: Wallet },
  { label: 'App integration', Icon: AppWindow },
]

const gatewayCaps = [
  'OpenAI-compatible API',
  'Multi-model routing',
  'Unified key management',
  'Usage logs',
] as const

const benefits = [
  {
    title: 'Multi-model access',
    description:
      'Connect several model vendors through one API and drop the repeated adapter work.',
    Icon: CircleDot,
  },
  {
    title: 'Switch models freely',
    description:
      'Change models inside the same application based on quality, price, and scenario.',
    Icon: ArrowLeftRight,
  },
  {
    title: 'Unified management',
    description:
      'Review calls, token usage, balance, and activity in one place to keep operations simple.',
    Icon: LayoutGrid,
  },
] as const

const routePaths = [
  'M225 150 C380 150 420 267 510 267',
  'M225 220 C390 220 430 267 510 267',
  'M225 300 C390 300 430 267 510 267',
  'M225 370 C380 370 420 267 510 267',
  'M670 267 C760 267 800 150 955 150',
  'M670 267 C750 267 790 220 955 220',
  'M670 267 C750 267 790 300 955 300',
  'M670 267 C760 267 800 370 955 370',
] as const

function RouteColumn(props: { side: 'left' | 'right' }) {
  const { t } = useTranslation()
  const nodes = props.side === 'left' ? upstreamNodes : downstreamNodes

  return (
    <div className={`nextoken-route-col nextoken-route-col-${props.side}`}>
      {nodes.map(({ label, Icon, official }) => (
        <div className='nextoken-route-node' key={label}>
          <span
            className={
              official
                ? 'nextoken-route-icon is-official'
                : 'nextoken-route-icon'
            }
            aria-hidden='true'
          >
            <Icon size={20} />
          </span>
          <span>{t(label)}</span>
        </div>
      ))}
    </div>
  )
}

export function Gateway() {
  const { t } = useTranslation()

  return (
    <section className='nextoken-section' id='router'>
      <div className='nextoken-container'>
        <AnimateInView className='nextoken-section-head' animation='fade-up'>
          <div className='nextoken-section-kicker'>
            {t('Unified access layer')}
          </div>
          <h2>{t('Every model vendor, one way to call')}</h2>
          <p>
            {t(
              'Let NexToken absorb the interface differences between vendors. Maintain one integration, switch models quickly, and manage every call in the same place.'
            )}
          </p>
        </AnimateInView>

        <AnimateInView className='nextoken-router-card' animation='fade-up'>
          <svg
            className='nextoken-route-svg'
            viewBox='0 0 1180 535'
            preserveAspectRatio='none'
            aria-hidden='true'
          >
            <defs>
              <linearGradient
                id='nextokenRouteGradient'
                x1='0'
                y1='0'
                x2='1'
                y2='0'
              >
                <stop stopColor='#00f0ff' stopOpacity='.08' />
                <stop offset='.5' stopColor='#00f0ff' stopOpacity='.82' />
                <stop offset='.78' stopColor='#7000ff' stopOpacity='.62' />
                <stop offset='1' stopColor='#ff007f' stopOpacity='.08' />
              </linearGradient>
            </defs>
            {routePaths.map((d) => (
              <path
                key={d}
                d={d}
                fill='none'
                stroke='url(#nextokenRouteGradient)'
                strokeWidth='2'
              />
            ))}
          </svg>

          <RouteColumn side='left' />

          <div className='nextoken-hub'>
            <div className='nextoken-hub-core'>
              <img src='/nextoken-logo.png' alt='' />
              <strong>NexToken</strong>
              <small>AI MODEL GATEWAY</small>
            </div>
          </div>

          <RouteColumn side='right' />

          <div className='nextoken-cap-row'>
            {gatewayCaps.map((cap) => (
              <span className='nextoken-cap' key={cap}>
                {t(cap)}
              </span>
            ))}
          </div>
        </AnimateInView>

        <div className='nextoken-benefits'>
          {benefits.map(({ title, description, Icon }, index) => (
            <AnimateInView
              key={title}
              className='nextoken-benefit'
              animation='fade-up'
              delay={index * 120}
            >
              <span className='nextoken-benefit-icon' aria-hidden='true'>
                <Icon className='size-5' />
              </span>
              <h3>{t(title)}</h3>
              <p>{t(description)}</p>
            </AnimateInView>
          ))}
        </div>
      </div>
    </section>
  )
}
