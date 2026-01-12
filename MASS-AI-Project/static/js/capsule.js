// 文本胶囊协议实现
// 版本: 1.0
// 功能: 实现"本回合产出 → 下一回合注入"以及"首回合限定内容（seed）"

(function() {
  'use strict';

  // 全局存储：按agent维度存储回填字典
  window.agentCapsuleData = window.agentCapsuleData || {};

  /**
   * 从模型回复中提取回填胶囊
   * @param {string} content - 模型回复内容
   * @returns {Object|null} - 提取的键值对字典，如果没有找到则返回null
   */
  function parseReturnCapsule(content) {
    if (!content || typeof content !== 'string') return null;
    
    const beginMarker = '[RC-BEGIN]';
    const endMarker = '[RC-END]';
    
    const beginIndex = content.indexOf(beginMarker);
    const endIndex = content.indexOf(endMarker);
    
    if (beginIndex === -1 || endIndex === -1 || endIndex <= beginIndex) {
      return null;
    }
    
    const capsuleContent = content.substring(beginIndex + beginMarker.length, endIndex).trim();
    
    // 解析key=value格式
    const result = {};
    const lines = capsuleContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex === -1) continue;
      
      const key = trimmedLine.substring(0, equalIndex).trim();
      const value = trimmedLine.substring(equalIndex + 1).trim();
      
      if (key) {
        result[key] = value;
      }
    }
    
    return Object.keys(result).length > 0 ? result : null;
  }

  /**
   * 根据回填数据或seed生成注入胶囊
   * @param {Object} agent - Agent对象
   * @param {number} round - 当前回合数
   * @returns {string|null} - 生成的注入胶囊文本，如果没有数据则返回null
   */
  // 全局变量存储seed数据
  let seedData = null;
  
  // 异步加载seed数据
  async function loadSeedData() {
      if (seedData === null) {
          try {
              const response = await fetch('/static/seed.json');
              seedData = await response.json();
              console.log('Seed data loaded successfully:', seedData);
          } catch (error) {
              console.error('Failed to load seed data:', error);
              seedData = {};
          }
      }
      return seedData;
  }
  
  // 修改generateInjectCapsule函数
  window.generateInjectCapsule = async function(agent, round) {
      console.log(`[generateInjectCapsule] Called for agent: ${agent.id}, round: ${round}`);
      
      // 确保seed数据已加载
      await loadSeedData();
      
      if (round === 1) {
          // Round 1: 使用seed.json中的数据
          const agentSeedData = seedData[agent.id];
          if (!agentSeedData) {
              console.warn(`No seed data found for agent ${agent.id}`);
              return '';
          }
          
          console.log(`[generateInjectCapsule] Using seed data for ${agent.id}:`, agentSeedData);
          
          // 计算衍生字段
          const fte = agentSeedData.headcount_ft + (agentSeedData.headcount_pt * 0.5);
          const p_hire = agentSeedData.hires_realized / agentSeedData.hire_attempts;
          const fill_rate = fte / agentSeedData.target_fte;
          
          // 生成注入胶囊
          let capsule = '[RC-INJECT-BEGIN]\n';
          capsule += `round_hint=${round}\n`;
          
          // 添加所有seed数据字段
          for (const [key, value] of Object.entries(agentSeedData)) {
              capsule += `${key}=${value}\n`;
          }
          
          // 添加计算字段
          capsule += `fte=${fte}\n`;
          capsule += `p_hire=${p_hire}\n`;
          capsule += `fill_rate=${fill_rate}\n`;
          
          capsule += '[RC-INJECT-END]';
          
          console.log(`[generateInjectCapsule] Generated capsule for Round 1:`, capsule);
          return capsule;
      } else {
          // Round 2+: 使用回填数据逻辑（保持原有逻辑不变）
          console.log(`[generateInjectCapsule] Round ${round}, using backfill logic`);
          
          let capsule = '[RC-INJECT-BEGIN]\n';
          capsule += `round_hint=${round}\n`;
          
          // 从agent的当前状态获取回填数据
          if (agent.seed && typeof agent.seed === 'object') {
              const fte = agent.seed.headcount_ft + (agent.seed.headcount_pt * 0.5);
              const p_hire = agent.seed.hires_realized / agent.seed.hire_attempts;
              const fill_rate = fte / agent.seed.target_fte;
              
              capsule += `prev_ft=${agent.seed.headcount_ft}\n`;
              capsule += `prev_pt=${agent.seed.headcount_pt}\n`;
              capsule += `prev_fte=${fte}\n`;
              capsule += `prev_wage=${agent.seed.starting_wage}\n`;
              capsule += `prev_price_soda_med=${agent.seed.price_soda_med}\n`;
              capsule += `prev_price_fries_small=${agent.seed.price_fries_small}\n`;
              capsule += `prev_price_entree=${agent.seed.price_entree}\n`;
              capsule += `prev_price_full_meal_after_tax=${agent.seed.price_full_meal_after_tax}\n`;
              capsule += `last_hire_attempts=${agent.seed.hire_attempts}\n`;
              capsule += `last_p_hire=${p_hire}\n`;
              capsule += `last_hires_realized=${agent.seed.hires_realized}\n`;
              capsule += `last_fill_rate=${fill_rate}\n`;
              capsule += `last_weekday_hours_open=${agent.seed.weekday_hours_open}\n`;
              capsule += `last_n_registers_open_11am=${agent.seed.n_registers_open_11am}\n`;
          }
          
          capsule += '[RC-INJECT-END]';
          
          console.log(`[generateInjectCapsule] Generated capsule for Round ${round}:`, capsule);
          return capsule;
      }
  };
  
  /**
   * 处理模型回复并存储回填胶囊
   * @param {Object} agent - Agent对象
   * @param {string} content - 模型回复内容
   * @param {number} round - 当前回合数
   */
  function processReturnCapsule(agent, content, round) {
    if (!agent || !agent.id) return;
    
    const returnData = parseReturnCapsule(content);
    
    if (!window.agentCapsuleData[agent.id]) {
      window.agentCapsuleData[agent.id] = {};
    }
    
    window.agentCapsuleData[agent.id].returnData = returnData;
    window.agentCapsuleData[agent.id].lastRound = round;
    window.agentCapsuleData[agent.id].lastUpdate = new Date().toISOString();
    
    // 调试日志
    if (returnData) {
      console.log(`Agent ${agent.id} 第${round}回合回填胶囊:`, returnData);
    }
  }

  /**
   * 清空指定Agent的回填缓存
   * @param {string} agentId - Agent ID
   */
  function clearAgentCapsule(agentId) {
    if (window.agentCapsuleData[agentId]) {
      delete window.agentCapsuleData[agentId];
      console.log(`已清空 Agent ${agentId} 的回填缓存`);
    }
  }

  /**
   * 获取所有Agent的回填状态
   * @returns {Object} - 所有Agent的回填状态
   */
  function getCapsuleStatus() {
    const status = {};
    for (const [agentId, data] of Object.entries(window.agentCapsuleData)) {
      status[agentId] = {
        hasData: !!(data.returnData && Object.keys(data.returnData).length > 0),
        lastRound: data.lastRound,
        lastUpdate: data.lastUpdate,
        dataKeys: data.returnData ? Object.keys(data.returnData) : []
      };
    }
    return status;
  }

  // 导出函数到全局
  window.parseReturnCapsule = parseReturnCapsule;
  window.generateInjectCapsule = generateInjectCapsule;
  window.processReturnCapsule = processReturnCapsule;
  window.clearAgentCapsule = clearAgentCapsule;
  window.getCapsuleStatus = getCapsuleStatus;

})();