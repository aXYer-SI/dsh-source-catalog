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
 * Category titles in display order: two per table.
 *
 * Four categories, chosen so a person can count them on one hand: 装 / 读 / 查 / 看.
 * Anything a new sub-topic needs fits one of these four, so the taxonomy does not
 * have to grow every time a new domain shows up.
 */
export const CATEGORY_TITLES = {
  'tool-env': { zh: '环境', en: 'Environment' },
  'tool-code': { zh: '源码', en: 'Code' },
  'data-info': { zh: '信息', en: 'Information' },
  'data-doc': { zh: '资料', en: 'References' },
}

/** Label titles (many per row). */
export const LABEL_TITLES = {
  local: { zh: '本地', en: 'Local' },
  own: { zh: '自有', en: 'Own' },
  'need-key': { zh: '需 Key', en: 'Key required' },
  proxy: { zh: '代理', en: 'Proxy' },
}

/** Category-level knowledge, keyed by the tag ids in extract.js. */
export const TAG_KNOWLEDGE = {
  'tool-env': {
    zh: {
      what: '装好才能用的东西：语言运行时、SDK、构建与包源、命令行工具，以及访问代理。',
      pros: '装一次长期复用；工具链齐了，后面的任务不用再折腾环境。',
      cons: '体积大、区分平台与架构；组件版本彼此耦合，镜像和代理还会失效。',
    },
    en: {
      what: 'Things you install before you can work: runtimes, SDKs, build and package sources, command-line tools, and access proxies.',
      pros: 'Install once and reuse; a complete toolchain stops later tasks from fighting the environment.',
      cons: 'Large downloads split by platform and architecture; component versions are coupled, and mirrors or proxies go stale.',
    },
  },
  'tool-code': {
    zh: {
      what: '可读可抄的源码与仓库：GitHub / GitLab / Gitee 上的工程、库与示例，含模型权重仓库。',
      pros: '一手资料，能与文档对照，直接看到实现细节。',
      cons: '仓库可能改名、归档或分叉；分支与文档容易不同步。',
    },
    en: {
      what: 'Source you can read and copy: repositories, libraries and examples on GitHub, GitLab or Gitee, including model-weight repos.',
      pros: 'Primary sources: compare against the docs and read the implementation directly.',
      cons: 'Repositories get renamed, archived or forked; branches and docs drift apart.',
    },
  },
  'data-info': {
    zh: {
      what: '按参数查询的数据与接口：地理边界、天气、地址编码、数据集、API 端点与本地服务。',
      pros: '结构规整、可直接取数；参数写清楚就能复现同一次结果。',
      cons: '精度与免费额度有限；坐标系、key 和限流要自己处理，本地服务随进程消失。',
    },
    en: {
      what: 'Data and endpoints you query by parameter: boundaries, weather, geocoding, datasets, API endpoints and local services.',
      pros: 'Well-structured and directly queryable; the recorded parameters reproduce the same result.',
      cons: 'Limited precision and free quota; coordinate systems, keys and rate limits are yours to handle, and a local service dies with its process.',
    },
  },
  'data-doc': {
    zh: {
      what: '只读引用的文献：专利、论文、标准与官方文档。',
      pros: '免费、可检索全文与著录项，适合做初步调研。',
      cons: '机器翻译与法律效力有限，正式结论以官方原文为准。',
    },
    en: {
      what: 'Documents you read but do not run: patents, papers, standards and official documentation.',
      pros: 'Free full-text and bibliographic search, good for a first pass.',
      cons: 'Machine translation and legal standing are limited; rely on official documents for conclusions.',
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
