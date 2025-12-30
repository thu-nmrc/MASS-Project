function nextAgentId(){
  let max = 0;
  // 检查state.agents是否存在且为数组
  if (!Array.isArray(state.agents)) {
    return 'A001';
  }
  for(const a of state.agents){
    if (!a.id) continue;
    const m = /^A(\d+)$/.exec(a.id);
    if(m){
      const n = parseInt(m[1], 10);
      if(n > max) max = n;
    } else {
      // 如果ID格式不符合Axxx，则将其视为0
      max = Math.max(max, 0);
    }
  }
  return 'A' + String(max + 1).padStart(3, '0');
}

function addAgentFromUI(){
  const name = $('#agentName').value.trim();
  const prompt = $('#agentPrompt').value.trim();
  if(!name || !prompt){
    alert('请填写 Agent 名称与 Prompt');
    return;
  }
  state.agents.push({
    id: nextAgentId(),
    name,
    prompt,
    perApiEnabled: false,
    perApi: {},
    seed: '' // 新增seed字段，默认为空
  });
  $('#agentName').value = '';
  $('#agentPrompt').value = '';
  renderAgents();
}

// 修改renderAgents函数中的表格行生成部分
function renderAgents(){
  $('#agentCount').textContent = String(state.agents.length);
  const wrap = $('#agentList');
  wrap.innerHTML = '';

  // 创建表格容器
  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th style="width: 50px;"><input type="checkbox" id="selectAllAgents"></th>
        <th style="width: 120px;">名称</th>
        <th style="width: 100px;">类型</th>
        <th style="width: 80px;">API模式</th>
        <th>Prompt</th>
        <th style="width: 140px;">标签</th>
        <th style="width: 100px;">区域</th>
        <th style="width: 120px;">操作</th>
      </tr>
    </thead>
    <tbody id="agentTableBody"></tbody>
  `;
  wrap.appendChild(table);

  const tableBody = document.getElementById('agentTableBody');

  // 维护启用状态集合
  if (!window.enabledAgentsSet) {
    window.enabledAgentsSet = new Set();
    // 初始化集合 - 默认情况下所有Agent都是启用的
    state.agents.forEach(agent => {
      window.enabledAgentsSet.add(agent.id);
    });
  }

  for(const a of state.agents){
    const row = document.createElement('tr');
    const isEnabled = window.enabledAgentsSet.has(a.id);
    // 截取prompt的前50个字符，添加悬停显示完整内容
    const shortPrompt = a.prompt.length > 50 ? a.prompt.substring(0, 50) + '...' : a.prompt;
    const apiMode = a.perApiEnabled ? '独立' : '默认';
    const tagsTxt = Array.isArray(a.tags)? a.tags.join(',') : '';
    const regionTxt = a.region || '';

    row.innerHTML = `
      <td><input type="checkbox" class="agentEnableCheckbox" data-id="${a.id}" ${isEnabled ? 'checked' : ''}></td>
      <td title="${a.name}">${a.name}</td>
      <td>${a.type || 'default'}</td>
      <td>${apiMode}</td>
      <td title="${a.prompt}">${shortPrompt} <span class="small muted">(${a.prompt.length})</span></td>
      <td><div class="agentTags" data-id="${a.id}" contenteditable="true" style="min-width:120px;outline:none;border:1px dashed #2b3a50;padding:2px 6px;border-radius:6px;">${tagsTxt}</div></td>
      <td><div class="agentRegion" data-id="${a.id}" contenteditable="true" style="min-width:80px;outline:none;border:1px dashed #2b3a50;padding:2px 6px;border-radius:6px;">${regionTxt}</div></td>
      <td>
        <button class="editAgent" data-id="${a.id}">编辑</button>
        <button class="cloneAgent" data-id="${a.id}">复制</button>
        <button class="deleteAgent" data-id="${a.id}">删除</button>
      </td>
    `;
    tableBody.appendChild(row);
  }

  // 委托：全选/全不选
  document.getElementById('selectAllAgents').addEventListener('change', function() {
    const checkboxes = tableBody.querySelectorAll('.agentEnableCheckbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = this.checked;
      const agentId = checkbox.getAttribute('data-id');
      if (this.checked) {
        window.enabledAgentsSet.add(agentId);
      } else {
        window.enabledAgentsSet.delete(agentId);
      }
    });
  });

  // 清理旧的事件监听器
  if (tableBody.__changeHandler) {
    tableBody.removeEventListener('change', tableBody.__changeHandler);
  }
  if (tableBody.__clickHandler) {
    tableBody.removeEventListener('click', tableBody.__clickHandler);
  }
  
  // 事件委托：复选框、按钮、内联编辑
  tableBody.__changeHandler = function(e){
    const t = e.target;
    if (t && t.classList && t.classList.contains('agentEnableCheckbox')){
      const agentId = t.getAttribute('data-id');
      if (t.checked) window.enabledAgentsSet.add(agentId); else window.enabledAgentsSet.delete(agentId);
    }
  };
  tableBody.addEventListener('change', tableBody.__changeHandler);

  tableBody.__clickHandler = function(e){
    const btn = e.target.closest('button');
    if(!btn) return;
    const agentId = btn.getAttribute('data-id');
    if (btn.classList.contains('editAgent')){ editAgent(agentId); }
    else if (btn.classList.contains('cloneAgent')){ cloneAgent(agentId); }
    else if (btn.classList.contains('deleteAgent')){
      const i = state.agents.findIndex(x => x.id === agentId);
      if(i >= 0){
        state.agents.splice(i, 1);
        window.enabledAgentsSet.delete(agentId);
        renderAgents();
      }
    }
  };
  tableBody.addEventListener('click', tableBody.__clickHandler);

  // 清理旧的focusout事件监听器
  if (tableBody.__focusoutHandler) {
    tableBody.removeEventListener('focusout', tableBody.__focusoutHandler);
  }
  
  // 使用 focusout 代理处理 blur 不冒泡的问题
  tableBody.__focusoutHandler = function(e){
    const t = e.target;
    if (!t || !t.classList) return;
    if (t.classList.contains('agentTags')){
      const agentId = t.getAttribute('data-id');
      const ag = state.agents.find(x=>x.id===agentId);
      if(ag){ const v = t.textContent.trim(); ag.tags = v? v.split(',').map(s=>s.trim()).filter(Boolean) : []; }
    } else if (t.classList.contains('agentRegion')){
      const agentId = t.getAttribute('data-id');
      const ag = state.agents.find(x=>x.id===agentId);
      if(ag){ ag.region = t.textContent.trim(); }
    }
  };
  tableBody.addEventListener('focusout', tableBody.__focusoutHandler);
}

// 添加获取启用Agent的函数
function getEnabledAgents() {
  if (!window.enabledAgentsSet) {
    window.enabledAgentsSet = new Set();
    // 默认情况下，所有Agent都是启用的
    state.agents.forEach(agent => {
      window.enabledAgentsSet.add(agent.id);
    });
  }
  return state.agents.filter(agent => window.enabledAgentsSet.has(agent.id));
}



// 新增：通用事件（Generic Events）渲染与交互
function ensureEvents(){
  if (!state.sim) state.sim = {};
  if (!Array.isArray(state.sim.events)) state.sim.events = [];
  // 兼容旧字段：首次迁移
  if (Array.isArray(state.sim.policyEvents) && state.sim.policyEvents.length && !state.__migrated_policy_to_events){
    state.sim.policyEvents.forEach((ev, i)=>{
      state.sim.events.push({
        id: ev.id || ('legacy_'+i),
        enabled: ev.enabled !== false,
        name: ev.name || ev.type || '未命名事件',
        scope: (ev.scope && ev.scope!=='All') ? {mode:'tags', tags:[ev.scope]} : {mode:'all'},
        trigger: { round: (ev.policy_round!=null? Number(ev.policy_round): undefined), date: ev.start_date || undefined },
        lag: { min: Number(ev.lag_weeks_min||0), max: Number(ev.lag_weeks_max||0), share: Number(ev.lag_share||0) },
        template: { system: `（本回合：事件“${ev.name||ev.type}”已生效；范围=${ev.scope||'All'}${ev.note?`；${ev.note}`:''}）` },
        params: ev.params||{},
        once: false,
        note: ev.note || ''
      });
    });
    state.__migrated_policy_to_events = true;
  }
}

function renderEvents(){
  ensureEvents();
  const wrap = document.querySelector('#eventList') || document.querySelector('#policyEventList');
  const count = document.querySelector('#eventCount') || document.querySelector('#policyEventCount');
  if(!wrap) return;
  wrap.innerHTML = '';

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th style="width:60px;">启用</th>
        <th style="width:140px;">名称</th>
        <th style="width:120px;">范围</th>
        <th style="width:180px;">生效</th>
        <th style="width:140px;">滞后</th>
        <th style="width:60px;">一次</th>
        <th>说明</th>
        <th style="width:120px;">操作</th>
      </tr>
    </thead>
    <tbody id="eventTbody"></tbody>
  `;
  wrap.appendChild(table);
  const tbody = table.querySelector('#eventTbody');

  (state.sim.events||[]).forEach((ev, idx)=>{
    const tr = document.createElement('tr');
    const scopeStr = (function(sc){ if(!sc||sc.mode==='all') return 'All'; if(sc.mode==='tags') return 'tags:'+ (Array.isArray(sc.tags)? sc.tags.join('|'):''); if(sc.mode==='agents') return 'agents:'+ (Array.isArray(sc.agents)? sc.agents.join('|'):''); return 'All'; })(ev.scope);
    const trigStr = (function(t){ const arr=[]; if(t&&t.round!=null) arr.push('≥R'+t.round); if(t&&t.date) arr.push('≥'+t.date); if(t&&t.expr) arr.push('expr'); return arr.join(' / ')||'—'; })(ev.trigger);
    const lagStr = (function(l){ if(!l) return '—'; const s=Number(l.share||0); const p = Math.round(100*s); return `${l.min||0}~${l.max||0}；${p}%`; })(ev.lag);
    tr.innerHTML = `
      <td><input type="checkbox" class="ev-enable" data-i="${idx}" ${ev.enabled!==false?'checked':''}></td>
      <td>${ev.name||''}</td>
      <td>${scopeStr}</td>
      <td>${trigStr}</td>
      <td>${lagStr}</td>
      <td>${ev.once? '✓':'—'}</td>
      <td title="${ev.note||''}">${(ev.note||'').slice(0,40)}${(ev.note||'').length>40?'…':''}</td>
      <td>
        <button class="ev-edit" data-i="${idx}">编辑</button>
        <button class="ev-del" data-i="${idx}">删除</button>
      </td>`;
    tbody.appendChild(tr);
  });

  if(count) count.textContent = String(state.sim.events.length);

  tbody.querySelectorAll('.ev-enable').forEach(chk=>{
    chk.addEventListener('change', function(){ const i = Number(this.getAttribute('data-i')); if(state.sim.events[i]) state.sim.events[i].enabled = this.checked; });
  });
  tbody.querySelectorAll('.ev-edit').forEach(btn=>{
    btn.addEventListener('click', function(){ const i = Number(this.getAttribute('data-i')); openEventModal(i); });
  });
  tbody.querySelectorAll('.ev-del').forEach(btn=>{
    btn.addEventListener('click', function(){ const i = Number(this.getAttribute('data-i')); if(confirm('确定删除该事件？')){ state.sim.events.splice(i,1); renderEvents(); } });
  });
}

function openEventModal(index){
  ensureEvents();
  const isNew = (index==null || index<0);
  const ev = isNew ? {
    id: 'ev_'+Date.now(), enabled:true, name:'', scope:{mode:'all'}, trigger:{}, lag:{min:0,max:0,share:0}, template:{system:'',user:''}, params:{}, once:false, note:''
  } : {...state.sim.events[index]};

  const modal = document.createElement('div');
  modal.style.position='fixed'; modal.style.inset='0'; modal.style.background='rgba(0,0,0,.5)'; modal.style.zIndex='2000';
  const inner = document.createElement('div');
  inner.style.background='#121821'; inner.style.border='1px solid #223044'; inner.style.borderRadius='10px'; inner.style.padding='14px'; inner.style.margin='6vh auto'; inner.style.width='min(820px,96vw)'; inner.style.position='relative';
  const sc = ev.scope||{mode:'all'}; const trg = ev.trigger||{}; const lag = ev.lag||{}; const tpl = ev.template||{};
  inner.innerHTML = `
    <div style="position:absolute;right:10px;top:8px;cursor:pointer;font-size:18px;" id="ev_close_btn">×</div>
    <h3>${isNew?'添加':'编辑'} 事件</h3>
    <div class="row"><label><input id="ev_enabled" type="checkbox" ${ev.enabled!==false?'checked':''}/> 启用</label> <label style="margin-left:16px"><input id="ev_once" type="checkbox" ${ev.once?'checked':''}/> 仅首次触发</label> <label style="margin-left:16px"><input id="ev_withbg" type="checkbox" ${(ev.withBackground || (tpl && tpl.withBackground))?'checked':''}/> 本回合补发背景</label></div>
    <div class="row grid2">
      <div><label>名称</label><input id="ev_name" value="${ev.name||''}"></div>
      <div><label>备注</label><input id="ev_note" value="${ev.note||''}"></div>
    </div>
    <div class="row"><label>作用范围</label></div>
    <div class="row grid2">
      <div>
        <label>模式</label>
        <select id="ev_scope_mode">
          <option value="all" ${sc.mode==='all'?'selected':''}>全部</option>
          <option value="tags" ${sc.mode==='tags'?'selected':''}>按标签</option>
          <option value="agents" ${sc.mode==='agents'?'selected':''}>按Agent</option>
        </select>
      </div>
      <div><label>标签（逗号分隔）</label><input id="ev_scope_tags" value="${Array.isArray(sc.tags)?sc.tags.join(','):''}"></div>
      <div><label>Agent ID/名称（逗号分隔）</label><input id="ev_scope_agents" value="${Array.isArray(sc.agents)?sc.agents.join(','):''}"></div>
    </div>
    <div class="row"><label>触发条件（满足任一）</label></div>
    <div class="row grid2">
      <div><label>回合 ≥</label><input id="ev_tr_round" type="number" min="1" value="${trg.round!=null?trg.round:''}"></div>
      <div><label>日期 ≥</label><input id="ev_tr_date" type="date" value="${trg.date||''}"></div>
    </div>
    <div class="row"><label>表达式（可选，如 round>=5 && agent.region==='NJ'）</label><input id="ev_tr_expr" value="${trg.expr||''}"></div>
    <div class="row grid2">
      <div><label>滞后最小</label><input id="ev_lag_min" type="number" min="0" value="${lag.min||0}"></div>
      <div><label>滞后最大</label><input id="ev_lag_max" type="number" min="0" value="${lag.max||0}"></div>
      <div><label>滞后比例（0~1）</label><input id="ev_lag_share" type="number" step="0.01" min="0" max="1" value="${lag.share||0}"></div>
    </div>
    <div class="row"><label>模板（System）</label><textarea id="ev_tpl_sys" style="min-height:80px;">${(tpl.system||'')}</textarea></div>
    <div class="row"><label>模板（User）</label><textarea id="ev_tpl_user" style="min-height:80px;">${(tpl.user||'')}</textarea></div>
    <div class="row"><label>参数 params（JSON）</label><textarea id="ev_params" style="min-height:100px;">${JSON.stringify(ev.params||{},null,2)}</textarea></div>
    <div class="row" style="justify-content:flex-end;"><button id="ev_save" class="btn-ok">保存</button> <button id="ev_cancel">取消</button></div>
  `;
  modal.appendChild(inner); document.body.appendChild(modal);

  // 阻止点击内容关闭
  inner.addEventListener('click', e=>e.stopPropagation());

  // 关闭逻辑
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  const onEsc = (e)=>{ if(e.key==='Escape'){ doClose(); } };
  document.addEventListener('keydown', onEsc);
  
  // 清理函数
  const cleanup = () => {
    try{ document.removeEventListener('keydown', onEsc); }catch(_){}
    document.body.style.overflow = prevOverflow;
    // 清理其他可能的事件监听器
    const allButtons = modal.querySelectorAll('button');
    allButtons.forEach(btn => {
      if (btn.__eventCleanup) {
        btn.__eventCleanup();
      }
    });
  };
  
  function doClose(){
    cleanup();
    if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
  }

  modal.addEventListener('click', (e)=>{ if(e.target===modal) doClose(); });
  inner.querySelector('#ev_close_btn').addEventListener('click', doClose);
  inner.querySelector('#ev_cancel').addEventListener('click', doClose);
  inner.querySelector('#ev_save').addEventListener('click', ()=>{
    let paramsObj={};
    try{ paramsObj = JSON.parse(inner.querySelector('#ev_params').value||'{}'); }catch(e){ alert('参数JSON不合法'); return; }
    const mode = inner.querySelector('#ev_scope_mode').value;
    const scope = (mode==='all')? {mode:'all'} : (mode==='tags'? {mode:'tags', tags:(inner.querySelector('#ev_scope_tags').value||'').split(',').map(s=>s.trim()).filter(Boolean)} : {mode:'agents', agents:(inner.querySelector('#ev_scope_agents').value||'').split(',').map(s=>s.trim()).filter(Boolean)});
    const newEv = {
      id: ev.id || ('ev_'+Date.now()),
      enabled: inner.querySelector('#ev_enabled').checked,
      name: inner.querySelector('#ev_name').value.trim()||'未命名事件',
      scope,
      trigger: {
        round: (inner.querySelector('#ev_tr_round').value!==''? Math.max(1, Number(inner.querySelector('#ev_tr_round').value)) : undefined),
        date: (inner.querySelector('#ev_tr_date').value||undefined),
        expr: (inner.querySelector('#ev_tr_expr').value||'').trim() || undefined
      },
      lag: {
        min: Math.max(0, Number(inner.querySelector('#ev_lag_min').value||0)),
        max: Math.max(0, Number(inner.querySelector('#ev_lag_max').value||0)),
        share: Math.max(0, Math.min(1, Number(inner.querySelector('#ev_lag_share').value||0)))
      },
      template: { system: inner.querySelector('#ev_tpl_sys').value||'', user: inner.querySelector('#ev_tpl_user').value||'', withBackground: inner.querySelector('#ev_withbg').checked },
      params: paramsObj,
      once: inner.querySelector('#ev_once').checked,
      note: inner.querySelector('#ev_note').value||''
    };
    if(isNew) state.sim.events.push(newEv); else state.sim.events[index] = newEv;
    doClose();
    renderEvents();
  });
}

// 绑定添加按钮（兼容新旧ID）
(function(){
  document.addEventListener('DOMContentLoaded', ()=>{
    const btnNew = document.querySelector('#addEvent');
    if(btnNew && !btnNew.__bound){ btnNew.addEventListener('click', ()=>openEventModal(-1)); btnNew.__bound = true; }
    const btnOld = document.querySelector('#addPolicyEvent');
    if(btnOld && !btnOld.__bound){ btnOld.addEventListener('click', ()=>openEventModal(-1)); btnOld.__bound = true; }
    // 初次渲染
    if (typeof renderEvents === 'function') renderEvents();
    else if (typeof renderPolicyEvents === 'function') renderPolicyEvents();
  });
})();

// 绑定添加Agent按钮
function bindAddAgentButton() {
  const btn = document.querySelector('#addAgent');
  if (btn && !btn.__bound_addagent) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      addAgentFromUI();
    });
    btn.__bound_addagent = true;
  }
}

// DOM加载完成后绑定
document.addEventListener('DOMContentLoaded', bindAddAgentButton);

// 暴露
window.renderEvents = renderEvents;

// ===== 模态框处理函数 =====
// 简化的模态框处理函数，用于事件和智能体的编辑
function openEventModal(i){
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${i===-1?'新增事件':'编辑事件'}</h3>
        <button id="ev_close_btn" class="close-btn">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>事件名称：</label>
          <input type="text" id="ev_name" placeholder="事件名称" />
        </div>
        <div class="form-group">
          <label>触发条件：</label>
          <input type="text" id="ev_condition" placeholder="例如：step >= 10" />
        </div>
        <div class="form-group">
          <label>事件描述：</label>
          <textarea id="ev_description" placeholder="事件描述" rows="3"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button id="ev_cancel" class="btn-secondary">取消</button>
        <button id="ev_save" class="btn-primary">保存</button>
      </div>
    </div>
  `;
  
  const inner = modal.querySelector('.modal-content');
  inner.addEventListener('click', e=>e.stopPropagation());
  
  const doClose = ()=>{
    modal.remove();
  };
  
  modal.addEventListener('click', (e)=>{ if(e.target===modal) doClose(); });
  inner.querySelector('#ev_close_btn').addEventListener('click', doClose);
  inner.querySelector('#ev_cancel').addEventListener('click', doClose);
  inner.querySelector('#ev_save').addEventListener('click', ()=>{
    const name = inner.querySelector('#ev_name').value.trim();
    const condition = inner.querySelector('#ev_condition').value.trim();
    const description = inner.querySelector('#ev_description').value.trim();
    
    if(!name){
      alert('请输入事件名称');
      return;
    }
    
    const event = { name, condition, description };
    
    if(i===-1){
      state.sim.events = state.sim.events || [];
      state.sim.events.push(event);
    } else {
      state.sim.events[i] = event;
    }
    
    renderEvents();
    doClose();
  });
  
  if(i!==-1 && state.sim.events && state.sim.events[i]){
    const ev = state.sim.events[i];
    inner.querySelector('#ev_name').value = ev.name || '';
    inner.querySelector('#ev_condition').value = ev.condition || '';
    inner.querySelector('#ev_description').value = ev.description || '';
  }
  
  document.body.appendChild(modal);
  inner.querySelector('#ev_name').focus();
}

function openAgentModal(i){
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${i===-1?'新增智能体':'编辑智能体'}</h3>
        <button id="ag_close_btn" class="close-btn">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>智能体ID：</label>
          <input type="text" id="ag_id" placeholder="智能体ID" />
        </div>
        <div class="form-group">
          <label>智能体名称：</label>
          <input type="text" id="ag_name" placeholder="智能体名称" />
        </div>
        <div class="form-group">
          <label>系统提示：</label>
          <textarea id="ag_system" placeholder="系统提示" rows="4"></textarea>
        </div>
        <div class="form-group">
          <label>启用状态：</label>
          <input type="checkbox" id="ag_enabled" />
        </div>
      </div>
      <div class="modal-footer">
        <button id="ag_cancel" class="btn-secondary">取消</button>
        <button id="ag_save" class="btn-primary">保存</button>
      </div>
    </div>
  `;
  
  const dialog = overlay.querySelector('.modal-content');
  dialog.addEventListener('click', e=>e.stopPropagation());
  
  const close = ()=>{
    overlay.remove();
  };
  
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) close(); });
  dialog.querySelector('#ag_close_btn').addEventListener('click', close);
  dialog.querySelector('#ag_cancel').addEventListener('click', close);
  dialog.querySelector('#ag_save').addEventListener('click', ()=>{
    const id = dialog.querySelector('#ag_id').value.trim();
    const name = dialog.querySelector('#ag_name').value.trim();
    const system = dialog.querySelector('#ag_system').value.trim();
    const enabled = dialog.querySelector('#ag_enabled').checked;
    
    if(!id){
      alert('请输入智能体ID');
      return;
    }
    
    const agent = { id, name, system, enabled };
    
    if(i===-1){
      state.sim.agents = state.sim.agents || [];
      state.sim.agents.push(agent);
    } else {
      state.sim.agents[i] = agent;
    }
    
    renderAgents();
    close();
  });
  
  if(i!==-1 && state.sim.agents && state.sim.agents[i]){
    const ag = state.sim.agents[i];
    dialog.querySelector('#ag_id').value = ag.id || '';
    dialog.querySelector('#ag_name').value = ag.name || '';
    dialog.querySelector('#ag_system').value = ag.system || '';
    dialog.querySelector('#ag_enabled').checked = !!ag.enabled;
  }
  
  document.body.appendChild(overlay);
  dialog.querySelector('#ag_id').focus();
}

// ===== Agent 编辑与复制 =====
function editAgent(agentId){
  const idx = state.agents.findIndex(a=>a.id===agentId || a.name===agentId);
  if(idx<0){ alert('未找到该 Agent'); return; }
  const ag = state.agents[idx];

  const overlay = document.createElement('div');
  overlay.style.position='fixed'; overlay.style.inset='0'; overlay.style.background='rgba(0,0,0,.5)'; overlay.style.zIndex='2100';
  const dialog = document.createElement('div');
  dialog.style.background='#121821'; dialog.style.border='1px solid #223044'; dialog.style.borderRadius='10px'; dialog.style.padding='16px'; dialog.style.margin='6vh auto'; dialog.style.width='min(820px,96vw)'; dialog.style.position='relative';
  dialog.innerHTML = `
    <div style="position:absolute;right:10px;top:8px;cursor:pointer;font-size:18px;" id="ag_close_btn">×</div>
    <h3>编辑 Agent</h3>
    <div class="row grid2">
      <div><label>名称</label><input id="ag_name" value="${ag.name||''}"></div>
      <div><label>区域（可选）</label><input id="ag_region" value="${ag.region||''}"></div>
    </div>
    <div class="row"><label>标签（可选，逗号分隔）</label><input id="ag_tags" value="${Array.isArray(ag.tags)?ag.tags.join(','):''}}"></div>
    <div class="row"><label>Prompt</label><textarea id="ag_prompt" style="min-height:160px;">${ag.prompt||''}</textarea></div>
    <div class="row"><label>首回合种子数据（Seed）<br><span class="small muted">多行key=value格式，仅在第1回合且无上回合回填时使用</span></label><textarea id="ag_seed" placeholder="例如：\nstore_id=S001\nregion=NJ\nemployee_count=15" style="min-height:100px;font-family:monospace;">${ag.seed||''}</textarea></div>
    <div class="row" style="justify-content:flex-end;"><button id="ag_save" class="btn-ok">保存</button> <button id="ag_cancel">取消</button></div>
  `;
  overlay.appendChild(dialog); document.body.appendChild(overlay);

  // 交互与关闭
  const prevOverflow = document.body.style.overflow; document.body.style.overflow='hidden';
  dialog.addEventListener('click', e=>e.stopPropagation());
  const onEsc = (e)=>{ if(e.key==='Escape') close(); };
  document.addEventListener('keydown', onEsc);
  
  // 清理函数
  const cleanup = () => {
    try{ document.removeEventListener('keydown', onEsc); }catch(_){}
    document.body.style.overflow = prevOverflow;
    // 清理其他可能的事件监听器
    const allButtons = overlay.querySelectorAll('button');
    allButtons.forEach(btn => {
      if (btn.__eventCleanup) {
        btn.__eventCleanup();
      }
    });
  };
  
  function close(){
    cleanup();
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) close(); });
  dialog.querySelector('#ag_close_btn').addEventListener('click', close);
  dialog.querySelector('#ag_cancel').addEventListener('click', close);
  dialog.querySelector('#ag_save').addEventListener('click', ()=>{
    const name = dialog.querySelector('#ag_name').value.trim();
    const prompt = dialog.querySelector('#ag_prompt').value;
    const tagsTxt = dialog.querySelector('#ag_tags').value;
    const region = dialog.querySelector('#ag_region').value.trim();
    const seed = dialog.querySelector('#ag_seed').value.trim();
    if(!name || !prompt){ alert('名称与 Prompt 不能为空'); return; }
    ag.name = name;
    ag.prompt = prompt;
    ag.tags = tagsTxt? tagsTxt.split(',').map(s=>s.trim()).filter(Boolean) : [];
    ag.region = region;
    ag.seed = seed; // 新增seed字段
    close();
    renderAgents();
  });
}

function cloneAgent(agentId){
  const src = state.agents.find(a=>a.id===agentId || a.name===agentId);
  if(!src){ alert('未找到该 Agent'); return; }
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = nextAgentId();
  copy.name = (src.name||src.id||'Agent') + '（副本）';
  state.agents.push(copy);
  renderAgents();
}
