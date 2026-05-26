/**
 * BURRITO BLASTER — view.js
 * The View. Pure rendering layer. Reads Model state + CONFIG, writes pixels.
 * Owns its own ephemeral juice state (particles, popups, screen shake).
 */
const View = (() => {
  let ctx, canvas;
  let particles = [];
  let popups = [];
  let shake = { time: 0, magnitude: 0 };

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
  }

  function render() {
    const w = CONFIG.canvas.width;
    const h = CONFIG.canvas.height;
    ctx.save();
    ctx.clearRect(0, 0, w, h);

    if (shake.time > 0) {
      const sx = (Math.random() - 0.5) * shake.magnitude;
      const sy = (Math.random() - 0.5) * shake.magnitude;
      ctx.translate(sx, sy);
      shake.time -= 1000 / 60;
      if (shake.time <= 0) { shake.time = 0; shake.magnitude = 0; }
    }

    drawSky(w, h);
    drawGround(w, h);
    drawSlingshotBack();
    drawTrajectory();
    drawBlocks();
    drawCritics();
    drawElasticBack();
    drawBurrito();
    drawElasticFront();
    drawParticles();
    drawPopups();

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

  function drawCritics() {
    Model.getCritics().forEach(c => {
      if (!c.alive) return;
      const r = c.radius;
      ctx.save();
      ctx.translate(c.position.x, c.position.y);
      ctx.rotate(c.angle);

      ctx.fillStyle = CONFIG.critic.bodyColor;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = CONFIG.critic.bodyStroke;
      ctx.lineWidth = 2;
      ctx.stroke();

      // beret
      ctx.fillStyle = CONFIG.critic.hatColor;
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.85, r * 0.95, r * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(r * 0.25, -r * 1.05, r * 0.18, 0, Math.PI * 2);
      ctx.fill();

      // eyes
      ctx.fillStyle = CONFIG.critic.eyeWhite;
      ctx.beginPath();
      ctx.arc(-r * 0.32, -r * 0.1, r * 0.22, 0, Math.PI * 2);
      ctx.arc( r * 0.32, -r * 0.1, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = CONFIG.critic.eyePupil;
      ctx.beginPath();
      ctx.arc(-r * 0.30, -r * 0.1, r * 0.10, 0, Math.PI * 2);
      ctx.arc( r * 0.34, -r * 0.1, r * 0.10, 0, Math.PI * 2);
      ctx.fill();

      // disapproving frown
      ctx.strokeStyle = CONFIG.critic.mouthColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, r * 0.55, r * 0.35, Math.PI, Math.PI * 2);
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

  function spawnPopup(x, y, text) {
    popups.push({ x, y, text, life: CONFIG.popups.life, maxLife: CONFIG.popups.life });
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
      ctx.strokeStyle = CONFIG.popups.stroke;
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = CONFIG.popups.color;
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
    shake = { time: 0, magnitude: 0 };
  }

  return { init, render, spawnParticles, spawnPopup, triggerShake, clearJuice };
})();
