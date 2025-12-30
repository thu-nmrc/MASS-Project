# server_stdlib.py — v0.21.2 (retry + token_key auto-detect + auto-open browser)
import http.server, socketserver, json, urllib.request, urllib.error, urllib.parse, os, sys, time, random, socket, webbrowser, threading
import csv
from datetime import datetime

port_from_cmd = None
if len(sys.argv) > 1 and sys.argv[1].startswith('--port='):
    port_from_cmd = sys.argv[1].split('=')[1]
PORT = int(port_from_cmd or os.environ.get('MASS_PORT', '8799'))

ROOT = os.path.dirname(__file__)
STATIC_DIR = os.path.join(ROOT, 'static')
EXPORT_DIR = os.path.join(ROOT, 'Export')
CSV_FILE = os.path.join(EXPORT_DIR, 'messages.csv')

# 确保Export目录存在
if not os.path.exists(EXPORT_DIR):
    os.makedirs(EXPORT_DIR)

GLOBAL = {
    "baseUrl": "",
    "apiKey": "",
    "modelName": "",
    "maxTokens": 512,
    "multiApi": False,
    "tokenKey": "",   # 留空表示由服务端自动探测
}

RETRY_HTTP = {429, 500, 502, 503, 504}

def init_csv_file():
    """初始化CSV文件，清空内容并创建表头"""
    headers = ['Agent名称', '系统消息', '用户消息', '收到的内容', '回合', '时间戳', 'Agent ID', 'Tokens', '延迟(ms)']
    
    with open(CSV_FILE, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
    
    print(f"[MASS] CSV文件已初始化: {CSV_FILE}")

def save_message_to_csv(round_num, agent_id, agent_name, system_text, user_text, response_text, tokens=0, latency=0):
    """保存消息到CSV文件"""
    try:
        # 如果文件不存在，先初始化
        if not os.path.exists(CSV_FILE):
            init_csv_file()
        
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        data = [agent_name, system_text, user_text, response_text, round_num, timestamp, agent_id, tokens, latency]
        
        with open(CSV_FILE, 'a', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(data)
        
        print(f"[MASS] 消息已保存到CSV: Agent {agent_id}, 回合 {round_num}")
        
    except Exception as e:
        print(f"[MASS] 保存消息到CSV失败: {e}")

def export_csv_with_sequence():
    """导出当前CSV文件为带序号的新文件，只包含核心4列"""
    try:
        if not os.path.exists(CSV_FILE):
            return {"ok": False, "error": "没有找到消息文件"}
        
        # 查找下一个可用的序号
        sequence = 1
        while True:
            export_filename = f"export_{sequence}.csv"
            export_path = os.path.join(EXPORT_DIR, export_filename)
            if not os.path.exists(export_path):
                break
            sequence += 1
        
        # 读取原文件并创建新的导出文件
        export_headers = ['Agent名称', '发送的prompt', '收到的内容', '回合']
        
        with open(CSV_FILE, 'r', encoding='utf-8-sig') as source_file:
            reader = csv.reader(source_file)
            source_headers = next(reader)  # 跳过表头
            
            with open(export_path, 'w', newline='', encoding='utf-8-sig') as export_file:
                writer = csv.writer(export_file)
                writer.writerow(export_headers)
                
                # 处理每一行数据
                for row in reader:
                    if len(row) >= 9:  # 确保有足够的列
                        agent_name = row[0]  # Agent名称
                        system_text = row[1] or ""  # 系统消息
                        user_text = row[2] or ""  # 用户消息
                        response_text = row[3]  # 收到的内容
                        round_num = row[4]  # 回合
                        
                        # 合并系统消息和用户消息为prompt
                        combined_prompt = ""
                        if system_text:
                            combined_prompt += f"系统: {system_text}\n"
                        if user_text:
                            combined_prompt += f"用户: {user_text}"
                        
                        # 写入导出文件
                        export_data = [agent_name, combined_prompt.strip(), response_text, round_num]
                        writer.writerow(export_data)
        
        return {"ok": True, "filename": export_filename, "path": export_path}
        
    except Exception as e:
        return {"ok": False, "error": str(e)}

def json_bytes(obj):
    return json.dumps(obj, ensure_ascii=False).encode('utf-8')

def _post_once(url, data_bytes, headers, *, timeout=60):
    req = urllib.request.Request(url, data=data_bytes, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        code = resp.getcode()
        text = resp.read().decode('utf-8', 'ignore')
        return code, text

def _post_with_retries(url, data_bytes, headers, *, timeout=60, retries=3, backoff=1.6, jitter=0.25):
    last_text = ""
    for attempt in range(1, retries + 1):
        try:
            code, text = _post_once(url, data_bytes, headers, timeout=timeout)
            if 200 <= code < 300:
                return {"ok": True, "status": code, "text": text, "attempts": attempt}
            if code not in RETRY_HTTP:
                return {"ok": False, "status": code, "text": text, "attempts": attempt}
            last_text = text
        except urllib.error.HTTPError as e:
            code = getattr(e, 'code', 0)
            text = e.read().decode('utf-8', 'ignore') if hasattr(e, 'read') else str(e)
            if code not in RETRY_HTTP or attempt == retries:
                return {"ok": False, "status": code, "text": text, "attempts": attempt}
            last_text = text
        except (urllib.error.URLError, socket.timeout, TimeoutError) as e:
            if attempt == retries:
                return {"ok": False, "status": 0, "text": str(e), "attempts": attempt}
            last_text = str(e)
        time.sleep((backoff ** attempt) + random.uniform(0, jitter))
    return {"ok": False, "status": 0, "text": last_text, "attempts": retries}

def _complete_endpoint(cfg, body):
    base = (body.get('baseUrl') or cfg.get('baseUrl') or '').rstrip('/')
    if not base:
        return {"status": 400, "error": "Missing baseUrl"}
    url = base + "/chat/completions"

    model = body.get('model') or cfg.get('modelName') or ''
    messages = body.get('messages') or []

    headers = {"Content-Type": "application/json"}
    api_key = body.get('apiKey') or cfg.get('apiKey') or ''
    if api_key:
        headers["Authorization"] = "Bearer " + api_key

    # 移除temperature参数，gpt-5不支持
    upstream = {"model": model, "messages": messages}

    res = _post_with_retries(url, json_bytes(upstream), headers, timeout=60, retries=3, backoff=1.6, jitter=0.3)
    try:
        parsed = json.loads(res.get("text") or "{}")
    except Exception:
        parsed = None
    head = ""
    if isinstance(parsed, dict):
        if "error" in parsed:
            em = parsed.get("error") or {}
            head = em.get("message") or em.get("type") or ""
            # 确保head字段不包含非ASCII字符，避免编码错误
            if head and not head.isascii():
                head = "API Error (contains non-ASCII characters)"
        elif "id" in parsed:
            head = "ok"
    return {"status": res.get("status", 0),"json": parsed,"raw": res.get("text", ""),"attempts": res.get("attempts", 1),"head": head}

class Handler(http.server.SimpleHTTPRequestHandler):
    def _set_headers(self, code=200, ctype="application/json; charset=utf-8"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control", "no-cache")
        # 确保支持中文字符
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def translate_path(self, path):
        if path == "/" or path == "": return os.path.join(STATIC_DIR, "index.html")
        if path.startswith("/static/"): return os.path.join(ROOT, path.lstrip("/"))
        if path == "/seed.json": return os.path.join(ROOT, "seed.json")
        return os.path.join(STATIC_DIR, "index.html")

    def do_GET(self):
        if self.path.startswith("/api/"):
            self._set_headers(404); self.wfile.write(json_bytes({"status":404,"error":"Not Found"})); return
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", "0") or "0")
            body = self.rfile.read(length).decode("utf-8", "ignore") if length else "{}"
            try: payload = json.loads(body) if body else {}
            except Exception: payload = {}

            if self.path == "/api/config":
                for k in ["baseUrl","apiKey","modelName","multiApi"]:
                    if k in payload: GLOBAL[k] = payload[k]
                self._set_headers(200); self.wfile.write(json_bytes({"status":200,"head":"saved","config":{**GLOBAL,"apiKey":"***"}})); return

            if self.path == "/api/test":
                cfg = {**GLOBAL}; cfg.update({k: payload.get(k, cfg.get(k)) for k in GLOBAL.keys()})
                messages = payload.get("messages") or [{"role":"system","content":"ping"},{"role":"user","content":"ping"}]
                res = _complete_endpoint(cfg, {**payload, "messages": messages})
                self._set_headers(200); self.wfile.write(json_bytes(res)); return

            if self.path == "/api/complete":
                cfg = {**GLOBAL}
                res = _complete_endpoint(cfg, payload or {})
                self._set_headers(200); self.wfile.write(json_bytes(res)); return

            if self.path == "/api/save_message":
                # 保存消息到CSV
                round_num = payload.get("round", 1)
                agent_id = payload.get("agentId", "")
                agent_name = payload.get("agentName", "")
                system_text = payload.get("systemText", "")
                user_text = payload.get("userText", "")
                response_text = payload.get("responseText", "")
                tokens = payload.get("tokens", 0)
                latency = payload.get("latency", 0)
                
                save_message_to_csv(round_num, agent_id, agent_name, system_text, user_text, response_text, tokens, latency)
                self._set_headers(200); self.wfile.write(json_bytes({"status":200,"message":"消息已保存"})); return

            if self.path == "/api/export":
                # 导出CSV文件
                result = export_csv_with_sequence()
                if result["ok"]:
                    self._set_headers(200); self.wfile.write(json_bytes({"status":200,"filename":result["filename"],"message":f"已导出为 {result['filename']}"})); return
                else:
                    self._set_headers(500); self.wfile.write(json_bytes({"status":500,"error":result["error"]})); return

            if self.path == "/api/init_csv":
                # 初始化CSV文件
                init_csv_file()
                self._set_headers(200); self.wfile.write(json_bytes({"status":200,"message":"CSV文件已初始化"})); return

            self._set_headers(404); self.wfile.write(json_bytes({"status":404,"error":"Unknown endpoint"}))
        except Exception as e:
            self._set_headers(500); self.wfile.write(json_bytes({"status":500,"error":str(e)}))

def _open_browser():
    url = f"http://127.0.0.1:{PORT}/"
    def _task():
        try:
            time.sleep(0.3)
            webbrowser.open(url, new=2)  # new tab / new window
        except Exception:
            pass
    threading.Thread(target=_task, daemon=True).start()

def run():
    os.chdir(ROOT)
    # 初始化CSV文件
    init_csv_file()
    # 去掉这里重复的打印（init_csv_file 内部已有打印）
    # print(f"[MASS] CSV文件已初始化: {CSV_FILE}")
    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
        print(f"[MASS] Serving on http://127.0.0.1:{PORT}")
        # 仅在未设置 MASS_NO_OPEN 时自动打开浏览器，避免与 Start.bat 重复
        if not os.environ.get("MASS_NO_OPEN"):
            _open_browser()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass

if __name__ == "__main__":
    run()