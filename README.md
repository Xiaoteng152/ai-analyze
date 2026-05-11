# AI 每日复盘（ai-retrospective-tool）

基于 [Next.js](https://nextjs.org) 的单页复盘工具：表单提交写入 `data/retrospectives.json`，可选调用 AI 生成评价与完整报告，并支持 Git 采集与月度归纳等扩展能力。产品说明见 [tasks/prd-ai-retrospective-tool.md](tasks/prd-ai-retrospective-tool.md)；分步任务见 [tasks/task.json](tasks/task.json)。

## 本地开发

```bash
npm install
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建 |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## 配置与数据

- AI 相关密钥与模型默认走服务端环境变量（例如 `.env.local`），请勿把密钥写进前端请求体。
- 复盘与采集数据默认落在仓库内 `data/` 目录（首次运行由存储层自动创建）。

## 进一步了解 Next.js

- [Next.js 文档](https://nextjs.org/docs)
- [部署说明](https://nextjs.org/docs/app/building-your-application/deploying)
