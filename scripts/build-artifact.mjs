// Kokoaa `vite build` -käännöksen yhdeksi HTML-tiedostoksi claude.ai-artifaktia varten:
// tyylit ja skripti upotetaan sivuun, koska artifakti julkaistaan yhtenä tiedostona.
// Käyttö: npm run build:artifact → dist-artifact/ruokalista.html
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const assets = join('dist', 'assets')
const files = readdirSync(assets)
const js = files.filter(f => f.endsWith('.js'))
const css = files.filter(f => f.endsWith('.css'))

if (js.length !== 1 || css.length !== 1) {
  // Useampi skriptitiedosto tarkoittaa erikseen ladattavaa osaa (esim. Firebase), jota
  // yksi upotettu sivu ei voi ladata.
  throw new Error(`Odotettiin yksi .js ja yksi .css, löytyi: ${files.join(', ')}`)
}

const script = readFileSync(join(assets, js[0]), 'utf8')
const style = readFileSync(join(assets, css[0]), 'utf8')
if (script.includes('</script')) throw new Error('Skriptissä on </script-merkkijono, jota ei voi upottaa sellaisenaan.')

const fonts =
  'https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap'
const page = `<title>Perheen ruokalista</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="${fonts}" rel="stylesheet">
<style>${style}</style>
<div id="root"></div>
<script type="module">${script}</script>
`

mkdirSync('dist-artifact', { recursive: true })
writeFileSync(join('dist-artifact', 'ruokalista.html'), page)
console.log(`dist-artifact/ruokalista.html (${Math.round(page.length / 1024)} kt)`)
