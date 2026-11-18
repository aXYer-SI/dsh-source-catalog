/**
 * Bilingual knowledge for the two catalogue tables.
 *
 * Every high-value category carries a short "what it is / pros / cons" block in
 * Chinese and English. Concrete well-known entries override only the "what"
 * sentence; pros and cons stay with the category so the wording never drifts.
 *
 * @module dsh-source-catalog/knowledge
 */

/**
 * Category titles, in display order. Ten categories, each a single home for a
 * source; cross-cutting properties are labels, not categories.
 */
export const CATEGORY_TITLES = {
  'tool-runtime': { zh: '环境与运行时', en: 'Environment & runtime' },
  'tool-build': { zh: '构建与包分发', en: 'Build & packages' },
  'tool-cli': { zh: '命令行工具', en: 'CLI tools' },
  'tool-repo': { zh: '源码仓库', en: 'Repositories' },
  'tool-proxy': { zh: '访问代理', en: 'Proxies' },
  'data-geo': { zh: '地理与行政区划', en: 'Geo & regions' },
  'data-weather': { zh: '天气', en: 'Weather' },
  'data-patent': { zh: '专利与文献', en: 'Patents & papers' },
  'data-dataset': { zh: '数据集', en: 'Datasets' },
  'data-api': { zh: '接口与端点', en: 'APIs & endpoints' },
}

/** Label titles (many per row). */
export const LABEL_TITLES = {
  local: { zh: '本地', en: 'Local' },
  own: { zh: '自有', en: 'Own' },
  'need-key': { zh: '需 Key', en: 'Key required' },
}

/** Category-level knowledge, keyed by the tag ids in extract.js. */
export const TAG_KNOWLEDGE = {
  'tool-runtime': {
    zh: {
      what: '语言运行时、SDK 与平台工具链：JDK、Python、Node、Android SDK、apktool 这一类。',
      pros: '官方或镜像分发、版本明确，装一次可长期复用，工具链齐了后续任务都省事。',
      cons: '体积大、区分平台与架构；组件版本强耦合（如 AGP / Gradle / SDK），升级后要重配 PATH。',
    },
    en: {
      what: 'Language runtimes, SDKs and platform toolchains: JDK, Python, Node, the Android SDK, apktool.',
      pros: 'Official or mirrored builds with an explicit version; install once and reuse, and the toolchain serves later tasks.',
      cons: 'Large downloads split by platform and architecture; component versions are coupled (AGP / Gradle / SDK) and PATH needs re-pointing after upgrades.',
    },
  },
  'tool-build': {
    zh: {
      what: '构建、依赖与分发源：Gradle、Maven、npm/pnpm、pip，以及阿里/清华/腾讯等镜像与 CDN。',
      pros: '依赖可锁定、构建可复现；换镜像能绕开慢速或不可达的官方源。',
      cons: '镜像可能滞后官方版本，校验和要自己核对；代理、证书和版本冲突是最常见的故障点。',
    },
    en: {
      what: 'Build, dependency and distribution sources: Gradle, Maven, npm/pnpm, pip, plus mirrors and CDNs.',
      pros: 'Locked dependencies and reproducible builds; a mirror gets around a slow or unreachable upstream.',
      cons: 'Mirrors can lag upstream and checksums are yours to verify; proxies, certificates and version conflicts are the usual failures.',
    },
  },
  'tool-cli': {
    zh: {
      what: '本地处理文件、媒体与压缩的通用命令：curl、git、7z、ffmpeg、pandoc、jq。',
      pros: '通用、可脚本化，几乎每台机器都有，能组合成批处理。',
      cons: '参数多、跨平台行为有差异；下载类命令要自己处理 TLS、代理与超时。',
    },
    en: {
      what: 'General command-line tools for files, media and archives: curl, git, 7z, ffmpeg, pandoc, jq.',
      pros: 'Universal and scriptable; available almost everywhere and easy to compose into batch jobs.',
      cons: 'Many flags and platform differences; download tools leave TLS, proxies and timeouts to you.',
    },
  },
  'tool-repo': {
    zh: {
      what: 'GitHub / GitLab / Gitee 上托管的源码、示例与配置文件。',
      pros: '一手资料，能与文档对照，直接看到实现细节。',
      cons: '仓库可能改名、归档或分叉；分支与文档容易不同步。',
    },
    en: {
      what: 'Source code, examples and configuration files hosted on GitHub, GitLab or Gitee.',
      pros: 'Primary sources: compare against the docs and read the implementation directly.',
      cons: 'Repositories get renamed, archived or forked; branches and docs drift apart.',
    },
  },
  'tool-proxy': {
    zh: {
      what: '中转或加速服务：gh-proxy、r.jina.ai 这类把访问转发出去的入口。',
      pros: '官方源拉不动时能应急，通常不改变内容本身。',
      cons: '可用性随时会变、可能限速或记录请求；敏感内容不要经第三方中转。',
    },
    en: {
      what: 'Relay or acceleration services such as gh-proxy and r.jina.ai that forward a request.',
      pros: 'A stopgap when the upstream is unreachable, and usually content-preserving.',
      cons: 'Availability changes without notice, requests may be rate-limited or logged; do not route sensitive content through a third party.',
    },
  },
  'data-geo': {
    zh: {
      what: '行政区划边界、经纬度、adcode 与地址编码数据，例如 DataV areas_v3、city-geo。',
      pros: '结构规整、带层级编码，可直接绘图、做区域查询或地址反查。',
      cons: '边界精度有限；坐标系（WGS84 / GCJ02 / BD09）必须先统一，各自配额也不同。',
    },
    en: {
      what: 'Administrative boundaries, coordinates, adcode and geocoding data such as DataV areas_v3 or city-geo.',
      pros: 'Well-structured with hierarchy codes; ready for maps, region queries and reverse geocoding.',
      cons: 'Limited boundary precision, and coordinate systems (WGS84 / GCJ02 / BD09) plus per-vendor quotas must be reconciled first.',
    },
  },
  'data-weather': {
    zh: {
      what: '实时与预报天气接口，例如 Open-Meteo、和风天气。',
      pros: '免 key 或门槛低，字段齐全，适合快速验证。',
      cons: '精度受网格限制，免费额度与调用频率也有限。',
    },
    en: {
      what: 'Current and forecast weather APIs such as Open-Meteo and QWeather.',
      pros: 'No key or a low barrier, complete fields, fast to validate with.',
      cons: 'Accuracy is grid-limited, and free tiers cap quota and request rate.',
    },
  },
  'data-patent': {
    zh: {
      what: '专利与文献检索来源：Google Patents、Espacenet、USPTO、CNIPA、arXiv。',
      pros: '免费、可检索全文与著录项，适合做初步调研。',
      cons: '机器翻译与法律效力有限，正式结论以官方原文为准。',
    },
    en: {
      what: 'Patent and literature search sources: Google Patents, Espacenet, USPTO, CNIPA, arXiv.',
      pros: 'Free full-text and bibliographic search, good for a first pass.',
      cons: 'Machine translation and legal standing are limited; rely on official documents for conclusions.',
    },
  },
  'data-dataset': {
    zh: {
      what: '可直接下载的结构化数据与语料，例如 HuggingFace Datasets、Kaggle。',
      pros: '结构化、带说明，能直接训练或评测。',
      cons: '许可证与隐私要逐项核对；体积大、版本会变。',
    },
    en: {
      what: 'Downloadable structured data and corpora such as HuggingFace Datasets and Kaggle.',
      pros: 'Structured and documented; usable for training or evaluation right away.',
      cons: 'Check licence and privacy per dataset; large downloads and versions that shift.',
    },
  },
  'data-api': {
    zh: {
      what: '会话里实际调用过的第三方或本地接口端点，含查询参数。',
      pros: '直接取数，参数明确、可照抄复现；本地服务通常是自己的开发环境。',
      cons: '可能需要 key、有限流；本地服务随进程消失，换台机器就不在了。',
    },
    en: {
      what: 'Third-party or local API endpoints actually called in the session, query string included.',
      pros: 'Direct data access with explicit parameters that can be replayed; a local service is usually your own dev environment.',
      cons: 'May need a key, may be rate-limited; a local service dies with its process and does not exist on another machine.',
    },
  },
}

/**
 * Well-known concrete entries. Each rule overrides the "what" sentence of its
 * category; pros and cons still come from the category.
 */
export const ENTRY_KNOWLEDGE = [
  {
    test: /adoptium|openjdk|\bjdk\b|\bjre\b/i,
    zh: { what: 'Adoptium 发行的 OpenJDK，含 LTS 版本。' },
    en: { what: 'OpenJDK builds published by Adoptium, including LTS releases.' },
  },
  {
    test: /^python|python3?$|pip3?$/i,
    zh: { what: 'Python 运行时与 pip 包管理。' },
    en: { what: 'Python runtime and the pip package manager.' },
  },
  {
    test: /\bnode(js)?\b|\bnpm\b|\bnpx\b|\bpnpm\b|\byarn\b/i,
    zh: { what: 'Node.js 运行时与 npm / pnpm 生态。' },
    en: { what: 'Node.js runtime and the npm / pnpm ecosystem.' },
  },
  {
    test: /gradle/i,
    zh: { what: 'Gradle 构建工具（含镜像分发的发行包）。' },
    en: { what: 'Gradle build tool, including mirrored distributions.' },
  },
  {
    test: /maven|mvn/i,
    zh: { what: 'Maven 构建与依赖管理。' },
    en: { what: 'Maven build and dependency management.' },
  },
  {
    test: /sdkmanager|cmdline-tools|android-sdk|build-tools|platforms;android/i,
    zh: { what: 'Android SDK 命令行工具（sdkmanager / build-tools / platforms）。' },
    en: { what: 'Android SDK command-line tools (sdkmanager, build-tools, platforms).' },
  },
  {
    test: /apktool|apksigner|zipalign|\baapt2?\b/i,
    zh: { what: 'APK 打包、签名与对齐工具链。' },
    en: { what: 'APK packaging, signing and alignment toolchain.' },
  },
  {
    test: /github|githubusercontent|gitlab|gitee/i,
    zh: { what: 'GitHub / GitLab 开源仓库与其原始文件。' },
    en: { what: 'GitHub or GitLab repositories and their raw files.' },
  },
  {
    test: /datav\.aliyun|areas_v3|city-geo|geojson/i,
    zh: { what: '阿里 DataV 行政区划与边界数据（GeoJSON）。' },
    en: { what: 'DataV administrative areas and boundaries as GeoJSON.' },
  },
  {
    test: /open-meteo/i,
    zh: { what: 'Open-Meteo 天气接口，实时与预报，免 key。' },
    en: { what: 'Open-Meteo weather API, current and forecast, no key required.' },
  },
  {
    test: /weatherapi|qweather|和风|weather\./i,
    zh: { what: '第三方天气接口（实时 / 预报）。' },
    en: { what: 'Third-party weather API for current conditions and forecasts.' },
  },
  {
    test: /nominatim|geocod|amap|高德|baidu.*map|map\./i,
    zh: { what: '地址与经纬度互转服务。' },
    en: { what: 'Address to coordinate conversion service.' },
  },
  {
    test: /patents?\.google|espacenet|uspto|cnipa|patent/i,
    zh: { what: '专利检索与全文来源。' },
    en: { what: 'Patent search and full-text source.' },
  },
  {
    test: /arxiv|cnki|万方|scholar/i,
    zh: { what: '文献检索与预印本来源。' },
    en: { what: 'Literature and preprint search source.' },
  },
  {
    test: /huggingface|kaggle|datasets?/i,
    zh: { what: '公开数据集与语料平台。' },
    en: { what: 'Public dataset and corpus platform.' },
  },
  {
    test: /jsdelivr|unpkg|npmmirror|mirrors\.|mirror\./i,
    zh: { what: '软件包与二进制镜像分发源。' },
    en: { what: 'Package and binary mirror.' },
  },
  {
    test: /7z|7-zip|7za/i,
    zh: { what: '7-Zip 压缩与解压工具。' },
    en: { what: '7-Zip compression and extraction tool.' },
  },
  {
    test: /ffmpeg/i,
    zh: { what: 'FFmpeg 音视频转码工具。' },
    en: { what: 'FFmpeg audio and video transcoder.' },
  },
  {
    test: /curl|wget|invoke-webrequest|invoke-restmethod/i,
    zh: { what: '命令行下载与 HTTP 请求工具。' },
    en: { what: 'Command-line download and HTTP request tool.' },
  },
]

/**
 * Knowledge for one source: the matching entry's "what" plus its category's
 * pros and cons, in both languages.
 *
 * @param {{ name?: string }} source
 * @param {string} tag - high-value tag id
 * @returns {{ zh: { what: string, pros: string, cons: string }, en: { what: string, pros: string, cons: string } } | undefined}
 */
export function knowledgeFor(source, tag) {
  const base = TAG_KNOWLEDGE[tag]
  const name = String(source?.name ?? '')
  const entry = ENTRY_KNOWLEDGE.find((rule) => rule.tag === tag && rule.test.test(name))
    ?? ENTRY_KNOWLEDGE.find((rule) => rule.test.test(name))
  if (!base && !entry) return undefined

  const build = (language) => ({
    what: entry?.[language]?.what ?? base?.[language]?.what ?? '',
    pros: base?.[language]?.pros ?? '',
    cons: base?.[language]?.cons ?? '',
  })
  return { zh: build('zh'), en: build('en') }
}

/**
 * Home pages of common command-line tools, used when a row has no URL of its
 * own — a reader without a model should still be able to open the tool's site.
 */
export const COMMAND_LINKS = {
  java: 'https://adoptium.net/',
  javac: 'https://adoptium.net/',
  jar: 'https://adoptium.net/',
  git: 'https://git-scm.com/',
  node: 'https://nodejs.org/',
  npm: 'https://www.npmjs.com/',
  npx: 'https://www.npmjs.com/',
  pnpm: 'https://pnpm.io/',
  python: 'https://www.python.org/',
  python3: 'https://www.python.org/',
  pip: 'https://pypi.org/',
  gradle: 'https://gradle.org/',
  gradlew: 'https://gradle.org/',
  mvn: 'https://maven.apache.org/',
  maven: 'https://maven.apache.org/',
  sdkmanager: 'https://developer.android.com/tools/sdkmanager',
  adb: 'https://developer.android.com/tools/adb',
  aapt2: 'https://developer.android.com/tools/aapt2',
  aapt: 'https://developer.android.com/tools/aapt2',
  apktool: 'https://apktool.org/',
  apksigner: 'https://developer.android.com/tools/apksigner',
  zipalign: 'https://developer.android.com/tools/zipalign',
  curl: 'https://curl.se/',
  wget: 'https://www.gnu.org/software/wget/',
  '7z': 'https://www.7-zip.org/',
  '7za': 'https://www.7-zip.org/',
  ffmpeg: 'https://ffmpeg.org/',
  docker: 'https://www.docker.com/',
  dotnet: 'https://dotnet.microsoft.com/',
  pwsh: 'https://learn.microsoft.com/powershell/',
  powershell: 'https://learn.microsoft.com/powershell/',
  keytool: 'https://docs.oracle.com/en/java/javase/17/docs/specs/man/keytool.html',
}

/**
 * Home page of one command-line tool.
 * @param {string} name
 * @returns {string} the URL, or an empty string when unknown
 */
export function commandLink(name) {
  return COMMAND_LINKS[String(name ?? '').toLowerCase()] ?? ''
}
