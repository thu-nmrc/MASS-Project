# Copilot / AI Agent 指南 — MASS 项目

以下说明帮助 AI 编码代理快速上手修改、调试与扩展此仓库。聚焦可执行知识、约定与示例请求/响应。

## 关键目标（Big picture）
- **前端 UI (`static/`)**: `static/js/app.js` 控制所有前端逻辑（Agent 管理、事件、运行控制、导出、配置保存/导入）。
- **后端轻量 HTTP 服务 (`server.py`)**: 暴露 `/api/*` 接口——`/api/config`, `/api/test`, `/api/complete`, `/api/save_message`, `/api/export`, `/api/export_excel`，负责与 OpenAI 兼容后端通信、重试、CSV/Excel 导出。
- **打包脚本 (`build_exe.py`)**: 使用 PyInstaller 构建 Windows 可执行文件。开发者仅在需要打包时安装 `pyinstaller`。

## 常用运行与调试命令
- 启动开发服务器（Windows）: `start.bat`（会运行 `python server.py`）。
- 启动开发服务器（类 Unix）: `./start.sh` 或 `python3 server.py`。
- 构建 Windows 可执行: `python build_exe.py`（需要 `pyinstaller`）。
- 安装可选依赖（Excel 导出）: `pip install -r requirements.txt`（`openpyxl`）。

示例：在 PowerShell（Windows）运行：
```
.
cd "d:\\Code\\MASS_System Ver.1.0.1"
start.bat
```

## 重要约定与数据结构（来自 `app.js` / `server.py`）
- 全局配置存在前端 `state.config` 与后端 `CONFIG`（`/api/config` POST 保存）。关键字段：`baseUrl`, `apiKey`, `modelName`, `multiApi`。
- Agent 对象结构（在 `app.js`）：
  - `id, name, prompt, useCustomApi, customBaseUrl, customApiKey, customModel, subordinates, includeSubSubordinates, returnDefaultEnabled`
- 突发事件存储：`state.events`，以触发回合号为 key，结构为 `{ name, description, stop_round }`。
- Prompt 缓存语义：当 `multiApi === false` 且 `disableCache === false` 时，前端会把背景规则作为可缓存的 system 消息发送（`cache_control` 标记）。当启用多 API 模式，缓存自动禁用（见 `app.js` 的多 API 与禁用缓存互斥逻辑）。

## 后端行为要点（`server.py`）
- 请求转发到 LLM：`/api/complete` 与 `/api/test` 调用 `call_llm(cfg, body)`，构建 `POST { model, messages }` 到 `baseUrl + '/chat/completions'`。
- 重试策略：`post_with_retry` 与前端最大重试次数交互；常见重试码为 `{429,500,502,503,504}`；前端 `maxRetries=99` 表示无限重试。
- 导出：后端写入 `exports/messages.csv`，`/api/export` 会读取该 CSV 并生成 `export_{n}.csv`；Excel 导出依赖 `openpyxl`。

## 编辑/扩展建议（对 AI 代理）
- 保守改动：修改后端接口或响应格式前，先在 `app.js` 中定位 fetch 使用处并同步更新前端。不要改变 `/api/complete` 的基本 JSON shape（`{ model, messages }`）。
- 多 API 支持：若要扩展 per-agent API 功能，遵循 `agent.useCustomApi` 字段与前端 UI 模式（见 `editAgent` / `configAgentApi`）。
- 增加新后端端点：同时更新 `server.py` 的 `RequestHandler.do_POST`、并在 `static/js/app.js` 中添加对应 `fetch` 调用与错误提示。
- 日志与导出：后端将原始响应写入 `raw` 字段、并记录到 `exports/messages.csv`，任何变更请保持 CSV 列顺序以兼容现有 `export_csv` / `export_excel`。

## 快速示例
- 向后端测试连接（同 UI “测试连接”）：
```json
POST /api/test
{
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-...",
  "model": "gpt-4",
  "messages": [{"role":"system","content":"ping"},{"role":"user","content":"ping"}]
}
```
- `/api/complete` 预期后端返回包含 `status`, `json`（LLM 原始解析 JSON）, `raw`（原始文本）, `attempts` 等字段。前端读取 `data.json.choices[0].message.content`。

## 维护者/PR 指南碎片
- 修改前端文本请更新 `static/js/i18n.js`（支持 `zh-CN` 与 `en`）。
- 新增或修改示例配置请放 `examples/`，便于 UI 的导入/导出测试。
- 输出文件位于 `exports/`，CI/发布应忽略该目录（一般已加入 `.gitignore`）。

## 已知注意事项（可直接验证的事实）
- `requirements.txt` 仅包含 `openpyxl` 与 `pyinstaller`；多数运行依赖为 Python 标准库。
- `start.bat` 指向特定本地 Python 路径示例（可能需要本地化，直接运行 `python server.py` 更可靠）。
- 前端默认端口 8899（可通过环境变量 `MASS_PORT` 改变）。

——
如果需要，我可以：
- 把这份指南调整成英文版本；
- 把具体示例（如 `/api/complete` 的模拟响应）补全为真实 JSON 样例；
- 或把变更打成 patch 并提交到分支。请告诉我你希望下一步怎么做。 
