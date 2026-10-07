import { expect, test } from 'claude-code/testing'

import { describe as kuvaa } from '../hooks/register'

test('kuvaukset ovat lyhyitä ja suomeksi', async () => {
  expect(kuvaa('Read', { file_path: '/a/b/App.tsx' })).toBe('Luetaan App.tsx')
  expect(kuvaa('Bash', { command: 'npm test', description: 'Aja testit' })).toBe('Ajetaan: Aja testit')
  expect(kuvaa('mcp__github__get_me', {})).toBe('github › get_me')
})

test('työkalurivi on tiivis ja onnistunut tuloste piilossa', async $ => {
  for (const surface of ['terminal', 'desktop'] as const) {
    const row = await $.ui.mount({
      plugin: 'selkea-naytto',
      surface,
      component: 'ToolUse',
      props: { tool_use_id: 't1', tool: 'Edit', input: { file_path: '/x/main.ts' }, isRunning: false, isErrored: false, isInterrupted: false },
    })
    expect(await row.find({ type: 'Text', text: /Muokataan main\.ts/ })).toBeDefined()
    await row.unmount()

    const result = await $.ui.mount({
      plugin: 'selkea-naytto',
      surface,
      component: 'ToolResult',
      props: { tool_use_id: 't1', tool: 'Edit', output: {}, isErrored: false },
    })
    expect(await result.drawn()).toMatchObject({ type: 'Box' })
    await result.unmount()
  }
})

test('tilarivi laskee vaiheet ja muokatut tiedostot', async ($, on) => {
  on('tool.call', () => ({ result: {} }))
  await $.tool.call({ tool: 'Edit', file_path: '/x/main.ts', old_string: 'a', new_string: 'b' })
  await $.tool.call({ tool: 'Read', file_path: '/x/other.ts' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const band = await $.ui.mount({
      plugin: 'selkea-naytto',
      surface,
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: true, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 9 }, view: {} },
    })
    expect(await band.find({ type: 'Text', text: /2 vaihetta/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /muokattu: main\.ts/ })).toBeDefined()
    await band.unmount()
  }
})
