/**
 * BURRITO BLASTER — controller.js
 * The Controller. Owns input, the main loop, HUD/DOM, persistence, and
 * the collision -> juice pipeline. Knows nothing about pixel drawing.
 */
const Controller = (() => {
  let canvas;
  let running = false;
  let aiming = false;
  let activePointerId = null;
  let currentLevel = 0;
  let bestStarsByLevel = {};
  let overlayShownFor = null;
  let accumulator = 0;
  let lastTime = 0;
  let muted = false;
  let totalChips = 0;
  let runChips = 0;
  let pulseClearTimer = null;
  const FIXED_DT = 1000 / 60;
  const ui = {};

  function init(canvasEl) {
    canvas = canvasEl;

    ui.burritosLeft = document.getElementById('burritosLeft');
    ui.bestStars = document.getElementById('bestStars');
    ui.levelLabel = document.getElementById('levelLabel');
    ui.overlay = document.getElementById('overlay');
    ui.overlayTitle = document.getElementById('overlayTitle');
    ui.overlaySub = document.getElementById('overlaySub');
    ui.overlayStars = document.getElementById('overlayStars');
    ui.overlayHint = document.getElementById('overlayHint');
    ui.retryBtn = document.getElementById('retryBtn');
    ui.nextBtn = document.getElementById('nextBtn');
    ui.menuBtn = document.getElementById('menuBtn');
    ui.menuOverlay = document.getElementById('menuOverlay');
    ui.menuCloseBtn = document.getElementById('menuCloseBtn');
    ui.levelList = document.getElementById('levelList');
    ui.muteBtn = document.getElementById('muteBtn');
    ui.chipsCount = document.getElementById('chipsCount');
    ui.overlayBonus = document.getElementById('overlayBonus');
    ui.overlayRun = document.getElementById('overlayRun');

    bestStarsByLevel = loadBest();
    currentLevel = clampLevel(loadProgress());
    muted = loadMute();
    totalChips = loadChips();
    applyMute(muted);

    View.setChipsTarget(getChipsTargetWorld);

    ui.retryBtn.addEventListener('click', () => {
      hideOverlay();
      restartGame(currentLevel);
    });
    ui.nextBtn.addEventListener('click', () => {
      hideOverlay();
      const last = currentLevel >= Model.getLevelCount() - 1;
      const target = last ? 0 : currentLevel + 1;
      saveProgress(target);
      restartGame(target);
    });
    ui.menuBtn.addEventListener('click', openMenu);
    ui.menuCloseBtn.addEventListener('click', closeMenu);
    ui.menuOverlay.addEventListener('click', e => {
      if (e.target === ui.menuOverlay) closeMenu();
    });
    ui.muteBtn.addEventListener('click', () => {
      muted = !muted;
      applyMute(muted);
      saveMute(muted);
    });

    bindPointer();

    window.addEventListener('keydown', e => {
      if (e.key === 'r' || e.key === 'R') {
        hideOverlay();
        restartGame(currentLevel);
      } else if (e.key === 'n' || e.key === 'N') {
        const next = Math.min(Model.getLevelCount() - 1, currentLevel + 1);
        hideOverlay();
        saveProgress(next);
        restartGame(next);
      } else if (e.key === 'Escape') {
        if (!ui.menuOverlay.classList.contains('hidden')) closeMenu();
      } else if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < Model.getLevelCount()) {
          hideOverlay();
          saveProgress(idx);
          restartGame(idx);
        }
      }
    });

    Model.init(currentLevel);
    Model.onCollision(onCollision);
    overlayShownFor = null;

    updateHUD();
    renderChipsText();
    running = true;
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function bindPointer() {
    // Pointer Events: one unified path for mouse, pen and touch. Pointer
    // capture keeps the drag tracked even if the finger leaves the canvas.
    canvas.addEventListener('pointerdown', e => {
      // First user gesture: unlock the AudioContext (mobile autoplay rules).
      Audio.unlock();
      if (activePointerId !== null) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const handled = onPointerDown(getPos(e));
      if (handled) {
        activePointerId = e.pointerId;
        try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
        e.preventDefault();
      }
    });
    canvas.addEventListener('pointermove', e => {
      if (e.pointerId !== activePointerId) return;
      onPointerMove(getPos(e));
      e.preventDefault();
    });
    const finish = e => {
      if (e.pointerId !== activePointerId) return;
      activePointerId = null;
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      onPointerUp();
    };
    canvas.addEventListener('pointerup', finish);
    canvas.addEventListener('pointercancel', finish);
    canvas.addEventListener('lostpointercapture', e => {
      if (e.pointerId === activePointerId) {
        activePointerId = null;
        onPointerUp();
      }
    });
  }

  function getPos(evt) {
    // Map CSS pixel coords to world coords (1200x650), regardless of canvas
    // backing store size or device pixel ratio.
    const rect = canvas.getBoundingClientRect();
    return {
      x: (evt.clientX - rect.left) * (CONFIG.canvas.width / rect.width),
      y: (evt.clientY - rect.top) * (CONFIG.canvas.height / rect.height),
    };
  }

  function onPointerDown(p) {
    if (Model.getState() !== 'READY') return false;
    const b = Model.getBurrito();
    if (!b) return false;
    const d = Math.hypot(p.x - b.position.x, p.y - b.position.y);
    if (d <= CONFIG.slingshot.pickRadius) {
      aiming = Model.startAim();
      return aiming;
    }
    return false;
  }

  function onPointerMove(p) {
    if (!aiming) return;
    Model.updateAim(p.x, p.y);
  }

  function onPointerUp() {
    if (!aiming) return;
    aiming = false;
    const launched = Model.release();
    if (launched) {
      Audio.launch();
      Haptics.launch();
    }
  }

  function onCollision(info) {
    if (info.bagDestroyed) {
      const words = CONFIG.popups.words;
      const word = words[Math.floor(Math.random() * words.length)];
      View.spawnPopup(info.point.x, info.point.y, word);
      View.spawnParticles(info.point.x, info.point.y, 'salsa', CONFIG.particles.countOnBag);
      View.triggerShake(CONFIG.screenShake.bagMagnitude, CONFIG.screenShake.duration);
      Audio.bag();
      Haptics.bag();
      // Chips burst from the bag and fly into the HUD score counter.
      const chipCount = computeChipCount(info.size, info.speed);
      View.spawnChips(info.point.x, info.point.y, chipCount, onChipArrival);
      return;
    }
    if (info.speed >= CONFIG.impact.shakeThreshold) {
      const kind = info.involvesProjectile ? 'salsa' : 'crumb';
      View.spawnParticles(info.point.x, info.point.y, kind);
      View.triggerShake(CONFIG.screenShake.magnitude, CONFIG.screenShake.duration);
      const intensity = Math.min(1, info.speed / 16);
      Audio.impact(intensity);
      if (info.involvesProjectile) Haptics.impact();
    }
  }

  function computeStars() {
    const left = Model.getBurritosLeft();
    const start = Model.getBurritosStart() || 1;
    const ratio = left / start;
    if (ratio >= CONFIG.scoring.threeStarsAtRatio) return 3;
    if (ratio >= CONFIG.scoring.twoStarsAtRatio) return 2;
    return 1;
  }

  function clampLevel(idx) {
    const n = CONFIG.levels.length;
    return Math.max(0, Math.min(n - 1, idx | 0));
  }

  function loadBest() {
    try {
      const raw = localStorage.getItem(CONFIG.storage.bestStarsKey);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) { return {}; }
  }

  function saveBest(level, stars) {
    const cur = bestStarsByLevel[level] || 0;
    if (stars > cur) {
      bestStarsByLevel[level] = stars;
      try { localStorage.setItem(CONFIG.storage.bestStarsKey, JSON.stringify(bestStarsByLevel)); } catch (_) {}
    }
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(CONFIG.storage.progressKey);
      return raw ? parseInt(raw, 10) || 0 : 0;
    } catch (_) { return 0; }
  }

  function saveProgress(idx) {
    try { localStorage.setItem(CONFIG.storage.progressKey, String(idx)); } catch (_) {}
  }

  function loadMute() {
    try { return localStorage.getItem(CONFIG.storage.muteKey) === '1'; } catch (_) { return false; }
  }

  function saveMute(m) {
    try { localStorage.setItem(CONFIG.storage.muteKey, m ? '1' : '0'); } catch (_) {}
  }

  function loadChips() {
    try {
      const raw = localStorage.getItem(CONFIG.storage.chipsKey);
      const n = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch (_) { return 0; }
  }

  function saveChips(n) {
    try { localStorage.setItem(CONFIG.storage.chipsKey, String(n)); } catch (_) {}
  }

  function computeChipCount(size, speed) {
    const cfg = CONFIG.scoring;
    const n = Math.round((size || 36) * cfg.chipsPerBagSizeFactor)
            + Math.round((speed || 0) * cfg.chipsPerBagSpeedFactor);
    return Math.max(cfg.chipsPerBagMin, Math.min(cfg.chipsPerBagMax, n));
  }

  function getChipsTargetWorld() {
    if (!ui.chipsCount || !canvas) return { x: 250, y: 50 };
    const canvasRect = canvas.getBoundingClientRect();
    if (canvasRect.width === 0) return { x: 250, y: 50 };
    const r = ui.chipsCount.getBoundingClientRect();
    const cx = (r.left + r.right) / 2 - canvasRect.left;
    const cy = (r.top + r.bottom) / 2 - canvasRect.top;
    return {
      x: cx * (CONFIG.canvas.width / canvasRect.width),
      y: cy * (CONFIG.canvas.height / canvasRect.height),
    };
  }

  function onChipArrival() {
    totalChips += 1;
    runChips += 1;
    renderChipsText();
    pulseChipsHUD();
    saveChips(totalChips);
    Audio.tink();
  }

  function addChipsImmediately(n) {
    if (n <= 0) return;
    totalChips += n;
    runChips += n;
    renderChipsText();
    pulseChipsHUD();
    saveChips(totalChips);
  }

  function renderChipsText() {
    if (!ui.chipsCount) return;
    ui.chipsCount.textContent = formatChips(totalChips);
  }

  function pulseChipsHUD() {
    if (!ui.chipsCount) return;
    ui.chipsCount.classList.remove('pulse');
    void ui.chipsCount.offsetWidth; // force reflow so the animation restarts
    ui.chipsCount.classList.add('pulse');
    clearTimeout(pulseClearTimer);
    pulseClearTimer = setTimeout(() => ui.chipsCount && ui.chipsCount.classList.remove('pulse'), 320);
  }

  function formatChips(n) {
    try { return n.toLocaleString(); } catch (_) { return String(n); }
  }

  function applyMute(m) {
    Audio.setMuted(m);
    Haptics.setMuted(m);
    if (ui.muteBtn) {
      ui.muteBtn.textContent = m ? '🔇' : '🔊';
      ui.muteBtn.setAttribute('aria-pressed', String(m));
    }
  }

  function renderStars(n) {
    return '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));
  }

  function updateHUD() {
    const idx = Model.getLevelIndex();
    const level = Model.getLevel();
    const count = Model.getLevelCount();
    ui.burritosLeft.textContent = Model.getBurritosLeft();
    ui.bestStars.textContent = renderStars(bestStarsByLevel[idx] || 0);
    ui.levelLabel.textContent = `LEVEL ${idx + 1} / ${count} · ${level.name.toUpperCase()}`;
  }

  function showWinOverlay() {
    const idx = Model.getLevelIndex();
    const isLast = idx >= Model.getLevelCount() - 1;
    const stars = computeStars();
    saveBest(idx, stars);

    const bonus = Model.getBurritosLeft() * CONFIG.scoring.chipBonusPerLeftover
                + (stars === 3 ? CONFIG.scoring.chipBonusThreeStar : 0);
    addChipsImmediately(bonus);

    ui.overlayTitle.textContent = isLast ? 'CAMPAIGN COMPLETE!' : 'BAGS BLASTED!';
    ui.overlaySub.textContent = `Burritos remaining: ${Model.getBurritosLeft()} / ${Model.getBurritosStart()}`;
    ui.overlayStars.textContent = renderStars(stars);
    ui.overlayStars.style.display = '';
    if (ui.overlayRun) ui.overlayRun.textContent = `Chips this run: ${formatChips(runChips)}`;
    if (ui.overlayBonus) {
      ui.overlayBonus.textContent = bonus > 0 ? `BONUS +${formatChips(bonus)} CHIPS` : '';
      ui.overlayBonus.style.display = bonus > 0 ? '' : 'none';
    }
    ui.overlayHint.textContent = isLast
      ? 'You blasted every bag in the campaign.'
      : `Next up: ${CONFIG.levels[idx + 1].name}`;
    ui.overlayHint.style.display = '';
    ui.nextBtn.textContent = isLast ? 'PLAY AGAIN' : 'NEXT LEVEL';
    ui.nextBtn.style.display = '';
    ui.overlay.classList.remove('hidden');
    ui.overlay.dataset.kind = isLast ? 'campaign' : 'win';
    updateHUD();
  }

  function showLoseOverlay() {
    ui.overlayTitle.textContent = 'OUT OF BURRITOS!';
    ui.overlaySub.textContent = 'The bags survived.';
    ui.overlayStars.style.display = 'none';
    if (ui.overlayRun) ui.overlayRun.textContent = runChips > 0 ? `You still pocketed ${formatChips(runChips)} chips.` : '';
    if (ui.overlayBonus) {
      ui.overlayBonus.textContent = '';
      ui.overlayBonus.style.display = 'none';
    }
    ui.overlayHint.textContent = Model.getLevel().hint || '';
    ui.overlayHint.style.display = ui.overlayHint.textContent ? '' : 'none';
    ui.nextBtn.style.display = 'none';
    ui.overlay.classList.remove('hidden');
    ui.overlay.dataset.kind = 'lose';
  }

  function hideOverlay() {
    ui.overlay.classList.add('hidden');
  }

  function openMenu() {
    renderLevelList();
    ui.menuOverlay.classList.remove('hidden');
  }

  function closeMenu() {
    ui.menuOverlay.classList.add('hidden');
  }

  function renderLevelList() {
    ui.levelList.innerHTML = '';
    CONFIG.levels.forEach((level, i) => {
      const li = document.createElement('li');
      li.className = 'level-row' + (i === currentLevel ? ' current' : '');
      const stars = bestStarsByLevel[i] || 0;
      li.innerHTML = `
        <span class="level-num">${i + 1}</span>
        <span class="level-name">${level.name}</span>
        <span class="level-stars">${renderStars(stars)}</span>
      `;
      li.addEventListener('click', () => {
        closeMenu();
        hideOverlay();
        saveProgress(i);
        restartGame(i);
      });
      ui.levelList.appendChild(li);
    });
  }

  function restartGame(idx) {
    currentLevel = clampLevel(idx);
    Model.init(currentLevel);
    Model.onCollision(onCollision);
    View.clearJuice();
    overlayShownFor = null;
    aiming = false;
    activePointerId = null;
    runChips = 0;
    updateHUD();
    renderChipsText();
  }

  /**
   * Main loop. Render runs every animation frame; physics runs in a
   * fixed-step accumulator so 120Hz/144Hz displays don't simulate at
   * 2-3x speed. Big gaps (tab background) are clamped to avoid spirals.
   */
  function loop() {
    if (!running) return;
    const now = performance.now();
    let elapsed = now - lastTime;
    if (elapsed > 250) elapsed = 250;
    lastTime = now;
    accumulator += elapsed;

    let steps = 0;
    while (accumulator >= FIXED_DT && steps < 5) {
      Model.tick();
      accumulator -= FIXED_DT;
      steps++;
    }

    View.render();
    updateHUD();

    const s = Model.getState();
    if (s !== overlayShownFor) {
      if (s === 'WIN') {
        showWinOverlay();
        Audio.win();
        Haptics.win();
        overlayShownFor = 'WIN';
      } else if (s === 'LOSE') {
        showLoseOverlay();
        Audio.lose();
        Haptics.lose();
        overlayShownFor = 'LOSE';
      } else if (s === 'READY' || s === 'AIMING' || s === 'FLYING') {
        overlayShownFor = null;
      }
    }

    requestAnimationFrame(loop);
  }

  return { init };
})();
