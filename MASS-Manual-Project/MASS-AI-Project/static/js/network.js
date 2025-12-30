// static/js/network.js — v0.22.0 (generic events injection + shared builder)
(function(){
  function mapGranularityToLabel(g){g=String(g||'').toLowerCase();const m={day:'日',week:'周',month:'月',quarter:'季度',year:'年'};return m[g]||'回合';}
  function normDate(s){if(!s)return new Date().toISOString().slice(0,10);s=String(s).split('T')[0].replace(/\//g,'-');if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;try{return new Date(s).toISOString().slice(0,10);}catch(_){return new Date().toISOString().slice(0,10);}}
  // 模板编译函数 - 扩展支持agent seed数据
  function compilePrompt(text, sim, agent, round, injectData){
    const t=String(text||''),period=mapGranularityToLabel(sim&&sim.granularity),start=normDate(sim&&sim.startDate),steps=(sim&&sim.maxSteps)!=null?String(sim.maxSteps):'';
    
    let result = t.replace(/{{\s*(period|周期|粒度)\s*(\(\s*\))?\s*}}/gi, period)
            .replace(/{{\s*(start[_\s]?date|开始日期)\s*(\(\s*\))?\s*}}/gi, start)
            .replace(/{{\s*(max[_\s]?steps?|回合上限|回合数)\s*(\(\s*\))?\s*}}/gi, steps)
            .replace(/本回合（=本周）/g, `本回合（=${period}）`).replace(/本回合\(=本周\)/g, `本回合(=${period})`);
    
    // Round 1特殊处理：使用agent.seed数据替换占位符
    if (round === 1 && agent && agent.seed) {
      try {
        let seedData = {};
        
        if (typeof agent.seed === 'string') {
          // 字符串格式解析
          const lines = agent.seed.split('\n');
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            const equalIndex = trimmedLine.indexOf('=');
            if (equalIndex === -1) continue;
            
            const key = trimmedLine.substring(0, equalIndex).trim();
            const value = trimmedLine.substring(equalIndex + 1).trim();
            
            if (key) {
              seedData[key] = value;
            }
          }
        } else if (typeof agent.seed === 'object' && agent.seed !== null) {
          // JSON对象格式直接使用
          seedData = agent.seed;
        }
        
        // 计算衍生字段
        if (seedData.n_registers_open_11am && seedData.weekday_hours_open) {
          const registers = parseFloat(seedData.n_registers_open_11am) || 0;
          const hours = parseFloat(seedData.weekday_hours_open) || 0;
          seedData.fte = (registers * hours / 40).toFixed(2);
        }
        
        if (seedData.hires_realized && seedData.hire_attempts) {
          const hired = parseFloat(seedData.hires_realized) || 0;
          const attempted = parseFloat(seedData.hire_attempts) || 1;
          seedData.fill_rate = (hired / attempted).toFixed(2);
        }
        
        // 替换所有seed相关的占位符
        for (const [key, value] of Object.entries(seedData)) {
          const regex = new RegExp(`\\{${key}\\}`, 'g');
          result = result.replace(regex, String(value));
        }
        
      } catch (error) {
        console.warn('Agent seed数据处理失败:', error);
      }
    }
    
    // 使用注入数据替换占位符（适用于所有回合）
    if (injectData && typeof injectData === 'object') {
      for (const [key, value] of Object.entries(injectData)) {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        result = result.replace(regex, String(value));
      }
    }
    
    return result;
  }
  window.compilePrompt = window.compilePrompt || compilePrompt;

  // 网络请求工具函数
  async function httpPost(url, body){
    try{
      const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{}),credentials:'include',mode:'cors'});
      const t=await r.text(); let j=null; try{ j=JSON.parse(t); }catch(_){ }
      if(!r.ok){ 
        const errorMsg = `HTTP ${r.status}: ${r.statusText}${j && j.error ? ' - ' + j.error : ''}`;
        (window.appendError||console.error)(`${url} → ${errorMsg}`);
        return {ok:false,status:r.status,text:t,json:j};
      }
      return {ok:true,status:r.status,text:t,json:j};
    }catch(e){ 
      const errorMsg = `网络连接失败: ${e.message || e}`;
      (window.appendError||console.error)(`${url} → ${errorMsg}`);
      return {ok:false,status:0,text:String(e)};
    }
  }

  // API 接口函数 - 使用settings.js模块
async function saveConfig(){
  if (window.settingsManager) {
    return await window.settingsManager.save();
  }
  // 兼容性回退
  if (window.showLoading) window.showLoading('保存配置中...');
  try {
    const s=state.settings||{};
    const result = await httpPost('/api/config', s);
    if (window.hideLoading) window.hideLoading();
    
    if (result.ok && window.showToast) {
      window.showToast('配置保存成功', 'success');
    } else if (window.showToast) {
      window.showToast('配置保存失败', 'error');
    }
    
    return result;
  } catch (error) {
    if (window.hideLoading) window.hideLoading();
    if (window.showToast) window.showToast('保存配置时发生错误', 'error');
    throw error;
  }
}

async function testConnection(cfg){
  if (window.settingsManager) {
    return await window.settingsManager.testConnection();
  }
  // 兼容性回退
  if (window.showLoading) window.showLoading('测试连接中...');
  try {
    // 确保从UI读取最新设置
    if (typeof readUIToStateBasics === 'function') {
      try { readUIToStateBasics(); } catch(_) {}
    }
    
    const c=cfg||state.settings||{};
    // 转换字段名以匹配后端期望的格式
    const testPayload = {
      baseUrl: c.baseUrl || '',
      apiKey: c.apiKey || '',
      model: c.modelName || ''
      // 移除: temperature: Number(c.temperature) || 0.2
    };
    const result = await httpPost('/api/test', testPayload);
    if (window.hideLoading) window.hideLoading();
    
    // 更新测试结果显示
    const el=document.querySelector('#probe');
    const isSuccess = result.ok && result.json && result.json.status >= 200 && result.json.status < 300;
    
    if(el){ 
      if (result.ok && result.json && result.json.status) {
        el.textContent = `HTTP ${result.json.status} — ${result.json.head||''}`;
      } else if (result.ok) {
        el.textContent = `HTTP ${result.status}`;
      } else {
        el.textContent = `连接失败：${result.text}`;
      }
    }
    
    if (isSuccess && window.showToast) {
      window.showToast('连接测试成功', 'success');
    } else if (window.showToast) {
      const errorMsg = result.json && result.json.head ? result.json.head : '连接测试失败';
      window.showToast(errorMsg, 'error');
    }
    
    return result;
  } catch (error) {
    if (window.hideLoading) window.hideLoading();
    if (window.showToast) window.showToast('测试连接时发生错误', 'error');
    throw error;
  }
}

  // ===== Generic Events Runtime Injection =====
  function daysPer(g){ return (window.getDaysByGranularity?window.getDaysByGranularity(g):1) || 1; }
  function computeRoundDate(startDate, granularity, round){ const s = startDate ? new Date(startDate) : new Date(); const d = new Date(s.getTime()); const deltaDays = Math.round((Number(round||1)-1) * daysPer(granularity)); d.setDate(d.getDate()+deltaDays); return d.toISOString().slice(0,10); }
  function stringHash01(str){ let h=5381; for(let i=0;i<str.length;i++){ h=((h<<5)+h) + str.charCodeAt(i); h|=0; } const u=(h>>>0); return u/4294967295; }

  function get(obj, path, def){ try{ return String(path).split('.').reduce((x,k)=> (x && (k in x)) ? x[k] : undefined, obj) ?? def; }catch(_){ return def; } }
  function renderTemplate(txt, ctx){
    const s = String(txt||'');
    return s.replace(/{{\s*([\w$.]+)\s*}}/g, (_, key)=>{
      switch(key){
        case 'round': return String(ctx.round||'');
        case 'round_date': return String(ctx.round_date||'');
        case 'period': return String(ctx.period||'');
        case 'start_date': return String(ctx.start_date||'');
        case 'max_steps': return String(ctx.max_steps||'');
        case 'agent.id': return String(get(ctx,'agent.id',''));
        case 'agent.name': return String(get(ctx,'agent.name',''));
        default:
          if(key.startsWith('var.')) return String(get(ctx,'var.'+key.slice(4),''));
          if(key.startsWith('param.')) return String(get(ctx,'param.'+key.slice(6),''));
          return '';
      }
    });
  }

  function matchScope(agent, scope){
    const a = agent || {}; const sc = scope || {}; const mode = (sc.mode||'all').toLowerCase();
    if(mode==='all') return true;
    if(mode==='agents'){
      const ids = Array.isArray(sc.agents)? sc.agents : [];
      return !!ids.find(id => id && (a.id===id || a.name===id));
    }
    if(mode==='tags'){
      const tags = Array.isArray(sc.tags)? sc.tags.map(x=>String(x)) : [];
      const atags = Array.isArray(a.tags)? a.tags.map(x=>String(x)) : [];
      if (tags.length && atags.length && tags.some(t=>atags.includes(t))) return true;
      // fallback: match region or name contains tag
      if (tags.length){
        if (a.region && tags.includes(String(a.region))) return true;
        if (a.name && tags.find(t => String(a.name).includes(String(t)))) return true;
      }
      return false;
    }
    return true;
  }

  function evalExpr(expr, ctx){
    try{
      // very limited context
      const fn = new Function('ctx', 'with(ctx){ return !!('+expr+'); }');
      return !!fn(ctx);
    }catch(_){ return false; }
  }

  function isEventTriggered(ev, agent, round, roundDate, sim, options){
    if(!ev || ev.enabled===false) return false;
    const trg = ev.trigger || {}; let ok=false;
    if (trg.round!=null && Number.isFinite(Number(trg.round))) ok = ok || (Number(round||1) >= Number(trg.round));
    if (trg.date) ok = ok || (String(roundDate) >= String(trg.date).slice(0,10));
    if (trg.expr && String(trg.expr).trim()){
      const ctx = {
        round:Number(round||1), round_date:String(roundDate),
        period:mapGranularityToLabel(sim&&sim.granularity), start_date:normDate(sim&&sim.startDate), max_steps:(sim&&sim.maxSteps),
        agent:agent||{}, var:(sim&&sim.vars)||{}, param:(ev&&ev.params)||{}
      };
      ok = ok || evalExpr(String(trg.expr), ctx);
    }
    if(!ok) return false;
    // Lag handling (per-agent)
    const lag = ev.lag || {}; const share = Number(lag.share||0); const min = Number(lag.min||0); const max = Number(lag.max||0);
    if(share>0 && max>=min){
      const p = stringHash01(String((agent&&agent.id)||'')+':'+String(round)+':'+String(ev.id||ev.name||''));
      if(p < share){
        const off = Math.floor(min + (max-min+1)*p);
        if (off>0){ return Number(round||1) >= ( (trg.round!=null?Number(trg.round):Number(round||1)) + off ); }
      }
    }
    return true;
  }

  function linesFromTemplate(tpl, ctx){
    if(!tpl) return [];
    const arr = Array.isArray(tpl) ? tpl : String(tpl).split(/\r?\n/);
    const out = [];
    for(const line of arr){
      const s = String(line || '').trim();
      if(s) out.push(renderTemplate(s, ctx));
    }
    return out;
  }

  async function buildSystemAndUserTexts(agent, round, sim) {
      console.log(`[buildSystemAndUserTexts] Building texts for agent: ${agent.id}, round: ${round}`);
      
      let systemParts = [];
      let userParts = [];
      
      // 生成注入胶囊（异步）
      const injectCapsule = await window.generateInjectCapsule(agent, round);
      console.log(`[buildSystemAndUserTexts] Generated inject capsule:`, injectCapsule);
      
      // 解析注入胶囊
      let injectData = {};
      if (injectCapsule) {
          const lines = injectCapsule.split('\n');
          for (const line of lines) {
              if (line.startsWith('[RC-')) continue;
              if (line.includes('=')) {
                  const [key, value] = line.split('=', 2);
                  injectData[key] = value;
              }
          }
      }
      console.log(`[buildSystemAndUserTexts] Parsed inject data:`, injectData);
      
      // 添加背景规则到system消息
      const st = window.state || {};
      const backgroundText = st.backgroundText || (st.sim && st.sim.bgRules) || '';
      if (backgroundText) {
          const compiledBackground = compilePrompt(backgroundText, sim, agent, round, injectData);
          systemParts.push(compiledBackground);
      }
      
      // 处理system prompt
      if (sim.systemPrompt) {
          const compiledSystem = compilePrompt(sim.systemPrompt, sim, agent, round, injectData);
          systemParts.push(compiledSystem);
      }
      
      // 处理agent prompt
      if (agent.prompt) {
          const compiledAgent = compilePrompt(agent.prompt, sim, agent, round, injectData);
          userParts.push(compiledAgent);
      }
      
      // 添加注入胶囊到用户消息
      if (injectCapsule) {
          userParts.push(injectCapsule);
      }
      
      return {
          systemText: systemParts.join('\n\n'),
          userText: userParts.join('\n\n')
      };
  }

  async function callLLM(agent){
    const s = state.settings||{}; const sim = state.sim||{};
    const round = (typeof window.__currentRound!=='undefined') ? Number(window.__currentRound) : 1;
    const startTime = Date.now();
  
    const { systemText, userText } = await buildSystemAndUserTexts(agent, round, { preview:false });
  
    const body={
      baseUrl:(s.baseUrl||'').replace(/\/+$/,''), apiKey:s.apiKey||'', model:s.modelName||'',
      messages:[{role:'system',content:systemText},{role:'user',content:userText}]
    };
    
    try {
      const result = await httpPost('/api/complete', body);
      const endTime = Date.now();
  
      // 正确提取上游内容与tokens
      let responseContent = '';
      let tokenCount = null;
      if (result && result.ok && result.json) {
        const upstream = result.json.json || result.json; // 服务端包装的json里再嵌套一次json
        const choice = (upstream.choices && upstream.choices[0]) || null;
        responseContent = choice ? (choice.message && choice.message.content) || choice.text || '' : (result.json.raw || '');
        if (upstream && upstream.usage) {
          tokenCount = upstream.usage.total_tokens || ((upstream.usage.prompt_tokens||0) + (upstream.usage.completion_tokens||0));
        }
      } else {
        // httpPost已捕获错误，这里给出更友好的失败信息
        responseContent = `（请求失败）${result && result.status ? ' HTTP ' + result.status : ''} ${result && result.text ? String(result.text) : ''}`.trim();
      }
  
      // 写入聊天记录（持久化到CSV）
      if (window.addChatLog) {
        window.addChatLog({
          round: round,
          agentId: agent ? agent.id : '',
          agentName: agent ? (agent.name || agent.id) : '',
          timestamp: new Date().toISOString(),
          systemText: systemText,
          userText: userText,
          responseText: responseContent,
          tokens: tokenCount,
          latency: endTime - startTime
        });
      }
  
      // 兼容字段，避免其他地方读取result.content为空
      result.content = responseContent;
      const upstreamForUsage = result && result.json && (result.json.json || result.json);
      result.usage = upstreamForUsage && upstreamForUsage.usage ? upstreamForUsage.usage : null;
  
      return result;
    } catch (error) {
      // Still record failed attempts
      if (window.addChatLog) {
        window.addChatLog({
          round: round,
          agentId: agent ? agent.id : '',
          agentName: agent ? (agent.name || agent.id) : '',
          timestamp: new Date().toISOString(),
          systemText: systemText,
          userText: userText,
          responseText: '（请求失败）',
          tokens: null,
          latency: Date.now() - startTime
        });
      }
      throw error;
    }
  }

  // expose shared builder for preview
  window.buildSystemAndUserTexts = buildSystemAndUserTexts;

  // bind save config button
  function bindSaveConfigButton(){
    const btn = document.querySelector('#btnSaveCfg');
    if (btn && !btn.__bound_saveconfig){
      btn.addEventListener('click', async e=>{
        e.preventDefault();
        e.stopPropagation();
        await saveConfig();
      });
      btn.__bound_saveconfig = true;
    }
  }

  // bind test connection button
  function bindTestButton(){
    const btn = document.querySelector('#btnTest');
    if (btn && !btn.__bound_test){
      btn.addEventListener('click', async e=>{
        e.preventDefault();
        e.stopPropagation();
        await testConnection();
      });
      btn.__bound_test = true;
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    bindTestButton();
    bindSaveConfigButton();
  });

  window.saveConfig=saveConfig; window.testConnection=testConnection; window.callLLM=callLLM; window.mapGranularityToLabel=mapGranularityToLabel;
})();