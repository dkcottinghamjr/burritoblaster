/**
 * BURRITO BLASTER — controller.js
 * The Controller. Owns input, the main loop, HUD/DOM, persistence, and
 * the collision -> juice pipeline. Knows nothing about pixel drawing.
 */
const Controller = (() => {
  let canvas;
  let running = false;
  let aiming = false;
  let bestStars = 0;
  let overlayShownFor = null;
  const ui = {};

  function init(canvasEl) {
    canvas = canvasEl;

    ui.burritosLeft = document.getElementById('burritosLeft');
    ui.bestStars = document.getElementById('bestStars');
    ui.overlay = document.getElementById('overlay');
    ui.overlayTitle = document.getElementById('overlayTitle');
    ui.overlaySub = document.getElementById('overlaySub');
    ui.overlayStars = document.getElementById('overlayStars');
    ui.retryBtn = document.getElementById('retryBtn');

    bestStars = parseInt(localStorage.getItem(CONFIG.storage.bestStarsKey) || '0', 10) || 0;

    ui.retryBtn.addEventListener('click', () => {
      hideOverlay();
      restartGame();
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

    Model.init();
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
    const table = CONFIG.scoring.starsForRemaining;
    const idx = Math.max(0, Math.min(table.length - 1, left));
    return table[idx];
  }

  function updateHUD() {
    ui.burritosLeft.textContent = Model.getBurritosLeft();
    ui.bestStars.textContent = renderStars(bestStars);
  }

  function renderStars(n) {
    return '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));
  }

  function showWinOverlay() {
    const stars = computeStars();
    if (stars > bestStars) {
      bestStars = stars;
      try { localStorage.setItem(CONFIG.storage.bestStarsKey, String(stars)); } catch (_) {}
    }
    ui.overlayTitle.textContent = 'CRITICS DEMOLISHED!';
    ui.overlaySub.textContent = `Burritos remaining: ${Model.getBurritosLeft()}`;
    ui.overlayStars.textContent = renderStars(stars);
    ui.overlayStars.style.display = '';
    ui.overlay.classList.remove('hidden');
    ui.overlay.dataset.kind = 'win';
    updateHUD();
  }

  function showLoseOverlay() {
    ui.overlayTitle.textContent = 'OUT OF BURRITOS!';
    ui.overlaySub.textContent = 'The critics survived. Retry?';
    ui.overlayStars.style.display = 'none';
    ui.overlay.classList.remove('hidden');
    ui.overlay.dataset.kind = 'lose';
  }

  function hideOverlay() {
    ui.overlay.classList.add('hidden');
  }

  function restartGame() {
    Model.init();
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
