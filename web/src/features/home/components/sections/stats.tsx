/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/
import { CircleDollarSign, LineChart, Server, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface StatsProps {
  className?: string
}

const metrics = [
  { value: '50+', label: '上游服务', icon: Server },
  { value: '100+', label: '模型支持', icon: Sparkles },
  { value: '50+', label: '兼容路由', icon: LineChart },
  { value: '24/7', label: '路由可用性', icon: CircleDollarSign },
] as const

export function Stats(_props: StatsProps) {
  const { t } = useTranslation()

  return (
    <section className='nextoken-pricing-band' id='pricing'>
      <div className='nextoken-pricing-glow' aria-hidden />
      <div className='nextoken-container nextoken-pricing-inner'>
        <div className='nextoken-pricing-copy'>
          <span className='nextoken-section-kicker'>PRICING ADVANTAGE</span>
          <h2>少一点成本，多一点算力</h2>
          <p>不堆复杂价格表，直接按官方价格折扣展示。</p>
        </div>
        <div className='nextoken-pricing-number'>
          <strong>2</strong>
          <span>折起</span>
        </div>
        <div className='nextoken-developer-art' aria-hidden>
          <div className='nextoken-art-ring art-ring-one' />
          <div className='nextoken-art-ring art-ring-two' />
          <img src='/nextoken-developer.png' alt='' />
        </div>
      </div>
      <div
        className='nextoken-container nextoken-metrics'
        aria-label='平台概览'
      >
        {metrics.map(({ value, label, icon: Icon }) => (
          <div className='nextoken-metric' key={label}>
            <Icon className='size-4' aria-hidden />
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className='nextoken-container nextoken-users-strip' id='users'>
        <span className='nextoken-section-kicker'>他们正在使用</span>
        <div className='nextoken-role-list'>
          {[
            '独立开发者',
            '在读学生',
            '一人公司',
            '自由职业者',
            '产品经理',
            '量化交易者',
          ].map((role) => (
            <span key={role}>{role}</span>
          ))}
        </div>
      </div>
    </section>
  )
}
