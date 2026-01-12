// static/js/io.js — v0.21.7 (Import restored + 3-column export)
(function(){
  const qs = s => document.querySelector(s);

  // --------- Import (minimal, safe) ---------
  function ensureState(){
    window.state = window.state || {};
    const st = window.state;
    st.sim = st.sim || {};
    st.sim.events = Array.isArray(st.sim.events) ? st.sim.events : [];
    st.sim.vars = st.sim.vars || {};
    if (!st.agents) st.agents = [];
    if (!st.tickData) st.tickData = [];
    if (!st.logs) st.logs = [];
    if (!st.chatLog) st.chatLog = [];
    if (!st.reviewSettings) st.reviewSettings = { enabled: true, maxLength: 200 };
  }
  function appendLog(msg, options = {}){
    ensureState();
    try {
      const time = new Date().toLocaleTimeString();
      const tb = qs('#logBody');
      if (tb){
        const tr = document.createElement('tr');
        
        // 检查是否有详细信息（system/user/response）
        if (options.systemText || options.userText || options.responseText) {
          const expandId = 'expand_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          tr.innerHTML = `
            <td>${options.round || ''}</td>
            <td>${time}</td>
            <td>${options.agentName || '导入'}</td>
            <td>${options.event || '日志'}</td>
            <td>
              ${String(msg)}
              <button class="expand-btn" data-expand-id="${expandId}" style="margin-left:8px;padding:2px 6px;font-size:11px;border:1px solid #2b3a50;background:#0f1520;color:#93a4b7;border-radius:4px;cursor:pointer;">展开</button>
              <div id="${expandId}" class="expand-content" style="display:none;margin-top:8px;padding:8px;background:#0b1018;border:1px solid #223044;border-radius:6px;font-size:11px;">
                ${options.systemText ? `<div><strong>System:</strong><pre style="white-space:pre-wrap;margin:4px 0;">${escapeHtml(options.systemText)}</pre></div>` : ''}
                ${options.userText ? `<div><strong>User:</strong><pre style="white-space:pre-wrap;margin:4px 0;">${escapeHtml(options.userText)}</pre></div>` : ''}
                ${options.responseText ? `<div><strong>Response:</strong><pre style="white-space:pre-wrap;margin:4px 0;">${escapeHtml(options.responseText)}</pre></div>` : ''}
              </div>
            </td>`;
        } else {
          tr.innerHTML = `<td></td><td>${time}</td><td>导入</td><td>日志</td><td>${String(msg)}</td>`;
        }
        
        tb.appendChild(tr);
        
        // 绑定展开/收起事件
        const expandBtn = tr.querySelector('.expand-btn');
        if (expandBtn) {
          expandBtn.addEventListener('click', function() {
            const expandId = this.getAttribute('data-expand-id');
            const content = document.getElementById(expandId);
            if (content) {
              if (content.style.display === 'none') {
                content.style.display = 'block';
                this.textContent = '收起';
              } else {
                content.style.display = 'none';
                this.textContent = '展开';
              }
            }
          });
        }
      }
    } catch(_) {}
  }
  
  // HTML转义函数
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 添加聊天记录
  function addChatLog(chatItem) {
    ensureState();
    const st = window.state;
    if (!Array.isArray(st.chatLog)) st.chatLog = [];
    
    const logEntry = {
      round: chatItem.round || 1,
      agentId: chatItem.agentId || '',
      agentName: chatItem.agentName || '',
      timestamp: chatItem.timestamp || new Date().toISOString(),
      systemText: chatItem.systemText || '',
      userText: chatItem.userText || '',
      responseText: chatItem.responseText || '',
      tokens: chatItem.tokens || 0,
      latency: chatItem.latency || 0
    };
    
    // 保存到Excel而不是内存
    saveMessageToExcel(logEntry);
    
    // 仍然保留少量记录在内存中用于回顾功能
    st.chatLog.push(logEntry);
    if (st.chatLog.length > 100) {
      st.chatLog.splice(0, st.chatLog.length - 100);
    }
  }
  
  // 保存消息到Excel
  function saveMessageToExcel(logEntry) {
    console.log('准备保存消息到Excel:', logEntry); // 添加调试信息
    
    fetch('/api/save_message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(logEntry)
    })
    .then(response => {
      console.log('保存消息响应状态:', response.status); // 添加调试信息
      return response.json();
    })
    .then(data => {
      console.log('保存消息成功:', data); // 添加调试信息
    })
    .catch(err => {
      console.error('保存消息到Excel失败:', err);
      // 添加更详细的错误信息
      if (err.response) {
        console.error('响应错误:', err.response.status, err.response.statusText);
      }
    });
  }


  function applyBundleToState(bundle){
    ensureState();
    const st = window.state;
    try{
      const obj = (typeof bundle === 'string') ? JSON.parse(bundle) : bundle;
      if (!obj || typeof obj !== 'object') { appendLog('导入失败：格式错误'); return false; }
  
      // sim - 基础字段兼容
      const srcSim = obj.sim || obj.settings || obj.config || {};
      const sim = window.state.sim;
  
      // 统一 period/granularity 到 sim.granularity（系统全局都用 granularity）
      const newGran = srcSim.granularity || srcSim.period || obj.period;
      if (newGran) {
        sim.granularity = String(newGran).toLowerCase();
        // 兼容保留 sim.period（旧数据有用到），但以 granularity 为准
        sim.period = sim.period || String(newGran).toLowerCase();
      }
  
      // 兼容 sim.start_date/startDate（同时兼容顶层）
      const newStart = srcSim.startDate || srcSim.start_date || obj.start_date || obj.startDate;
      if (newStart) {
        sim.startDate = String(newStart).slice(0, 10);
      }
  
      // 兼容 max_steps/maxSteps
      if (srcSim.maxSteps != null || srcSim.max_steps != null) {
        sim.maxSteps = (srcSim.maxSteps ?? srcSim.max_steps);
      }
  
      // Background import: support sim.bgRules / sim.background / top-level backgroundText
      const bgText = (srcSim.bgRules || srcSim.background || srcSim.bg || obj.backgroundText || obj.background || '').toString();
      if (bgText) {
        sim.bgRules = bgText;
        window.state.backgroundText = bgText;
  
        // 同步到 settingsManager，以便 writeToUI() 使用最新值渲染到文本域
        if (window.settingsManager && window.settingsManager.settings) {
          try {
            window.settingsManager.settings.simulation = window.settingsManager.settings.simulation || {};
            window.settingsManager.settings.simulation.bgRules = bgText;
            if (typeof window.settingsManager.syncToGlobalState === 'function') {
              window.settingsManager.syncToGlobalState();
            }
          } catch(_) {}
        }
      }
      // events - 兼容 sim.events
      if (Array.isArray(srcSim.events)){
        sim.events = srcSim.events.map(ev=>({ ...ev }));
      }
      // legacy: policyEvents -> merge into events
      if (Array.isArray(srcSim.policyEvents)) {
        const legacy = srcSim.policyEvents.map((ev,i)=>({
          id: ev.id || ('legacy_'+i+'_'+Date.now()),
          enabled: ev.enabled !== false,
          name: String(ev.name||'').trim() || '未命名事件',
          scope: (ev.scope && ev.scope!=='All') ? {mode:'tags', tags:[ev.scope]} : {mode:'all'},
          trigger: { round: (ev.policy_round!=null? Number(ev.policy_round): undefined), date: ev.start_date || undefined },
          lag: { min: Number(ev.lag_weeks_min||0), max: Number(ev.lag_weeks_max||0), share: Number(ev.lag_share||0) },
          template: { system: `（本回合：事件"${ev.name||ev.type}"已生效；范围=${ev.scope||'All'}${ev.note?`；${ev.note}`:''}）` },
          params: (typeof ev.params==='object' && ev.params) ? ev.params : {},
          once: false,
          note: ev.note || ''
        }));
        sim.events = (sim.events||[]).concat(legacy);
        // also keep original for strict backward compatibility
        sim.policyEvents = srcSim.policyEvents.map(ev=>({
          enabled: ev.enabled !== false,
          name: String(ev.name||'').trim() || '未命名事件',
          scope: (ev.scope==='NJ'||ev.scope==='PA'||ev.scope==='All') ? ev.scope : 'All',
          policy_round: (ev.policy_round!=null && Number.isFinite(Number(ev.policy_round))) ? Number(ev.policy_round) : null,
          start_date: ev.start_date ? String(ev.start_date).slice(0,10) : (ev.startDate?String(ev.startDate).slice(0,10):null),
          type: ev.type || 'generic',
          params: (typeof ev.params==='object' && ev.params) ? ev.params : {},
          lag_weeks_min: Number.isFinite(Number(ev.lag_weeks_min)) ? Number(ev.lag_weeks_min) : 0,
          lag_weeks_max: Number.isFinite(Number(ev.lag_weeks_max)) ? Number(ev.lag_weeks_max) : 0,
          lag_share: Number.isFinite(Number(ev.lag_share)) ? Math.max(0, Math.min(1, Number(ev.lag_share))) : 0,
          note: ev.note || ''
        }));
      }
      // vars - 兼容 sim.vars
      if (srcSim.vars && typeof srcSim.vars==='object'){
        sim.vars = { ...srcSim.vars };
      }
      
      // api/settings (支持多种格式)
      const srcApi = obj.api || obj.settings || obj.settings_full || obj.settings_meta || {};
      // 确保settings对象存在
      if (!window.state.settings) window.state.settings = {};
      const set = window.state.settings;
      
      if (srcApi.baseUrl) set.baseUrl = srcApi.baseUrl;
      if (srcApi.apiKey) set.apiKey = srcApi.apiKey;
      if (srcApi.modelName) set.modelName = srcApi.modelName;
      if (srcApi.multiApi != null) set.multiApi = !!srcApi.multiApi;
  
      // agents - v3 JSON兼容：按顺序兜底 obj.agents → obj.sim?.agents → obj.entities
      let agentSource = null;
      if (Array.isArray(obj.agents)) {
        agentSource = obj.agents;
        appendLog('从 obj.agents 读取到 ' + agentSource.length + ' 个Agent');
      } else if (Array.isArray(obj.sim?.agents)) {
        agentSource = obj.sim.agents;
        appendLog('从 obj.sim.agents 读取到 ' + agentSource.length + ' 个Agent');
      } else if (Array.isArray(obj.entities)) {
        agentSource = obj.entities;
        appendLog('从 obj.entities 读取到 ' + agentSource.length + ' 个Agent');
      }
      
      if (agentSource) {
        // 归一化字段处理
        window.state.agents = agentSource.map((a, i) => {
          const normalizedAgent = {
            // id：缺失则 A001、A002…补齐
            id: a.id || `A${String(i + 1).padStart(3, '0')}`,
            // name：name/title/id 其一
            name: a.name || a.title || a.id || `A${String(i + 1).padStart(3, '0')}`,
            // prompt：prompt/text/desc 其一
            prompt: a.prompt || a.text || a.desc || '',
            // enabled：默认启用
            enabled: a.enabled !== false,
            // tags：支持数组或逗号字符串
            tags: Array.isArray(a.tags) ? a.tags : 
                  (typeof a.tags === 'string' ? a.tags.split(',').map(s => s.trim()).filter(Boolean) : []),
            // region：region/scope/state 其一
            region: a.region || a.scope || a.state || '',
            // 保留其他字段
            perApiEnabled: a.perApiEnabled || false,
            perApi: a.perApi || {},
            type: a.type || 'default'
          };
          return normalizedAgent;
        });
        
        appendLog(`成功导入 ${window.state.agents.length} 个Agent配置`);
      } else {
        appendLog('未找到Agent数据，保持现有配置');
      }
  
      // Sync UI for background text area
      window.state.backgroundText = sim.bgRules || window.state.backgroundText || '';
      if (typeof writeStateToUIBasics === 'function') {
        writeStateToUIBasics();
      } else {
        // Fallback: try to update background textarea directly
        try {
          const bgTextarea = document.querySelector('#bgRules');
          if (bgTextarea && window.state.backgroundText) {
            bgTextarea.value = window.state.backgroundText;
          }
        } catch(_) {}
      }
      
      // 触发渲染
      if (typeof window.renderAgents === 'function') {
        try { 
          window.renderAgents(); 
          appendLog(`Agent列表已渲染，当前数量：${window.state.agents.length}`);
        } catch(e) {
          console.error('渲染Agent列表失败:', e);
          appendLog('渲染Agent列表失败：' + e.message);
        }
      }
      
      if (typeof window.renderEvents === 'function') {
        try { 
          window.renderEvents(); 
        } catch(e) { 
          if (typeof window.renderPolicyEvents === 'function') {
            try { 
              window.renderPolicyEvents(); 
            } catch(__) {}
          }
        }
      }
      
      appendLog('已导入配置（JSON）');
      return true;
    } catch(e) {
      console.error('导入配置失败:', e);
      appendLog('导入失败：' + e.message);
      return false;
    }
  }
  function bindImport(){
    const file = qs('#importFile');
    const btn  = qs('#btnImport');
    if (file && !file.__bound){
      file.addEventListener('change', async e=>{
        const f = e.target.files && e.target.files[0];
        if(!f) return;
        const txt = await f.text();
        applyBundleToState(txt);
        file.value='';
      });
      file.__bound = true;
    }
    if (btn && !btn.__bound){
      btn.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); const f=qs('#importFile'); if(f) f.click(); });
      btn.__bound = true;
    }
  }

  // --------- Export (3 columns: agent, round, content) ---------
  function exportCSV3(){
    const st = window.state || {}; const data = Array.isArray(st.tickData)? st.tickData : [];
    const agents = st.agents || [];
    const id2name = {}; agents.forEach(a=>{ if(a && a.id) id2name[a.id]=a.name||a.id; });

    const rows = [['agent','round','content']];
    for(const r of data){
      const name = id2name[r.entityId] || r.entityId || '';
      const round = r.tick != null ? String(r.tick) : '';
      const content = (r.content_raw != null ? String(r.content_raw) : (r.result != null ? String(r.result) : ''));
      const cell = v => JSON.stringify(String(v==null?'':v)); // CSV safe
      rows.push([cell(name), cell(round), cell(content)].join(','));
    }
    const blob = new Blob([rows.join('\n')], {type:'text/csv;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mass_results_minimal.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  
  // --------- Export Excel ---------
  function exportExcel(){
    fetch('/api/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === 200) {
        alert(`导出成功：${data.filename}`);
      } else {
        alert(`导出失败：${data.error || '未知错误'}`);
      }
    })
    .catch(err => {
      console.error('导出Excel失败:', err);
      alert('导出Excel失败，请检查控制台');
    });
  }
  // 下载配置包函数
  function downloadBundle(){
    const bundle = exportFullBundle();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {type:'application/json;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mass_config_bundle.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function bindExport(){
    const btn = qs('#btnDownloadCSV');
    if(btn && !btn.__bound_minimal){
      btn.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); exportCSV3(); });
      btn.__bound_minimal = true;
    }
    
    const chatLogBtn = qs('#btnDownloadChatLog');
    if(chatLogBtn && !chatLogBtn.__bound_chatlog){
      chatLogBtn.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); exportExcel(); });
      chatLogBtn.__bound_chatlog = true;
    }
    
    const bundleBtn = qs('#btnDownloadBundle');
    if(bundleBtn && !bundleBtn.__bound_bundle){
      bundleBtn.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); downloadBundle(); });
      bundleBtn.__bound_bundle = true;
    }
  }

  function exportFullBundle(){
    ensureState();
    const st = window.state;
    const out = { agents: st.agents, sim: { ...st.sim, policyEvents: undefined } };
    // 只输出新字段
    out.sim.events = Array.isArray(st.sim.events)? st.sim.events : [];
    out.sim.vars = st.sim.vars || {};
    // 导出API设置
    if (st.settings) {
      out.api = {
        baseUrl: st.settings.baseUrl,
        apiKey: st.settings.apiKey,
        modelName: st.settings.modelName,
        multiApi: st.settings.multiApi
      };
    }
    // 其他已有导出字段保持不变
    return out;
  }

  // 暴露chatLog相关函数到全局 - 修复appendLog未定义问题
  window.appendLog = appendLog;
  window.addChatLog = addChatLog;
  window.exportExcel = exportExcel;
  window.exportFullBundle = exportFullBundle;
  
  // 调试信息：确认appendLog已暴露
  console.log('io.js loaded, appendLog exposed:', typeof window.appendLog);

  document.addEventListener('DOMContentLoaded', ()=>{ bindImport(); bindExport(); });
})();
