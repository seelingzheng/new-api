/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/
import {
  Activity,
  BarChart3,
  Check,
  Code2,
  DollarSign,
  Gauge,
  Globe2,
  ShieldCheck,
} from 'lucide-react'

import { AnimateInView } from '@/components/animate-in-view'

interface FeaturesProps {
  className?: string
}

const models = [
  { name: 'OpenAI', detail: 'GPT-4o / Codex', tone: 'blue', icon: Code2 },
  { name: 'Anthropic', detail: 'Claude 3.7', tone: 'orange', icon: Activity },
  { name: 'Google', detail: 'Gemini 2.5', tone: 'cyan', icon: Globe2 },
  { name: 'DeepSeek', detail: 'V3 / R1', tone: 'violet', icon: Gauge },
  {
    name: 'Open source',
    detail: 'Llama / Qwen',
    tone: 'mint',
    icon: ShieldCheck,
  },
] as const

const capabilities = [
  {
    num: '01',
    title: '高速路由',
    desc: '低延迟路径与自动负载均衡，让每次请求都更快。',
    icon: Gauge,
    tone: 'cyan',
  },
  {
    num: '02',
    title: '稳定访问',
    desc: '健康检查与备用渠道，让你的工作流持续运行。',
    icon: ShieldCheck,
    tone: 'mint',
  },
  {
    num: '03',
    title: '用量控制',
    desc: '在 New API 控制台统一查看令牌、费用和使用限制。',
    icon: BarChart3,
    tone: 'blue',
  },
  {
    num: '04',
    title: '开放协议',
    desc: '通过熟悉的 OpenAI 兼容路由连接现有工具。',
    icon: Code2,
    tone: 'violet',
  },
] as const

export function Features(_props: FeaturesProps) {
  return (
    <section className='nextoken-features'>
      <div className='nextoken-container'>
        <AnimateInView className='nextoken-section-heading' animation='fade-up'>
          <span className='nextoken-section-kicker'>模型覆盖</span>
          <h2>一个网关，连接所有模型</h2>
          <p>连接你已经在使用的工具，让每一次请求都在你的掌控之下。</p>
        </AnimateInView>

        <div className='nextoken-model-grid'>
          {models.map(({ name, detail, tone, icon: Icon }, index) => (
            <AnimateInView
              key={name}
              delay={index * 80}
              animation='scale-in'
              className='nextoken-model-card'
            >
              <div className='nextoken-model-brand'>
                <span className={`nextoken-model-icon tone-${tone}`}>
                  <Icon className='size-4' />
                </span>
                <strong>{name}</strong>
              </div>
              <span className='nextoken-model-status'>
                <span aria-hidden /> 当前可用
              </span>
              <p>{detail}</p>
            </AnimateInView>
          ))}
        </div>

        <div className='nextoken-capability-grid'>
          {capabilities.map(({ num, title, desc, icon: Icon, tone }, index) => (
            <AnimateInView
              key={num}
              delay={index * 90}
              animation='fade-up'
              className='nextoken-capability'
            >
              <div className='nextoken-capability-top'>
                <span>{num}</span>
                <Icon className={`size-5 tone-${tone}`} />
              </div>
              <h3>{title}</h3>
              <p>{desc}</p>
              <Check className='nextoken-capability-check size-4' aria-hidden />
            </AnimateInView>
          ))}
        </div>

        <div className='nextoken-feature-note'>
          <DollarSign className='size-4' aria-hidden />
          <span>透明计费，实时监控使用情况</span>
        </div>
      </div>
    </section>
  )
}
