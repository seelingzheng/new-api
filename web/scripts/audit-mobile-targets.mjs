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

// Measures the mobile contract that jsdom cannot prove: real touch-target
// geometry, real horizontal overflow, and real focusability of the collapsed
// navigation panel. Requires a running frontend on the target origin.
//
//   bun run dev &
//   bun scripts/audit-mobile-targets.mjs [http://127.0.0.1:3000]
//
// Exits non-zero when any assertion fails.
import { spawn } from 'node:child_process'

const CHROME =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 9337
const DEBUG = `http://127.0.0.1:${PORT}`
const APP = process.argv[2] ?? 'http://127.0.0.1:3000'
const MIN_TARGET_PX = 44
const VIEWPORT = { width: 390, height: 844 }
const PAGES = ['/', '/pricing', '/rankings', '/about']

// Controls the spec holds to 44x44. Prose links and toast dismissers are
// deliberately excluded: the sizing rule targets navigation and actions.
const TARGETS = [
  { name: 'theme trigger', selector: '.sm\\:hidden > button:first-of-type' },
  { name: 'nav trigger', selector: 'header button[aria-controls]' },
  { name: 'protocol tab', selector: 'button.border-b-2' },
  { name: 'closing CTA', selector: "section a[href='/sign-up']" },
]

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const getJson = async (path) => (await fetch(DEBUG + path)).json()

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    `--user-data-dir=/tmp/qoder-mobile-audit-${PORT}`,
    'about:blank',
  ],
  { stdio: 'ignore' }
)

let socket
let nextId = 0
function call(method, params = {}, sessionId) {
  const id = ++nextId
  socket.send(JSON.stringify({ id, method, params, sessionId }))
  return new Promise((resolve, reject) => {
    const listener = (event) => {
      const message = JSON.parse(event.data)
      if (message.id !== id) return
      socket.removeEventListener('message', listener)
      if (message.error) reject(new Error(JSON.stringify(message.error)))
      else resolve(message.result)
    }
    socket.addEventListener('message', listener)
  })
}

async function evaluate(sessionId, expression) {
  const { result } = await call(
    'Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true },
    sessionId
  )
  return result.value
}

async function waitForApp(sessionId) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const ready = await evaluate(
      sessionId,
      `!!document.querySelector('header button[aria-controls]')`
    )
    if (ready) return true
    await wait(250)
  }
  return false
}

const auditPage = (selectorList, min) => `
(() => {
  const wanted = ${JSON.stringify(selectorList)}
  const min = ${min}
  const out = { overflowX: document.documentElement.scrollWidth > innerWidth + 1,
                scrollWidth: document.documentElement.scrollWidth,
                innerWidth, controls: [] }
  for (const entry of wanted) {
    const elements = [...document.querySelectorAll(entry.selector)]
    if (elements.length === 0) {
      out.controls.push({ name: entry.name, found: false, ok: false })
      continue
    }
    let minW = Infinity
    let minH = Infinity
    for (const el of elements) {
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) continue
      minW = Math.min(minW, r.width)
      minH = Math.min(minH, r.height)
    }
    const w = Math.round(minW)
    const h = Math.round(minH)
    out.controls.push({
      name: entry.name + ' x' + elements.length,
      found: true,
      w,
      h,
      ok: w >= min && h >= min,
    })
  }
  return JSON.stringify(out)
})()
`

const panelProbe = `
(() => {
  const trigger = document.querySelector('header button[aria-controls]')
  if (!trigger) return JSON.stringify({ found: false })
  const panelId = trigger.getAttribute('aria-controls')
  const readState = () => {
    const panel = document.getElementById(panelId)
    const link = panel?.querySelector('a')
    let focusable = false
    if (link) {
      link.focus()
      focusable = document.activeElement === link
      link.blur()
    }
    return {
      expanded: trigger.getAttribute('aria-expanded'),
      panelPresent: !!panel,
      focusableWhileInThisState: focusable,
    }
  }
  const closed = readState()
  trigger.click()
  return new Promise((resolve) => setTimeout(() => {
    const opened = readState()
    trigger.click()
    setTimeout(() => resolve(JSON.stringify({ closed, opened })), 900)
  }, 900))
})()
`

async function main() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await getJson('/json/version')
      break
    } catch {
      await wait(250)
    }
  }
  const { webSocketDebuggerUrl } = await getJson('/json/version')
  socket = new WebSocket(webSocketDebuggerUrl)
  await new Promise((resolve) => socket.addEventListener('open', resolve))

  const { targetId } = await call('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await call('Target.attachToTarget', {
    targetId,
    flatten: true,
  })
  await call('Page.enable', {}, sessionId)
  await call(
    'Emulation.setDeviceMetricsOverride',
    { ...VIEWPORT, deviceScaleFactor: 2, mobile: true },
    sessionId
  )

  const failures = []
  const seen = new Map()
  const observed = new Set()
  for (const path of PAGES) {
    await call('Page.navigate', { url: APP + path }, sessionId)
    if (!(await waitForApp(sessionId))) {
      failures.push(`${path}: app never rendered`)
      continue
    }
    const report = JSON.parse(await evaluate(sessionId, auditPage(TARGETS, MIN_TARGET_PX)))
    // A control may legitimately not exist on some pages; it must be measured
    // correctly on the pages where it does appear, and appear at least once.
    const problems = report.controls.filter((c) => c.found && !c.ok)
    for (const control of report.controls) {
      if (!control.found) continue
      const key = control.name.replace(/ x\d+$/, '')
      seen.set(key, (seen.get(key) ?? true) && control.ok)
      observed.add(key)
    }
    if (report.overflowX) problems.push({ name: 'page overflow', w: report.scrollWidth })
    console.log(
      `${path} ${report.innerWidth}px overflow=${report.overflowX} ` +
        report.controls
          .filter((c) => c.found)
          .map((c) => `${c.name}=${c.w}x${c.h}${c.ok ? '' : '!!'}`)
          .join(' ')
    )
    for (const problem of problems) {
      failures.push(`${path}: ${problem.name} ${problem.w}x${problem.h ?? ''}`)
    }
    if (path === '/') {
      const panel = JSON.parse(await evaluate(sessionId, panelProbe))
      console.log('panel', JSON.stringify(panel))
      if (panel.closed?.focusableWhileInThisState) {
        failures.push('/ : collapsed nav panel stays in the tab order')
      }
      if (panel.closed?.expanded !== 'false') {
        failures.push('/ : nav trigger does not report aria-expanded=false')
      }
      if (panel.opened?.expanded !== 'true') {
        failures.push('/ : nav trigger does not report aria-expanded=true')
      }
      if (!panel.opened?.focusableWhileInThisState) {
        failures.push('/ : opened nav panel is not reachable by keyboard')
      }
    }
  }

  for (const target of TARGETS) {
    if (!observed.has(target.name)) {
      failures.push(`${target.name}: never found on any audited page`)
    } else if (seen.get(target.name) === false) {
      failures.push(`${target.name}: measured below ${MIN_TARGET_PX}px`)
    }
  }

  socket.close()
  chrome.kill()
  if (failures.length) {
    console.error('\nFAIL')
    for (const failure of failures) console.error(' - ' + failure)
    process.exit(1)
  }
  console.log('\nPASS')
}

main().catch((error) => {
  console.error('AUDIT ERROR', error)
  chrome.kill()
  process.exit(1)
})
