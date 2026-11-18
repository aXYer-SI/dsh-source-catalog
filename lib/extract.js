/**
 * Turn one historical tool call into a catalog observation.
 *
 * A tool call always contributes a tool entry. Depending on the tool, its
 * arguments (and sometimes its result) also reveal a *data source* or
 * *information source* plus the concrete way it was obtained — the "channel".
 */

import { isAbsolute, normalize, resolve } from 'node:path'

/** Human labels for every source kind. */
export const KIND_LABEL = {
  file: '本地文件',
  web: '网络资源',
  search: '检索式',
  shell: '命令行',
  mcp: 'MCP 服务',
  session: '会话数据',
  skill: '技能知识库',
  upload: '上传附件',
  office: 'Office 文档',
  other: '其它',
}

const URL_PATTERN = /https?:\/\/[^\s"'`<>)\]]+/g

/**
 * High-value knowledge, split into the two classes the catalog exists for:
 *
 *   group 'tool' — 工具类：runtimes, SDKs, build/package managers, network
 *                  tools, source repositories, mirrors, CLI utilities.
 *   group 'data' — 信息数据类：geo/admin divisions, weather, address &
 *                  geocoding, patents & literature, datasets, other APIs.
 *
 * Each rule has two pattern lists:
 *   - `anywhere` — specific enough to match a URL, path or command text
 *     (project source files must never match: `src/main/java/...` is not a
 *     JDK source);
 *   - `toolName` — a whole-name match, applied only to a shell entry, so the
 *     tool actually being run qualifies the entry (and `curl` downloading a
 *     JDK does not).
 */
export const VALUE_GROUPS = {
  tool: '工具类',
  data: '信息数据类',
}

export const VALUE_RULES = [
  // ---------------------------------------------------------------- 工具类
  {
    // First on purpose: a gh-proxy URL also contains github.com, and the proxy
    // is what the reader needs to know about it.
    id: 'tool-proxy',
    group: 'tool',
    label: '访问代理',
    hint: '中转/加速服务；可用性会变，能从官方源拿到就别依赖它。',
    anywhere: [/gh-?proxy|ghproxy|r\.jina\.ai|panda985|mirror\.gh/i],
  },
  {
    id: 'tool-runtime',
    group: 'tool',
    label: '环境与运行时',
    hint: '语言运行时、SDK 与平台工具链，装一次长期复用。',
    anywhere: [
      /adoptium|temurin|corretto|openjdk|microsoft-jdk|-zulu|zulu-jdk/i,
      /[\\/]jdk[\\/-]|jdk-\d/i,
      /site-packages|[\\/]python[\\/]|[\\/]node[\\/]|nodejs\.org|node-v\d/i,
      /dotnet|golang|rustup|cargo|deno\.land/i,
      /dl\.google\.com\/android\/repository/i,
      /commandlinetools|build-tools_r\d|platform-\d{2,}-|platforms;android|platform-tools|ndk/i,
      /androidx\.|com\.android\.tools/i,
      /\.apk\b/i,
      /apk-?analysis|androguard|AndroidManifest|apktool/i,
    ],
    toolName: [/^(java|javac|javaw|jar|keytool|python|python3|pip|pip3|py|node|npm|npx|dotnet|go|cargo|rustc|deno|sdkmanager|avdmanager|adb|aapt|aapt2|zipalign|apksigner|apktool|dexdump)$/i],
  },
  {
    id: 'tool-build',
    group: 'tool',
    label: '构建与包分发',
    hint: '构建、依赖与分发源；版本与镜像地址决定能否离线复现。',
    anywhere: [
      /services\.gradle\.org|gradle-[\d.]+-(bin|all)\.zip|mirrors\.[\w.]+\/gradle/i,
      /repo1\.maven\.org|android\/maven2|maven-[\d.]+-bin/i,
      /registry\.npmjs|pypi\.org\/simple|pnpm|yarnpkg/i,
      /mirrors?\.(aliyun|tuna|huaweicloud|tencent|ustc|163|cloud)|mirrors\.cloud\.tencent/i,
      /unpkg\.com|jsdelivr\.net|npmmirror\.com/i,
    ],
    toolName: [/^(gradle|gradlew|mvn|maven|npm|pnpm|yarn|pip|pip3|conda|msbuild|make|cmake|ninja)$/i],
  },
  {
    id: 'tool-repo',
    group: 'tool',
    label: '源码仓库',
    hint: '可复用的开源实现与示例工程。',
    anywhere: [
      /github\.com|gitlab\.com|gitee\.com|raw\.githubusercontent|bitbucket\.org/i,
      /huggingface\.co|modelscope\.cn|cdn\.jsdelivr\.net\/gh/i,
    ],
    toolName: [/^git$/i],
  },
  {
    id: 'tool-cli',
    group: 'tool',
    label: '命令行工具',
    hint: '本地处理文件、媒体与压缩的通用命令，可换等价实现。',
    anywhere: [/curl\.se|gnu\.org\/software\/wget|httpie|postman/i],
    toolName: [/^(curl|wget|Invoke-WebRequest|Invoke-RestMethod|http|httpie|aria2c|7z|tar|unzip|ffmpeg|magick|convert|sox|pandoc|soffice|rg|jq|git)$/i],
  },

  // ---------------------------------------------------------- 信息数据类
  {
    id: 'data-geo',
    group: 'data',
    label: '地理与行政区划',
    hint: '省/市/县坐标、边界与地址编码；注意 WGS84 / GCJ02 差异。',
    anywhere: [
      /datav\.aliyun|geonames|geocoding-api|city-geo|GeoMapData|compliant-geodata|areacity/i,
      /areas_v3|bound\/\d{6}|[\\/]geo[\\/]|经纬|行政区|坐标|县域|县级|地址|逆地理/i,
      /geocod|nominatim|amap|高德|baidu.*map|百度地图/i,
    ],
  },
  {
    id: 'data-weather',
    group: 'data',
    label: '天气',
    hint: '实时/预报天气接口，多数免 key。',
    anywhere: [/open-meteo|weatherapi|qweather|heweather|caiyun|和风|气象|天气/i],
  },
  {
    id: 'data-patent',
    group: 'data',
    label: '专利与文献',
    hint: '公开号/全文/著录项来源；正式审查以官方原文为准。',
    anywhere: [
      /patents?\.google|espacenet|uspto|cnipa|专利|文献|arxiv|cnki|万方|incopat|patsnap|智慧芽/i,
    ],
  },
  {
    id: 'data-dataset',
    group: 'data',
    label: '数据集',
    hint: '可直接下载的结构化数据与语料。',
    anywhere: [/huggingface\.co\/datasets|kaggle|dataset|数据集|语料/i],
  },
  {
    id: 'data-api',
    group: 'data',
    label: '接口与端点',
    hint: '会话里实际调用的第三方或本地端点，含参数的照抄即可复现。',
    // Fallback: only claims sources that no more specific rule recognised, so
    // `api.adoptium.net/v3/...` stays a runtime download instead of an "API".
    fallback: true,
    anywhere: [
      /\/api\/v\d|\/v\d\/[a-z]|api\.[\w-]+\.(com|cn|org|io)\//i,
      /\?(?:.*&)?(?:name|q|query|city|id|key)=/i,
      /127\.0\.0\.1:\d+|localhost:\d+/i,
    ],
  },
]

/** Display order: tools first, then data. */
export const CATEGORY_ORDER = [
  'tool-runtime', 'tool-build', 'tool-cli', 'tool-repo', 'tool-proxy',
  'data-geo', 'data-weather', 'data-patent', 'data-dataset', 'data-api',
]

/** Tag ids from 0.2.0 and earlier, mapped to the category that replaced them. */
export const LEGACY_TAGS = {
  'tool-sdk': 'tool-runtime',
  'tool-apk': 'tool-runtime',
  'tool-net': 'tool-cli',
  'tool-mirror': 'tool-build',
  'data-address': 'data-geo',
}

/**
 * Cross-cutting labels a row can carry (many per row).
 * @param {{ name?: string }} source
 * @param {{ ownOwners?: readonly string[] }} [options]
 * @returns {string[]} label ids: `local`, `own`, `need-key`
 */
export function sourceLabels(source, options = {}) {
  const name = String(source?.name ?? '')
  const labels = []
  if (/^(https?:\/\/)?(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\])(:|\/|$)/i.test(name)) labels.push('local')
  for (const owner of options.ownOwners ?? []) {
    const word = String(owner ?? '').trim()
    if (word && new RegExp(`(^|/)${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`, 'i').test(name)) {
      labels.push('own')
      break
    }
  }
  if (/[?&](?:key|apikey|api_key|token|access_token)=/i.test(name)) labels.push('need-key')
  return labels
}

/** Binaries worth naming in a shell command instead of the raw first token. */
const KNOWN_BINARIES = [
  'node', 'npm', 'npx', 'pnpm', 'yarn', 'python', 'python3', 'pip', 'pip3',
  'java', 'javac', 'jar', 'gradle', 'gradlew', 'sdkmanager', 'adb', 'apktool',
  'aapt', 'aapt2', 'zipalign', 'apksigner', 'keytool', 'curl', 'wget', 'git',
  'pwsh', 'powershell', 'winget', 'choco', 'scoop', '7z', 'tar', 'unzip',
  'msbuild', 'dotnet', 'docker', 'ffmpeg', 'soffice',
]

/**
 * Tag one source with the high-value categories it belongs to.
 * @param {{ name: string, detail?: string, kind?: string }} source
 * @param {readonly string[]} [keywords] - user keywords that always qualify
 * @returns {string[]} category ids, plus `kw:<word>` for keyword hits
 */
export function valueTags(source, keywords = []) {
  const name = String(source?.name ?? '')
  const detail = String(source?.detail ?? '')
  const isShell = source?.kind === 'shell'
  const isFile = source?.kind === 'file'

  // Classification reads the source's own identity, never how it was accessed:
  // a `grep` pattern like "坐标|县域" must not turn its target file into geo
  // data, and a shell entry's `detail` is the whole command line.
  const targets = [name]
  const tags = []
  const matches = (rule) => {
    if (isFile && rule.group !== 'tool') return false
    const matchedText = (rule.anywhere ?? []).some((pattern) => targets.some((target) => pattern.test(target)))
    const matchedTool = isShell && (rule.toolName ?? []).some((pattern) => pattern.test(name))
    return matchedText || matchedTool
  }
  for (const rule of VALUE_RULES) {
    if (rule.fallback) continue
    if (matches(rule)) tags.push(rule.id)
  }
  // Fallback rules only apply when nothing more specific was recognised.
  if (tags.length === 0) {
    for (const rule of VALUE_RULES) {
      if (rule.fallback && matches(rule)) tags.push(rule.id)
    }
  }
  const lower = `${name}\n${detail}`.toLowerCase()
  for (const keyword of keywords) {
    const word = String(keyword ?? '').trim()
    if (word && lower.includes(word.toLowerCase())) tags.push(`kw:${word}`)
  }
  return [...new Set(tags)]
}

/** Label for one tag id. */
export function valueLabel(tag) {
  if (tag.startsWith('kw:')) return `关注词「${tag.slice(3)}」`
  return VALUE_RULES.find((rule) => rule.id === tag)?.label ?? tag
}

/** Group ('tool' | 'data') for one tag id. */
export function valueGroupOf(tag) {
  if (tag.startsWith('kw:')) return undefined
  return VALUE_RULES.find((rule) => rule.id === tag)?.group
}

/**
 * Pick the command actually being run.
 *
 * Only the head of a line is inspected: searching the whole line would match
 * a tool name inside a URL (`.../gradle-8.7-bin.zip` is a download, not a
 * gradle invocation). Lines that cannot be a command head — punctuation-only
 * or prose such as `--- java 写工作区 ---` — are skipped.
 */
function shellName(command) {
  const lines = String(command ?? '')
    .split(/[\r\n;]+/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !/^\$?[A-Za-z_][\w:]*\s*=/.test(line))

  for (const line of lines) {
    const text = line.replace(/^[&.]\s*/, '')
    const token = /^"([^"]+)"|^'([^']+)'|^(\S+)/.exec(text)
    const raw = token?.[1] ?? token?.[2] ?? token?.[3]
    if (!raw) continue
    // A command head is a path or bare name (PowerShell variables such as
    // `$sdk\...\sdkmanager.bat` included), never prose or punctuation.
    if (!/^[\w.$%\\/:-]+$/.test(raw)) continue
    if (/^-+$|^=+$|^-/.test(raw)) continue
    const base = raw.split(/[\\/]/).pop().replace(/\.(exe|bat|cmd|ps1|py|jar)$/i, '')
    if (base && /^[\w.-]+$/.test(base)) return base.toLowerCase()
  }
  return undefined
}

/** Normalize a path for identity: absolute, forward slashes, case-folded on Windows. */
export function canonicalPath(input, cwd) {
  let value = String(input ?? '').trim()
  if (!value) return undefined
  if (!isAbsolute(value)) {
    if (!cwd) return normalize(value).replace(/\\/g, '/')
    value = resolve(cwd, value)
  }
  const normalized = normalize(value).replace(/\\/g, '/')
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized
}

/** Normalize a URL for identity: stable scheme/host casing, no fragment, no trailing slash. */
export function canonicalUrl(input) {
  const value = String(input ?? '').trim()
  if (!value) return undefined
  try {
    const url = new URL(value)
    url.hash = ''
    let text = url.toString()
    if (text.endsWith('/') && !url.search) text = text.slice(0, -1)
    return text
  } catch {
    return value.replace(/#.*$/, '').replace(/\/$/, '')
  }
}

/** Collect every http(s) URL inside a text blob. */
export function urlsIn(text) {
  const found = new Set()
  const source = String(text ?? '')
  let match
  URL_PATTERN.lastIndex = 0
  while ((match = URL_PATTERN.exec(source)) !== null) {
    const url = canonicalUrl(match[0])
    if (url) found.add(url)
  }
  return [...found]
}

const pathOf = (args) => {
  const candidate = args?.file_path ?? args?.filePath ?? args?.path ?? args?.file ?? args?.target
  return typeof candidate === 'string' ? candidate : undefined
}

const listOf = (value) => {
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string')
  if (typeof value === 'string' && value.trim()) return [value]
  return []
}

/**
 * Classify one tool call.
 * @param {{ name: string, args: unknown, resultText?: string, cwd?: string }} call
 * @returns {{ tool: string, sources: Array<{ key: string, name: string, kind: string, method: string, detail?: string }> }}
 */
export function observeToolCall({ name, args, resultText = '', cwd }) {
  const tool = String(name ?? 'unknown')
  const sources = []
  const push = (source) => {
    if (source?.key) sources.push(source)
  }

  const fileSource = (rawPath, method, detail) => {
    const key = canonicalPath(rawPath, cwd)
    if (!key) return
    // Display with the platform separator so mixed "C:/..." and "C:\..." input
    // styles read consistently; identity still uses the canonical key.
    const display = process.platform === 'win32' ? String(rawPath).trim().replace(/\//g, '\\') : String(rawPath).trim()
    push({ key: `file:${key}`, name: display, kind: 'file', method, detail })
  }

  const urlSource = (url, method, detail) => {
    const key = canonicalUrl(url)
    if (!key) return
    push({ key: `web:${key}`, name: key, kind: 'web', method, detail })
  }

  const pathArg = pathOf(args)

  switch (tool) {
    case 'read':
      fileSource(pathArg, '读取文件', args?.offset || args?.limit ? `范围 ${args?.offset ?? 1}+${args?.limit ?? ''}` : undefined)
      break
    case 'write':
      fileSource(pathArg, '写入文件')
      break
    case 'edit':
      fileSource(pathArg, '编辑文件')
      break
    case 'apply_patch':
      for (const match of String(args?.patch ?? '').matchAll(/\*\*\* (?:Update|Add) File: (.+)/g)) {
        fileSource(match[1].trim(), '补丁修改')
      }
      break
    case 'glob':
      // The pattern is a detail of the retrieval, not a different acquisition
      // channel; keeping it out of `method` avoids one channel per pattern.
      fileSource(pathArg ?? cwd, '按名匹配', args?.pattern ? `pattern: ${args.pattern}` : undefined)
      break
    case 'grep':
      fileSource(pathArg ?? cwd, '内容检索', args?.pattern ? `pattern: ${args.pattern}` : undefined)
      break
    case 'bash':
    case 'pwsh': {
      const command = String(args?.command ?? args?.cmd ?? '')
      for (const url of urlsIn(command)) urlSource(url, '命令行抓取', command.length > 200 ? `${command.slice(0, 200)}…` : command)
      const binary = shellName(command)
      if (binary) {
        push({
          key: `shell:${binary.toLowerCase()}`,
          name: binary,
          kind: 'shell',
          method: '命令行执行',
          detail: command.length > 160 ? `${command.slice(0, 160)}…` : command,
        })
      }
      break
    }
    case 'web_fetch':
      urlSource(args?.url, 'HTTP 抓取')
      break
    case 'web_search': {
      for (const query of listOf(args?.queries ?? args?.query)) {
        const key = query.trim().toLowerCase()
        if (!key) continue
        push({ key: `search:${key}`, name: query.trim(), kind: 'search', method: '关键词检索' })
      }
      // URLs surfaced by the search results are information sources too.
      for (const url of urlsIn(resultText)) urlSource(url, '检索结果命中')
      break
    }
    case 'skill': {
      const skill = String(args?.name ?? '').trim()
      if (skill) {
        push({ key: `skill:${skill.toLowerCase()}`, name: skill, kind: 'skill', method: '加载技能' })
      }
      break
    }
    case 'session_info':
    case 'session_find':
    case 'session_search':
    case 'session_event_read':
    case 'session_event_search':
    case 'session_event_trace':
    case 'session_trace': {
      push({ key: 'session:local', name: '本地会话日志', kind: 'session', method: `会话检索（${tool}）` })
      break
    }
    case 'office_render':
    case 'office_convert':
    case 'office_recalculate': {
      fileSource(pathArg, 'Office 解析')
      break
    }
    case 'read_image':
      fileSource(pathArg, '读取图片')
      break
    case 'catalog_scan':
    case 'learning_trace':
      break
    default: {
      // Only MCP tools are treated as a source here: a URL merely mentioned in
      // a prompt (send_message / subagent) is not something DSH acquired.
      if (tool.startsWith('mcp__') || tool.includes('__')) {
        push({ key: `mcp:${tool}`, name: tool, kind: 'mcp', method: 'MCP 工具调用' })
      }
    }
  }

  return { tool, sources }
}

/**
 * Classify one uploaded attachment found in a user message.
 * @param {{ name: string, bytes?: number }} attachment
 */
export function observeUpload(attachment) {
  const name = String(attachment?.name ?? '').trim()
  if (!name) return undefined
  return {
    key: `upload:${name.toLowerCase()}`,
    name,
    kind: 'upload',
    method: '用户上传',
    detail: attachment?.bytes ? `${attachment.bytes} bytes` : undefined,
  }
}
