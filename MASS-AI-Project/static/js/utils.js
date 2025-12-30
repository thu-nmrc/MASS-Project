// DOM 工具函数
if (!window.$) {
  window.$ = s => document.querySelector(s);
}

// 时间粒度配置
const ticksPer = {"day":1,"week":7,"month":30.44,"quarter":91.31,"year":365.25};

// 日期处理工具函数
function fmtDate(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function addDays(date, days){
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function decadeOfDate(d){
  const y = d.getFullYear();
  const base = y - (y % 10);
  return `${base}年代`;
}

// 确保granLabel函数全局可访问
window.granLabel = function(key){
  return {"day":"天","week":"周","month":"月","quarter":"季","year":"年"}[key] || key;
};

// 添加根据粒度计算实际天数的函数
function getDaysByGranularity(granularity) {
  return ticksPer[granularity] || 1;
}

// 导出函数供其他模块使用
window.getDaysByGranularity = getDaysByGranularity;
window.appendError = appendError;

// 修改appendError函数，确保日志安全
function appendError(msg) {
  try {
    const el = document.getElementById('errConsole');
    if(!el) return;
    // 内部自生成时间戳
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const line = `[${timeString}] ${msg}`;
    el.textContent = (el.textContent ? el.textContent + "\n" : "") + line;
    el.scrollTop = el.scrollHeight;

    // 检查state和state.logs是否存在
    if (window.state && Array.isArray(window.state.logs)) {
      window.state.logs.push({
        step: '',
        time: now.toLocaleString(), // 使用完整时间戳
        actor: '系统',
        event: '错误',
        summary: msg
      });
    }
  } catch (e) {
    // 确保日志函数自身不会抛错
    console.error('appendError failed:', e);
  }
}



function safeJsonExtract(s){
  if(!s) return null;
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if(a >= 0 && b > a){
    try{ return JSON.parse(s.slice(a, b+1)); }
    catch(_){}
  }
  return null;
}

// 输入验证函数
function validateInput(value, type, options = {}) {
  const { min, max, required = false } = options;
  
  // 检查必填项
  if (required && (value === null || value === undefined || value === '')) {
    return { valid: false, error: '此字段为必填项' };
  }
  
  // 如果不是必填且为空，则通过验证
  if (!required && (value === null || value === undefined || value === '')) {
    return { valid: true };
  }
  
  switch (type) {
    case 'number':
      const num = Number(value);
      if (isNaN(num)) {
        return { valid: false, error: '请输入有效的数字' };
      }
      if (min !== undefined && num < min) {
        return { valid: false, error: `数值不能小于 ${min}` };
      }
      if (max !== undefined && num > max) {
        return { valid: false, error: `数值不能大于 ${max}` };
      }
      break;
      
    case 'url':
      try {
        new URL(value);
      } catch {
        return { valid: false, error: '请输入有效的URL地址' };
      }
      break;
      
    case 'date':
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return { valid: false, error: '请输入有效的日期格式 (YYYY-MM-DD)' };
      }
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return { valid: false, error: '请输入有效的日期' };
      }
      break;
      
    case 'string':
      if (min !== undefined && value.length < min) {
        return { valid: false, error: `长度不能少于 ${min} 个字符` };
      }
      if (max !== undefined && value.length > max) {
        return { valid: false, error: `长度不能超过 ${max} 个字符` };
      }
      break;
  }
  
  return { valid: true };
}

// UI反馈函数
function showLoading(message = '加载中...') {
  let loadingEl = document.getElementById('loading-indicator');
  if (!loadingEl) {
    loadingEl = document.createElement('div');
    loadingEl.id = 'loading-indicator';
    loadingEl.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 20px;
      border-radius: 5px;
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 10px;
    `;
    document.body.appendChild(loadingEl);
  }
  loadingEl.innerHTML = `
    <div style="
      width: 20px;
      height: 20px;
      border: 2px solid #ffffff;
      border-top: 2px solid transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    "></div>
    <span>${message}</span>
  `;
  loadingEl.style.display = 'flex';
  
  // 添加旋转动画
  if (!document.getElementById('loading-styles')) {
    const style = document.createElement('style');
    style.id = 'loading-styles';
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
}

function hideLoading() {
  const loadingEl = document.getElementById('loading-indicator');
  if (loadingEl) {
    loadingEl.style.display = 'none';
  }
}

function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  const colors = {
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336'
  };
  
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colors[type] || colors.info};
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    z-index: 10001;
    max-width: 300px;
    word-wrap: break-word;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    transform: translateX(100%);
    transition: transform 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // 动画显示
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 10);
  
  // 自动隐藏
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}

// 将函数暴露到 window 对象
window.validateInput = validateInput;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showToast = showToast;