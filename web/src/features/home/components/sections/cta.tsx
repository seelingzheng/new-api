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

interface CTAProps {
  className?: string
  isAuthenticated?: boolean
}

export function CTA({ isAuthenticated = false }: CTAProps) {
  const { t } = useTranslation()

  return (
    <section className='nextoken-cta'>
      <AnimateInView className='nextoken-container' animation='scale-in'>
        <div className='nextoken-cta-box'>
          <div className='nextoken-cta-grid' aria-hidden />
          <div className='nextoken-cta-copy'>
            <span className='nextoken-offer-badge'>限时优惠</span>
            <h2>
              {isAuthenticated
                ? '继续使用 Nextoken'
                : '现在注册，额外获得体验金'}
            </h2>
            <p>
              先确认你正在使用的产品和模型是否支持，再进入控制台查看实际优惠方案。几分钟完成配置，即可开始使用。
            </p>
          </div>
          <Button
            className='nextoken-button nextoken-cta-button'
            render={<Link to={isAuthenticated ? '/dashboard' : '/sign-up'} />}
          >
            {t(isAuthenticated ? 'Go to Dashboard' : 'Get Started')}
            <ArrowRight className='size-4' />
          </Button>
        </div>
      </AnimateInView>
    </section>
  )
}
