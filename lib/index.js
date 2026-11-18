/**
 * dsh-source-catalog — scan historical DSH sessions and build a deduplicated
 * inventory of the tools they called and the data / information sources they
 * touched, including how each source was obtained.
 *
 * Run `/catalog-scan` to update. Sessions already scanned are skipped; a source
 * seen through a new acquisition method gains a channel instead of a duplicate
 * entry.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import {
  channelCount,
  emptyCatalog,
  markSession,
  normalizeCatalog,
  recordSource,
  recordTool,
  renderCatalog,
} from './catalog.js'
import { observeToolCall, observeUpload, sourceLabels, valueTags } from './extract.js'

export const name = 'source-catalog'

const DEFAULT_OPTIONS = {
  /** Absolute output directory; empty means `<session cwd>/dsh-catalog`. */
  outputDir: '',
  /**
   * Extra topics that should always be promoted to the 高价值信息 section,
   * e.g. ["阿里", "县域", "APK 环境"]. Matched case-insensitively against a
   * source's name and captured detail.
   */
  valueKeywords: [],
  /**
   * Repository owners that count as yours, e.g. ["aXYer-SI"]. Matching sources
   * get the `own` label so your own projects stand apart from third-party ones.
   */
  ownOwners: [],
}

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {Record<string, unknown>} [config]
 */
export function apply(ctx, config = {}) {
  const options = { ...DEFAULT_OPTIONS, ...(config ?? {}) }
  let running = false

  const warn = (message, error) => {
    try {
      console.warn(`[source-catalog] ${message}`, error ?? '')
    } catch { /* logging must never break the hook */ }
  }

  const sessionOf = (agent) => {
    if (!agent) return undefined
    if (agent.session?.header) return agent.session
    const id = agent.sessionId ?? agent.id
    if (!id) return undefined
    return ctx.get('sessions')?.get?.(id)
  }

  const outputDirFor = (session) => {
    if (options.outputDir) return resolve(String(options.outputDir))
    return join(session?.header?.cwd || process.cwd(), 'dsh-catalog')
  }

  const paths = (dir) => ({ dir, md: join(dir, 'catalog.md'), json: join(dir, 'catalog.json') })

  const loadCatalog = async (dir) => {
    try {
      const raw = await readFile(paths(dir).json, 'utf8')
      return normalizeCatalog(JSON.parse(raw))
    } catch (error) {
      if (error?.code !== 'ENOENT') warn('catalog.json 读取失败，将重建', error)
      return emptyCatalog()
    }
  }

  const saveCatalog = async (dir, catalog) => {
    await mkdir(dir, { recursive: true })
    await writeFile(paths(dir).json, JSON.stringify(catalog, null, 2), 'utf8')
    await writeFile(paths(dir).md, renderCatalog(catalog, { ownOwners: options.ownOwners }), 'utf8')
  }

  /**
   * Attach high-value tags before the source enters the catalog.
   *
   * A shell entry is the tool being run, so only its own name may qualify it —
   * otherwise every download done with `curl` would be filed under "JDK" just
   * because the URL mentions one.
   */
  const withTags = (source) => ({
    ...source,
    tags: valueTags(source, options.valueKeywords),
    labels: sourceLabels(source, { ownOwners: options.ownOwners }),
  })

  /** Index one session's raw event log into the catalog. */
  const indexSession = (catalog, sessionId, events, header) => {
    const cwd = header?.cwd
    const resultText = new Map()
    for (const event of events) {
      if (event?.type !== 'tool/result') continue
      const callId = event.data?.message?.toolCallId
      if (!callId) continue
      const text = (event.data?.message?.content ?? [])
        .filter((block) => block?.type === 'text')
        .map((block) => block.text)
        .join('\n')
      resultText.set(String(callId), text)
    }

    for (const event of events) {
      try {
        if (event?.type === 'user/message') {
          for (const block of event.data?.content ?? []) {
            if (block?.type === 'file' && block.attachment) {
              const source = observeUpload(block.attachment)
              if (source) recordSource(catalog, sessionId, withTags(source), Number(event.time) || Date.now())
            }
          }
          continue
        }
        if (event?.type !== 'tool/call') continue
        const toolName = event.data?.name
        let args = {}
        try {
          args = JSON.parse(String(event.data?.arguments ?? '{}'))
        } catch {
          args = {}
        }
        const at = Number(event.time) || Date.now()
        const { sources } = observeToolCall({
          name: toolName,
          args,
          resultText: resultText.get(String(event.data?.callId)) ?? '',
          cwd,
        })
        recordTool(catalog, sessionId, toolName, at)
        for (const source of sources) recordSource(catalog, sessionId, withTags(source), at)
      } catch (error) {
        warn('单条事件解析失败，已跳过', error)
      }
    }

    markSession(catalog, sessionId, {
      createdAt: header?.createdAt,
      cwd,
      events: events.length,
    })
  }

  /** Scan every not-yet-scanned session. */
  const scan = async ({ agent, signal, force = false, limit = 0 }) => {
    if (running) throw new Error('已有扫描在进行中，请稍候')
    const session = sessionOf(agent)
    const dir = outputDirFor(session)
    const query = ctx.get('sessionQuery')
    if (!query?.listSessions) throw new Error('会话查询服务不可用（sessionQuery）')

    running = true
    const startedAt = Date.now()
    try {
      // `force` means "rebuild from history": merging into the old catalog
      // would double-count every already-indexed call.
      const catalog = force ? emptyCatalog() : await loadCatalog(dir)
      const records = await query.listSessions(signal)
      records.sort((a, b) => Number(a.header?.createdAt ?? 0) - Number(b.header?.createdAt ?? 0))

      let scanned = 0
      let skipped = 0
      let failed = 0
      const failures = []
      for (const record of records) {
        if (signal?.aborted) break
        if (limit > 0 && scanned >= limit) break
        const id = String(record.header?.id ?? '')
        if (!id) continue
        if (!force && catalog.sessions[id]) {
          skipped += 1
          continue
        }
        try {
          const snapshot = await query.readSession(id)
          indexSession(catalog, id, snapshot?.events ?? [], snapshot?.session ?? record.header)
          scanned += 1
        } catch (error) {
          failed += 1
          failures.push(`${id}: ${error?.message ?? error}`)
        }
      }

      catalog.updatedAt = Date.now()
      await saveCatalog(dir, catalog)

      return {
        scanned,
        skipped,
        failed,
        failures,
        totalSessions: records.length,
        tools: Object.keys(catalog.tools).length,
        sources: Object.keys(catalog.sources).length,
        channels: channelCount(catalog),
        elapsedMs: Date.now() - startedAt,
        dir,
        md: paths(dir).md,
        json: paths(dir).json,
      }
    } finally {
      running = false
    }
  }

  const summarize = (result) => [
    `扫描完成：新扫描 ${result.scanned} 个会话，跳过 ${result.skipped} 个已扫描，失败 ${result.failed} 个。`,
    `累计：工具 ${result.tools} 种 · 数据源/信息源 ${result.sources} 个 · 获取渠道 ${result.channels} 条。`,
    `用时 ${(result.elapsedMs / 1000).toFixed(1)}s。`,
    `输出：${result.md}`,
  ].join('\n')

  const parseArgs = (rawInput) => {
    const text = String(rawInput ?? '').trim()
    const force = /\b(force|--force|全部重扫)\b/i.test(text)
    const limitMatch = /\blimit\s*[= ]\s*(\d+)/i.exec(text)
    return { force, limit: limitMatch ? Number(limitMatch[1]) : 0 }
  }

  // ---------------------------------------------------------------- command
  const disposers = []
  const register = (start) => {
    try {
      const dispose = start()
      if (typeof dispose === 'function') disposers.push(dispose)
    } catch (error) {
      warn('注册失败', error)
    }
  }

  const commands = ctx.get('commands')
  if (commands?.register) {
    register(() => commands.register({
      name: 'catalog-scan',
      description: '扫描历史会话，整理工具/数据源/信息源清单（已扫描的会话自动跳过）',
      input: { hint: '[force] [limit N]' },
      handler: async ({ agent, rawInput, signal }) => {
        try {
          const { force, limit } = parseArgs(rawInput)
          const result = await scan({ agent, signal, force, limit })
          return { kind: 'success', text: summarize(result) }
        } catch (error) {
          return { kind: 'error', text: `扫描失败：${error?.message ?? error}` }
        }
      },
    }))
    register(() => commands.register({
      name: 'catalog-show',
      description: '查看已建立的历史会话工具/数据源清单摘要',
      handler: async ({ agent }) => {
        try {
          const dir = outputDirFor(sessionOf(agent))
          const catalog = await loadCatalog(dir)
          const toolCount = Object.keys(catalog.tools).length
          const sourceCount = Object.keys(catalog.sources).length
          const sessions = Object.keys(catalog.sessions).length
          if (sessions === 0) return { kind: 'success', text: '尚未扫描任何会话。运行 /catalog-scan 开始。' }
          const top = Object.values(catalog.tools)
            .sort((a, b) => b.count - a.count)
            .slice(0, 8)
            .map((tool) => `${tool.name}(${tool.count})`)
            .join('、')
          return {
            kind: 'success',
            text: [
              `已扫描会话：${sessions}`,
              `工具：${toolCount} 种　数据源/信息源：${sourceCount} 个　渠道：${channelCount(catalog)} 条`,
              `最常用工具：${top || '—'}`,
              `清单文件：${paths(dir).md}`,
            ].join('\n'),
          }
        } catch (error) {
          return { kind: 'error', text: `读取失败：${error?.message ?? error}` }
        }
      },
    }))
  }

  // ------------------------------------------------------------------ tool
  const tools = ctx.get('tools')
  if (tools?.register) {
    register(() => tools.register({
      name: 'catalog_scan',
      description: '扫描 DSH 历史会话，整理其中调用的工具与获取的数据源/信息源（已扫描会话自动跳过）。',
      parameters: {
        type: 'object',
        properties: {
          force: { type: 'boolean', description: '为 true 时重新扫描已扫描过的会话' },
          limit: { type: 'number', description: '本次最多扫描多少个会话' },
        },
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            scanned: { type: 'number' },
            skipped: { type: 'number' },
            failed: { type: 'number' },
            tools: { type: 'number' },
            sources: { type: 'number' },
            channels: { type: 'number' },
            path: { type: 'string' },
          },
          additionalProperties: true,
        },
        render(_args, value) {
          const data = value ?? {}
          return [{
            type: 'text',
            text: `扫描完成：新扫描 ${data.scanned ?? 0} 个会话，跳过 ${data.skipped ?? 0} 个，失败 ${data.failed ?? 0} 个。\n`
              + `累计工具 ${data.tools ?? 0} 种 · 数据源/信息源 ${data.sources ?? 0} 个 · 渠道 ${data.channels ?? 0} 条。\n`
              + `清单：${data.path ?? ''}`,
          }]
        },
      },
      async execute(args, exec) {
        const result = await scan({
          agent: exec.agent,
          signal: exec.signal,
          force: Boolean(args?.force),
          limit: Number(args?.limit) || 0,
        })
        return {
          scanned: result.scanned,
          skipped: result.skipped,
          failed: result.failed,
          tools: result.tools,
          sources: result.sources,
          channels: result.channels,
          path: result.md,
        }
      },
    }))
  }

  ctx.effect(() => () => {
    for (const dispose of disposers) {
      try { dispose() } catch { /* already gone */ }
    }
  }, 'source-catalog: command and tool')
}
