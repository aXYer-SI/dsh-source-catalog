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

四类，正好对应四个动词——**装 / 读 / 查 / 看**。数量控制在四个，是因为人脑一次能轻松数清的类别就这么多；以后出现新领域（法规、固件、语料……）也塞得进这四类，分类不必再膨胀。

| 类别 | 判据 | 收什么 |
|---|---|---|
| **环境** Environment | 要**装**，装一次长期用 | 运行时、SDK、构建与包源、命令行工具、访问代理 |
| **源码** Code | 要**读**，能抄能改 | 仓库、示例工程、库、模型权重仓库 |
| **信息** Information | 要**查**，按参数取数 | 地理边界、天气、地址编码、数据集、API 端点、本地服务 |
| **资料** References | 要**看**，只读引用 | 专利、论文、标准、官方文档 |

| 标签 | 含义 |
|---|---|
| 🏷 本地 | 本机服务（`127.0.0.1`、`localhost`） |
| 🏷 自有 | 你自己的仓库，由 `ownOwners` 配置识别 |
| 🏷 需 Key | URL 里带 `key=` / `token=` 之类的凭据 |
| 🏷 代理 | 经中转访问（gh-proxy、r.jina.ai 等） |

工具表只出现 **环境、源码**，数据表只出现 **信息、资料**——每张表最多两撮，扫读时一眼分得清。每类最多列 8 条（按会话覆盖度），其余留在 `catalog.json`。

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

## 从 0.3 升级

`0.4.0` 把 10 个类别合并成 4 个：环境（运行时/SDK/构建/命令行/代理）、源码（仓库）、信息（地理/天气/数据集/接口）、资料（专利与文献）。所有历史 tag 都会自动映射，`catalog.json` 不需要重扫；`访问代理` 从类别降为标签 `代理`。

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
