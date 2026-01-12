// static/js/settings.js — 统一配置管理模块 v1.0
(function(){
  'use strict';

  // 默认配置
  const DEFAULT_SETTINGS = {
    // API配置
    api: {
      baseUrl: 'https://aihubmix.com/v1',
      apiKey: '',
      modelName: 'gpt-5',
      multiApi: false
    },
    // 模拟配置
    simulation: {
      granularity: 'day',
      startDate: new Date().toISOString().slice(0, 10),
      maxSteps: 8,
      bgRules: ''
    },
    // 回顾配置
    review: {
      enabled: true,
      maxLength: 200
    },
    // UI配置
    ui: {
      theme: 'dark',
      language: 'zh-CN',
      autoSave: true
    }
  };

  // 配置管理类
  class SettingsManager {
    constructor() {
      this.settings = this.deepClone(DEFAULT_SETTINGS);
      this.listeners = new Map();
      this.init();
    }

    // 初始化
    init() {
      this.ensureGlobalState();
      this.migrateExistingSettings();
      this.bindEvents();
    }

    // 确保全局状态存在
    ensureGlobalState() {
      if (!window.state) window.state = {};
      if (!window.state.settings) window.state.settings = {};
      if (!window.state.sim) window.state.sim = {};
      if (!window.state.reviewSettings) window.state.reviewSettings = {};
    }

    // 迁移现有配置
    migrateExistingSettings() {
      const state = window.state;
      
      // 迁移API设置
      if (state.settings) {
        Object.assign(this.settings.api, {
          baseUrl: state.settings.baseUrl || this.settings.api.baseUrl,
          apiKey: state.settings.apiKey || this.settings.api.apiKey,
          modelName: state.settings.modelName || this.settings.api.modelName,
          maxTokens: state.settings.maxTokens ?? this.settings.api.maxTokens,
          tokenKey: state.settings.tokenKey || this.settings.api.tokenKey,
          multiApi: state.settings.multiApi ?? this.settings.api.multiApi
        });
      }

      // 迁移模拟设置
      if (state.sim) {
        Object.assign(this.settings.simulation, {
          granularity: state.sim.granularity || this.settings.simulation.granularity,
          startDate: state.sim.startDate || this.settings.simulation.startDate,
          maxSteps: state.sim.maxSteps ?? this.settings.simulation.maxSteps,
          bgRules: state.sim.bgRules || state.backgroundText || this.settings.simulation.bgRules
        });
      }

      // 迁移回顾设置
      if (state.reviewSettings) {
        Object.assign(this.settings.review, {
          enabled: state.reviewSettings.enabled ?? this.settings.review.enabled,
          maxLength: state.reviewSettings.maxLength ?? this.settings.review.maxLength
        });
      }

      // 同步回全局状态
      this.syncToGlobalState();
    }

    // 同步到全局状态
    syncToGlobalState() {
      const state = window.state;
      
      // 同步API设置
      Object.assign(state.settings, this.settings.api);
      
      // 同步模拟设置
      Object.assign(state.sim, this.settings.simulation);
      state.backgroundText = this.settings.simulation.bgRules;
      
      // 同步回顾设置
      Object.assign(state.reviewSettings, this.settings.review);
    }

    // 获取配置
    get(path) {
      return this.getNestedValue(this.settings, path);
    }

    // 设置配置
    set(path, value) {
      this.setNestedValue(this.settings, path, value);
      this.syncToGlobalState();
      this.notifyListeners(path, value);
      
      if (this.settings.ui.autoSave) {
        this.save();
      }
    }

    // 批量设置
    setMultiple(updates) {
      Object.entries(updates).forEach(([path, value]) => {
        this.setNestedValue(this.settings, path, value);
      });
      this.syncToGlobalState();
      
      Object.entries(updates).forEach(([path, value]) => {
        this.notifyListeners(path, value);
      });
      
      if (this.settings.ui.autoSave) {
        this.save();
      }
    }

    // 重置配置
    reset(section = null) {
      if (section) {
        this.settings[section] = this.deepClone(DEFAULT_SETTINGS[section]);
      } else {
        this.settings = this.deepClone(DEFAULT_SETTINGS);
      }
      this.syncToGlobalState();
      this.notifyListeners('reset', section);
    }

    // 从UI读取配置
    readFromUI() {
      const updates = {};
      
      // 读取API设置
      const apiElements = {
        baseUrl: '#baseUrl',
        apiKey: '#apiKey',
        modelName: '#modelName',
        multiApi: '#multiApi'
      };
      
      Object.entries(apiElements).forEach(([key, selector]) => {
        const element = document.querySelector(selector);
        if (element) {
          if (element.type === 'checkbox') {
            updates[`api.${key}`] = element.checked;
          } else {
            updates[`api.${key}`] = element.value.trim();
          }
        }
      });
      
      // 读取模拟设置
      const simElements = {
        granularity: '#granularity',
        startDate: '#startDate',
        maxSteps: '#maxSteps',
        bgRules: '#bgRules'
      };
      
      Object.entries(simElements).forEach(([key, selector]) => {
        const element = document.querySelector(selector);
        if (element) {
          if (key === 'maxSteps') {
            updates[`simulation.${key}`] = Number(element.value) || this.settings.simulation[key];
          } else {
            updates[`simulation.${key}`] = element.value;
          }
        }
      });
      

      
      this.setMultiple(updates);
    }

    // 写入到UI
    writeToUI() {
      // 写入API设置
      const apiElements = {
        baseUrl: '#baseUrl',
        apiKey: '#apiKey',
        modelName: '#modelName',
        multiApi: '#multiApi'
      };
      
      Object.entries(apiElements).forEach(([key, selector]) => {
        const element = document.querySelector(selector);
        const value = this.settings.api[key];
        if (element && value != null) {
          if (element.type === 'checkbox') {
            element.checked = value;
          } else {
            element.value = value;
          }
        }
      });
      
      // 写入模拟设置
      const granularity = document.querySelector('#granularity');
      const startDate = document.querySelector('#startDate');
      const maxSteps = document.querySelector('#maxSteps');
      const bgRules = document.querySelector('#bgRules');
      
      // 修复：在本作用域定义 st 和 sim，避免 ReferenceError
      const st = window.state || {};
      const sim = st.sim || {};
      
      if (granularity && sim.granularity) granularity.value = sim.granularity;
      if (startDate && sim.startDate) startDate.value = sim.startDate;
      if (maxSteps && sim.maxSteps != null) maxSteps.value = sim.maxSteps;
      if (bgRules) {
        // 优先使用最新导入的全局状态值，兜底用 settings 中的值
        const ssim = st.sim || {};
        const latest = ssim.bgRules || st.backgroundText || this.settings.simulation.bgRules || '';
        bgRules.value = latest;
      }
    }

    // 保存配置到服务器
    async save() {
      try {
        if (window.showLoading) window.showLoading('保存配置中...');
        
        const response = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.settings.api),
          credentials: 'include'
        });
        
        if (window.hideLoading) window.hideLoading();
        
        if (response.ok) {
          if (window.showToast) window.showToast('配置保存成功', 'success');
          this.notifyListeners('saved', this.settings);
          return true;
        } else {
          if (window.showToast) window.showToast('配置保存失败', 'error');
          return false;
        }
      } catch (error) {
        if (window.hideLoading) window.hideLoading();
        if (window.showToast) window.showToast('保存配置时发生错误', 'error');
        console.error('保存配置失败:', error);
        return false;
      }
    }

    // 测试连接
    async testConnection() {
      try {
        if (window.showLoading) window.showLoading('测试连接中...');
        
        const testPayload = {
          baseUrl: this.settings.api.baseUrl,
          apiKey: this.settings.api.apiKey,
          model: this.settings.api.modelName
        };
        
        const response = await fetch('/api/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testPayload),
          credentials: 'include'
        });
        
        const result = await response.text();
        let jsonResult = null;
        try { jsonResult = JSON.parse(result); } catch(_) {}
        
        if (window.hideLoading) window.hideLoading();
        
        // 更新测试结果显示
        const probeElement = document.querySelector('#probe');
        const isSuccess = response.ok && jsonResult && jsonResult.status >= 200 && jsonResult.status < 300;
        
        if (probeElement) {
          if (response.ok && jsonResult && jsonResult.status) {
            probeElement.textContent = `HTTP ${jsonResult.status} — ${jsonResult.head || ''}`;
          } else if (response.ok) {
            probeElement.textContent = `HTTP ${response.status}`;
          } else {
            probeElement.textContent = `连接失败：${result}`;
          }
        }
        
        if (isSuccess && window.showToast) {
          window.showToast('连接测试成功', 'success');
        } else if (window.showToast) {
          const errorMsg = jsonResult && jsonResult.head ? jsonResult.head : '连接测试失败';
          window.showToast(errorMsg, 'error');
        }
        
        return { ok: response.ok, status: response.status, result: jsonResult || result };
      } catch (error) {
        if (window.hideLoading) window.hideLoading();
        if (window.showToast) window.showToast('测试连接时发生错误', 'error');
        console.error('测试连接失败:', error);
        return { ok: false, error: error.message };
      }
    }

    // 导出配置
    export() {
      return {
        settings: this.deepClone(this.settings),
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
    }

    // 导入配置
    import(data) {
      try {
        const config = typeof data === 'string' ? JSON.parse(data) : data;
        if (config.settings) {
          this.settings = this.deepClone(config.settings);
          this.syncToGlobalState();
          this.writeToUI();
          this.notifyListeners('imported', this.settings);
          return true;
        }
        return false;
      } catch (error) {
        console.error('导入配置失败:', error);
        return false;
      }
    }

    // 添加监听器
    on(event, callback) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event).add(callback);
    }

    // 移除监听器
    off(event, callback) {
      if (this.listeners.has(event)) {
        this.listeners.get(event).delete(callback);
      }
    }

    // 通知监听器
    notifyListeners(event, data) {
      if (this.listeners.has(event)) {
        this.listeners.get(event).forEach(callback => {
          try {
            callback(data, event);
          } catch (error) {
            console.error('监听器执行失败:', error);
          }
        });
      }
    }

    // 绑定事件
    bindEvents() {
      // 自动从UI读取配置
      const autoReadElements = [
        '#baseUrl', '#apiKey', '#modelName', '#maxTokens', '#multiApi',
        '#granularity', '#startDate', '#maxSteps', '#bgRules'
      ];
      
      autoReadElements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
          const eventType = element.type === 'checkbox' ? 'change' : 'input';
          element.addEventListener(eventType, () => {
            this.readFromUI();
          });
        }
      });
    }

    // 工具方法：深拷贝
    deepClone(obj) {
      if (obj === null || typeof obj !== 'object') return obj;
      if (obj instanceof Date) return new Date(obj.getTime());
      if (obj instanceof Array) return obj.map(item => this.deepClone(item));
      if (typeof obj === 'object') {
        const cloned = {};
        Object.keys(obj).forEach(key => {
          cloned[key] = this.deepClone(obj[key]);
        });
        return cloned;
      }
    }

    // 工具方法：获取嵌套值
    getNestedValue(obj, path) {
      return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : undefined;
      }, obj);
    }

    // 工具方法：设置嵌套值
    setNestedValue(obj, path, value) {
      const keys = path.split('.');
      const lastKey = keys.pop();
      const target = keys.reduce((current, key) => {
        if (!current[key] || typeof current[key] !== 'object') {
          current[key] = {};
        }
        return current[key];
      }, obj);
      target[lastKey] = value;
    }
  }

  // 创建全局实例
  window.settingsManager = new SettingsManager();

  // 兼容性：保持原有的全局函数
  window.readUIToStateBasics = function() {
    window.settingsManager.readFromUI();
  };

  window.writeStateToUIBasics = function() {
    window.settingsManager.writeToUI();
  };

  window.saveConfig = function() {
    return window.settingsManager.save();
  };

  window.testConnection = function() {
    return window.settingsManager.testConnection();
  };

  // DOM加载完成后初始化
  document.addEventListener('DOMContentLoaded', function() {
    // 延迟初始化以确保其他脚本已加载
    setTimeout(() => {
      window.settingsManager.writeToUI();
    }, 100);
  });

})();