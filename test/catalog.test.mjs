import assert from 'node:assert/strict'
import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { apply } from '../lib/index.js'

const OUTPUT = join(import.meta.dirname, 'out')
await rm(OUTPUT, { recursive: true, force: true })

const CWD = 'C:\\work\\demo'

const callEvent = (callId, name, args, seq) => ({
  type: 'tool/call',
  seq,
  time: 1700000000000 + seq,
  data: { callId, name, arguments: JSON.stringify(args) },
})
const resultEvent = (callId, text, seq) => ({
  type: 'tool/result',
  seq,
  time: 1700000000000 + seq,
  data: { message: { role: 'tool', toolCallId: callId, content: [{ type: 'text', text }] } },
})
const uploadEvent = (name, bytes, seq) => ({
  type: 'user/message',
  seq,
  time: 1700000000000 + seq,
  data: { role: 'user', content: [{ type: 'file', attachment: { attachmentId: 'a', name, bytes } }] },
})

const sessions = {
  'session-a': {
    header: { id: 'session-a', createdAt: 1700000000000, cwd: CWD },
    events: [
      uploadEvent('球囊专利.pdf', 1024, 1),
      callEvent('c1', 'read', { file_path: 'README.md' }, 2),
      resultEvent('c1', '# README', 3),
      callEvent('c2', 'grep', { pattern: 'balloon', path: 'src' }, 4),
      resultEvent('c2', 'src/a.ts:1: balloon', 5),
      callEvent('c3', 'web_fetch', { url: 'https://example.com/patent/CN119185757A' }, 6),
      resultEvent('c3', '...', 7),
      callEvent('c4', 'web_search', { queries: ['球囊 导管', 'balloon catheter'] }, 8),
      resultEvent('c4', '结果：https://patents.google.com/patent/CN119185757A', 9),
      callEvent('c5', 'skill', { name: 'axyer' }, 10),
      callEvent('c6', 'mcp__filesystem__read', { path: 'notes.md' }, 11),
      resultEvent('c6', '...', 12),
      // --- high-value: an APK build environment being assembled -------------
      callEvent('c7', 'pwsh', { command: 'curl -L -o jdk.zip https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse' }, 13),
      callEvent('c8', 'pwsh', { command: '& "$sdk\\cmdline-tools\\latest\\bin\\sdkmanager.bat" --sdk_root=$sdk "build-tools;34.0.0" "platforms;android-34"' }, 14),
      callEvent('c9', 'pwsh', { command: 'Invoke-WebRequest https://mirrors.cloud.tencent.com/gradle/gradle-8.7-bin.zip -OutFile g.zip' }, 15),
      // --- high-value: county-level geo data -------------------------------
      callEvent('c10', 'pwsh', { command: 'curl -o geo.json https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json' }, 16),
      callEvent('c11', 'web_search', { queries: ['中国 县域 坐标 数据'] }, 17),
      resultEvent('c11', '结果 https://cdn.jsdelivr.net/gh/88250/city-geo@master/data/data.json', 18),
      // --- high-value: a weather API ---------------------------------------
      callEvent('c12', 'pwsh', { command: 'curl "https://api.open-meteo.com/v1/forecast?latitude=39.9&longitude=116.4&current=temperature_2m"' }, 19),
    ],
  },
  'session-b': {
    header: { id: 'session-b', createdAt: 1700000100000, cwd: CWD },
    events: [
      callEvent('d1', 'read', { file_path: 'README.md' }, 1),          // same source, same channel
      callEvent('d2', 'edit', { file_path: 'README.md' }, 2),          // same source, NEW channel
      callEvent('d3', 'web_fetch', { url: 'https://example.com/patent/CN119185757A/' }, 3), // same URL
      callEvent('d4', 'bash', { command: 'curl -s https://example.com/data.json -o out.json' }, 4),
      // --- same repository, two files: must aggregate into one entry --------
      callEvent('d5', 'web_fetch', { url: 'https://raw.githubusercontent.com/acme/demo/main/README.md' }, 5),
      callEvent('d6', 'web_fetch', { url: 'https://raw.githubusercontent.com/acme/demo/main/src/index.js' }, 6),
      callEvent('d7', 'web_fetch', { url: 'https://github.com/acme/demo/blob/main/build.gradle' }, 7),
      callEvent('d8', 'pwsh', { command: 'curl http://127.0.0.1:8080/api/health' }, 8),
      callEvent('d9', 'web_fetch', { url: 'https://gh-proxy.com/https://raw.githubusercontent.com/acme/demo/main/src/util.js' }, 9),
    ],
  },
}

const query = {
  async listSessions() {
    return Object.values(sessions).map((value) => ({ header: value.header, live: false, persisted: true }))
  },
  async readSession(id) {
    const value = sessions[id]
    return { session: value.header, inheritedEventCount: 0, events: value.events }
  },
}

const registrations = { commands: [], tools: [] }
const ctx = {
  get: (name) => ({
    sessionQuery: query,
    commands: { register: (definition) => { registrations.commands.push(definition); return () => {} } },
    tools: { register: (definition) => { registrations.tools.push(definition); return () => {} } },
    sessions: { get: () => undefined },
  })[name],
  effect: (factory) => factory(),
}

const session = { id: 'session-current', header: { createdAt: Date.now(), cwd: OUTPUT } }
apply(ctx, { outputDir: OUTPUT, valueKeywords: ['县域'], ownOwners: ['acme'] })

const scan = registrations.commands.find((command) => command.name === 'catalog-scan')
assert.ok(scan, 'catalog-scan command registered')
const show = registrations.commands.find((command) => command.name === 'catalog-show')
assert.ok(show, 'catalog-show command registered')
const tool = registrations.tools.find((entry) => entry.name === 'catalog_scan')
assert.ok(tool, 'catalog_scan tool registered')

const signal = new AbortController().signal
const first = await scan.handler({ agent: { session }, rawInput: '', signal })
assert.equal(first.kind, 'success', first.text)
assert.match(first.text, /新扫描 2 个会话/)

const md = await readFile(join(OUTPUT, 'catalog.md'), 'utf8')
const json = JSON.parse(await readFile(join(OUTPUT, 'catalog.json'), 'utf8'))

// --- tools deduplicated by name, counted across sessions -------------------
assert.equal(json.tools.read.count, 2)
assert.equal(json.tools.edit.count, 1)
assert.equal(json.tools.web_fetch.count, 6)
assert.equal(json.tools.skill.count, 1)
assert.equal(json.tools['mcp__filesystem__read'].count, 1)

// --- same source deduplicated; a new method becomes a channel ------------
const readme = json.sources['file:c:/work/demo/readme.md']
assert.ok(readme, 'README.md source recorded')
assert.equal(readme.count, 3)
assert.ok(readme.channels['读取文件'], 'read channel')
assert.ok(readme.channels['编辑文件'], 'edit channel added, not a duplicate source')

// --- URL normalization: trailing slash does not create a second source ----
const urls = Object.keys(json.sources).filter((key) => key.startsWith('web:'))
assert.ok(urls.includes('web:https://example.com/patent/CN119185757A'), urls.join(','))
assert.ok(!urls.includes('web:https://example.com/patent/CN119185757A/'), 'trailing slash folded')

// --- uploaded attachment is a source -------------------------------------
assert.ok(json.sources['upload:球囊专利.pdf'], 'uploaded file recorded')

// --- search query + result URL become sources ----------------------------
assert.ok(json.sources['search:球囊 导管'], 'search query recorded')

// --- markdown: exactly two bilingual tables, nothing else -------------------
assert.match(md, /# DSH 工具与数据源清单 \/ DSH tools and sources/)
assert.match(md, /## 一、工具 \/ Tools/)
assert.match(md, /## 二、数据信息 \/ Data/)
assert.match(md, /\| 工具名称<br>Tool \| 类别<br>Category \| 工具介绍<br>Introduction \| 获取渠道<br>Channel \|/)
assert.match(md, /\| 名称<br>Name \| 类别<br>Category \| 介绍<br>Introduction \| 获取来源<br>Source \|/)
assert.match(md, /已过滤 Filtered out：\d+/)
assert.doesNotMatch(md, /## 三、工具清单/, 'the long inventory is gone')
assert.doesNotMatch(md, /## 四、数据源与信息源/, 'the raw inventory is gone')
assert.doesNotMatch(md, /## 五、获取方式说明/, 'the method appendix is gone')

// --- every row carries what it is, a pro and a con, in both languages -------
assert.match(md, /\*\*中文\*\* /)
assert.match(md, /\*\*English\*\* /)
assert.match(md, /✅ /)
assert.match(md, /⚠️ /)

// --- four categories, two per table ---------------------------------------
for (const [zh, en] of [['环境', 'Environment'], ['源码', 'Code'], ['信息', 'Information'], ['资料', 'References']]) {
  assert.ok(md.includes(`| ${zh}<br>${en}`), `category present: ${zh} / ${en}`)
}
assert.doesNotMatch(md, /环境与运行时<br>/, 'the ten-category taxonomy is gone')
assert.doesNotMatch(md, /构建与包分发<br>/, 'build and mirrors are folded into 环境')
assert.doesNotMatch(md, /地理与行政区划<br>/, 'geo and weather are folded into 信息')
assert.doesNotMatch(md, /专利与文献<br>/, 'patents and papers are folded into 资料')

// --- labels are cross-cutting: local service and own repository ------------
assert.match(md, /🏷 本地 Local/, 'loopback endpoint gets the local label')
assert.match(md, /🏷 本地 Local · 自有 Own|🏷 自有 Own/, 'own repository gets the own label')
assert.match(md, /代理 Proxy/, 'a proxied request gets the proxy label')

// --- high-value entries are kept, named and explained -----------------------
assert.match(md, /\| api\.adoptium\.net\/v3 \|/)
assert.match(md, /\| sdkmanager \|/)
assert.match(md, /\| mirrors\.cloud\.tencent\.com\/gradle \|/)
assert.match(md, /\| geo\.datav\.aliyun\.com\/areas_v3 \|/)
assert.match(md, /\| api\.open-meteo\.com\/v1 \|/)
assert.match(md, /Adoptium 发行的 OpenJDK/)
assert.match(md, /Android SDK 命令行工具/)
assert.match(md, /阿里 DataV 行政区划与边界数据/)
assert.match(md, /Open-Meteo 天气接口/)

// --- the source column carries a URL a reader can open on its own -----------
assert.match(md, /<https:\/\/github\.com\/acme\/demo>/, 'repository row links to the repo page')
assert.match(md, /<https:\/\/api\.adoptium\.net\/v3\/binary\/latest\/17\/ga\/windows\/x64\/jdk\/hotspot\/normal\/eclipse>/, 'download row links to the exact URL')
assert.match(md, /<https:\/\/geo\.datav\.aliyun\.com\/areas_v3\/bound\/100000_full\.json>/, 'data row links to the exact endpoint')
assert.match(md, /命令行抓取 · 1/, 'the method and count stay next to the link')
assert.match(md, /<https:\/\/developer\.android\.com\/tools\/sdkmanager>/, 'a bare command falls back to its home page')

// --- a repository stays one row, with every file counted together -----------
assert.match(md, /\| acme\/demo \|/)
assert.match(md, /HTTP 抓取 · 3/)

// --- noise is filtered out: local files, uploads, skills, searches ---------
assert.doesNotMatch(md, /README\.md/, 'local files are not a source')
assert.doesNotMatch(md, /球囊专利\.pdf/, 'uploads are not a source')
assert.doesNotMatch(md, /mcp__filesystem__read/, 'mcp calls are not a source')
assert.doesNotMatch(md, /\| grep \|/, 'grep is not a tool entry')
assert.doesNotMatch(md, /中国 县域 坐标 数据/, 'search queries are leads, not sources')

// --- re-scan skips already scanned sessions ------------------------------
const second = await scan.handler({ agent: { session }, rawInput: '', signal })
assert.match(second.text, /新扫描 0 个会话，跳过 2 个已扫描/)

// --- force re-scans everything and rebuilds instead of double counting ----
const forced = await scan.handler({ agent: { session }, rawInput: 'force', signal })
assert.match(forced.text, /新扫描 2 个会话/)
const rebuilt = JSON.parse(await readFile(join(OUTPUT, 'catalog.json'), 'utf8'))
assert.equal(rebuilt.tools.read.count, 2, 'force rebuilds, no double counting')
assert.equal(rebuilt.sources['file:c:/work/demo/readme.md'].count, 3, 'source counts rebuilt')

const summary = await show.handler({ agent: { session } })
assert.equal(summary.kind, 'success')
assert.match(summary.text, /已扫描会话：2/)

console.log('catalog.test: two tables, dedupe, channels, and skip rules verified')
console.log(md.split('\n').slice(0, 26).join('\n'))
