
# MASS Portable v15.2（Python 标准库版）

- 双击 `Start.bat` 即可运行；若系统无 Python，会自动下载官方嵌入式运行时到 `py-runtime/`。
- 打开后访问 `http://127.0.0.1:8799/`（首页就是 UI）。
- 在“模型/接口（全局 API）”里**只填“目标 Base URL”**（如 `https://aihubmix.com/v1`）、模型名、Key → 点击“测试连接”。
- 添加/导入 Agent，设好背景与回合 → **开始**。消息表会显示 `decide` 和 `recv status=200` 以证明已出网。

> 这版完全避免浏览器直连供应商 API；所有请求都走本地 `/api`，因此不会被 CORS 拦截，也不会暴露 Key。

## 常见问题
- `测试连接` 返回 `401`：Key 无效或没传。
- `404`：Base URL 可能缺少 `/v1` 或模型名错误。
- `timeout` 或 `network error`：供应商不稳定或本地网络问题。
