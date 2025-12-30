// MASS 完整多语言支持
// Complete Multi-language Support

const translations = {
    'zh-CN': {
        // 通用
        'tokens': 'Tokens',
        'app.tokens': 'Tokens',
        'of': '/',

        // 标题
        'app.title': 'MASS - 多智能体社会模拟平台',
        'app.subtitle': 'Multi-Agent Social Simulation Platform',
        'title': 'MASS - 多智能体社会模拟平台',
        'subtitle': 'Multi-Agent Social Simulation Platform',

        // 章节标题
        'section.settings': '⚙️ 基本设置',
        'section.agents': '🤖 Agent 管理',
        'section.events': '⚡ 突发事件',
        'section.api': '🔌 API 配置',
        'section.error': '🔄 错误处理',
        'section.control': '▶️ 运行控制',
        'section.results': '📊 模拟结果',
        'section.console': '🐛 调试控制台',

        // 基本设置
        'granularity': '时间粒度',
        'granularity.day': '日',
        'granularity.week': '周',
        'granularity.month': '月',
        'granularity.quarter': '季度',
        'granularity.year': '年',
        'startDate': '起始日期',
        'maxRounds': '回合上限（1-1000）',
        'maxRounds.hint': '系统最大支持 1000 回合',
        'bgRules': '背景规则',
        'bgRules.placeholder': '输入模拟的背景规则、政策、约束条件等...',

        // Agent 管理
        'agent.name': 'Agent 名称',
        'agent.name.placeholder': '例如: 商店A, 工人B',
        'agent.prompt': 'Agent Prompt',
        'agent.prompt.placeholder': '描述这个 Agent 的角色、目标、决策逻辑...',
        'agent.add': '➕ 添加 Agent',
        'agent.count': '个 Agent',
        'agent.count.hint': '系统最大支持 300 个 Agent',
        'agent.none': '暂无 Agent',
        'agent.edit': '编辑',
        'agent.delete': '删除',
        'agent.api': 'API',
        'agent.customApi': '🔌 使用独立 API',
        'agent.hierarchy': '层级',

        // 突发事件
        'event.round': '触发回合',
        'event.round.placeholder': '例如: 3',
        'event.stop': '停止回合',
        'event.stop.placeholder': '例如: 3',
        'event.name': '事件名称',
        'event.name.placeholder': '例如: 政策变化',
        'event.desc': '事件描述',
        'event.desc.placeholder': '描述这个突发事件的内容和影响...',
        'event.add': '➕ 添加事件',
        'event.count': '个事件',
        'event.none': '暂无突发事件',
        'event.edit': '编辑',
        'event.delete': '删除',

        // API 配置
        'api.baseUrl': 'Base URL',
        'api.baseUrl.placeholder': 'https://api.openai.com/v1',
        'api.key': 'API Key',
        'api.key.placeholder': 'sk-...',
        'api.model': '模型名称',
        'api.model.placeholder': 'gpt-4',
        'api.multiApi': '启用多 API 模式（不同 Agent 使用不同 API）',
        'api.multiApi.hint': '⚠️ 启用后可为每个 Agent 单独配置 API，但会自动禁用 Prompt 缓存',
        'api.disableCache': '禁用 Prompt 缓存（每回合发送完整背景规则）',
        'api.disableCache.hint': '多 API 模式启用时此选项将被自动勾选且无法取消',
        'api.save': '💾 保存配置',
        'api.test': '🧪 测试连接',
        'api.autoSave.hint': '💡 提示：配置会自动保存，无需手动点击保存按钮即可导出',

        // 错误处理
        'error.retry': '失败时自动重试',
        'error.retry.hint': 'API 调用失败时自动重试，提高成功率',
        'error.maxRetries': '最大重试次数',
        'error.maxRetries.hint': '每个 Agent 失败后最多重试几次（1-10）',
        'error.stopOnFailure': '失败时停止整个模拟',
        'error.stopOnFailure.hint': '任何 Agent 失败后立即停止模拟（即使已重试）',

        // 运行控制
        'control.start': '开始模拟',
        'control.pause': '暂停',
        'control.stop': '停止',

        // 模拟结果
        'results.currentRound': '当前回合',
        'results.status': '状态',
        'results.status.notStarted': '未开始',
        'results.status.running': '运行中（配置已锁定）',
        'results.status.paused': '已暂停',
        'results.status.stopped': '已停止',
        'results.exportCSV': '📥 导出 CSV',
        'results.exportExcel': '📊 导出 Excel',
        'results.exportJSON': '📥 导出 JSON',
        'results.clearLog': '🗑️ 清空日志',
        'results.round': '回合',
        'results.agent': 'Agent',
        'results.message': '消息',
        'results.time': '时间',
        'results.noData': '暂无数据',
        'console.waiting': '等待运行...',

        // 导入导出
        'import.config': '📥 导入配置',
        'export.config': '📤 导出配置',

        // 对话框
        'dialog.editAgent': '编辑 Agent',
        'dialog.editEvent': '编辑突发事件',
        'dialog.cancel': '取消',
        'dialog.save': '保存'
    },

    'en': {
        // Common
        'tokens': 'Tokens',
        'app.tokens': 'Tokens',
        'of': '/',

        // Title
        'app.title': 'MASS - Multi-Agent Social Simulation Platform',
        'app.subtitle': 'Multi-Agent Social Simulation Platform',
        'title': 'MASS - Multi-Agent Social Simulation Platform',
        'subtitle': 'Multi-Agent Social Simulation Platform',

        // Section Titles
        'section.settings': '⚙️ Basic Settings',
        'section.agents': '🤖 Agent Management',
        'section.events': '⚡ Random Events',
        'section.api': '🔌 API Configuration',
        'section.error': '🔄 Error Handling',
        'section.control': '▶️ Run Control',
        'section.results': '📊 Simulation Results',
        'section.console': '🐛 Debug Console',

        // Basic Settings
        'granularity': 'Time Granularity',
        'granularity.day': 'Day',
        'granularity.week': 'Week',
        'granularity.month': 'Month',
        'granularity.quarter': 'Quarter',
        'granularity.year': 'Year',
        'startDate': 'Start Date',
        'maxRounds': 'Max Rounds (1-1000)',
        'maxRounds.hint': 'System supports up to 1000 rounds',
        'bgRules': 'Background Rules',
        'bgRules.placeholder': 'Enter simulation background rules, policies, constraints, etc...',

        // Agent Management
        'agent.name': 'Agent Name',
        'agent.name.placeholder': 'e.g.: Store A, Worker B',
        'agent.prompt': 'Agent Prompt',
        'agent.prompt.placeholder': 'Describe the agent\'s role, goals, decision logic...',
        'agent.add': '➕ Add Agent',
        'agent.count': 'Agents',
        'agent.count.hint': 'System supports up to 300 agents',
        'agent.none': 'No agents',
        'agent.edit': 'Edit',
        'agent.delete': 'Delete',
        'agent.api': 'API',
        'agent.customApi': '🔌 Using Custom API',
        'agent.hierarchy': 'Hierarchy',

        // Random Events
        'event.round': 'Trigger Round',
        'event.round.placeholder': 'e.g.: 3',
        'event.stop': 'Stop Round',
        'event.stop.placeholder': 'e.g.: 3',
        'event.name': 'Event Name',
        'event.name.placeholder': 'e.g.: Policy Change',
        'event.desc': 'Event Description',
        'event.desc.placeholder': 'Describe the event content and impact...',
        'event.add': '➕ Add Event',
        'event.count': 'Events',
        'event.none': 'No events',
        'event.edit': 'Edit',
        'event.delete': 'Delete',

        // API Configuration
        'api.baseUrl': 'Base URL',
        'api.baseUrl.placeholder': 'https://api.openai.com/v1',
        'api.key': 'API Key',
        'api.key.placeholder': 'sk-...',
        'api.model': 'Model Name',
        'api.model.placeholder': 'gpt-4',
        'api.multiApi': 'Enable Multi-API Mode (Different agents use different APIs)',
        'api.multiApi.hint': '⚠️ When enabled, you can configure API for each agent separately, but Prompt Caching will be automatically disabled',
        'api.disableCache': 'Disable Prompt Caching (Send full background rules every round)',
        'api.disableCache.hint': 'This option will be automatically checked and locked when Multi-API mode is enabled',
        'api.save': '💾 Save Config',
        'api.test': '🧪 Test Connection',
        'api.autoSave.hint': '💡 Tip: Configuration is auto-saved, no need to click save button before export',

        // Error Handling
        'error.retry': 'Auto Retry on Failure',
        'error.retry.hint': 'Automatically retry when API call fails to improve success rate',
        'error.maxRetries': 'Max Retries',
        'error.maxRetries.hint': 'Maximum retry attempts for each agent (1-10)',
        'error.stopOnFailure': 'Stop Simulation on Failure',
        'error.stopOnFailure.hint': 'Stop entire simulation immediately when any agent fails (even after retries)',

        // Run Control
        'control.start': 'Start Simulation',
        'control.pause': 'Pause',
        'control.stop': 'Stop',

        // Simulation Results
        'results.currentRound': 'Current Round',
        'results.status': 'Status',
        'results.status.notStarted': 'Not Started',
        'results.status.running': 'Running (Config Locked)',
        'results.status.paused': 'Paused',
        'results.status.stopped': 'Stopped',
        'results.exportCSV': '📥 Export CSV',
        'results.exportExcel': '📊 Export Excel',
        'results.exportJSON': '📥 Export JSON',
        'results.clearLog': '🗑️ Clear Log',
        'results.round': 'Round',
        'results.agent': 'Agent',
        'results.message': 'Message',
        'results.time': 'Time',
        'results.noData': 'No data',
        'console.waiting': 'Waiting to run...',

        // Import/Export
        'import.config': '📥 Import Config',
        'export.config': '📤 Export Config',

        // Dialogs
        'dialog.editAgent': 'Edit Agent',
        'dialog.editEvent': 'Edit Event',
        'dialog.cancel': 'Cancel',
        'dialog.save': 'Save'
    }
};

let currentLang = localStorage.getItem('mass_language') || 'en';

function t(key) {
    return translations[currentLang][key] || translations['en'][key] || key;
}

function switchLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('mass_language', lang);
    updateAllText();
}

function updateAllText() {
    console.log('Updating language to:', currentLang);

    // 更新标题（先尝试直接更新，确保生效）
    const title = document.querySelector('h1');
    const subtitle = document.querySelector('.subtitle');
    if (title) {
        const titleKey = title.getAttribute('data-i18n') || 'title';
        title.textContent = t(titleKey);
    }
    if (subtitle) {
        const subtitleKey = subtitle.getAttribute('data-i18n') || 'subtitle';
        subtitle.textContent = t(subtitleKey);
    }

    // 更新所有带 data-i18n 属性的元素
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = t(key);

        // 处理输入框的 placeholder
        if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.placeholder !== undefined) {
            el.placeholder = text;
        }
        // 处理 option 元素
        else if (el.tagName === 'OPTION') {
            el.textContent = text;
        }
        // 处理 button 元素
        else if (el.tagName === 'BUTTON') {
            el.textContent = text;
        }
        // 处理 label 元素
        else if (el.tagName === 'LABEL') {
            // 如果 label 包含 checkbox/radio，只更新 span 部分
            const input = el.querySelector('input[type="checkbox"], input[type="radio"]');
            if (input) {
                const span = el.querySelector('span[data-i18n]');
                if (span) {
                    span.textContent = text;
                }
            } else {
                el.textContent = text;
            }
        }
        // 处理 span 元素
        else if (el.tagName === 'SPAN') {
            el.textContent = text;
        }
        // 处理 h1, h2, h3, th, td 等其他元素
        else {
            el.textContent = text;
        }
    });

    // 触发重新渲染 Agent 和事件列表
    if (window.renderAgents) {
        window.renderAgents();
    }
    if (window.renderEvents) {
        window.renderEvents();
    }

    console.log('Language update complete');
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    const langSelector = document.getElementById('languageSelector');
    if (langSelector) {
        currentLang = langSelector.value;
        langSelector.addEventListener('change', (e) => {
            switchLanguage(e.target.value);
        });
    }

    // 应用初始语言
    updateAllText();
});

window.i18n = { t, switchLanguage, getCurrentLang: () => currentLang };
