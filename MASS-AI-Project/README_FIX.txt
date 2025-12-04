【MASS v0.13 修复补丁说明】
- 新增预填配置：MASS_预填配置.json（含 settings/settings_full/settings_meta，API Key 为占位符 REPLACE_WITH_YOUR_KEY；导入后把它改成你的真实 Key，再点“保存配置”）。
- 日志时间列现在会显示“模拟日期 | 本机时间”，便于核对 startDate 是否导入成功。

导入步骤：
1) 打开 http://127.0.0.1:8799/ → 点击“导入配置”选择 MASS_预填配置.json；
2) 确认“模型/接口（全局 API）”区域三项已填入：Base URL、模型名、API Key（此时为 REPLACE_WITH_YOUR_KEY 占位）；
3) 把 API Key 替换为你的真实 Key → 点击“保存配置” → 点击“测试连接”；
4) 看到右侧提示 “HTTP 200 — …” 且内容中出现 "pong" 即为联通成功；这不是报错。

若仍显示空白：
- 按 F12 打开浏览器控制台，确认是否有 “成功导入 X 个Agent配置”。
- 如果你的旧 JSON 里是 settings_full 而非 settings，本补丁已兼容。仍不生效：请把 JSON 顶层的 settings_full 复制一份为 settings 再试。
