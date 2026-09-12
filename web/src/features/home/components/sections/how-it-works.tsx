/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/
import { KeyRound, Play, Settings2 } from 'lucide-react'

import { AnimateInView } from '@/components/animate-in-view'

const steps = [
  {
    num: '1',
    title: '注册并充值',
    desc: '完成注册，领取体验金或按需充值。',
    icon: Settings2,
  },
  {
    num: '2',
    title: '获取使用凭证',
    desc: '进入控制台获取对应产品的使用信息。',
    icon: KeyRound,
  },
  {
    num: '3',
    title: '开始使用',
    desc: '选择支持的工具和模型，直接开始 AI Coding。',
    icon: Play,
  },
] as const

export function HowItWorks() {
  return (
    <section className='nextoken-how' id='howto'>
      <div className='nextoken-container'>
        <AnimateInView
          className='nextoken-section-heading nextoken-section-heading-centered'
          animation='fade-up'
        >
          <span className='nextoken-section-kicker'>使用流程</span>
          <h2>3 步开始使用</h2>
          <p>流程简单，第一次使用也能快速完成。</p>
        </AnimateInView>
        <div className='nextoken-step-grid'>
          {steps.map(({ num, title, desc, icon: Icon }, index) => (
            <AnimateInView
              key={num}
              delay={index * 130}
              animation='fade-up'
              className='nextoken-step'
            >
              <div className='nextoken-step-number'>{num}</div>
              <div className='nextoken-step-icon'>
                <Icon className='size-6' strokeWidth={1.5} />
              </div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </AnimateInView>
          ))}
        </div>
      </div>
    </section>
  )
}
