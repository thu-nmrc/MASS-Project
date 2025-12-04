// static/js/error-console.js — 错误控制台功能
(function(){
  // 复制错误控制台内容
  function copyErrorConsole() {
    const errConsole = document.querySelector('#errConsole');
    if (errConsole) {
      const text = errConsole.textContent || errConsole.innerText || '';
      if (text.trim()) {
        navigator.clipboard.writeText(text).then(() => {
          if (window.showToast) {
            window.showToast('错误信息已复制到剪贴板', 'success');
          } else {
            alert('错误信息已复制到剪贴板');
          }
        }).catch(() => {
          // 降级方案：创建临时文本区域
          const textarea = document.createElement('textarea');
          textarea.value = text;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          if (window.showToast) {
            window.showToast('错误信息已复制到剪贴板', 'success');
          } else {
            alert('错误信息已复制到剪贴板');
          }
        });
      } else {
        if (window.showToast) {
          window.showToast('错误控制台为空', 'info');
        } else {
          alert('错误控制台为空');
        }
      }
    }
  }

  // 清空错误控制台
  function clearErrorConsole() {
    const errConsole = document.querySelector('#errConsole');
    if (errConsole) {
      errConsole.textContent = '';
      if (window.showToast) {
        window.showToast('错误控制台已清空', 'success');
      }
    }
  }

  // 绑定错误控制台按钮
  function bindErrorButtons() {
    const btnCopyErr = document.querySelector('#btnCopyErr');
    const btnClearErr = document.querySelector('#btnClearErr');

    if (btnCopyErr && !btnCopyErr.__bound_copyerr) {
      btnCopyErr.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        copyErrorConsole();
      });
      btnCopyErr.__bound_copyerr = true;
    }

    if (btnClearErr && !btnClearErr.__bound_clearerr) {
      btnClearErr.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        clearErrorConsole();
      });
      btnClearErr.__bound_clearerr = true;
    }
  }

  // DOM加载完成后绑定
  document.addEventListener('DOMContentLoaded', bindErrorButtons);

  // 暴露函数到全局
  window.copyErrorConsole = copyErrorConsole;
  window.clearErrorConsole = clearErrorConsole;
})();