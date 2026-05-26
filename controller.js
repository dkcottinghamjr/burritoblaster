/**
 * BURRITO BLASTER — controller.js
 * The Controller. Owns input, the main loop, HUD/DOM, persistence, and
 * the collision -> juice pipeline. Knows nothing about pixel drawing.
 */
const Controller = (() => {
  let canvas;
  let running = false;
  let aiming = false;
  let currentLevel = 0;
  let bestStarsByLevel = {};
  let overlayShownFor = null;
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

    bestStarsByLevel = loadBest();
    currentLevel = clampLevel(loadProgress());

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

    canvas.addEventListener('mousedown', e => onPointerDown(getPos(e)));
    window.addEventListener('mousemove', e => onPointerMove(getPos(e)));
    window.addEventListener('mouseup', onPointerUp);

    canvas.addEventListener('touchstart', e => {
      if (!e.touches[0]) return;
      e.preventDefault();
      onPointerDown(getPos(e.touches[0]));
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      if (!e.touches[0]) return;
      e.preventDefault();
      onPointerMove(getPos(e.touches[0]));
    }, { passive: false });
    canvas.addEventListener('touchend', e => {
      e.preventDefault();
      onPointerUp();
    }, { passive: false });

    // Keyboard shortcuts: R retries, N advances, 1..5 jumps to a level.
    window.addEventListener('keydown', e => {
      if (e.key === 'r' || e.key === 'R') {
        hideOverlay();
        restartGame(currentLevel);
      } else if (e.key === 'n' || e.key === 'N') {
        const next = Math.min(Model.getLevelCount() - 1, currentLevel + 1);
        hideOverlay();
        saveProgress(next);
        restartGame(next);
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
    running = true;
    requestAnimationFrame(loop);
  }

  function getPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (evt.clientX - rect.left) * scaleX,
      y: (evt.clientY - rect.top) * scaleY,
    };
  }

  function onPointerDown(p) {
    if (Model.getState() !== 'READY') return;
    const b = Model.getBurrito();
    if (!b) return;
    const d = Math.hypot(p.x - b.position.x, p.y - b.position.y);
    if (d <= CONFIG.slingshot.pickRadius) {
      aiming = Model.startAim();
    }
  }

  function onPointerMove(p) {
    if (!aiming) return;
    Model.updateAim(p.x, p.y);
  }

  function onPointerUp() {
    if (!aiming) return;
    aiming = false;
    Model.release();
  }

  function onCollision(info) {
    if (info.criticDestroyed) {
      const words = CONFIG.popups.words;
      const word = words[Math.floor(Math.random() * words.length)];
      View.spawnPopup(info.point.x, info.point.y, word);
      View.spawnParticles(info.point.x, info.point.y, 'salsa', CONFIG.particles.countOnCritic);
      View.triggerShake(CONFIG.screenShake.criticMagnitude, CONFIG.screenShake.duration);
      return;
    }
    if (info.speed >= CONFIG.impact.shakeThreshold) {
      const kind = info.involvesProjectile ? 'salsa' : 'crumb';
      View.spawnParticles(info.point.x, info.point.y, kind);
      View.triggerShake(CONFIG.screenShake.magnitude, CONFIG.screenShake.duration);
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

    ui.overlayTitle.textContent = isLast ? 'CAMPAIGN COMPLETE!' : 'CRITICS DEMOLISHED!';
    ui.overlaySub.textContent = `Burritos remaining: ${Model.getBurritosLeft()} / ${Model.getBurritosStart()}`;
    ui.overlayStars.textContent = renderStars(stars);
    ui.overlayStars.style.display = '';
    ui.overlayHint.textContent = isLast
      ? 'You smacked every critic in the campaign.'
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
    ui.overlaySub.textContent = 'The critics survived.';
    ui.overlayStars.style.display = 'none';
    ui.overlayHint.textContent = Model.getLevel().hint || '';
    ui.overlayHint.style.display = ui.overlayHint.textContent ? '' : 'none';
    ui.nextBtn.style.display = 'none';
    ui.overlay.classList.remove('hidden');
    ui.overlay.dataset.kind = 'lose';
  }

  function hideOverlay() {
    ui.overlay.classList.add('hidden');
  }

  function restartGame(idx) {
    currentLevel = clampLevel(idx);
    Model.init(currentLevel);
    Model.onCollision(onCollision);
    View.clearJuice();
    overlayShownFor = null;
    aiming = false;
    updateHUD();
  }

  function loop() {
    if (!running) return;
    Model.tick();
    View.render();
    updateHUD();

    const s = Model.getState();
    if (s !== overlayShownFor) {
      if (s === 'WIN') { showWinOverlay(); overlayShownFor = 'WIN'; }
      else if (s === 'LOSE') { showLoseOverlay(); overlayShownFor = 'LOSE'; }
      else if (s === 'READY' || s === 'AIMING' || s === 'FLYING') { overlayShownFor = null; }
    }

    requestAnimationFrame(loop);
  }

  return { init };
})();
