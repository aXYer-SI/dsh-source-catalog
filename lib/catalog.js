/**
 * Catalog storage and Markdown rendering.
 *
 * The catalog is deduplicated on two levels:
 *   - one entry per tool name;
 *   - one entry per data/information source, with a `channels` map keyed by the
 *     concrete acquisition method. Seeing the same source through a new method
 *     adds a channel instead of a duplicate source.
 */
import { CATEGORY_ORDER, LEGACY_TAGS, sourceLabels, valueGroupOf } from './extract.js'
import { repoOf } from './repo.js'
import { CATEGORY_TITLES, LABEL_TITLES, commandLink, knowledgeFor } from './knowledge.js'

export const CATALOG_VERSION = 1

/** Fresh empty catalog. */
export function emptyCatalog() {
  return {
    version: CATALOG_VERSION,
    updatedAt: 0,
    sessions: {},
    tools: {},
    sources: {},
  }
}

const now = () => Date.now()

/** Merge a possibly older catalog into the current shape. */
export function normalizeCatalog(raw) {
  if (!raw || typeof raw !== 'object') return emptyCatalog()
  const sources = raw.sources && typeof raw.sources === 'object' ? raw.sources : {}
  // 0.2.x stored five category ids that 0.3.0 merged; remap them in place so an
  // existing catalog.json keeps working without a forced rebuild.
  for (const source of Object.values(sources)) {
    if (!Array.isArray(source?.tags)) continue
    const mapped = source.tags.map((tag) => LEGACY_TAGS[tag] ?? tag)
    source.tags = [...new Set(mapped)]
    if (!Array.isArray(source.labels)) source.labels = []
  }
  return {
    version: CATALOG_VERSION,
    updatedAt: Number(raw.updatedAt) || 0,
    sessions: raw.sessions && typeof raw.sessions === 'object' ? raw.sessions : {},
    tools: raw.tools && typeof raw.tools === 'object' ? raw.tools : {},
    sources,
  }
}

/** Record one tool invocation. `at` is the event time, not the scan time. */
export function recordTool(catalog, sessionId, toolName, at = now()) {
  const name = String(toolName ?? '').trim()
  if (!name) return
  const existing = catalog.tools[name] ?? {
    name,
    count: 0,
    sessions: [],
    firstSeen: at,
    lastSeen: 0,
  }
  existing.count += 1
  if (!existing.sessions.includes(sessionId)) existing.sessions.push(sessionId)
  existing.firstSeen = Math.min(existing.firstSeen || at, at)
  existing.lastSeen = Math.max(existing.lastSeen || 0, at)
  catalog.tools[name] = existing
}

/** Record one source observation, adding a channel when the method is new. */
export function recordSource(catalog, sessionId, source, at = now()) {
  if (!source?.key) return
  const existing = catalog.sources[source.key] ?? {
    key: source.key,
    name: source.name,
    kind: source.kind ?? 'other',
    count: 0,
    sessions: [],
    firstSeen: at,
    lastSeen: 0,
    tags: [],
    channels: {},
  }
  existing.count += 1
  if (!existing.sessions.includes(sessionId)) existing.sessions.push(sessionId)
  existing.firstSeen = Math.min(existing.firstSeen || at, at)
  existing.lastSeen = Math.max(existing.lastSeen || 0, at)
  if (!existing.name || existing.name.length < source.name.length) existing.name = source.name

  // High-value tags accumulate: a source stays valuable once classified.
  if (Array.isArray(source.tags) && source.tags.length > 0) {
    if (!Array.isArray(existing.tags)) existing.tags = []
    for (const tag of source.tags) {
      if (!existing.tags.includes(tag)) existing.tags.push(tag)
    }
  }
  // Labels behave the same way: `local`, `own`, `need-key` are sticky.
  if (Array.isArray(source.labels) && source.labels.length > 0) {
    if (!Array.isArray(existing.labels)) existing.labels = []
    for (const label of source.labels) {
      if (!existing.labels.includes(label)) existing.labels.push(label)
    }
  }

  const method = source.method ?? '其它'
  const channel = existing.channels[method] ?? {
    method,
    count: 0,
    sessions: [],
    firstSeen: at,
    examples: [],
  }
  channel.count += 1
  if (!channel.sessions.includes(sessionId)) channel.sessions.push(sessionId)
  channel.firstSeen = Math.min(channel.firstSeen || at, at)
  if (source.detail && !channel.examples.includes(source.detail) && channel.examples.length < 3) {
    channel.examples.push(source.detail)
  }
  existing.channels[method] = channel
  catalog.sources[source.key] = existing
}

/** Mark one session as scanned. */
export function markSession(catalog, sessionId, meta = {}) {
  catalog.sessions[sessionId] = {
    scannedAt: now(),
    createdAt: Number(meta.createdAt) || 0,
    cwd: meta.cwd ?? '',
    events: Number(meta.events) || 0,
  }
}

/** Total number of distinct (source, method) pairs. */
export function channelCount(catalog) {
  return Object.values(catalog.sources).reduce((sum, source) => sum + Object.keys(source.channels ?? {}).length, 0)
}

const fmtDate = (ms) => {
  const value = Number(ms)
  if (!Number.isFinite(value) || value <= 0) return '—'
  const date = new Date(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const esc = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')

/** Merge the channel counts of several sources (one repository row) into one cell. */
const mergedChannelCell = (sources) => {
  const totals = new Map()
  for (const source of sources) {
    for (const channel of Object.values(source.channels ?? {})) {
      totals.set(channel.method, (totals.get(channel.method) ?? 0) + channel.count)
    }
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([method, count]) => `${method} · ${count}`)
    .join('<br>')
}

/**
 * Whether a tagged source was actually *acquired*, not merely mentioned.
 *
 * A URL that only ever appeared inside a search result was not used: it is a
 * lead, not knowledge, and the catalogue leaves it out.
 */
const isAcquired = (source) => {
  const channels = Object.values(source.channels ?? {})
  if (channels.some((channel) => channel.method !== '检索结果命中')) return true
  return (source.sessions?.length ?? 0) >= 2
}

/** True for loopback hosts, whose many paths are one local service. */
const isLocalHost = (host) => /^(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(host)

/**
 * Row label.
 *
 * A repository becomes `owner/repo`; a local service becomes its host and port;
 * anything else becomes its host plus the first meaningful path segment. File
 * names, numeric ids and `https:` fragments are dropped: they distinguish pages,
 * not sources, and would split one endpoint into dozens of rows.
 */
function displayName(source) {
  const raw = String(source?.name ?? '').split('?')[0]
  if (raw === '') return ''

  const bare = /^(?:[a-z]+:\/\/)?([^/\\]+)(\/.*)?$/i.exec(raw)
  if (!bare) return raw
  const host = bare[1]
  const rest = bare[2] ?? ''
  if (isLocalHost(host)) return host

  const segment = rest
    .split('/')
    .filter(Boolean)
    .find((part) => !/^https?:$/i.test(part)
      && !/^\d+$/.test(part)
      && !/^[0-9a-f-]{8,}$/i.test(part)
      && !/\.[a-z0-9]{2,}$/i.test(part))
  return segment ? `${host}/${segment}` : host
}

/**
 * Fold acquired sources into table rows: one row per repository (all its files
 * counted together) or one row per source. Rows are ordered by how many
 * sessions they served, then by how often they were touched.
 */
function buildRows(sources, group) {
  const rows = new Map()
  for (const source of sources) {
    const tags = (source.tags ?? []).filter((tag) => valueGroupOf(tag) === group)
    if (tags.length === 0) continue
    const repo = repoOf(source.name)
    // Rows are keyed by their label: dozens of URLs that boil down to one
    // endpoint are one piece of knowledge, not dozens.
    const name = repo ? (repo.owner ? `${repo.owner}/${repo.repo}` : repo.repo) : displayName(source)
    const key = repo ? `repo:${repo.key}` : `name:${name.toLowerCase()}`
    let row = rows.get(key)
    if (!row) {
      row = { key, tag: tags[0], name, sources: [], sessions: 0, count: 0 }
      rows.set(key, row)
    }
    row.sources.push(source)
    row.sessions = Math.max(row.sessions, source.sessions?.length ?? 0)
    row.count += source.count ?? 0
  }
  return [...rows.values()]
    .sort((a, b) => b.sessions - a.sessions || b.count - a.count || a.name.localeCompare(b.name))
}

/** A URL that opens one source, or an empty string when it has none. */
function sourceUrl(source) {
  const name = String(source.name ?? '').trim()
  if (/^https?:\/\//i.test(name)) return name
  const bare = /^([\w.-]+\.[a-z]{2,}|localhost|127\.\d+\.\d+\.\d+)(:\d+)?(\/.*)?$/i.exec(name.split('?')[0])
  if (!bare) return ''
  const scheme = isLocalHost(bare[1]) ? 'http' : 'https'
  return `${scheme}://${name}`
}

/** The page that opens one repository, or an empty string. */
function repoUrl(repo) {
  if (!repo) return ''
  if (repo.provider === 'npm') return `https://www.npmjs.com/package/${repo.repo}`
  const owner = repo.owner ? `${repo.owner}/` : ''
  return `https://${repo.host ?? repo.provider}/${owner}${repo.repo}`
}

/**
 * A link a reader can open without asking a model: the repository page, the
 * source URL, or the first URL recorded inside an example command.
 */
function linkFor(row) {
  for (const source of row.sources) {
    const url = repoUrl(repoOf(source.name))
    if (url) return url
  }
  for (const source of row.sources) {
    const url = sourceUrl(source)
    if (url) return url
  }
  // A plain command such as `java` or `git` still has a home page.
  for (const source of row.sources) {
    const url = commandLink(source.name)
    if (url) return url
  }
  for (const source of row.sources) {
    for (const channel of Object.values(source.channels ?? {})) {
      for (const example of channel.examples ?? []) {
        const match = String(example).match(/https?:\/\/[^\s"'`<>)\]]+/)
        if (match) return match[0]
      }
    }
  }
  return ''
}

/**
 * The acquisition column: the concrete link first, then how it was obtained.
 *
 * Someone reading the catalogue offline should be able to open the URL and find
 * the tool or the data by themselves; the method and count come second.
 */
function sourceCell(row) {
  const url = linkFor(row)
  const lines = []
  if (url) {
    const shown = url.length > 160 ? `${url.slice(0, 160)}…` : url
    lines.push(`<${shown}>`)
  } else {
    lines.push('（命令行工具，无固定网址 / no fixed URL）')
  }
  const methods = mergedChannelCell(row.sources)
  if (methods) lines.push(methods)
  if (row.sources.length > 1) lines.push(`（含 ${row.sources.length} 个来源 / ${row.sources.length} entries）`)
  return lines.join('<br>') || '—'
}

/** The bilingual introduction cell: what it is, then pros and cons. */
function introCell(row) {
  const knowledge = knowledgeFor({ name: row.name }, row.tag)
  if (!knowledge) return ''
  const block = (data, label) => `**${label}** ${esc(data.what)}<br>✅ ${esc(data.pros)}<br>⚠️ ${esc(data.cons)}`
  return `${block(knowledge.zh, '中文')}<br><br>${block(knowledge.en, 'English')}`
}

/** Maximum rows listed per category; `catalog.json` keeps everything else. */
const CATEGORY_CAP = 8

/** Order rows by category (display order), then by session coverage. */
function orderRows(rows) {
  const order = new Map(CATEGORY_ORDER.map((id, index) => [id, index]))
  return [...rows].sort((a, b) => {
    const left = order.get(a.tag) ?? CATEGORY_ORDER.length
    const right = order.get(b.tag) ?? CATEGORY_ORDER.length
    return left - right || b.sessions - a.sessions || b.count - a.count
  })
}

/** Keep at most CATEGORY_CAP rows per category, so no category crowds the rest out. */
function capPerCategory(rows) {
  const used = new Map()
  const kept = []
  for (const row of rows) {
    const count = used.get(row.tag) ?? 0
    if (count >= CATEGORY_CAP) continue
    used.set(row.tag, count + 1)
    kept.push(row)
  }
  return kept
}

/** Labels of one row: what was stored at scan time plus what the names imply now. */
function labelsOf(row, options) {
  const labels = new Set()
  for (const source of row.sources) {
    for (const label of source.labels ?? []) labels.add(label)
    for (const label of sourceLabels(source, { ownOwners: options.ownOwners })) labels.add(label)
  }
  return [...labels]
}

/** The category cell: the bilingual category, then the labels a row carries. */
function categoryCell(row, options) {
  const title = CATEGORY_TITLES[row.tag]
  const head = title ? `${title.zh}<br>${title.en}` : esc(row.tag)
  const labels = labelsOf(row, options)
    .map((label) => LABEL_TITLES[label])
    .filter(Boolean)
  if (labels.length === 0) return head
  return `${head}<br>🏷 ${labels.map((label) => `${label.zh} ${label.en}`).join(' · ')}`
}

/** Render the whole catalogue as two bilingual tables. */
export function renderCatalog(catalog, options = {}) {
  const sources = Object.values(catalog.sources)
  // Only things actually fetched from the outside belong in a tools-and-data
  // catalogue: local files, uploads, search queries and skills are context,
  // not reusable knowledge, so they never reach the two tables.
  const isExternal = (source) => source.kind === 'web' || source.kind === 'shell'
  // An npm scope (`@deepseek-ai/...`) and a search-engine result page are not
  // reusable sources, even though they look like URLs.
  const isNoise = (source) => {
    const name = String(source.name ?? '').split('?')[0]
    return /^@/.test(name) || /\/(search|results?)$/i.test(name)
  }
  const tagged = sources.filter((source) => isExternal(source)
    && !isNoise(source)
    && Array.isArray(source.tags)
    && source.tags.length > 0)
  const acquired = tagged.filter(isAcquired)

  // One row appears once: a repository that also serves as geo data is listed
  // under tools, and the data table skips it.
  const isListable = (row) => !row.name.startsWith('@') && !/search$/i.test(row.name)
  const toolRows = buildRows(acquired, 'tool').filter(isListable)
  const taken = new Set(toolRows.map((row) => row.key))
  const dataRows = buildRows(acquired, 'data').filter((row) => isListable(row) && !taken.has(row.key))
  const sessionCount = Object.keys(catalog.sessions).length
  const channels = channelCount(catalog)
  const categoriesUsed = new Set([...toolRows, ...dataRows].map((row) => row.tag)).size
  const capped = [...toolRows, ...dataRows].length > capPerCategory(orderRows([...toolRows, ...dataRows])).length

  const lines = []
  lines.push('# DSH 工具与数据源清单 / DSH tools and sources')
  lines.push('')
  lines.push('> 只保留**真正获取过、且跨会话可复用**的条目：工具类与信息数据类各一张表，每行归入一个类别。')
  lines.push('> 每条介绍分中英两段，`✅` 是优点、`⚠️` 是缺点；同一来源换了获取方式不会新增行，只在「获取来源」里追加。')
  lines.push('> 🏷 标签是跨类的属性：`本地` 本机服务 · `自有` 你自己的仓库 · `需 Key` 调用要密钥。')
  lines.push('')
  lines.push(`> 生成时间 Generated：${fmtDate(catalog.updatedAt || now())}　·　已扫描会话 Sessions：${sessionCount}`
    + `　·　工具 Tools：${toolRows.length}　·　数据信息 Data：${dataRows.length}　·　类别 Categories：${categoriesUsed}`
    + `　·　获取渠道 Channels：${channels}　·　已过滤 Filtered out：${sources.length - acquired.length}`)
  lines.push('')

  const table = (heading, nameHeader, introHeader, sourceHeader, rows) => {
    const shown = capPerCategory(orderRows(rows))
    lines.push(`## ${heading}`)
    lines.push('')
    lines.push(`| ${nameHeader} | 类别<br>Category | ${introHeader} | ${sourceHeader} |`)
    lines.push('|---|---|---|---|')
    if (shown.length === 0) {
      lines.push('| — | — | _这一类暂无条目。_ | — |')
      lines.push('')
      return
    }
    for (const row of shown) {
      lines.push(`| ${esc(row.name)} | ${categoryCell(row, options)} | ${introCell(row)} | ${sourceCell(row)} |`)
    }
    lines.push('')
  }

  table('一、工具 / Tools', '工具名称<br>Tool', '工具介绍<br>Introduction', '获取渠道<br>Channel', toolRows)
  table('二、数据信息 / Data', '名称<br>Name', '介绍<br>Introduction', '获取来源<br>Source', dataRows)

  if (capped) {
    lines.push(`> 每个类别最多列出 ${CATEGORY_CAP} 条，按会话覆盖度取前 ${CATEGORY_CAP}；完整数据见 \`catalog.json\`。`)
    lines.push('')
  }
  lines.push('---')
  lines.push('')
  lines.push('_由 `dsh-source-catalog` 生成 · 用 `/catalog-scan` 更新、`/catalog-scan force` 重建。_')
  lines.push('')
  return lines.join('\n')
}
