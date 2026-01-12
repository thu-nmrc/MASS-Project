// ... existing code ...

// 全局变量存储seed数据
let seedData = null;

// 异步加载seed数据
async function loadSeedData() {
    if (seedData === null) {
        try {
            const response = await fetch('./seed.json');
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
        
        // 这里保持原有的回填逻辑
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

// ... existing code ...