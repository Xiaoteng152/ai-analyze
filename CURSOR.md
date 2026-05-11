# CURSOR.md — 本仓库开发规范（给人类与 Cursor Agent）

本文描述 **ai-retrospective-tool** 的目录约定、接口形态、数据落盘方式与提交流程。修改代码前请先通读；在 Cursor 中可将本文件 `@` 引用或加入 Docs，以便 Agent 对齐项目习惯。

---

## 1. 项目是什么

- **Next.js 16** App Router + **React 19** + **TypeScript（strict）** + **Tailwind CSS 4**。
- 单人每日复盘：表单 → `POST /api/retrospectives` → 本地 JSON 持久化 + 可选 AI 分析；另有 Git 采集、月度归纳、用户上下文与多日趋势等能力。
- 产品说明：`tasks/prd-ai-retrospective-tool.md`；里程碑任务：`tasks/task.json`。

---

## 2. 目录与职责

| 路径 | 职责 |
| --- | --- |
| `src/app/` | 路由页面与 `layout.tsx`；仅保留轻量 Server Component，复杂交互放到 `components/`。 |
| `src/app/api/**/route.ts` | Route Handlers：校验入参、调用 `lib`、返回统一 JSON 形态。 |
| `src/components/` | Client Components（`"use client"`），例如 `retrospective-home-client.tsx`。 |
| `src/lib/` | 可复用业务逻辑：存储、AI、趋势、配置等；**不写 React UI**。 |
| `src/types/` | 纯类型与常量（如 `user-context.ts` 中的上限、预设列表）。 |
| `data/` | 运行时本地数据（`retrospectives.json`、`user-context.json`、`sources` 等）；首次写入由对应 store 创建目录与文件。 |
| `tasks/` | PRD、分步任务等非运行时代码。 |
| `scripts/` | 维护脚本（如 `smoke-api.sh`）。 |

**路径别名**：一律使用 `@/` 指向 `src/`（见 `tsconfig.json` 的 `paths`）。

---

## 3. 代码风格与约束

- **语言**：面向用户的文案默认 **简体中文**；代码注释仅在非显而易见时书写，避免噪音。
- **ESLint**：继承 `eslint-config-next`（core-web-vitals + typescript）。提交前必须 `npm run lint` 无报错。
- **React 19**：遵守 `react-hooks` 规则。例如 **不要在 `useEffect` 同步首行直接 `setState`**（会触发 `react-hooks/set-state-in-effect`）；数据拉取类副作用可把 `setState` 放在异步 IIFE 内（见 `retrospective-home-client.tsx` 中趋势加载）。
- **类型**：避免 `any`；公共 API 的 JSON 体用 `unknown` + 窄化校验（参考 `api/retrospectives/route.ts`）。
- **改动范围**：只改任务所需文件；禁止无关大重构与随意删注释。

---

## 4. API 约定

- **响应信封**（与现有前端一致）：
  - 成功：`{ ok: true, data: ... }`
  - 失败：`{ ok: false, error: string }`，并配合合适 HTTP 状态码（400 / 405 等）。
- **仅服务端**读取环境变量与密钥：`src/lib/config.ts` 汇总 `OPENROUTER_*`、`OPENAI_*`、`AI_PROVIDER` 等；**禁止**把密钥下发到浏览器或写入 `data/*.json`。
- **新增 Route Handler** 时：
  1. 在 `src/lib/` 实现纯逻辑或扩展现有 store；
  2. `route.ts` 只做 I/O、校验、`NextResponse.json`；
  3. 若需客户端调用，在 `retrospective-home-client` 或新 Client 组件中用 `fetch`，类型可定义局部 `ApiResponse<T>`。

---

## 5. 数据与存储

- **复盘主数据**：`src/lib/retrospective-store.ts` → `data/retrospectives.json`。
- **用户上下文**（履历、标签、趋势窗口）：`src/lib/user-context-store.ts` → `data/user-context.json`。
- **采集与月度**：`src/lib/source-store.ts` 等，均在 `data/` 下。
- 设计新持久化时：**沿用 `node:fs/promises` + `mkdir(..., { recursive: true })`**；损坏或非数组 JSON 时返回安全默认值，避免抛未捕获异常导致 500。

---

## 6. AI 与降级

- `src/lib/retrospective-analysis.ts`：有可用 API Key 时走 `createChatCompletion`，否则 **`buildLocalAnalysis` 本地兜底**。
- 模型响应按 **JSON** 解析（`response_format: json_object`）；解析失败须回落到本地分析，避免空白页或崩溃。

---

## 7. 字体与构建

- **不再使用 `next/font/google`**，避免 CI / 离线环境构建时因无法访问 Google Fonts 而失败。
- 字体变量在 `src/app/globals.css` 的 `:root` 中定义为 **系统字体栈**（含中文常见字体）；`layout.tsx` 仅保留 `lang` 与布局 class。

---

## 8. 自测清单（提交前必做）

在项目根目录执行：

```bash
npm run verify
```

等价于 `lint` + `typecheck` + `production build`。

**可选**：生产构建 + 核心 API 冒烟（随机端口，避免占用；`curl` 使用 `--noproxy '*'` 防止本机全局代理劫持 localhost）：

```bash
npm run smoke
```

**手动**：本地 `npm run dev` 后走一遍首页表单提交、保存用户上下文、Git 采集（需在 Git 仓库内）等关键路径。

---

## 9. 新增功能时的推荐顺序

1. 在 `src/types/` 补齐或扩展类型与常量上限。
2. 在 `src/lib/` 实现领域逻辑与文件读写。
3. 在 `src/app/api/` 暴露 HTTP 接口。
4. 在 `src/app/` 或 `src/components/` 接线 UI；Server 默认组件能读的数据在 `page.tsx` 里 `await` 后作为 `initial*` props 传入 Client。
5. 跑 `npm run verify`；必要时补充 `scripts/` 下的检查脚本。

---

## 10. 环境变量（参考）

| 变量 | 说明 |
| --- | --- |
| `AI_PROVIDER` | `openrouter`（默认）或 `openai`。 |
| `OPENROUTER_API_KEY` / `OPENROUTER_BASE_URL` / `OPENROUTER_MODEL` | OpenRouter 通路。 |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` | OpenAI 通路。 |

本地开发使用 `.env.local`（勿提交仓库）。

---

## 11. 与 Cursor 的协作建议

- 大改动前先 `@CURSOR.md` 或 `@tasks/prd-ai-retrospective-tool.md`。
- 改 API 时同时更新调用方类型与错误提示字符串。
- 任务完成后更新 `tasks/task.json` 中对应 `status`，避免清单与代码脱节。
