# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-11-18

### Changed

- **Ten categories become four**, two per table, each answering one verb: 环境 / Environment (you
  install it: runtimes, SDKs, builds, CLI, proxies), 源码 / Code (you read it: repositories),
  信息 / Information (you query it: geo, weather, datasets, endpoints), 资料 / References (you
  consult it: patents, papers, standards).
- Proxies drop from a category to the **代理 / Proxy label**, next to 本地 / 自有 / 需 Key.
- Every historical tag id is remapped automatically; `catalog.json` needs no rescan.

## [0.3.0] - 2026-11-18

### Changed

- **Fourteen tag ids become ten categories**, each row belonging to exactly one: Environment &
  runtime (merged SDK and APK tooling), Build & packages (merged mirrors), CLI tools, Repositories,
  Proxies (new), Geo & regions (merged address geocoding), Weather, Patents & papers, Datasets,
  APIs & endpoints.
- The tables gain a **Category column** with the bilingual title; `catalog.json` migrates the old
  ids automatically (`tool-sdk`, `tool-apk`, `tool-net`, `tool-mirror`, `data-address`).
- **Cross-cutting properties become labels** — `local`, `own` and `need-key` — shown under the
  category, instead of inventing more categories.
- Each category lists at most **8 rows** (by session coverage) instead of one global cap, so a
  crowded category cannot hide the others.

### Added

- `ownOwners` config: repositories under these owners carry the `own` label.

## [0.2.0] - 2026-11-18

### Changed

- **The Markdown output is now two tables**: `一、工具 / Tools` and `二、数据信息 / Data`, with the
  columns `工具名称 / 工具介绍 / 获取渠道` and `名称 / 介绍 / 获取来源`. The five-section inventory,
  the repository file appendix and the method glossary are gone.
- Every row carries a bilingual introduction (what it is, ✅ pros, ⚠️ cons) from the new
  `lib/knowledge.js`.
- Only external sources reached through `web` or `shell` reach the tables: local files, uploads,
  loaded skills, MCP calls and search queries are context, not reusable knowledge.
- The acquisition column starts with a concrete URL the reader can open without asking a model:
  the repository page, the exact download or API URL, or — for a plain command such as `java` —
  the tool's own home page from the new `COMMAND_LINKS` table.
- Row labels keep a host plus one or two directory segments, so long URLs no longer stretch the
  table; entries are capped at 40 rows per table and ordered by session coverage.

### Added

- `lib/knowledge.js`: 14 category descriptions and 19 well-known entries, each in Chinese and
  English with pros and cons.
- A test that asserts the two-table shape, the bilingual blocks, the high-value rows, and that
  noise (local files, uploads, skills, search queries) is excluded.

## [0.1.0] - 2026-11-18

### Added

- Session scanning over `sessionQuery`, with per-source deduplication and acquisition channels.
- High-value tagging of tools and data sources, repository aggregation and a bilingual-free
  Markdown inventory.
- `/catalog-scan`, `/catalog-show` and the `catalog_scan` tool.
