
// simulation.js — v0.21.5 (raw log only: content_raw)
// simRunning 变量现在由 controls.js 管理
// let simRunning = false;
function _periodLabel(g){ return (typeof window.mapGranularityToLabel==='function')?window.mapGranularityToLabel(g):((g=String(g||'').toLowerCase(), {day:'日',week:'周',month:'月',quarter:'季度',year:'年'}[g])||'回合'); }
function _num(v,d=0){ const n=Number(v); return Number.isFinite(n)?n:d; }
function _clip(s,n=200){ s=String(s||''); return s.length>n?s.slice(0,n)+'…':s; }
function _normalizeTokens(u){ if(!u)return 0; const t=u.total_tokens??u.totalTokens; if(Number.isFinite(t))return Number(t); const ins=u.input_tokens??u.inputTokens??0, outs=u.output_tokens??u.outputTokens??0; const sum=Number(ins)+Number(outs); return Number.isFinite(sum)?sum:0; }
function _stripCodeFences(s){ if(!s)return s; return String(s).replace(/```json\s*|```\s*$/gi,'').replace(/^```/,'').replace(/```$/,''); }
function _parseContentToJSON(c){ if(typeof c!=='string')return null; let t=c.trim(); try{return JSON.parse(t);}catch(_){ } try{return JSON.parse(_stripCodeFences(t));}catch(_){ } if(typeof window.safeJsonExtract==='function'){ try{return window.safeJsonExtract(t);}catch(_){ } } const a=t.indexOf('{'), b=t.lastIndexOf('}'); if(a>=0&&b>a){ try{return JSON.parse(t.slice(a,b+1));}catch(_){ } } return null; }

async function runOneTick(tickNumber, granularity){
  const state = window.state || (window.state = {});
  const sim = state.sim || {};
  const enabledAgents = (typeof getEnabledAgents==='function'?getEnabledAgents():(state.agents||[])).filter(a=>a&&(a.enabled!==false));
  if(!enabledAgents.length){ 
    appendLog&&appendLog('没有启用的Agent，发送背景信息',{event:'日志'}); 
    // 发送背景信息到服务器
    try {
      const backgroundData = {
        tick: tickNumber,
        entityId: 'BACKGROUND',
        entityType: 'system',
        action: 'background',
        result: '发送背景信息',
        status: 'ok',
        tokens: 0,
        latency_ms: 0,
        error_code: ''
      };
      if(!Array.isArray(state.tickData)) state.tickData=[];
      state.tickData.push(backgroundData);
      
      // 调用背景信息API
      if(typeof callLLM==='function') {
        const backgroundAgent = {
          id: 'BACKGROUND',
          name: '背景信息',
          prompt: '发送当前回合的背景信息和环境状态',
          type: 'background'
        };
        const res = await callLLM(backgroundAgent);
        if(res && res.json) {
          appendLog&&appendLog('背景信息已发送',{event:'日志'});
        }
      }
    } catch(e) {
      appendLog&&appendLog('发送背景信息时出错: ' + e.message,{event:'错误'});
    }
    return; 
  }
  if(!Array.isArray(state.tickData)) state.tickData=[];

  for(let i=0;i<enabledAgents.length;i++){
    // 检查是否已停止模拟
    if(!window.simRunning) {
      appendLog&&appendLog('模拟已停止，中断Agent处理',{event:'日志'});
      return;
    }
    
    const agent = enabledAgents[i];
    const agentData = {tick:tickNumber,entityId:agent.id||('A'+String(i+1).padStart(3,'0')),entityType:agent.type||'agent',action:'think',result:'',status:'ok',tokens:0,latency_ms:0,error_code:''};
    const t0 = performance.now();
    try{
      const res = await (typeof callLLM==='function'?callLLM(agent):Promise.resolve({ok:false,status:0}));
      agentData.latency_ms = Math.round(performance.now()-t0);

      if(!res){ agentData.status='error'; agentData.error_code='no_response'; state.tickData.push(agentData); continue; }

      const env = res.json || {};
      const upstream = env.json || env || {};
      const upstreamStatus = Number(env.status||0);
      const hasError = (!!upstream && typeof upstream==='object' && 'error' in upstream);

      const choice = (upstream.choices && upstream.choices[0]) || null;
      const content = choice ? (choice.message && choice.message.content) || choice.text || '' : (env.raw || '');
      agentData.content_raw = String(content ?? '');   // <-- 新增

      if (upstreamStatus >= 400 || hasError){
        agentData.status = 'error';
        agentData.error_code = (upstream && upstream.error && (upstream.error.type || upstream.error.code)) || String(upstreamStatus || 'upstream_error');
        const msg = (upstream && upstream.error && upstream.error.message) || env.head || '';
        agentData.result = _clip(msg || JSON.stringify(upstream) || '', 400);
        appendLog && appendLog(`Agent ${agentData.entityId} 第${tickNumber}${_periodLabel(granularity)}上游错误：${agentData.error_code} ${msg||''}`.trim(), {event:'日志'});
        state.tickData.push(agentData); continue;
      }

      agentData.tokens = _normalizeTokens(upstream.usage||{});
      const parsed = _parseContentToJSON(content);
      
      // 处理回填胶囊：从模型回复中提取并存储
      if (typeof window.processReturnCapsule === 'function') {
        try {
          window.processReturnCapsule(agent, content, tickNumber);
        } catch (error) {
          console.warn('回填胶囊处理失败:', error);
        }
      }
      
      if(parsed) agentData.result = JSON.stringify(parsed);
      else if(content){ agentData.result = content; appendLog&&appendLog(`Agent ${agentData.entityId} 第${tickNumber}${_periodLabel(granularity)}返回非JSON，已保存完整内容。`,{event:'日志'}); }
      else { agentData.status='error'; agentData.error_code='empty_content'; agentData.result=''; appendLog&&appendLog(`Agent ${agentData.entityId} 第${tickNumber}${_periodLabel(granularity)}返回空响应。`,{event:'日志'}); }
      
      // 从chatLog中获取详细信息并记录到消息表
      if (appendLog && window.state && window.state.chatLog) {
        const chatLogs = window.state.chatLog.filter(log => 
          log.agentId === agentData.entityId && log.round === tickNumber
        );
        if (chatLogs.length > 0) {
          const latestLog = chatLogs[chatLogs.length - 1];
          const summary = parsed ? '返回JSON' : (content ? '返回文本' : '无响应');
          appendLog(`${summary} (${agentData.tokens} tokens, ${agentData.latency_ms}ms)`, {
            round: tickNumber,
            agentName: agent.name || agent.id,
            event: 'LLM调用',
            systemText: latestLog.systemText,
            userText: latestLog.userText,
            responseText: latestLog.responseText
          });
        }
      }

    }catch(e){
      agentData.status='error'; agentData.error_code='exception'; agentData.result=_clip(String(e),200);
      appendLog&&appendLog(`Agent ${agentData.entityId} 第${tickNumber}${_periodLabel(granularity)}异常：${agentData.result}`,{event:'日志'});
    }
    state.tickData.push(agentData);
  }
}

async function startSimulation(){
  // 使用全局 simRunning 变量
  if(window.simRunning) return; 
  window.simRunning = true;
  
  // 调试信息：检查状态
  console.log('开始模拟 - 当前状态:', window.state);
  
  if(typeof readUIToStateBasics==='function'){ try{ readUIToStateBasics(); }catch(_){ } }
  if(typeof setBtnState==='function') setBtnState('running');
  
  const { sim } = window.state || {sim:{}};
  const lbl = _periodLabel(sim.granularity);
  let maxRounds = _num(sim.maxSteps,46); 
  if(!Number.isFinite(maxRounds)||maxRounds<=0||maxRounds>200) maxRounds=46;
  
  // 检查启用的Agent
  const enabledAgents = (typeof getEnabledAgents==='function'?getEnabledAgents():(window.state.agents||[])).filter(a=>a&&(a.enabled!==false));
  console.log('启用的Agent数量:', enabledAgents.length);
  console.log('启用的Agent列表:', enabledAgents);
  
  if(!enabledAgents.length){
    appendLog&&appendLog('⚠️ 当前没有启用的Agent，将仅发送背景信息。',{event:'警告'});
  }
  
  // 如果是继续运行，从当前回合开始
  const startRound = window.__currentRound || 1;
  
  if(startRound === 1) {
    if(enabledAgents.length > 0) {
      appendLog&&appendLog(`模拟开始，共${maxRounds}${lbl}，启用Agent: ${enabledAgents.length}个`,{event:'日志'});
    } else {
      appendLog&&appendLog(`模拟开始，共${maxRounds}${lbl}，将发送背景信息`,{event:'日志'});
    }
  } else {
    appendLog&&appendLog(`模拟从第${startRound}${lbl}继续运行…`,{event:'日志'});
  }
  
  for(let cur=startRound; cur<=maxRounds && window.simRunning; cur++){
    window.__currentRound=cur; 
    appendLog&&appendLog(`===== 第${cur}${lbl}开始 =====`,{event:'日志'});
    const t0=Date.now(); 
    await runOneTick(cur, sim.granularity);
    appendLog&&appendLog(`第${cur}${lbl}完成，耗时 ${Math.round((Date.now()-t0)/1000)} 秒`,{event:'日志'});
  }
  
  window.simRunning=false; 
  if(typeof setBtnState==='function') setBtnState('finished'); 
  if(typeof window.onSimFinished==='function') window.onSimFinished();
}
window.startSimulation = startSimulation;
