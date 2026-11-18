# dsh-source-catalog

从 DSH 的**历史会话**里，把真正用过的工具与数据源挖出来，过滤掉噪音，输出两张中英双语的表：每行归入**一个类别**，带**优缺点**，并给出**能直接打开的网址**。

| 工具名称<br>Tool | 类别<br>Category | 工具介绍<br>Introduction | 获取渠道<br>Channel |
|---|---|---|---|
| `api.adoptium.net/v3` | 环境与运行时<br>Environment & runtime | **中文** Adoptium 发行的 OpenJDK，含 LTS 版本。<br>✅ 官方或镜像分发，版本明确，装一次可长期复用。<br>⚠️ 体积大、区分平台与架构，升级后要重配 PATH。<br><br>**English** OpenJDK builds published by Adoptium, including LTS releases.<br>✅ Official or mirrored builds with an explicit version; install once and reuse.<br>⚠️ Large downloads, per-platform and per-architecture variants, PATH must be re-pointed after an upgrade. | <https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse><br>命令行抓取 · 1 |

| 名称<br>Name | 类别<br>Category | 介绍<br>Introduction | 获取来源<br>Source |
|---|---|---|---|
| `127.0.0.1:7863` | 接口与端点<br>APIs & endpoints<br>🏷 本地 Local | **中文** 会话里实际调用过的第三方或本地接口端点，含查询参数。<br>✅ 直接取数，参数明确、可照抄复现；本地服务通常是自己的开发环境。<br>⚠️ 可能需要 key、有限流；本地服务随进程消失，换台机器就不在了。<br><br>**English** Third-party or local API endpoints actually called in the session, query string included.<br>✅ Direct data access with explicit parameters that can be replayed; a local service is usually your own dev environment.<br>⚠️ May need a key, may be rate-limited; a local service dies with its process and does not exist on another machine. | <http://127.0.0.1:7863/healthz><br>命令行抓取 · 76<br>（含 15 个来源 / 15 entries） |

## 它解决什么问题

把历史会话扫一遍很容易得到几千条记录，但绝大多数是噪音。这份清单只回答一个问题：

> **哪些东西，我以后还会再用一次？**

两条硬规则：**必须真正获取过**（只在搜索结果里出现的链接是线索，不是知识）、**必须跨会话可复用**（本地文件、上传附件、技能、MCP 调用都是某次任务的上下文）。

## 分类与标签

**分类回答「这是什么」**，每行只有一个；**标签回答「它有什么属性」**，一行可以有多个。

| 类别 | 收什么 |
|---|---|
| 环境与运行时 | JDK、Python、Node、Android SDK、apktool 这类语言运行时、SDK 与平台工具链 |
| 构建与包分发 | Gradle、Maven、npm/pnpm、pip，以及阿里/清华/腾讯等镜像与 CDN |
| 命令行工具 | curl、git、7z、ffmpeg、pandoc、jq |
| 源码仓库 | GitHub / GitLab / Gitee 上的仓库与文件 |
| 访问代理 | gh-proxy、r.jina.ai 这类中转加速入口 |
| 地理与行政区划 | DataV areas_v3、city-geo、geonames、地理编码 |
| 天气 | Open-Meteo、和风等实时/预报接口 |
| 专利与文献 | Google Patents、Espacenet、USPTO、CNIPA、arXiv |
| 数据集 | HuggingFace Datasets、Kaggle |
| 接口与端点 | 实际调用过的第三方或本地接口（含查询参数） |

| 标签 | 含义 |
|---|---|
| 🏷 本地 | 本机服务（`127.0.0.1`、`localhost`） |
| 🏷 自有 | 你自己的仓库，由 `ownOwners` 配置识别 |
| 🏷 需 Key | URL 里带 `key=` / `token=` 之类的凭据 |

表里**每个类别最多列 8 条**（按会话覆盖度取前 8），其余留在 `catalog.json`——避免仓库类条目把别的类挤没。

## 「获取渠道」列可以直接点开

第三/第四列不是一句「命令行抓取」，而是**一个能打开的具体网址** + 获取方式与次数：

- 仓库行给仓库首页，例如 `https://github.com/owner/repo`；
- 下载行给完整下载地址；
- 接口行给实际调用过的端点（含查询参数）；
- 纯命令（`java`、`git`、`aapt2`）没有下载地址，就给各自的官网。

目的是**离开 AI 也能用**：复制网址就能打开、下载或复用。

## 输出

```yaml
dsh-catalog/
├── catalog.md      ← 两张表（人读）
└── catalog.json    ← 去重后的完整数据（机器读，含被过滤的条目）
```

## 用法

| 入口 | 作用 |
|---|---|
| `/catalog-scan` | 扫描所有未扫描过的会话，更新清单 |
| `/catalog-scan force` | 清空并重建清单 |
| `/catalog-scan limit 20` | 本次最多扫描 20 个会话 |
| `/catalog-show` | 查看清单摘要 |
| `catalog_scan` 工具 | 让智能体也能触发扫描（参数 `force` / `limit`） |

## 配置

```yaml
- id: source-catalog
  config:
    outputDir: "C:/Users/you/dsh-catalog"      # 留空 = 会话工作目录/dsh-catalog
    valueKeywords: ["阿里", "县域"]             # 额外关注词，命中也进表
    ownOwners: ["你的GitHub用户名"]             # 这些 owner 下的仓库标 🏷 自有
```

## 去重规则

- **工具**：按工具名去重，累计调用次数与覆盖会话；
- **来源**：按规范化身份去重（绝对路径 / 规范化 URL / 查询词）；
- **获取渠道**：同一来源换了获取方式不新增行，只在该行追加渠道；
- **仓库**：同一仓库的多个文件合并成一行；
- **行名**：仓库给 `owner/repo`，URL 给 `域名/首段路径`，本机服务给 `host:port`。

## 从 0.2 升级

`0.3.0` 把 14 个 tag 合并成 10 个类别、新增 `访问代理`，并给表加了「类别」列。旧的 `catalog.json` 会被自动迁移（`tool-sdk`/`tool-apk` → 环境与运行时、`tool-mirror` → 构建与包分发、`data-address` → 地理与行政区划、`tool-net` → 命令行工具），不需要强制重扫。

## 开发

```powershell
node test/catalog.test.mjs   # 类别、标签、两张表、去重、渠道、跳过规则
```

```
lib/extract.js    从工具调用里识别来源，打类别与标签
lib/knowledge.js  10 个类别 + 19 个常见条目的双语「是什么 / 优点 / 缺点」
lib/repo.js       URL 规范化、仓库归并、文件角色识别
lib/catalog.js    去重存储 + 两张表的渲染（含类别列与每类限量）
lib/index.js      扫描命令、工具注册、输出落盘
```

## 许可

[MIT](LICENSE) © 2026 aXyer
