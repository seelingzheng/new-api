/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { Button } from '@/components/ui/button'

import { VendorWall } from './vendor-wall'

interface HeroProps {
  className?: string
  isAuthenticated?: boolean
}

export function Hero({ isAuthenticated = false }: HeroProps) {
  const { t } = useTranslation()

  return (
    <section className='nextoken-hero' id='top'>
      <div className='nextoken-hero-backdrop' aria-hidden='true' />
      <div className='nextoken-container nextoken-hero-inner'>
        <AnimateInView className='nextoken-eyebrow' animation='fade-in'>
          <span className='nextoken-eyebrow-dot' aria-hidden='true' />
          <span>Multi-model AI Gateway</span>
        </AnimateInView>

        <AnimateInView animation='fade-up' delay={80}>
          <h1 className='nextoken-gradient-text'>
            {t('One entry point to every global AI model')}
          </h1>
        </AnimateInView>

        <AnimateInView animation='fade-up' delay={160}>
          <p className='nextoken-hero-subtitle'>
            {t(
              'NexToken aggregates leading AI model vendors behind a unified API, unified calling, and unified billing. Use different models in one application without integrating each vendor separately.'
            )}
          </p>
        </AnimateInView>

        <AnimateInView className='nextoken-hero-actions' delay={240}>
          <Button
            className='nextoken-button nextoken-button-primary'
            render={<Link to={isAuthenticated ? '/dashboard' : '/sign-in'} />}
          >
            {isAuthenticated ? t('Go to Dashboard') : t('Get Started')}
            <ArrowRight className='size-4' />
          </Button>
        </AnimateInView>

        <AnimateInView animation='fade-up' delay={320}>
          <VendorWall />
        </AnimateInView>
      </div>
    </section>
  )
}
