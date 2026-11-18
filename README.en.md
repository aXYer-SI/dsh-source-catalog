# dsh-source-catalog

Mines your **past DSH sessions** for the tools and data sources you actually used, drops the noise, and keeps two bilingual tables: every row carries **one category**, its **pros and cons**, and **a URL you can open**.

| 工具名称<br>Tool | 类别<br>Category | 工具介绍<br>Introduction | 获取渠道<br>Channel |
|---|---|---|---|
| `api.adoptium.net/v3` | 环境与运行时<br>Environment & runtime | **中文** Adoptium 发行的 OpenJDK，含 LTS 版本。<br>✅ 官方或镜像分发，版本明确，装一次可长期复用。<br>⚠️ 体积大、区分平台与架构，升级后要重配 PATH。<br><br>**English** OpenJDK builds published by Adoptium, including LTS releases.<br>✅ Official or mirrored builds with an explicit version; install once and reuse.<br>⚠️ Large downloads, per-platform and per-architecture variants, PATH must be re-pointed after an upgrade. | <https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse><br>命令行抓取 · 1 |

| 名称<br>Name | 类别<br>Category | 介绍<br>Introduction | 获取来源<br>Source |
|---|---|---|---|
| `127.0.0.1:7863` | 接口与端点<br>APIs & endpoints<br>🏷 本地 Local | **中文** 会话里实际调用过的第三方或本地接口端点，含查询参数。<br>✅ 直接取数，参数明确、可照抄复现；本地服务通常是自己的开发环境。<br>⚠️ 可能需要 key、有限流；本地服务随进程消失，换台机器就不在了。<br><br>**English** Third-party or local API endpoints actually called in the session, query string included.<br>✅ Direct data access with explicit parameters that can be replayed; a local service is usually your own dev environment.<br>⚠️ May need a key, may be rate-limited; a local service dies with its process and does not exist on another machine. | <http://127.0.0.1:7863/healthz><br>命令行抓取 · 76<br>（含 15 个来源 / 15 entries） |

## What it is for

Scanning historical sessions easily yields thousands of entries, and almost all of it is noise. The catalogue answers one question:

> **What will I use again next time?**

Two hard rules: **it must have been acquired** (a link that only appeared in search results is a lead, not knowledge) and **it must be reusable across sessions** (local files, uploads, skills and MCP calls are context for one task).

## Categories and labels

A **category answers "what is this"** and each row has exactly one; a **label answers "what property does it have"** and a row may carry several.

Four categories, one verb each — **install / read / query / consult**. Four is the number a person can hold without counting on fingers, and a new domain (regulation, firmware, corpus) still fits one of them, so the taxonomy does not have to grow.

| Category | Test | What it holds |
|---|---|---|
| **环境** Environment | you **install** it, once | runtimes, SDKs, build and package sources, CLI tools, proxies |
| **源码** Code | you **read** it and can copy it | repositories, examples, libraries, model-weight repos |
| **信息** Information | you **query** it by parameter | boundaries, weather, geocoding, datasets, API endpoints, local services |
| **资料** References | you **read** it, never run it | patents, papers, standards, official documentation |

| Label | Meaning |
|---|---|
| 🏷 本地 Local | a service on this machine (`127.0.0.1`, `localhost`) |
| 🏷 自有 Own | your own repository, as configured in `ownOwners` |
| 🏷 需 Key | the URL carries a `key=` / `token=` credential |
| 🏷 代理 Proxy | reached through a relay such as gh-proxy or r.jina.ai |

The tools table shows only **Environment and Code**; the data table only **Information and References**. Each category lists at most 8 rows by session coverage; the rest stay in `catalog.json`.

## The acquisition column opens the source

It starts with **a concrete URL you can open**, followed by how often and how it was fetched:

- a repository row links to its home page;
- a download row links to the exact file;
- an API row links to the endpoint as it was called, query string included;
- a plain command (`java`, `git`, `aapt2`) links to the tool's own site.

The point: **you do not need a model to use the catalogue**.

## Output

```yaml
dsh-catalog/
├── catalog.md      ← the two tables (for humans)
└── catalog.json    ← the deduplicated data (for machines, including filtered entries)
```

## Usage

| Entry | What it does |
|---|---|
| `/catalog-scan` | Scan every session not yet scanned and update the catalogue |
| `/catalog-scan force` | Rebuild the catalogue from scratch |
| `/catalog-scan limit 20` | Scan at most 20 sessions this run |
| `/catalog-show` | Print a summary of the catalogue |
| `catalog_scan` tool | Lets an agent trigger a scan (`force` / `limit`) |

## Configuration

```yaml
- id: source-catalog
  config:
    outputDir: "C:/Users/you/dsh-catalog"      # empty = <session cwd>/dsh-catalog
    valueKeywords: ["aliyun", "county"]         # extra topics that always qualify
    ownOwners: ["your-github-login"]            # repositories under these owners get 🏷 自有
```

## Deduplication

- **Tools** are keyed by name, accumulating call counts and session coverage;
- **Sources** are keyed by normalised identity (absolute path, normalised URL, query text);
- **Channels**: the same source reached a new way adds a channel to its row instead of a duplicate row;
- **Repositories**: files of one repository collapse into one row;
- **Row labels**: repositories show `owner/repo`, URLs show `host/first-segment`, local services show `host:port`.

## Upgrading from 0.3

`0.4.0` merges the ten categories into four: Environment (runtimes, SDKs, builds, CLI, proxies), Code (repositories), Information (geo, weather, datasets, endpoints) and References (patents and papers). Every historical tag is remapped automatically, so `catalog.json` needs no rescan; proxies drop from a category to the `代理` label.

## Development

```powershell
node test/catalog.test.mjs   # categories, labels, tables, dedupe, channels, skip rules
```

```
lib/extract.js     recognise sources from tool calls, tag categories and labels
lib/knowledge.js   bilingual what / pros / cons for 10 categories and 19 entries
lib/repo.js        URL normalisation, repository grouping, file roles
lib/catalog.js     deduplicated storage and the two-table renderer
lib/index.js       scan command, tool registration, writing output
```

## License

[MIT](LICENSE) © 2026 aXyer
