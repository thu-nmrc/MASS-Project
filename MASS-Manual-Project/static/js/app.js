// MASS Application - Main JavaScript
// Version: 1.0.0

// Global state
const state = {
  agents: [],
  logs: [],
  currentRound: 0,
  Event: {},
  isRunning: false,
  isPaused: false,
  isLocked: false, // 配置锁定状态
  events: {}, // 突发事件: { 回合数: { name: '事件名', description: '事件描述' } }
  config: {
    baseUrl: '',
    apiKey: '',
    modelName: '',
    maxTokens: 512,
    granularity: 'week',
    customGranularity: '', // 自定义时间单位名称
    startDate: '',
    maxRounds: 8,
    bgRules: '',
    multiApi: false, // 多 API 模式
    disableCache: false, // 禁用缓存（多 API 模式下自动启用）
    retryOnFailure: true, // 失败时重试
    maxRetries: 3, // 最大重试次数
    stopOnFailure: false // 失败时停止整个模拟
  },
  totalTokens: 0
};

// 系统限制常量
const LIMITS = {
  MAX_AGENTS: 300,
  MAX_ROUNDS: 1000,
  MIN_ROUNDS: 1
};

// DOM Elements
const elements = {
  agentName: document.getElementById('agentName'),
  agentPrompt: document.getElementById('agentPrompt'),
  addAgent: document.getElementById('addAgent'),
  agentList: document.getElementById('agentList'),
  agentCount: document.getElementById('agentCount'),

  eventRound: document.getElementById('eventRound'),
  eventStopRound: document.getElementById('eventStop'),

  eventName: document.getElementById('eventName'),
  eventDesc: document.getElementById('eventDesc'),
  addEvent: document.getElementById('addEvent'),
  eventList: document.getElementById('eventList'),
  eventCount: document.getElementById('eventCount'),

  baseUrl: document.getElementById('baseUrl'),
  apiKey: document.getElementById('apiKey'),
  modelName: document.getElementById('modelName'),
  multiApi: document.getElementById('multiApi'),
  disableCache: document.getElementById('disableCache'),
  retryOnFailure: document.getElementById('retryOnFailure'),
  maxRetries: document.getElementById('maxRetries'),
  stopOnFailure: document.getElementById('stopOnFailure'),
  granularity: document.getElementById('granularity'),
  customGranularity: document.getElementById('customGranularity'),
  customGranularityGroup: document.getElementById('customGranularityGroup'),
  startDate: document.getElementById('startDate'),
  maxRounds: document.getElementById('maxRounds'),
  bgRules: document.getElementById('bgRules'),

  saveConfig: document.getElementById('saveConfig'),
  testAPI: document.getElementById('testAPI'),

  startSim: document.getElementById('startSim'),
  pauseSim: document.getElementById('pauseSim'),
  stopSim: document.getElementById('stopSim'),

  currentRound: document.getElementById('currentRound'),
  simStatus: document.getElementById('simStatus'),
  tokenCount: document.getElementById('tokenCount'),

  logBody: document.getElementById('logBody'),
  console: document.getElementById('console'),

  exportCSV: document.getElementById('exportCSV'),
  exportJSON: document.getElementById('exportJSON'),
  clearLog: document.getElementById('clearLog')
};

// 自动同步配置到 state
function autoSyncConfig() {
  state.config.baseUrl = elements.baseUrl.value.trim();
  state.config.apiKey = elements.apiKey.value.trim();
  state.config.modelName = elements.modelName.value.trim();
  state.config.granularity = elements.granularity.value;
  state.config.customGranularity = elements.customGranularity.value.trim();
  state.config.startDate = elements.startDate.value;
  state.config.maxRounds = parseInt(elements.maxRounds.value) || 8;
  state.config.bgRules = elements.bgRules.value.trim();
  state.config.multiApi = elements.multiApi.checked;
  state.config.disableCache = elements.disableCache.checked;
  state.config.retryOnFailure = elements.retryOnFailure.checked;
  state.config.maxRetries = parseInt(elements.maxRetries.value) || 3;
  state.config.stopOnFailure = elements.stopOnFailure.checked;
}

// 获取当前时间单位的显示名称
function getTimeUnitName() {
  const granularity = state.config.granularity;

  if (granularity === 'custom' && state.config.customGranularity) {
    return state.config.customGranularity;
  }

  const unitNames = {
    'day': 'Day',
    'week': 'Week',
    'month': 'Month',
    'quarter': 'Quarter',
    'year': 'Year',
    'round': 'Round',
    'touchpoint': 'Touch Point'
  };

  return unitNames[granularity] || 'Round';
}

// Initialize
function init() {
  // Set default date
  const today = new Date().toISOString().split('T')[0];
  elements.startDate.value = today;

  // 时间粒度切换逻辑
  if (elements.granularity && elements.customGranularityGroup) {
    elements.granularity.addEventListener('change', (e) => {
      const value = e.target.value;
      // 显示/隐藏自定义时间单位输入框
      if (value === 'custom') {
        elements.customGranularityGroup.style.display = 'block';
      } else {
        elements.customGranularityGroup.style.display = 'none';
      }
      autoSyncConfig();
    });
  }

  // 添加自动同步监听器
  const configInputs = [
    elements.baseUrl,
    elements.apiKey,
    elements.modelName,
    elements.granularity,
    elements.customGranularity,
    elements.startDate,
    elements.maxRounds,
    elements.bgRules,
    elements.multiApi,
    elements.disableCache,
    elements.retryOnFailure,
    elements.maxRetries,
    elements.stopOnFailure
  ];

  configInputs.forEach(input => {
    if (input) {
      if (input.type === 'checkbox') {
        input.addEventListener('change', autoSyncConfig);
      } else {
        input.addEventListener('blur', autoSyncConfig);
        input.addEventListener('change', autoSyncConfig);
      }
    }
  });

  // 初始同步一次
  autoSyncConfig();

  // 多 API 模式和 Prompt 缓存互斥逻辑
  if (elements.multiApi && elements.disableCache) {
    // 当启用多 API 模式时，自动禁用 Prompt 缓存
    elements.multiApi.addEventListener('change', (e) => {
      if (e.target.checked) {
        elements.disableCache.checked = true;
        elements.disableCache.disabled = true;
        autoSyncConfig();
        log('多 API 模式已启用，Prompt 缓存已自动禁用');
      } else {
        elements.disableCache.disabled = false;
      }
    });

    // 当尝试启用 Prompt 缓存时，检查多 API 模式
    elements.disableCache.addEventListener('change', (e) => {
      if (!e.target.checked && elements.multiApi.checked) {
        // 如果多 API 模式开启，不允许启用缓存
        e.target.checked = true;
        alert('多 API 模式下无法启用 Prompt 缓存\n\n不同的 API 端点无法共享缓存，请先关闭多 API 模式。');
      }
    });

    // 初始化时检查状态
    if (elements.multiApi.checked) {
      elements.disableCache.checked = true;
      elements.disableCache.disabled = true;
    }
  }

  // Event listeners
  elements.addAgent.addEventListener('click', addAgent);
  elements.addEvent.addEventListener('click', addEvent);
  elements.saveConfig.addEventListener('click', saveConfig);
  elements.testAPI.addEventListener('click', testAPI);
  elements.startSim.addEventListener('click', startSimulation);
  elements.pauseSim.addEventListener('click', pauseSimulation);
  elements.stopSim.addEventListener('click', stopSimulation);
  elements.exportCSV.addEventListener('click', exportCSV);
  elements.exportJSON.addEventListener('click', exportJSON);
  elements.clearLog.addEventListener('click', clearLog);

  // Excel export
  const exportExcelBtn = document.getElementById('exportExcel');
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', exportExcel);
    // 检查 Excel 是否可用
    checkExcelAvailability();
  }

  // Import/Export config
  const importConfigBtn = document.getElementById('importConfigBtn');
  const importConfig = document.getElementById('importConfig');
  const exportConfigBtn = document.getElementById('exportConfigBtn');

  if (importConfigBtn && importConfig) {
    importConfigBtn.addEventListener('click', () => importConfig.click());
    importConfig.addEventListener('change', handleImportConfig);
  }

  if (exportConfigBtn) {
    exportConfigBtn.addEventListener('click', exportConfig);
  }

  log('系统初始化完成');
}

// Agent Management
function addAgent() {
  // 检查是否已锁定
  if (state.isLocked) {
    alert('模拟运行中，无法添加 Agent');
    return;
  }

  const name = elements.agentName.value.trim();
  const prompt = elements.agentPrompt.value.trim();

  if (!name || !prompt) {
    alert('请填写 Agent 名称和 Prompt');
    return;
  }

  // 检查 Agent 数量限制
  if (state.agents.length >= LIMITS.MAX_AGENTS) {
    alert(`已达到 Agent 数量上限（${LIMITS.MAX_AGENTS}个）`);
    return;
  }

  const agent = {
    id: `agent_${Date.now()}`,
    name: name,
    prompt: prompt,
    data: {},
    // 多 API 模式下的独立配置
    useCustomApi: false,
    customBaseUrl: '',
    customApiKey: '',
    customModel: '',
    // 层级关系配置
    subordinates: [], // 下属Agent的ID列表
    includeSubSubordinates: false, // 是否包含下属的下属（间接下属）
    // 返回默认值配置
    returnDefaultEnabled: false // 是否启用Agent返回默认值
  };

  state.agents.push(agent);
  elements.agentName.value = '';
  elements.agentPrompt.value = '';

  renderAgents();
  log(`添加 Agent: ${name} (${state.agents.length}/${LIMITS.MAX_AGENTS})`);
}

function removeAgent(id) {
  // 检查是否已锁定
  if (state.isLocked) {
    alert('模拟运行中，无法删除 Agent');
    return;
  }

  state.agents = state.agents.filter(a => a.id !== id);
  renderAgents();
  log(`删除 Agent: ${id}`);
}

function renderAgents() {
  const countText = `${state.agents.length}/${LIMITS.MAX_AGENTS} 个 Agent`;
  elements.agentCount.textContent = countText;

  if (state.agents.length === 0) {
    elements.agentList.innerHTML = '<div style="color: var(--muted); font-size: 0.875rem;">暂无 Agent</div>';
    return;
  }

  const deleteDisabled = state.isLocked ? 'disabled' : '';
  const editDisabled = state.isLocked ? 'disabled' : '';

  elements.agentList.innerHTML = state.agents.map(agent => {
    const apiInfo = agent.useCustomApi
      ? `<div style="font-size: 0.75rem; color: var(--primary); margin-top: 0.25rem;">🔌 使用独立 API: ${agent.customModel || '未设置'}</div>`
      : '';

    // 显示层级信息
    const subordinateNames = (agent.subordinates || [])
      .map(id => state.agents.find(a => a.id === id)?.name || '未知')
      .join(', ');
    const hierarchyInfo = subordinateNames
      ? `<div style="font-size: 0.75rem; color: var(--warning); margin-top: 0.25rem;">👥 下属: ${subordinateNames}${agent.includeSubSubordinates ? ' (含间接下属)' : ''}</div>`
      : '';

    return `
      <div class="agent-card">
        <div class="agent-header">
          <span class="agent-name">${agent.name}</span>
          <div style="display: flex; gap: 0.5rem;">
            <button onclick="editAgent('${agent.id}')" class="btn-secondary" style="padding: 0.25rem 0.75rem; font-size: 0.75rem;" ${editDisabled}>编辑</button>
            <button onclick="configHierarchy('${agent.id}')" class="btn-secondary" style="padding: 0.25rem 0.75rem; font-size: 0.75rem;" ${editDisabled}>层级</button>
            ${state.config.multiApi ? `<button onclick="configAgentApi('${agent.id}')" class="btn-secondary" style="padding: 0.25rem 0.75rem; font-size: 0.75rem;" ${editDisabled}>API</button>` : ''}
            <button onclick="removeAgent('${agent.id}')" class="btn-danger" style="padding: 0.25rem 0.75rem; font-size: 0.75rem;" ${deleteDisabled}>删除</button>
          </div>
        </div>
        <div style="font-size: 0.875rem; color: var(--muted); margin-top: 0.5rem;">
          ${agent.prompt.substring(0, 100)}${agent.prompt.length > 100 ? '...' : ''}
        </div>
        ${apiInfo}
        ${hierarchyInfo}
      </div>
    `;
  }).join('');
}

// 编辑 Agent
function editAgent(agentId) {
  if (state.isLocked) {
    alert('模拟运行中，无法编辑 Agent');
    return;
  }

  const agent = state.agents.find(a => a.id === agentId);
  if (!agent) return;

  const t = window.i18n ? window.i18n.t : (key) => key;

  // 根据页面语言调整弹窗内的少量硬编码文本（主要是返回规则提示与示例）
  const currentLang = (window.i18n && window.i18n.getCurrentLang) ? window.i18n.getCurrentLang() : 'en';
  const isEn = currentLang === 'en' || currentLang === 'en-US' || currentLang === 'en_US';
  const returnRuleTooltipText = isEn
    ? 'When the model returns, add a generated random-event rule.'
    : '在大模型返回时，新增一个突发事件生成规则';
  const enableLabelText = isEn ? 'Enable' : '启用';
  const returnDefaultExample = isEn
    ? '{"name":"Event Name","start_round":"trigger_round","stop_round":"end_round","description":"Event description"}'
    : '{"name":"突发事件名称","start_round":"触发回合","stop_round":"结束回合","description":"事件概述"}';
  // 创建编辑对话框
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;

  // API 配置部分（仅在多 API 模式下显示）
  const apiConfigSection = state.config.multiApi ? `
    <div style="margin-bottom: 1rem; padding: 1rem; background: rgba(52, 152, 219, 0.1); border: 1px solid var(--primary); border-radius: 8px;">
      <div style="margin-bottom: 0.75rem;">
        <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
          <input type="checkbox" id="editUseCustomApi" ${agent.useCustomApi ? 'checked' : ''} style="width: auto;">
          <span style="color: var(--primary); font-weight: 600;">使用独立 API 配置</span>
        </label>
      </div>
      
      <div id="editApiFields" style="display: ${agent.useCustomApi ? 'block' : 'none'};">
        <div style="margin-bottom: 0.75rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: var(--muted);">Base URL</label>
          <input type="text" id="editCustomBaseUrl" value="${agent.customBaseUrl || ''}" placeholder="${state.config.baseUrl || 'https://api.openai.com/v1'}" style="width: 100%; padding: 0.5rem; background: #0f1520; border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 0.875rem;">
        </div>
        
        <div style="margin-bottom: 0.75rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: var(--muted);">API Key</label>
          <input type="password" id="editCustomApiKey" value="${agent.customApiKey || ''}" placeholder="sk-..." style="width: 100%; padding: 0.5rem; background: #0f1520; border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 0.875rem;">
        </div>
        
        <div style="margin-bottom: 0.75rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: var(--muted);">模型名称</label>
          <input type="text" id="editCustomModel" value="${agent.customModel || ''}" placeholder="${state.config.modelName || 'gpt-4'}" style="width: 100%; padding: 0.5rem; background: #0f1520; border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 0.875rem;">
        </div>
      </div>
    </div>
  ` : '';

  modal.innerHTML = `
    <div style="background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; width: 90%; max-width: 600px; max-height: 80vh; overflow-y: auto;">
      <h3 style="margin-bottom: 1rem; color: var(--primary);">${t('dialog.editAgent')}</h3>
      
      <div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: var(--muted);">${t('agent.name')}</label>
        <input type="text" id="editAgentName" value="${agent.name}" style="width: 100%; padding: 0.75rem; background: #0f1520; border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 0.875rem;">
      </div>
      
      <div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: var(--muted);">${t('agent.prompt')}</label>
        <textarea id="editAgentPrompt" style="width: 100%; min-height: 200px; padding: 0.75rem; background: #0f1520; border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 0.875rem; font-family: inherit; resize: vertical;">${agent.prompt}</textarea>
      </div>
      
      <div style="margin-bottom: 1rem; padding: 1rem; background: rgba(243, 156, 18, 0.1); border: 1px solid var(--warning); border-radius: 8px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <label style="font-size: 0.875rem; color: var(--text); font-weight: 600; display: flex; align-items: center;">增加返回规则</label>
            <div style="position: relative; display: inline-flex; align-items: center; justify-content: center;">
              <span id="returnRuleIcon" style="display: inline-flex; align-items: center; justify-content: center; width: 13px; height: 13px; border-radius: 50%; background: rgba(52, 152, 219, 0.2); color: var(--primary); font-size: 0.7rem; cursor: help; border: 1px solid var(--primary); line-height: 1;">?</span>
              <div id="returnRuleTooltip" style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 8px; padding: 0.5rem 0.75rem; background: rgba(0, 0, 0, 0.9); color: white; font-size: 0.75rem; border-radius: 6px; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity 0.2s; z-index: 1001;">
                ${returnRuleTooltipText}
                <div style="position: absolute; top: 100%; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid rgba(0, 0, 0, 0.9);"></div>
              </div>
            </div>
          </div>
          <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: var(--muted); cursor: pointer;">
            <input type="checkbox" id="editAgentReturnDefaultEnabled" ${agent.returnDefaultEnabled ? 'checked' : ''} style="width: auto;">
            <span>${enableLabelText}</span>
          </label>
        </div>
        <textarea id="editAgentReturnDefault" readonly style="width: 100%; min-height: 100px; padding: 0.75rem; background: #0f1520; border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 0.875rem; font-family: 'Courier New', monospace; resize: vertical; cursor: not-allowed;">${returnDefaultExample}</textarea>
      </div>
      
      ${apiConfigSection}
      
      <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
        <button id="cancelEdit" style="padding: 0.75rem 1.25rem; background: #34495e; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.875rem;">${t('dialog.cancel')}</button>
        <button id="saveEdit" style="padding: 0.75rem 1.25rem; background: var(--success); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.875rem;">${t('dialog.save')}</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // 聚焦到名称输入框
  setTimeout(() => {
    document.getElementById('editAgentName').focus();
  }, 100);

  // 处理自定义 API 复选框切换
  const useCustomApiCheckbox = document.getElementById('editUseCustomApi');
  const apiFields = document.getElementById('editApiFields');
  if (useCustomApiCheckbox && apiFields) {
    useCustomApiCheckbox.addEventListener('change', (e) => {
      apiFields.style.display = e.target.checked ? 'block' : 'none';
    });
  }

  // 处理返回规则提示框显示/隐藏
  const returnRuleTooltip = document.getElementById('returnRuleTooltip');
  if (returnRuleTooltip) {
    const tooltipContainer = returnRuleTooltip.parentElement;
    const returnRuleIcon = tooltipContainer ? tooltipContainer.querySelector('span') : null;
    if (returnRuleIcon) {
      returnRuleIcon.addEventListener('mouseenter', () => {
        returnRuleTooltip.style.opacity = '1';
      });
      returnRuleIcon.addEventListener('mouseleave', () => {
        returnRuleTooltip.style.opacity = '0';
      });
    }
  }

  // 取消按钮
  document.getElementById('cancelEdit').onclick = () => {
    document.body.removeChild(modal);
  };

  // 保存按钮
  document.getElementById('saveEdit').onclick = () => {
    const newName = document.getElementById('editAgentName').value.trim();
    const newPrompt = document.getElementById('editAgentPrompt').value.trim();

    if (!newName || !newPrompt) {
      alert('名称和 Prompt 不能为空');
      return;
    }

    agent.name = newName;
    agent.prompt = newPrompt;

    // 保存返回默认值启用状态
    const returnDefaultEnabledEl = document.getElementById('editAgentReturnDefaultEnabled');
    if (returnDefaultEnabledEl) {
      agent.returnDefaultEnabled = returnDefaultEnabledEl.checked;
    }

    // 保存 API 配置（如果在多 API 模式下）
    if (state.config.multiApi) {
      const useCustomApi = document.getElementById('editUseCustomApi');
      if (useCustomApi) {
        agent.useCustomApi = useCustomApi.checked;

        if (agent.useCustomApi) {
          agent.customBaseUrl = document.getElementById('editCustomBaseUrl').value.trim();
          agent.customApiKey = document.getElementById('editCustomApiKey').value.trim();
          agent.customModel = document.getElementById('editCustomModel').value.trim();
        } else {
          // 如果取消使用自定义 API，清空配置
          agent.customBaseUrl = '';
          agent.customApiKey = '';
          agent.customModel = '';
        }
      }
    }

    // 确保层级信息不丢失
    if (!agent.subordinates) agent.subordinates = [];
    if (typeof agent.includeSubSubordinates === 'undefined') agent.includeSubSubordinates = false;

    renderAgents();
    log(`编辑 Agent: ${agent.name}`);
    document.body.removeChild(modal);
  };

  // 点击背景关闭
  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  };
}

// 配置 Agent 的独立 API
function configAgentApi(agentId) {
  const agent = state.agents.find(a => a.id === agentId);
  if (!agent) return;

  const useCustom = confirm(`是否为 "${agent.name}" 配置独立的 API？\n\n点击"确定"配置独立 API\n点击"取消"使用全局 API`);

  if (useCustom) {
    const baseUrl = prompt('Base URL:', agent.customBaseUrl || state.config.baseUrl);
    if (baseUrl === null) return;

    const apiKey = prompt('API Key:', agent.customApiKey || '');
    if (apiKey === null) return;

    const model = prompt('模型名称:', agent.customModel || state.config.modelName);
    if (model === null) return;

    agent.useCustomApi = true;
    agent.customBaseUrl = baseUrl.trim();
    agent.customApiKey = apiKey.trim();
    agent.customModel = model.trim();

    log(`${agent.name} 配置独立 API: ${model}`);
  } else {
    agent.useCustomApi = false;
    agent.customBaseUrl = '';
    agent.customApiKey = '';
    agent.customModel = '';

    log(`${agent.name} 使用全局 API`);
  }

  renderAgents();
}

// Event Management
function addEvent() {
  if (state.isLocked) {
    alert('模拟运行中，无法添加事件');
    return;
  }

  const round = parseInt(elements.eventRound.value);
  const stop_round = parseInt(elements.eventStopRound.value);
  const max_round = parseInt(elements.maxRounds.value);
  const name = elements.eventName.value.trim();
  const description = elements.eventDesc.value.trim();

  if (!round || round < 1) {
    alert('请输入有效的回合数（大于0）');
    return;
  }
  if (round > max_round){
    alert(`请输入有效的触发回合数（小于等于${max_round}）`);
  if (stop_round > max_round){
    alert(`请输入有效的停止回合数（小于等于${max_round}）`);
  }}
  if (round > stop_round || stop_round < 1) {
      alert(`请输入有效的停止回合数（> 1 且 <= ${round}）`);
      return;
    }

  if (!name || !description) {
    alert('请填写事件名称和描述');
    return;
  }

  state.events[round] = { name, description, stop_round};

  elements.eventRound.value = '';
  elements.eventStopRound.value = '';
  elements.eventName.value = '';
  elements.eventDesc.value = '';

  renderEvents();
  log(`添加突发事件: 第 ${round} 回合 - ${name}`);
}

function removeEvent(round) {
  if (state.isLocked) {
    alert('模拟运行中，无法删除事件');
    return;
  }

  delete state.events[round];
  renderEvents();
  log(`删除突发事件: 第 ${round} 回合`);
}

function renderEvents() {
  const eventCount = Object.keys(state.events).length;
  elements.eventCount.textContent = `${eventCount} 个事件`;

  if (eventCount === 0) {
    elements.eventList.innerHTML = '<div style="color: var(--muted); font-size: 0.875rem;">暂无突发事件</div>';
    return;
  }
  const deleteDisabled = state.isLocked ? 'disabled' : '';
  const editDisabled = state.isLocked ? 'disabled' : '';
  const sortedRounds = Object.keys(state.events).sort((a, b) => parseInt(a) - parseInt(b));

  elements.eventList.innerHTML = sortedRounds.map(round => {
    const event = state.events[round];
    return `
      <div class="agent-card">
        <div class="agent-header">
          <span class="agent-name">第 ${round} 回合: ${event.name}</span>
          <div style="display: flex; gap: 0.5rem;">
            <button onclick="editEvent(${round}, ${event.stop_round})" class="btn-secondary" style="padding: 0.25rem 0.75rem; font-size: 0.75rem;" ${editDisabled}>编辑</button>
            <button onclick="removeEvent(${round})" class="btn-danger" style="padding: 0.25rem 0.75rem; font-size: 0.75rem;" ${deleteDisabled}>删除</button>
          </div>
        </div>
        <div style="font-size: 0.875rem; color: var(--muted); margin-top: 0.5rem;">
          ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}
        </div>
      </div>
    `;
  }).join('');
}

// 编辑突发事件
function editEvent(round, stop_round) {
  if (state.isLocked) {
    alert('模拟运行中，无法编辑事件');
    return;
  }

  const event = state.events[round];
  if (!event) return;

  // 创建编辑对话框
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;

  modal.innerHTML = `
    <div style="background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; width: 90%; max-width: 600px; max-height: 80vh; overflow-y: auto;">
      <h3 style="margin-bottom: 1rem; color: var(--primary);">编辑突发事件</h3>
      
      <div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: var(--muted);">触发回合</label>
        <input type="number" id="editEventRound" value="${round}" min="1" style="width: 100%; padding: 0.75rem; background: #0f1520; border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 0.875rem;">
      </div>
      <div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: var(--muted);">停止回合</label>
        <input type="number" id="editEventStop" value="${stop_round}" min="1" style="width: 100%; padding: 0.75rem; background: #0f1520; border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 0.875rem;">
      </div>
      
      <div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: var(--muted);">事件名称</label>
        <input type="text" id="editEventName" value="${event.name}" style="width: 100%; padding: 0.75rem; background: #0f1520; border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 0.875rem;">
      </div>
      
      <div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: var(--muted);">事件描述</label>
        <textarea id="editEventDesc" style="width: 100%; min-height: 150px; padding: 0.75rem; background: #0f1520; border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 0.875rem; font-family: inherit; resize: vertical;">${event.description}</textarea>
      </div>
      
      <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
        <button id="cancelEditEvent" style="padding: 0.75rem 1.25rem; background: #34495e; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.875rem;">取消</button>
        <button id="saveEditEvent" style="padding: 0.75rem 1.25rem; background: var(--success); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.875rem;">保存</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // 聚焦到回合输入框
  setTimeout(() => {
    document.getElementById('editEventRound').focus();
  }, 100);
  // 取消按钮
  document.getElementById('cancelEditEvent').onclick = () => {
    document.body.removeChild(modal);
  };

  // 保存按钮
  document.getElementById('saveEditEvent').onclick = () => {
    const newRound = parseInt(document.getElementById('editEventRound').value);
    const newStopRound = parseInt(document.getElementById('editEventStop').value);
    const newName = document.getElementById('editEventName').value.trim();
    const newDescription = document.getElementById('editEventDesc').value.trim();

    if (!newRound || newRound < 1) {
      alert('请输入有效的回合数（大于0）');
      return;
    }
    if (newRound >= newStopRound || !newStopRound) {
      alert('请输入有效的停止回合数（大于0 且 大于触发回合数）');
      return;
    }

    if (!newName || !newDescription) {
      alert('事件名称和描述不能为空');
      return;
    }

    // 如果回合数改变了，删除旧的，添加新的
    if (newRound !== parseInt(round)) {
      delete state.events[round];
      state.events[newRound] = {
        name: newName,
        stop_round: newStopRound,
        description: newDescription
      };
      log(`移动事件: 第 ${round} 回合 → 第 ${newRound} 回合`);
    } else {
      state.events[round] = {
        name: newName,
        stop_round: newStopRound,
        description: newDescription
      };
      log(`编辑事件: 第 ${round} 回合 - ${newName}`);
    }

    renderEvents();
    document.body.removeChild(modal);
  };

  // 点击背景关闭
  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  };
}

// Configuration
function saveConfig() {
  // 先自动同步配置
  autoSyncConfig();

  // 多 API 模式提示
  if (state.config.multiApi && !state.config.disableCache) {
    const shouldDisable = confirm(
      '⚠️ 多 API 模式建议\n\n' +
      '检测到您启用了多 API 模式。\n' +
      '不同的 API 端点无法共享缓存，建议禁用 Prompt 缓存功能。\n\n' +
      '是否自动禁用缓存？\n' +
      '（点击"确定"禁用缓存，点击"取消"保持当前设置）'
    );

    if (shouldDisable) {
      state.config.disableCache = true;
      elements.disableCache.checked = true;
      log('已自动禁用 Prompt 缓存（多 API 模式）');
    }
  }

  // 重新渲染 Agent 列表
  renderAgents();

  fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      baseUrl: state.config.baseUrl,
      apiKey: state.config.apiKey,
      modelName: state.config.modelName,
      multiApi: state.config.multiApi
    })
  })
    .then(r => r.json())
    .then(data => {
      log('配置已保存');
      alert('配置保存成功！');
    })
    .catch(err => {
      log(`配置保存失败: ${err.message}`, 'error');
      alert('配置保存失败');
    });
}

async function testAPI() {
  // 直接从输入框读取最新值
  const baseUrl = elements.baseUrl.value.trim();
  const apiKey = elements.apiKey.value.trim();
  const modelName = elements.modelName.value.trim();

  if (!baseUrl || !modelName) {
    alert('请先填写 Base URL 和模型名称');
    return;
  }

  log('测试 API 连接...');
  log(`Base URL: ${baseUrl}`);
  log(`Model: ${modelName}`);
  elements.testAPI.disabled = true;
  elements.testAPI.textContent = '测试中...';

  try {
    const response = await fetch('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseUrl: baseUrl,
        apiKey: apiKey,
        model: modelName,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say "OK" if you can read this.' }
        ]
      })
    });

    const data = await response.json();

    console.log('API 测试响应:', data); // 调试日志

    if (data.status === 200 && data.json && data.json.choices) {
      log('API 测试成功 ✓', 'success');
      alert('API 连接成功！');
    } else {
      const errorMsg = data.head || data.error || JSON.stringify(data.json?.error) || 'Unknown error';
      log(`API 测试失败: ${errorMsg}`, 'error');

      // 显示原始响应（如果有）
      if (data.raw) {
        log(`原始响应（前500字符）: ${data.raw.substring(0, 500)}`, 'error');
      }

      log(`完整响应: ${JSON.stringify(data)}`, 'error');

      // 提供更有帮助的错误提示
      let helpText = '\n\n可能的原因：';
      if (errorMsg.includes('Invalid JSON')) {
        helpText += '\n- Base URL 可能不正确（检查是否包含 /v1）';
        helpText += '\n- API 端点可能返回了 HTML 错误页面';
        helpText += '\n- 网络代理或防火墙可能拦截了请求';
      } else if (errorMsg.includes('401')) {
        helpText += '\n- API Key 无效或已过期';
      } else if (errorMsg.includes('404')) {
        helpText += '\n- API 端点不存在，检查 Base URL';
      } else if (errorMsg.includes('429')) {
        helpText += '\n- 请求过多，请稍后重试';
      }

      alert(`API 测试失败: ${errorMsg}${helpText}\n\n请检查调试控制台查看详细信息`);
    }
  } catch (err) {
    log(`API 测试错误: ${err.message}`, 'error');
    console.error('API 测试异常:', err);
    alert(`API 测试错误: ${err.message}`);
  } finally {
    elements.testAPI.disabled = false;
    elements.testAPI.textContent = '🧪 测试连接';
  }
}

// Simulation
async function startSimulation() {
  // 验证 Agent 数量
  if (state.agents.length === 0) {
    alert('请至少添加一个 Agent');
    return;
  }

  if (state.agents.length > LIMITS.MAX_AGENTS) {
    alert(`Agent 数量超过限制（最大 ${LIMITS.MAX_AGENTS} 个）`);
    return;
  }

  // 验证 API 配置
  if (!state.config.baseUrl || !state.config.modelName) {
    alert('请先配置 API');
    return;
  }

  // 验证回合数
  const maxRounds = parseInt(elements.maxRounds.value);
  if (isNaN(maxRounds) || maxRounds < LIMITS.MIN_ROUNDS || maxRounds > LIMITS.MAX_ROUNDS) {
    alert(`回合数必须在 ${LIMITS.MIN_ROUNDS} 到 ${LIMITS.MAX_ROUNDS} 之间`);
    return;
  }

  // 锁定配置
  state.isLocked = true;
  state.isRunning = true;
  state.isPaused = false;
  state.currentRound = 0;

  // 禁用配置相关的控件
  disableConfigControls();

  elements.startSim.classList.add('hidden');
  elements.pauseSim.classList.remove('hidden');
  elements.stopSim.classList.remove('hidden');
  elements.simStatus.textContent = '运行中（配置已锁定）';

  log('开始模拟...（配置已锁定，无法修改）');
  log(`Agent 数量: ${state.agents.length}/${LIMITS.MAX_AGENTS}`);
  log(`回合数: ${LIMITS.MIN_ROUNDS}/${maxRounds}`);

  await runSimulation();
}

function pauseSimulation() {
  state.isPaused = true;
  elements.simStatus.textContent = '已暂停';
  log('模拟已暂停');
}

function stopSimulation() {
  state.isRunning = false;
  state.isPaused = false;
  state.isLocked = false; // 解锁配置

  // 启用配置相关的控件
  enableConfigControls();

  elements.startSim.classList.remove('hidden');
  elements.pauseSim.classList.add('hidden');
  elements.stopSim.classList.add('hidden');
  elements.simStatus.textContent = '已停止';

  log('模拟已停止（配置已解锁）');
}

// 禁用配置控件
function disableConfigControls() {
  elements.agentName.disabled = true;
  elements.agentPrompt.disabled = true;
  elements.addAgent.disabled = true;
  elements.eventRound.disabled = true;
  elements.eventName.disabled = true;
  elements.eventDesc.disabled = true;
  elements.addEvent.disabled = true;
  elements.baseUrl.disabled = true;
  elements.apiKey.disabled = true;
  elements.modelName.disabled = true;
  elements.multiApi.disabled = true;
  elements.disableCache.disabled = true;
  elements.retryOnFailure.disabled = true;
  elements.maxRetries.disabled = true;
  elements.stopOnFailure.disabled = true;
  elements.granularity.disabled = true;
  elements.startDate.disabled = true;
  elements.maxRounds.disabled = true;
  elements.bgRules.disabled = true;
  elements.saveConfig.disabled = true;

  const importConfigBtn = document.getElementById('importConfigBtn');
  if (importConfigBtn) importConfigBtn.disabled = true;
}

// 启用配置控件
function enableConfigControls() {
  elements.agentName.disabled = false;
  elements.agentPrompt.disabled = false;
  elements.addAgent.disabled = false;
  elements.eventRound.disabled = false;
  elements.eventName.disabled = false;
  elements.eventDesc.disabled = false;
  elements.addEvent.disabled = false;
  elements.baseUrl.disabled = false;
  elements.apiKey.disabled = false;
  elements.modelName.disabled = false;
  elements.multiApi.disabled = false;
  elements.disableCache.disabled = false;
  elements.retryOnFailure.disabled = false;
  elements.maxRetries.disabled = false;
  elements.stopOnFailure.disabled = false;
  elements.granularity.disabled = false;
  elements.startDate.disabled = false;
  elements.maxRounds.disabled = false;
  elements.bgRules.disabled = false;
  elements.saveConfig.disabled = false;

  const importConfigBtn = document.getElementById('importConfigBtn');
  if (importConfigBtn) importConfigBtn.disabled = false;
}

async function runSimulation() {
  let failedCount = 0;
  let successCount = 0;

  while (state.isRunning && state.currentRound < state.config.maxRounds) {
    if (state.isPaused) {
      await sleep(500);
      continue;
    }

    state.currentRound++;
    elements.currentRound.textContent = state.currentRound;
    const timeUnit = getTimeUnitName();
    log(`--- ${timeUnit} ${state.currentRound} ---`);

    // 按层级顺序排序Agent（下属先执行，上级后执行）
    const sortedAgents = sortAgentsByHierarchy(state.agents);

    if (sortedAgents.length !== state.agents.length) {
      log(`⚠️ 检测到循环依赖，使用原始顺序`, 'error');
    }

    for (const agent of sortedAgents) {
      if (!state.isRunning) break;

      const success = await processAgent(agent, state.currentRound);
      if (success) {
          if (agent.returnDefaultEnabled) {
            let userPrompt = `\n\n该角色具备制定规则的能力，请帮我思考，其指定的规则需要在满足以上要求的基础之上，是否需要添加额外的突发事件，如果需要，请按照如下限制返回新添加的规则：\n
     1： 要求事件开始回合数小于等于总回合数 ` + `${state.config.maxRounds} 且大于等于当前回合数 ${state.currentRound}` + `\n2： 返回格式：{"2":{"name": "突发事件名称","description": "事件概述","stop_round": "结束回合"}\n 3. 如果不需要请返回{}`
    // 构建消息数组
    const rules = [];
    rules.push({
        role: 'system',
        content: state.config.bgRules
      });

    rules.push({
    role: 'user',
    content: userPrompt
  });
      // 确定使用哪个 API 配置
  const apiConfig = agent.useCustomApi ? {
    baseUrl: agent.customBaseUrl,
    apiKey: agent.customApiKey,
    model: agent.customModel
  } : {
    baseUrl: state.config.baseUrl,
    apiKey: state.config.apiKey,
    model: state.config.modelName
  };

  // 重试逻辑
  const maxRetries = state.config.retryOnFailure ? (state.config.maxRetries || 3) : 1;
  const isInfiniteRetry = maxRetries === 99; // 99表示无限重试
  let lastError = null;
  let attempt = 0;

  while (true) {
    attempt++;

    // 检查是否应该停止重试
    if (!isInfiniteRetry && attempt > maxRetries) {
      break;
    }

    try {
      if (attempt > 1) {
        const retryInfo = isInfiniteRetry ? `重试 ${attempt} 次（无限重试模式）` : `重试 ${attempt}/${maxRetries}`;
        log(`${agent.name} ${retryInfo}...`);
        await sleep(Math.min(1000 * attempt, 10000)); // 递增延迟，最多10秒
      }

      const startTime = Date.now();
      const response = await fetch('/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: apiConfig.baseUrl,
          apiKey: apiConfig.apiKey,
          model: apiConfig.model,
          messages: rules
        })
      });

      const data = await response.json();
      const latency = Date.now() - startTime;

      if (data.status === 200 && data.json && data.json.choices) {
        const content = data.json.choices[0].message.content;
        const tokens = data.json.usage?.total_tokens || 0;
        const cachedTokens = data.json.usage?.prompt_tokens_details?.cached_tokens || 0;
        // 如果该 Agent 启用了返回规则，尝试从模型返回中解析出规则并自动添加为突发事件
        if (content) {
          try {
            const parsedRule = tryParseReturnedRule(content);
            if (parsedRule) {
              // 解析支持两种常见格式：
              // 1) { "start_round": 5, "stop_round": 6, "name": "事件", "description": "..." }
              // 2) { "5": { "name": "事件", "description": "...", "stop_round": 6 } }
              let start = null;
              let stop = null;
              let name = null;
              let description = null;
              if (typeof parsedRule === 'object' && !Array.isArray(parsedRule)) {
                // 检查顶层是否包含数字键
                for (const k of Object.keys(parsedRule)) {
                  if (/^\d+$/.test(k)) {
                    start = parseInt(k);
                    const v = parsedRule[k];
                    if (v && typeof v === 'object') {
                      name = v.name || v.title || name;
                      description = v.description || v.desc || v.detail || description;
                      stop = parseInt(v.stop_round || v.stop || v.stopRound || v.stop_round) || stop;
                    }
                    break;
                  }
                }

                // 如果没有数字键，尝试常规字段
                if (start === null) {
                  start = parseInt(parsedRule.start_round || parsedRule.startRound || parsedRule.start) || null;
                  stop = parseInt(parsedRule.stop_round || parsedRule.stopRound || parsedRule.stop) || null;
                  name = parsedRule.name || parsedRule.title || name;
                  description = parsedRule.description || parsedRule.desc || parsedRule.detail || description;
                }
              }

              // 归一化并校验
              if (!start || isNaN(start) || start <= 0) {
                start = state.currentRound + 1; // 默认下一回合生效
              }
              if (!stop || isNaN(stop) || stop < start) {
                stop = start; // 默认只在同一回合生效
              }
              name = name || `由 ${agent.name} 生成的事件`;
              description = description || '';

              // 添加到突发事件（覆盖同回合的已有事件）
              state.events[start] = { name: name, description: description, stop_round: stop };
              renderEvents();
              state.isLocked = false;
              log(`${agent.name} 自动添加突发事件: 第 ${start} 回合 - ${name}`, 'success');
            }
          } catch (e) {
            console.error('解析返回规则失败:', e);
          }
        }
        addLog(state.currentRound, agent.name, `生成突发事件:${content}`);

        // Save to CSV
        await fetch('/api/save_message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            round: state.currentRound,
            agentId: agent.id,
            agentName: agent.name,
            systemText: state.config.bgRules,
            userText: userPrompt,
            responseText: content,
            tokens: tokens,
            latency: latency
          })
        });
        break
      } else {
        lastError = data.head || 'Unknown error';
        const retryInfo = isInfiniteRetry ? `尝试 ${attempt} 次（无限重试）` : `尝试 ${attempt}/${maxRetries}`;
        log(`${agent.name} 响应失败 (${retryInfo}): ${lastError}`, 'error');

        // 如果不是无限重试模式且已达到最大次数，退出
        if (!isInfiniteRetry && attempt >= maxRetries) {
          break;
        }

        // 继续重试
        attempt++;
        continue;
      }
    } catch (err) {
      lastError = err.message;
      const retryInfo = isInfiniteRetry ? `尝试 ${attempt} 次（无限重试）` : `尝试 ${attempt}/${maxRetries}`;
      log(`${agent.name} 处理错误 (${retryInfo}): ${err.message}`, 'error');

      // 如果不是无限重试模式且已达到最大次数，退出
      if (!isInfiniteRetry && attempt >= maxRetries) {
        break;
      }

      // 继续重试
      attempt++;
      continue;
    }
  }


      }
        successCount++;
      } else {
        failedCount++;
        // 如果启用了失败时停止，processAgent 会自动停止模拟
        if (state.config.stopOnFailure) {
          break;
        }
      }

      await sleep(500);
    }

    // 如果因为失败停止了，退出循环
    if (!state.isRunning) break;

    await sleep(1000);
  }

  if (state.isRunning) {
    stopSimulation();
    log('模拟完成！');
    log(`统计: 成功 ${successCount} 次, 失败 ${failedCount} 次`);

    if (failedCount > 0) {
      alert(`模拟完成！\n\n成功: ${successCount} 次\n失败: ${failedCount} 次\n\n建议检查失败的 Agent 配置`);
    } else {
      alert('模拟完成！所有 Agent 都成功响应。');
    }
  }
}

async function processAgent(agent, round) {
  log(`处理 Agent: ${agent.name}`);

  // 构建消息数组
  const messages = [];

  // 判断是否使用缓存
  const useCache = !state.config.disableCache && !state.config.multiApi;

  // 1. 通用背景规则
  if (state.config.bgRules) {
    if (useCache) {
      // 使用 Prompt Caching
      messages.push({
        role: 'system',
        content: [
          {
            type: 'text',
            text: state.config.bgRules,
            cache_control: { type: 'ephemeral' }  // 标记为可缓存
          }
        ]
      });
    } else {
      // 不使用缓存（多 API 模式或手动禁用）
      messages.push({
        role: 'system',
        content: state.config.bgRules
      });
    }
  }
  // 2. Agent 特定规则（每回合都发）
  let agentPromptText = agent.prompt;


  // 3. 检查是否有突发事件
  if (state.events && state.events[round]) {
    const event = state.events[round];
    agentPromptText += `\n\n【突发事件】${event.description}`;
    log(`触发突发事件: ${event.name}`);
    state.Event = {
      name: event.name,
      description: event.description,
      stop_round: event.stop_round
    }
  }
  else if (state.Event && state.Event.stop_round !== round) {
      agentPromptText += `\n\n【突发事件】${state.Event.description}`;
      log(`触发突发事件: ${state.Event.name}`);
    }
  else if (state.Event && state.Event.stop_round === round){
      log(`突发事件结束: ${state.Event.name}---${round}回合`)
      state.Event = null;
    }
  // 4. 添加下属汇报（如果有下属）
  const subordinateReport = buildSubordinateReport(agent.id, round);
  if (subordinateReport) {
    agentPromptText += subordinateReport;
    const subCount = (agent.subordinates || []).length;
    log(`${agent.name} 收到 ${subCount} 个下属的汇报${agent.includeSubSubordinates ? '（含间接下属）' : ''}`);
  }

  const timeUnit = getTimeUnitName();
  messages.push({
    role: 'user',
    content: `${agentPromptText}\n\n当前是第 ${round} ${timeUnit}，请做出决策。`
  });

  // 确定使用哪个 API 配置
  const apiConfig = agent.useCustomApi ? {
    baseUrl: agent.customBaseUrl,
    apiKey: agent.customApiKey,
    model: agent.customModel
  } : {
    baseUrl: state.config.baseUrl,
    apiKey: state.config.apiKey,
    model: state.config.modelName
  };

  // 重试逻辑
  const maxRetries = state.config.retryOnFailure ? (state.config.maxRetries || 3) : 1;
  const isInfiniteRetry = maxRetries === 99; // 99表示无限重试
  let lastError = null;
  let attempt = 0;

  while (true) {
    attempt++;

    // 检查是否应该停止重试
    if (!isInfiniteRetry && attempt > maxRetries) {
      break;
    }

    try {
      if (attempt > 1) {
        const retryInfo = isInfiniteRetry ? `重试 ${attempt} 次（无限重试模式）` : `重试 ${attempt}/${maxRetries}`;
        log(`${agent.name} ${retryInfo}...`);
        await sleep(Math.min(1000 * attempt, 10000)); // 递增延迟，最多10秒
      }

      const startTime = Date.now();
      const response = await fetch('/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: apiConfig.baseUrl,
          apiKey: apiConfig.apiKey,
          model: apiConfig.model,
          messages: messages
        })
      });

      const data = await response.json();
      const latency = Date.now() - startTime;

      if (data.status === 200 && data.json && data.json.choices) {
        const content = data.json.choices[0].message.content;
        const tokens = data.json.usage?.total_tokens || 0;
        const cachedTokens = data.json.usage?.prompt_tokens_details?.cached_tokens || 0;
        state.totalTokens += tokens;
        elements.tokenCount.textContent = `Tokens: ${state.totalTokens}`;

        // 显示缓存命中信息
        if (cachedTokens > 0 && useCache) {
          log(`${agent.name} 缓存命中: ${cachedTokens} tokens`);
        }

        addLog(round, agent.name, content);

        // Save to CSV
        await fetch('/api/save_message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            round: round,
            agentId: agent.id,
            agentName: agent.name,
            systemText: state.config.bgRules,
            userText: agent.prompt,
            responseText: content,
            tokens: tokens,
            latency: latency
          })
        });

        const cacheInfo = useCache && cachedTokens > 0 ? `, 缓存: ${cachedTokens}` : '';
        const apiInfo = agent.useCustomApi ? ` [独立API]` : '';
        const retryInfo = attempt > 1 ? ` [重试${attempt}次成功]` : '';
        log(`${agent.name} 响应成功 (${tokens} tokens${cacheInfo}, ${latency}ms)${apiInfo}${retryInfo}`);

        return true; // 成功
      } else {
        lastError = data.head || 'Unknown error';
        const retryInfo = isInfiniteRetry ? `尝试 ${attempt} 次（无限重试）` : `尝试 ${attempt}/${maxRetries}`;
        log(`${agent.name} 响应失败 (${retryInfo}): ${lastError}`, 'error');

        // 如果不是无限重试模式且已达到最大次数，退出
        if (!isInfiniteRetry && attempt >= maxRetries) {
          break;
        }

        // 继续重试
        attempt++;
        continue;
      }
    } catch (err) {
      lastError = err.message;
      const retryInfo = isInfiniteRetry ? `尝试 ${attempt} 次（无限重试）` : `尝试 ${attempt}/${maxRetries}`;
      log(`${agent.name} 处理错误 (${retryInfo}): ${err.message}`, 'error');

      // 如果不是无限重试模式且已达到最大次数，退出
      if (!isInfiniteRetry && attempt >= maxRetries) {
        break;
      }

      // 继续重试
      attempt++;
      continue;
    }
  }

  // 所有重试都失败了（仅在非无限重试模式下）
  const retryMsg = isInfiniteRetry ? `已重试 ${attempt - 1} 次（无限重试模式异常退出）` : `已重试 ${maxRetries} 次`;
  const errorMsg = `错误: ${lastError} (${retryMsg})`;
  addLog(round, agent.name, errorMsg);
  log(`${agent.name} 最终失败: ${lastError}`, 'error');

  // 即使失败也要保存到 CSV，保证每个 Agent 每回合都有记录
  await fetch('/api/save_message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      round: round,
      agentId: agent.id,
      agentName: agent.name,
      systemText: state.config.bgRules,
      userText: agent.prompt,
      responseText: `[失败] ${errorMsg}`,
      tokens: 0,
      latency: 0
    })
  });

  // 如果配置了失败时停止
  if (state.config.stopOnFailure) {
    log(`检测到失败，停止模拟（失败时停止已启用）`, 'error');
    stopSimulation();
    const retryMsg = isInfiniteRetry ? `已重试 ${attempt - 1} 次（无限重试模式）` : `已重试 ${maxRetries} 次`;
    alert(`Agent "${agent.name}" 处理失败，模拟已停止。\n\n错误: ${lastError}\n\n${retryMsg}`);
  }

  return false; // 失败
}

// Logging
function addLog(round, agent, message) {
  const timestamp = new Date().toLocaleTimeString();
  state.logs.push({ round, agent, message, timestamp });

  const row = `
    <tr>
      <td>${round}</td>
      <td>${agent}</td>
      <td>${message.substring(0, 200)}${message.length > 200 ? '...' : ''}</td>
      <td>${timestamp}</td>
    </tr>
  `;

  if (elements.logBody.querySelector('td[colspan]')) {
    elements.logBody.innerHTML = row;
  } else {
    elements.logBody.insertAdjacentHTML('afterbegin', row);
  }
}

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✓' : '•';
  const line = `[${timestamp}] ${prefix} ${message}\n`;

  elements.console.textContent += line;
  elements.console.scrollTop = elements.console.scrollHeight;
}

function clearLog() {
  if (!confirm('确定要清空所有日志吗？')) return;

  state.logs = [];
  elements.logBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--muted);">暂无数据</td></tr>';
  log('日志已清空');
}

// Export
async function exportCSV() {
  try {
    const response = await fetch('/api/export', { method: 'POST' });
    const data = await response.json();

    if (data.status === 200) {
      log(`CSV 导出成功: ${data.filename}`);
      alert(`导出成功: ${data.filename}\n文件位置: exports/${data.filename}`);
    } else {
      log(`CSV 导出失败: ${data.error}`, 'error');
      alert(`导出失败: ${data.error}`);
    }
  } catch (err) {
    log(`CSV 导出错误: ${err.message}`, 'error');
    alert(`导出错误: ${err.message}`);
  }
}

async function exportExcel() {
  try {
    log('正在导出 Excel...');
    const response = await fetch('/api/export_excel', { method: 'POST' });
    const data = await response.json();

    if (data.status === 200) {
      log(`Excel 导出成功: ${data.filename}`, 'success');
      alert(`导出成功: ${data.filename}\n\n文件位置: exports/${data.filename}\n\n包含两个工作表：\n- 模拟结果（简化版）\n- 详细数据（完整版）`);
    } else {
      log(`Excel 导出失败: ${data.error}`, 'error');

      if (!data.excel_available) {
        alert(`Excel 导出失败\n\n原因: openpyxl 库未安装\n\n解决方法:\n1. 打开命令行\n2. 运行: pip install openpyxl\n3. 重启服务器\n\n或者使用 CSV 导出功能`);
      } else {
        alert(`导出失败: ${data.error}`);
      }
    }
  } catch (err) {
    log(`Excel 导出错误: ${err.message}`, 'error');
    alert(`导出错误: ${err.message}`);
  }
}

async function checkExcelAvailability() {
  try {
    const response = await fetch('/api/check_excel', { method: 'POST' });
    const data = await response.json();

    const exportExcelBtn = document.getElementById('exportExcel');
    if (exportExcelBtn && !data.excel_available) {
      exportExcelBtn.title = 'Excel 导出需要安装 openpyxl 库\n运行: pip install openpyxl';
      exportExcelBtn.style.opacity = '0.6';
      log('提示: Excel 导出功能需要安装 openpyxl 库', 'error');
    }
  } catch (err) {
    console.error('检查 Excel 可用性失败:', err);
  }
}

function exportJSON() {
  const data = {
    config: state.config,
    agents: state.agents,
    logs: state.logs,
    events: state.events,
    exportTime: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mass_export_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);

  log('JSON 导出成功');
}

// Export current configuration
function exportConfig() {
  // Read current UI state
  const currentConfig = {
    config: {
      // API 配置
      baseUrl: elements.baseUrl.value.trim(),
      apiKey: elements.apiKey.value.trim(),
      modelName: elements.modelName.value.trim(),

      // 基本设置
      granularity: elements.granularity.value,
      customGranularity: elements.customGranularity.value.trim(),
      startDate: elements.startDate.value,
      maxRounds: parseInt(elements.maxRounds.value) || 8,
      bgRules: elements.bgRules.value.trim(),

      // 高级选项
      multiApi: elements.multiApi.checked,
      disableCache: elements.disableCache.checked,
      retryOnFailure: elements.retryOnFailure.checked,
      maxRetries: parseInt(elements.maxRetries.value) || 3,
      stopOnFailure: elements.stopOnFailure.checked
    },
    agents: state.agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      prompt: agent.prompt,
      data: agent.data || {},
      useCustomApi: agent.useCustomApi || false,
      customBaseUrl: agent.customBaseUrl || '',
      customApiKey: agent.customApiKey || '',
      customModel: agent.customModel || '',
      subordinates: agent.subordinates || [],
      includeSubSubordinates: agent.includeSubSubordinates || false,
      returnDefaultEnabled: agent.returnDefaultEnabled || false
    })),
    events: state.events,
    exportTime: new Date().toISOString(),
    version: '1.1'
  };

  const blob = new Blob([JSON.stringify(currentConfig, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mass_config_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);

  log('配置导出成功');
  alert('配置已导出！');
}

// Import configuration from JSON file
function handleImportConfig(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);

      // Validate data structure
      if (!data.config || !data.agents) {
        throw new Error('配置文件格式不正确');
      }

      // Import configuration
      if (data.config.baseUrl) elements.baseUrl.value = data.config.baseUrl;
      if (data.config.apiKey) elements.apiKey.value = data.config.apiKey;
      if (data.config.modelName) elements.modelName.value = data.config.modelName;
      if (data.config.granularity) elements.granularity.value = data.config.granularity;
      if (data.config.customGranularity) elements.customGranularity.value = data.config.customGranularity;
      if (data.config.startDate) elements.startDate.value = data.config.startDate;
      if (data.config.maxRounds) elements.maxRounds.value = data.config.maxRounds;
      if (data.config.bgRules) elements.bgRules.value = data.config.bgRules;
      if (typeof data.config.multiApi !== 'undefined') elements.multiApi.checked = data.config.multiApi;
      if (typeof data.config.disableCache !== 'undefined') elements.disableCache.checked = data.config.disableCache;
      if (typeof data.config.retryOnFailure !== 'undefined') elements.retryOnFailure.checked = data.config.retryOnFailure;
      if (data.config.maxRetries) elements.maxRetries.value = data.config.maxRetries;
      if (typeof data.config.stopOnFailure !== 'undefined') elements.stopOnFailure.checked = data.config.stopOnFailure;

      // 显示/隐藏自定义时间单位输入框
      if (data.config.granularity === 'custom') {
        elements.customGranularityGroup.style.display = 'block';
      } else {
        elements.customGranularityGroup.style.display = 'none';
      }

      // Update state
      state.config = {
        baseUrl: data.config.baseUrl || '',
        apiKey: data.config.apiKey || '',
        modelName: data.config.modelName || '',
        maxTokens: data.config.maxTokens || 512,
        granularity: data.config.granularity || 'week',
        customGranularity: data.config.customGranularity || '',
        startDate: data.config.startDate || '',
        maxRounds: data.config.maxRounds || 8,
        bgRules: data.config.bgRules || '',
        multiApi: data.config.multiApi || false,
        disableCache: data.config.disableCache || false,
        retryOnFailure: data.config.retryOnFailure !== false,
        maxRetries: data.config.maxRetries || 3,
        stopOnFailure: data.config.stopOnFailure || false
      };

      // Import agents
      state.agents = [];
      if (Array.isArray(data.agents)) {
        data.agents.forEach(agent => {
          state.agents.push({
            id: agent.id || `agent_${Date.now()}_${Math.random()}`,
            name: agent.name || 'Unnamed Agent',
            prompt: agent.prompt || '',
            data: agent.data || {},
            useCustomApi: agent.useCustomApi || false,
            customBaseUrl: agent.customBaseUrl || '',
            customApiKey: agent.customApiKey || '',
            customModel: agent.customModel || '',
            subordinates: agent.subordinates || [],
            includeSubSubordinates: agent.includeSubSubordinates || false,
            returnDefaultEnabled: agent.returnDefaultEnabled === true
          });
        });
      }

      // Import events
      state.events = data.events || {};

      renderAgents();
      renderEvents();

      const eventCount = Object.keys(state.events).length;
      log(`配置导入成功: ${data.agents.length} 个 Agent, ${eventCount} 个事件`);
      alert(`配置导入成功！\n- ${data.agents.length} 个 Agent\n- ${eventCount} 个突发事件\n- 模型: ${data.config.modelName || '未设置'}`);

      // Clear file input
      event.target.value = '';

    } catch (err) {
      log(`配置导入失败: ${err.message}`, 'error');
      alert(`配置导入失败: ${err.message}`);
    }
  };

  reader.onerror = function () {
    log('文件读取失败', 'error');
    alert('文件读取失败');
  };

  reader.readAsText(file);
}

// Utilities
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 尝试从模型返回文本中解析出 JSON 规则（兼容多种格式）
function tryParseReturnedRule(text) {
  if (!text || typeof text !== 'string') return null;

  // 尝试抽取最外层的 JSON 对象
  const match = text.match(/\{[\s\S]*\}/);
  let jsonText = match ? match[0] : null;

  if (!jsonText) return null;

  try {
    return JSON.parse(jsonText);
  } catch (e) {
    // 失败时尝试把单引号转为双引号再解析
    try {
      const repaired = jsonText.replace(/'/g, '"');
      return JSON.parse(repaired);
    } catch (e2) {
      // 最后尝试移除可能的多余字符
      try {
        const cleaned = jsonText.replace(/\n/g, ' ').replace(/\t/g, ' ');
        return JSON.parse(cleaned);
      } catch (e3) {
        return null;
      }
    }
  }
}

// 配置Agent层级关系
function configHierarchy(agentId) {
  if (state.isLocked) {
    alert('模拟运行中，无法配置层级');
    return;
  }

  const agent = state.agents.find(a => a.id === agentId);
  if (!agent) return;

  // 创建层级配置对话框
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;

  // 获取可选的下属（排除自己和已经是自己上级的Agent）
  const availableSubordinates = state.agents.filter(a => {
    if (a.id === agent.id) return false; // 排除自己
    // 检查是否会造成循环依赖
    return !isSubordinateOf(agent.id, a.id);
  });

  const subordinateCheckboxes = availableSubordinates.map(a => {
    const isChecked = (agent.subordinates || []).includes(a.id);
    return `
      <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: ${isChecked ? 'rgba(52, 152, 219, 0.1)' : '#0f1520'}; border: 1px solid var(--border); border-radius: 6px; cursor: pointer; margin-bottom: 0.5rem;">
        <input type="checkbox" value="${a.id}" ${isChecked ? 'checked' : ''} style="width: auto;">
        <span style="flex: 1;">${a.name}</span>
      </label>
    `;
  }).join('');

  modal.innerHTML = `
    <div style="background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; width: 90%; max-width: 600px; max-height: 80vh; overflow-y: auto;">
      <h3 style="margin-bottom: 1rem; color: var(--primary);">配置层级关系: ${agent.name}</h3>
      
      <div style="margin-bottom: 1rem; padding: 1rem; background: rgba(52, 152, 219, 0.1); border: 1px solid var(--primary); border-radius: 8px;">
        <div style="font-size: 0.875rem; color: var(--text); margin-bottom: 0.5rem;">
          <strong>层级说明：</strong>
        </div>
        <ul style="font-size: 0.875rem; color: var(--muted); margin-left: 1.5rem; line-height: 1.8;">
          <li>选择此Agent的<strong>直接下属</strong></li>
          <li>下属的行动记录会在此Agent行动前汇报</li>
          <li>可选择是否包含<strong>间接下属</strong>（下属的下属）</li>
          <li>支持多级层级结构</li>
        </ul>
      </div>
      
      <div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.75rem; font-size: 0.875rem; color: var(--text); font-weight: 600;">选择直接下属：</label>
        <div id="subordinateList" style="max-height: 300px; overflow-y: auto;">
          ${subordinateCheckboxes || '<div style="color: var(--muted); font-size: 0.875rem; padding: 1rem; text-align: center;">没有可选的下属Agent</div>'}
        </div>
      </div>
      
      <div style="margin-bottom: 1.5rem;">
        <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: rgba(243, 156, 18, 0.1); border: 1px solid var(--warning); border-radius: 8px; cursor: pointer;">
          <input type="checkbox" id="includeSubSub" ${agent.includeSubSubordinates ? 'checked' : ''} style="width: auto;">
          <span style="font-size: 0.875rem; color: var(--text);">
            <strong>包含间接下属</strong>
            <div style="font-size: 0.75rem; color: var(--muted); margin-top: 0.25rem;">
              勾选后，下属的下属的行动也会汇报给此Agent
            </div>
          </span>
        </label>
      </div>
      
      <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
        <button id="cancelHierarchy" style="padding: 0.75rem 1.25rem; background: #34495e; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.875rem;">取消</button>
        <button id="saveHierarchy" style="padding: 0.75rem 1.25rem; background: var(--success); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.875rem;">保存</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // 取消按钮
  document.getElementById('cancelHierarchy').onclick = () => {
    document.body.removeChild(modal);
  };

  // 保存按钮
  document.getElementById('saveHierarchy').onclick = () => {
    const checkboxes = modal.querySelectorAll('#subordinateList input[type="checkbox"]');
    const selectedSubordinates = Array.from(checkboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value);

    const includeSubSub = document.getElementById('includeSubSub').checked;

    agent.subordinates = selectedSubordinates;
    agent.includeSubSubordinates = includeSubSub;

    const subNames = selectedSubordinates.map(id => state.agents.find(a => a.id === id)?.name || '未知').join(', ');
    log(`${agent.name} 层级配置: 下属[${subNames}]${includeSubSub ? ', 含间接下属' : ''}`);

    renderAgents();
    document.body.removeChild(modal);
  };

  // 点击背景关闭
  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  };
}

// 检查agent1是否是agent2的下属（直接或间接）
function isSubordinateOf(agent1Id, agent2Id) {
  const agent2 = state.agents.find(a => a.id === agent2Id);
  if (!agent2 || !agent2.subordinates) return false;

  // 检查直接下属
  if (agent2.subordinates.includes(agent1Id)) return true;

  // 递归检查间接下属
  for (const subId of agent2.subordinates) {
    if (isSubordinateOf(agent1Id, subId)) return true;
  }

  return false;
}

// 获取Agent的所有下属（包括间接下属）
function getAllSubordinates(agentId, includeIndirect = false) {
  const agent = state.agents.find(a => a.id === agentId);
  if (!agent || !agent.subordinates || agent.subordinates.length === 0) {
    return [];
  }

  const result = [...agent.subordinates];

  if (includeIndirect) {
    for (const subId of agent.subordinates) {
      const indirectSubs = getAllSubordinates(subId, true);
      result.push(...indirectSubs);
    }
  }

  // 去重
  return [...new Set(result)];
}

// 获取Agent在当前回合的行动记录
function getAgentActionInRound(agentId, round) {
  const agent = state.agents.find(a => a.id === agentId);
  if (!agent) return null;

  // 从logs中查找该Agent在该回合的记录
  const log = state.logs.find(l => l.round === round && l.agent === agent.name);
  return log ? log.message : null;
}

// 构建下属汇报内容
function buildSubordinateReport(agentId, round) {
  const agent = state.agents.find(a => a.id === agentId);
  if (!agent) return '';

  const directSubs = agent.subordinates || [];
  if (directSubs.length === 0) return '';

  let report = '\n\n【下属行动汇报】\n';

  // 收集直接下属的行动
  for (const subId of directSubs) {
    const subAgent = state.agents.find(a => a.id === subId);
    if (!subAgent) continue;

    const action = getAgentActionInRound(subId, round);
    if (action) {
      report += `\n${subAgent.name}: ${action}`;
    }
  }

  // 如果需要包含间接下属
  if (agent.includeSubSubordinates) {
    const indirectSubs = [];
    for (const subId of directSubs) {
      const subSubIds = getAllSubordinates(subId, true);
      indirectSubs.push(...subSubIds);
    }

    if (indirectSubs.length > 0) {
      report += '\n\n【间接下属行动汇报】\n';
      for (const subId of indirectSubs) {
        const subAgent = state.agents.find(a => a.id === subId);
        if (!subAgent) continue;

        const action = getAgentActionInRound(subId, round);
        if (action) {
          report += `\n${subAgent.name}: ${action}`;
        }
      }
    }
  }

  return report;
}

// 按层级关系对 Agent 进行拓扑排序（下属优先）
function sortAgentsByHierarchy(agents) {
  if (!Array.isArray(agents)) return [];
  if (agents.length <= 1) return [...agents];

  const agentMap = new Map();
  const indegree = {};
  const graph = {};
  const originalOrder = [];
  const originalIndex = {};
  const fallbackAgents = [];

  agents.forEach((agent, index) => {
    if (!agent || !agent.id) {
      fallbackAgents.push(agent);
      return;
    }
    agentMap.set(agent.id, agent);
    indegree[agent.id] = 0;
    graph[agent.id] = [];
    originalOrder.push(agent.id);
    originalIndex[agent.id] = index;
  });

  // 构建从下属指向上级的图
  agents.forEach(agent => {
    if (!agent || !agent.id || !Array.isArray(agent.subordinates)) return;
    agent.subordinates.forEach(subId => {
      if (!agentMap.has(subId) || subId === agent.id) return;
      graph[subId].push(agent.id);
      indegree[agent.id] = (indegree[agent.id] || 0) + 1;
    });
  });

  const queue = originalOrder.filter(id => indegree[id] === 0);
  queue.sort((a, b) => originalIndex[a] - originalIndex[b]);

  const sorted = [];
  const visited = new Set();

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!agentMap.has(currentId) || visited.has(currentId)) continue;

    visited.add(currentId);
    sorted.push(agentMap.get(currentId));

    for (const nextId of graph[currentId]) {
      indegree[nextId]--;
      if (indegree[nextId] === 0) {
        queue.push(nextId);
        queue.sort((a, b) => originalIndex[a] - originalIndex[b]);
      }
    }
  }

  // 追加仍未排序的Agent（存在循环或无效引用）
  const remaining = originalOrder.filter(id => !visited.has(id));
  remaining.forEach(id => {
    if (agentMap.has(id)) {
      sorted.push(agentMap.get(id));
    }
  });

  // 将没有ID的Agent保持原始顺序追加到结果
  return [...sorted, ...fallbackAgents];
}

// Make functions globally accessible
window.removeAgent = removeAgent;
window.editAgent = editAgent;
window.removeEvent = removeEvent;
window.editEvent = editEvent;
window.configAgentApi = configAgentApi;
window.configHierarchy = configHierarchy;

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
