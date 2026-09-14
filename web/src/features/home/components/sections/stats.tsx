/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/
import { AnimateInView } from '@/components/animate-in-view'

interface StatsProps {
  className?: string
}

const roles = [
  '独立开发者',
  '在读学生',
  '一人公司',
  '自由职业者',
  '产品经理',
  '量化交易者',
] as const

export function Stats(_props: StatsProps) {
  return (
    <section className='nextoken-pricing-band' id='pricing'>
      <div className='nextoken-pricing-glow' aria-hidden />
      <div className='nextoken-container'>
        <div className='nextoken-pricing-inner'>
          <div className='nextoken-pricing-copy'>
            <span className='nextoken-section-kicker'>PRICING ADVANTAGE</span>
            <h2>少一点成本，多一点算力</h2>
            <p>不堆复杂价格表，直接按官方价格折扣展示。</p>
          </div>
          <div className='nextoken-pricing-number'>
            <strong>2</strong>
            <span>折起</span>
          </div>
        </div>

        <AnimateInView className='nextoken-trust-panel' animation='fade-up'>
          <div className='nextoken-users-block' id='users'>
            <div className='nextoken-trust-head'>
              <span aria-hidden />
              <span>他们正在使用</span>
            </div>
            <div className='nextoken-role-grid'>
              {roles.map((role) => (
                <div className='nextoken-role-card' key={role}>
                  <span aria-hidden />
                  <span>{role}</span>
                </div>
              ))}
            </div>
          </div>
          <div className='nextoken-persona-card' aria-hidden='true'>
            <div className='nextoken-persona-fx'>
              <i className='nextoken-persona-orbit nextoken-orbit-one' />
              <i className='nextoken-persona-orbit nextoken-orbit-two' />
              <i className='nextoken-persona-orbit nextoken-orbit-three' />
              <i className='nextoken-persona-halo nextoken-halo-one' />
              <i className='nextoken-persona-halo nextoken-halo-two' />
              <i className='nextoken-persona-scan' />
              <span className='nextoken-holo-chip nextoken-chip-code'>
                &lt;/&gt;
              </span>
              <span className='nextoken-holo-chip nextoken-chip-ai'>AI</span>
              <span className='nextoken-holo-chip nextoken-chip-api'>API</span>
              <span className='nextoken-spark nextoken-spark-one' />
              <span className='nextoken-spark nextoken-spark-two' />
              <span className='nextoken-spark nextoken-spark-three' />
              <span className='nextoken-spark nextoken-spark-four' />
              <span className='nextoken-spark nextoken-spark-five' />
              <span className='nextoken-spark nextoken-spark-six' />
              <span className='nextoken-data-line nextoken-data-line-one' />
              <span className='nextoken-data-line nextoken-data-line-two' />
              <span className='nextoken-base-ring' />
            </div>
            <img src='/nextoken-developer.webp' alt='' />
          </div>
        </AnimateInView>
      </div>
    </section>
  )
}
