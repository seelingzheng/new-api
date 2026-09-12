/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/
import { Link } from '@tanstack/react-router'
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  Boxes,
  Code2,
  Gauge,
  KeyRound,
  ShieldCheck,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useStatus } from '@/hooks/use-status'

interface HeroProps {
  className?: string
  isAuthenticated?: boolean
}

const toolItems = [
  { label: 'Codex', icon: Code2, tone: 'blue' },
  { label: 'Claude Code', icon: Boxes, tone: 'orange' },
  { label: 'Cursor', icon: Activity, tone: 'violet' },
  { label: 'Gemini CLI', icon: Gauge, tone: 'cyan' },
  { label: 'OpenCode', icon: BarChart3, tone: 'mint' },
] as const

const routeNodes = [
  { label: 'Codex', position: 'top-left', tone: 'blue', icon: Code2 },
  { label: 'Claude', position: 'middle-left', tone: 'orange', icon: Boxes },
  { label: 'Cursor', position: 'bottom-left', tone: 'violet', icon: Activity },
  { label: 'Gemini', position: 'top-right', tone: 'cyan', icon: Gauge },
  {
    label: 'DeepSeek',
    position: 'middle-right',
    tone: 'blue',
    icon: ShieldCheck,
  },
  {
    label: 'OpenCode',
    position: 'bottom-right',
    tone: 'mint',
    icon: BarChart3,
  },
] as const

export function Hero({ isAuthenticated = false }: HeroProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const docsUrl =
    (status?.docs_link as string | undefined) || 'https://docs.newapi.pro'

  return (
    <section className='nextoken-hero'>
      <div className='nextoken-hero-glow nextoken-hero-glow-left' aria-hidden />
      <div
        className='nextoken-hero-glow nextoken-hero-glow-right'
        aria-hidden
      />
      <div className='nextoken-container nextoken-hero-grid'>
        <div className='nextoken-hero-copy'>
          <div className='nextoken-eyebrow'>
            <span className='nextoken-live-dot' aria-hidden />
            <span>AI COMPUTE RELAY</span>
          </div>
          <h1>
            主流 AI Coding
            <span>官方价 2 折起</span>
          </h1>
          <p className='nextoken-hero-subtitle'>
            支持 Codex、Claude Code、Cursor、Gemini CLI、OpenCode
            等主流工具，一套算力服务覆盖常用 AI Coding 场景。
          </p>
          <div className='nextoken-hero-actions'>
            <Button
              className='nextoken-button nextoken-button-primary'
              render={<Link to={isAuthenticated ? '/dashboard' : '/sign-up'} />}
            >
              {t(isAuthenticated ? 'Go to Dashboard' : 'Get Started')}
              <ArrowRight className='size-4' />
            </Button>
            {!isAuthenticated && (
              <Button
                variant='outline'
                className='nextoken-button nextoken-button-ghost'
                render={<Link to='/pricing' />}
              >
                {t('View Pricing')}
              </Button>
            )}
            <Button
              variant='outline'
              className='nextoken-button nextoken-button-ghost nextoken-docs-button'
              render={
                <a href={docsUrl} target='_blank' rel='noopener noreferrer' />
              }
            >
              <BookOpen className='size-4' />
              {t('Docs')}
            </Button>
          </div>
          <div
            className='nextoken-tool-rail'
            aria-label={t('Supported Applications')}
          >
            {toolItems.map(({ label, icon: Icon, tone }) => (
              <span className='nextoken-tool-pill' key={label}>
                <span className={`nextoken-tool-icon tone-${tone}`}>
                  <Icon className='size-3.5' />
                </span>
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className='nextoken-routing-visual' aria-hidden='true'>
          <div className='nextoken-routing-card'>
            <div className='nextoken-routing-grid' />
            <div className='nextoken-routing-scan' />
            <div className='nextoken-routing-heading'>
              <span>ROUTING MATRIX / 01</span>
              <span className='nextoken-routing-online'>ONLINE</span>
            </div>
            <div className='nextoken-routing-core'>
              <div className='nextoken-routing-core-mark'>N</div>
              <strong>NEXTOKEN</strong>
              <span>AI COMPUTE RELAY</span>
            </div>
            {routeNodes.map(({ label, position, tone, icon: Icon }) => (
              <div
                className={`nextoken-route-node route-${position}`}
                key={label}
              >
                <span className={`nextoken-route-icon tone-${tone}`}>
                  <Icon className='size-3.5' />
                </span>
                <span>{label}</span>
              </div>
            ))}
            <i className='nextoken-route-line line-one' />
            <i className='nextoken-route-line line-two' />
            <i className='nextoken-route-line line-three' />
            <i className='nextoken-route-line line-four' />
            <i className='nextoken-route-line line-five' />
            <i className='nextoken-route-line line-six' />
            <div className='nextoken-routing-footer'>
              <KeyRound className='size-3.5' />
              <span>ONE API · MULTI-MODEL · LIVE</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
