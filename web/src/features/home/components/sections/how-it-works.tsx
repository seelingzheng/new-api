/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/
import { KeyRound, Play, Settings2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'

const steps = [
  {
    num: '1',
    title: 'Register and top up',
    description:
      'Create an account, claim trial credits, or top up to prepare for model calls.',
    Icon: Settings2,
  },
  {
    num: '2',
    title: 'Get your credentials',
    description:
      'Create an API key in the console and copy the unified endpoint and call parameters.',
    Icon: KeyRound,
  },
  {
    num: '3',
    title: 'Pick a model and start',
    description:
      'Choose the model you need, add the credentials to your app or AI tool, and start calling.',
    Icon: Play,
  },
] as const

export function HowItWorks() {
  const { t } = useTranslation()

  return (
    <section className='nextoken-section nextoken-steps' id='howto'>
      <div className='nextoken-container'>
        <AnimateInView className='nextoken-section-head' animation='fade-up'>
          <div className='nextoken-section-kicker'>{t('Getting started')}</div>
          <h2>{t('3 steps to get started')}</h2>
          <p>{t('A short flow that first-time users can finish quickly.')}</p>
        </AnimateInView>

        <div className='nextoken-steps-grid'>
          {steps.map(({ num, title, description, Icon }, index) => (
            <AnimateInView
              key={num}
              className='nextoken-step'
              animation='fade-up'
              delay={index * 130}
            >
              <span className='nextoken-step-number' aria-hidden='true'>
                {num}
              </span>
              <span className='nextoken-step-icon' aria-hidden='true'>
                <Icon className='size-6' strokeWidth={1.5} />
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
