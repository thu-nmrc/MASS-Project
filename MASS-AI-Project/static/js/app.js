// static/js/app.js — v0.21.7 (restore Preview button; macro + header injection)
(function(){
  // Helpers
  function q(s){ return document.querySelector(s); }
  function getFirstEnabledAgent(){
    if (typeof getEnabledAgents === 'function'){
      const arr = getEnabledAgents() || [];
      if (arr.length) return arr[0];
    }
    const a = (window.state && window.state.agents) || [];
    return a.find(x => x && x.enabled !== false) || a[0] || null;
  }

  async function buildPreviewPayload(){
    const st = window.state || (window.state = {});
    if (typeof st.readUIToStateBasics === 'function') try{ st.readUIToStateBasics(); }catch(_){ }

    const agent = getFirstEnabledAgent();
    if (!agent) throw new Error('没有可用的 Agent');
    const s = st.settings || {};
    const round = (typeof window.__currentRound !== 'undefined') ? Number(window.__currentRound) : 1;

    // Prefer shared generic events builder from network.js
    let systemText = '';
    let userText = '';
    if (typeof window.buildSystemAndUserTexts === 'function'){
      const t = await window.buildSystemAndUserTexts(agent, round, { preview: true }); // 第27行
      systemText = t.systemText; userText = t.userText;
    }else{
      // Fallback: minimal preview using background + prompt only
      const cp = (typeof window.compilePrompt === 'function') ? window.compilePrompt : (x=>String(x||''));
      const headerLine = `Agent=${(agent&&(agent.name||agent.id))||'Agent'} | Round=${round}`;
      const baseSystem = cp(st.backgroundText || '', st.sim||{});
      systemText = (baseSystem? baseSystem+'\n' : '') + `请严格遵循：你的回复第一行必须是：${headerLine}。然后换行输出正文，不要使用代码块，也不要在第一行之外重复抬头。`;
      userText = `${headerLine}\n` + cp(agent.prompt || '', st.sim||{});
    }

    const body = {
      baseUrl: s.baseUrl || '',
      apiKey: s.apiKey || '',
      model: s.modelName || '',
      messages: [
        { role: 'system', content: systemText },
        { role: 'user',   content: userText }
      ]
    };
    return body;
  }

  async function openPreview(){
    try{
      const body = await buildPreviewPayload();
      const w = window.open('', '_blank');
      const html = `<html><head><meta charset="utf-8"><title>预览本回合提示</title></head>
      <body style="margin:0;padding:16px;background:#0b0f17;color:#e7edf6;font-family:ui-monospace,Consolas,monospace">
        <h3>请求预览</h3>
        <div style="opacity:.8;margin-bottom:12px;">注意：此处仅显示即将发送的内容（已做宏替换与抬头注入），不会触发计费。</div>
        <pre style="white-space:pre-wrap;line-height:1.45">${escapeHtml(JSON.stringify(body, null, 2))}</pre>
      </body></html>`;
      if (w && w.document){
        w.document.open(); w.document.write(html); w.document.close();
      }else{
        alert('浏览器阻止了弹窗。请允许本站弹窗后重试。');
      }
    }catch(e){
      alert('预览失败：' + e.message);
    }
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  }

  function bindPreview(){
    const btn = q('#btnPreview');
    if (btn && !btn.__bound_preview){
      btn.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); openPreview(); });
      btn.__bound_preview = true;
    }
  }

  document.addEventListener('DOMContentLoaded', bindPreview);
})();