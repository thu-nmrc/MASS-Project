// static/js/controls.js — 控制按钮绑定和状态管理
(function(){
  let simRunning = false;
  let simPaused = false;

  // 按钮状态管理
  function setBtnState(state) {
    const btnStart = document.querySelector('#btnStart');
    const btnPause = document.querySelector('#btnPause');
    const btnStop = document.querySelector('#btnStop');
    const btnContinue = document.querySelector('#btnContinue');

    if (!btnStart || !btnPause || !btnStop || !btnContinue) return;

    // 重置所有按钮显示状态
    btnStart.style.display = 'none';
    btnPause.style.display = 'none';
    btnStop.style.display = 'none';
    btnContinue.style.display = 'none';

    switch(state) {
      case 'idle':
        btnStart.style.display = 'block';
        btnStart.style.gridColumn = '1/3';
        break;
      case 'running':
        btnPause.style.display = 'block';
        btnStop.style.display = 'block';
        break;
      case 'paused':
        btnContinue.style.display = 'block';
        btnStop.style.display = 'block';
        break;
      case 'finished':
        btnStart.style.display = 'block';
        btnStart.style.gridColumn = '1/3';
        btnStart.textContent = '重新开始';
        break;
    }
  }

  // 暂停模拟
  function pauseSimulation() {
    if (window.simRunning) {
      window.simRunning = false;
      simPaused = true;
      setBtnState('paused');
      if (typeof appendLog === 'function') {
        appendLog('模拟已暂停', {event: '日志'});
      }
    }
  }

  // 继续模拟
  function continueSimulation() {
    if (simPaused) {
      simPaused = false;
      if (typeof appendLog === 'function') {
        appendLog('模拟继续运行', {event: '日志'});
      }
      // 重新启动模拟（从当前回合继续）
      if (typeof startSimulation === 'function') {
        startSimulation();
      }
    }
  }

  // 停止模拟
  function stopSimulation() {
    if (window.simRunning || simPaused) {
      window.simRunning = false;
      simPaused = false;
      // 重置发送顺序，下次从头开始（背景开始）
      window.__currentRound = 1;
      setBtnState('finished');
      if (typeof appendLog === 'function') {
        appendLog('模拟已停止，下次将从头开始', {event: '日志'});
      }
    }
  }

  // 绑定控制按钮事件
  function bindControlButtons() {
    const btnStart = document.querySelector('#btnStart');
    const btnPause = document.querySelector('#btnPause');
    const btnStop = document.querySelector('#btnStop');
    const btnContinue = document.querySelector('#btnContinue');

    if (btnStart && !btnStart.__bound_start) {
      btnStart.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof startSimulation === 'function') {
          btnStart.textContent = '开始';
          startSimulation();
        } else {
          alert('startSimulation 函数未找到');
        }
      });
      btnStart.__bound_start = true;
    }

    if (btnPause && !btnPause.__bound_pause) {
      btnPause.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        pauseSimulation();
      });
      btnPause.__bound_pause = true;
    }

    if (btnStop && !btnStop.__bound_stop) {
      btnStop.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        stopSimulation();
      });
      btnStop.__bound_stop = true;
    }

    if (btnContinue && !btnContinue.__bound_continue) {
      btnContinue.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        continueSimulation();
      });
      btnContinue.__bound_continue = true;
    }
  }

  // 初始化
  function init() {
    setBtnState('idle');
    bindControlButtons();
  }

  // 暴露函数到全局
  window.setBtnState = setBtnState;
  window.pauseSimulation = pauseSimulation;
  window.continueSimulation = continueSimulation;
  window.stopSimulation = stopSimulation;

  // DOM加载完成后初始化
  document.addEventListener('DOMContentLoaded', init);
})();