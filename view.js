/**
 * BURRITO BLASTER — view.js
 * The View. Pure rendering layer. Reads Model state + CONFIG, writes pixels.
 * Owns its own ephemeral juice state (particles, popups, screen shake).
 */
const View = (() => {
  let ctx, canvas;
  let particles = [];
  let popups = [];
  let chips = [];
  let trail = [];
  let chipTargetProvider = null;
  let nudgeVisible = false;
  let frame = 0;
  let shake = { time: 0, magnitude: 0 };

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');

    // Seed a sane backing buffer before layout reports real CSS size.
    const dpr0 = Math.min(CONFIG.render.maxDPR, window.devicePixelRatio || 1);
    canvas.width = CONFIG.canvas.width * dpr0;
    canvas.height = CONFIG.canvas.height * dpr0;
    requestAnimationFrame(resize);

    if (window.ResizeObserver) {
      const ro = new ResizeObserver(resize);
      ro.observe(canvas);
    } else {
      window.addEventListener('resize', resize);
      window.addEventListener('orientationchange', () => setTimeout(resize, 200));
    }
  }

  function resize() {
    // Match backing-store to the canvas's actual CSS size × capped DPR.
    // This avoids over-rendering on phones whose stage is much smaller
    // than the 1200×650 world.
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(CONFIG.render.maxDPR, window.devicePixelRatio || 1);
    const cssW = rect.width || CONFIG.canvas.width;
    const cssH = rect.height || CONFIG.canvas.height;
    const newW = Math.max(1, Math.round(cssW * dpr));
    const newH = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== newW) canvas.width = newW;
    if (canvas.height !== newH) canvas.height = newH;
  }

  function render() {
    const w = CONFIG.canvas.width;
    const h = CONFIG.canvas.height;

    // World coords (1200×650) -> backing buffer pixels.
    const sx = canvas.width / w;
    const sy = canvas.height / h;
    ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    if (shake.time > 0) {
      const ssx = (Math.random() - 0.5) * shake.magnitude;
      const ssy = (Math.random() - 0.5) * shake.magnitude;
      ctx.translate(ssx, ssy);
      shake.time -= 1000 / 60;
      if (shake.time <= 0) { shake.time = 0; shake.magnitude = 0; }
    }

    frame++;
    drawSky(w, h);
    drawGround(w, h);
    drawSlingshotBack();
    drawTrajectory();
    drawBlocks();
    drawBags();
    drawElasticBack();
    drawTrail();
    drawBurrito();
    drawElasticFront();
    drawNudge();
    drawParticles();
    updateAndDrawChips();
    drawPopups();

    ctx.restore();
  }

  function drawTrail() {
    const b = Model.getBurrito();
    if (Model.getState() === 'FLYING' && b) {
      trail.push({ x: b.position.x, y: b.position.y });
      if (trail.length > CONFIG.trail.maxPoints) trail.shift();
    } else if (trail.length) {
      // Fade the tail out once the flight ends instead of popping it.
      trail.shift();
    }
    const n = trail.length;
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / n;
      ctx.fillStyle = `rgba(${CONFIG.trail.color}, ${CONFIG.trail.maxAlpha * t})`;
      const r = CONFIG.trail.minRadius + (CONFIG.trail.maxRadius - CONFIG.trail.minRadius) * t;
      ctx.beginPath();
      ctx.arc(trail[i].x, trail[i].y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function setNudgeVisible(v) { nudgeVisible = v; }

  function drawNudge() {
    if (!nudgeVisible) return;
    const b = Model.getBurrito();
    if (!b || Model.getState() !== 'READY') return;
    const cfg = CONFIG.nudge;
    const pulse = Math.sin(frame * cfg.pulseSpeed);
    const r = CONFIG.burrito.radius + 14 + pulse * 5;

    ctx.strokeStyle = cfg.ringColor;
    ctx.lineWidth = cfg.ringWidth;
    ctx.globalAlpha = 0.65 + 0.35 * pulse;
    ctx.beginPath();
    ctx.arc(b.position.x, b.position.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.font = cfg.font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = 5;
    ctx.strokeStyle = cfg.textStroke;
    const ty = b.position.y - r - 14 + pulse * 2;
    ctx.strokeText(cfg.text, b.position.x, ty);
    ctx.fillStyle = cfg.textColor;
    ctx.fillText(cfg.text, b.position.x, ty);
  }

  function setChipsTarget(provider) {
    chipTargetProvider = provider;
  }

  function spawnChips(x, y, count, onArrival) {
    const cfg = CONFIG.chips;
    // Cap on-screen sprites: if we'd overflow, still credit the score so
    // big chains don't silently lose chips, but skip the visual sprite.
    const room = Math.max(0, cfg.maxOnscreen - chips.length);
    const visible = Math.min(count, room);
    const skipped = count - visible;
    for (let i = 0; i < skipped; i++) if (onArrival) onArrival();
    for (let i = 0; i < visible; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = cfg.explodeSpeedMin + Math.random() * (cfg.explodeSpeedMax - cfg.explodeSpeedMin);
      chips.push({
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - cfg.explodeUpwardBias,
        rot: Math.random() * Math.PI * 2,
        rotVel: (Math.random() - 0.5) * cfg.rotVelMax,
        size: cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin),
        phase: 'EXPLODE',
        phaseTime: 0,
        explodeFrames: cfg.explodeFramesMin + Math.floor(Math.random() * (cfg.explodeFramesMax - cfg.explodeFramesMin)),
        homeFrames: cfg.homeFramesMin + Math.floor(Math.random() * (cfg.homeFramesMax - cfg.homeFramesMin)),
        homeProgress: 0,
        startX: 0, startY: 0,
        onArrival,
      });
    }
  }

  function updateAndDrawChips() {
    if (chips.length === 0) return;
    const cfg = CONFIG.chips;
    const target = chipTargetProvider ? chipTargetProvider() : null;
    const arrivedCallbacks = [];

    chips = chips.filter(c => {
      c.rot += c.rotVel;

      if (c.phase === 'EXPLODE') {
        c.x += c.vx;
        c.y += c.vy;
        c.vy += cfg.explodeGravity;
        c.vx *= cfg.explodeDrag;
        c.vy *= cfg.explodeDrag;
        c.phaseTime++;
        if (c.phaseTime >= c.explodeFrames) {
          c.phase = 'HOME';
          c.startX = c.x;
          c.startY = c.y;
          c.homeProgress = 0;
        }
      } else {
        c.homeProgress++;
        if (!target) {
          // Target unavailable: collect chip immediately (no animation).
          if (c.onArrival) arrivedCallbacks.push(c.onArrival);
          return false;
        }
        const t = Math.min(1, c.homeProgress / c.homeFrames);
        // Cubic ease-in: slow drift, snappy finish.
        const eased = t * t * t;
        c.x = c.startX + (target.x - c.startX) * eased;
        c.y = c.startY + (target.y - c.startY) * eased;
        c.rotVel *= 1.05;
        if (t >= 1 || Math.hypot(target.x - c.x, target.y - c.y) < cfg.homeArrivalDistance) {
          if (c.onArrival) arrivedCallbacks.push(c.onArrival);
          return false;
        }
      }
      drawChip(c);
      return true;
    });

    arrivedCallbacks.forEach(fn => fn());
  }

  function drawChip(c) {
    const s = c.size;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    const grad = ctx.createLinearGradient(0, -s * 0.6, 0, s * 0.5);
    grad.addColorStop(0, CONFIG.chips.fillTop);
    grad.addColorStop(1, CONFIG.chips.fillBottom);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.6);
    ctx.lineTo(-s * 0.55, s * 0.45);
    ctx.lineTo(s * 0.55, s * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = CONFIG.chips.stroke;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Two short ridge lines for tortilla texture.
    ctx.strokeStyle = CONFIG.chips.ridge;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-s * 0.28, -s * 0.05);
    ctx.lineTo(s * 0.28, -s * 0.05);
    ctx.moveTo(-s * 0.18, s * 0.2);
    ctx.lineTo(s * 0.18, s * 0.2);
    ctx.stroke();
    ctx.restore();
  }

  function drawSky(w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, CONFIG.sky.topColor);
    g.addColorStop(1, CONFIG.sky.bottomColor);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = CONFIG.sky.sunColor;
    ctx.beginPath();
    ctx.arc(w - 140, 120, 70, 0, Math.PI * 2);
    ctx.fill();
    // distant hills
    ctx.fillStyle = 'rgba(184, 92, 40, 0.45)';
    ctx.beginPath();
    ctx.moveTo(0, h - 100);
    ctx.quadraticCurveTo(200, h - 200, 400, h - 110);
    ctx.quadraticCurveTo(600, h - 220, 900, h - 110);
    ctx.quadraticCurveTo(1100, h - 190, 1200, h - 110);
    ctx.lineTo(1200, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
  }

  function drawGround(w, h) {
    ctx.fillStyle = CONFIG.ground.color;
    ctx.fillRect(0, h - CONFIG.ground.height, w, CONFIG.ground.height);
    ctx.fillStyle = CONFIG.ground.stripeColor;
    ctx.fillRect(0, h - CONFIG.ground.height, w, 6);
  }

  function drawSlingshotBack() {
    // Trunk + back prong (drawn before burrito).
    const ax = CONFIG.slingshot.anchorX;
    const ay = CONFIG.slingshot.anchorY;
    const groundY = CONFIG.canvas.height - CONFIG.ground.height;
    ctx.strokeStyle = CONFIG.slingshot.postColor;
    ctx.lineWidth = CONFIG.slingshot.postWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ax, groundY);
    ctx.lineTo(ax, ay + 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax + 22, ay - 24);
    ctx.lineTo(ax, ay + 8);
    ctx.stroke();
    // back band (behind burrito)
    if (Model.getState() === 'AIMING') {
      const b = Model.getBurrito();
      ctx.strokeStyle = CONFIG.slingshot.bandColor;
      ctx.lineWidth = CONFIG.slingshot.bandWidth;
      ctx.beginPath();
      ctx.moveTo(ax + 22, ay - 24);
      ctx.lineTo(b.position.x, b.position.y);
      ctx.stroke();
    }
  }

  function drawElasticBack() {
    // No-op placeholder for ordering symmetry; back band already drawn.
  }

  function drawElasticFront() {
    // Front prong + front band (drawn after burrito to wrap around it).
    const ax = CONFIG.slingshot.anchorX;
    const ay = CONFIG.slingshot.anchorY;
    ctx.strokeStyle = CONFIG.slingshot.postColor;
    ctx.lineWidth = CONFIG.slingshot.postWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ax - 22, ay - 24);
    ctx.lineTo(ax, ay + 8);
    ctx.stroke();

    // chili pepper decoration on left prong tip
    ctx.font = '32px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(CONFIG.slingshot.pepperEmoji, ax - 22, ay - 40);

    if (Model.getState() === 'AIMING') {
      const b = Model.getBurrito();
      ctx.strokeStyle = CONFIG.slingshot.bandColor;
      ctx.lineWidth = CONFIG.slingshot.bandWidth;
      ctx.beginPath();
      ctx.moveTo(ax - 22, ay - 24);
      ctx.lineTo(b.position.x, b.position.y);
      ctx.stroke();
    }
  }

  function drawBurrito() {
    const b = Model.getBurrito();
    if (!b) return;
    ctx.save();
    ctx.translate(b.position.x, b.position.y);
    ctx.rotate(b.angle);
    const r = CONFIG.burrito.radius;
    // foil base
    ctx.fillStyle = CONFIG.burrito.foilLight;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.25, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    // shadow on bottom half
    ctx.fillStyle = CONFIG.burrito.foilDark;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.32, r * 1.1, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    // tortilla peek on right end
    ctx.fillStyle = CONFIG.burrito.tortillaColor;
    ctx.beginPath();
    ctx.arc(r * 0.95, 0, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // foil crinkle creases
    ctx.strokeStyle = CONFIG.burrito.creaseColor;
    ctx.lineWidth = 1.5;
    for (let i = -2; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.5 + i * 8, -r * 0.55);
      ctx.lineTo(-r * 0.3 + i * 8, r * 0.55);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBlocks() {
    Model.getBlocks().forEach(b => {
      const mat = CONFIG.blockMaterials[b.kind];
      const w = b.dims.w, h = b.dims.h;
      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);
      ctx.fillStyle = mat.color;
      ctx.strokeStyle = mat.stroke;
      ctx.lineWidth = 2;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      if (b.kind === 'cheese') {
        ctx.fillStyle = mat.holeColor;
        const id = b.id || 1;
        for (let i = 0; i < 4; i++) {
          const px = (Math.sin(i * 9.7 + id) * 0.35) * w * 0.5;
          const py = (Math.cos(i * 4.3 + id) * 0.35) * h * 0.5;
          ctx.beginPath();
          ctx.arc(px, py, Math.min(3, w * 0.08), 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.strokeStyle = mat.ridgeColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const step = 10;
        if (w >= h) {
          for (let i = -w / 2 + step; i < w / 2; i += step) {
            ctx.moveTo(i, -h / 2);
            ctx.lineTo(i, h / 2);
          }
        } else {
          for (let i = -h / 2 + step; i < h / 2; i += step) {
            ctx.moveTo(-w / 2, i);
            ctx.lineTo(w / 2, i);
          }
        }
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  function drawBags() {
    Model.getBags().forEach(b => {
      if (!b.alive) return;
      const s = b.size;
      const halfBottom = (s * 0.92) / 2;
      const halfTop = (s * 1.0) / 2;
      const halfH = s / 2;

      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);
      // Subtle "breathing" so bags read as alive, tempting targets.
      const breathe = 1 + CONFIG.bagIdle.breatheAmp * Math.sin(frame * CONFIG.bagIdle.breatheSpeed + b.id);
      ctx.scale(breathe, 1 / breathe);

      // Body — slightly trapezoidal, wider at the top opening.
      ctx.fillStyle = CONFIG.bag.paperColor;
      ctx.beginPath();
      ctx.moveTo(-halfBottom,  halfH);
      ctx.lineTo( halfBottom,  halfH);
      ctx.lineTo( halfTop,    -halfH);
      ctx.lineTo(-halfTop,    -halfH);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = CONFIG.bag.paperShadow;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Folded-over top band
      const foldH = s * 0.18;
      ctx.fillStyle = CONFIG.bag.foldColor;
      ctx.beginPath();
      ctx.moveTo(-halfTop, -halfH);
      ctx.lineTo( halfTop, -halfH);
      ctx.lineTo( halfTop * 0.96, -halfH + foldH);
      ctx.lineTo(-halfTop * 0.96, -halfH + foldH);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = CONFIG.bag.foldStroke;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-halfTop * 0.96, -halfH + foldH);
      ctx.lineTo( halfTop * 0.96, -halfH + foldH);
      ctx.stroke();

      // Vertical paper crease in the centre
      ctx.strokeStyle = CONFIG.bag.creaseColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -halfH + foldH + 1);
      ctx.lineTo(0,  halfH - 1);
      ctx.stroke();

      // Subtle highlight on the left flank
      ctx.fillStyle = CONFIG.bag.paperHighlight;
      ctx.globalAlpha = 0.32;
      const hx = -halfTop + s * 0.12;
      ctx.beginPath();
      ctx.moveTo(hx,            -halfH + foldH + 2);
      ctx.lineTo(hx + s * 0.06, -halfH + foldH + 2);
      ctx.lineTo(hx + s * 0.06,  halfH - 2);
      ctx.lineTo(hx,             halfH - 2);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      // Outer crinkle ticks near the bottom corners
      ctx.strokeStyle = CONFIG.bag.paperShadow;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-halfBottom + 2, halfH - 4);
      ctx.lineTo(-halfBottom + 5, halfH - 1);
      ctx.moveTo( halfBottom - 2, halfH - 4);
      ctx.lineTo( halfBottom - 5, halfH - 1);
      ctx.stroke();

      ctx.restore();
    });
  }

  function drawTrajectory() {
    const pts = Model.predictTrajectory();
    pts.forEach((p, i) => {
      if (i % (CONFIG.trajectory.skip + 1) !== 0) return;
      const fade = 1 - (i / pts.length) * 0.55;
      ctx.fillStyle = CONFIG.trajectory.dotColor;
      ctx.globalAlpha = fade;
      ctx.beginPath();
      ctx.arc(p.x, p.y, CONFIG.trajectory.dotRadius * fade, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function spawnParticles(x, y, kind, count) {
    const cfg = CONFIG.particles;
    const colors = kind === 'crumb' ? cfg.crumbColors : cfg.salsaColors;
    const n = count != null ? count : cfg.countOnImpact;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = cfg.minSpeed + Math.random() * (cfg.maxSpeed - cfg.minSpeed);
      particles.push({
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 1.8,
        life: cfg.minLife + Math.random() * (cfg.maxLife - cfg.minLife),
        maxLife: cfg.maxLife,
        size: cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin),
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    if (particles.length > cfg.maxOnscreen) {
      particles.splice(0, particles.length - cfg.maxOnscreen);
    }
  }

  function drawParticles() {
    const grav = CONFIG.particles.gravity;
    particles = particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += grav;
      p.life -= 1;
      if (p.life <= 0) return false;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.min(1, p.life / 20);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      return true;
    });
    ctx.globalAlpha = 1;
  }

  function spawnPopup(x, y, text, color, stroke) {
    popups.push({ x, y, text, color, stroke, life: CONFIG.popups.life, maxLife: CONFIG.popups.life });
  }

  function drawPopups() {
    popups = popups.filter(p => {
      p.y -= CONFIG.popups.riseSpeed;
      p.life -= 1;
      if (p.life <= 0) return false;
      const t = p.life / p.maxLife;
      const scale = 0.8 + (1 - t) * 0.5;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(scale, scale);
      ctx.globalAlpha = t;
      ctx.font = CONFIG.popups.font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 6;
      ctx.strokeStyle = p.stroke || CONFIG.popups.stroke;
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.color || CONFIG.popups.color;
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
      return true;
    });
    ctx.globalAlpha = 1;
  }

  function triggerShake(magnitude, duration) {
    shake.magnitude = Math.max(shake.magnitude, magnitude);
    shake.time = Math.max(shake.time, duration);
  }

  function clearJuice() {
    particles = [];
    popups = [];
    trail = [];
    // Note: chips are intentionally NOT cleared. If the player restarts
    // mid-flight, those chips still arrive and credit their score.
    shake = { time: 0, magnitude: 0 };
  }

  return { init, render, spawnParticles, spawnPopup, triggerShake, clearJuice, spawnChips, setChipsTarget, setNudgeVisible };
})();
