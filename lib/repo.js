/**
 * Repository aggregation and human explanations for catalogued entries.
 *
 * Two jobs:
 *   1. Recognise that many URLs belong to one source repository, so the
 *      catalog lists `owner/repo` once instead of dozens of raw file links.
 *   2. Say what a file or repository *is* and what it is good for, so the
 *      inventory reads as knowledge rather than a link dump.
 */

/** Hosts whose first two path segments identify a repository. */
const REPO_HOSTS = new Set(['github.com', 'gitee.com', 'gitlab.com', 'bitbucket.org'])

const PROVIDER = {
  'github.com': 'GitHub',
  'gitee.com': 'Gitee',
  'gitlab.com': 'GitLab',
  'bitbucket.org': 'Bitbucket',
  'huggingface.co': 'HuggingFace',
  'modelscope.cn': 'ModelScope',
}

/**
 * Resolve the repository a URL belongs to.
 * @param {string} url
 * @returns {{ key: string, label: string, provider: string, owner: string, repo: string, path?: string, mirror?: string } | undefined}
 */
export function repoOf(url) {
  let parsed
  try {
    parsed = new URL(String(url))
  } catch {
    return undefined
  }
  const host = parsed.hostname.toLowerCase()
  const segments = parsed.pathname.split('/').filter(Boolean)
  if (segments.length === 0) return undefined

  const build = (repoHost, owner, rawRepo, path, mirror) => {
    // jsDelivr embeds the ref in the repo segment (`repo@v1.2.3`).
    const repo = String(rawRepo ?? '').split('@')[0].replace(/\.git$/i, '')
    if (!owner || !repo) return undefined
    const provider = PROVIDER[repoHost] ?? repoHost
    return {
      // Host-independent identity: the same project mirrored on GitHub and
      // Gitee is one piece of knowledge.
      key: `repo:${owner}/${repo}`.toLowerCase(),
      label: `${provider} · ${owner}/${repo}`,
      provider,
      // The real host, so a row can offer a URL a reader can open.
      host: repoHost,
      owner,
      repo,
      path: path || undefined,
      mirror,
    }
  }

  // Raw content hosts: `owner/repo/<ref>/<path>` — the ref is not part of the path.
  if (host === 'raw.githubusercontent.com') {
    return build('github.com', segments[0], segments[1], segments.slice(3).join('/'))
  }
  if (host === 'api.github.com' && segments[0] === 'repos') {
    return build('github.com', segments[1], segments[2], cleanApiPath(segments.slice(3)), 'api')
  }
  if (host === 'cdn.jsdelivr.net' && segments[0] === 'gh') {
    const rest = segments.slice(3)
    const path = rest[0]?.startsWith('@') ? rest.slice(1) : rest
    return build('github.com', segments[1], segments[2], path.join('/'), 'jsDelivr')
  }
  if (host === 'cdn.jsdelivr.net' && segments[0] === 'npm') {
    const pkg = segments[1]
    return pkg
      ? { key: `npm:${pkg}`.toLowerCase(), label: `npm · ${pkg}`, provider: 'npm', owner: '', repo: pkg, path: segments.slice(2).join('/'), mirror: 'jsDelivr' }
      : undefined
  }
  if (host === 'unpkg.com' && segments[0]) {
    const pkg = segments[0]
    return { key: `npm:${pkg}`.toLowerCase(), label: `npm · ${pkg}`, provider: 'npm', owner: '', repo: pkg, path: segments.slice(1).join('/') }
  }
  if (host === 'huggingface.co' || host === 'modelscope.cn') {
    // /<owner>/<name>/resolve/<ref>/... or /models/<owner>/<name>/...
    const offset = segments[0] === 'models' || segments[0] === 'datasets' ? 1 : 0
    const owner = segments[offset]
    const repo = segments[offset + 1]
    const rest = segments.slice(offset + 2)
    const resolveAt = rest.indexOf('resolve')
    const path = resolveAt >= 0 ? rest.slice(resolveAt + 2).join('/') : rest.join('/')
    return build(host, owner, repo, path)
  }
  if (REPO_HOSTS.has(host)) {
    // `/owner/repo/blob/<ref>/<path>` and `/owner/repo/tree/<ref>`: drop the
    // view segment and the ref so the file list shows real paths.
    if (segments[2] === 'blob' || segments[2] === 'tree') {
      const rest = segments.slice(3)
      const path = rest.length > 1 ? rest.slice(1) : []
      return build(host, segments[0], segments[1], path.join('/'))
    }
    return build(host, segments[0], segments[1], segments.slice(2).join('/'))
  }
  return undefined
}

/** Drop GitHub API noise (`contents`, `git/trees`, query-ish segments). */
function cleanApiPath(segments) {
  const cleaned = segments.filter((segment) => !['contents', 'git', 'trees', 'raw'].includes(segment))
  return cleaned.join('/')
}

/** Role of a well-known file name. */
const NAME_ROLE = {
  'readme.md': '项目说明：安装方式、用法、注意事项',
  'readme': '项目说明：安装方式、用法、注意事项',
  'package.json': 'Node 依赖与脚本清单',
  'pnpm-lock.yaml': '依赖锁定文件（可复现安装）',
  'package-lock.json': '依赖锁定文件（可复现安装）',
  'build.gradle': 'Gradle 构建配置（依赖、打包参数）',
  'settings.gradle': 'Gradle 多模块配置',
  'gradle.properties': 'Gradle 参数（内存/代理/签名）',
  'androidmanifest.xml': 'Android 应用清单（权限、组件、SDK 版本）',
  'skill.md': '技能定义：触发条件与工作纪律',
  'license': '开源许可证',
  'makefile': '构建入口',
  'dockerfile': '容器构建脚本',
  'go.mod': 'Go 模块依赖',
  'requirements.txt': 'Python 依赖清单',
  'pyproject.toml': 'Python 项目配置与依赖',
}

/** Role by file extension. */
const EXT_ROLE = {
  '.md': 'Markdown 文档',
  '.txt': '纯文本笔记',
  '.json': 'JSON 数据 / 配置',
  '.jsonl': '逐行 JSON 数据',
  '.csv': '表格数据',
  '.xml': 'XML 配置',
  '.yml': 'YAML 配置',
  '.yaml': 'YAML 配置',
  '.toml': 'TOML 配置',
  '.gradle': 'Gradle 构建脚本',
  '.properties': '键值参数配置',
  '.go': 'Go 源码',
  '.js': 'JavaScript 源码',
  '.mjs': 'JavaScript 模块源码',
  '.cjs': 'CommonJS 源码',
  '.ts': 'TypeScript 源码',
  '.tsx': 'React/TS 组件源码',
  '.jsx': 'React 组件源码',
  '.py': 'Python 源码',
  '.java': 'Java 源码',
  '.kt': 'Kotlin 源码',
  '.rs': 'Rust 源码',
  '.c': 'C 源码',
  '.h': 'C 头文件',
  '.cpp': 'C++ 源码',
  '.cs': 'C# 源码',
  '.sh': 'Shell 脚本',
  '.ps1': 'PowerShell 脚本',
  '.bat': '批处理脚本',
  '.cmd': '批处理脚本',
  '.html': '网页',
  '.css': '样式表',
  '.svg': '矢量图标',
  '.png': '图片（截图/图标）',
  '.jpg': '图片',
  '.jpeg': '图片',
  '.webp': '图片',
  '.pdf': 'PDF 文档',
  '.docx': 'Word 文档',
  '.xlsx': 'Excel 表格',
  '.pptx': '演示文稿',
  '.apk': 'Android 安装包',
  '.zip': '压缩包（分发包）',
  '.jar': 'Java 归档（库/可执行）',
  '.so': '原生动态库',
  '.dex': 'Android 字节码',
  '.log': '运行日志',
  '.db': '数据库文件',
  '.sqlite': '数据库文件',
}

/** Last path segment, URL-safe. */
function leafOf(name) {
  const text = String(name ?? '').split('?')[0].replace(/\/+$/, '')
  const parts = text.split(/[\\/]/)
  return parts[parts.length - 1] ?? ''
}

/** Well-known hosts: what this service is and what it is good for. */
const HOST_ROLE = {
  'patents.google.com': 'Google Patents 专利页：摘要、权利要求、引用与 PDF',
  'eureka.patsnap.com': '智慧芽 Eureka 专利页：同族、法律状态',
  'worldwide.espacenet.com': 'EPO Espacenet 专利检索：全球同族',
  'www.cnipa.gov.cn': 'CNIPA 官方站：公布公告与事务查询',
  'cpquery.cponline.cnipa.gov.cn': 'CNIPA 中国专利查询系统',
  'pss-system.cponline.cnipa.gov.cn': 'CNIPA 专利检索及分析系统',
  'patentscope.wipo.int': 'WIPO Patentscope：PCT 国际申请',
  'ppubs.uspto.gov': 'USPTO 美国专利检索',
  'api.open-meteo.com': 'Open-Meteo 天气接口：实时/预报（免 key）',
  'geocoding-api.open-meteo.com': 'Open-Meteo 地理编码接口：地名 ↔ 经纬度（免 key）',
  'archive-api.open-meteo.com': 'Open-Meteo 历史气象接口',
  'restapi.amap.com': '高德开放平台接口：行政区/地理编码/路径',
  'api.map.baidu.com': '百度地图开放接口',
  'geo.datav.aliyun.com': '阿里 DataV 行政区划与边界数据（GeoJSON）',
  'www.nmc.cn': '中央气象台：官方天气预报',
  'dl.google.com': 'Google 官方下载：Android SDK / 构建工具',
  'services.gradle.org': 'Gradle 官方分发包与说明',
  'repo1.maven.org': 'Maven 中央仓库',
  'registry.npmjs.org': 'npm 官方仓库',
  'pypi.org': 'PyPI 官方包索引',
  'api.github.com': 'GitHub API：仓库/目录/文件元数据',
  'raw.githubusercontent.com': 'GitHub 原始文件直链',
  'huggingface.co': 'HuggingFace 模型/数据集托管',
  'modelscope.cn': 'ModelScope 模型/数据集托管',
  'cdn.jsdelivr.net': 'jsDelivr CDN：npm/GitHub 资源加速',
  'unpkg.com': 'unpkg CDN：npm 包文件直链',
}

/** Match a hostname against HOST_ROLE, allowing subdomains. */
function hostRole(hostname) {
  const host = String(hostname ?? '').toLowerCase()
  if (!host) return ''
  if (HOST_ROLE[host]) return HOST_ROLE[host]
  for (const [key, role] of Object.entries(HOST_ROLE)) {
    if (host.endsWith(`.${key}`)) return role
  }
  if (/^(127\.0\.0\.1|localhost|\[::1\])$/.test(host)) return '本地服务接口（本机进程提供的 HTTP 端点）'
  return ''
}

/**
 * Explain what one catalogued entry is and what it is good for.
 * @param {{ name: string, kind?: string, detail?: string }} source
 * @returns {string}
 */
export function describeEntry(source) {
  const name = String(source?.name ?? '')
  const kind = source?.kind ?? 'other'
  const repo = repoOf(name)

  if (repo) {
    const leaf = repo.path ? leafOf(repo.path) : ''
    const fileRole = leaf ? roleOfFile(leaf) : ''
    const suffix = repo.mirror === 'jsDelivr' ? '（经 jsDelivr 加速）' : repo.mirror === 'api' ? '（GitHub API 读取）' : ''
    const target = fileRole ? `文件「${leaf}」：${fileRole}` : '仓库主页 / 目录'
    return `${repo.provider} 仓库 ${repo.owner}/${repo.repo} 的${target}${suffix}`
  }

  if (kind === 'search') return '检索关键词，用于在搜索引擎/库内复现同一批结果'
  if (kind === 'skill') return '技能知识库：踩坑经验与作业规范'
  if (kind === 'mcp') return 'MCP 服务工具：外部能力接入点'
  if (kind === 'session') return '本地会话日志：历史任务的原文依据'
  if (kind === 'upload') return '你上传的原始材料'
  if (kind === 'shell') return `命令行工具 \`${name}\`：本地执行命令的入口`
  if (kind === 'office') return 'Office / PDF 文档：可直接解析取文本'

  if (kind === 'web') {
    let service = ''
    try {
      service = hostRole(new URL(name).hostname)
    } catch {
      service = ''
    }
    const leaf = leafOf(name)
    const role = leaf ? roleOfFile(leaf) : ''
    if (service && role) return `${service}；本次取的文件：${role}`
    if (service) return service
    if (role) return `远程文件：${role}`
    if (/mirrors?\./i.test(name)) return '镜像站资源：官方源下载慢或不通时的替代'
    if (/\/$|^https?:\/\/[^/]+$/i.test(name)) return '网站首页 / 接口根地址'
    return '网络资源'
  }

  if (kind === 'file') {
    return roleOfFile(leafOf(name)) || '本地文件'
  }
  return '其它'
}

/** Role of one file name (by special name first, then extension). */
export function roleOfFile(fileName) {
  const lower = String(fileName ?? '').toLowerCase()
  if (!lower) return ''
  if (NAME_ROLE[lower]) return NAME_ROLE[lower]
  const dot = lower.lastIndexOf('.')
  if (dot > 0) {
    const ext = lower.slice(dot)
    if (EXT_ROLE[ext]) return EXT_ROLE[ext]
  }
  if (/^readme/i.test(lower)) return NAME_ROLE['readme.md']
  return ''
}

/** Short role label for a repository as a whole. */
export function describeRepo(repo) {
  const kind = repo.provider === 'npm' ? 'npm 包' : '开源仓库'
  return `${repo.provider} ${kind} ${repo.owner ? `${repo.owner}/` : ''}${repo.repo}`
}
