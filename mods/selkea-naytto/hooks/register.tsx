import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Progress } from '../types'

const isOn = atom({ plugin: 'selkea-naytto', key: 'isOn' } as const, true)
const progress = atom({ plugin: 'selkea-naytto', key: 'progress' } as const, null)

const EDITS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])

const basename = (path: unknown): string =>
  typeof path === 'string' ? (path.split('/').pop() ?? path) : ''

const cut = (text: string, max = 50): string =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text

/** Yksi lyhyt suomenkielinen kuvaus siitä, mitä työkalukutsu tekee. */
export const describe = (tool: string, input: unknown): string => {
  const i = (input ?? {}) as Record<string, unknown>
  const str = (key: string) => (typeof i[key] === 'string' ? (i[key] as string) : '')

  switch (tool) {
    case 'Read':
      return `Luetaan ${basename(i.file_path)}`
    case 'Edit':
    case 'MultiEdit':
    case 'NotebookEdit':
      return `Muokataan ${basename(i.file_path ?? i.notebook_path)}`
    case 'Write':
      return `Kirjoitetaan ${basename(i.file_path)}`
    case 'Bash':
      return `Ajetaan: ${cut(str('description') || str('command').split('\n')[0] || '')}`
    case 'Grep':
    case 'Glob':
      return `Haetaan "${cut(str('pattern'), 30)}"`
    case 'WebSearch':
      return `Etsitään verkosta: ${cut(str('query'))}`
    case 'WebFetch':
      return `Haetaan sivu ${cut(str('url'))}`
    case 'Agent':
    case 'Task':
      return `Apuagentti: ${cut(str('description'))}`
    case 'TaskCreate':
    case 'TaskUpdate':
    case 'TodoWrite':
      return 'Päivitetään tehtävälistaa'
    default:
      return tool.startsWith('mcp__') ? tool.split('__').slice(1).join(' › ') : tool
  }
}

const fresh = (): Progress => ({ steps: 0, errors: 0, current: null, files: [], isDone: false })

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'selkea',
      description: 'Selkeä näyttö päälle tai pois (siivoaa työkalurivit työn ajaksi)',
    })

    return next(e)
  })

  on('command.run', { command: 'selkea' }, async $ => {
    await update($, isOn, value => !value)
    const now = await read($, isOn)

    return { text: now ? 'Selkeä näyttö päällä.' : 'Selkeä näyttö pois – näytetään kaikki.' }
  })

  on('prompt.submit', async ($, e, next) => {
    await update($, progress, () => fresh())

    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    const what = describe(e.tool, e)
    await update($, progress, p => ({ ...(p ?? fresh()), steps: (p?.steps ?? 0) + 1, current: what }))

    const ran = await next(e)
    const hasFailed = ran.deny !== undefined || ran.isError === true
    const file = EDITS.has(e.tool) ? basename((e as Record<string, unknown>).file_path) : ''

    await update($, progress, p => {
      const base = p ?? fresh()
      const files = file && !hasFailed ? [...base.files.filter(f => f !== file), file] : base.files

      return { ...base, errors: base.errors + (hasFailed ? 1 : 0), current: null, files }
    })

    return ran
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    await update($, progress, p => (p ? { ...p, current: null, isDone: true } : p))

    return next(e)
  })

  // Tiivis yksirivinen työkalurivi; virheet näytetään aina kokonaan.
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    if (!(await read($, isOn)) || e.props.isErrored || e.props.isInterrupted) {
      return next(e)
    }

    const { Text } = $.ui.resolve(e)
    const mark = e.props.isRunning ? '…' : '✓'

    return (
      <Text dimColor={!e.props.isRunning} wrap="truncate-end">
        {mark} {describe(e.props.tool, e.props.input)}
      </Text>
    )
  })

  // Onnistuneiden kutsujen tuloste piiloon (ctrl+o näyttää kaiken).
  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    if (!(await read($, isOn)) || e.props.isErrored) {
      return next(e)
    }

    const { Box } = $.ui.resolve(e)

    return <Box />
  })

  // "(ctrl+b to run in background)" -vihje pois.
  on('ui.render', { component: 'ToolProgress' }, async ($, e, next) =>
    (await read($, isOn)) ? next({ ...e, props: { ...e.props, hint: '' } }) : next(e),
  )

  // Spinner kertoo, mitä tehdään nyt.
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const p = await read($, progress)

    if (!(await read($, isOn)) || !p?.current) {
      return next(e)
    }

    return next({ ...e, props: { ...e.props, message: `Vaihe ${p.steps}: ${p.current}` } })
  })

  // Yksi tilarivi promptin yllä: eteneminen, virheet, muokatut tiedostot.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const p = await read($, progress)

    if (e.props.hasSurvey || !(await read($, isOn)) || p === null || p.steps === 0) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const files = p.files.length > 0 ? ` · muokattu: ${p.files.slice(-4).join(', ')}` : ''
    const more = p.files.length > 4 ? ` +${p.files.length - 4}` : ''

    return (
      <Box>
        <Text color={p.isDone ? 'green' : 'cyan'}>{p.isDone ? '✔ Valmis' : '▶ Työn alla'}</Text>
        <Text dimColor wrap="truncate-end">
          {' '}· {p.steps} vaihetta
          {p.errors > 0 ? '' : ' · ei virheitä'}
        </Text>
        {p.errors > 0 && <Text color="red"> · {p.errors} virhettä</Text>}
        <Text dimColor wrap="truncate-end">
          {files}
          {more}
        </Text>
      </Box>
    )
  })
}
