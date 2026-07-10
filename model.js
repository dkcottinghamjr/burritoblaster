/**
 * BURRITO BLASTER — model.js
 * The Model. Owns Matter.js engine and game state. No rendering, no DOM.
 * Reads everything from CONFIG.
 */
const Model = (() => {
  const { Engine, World, Bodies, Body, Events } = Matter;

  let engine, world;
  let burrito = null;
  let blocks = [];
  let bags = [];
  let walls = [];
  let ground = null;
  let burritosLeft = 0;
  let burritosStart = 0;
  let levelIndex = 0;
  let state = 'READY'; // READY | AIMING | FLYING | WAITING | WIN | LOSE
  let stopFrames = 0;
  let shotBagCount = 0; // bags destroyed by the current shot (combo counter)
  let collisionListeners = [];

  function init(idx = 0) {
    const clamped = Math.max(0, Math.min(CONFIG.levels.length - 1, idx | 0));
    levelIndex = clamped;
    const level = CONFIG.levels[clamped];

    engine = Engine.create();
    world = engine.world;
    world.gravity.x = CONFIG.gravity.x;
    world.gravity.y = CONFIG.gravity.y;
    world.gravity.scale = CONFIG.gravity.scale;

    burritosStart = level.burritos;
    burritosLeft = level.burritos;
    state = 'READY';
    stopFrames = 0;
    shotBagCount = 0;
    collisionListeners = [];
    blocks = [];
    bags = [];

    ground = Bodies.rectangle(
      CONFIG.canvas.width / 2,
      CONFIG.canvas.height - CONFIG.ground.height / 2,
      CONFIG.canvas.width,
      CONFIG.ground.height,
      { isStatic: true, label: 'ground', friction: CONFIG.ground.friction }
    );
    World.add(world, ground);

    const t = 80;
    walls = [
      Bodies.rectangle(-t / 2, CONFIG.canvas.height / 2, t, CONFIG.canvas.height * 2, { isStatic: true, label: 'wall' }),
      Bodies.rectangle(CONFIG.canvas.width + t / 2, CONFIG.canvas.height / 2, t, CONFIG.canvas.height * 2, { isStatic: true, label: 'wall' }),
      Bodies.rectangle(CONFIG.canvas.width / 2, -t / 2, CONFIG.canvas.width * 2, t, { isStatic: true, label: 'wall' }),
    ];
    World.add(world, walls);

    level.blocks.forEach(b => {
      const mat = CONFIG.blockMaterials[b.type];
      const block = Bodies.rectangle(b.x, b.y, b.w, b.h, {
        density: mat.density,
        friction: mat.friction,
        restitution: mat.restitution,
        label: 'block:' + b.type,
      });
      block.kind = b.type;
      block.dims = { w: b.w, h: b.h };
      blocks.push(block);
      World.add(world, block);
    });

    level.bags.forEach(b => {
      const s = b.size;
      const bag = Bodies.rectangle(b.x, b.y, s, s, {
        density: CONFIG.bag.density,
        friction: CONFIG.bag.friction,
        restitution: CONFIG.bag.restitution,
        label: 'bag',
      });
      bag.alive = true;
      bag.size = s;
      bags.push(bag);
      World.add(world, bag);
    });

    spawnBurrito();
    Events.on(engine, 'collisionStart', onCollisionStart);
  }

  function spawnBurrito() {
    if (burrito) {
      World.remove(world, burrito);
      burrito = null;
    }
    burrito = Bodies.circle(
      CONFIG.slingshot.anchorX,
      CONFIG.slingshot.anchorY,
      CONFIG.burrito.radius,
      {
        density: CONFIG.burrito.density,
        friction: CONFIG.burrito.friction,
        frictionAir: CONFIG.burrito.frictionAir,
        restitution: CONFIG.burrito.restitution,
        label: 'burrito',
      }
    );
    Body.setStatic(burrito, true);
    World.add(world, burrito);
    state = 'READY';
    stopFrames = 0;
  }

  function startAim() {
    if (state !== 'READY' || !burrito) return false;
    state = 'AIMING';
    return true;
  }

  function updateAim(mx, my) {
    if (state !== 'AIMING' || !burrito) return;
    const ax = CONFIG.slingshot.anchorX;
    const ay = CONFIG.slingshot.anchorY;
    let dx = mx - ax;
    let dy = my - ay;
    const dist = Math.hypot(dx, dy);
    const max = CONFIG.slingshot.maxStretch;
    if (dist > max) {
      dx = (dx / dist) * max;
      dy = (dy / dist) * max;
    }
    Body.setPosition(burrito, { x: ax + dx, y: ay + dy });
  }

  function release() {
    if (state !== 'AIMING' || !burrito) return false;
    const ax = CONFIG.slingshot.anchorX;
    const ay = CONFIG.slingshot.anchorY;
    const dx = ax - burrito.position.x;
    const dy = ay - burrito.position.y;
    const stretch = Math.hypot(dx, dy);
    if (stretch < CONFIG.slingshot.minReleaseStretch) {
      // No-op: restore to nest, don't consume a burrito.
      Body.setPosition(burrito, { x: ax, y: ay });
      state = 'READY';
      return false;
    }
    Body.setStatic(burrito, false);
    Body.setVelocity(burrito, {
      x: dx * CONFIG.slingshot.velocityMultiplier,
      y: dy * CONFIG.slingshot.velocityMultiplier,
    });
    burritosLeft -= 1;
    shotBagCount = 0;
    state = 'FLYING';
    return true;
  }

  function tick() {
    Engine.update(engine, 1000 / 60);

    if (state === 'FLYING' && burrito) {
      const v = burrito.velocity;
      const speed = Math.hypot(v.x, v.y);
      if (speed < CONFIG.state.stopSpeedThreshold) stopFrames++;
      else stopFrames = 0;

      const off = burrito.position.x < -80
        || burrito.position.x > CONFIG.canvas.width + 80
        || burrito.position.y > CONFIG.canvas.height + 200;

      if (stopFrames > CONFIG.state.stopFrames || off) {
        stopFrames = 0;
        state = 'WAITING';
        setTimeout(checkLevelEnd, CONFIG.state.settleDelayMs);
      }
    }
  }

  function checkLevelEnd() {
    if (state === 'WIN' || state === 'LOSE') return;
    const aliveBags = bags.filter(b => b.alive);
    if (aliveBags.length === 0) {
      state = 'WIN';
      return;
    }
    if (burritosLeft <= 0) {
      state = 'LOSE';
      return;
    }
    spawnBurrito();
  }

  /**
   * Trajectory prediction. Simulates an idealised forward physics step
   * matching Matter.js integration so the dashed parabola matches reality.
   */
  function predictTrajectory() {
    if (state !== 'AIMING' || !burrito) return [];
    const ax = CONFIG.slingshot.anchorX;
    const ay = CONFIG.slingshot.anchorY;
    const dx = ax - burrito.position.x;
    const dy = ay - burrito.position.y;
    if (Math.hypot(dx, dy) < CONFIG.trajectory.minStretchToShow) return [];

    const mult = CONFIG.slingshot.velocityMultiplier;
    let vx = dx * mult;
    let vy = dy * mult;
    let x = burrito.position.x;
    let y = burrito.position.y;
    const g = CONFIG.trajectory.gravityPerTick;
    const drag = CONFIG.trajectory.dragPerTick;
    const groundY = CONFIG.canvas.height - CONFIG.ground.height;

    const pts = [];
    for (let i = 0; i < CONFIG.trajectory.steps; i++) {
      x += vx;
      y += vy;
      vy += g;
      vx *= drag;
      vy *= drag;
      pts.push({ x, y });
      if (y > groundY - CONFIG.burrito.radius) break;
      if (x > CONFIG.canvas.width + 60) break;
    }
    return pts;
  }

  function onCollisionStart(evt) {
    evt.pairs.forEach(pair => {
      const { bodyA, bodyB } = pair;
      const speed = Math.max(
        Math.hypot(bodyA.velocity.x, bodyA.velocity.y),
        Math.hypot(bodyB.velocity.x, bodyB.velocity.y)
      );
      const involvesProjectile = bodyA.label === 'burrito' || bodyB.label === 'burrito';
      const bagBody = bodyA.label === 'bag' ? bodyA : (bodyB.label === 'bag' ? bodyB : null);
      const supports = pair.collision && pair.collision.supports;
      const point = (supports && supports[0]) || {
        x: (bodyA.position.x + bodyB.position.x) / 2,
        y: (bodyA.position.y + bodyB.position.y) / 2,
      };

      collisionListeners.forEach(fn => fn({
        bodyA, bodyB, speed, involvesProjectile, bagBody, point, bagDestroyed: false,
      }));

      if (bagBody && bagBody.alive && speed >= CONFIG.bag.destroyThreshold) {
        bagBody.alive = false;
        World.remove(world, bagBody);
        shotBagCount += 1;
        collisionListeners.forEach(fn => fn({
          bagDestroyed: true,
          point: { x: bagBody.position.x, y: bagBody.position.y },
          speed,
          size: bagBody.size,
          combo: shotBagCount,
          bagsRemaining: bags.filter(b => b.alive).length,
        }));
      }
    });
  }

  function onCollision(fn) { collisionListeners.push(fn); }

  return {
    init,
    tick,
    startAim, updateAim, release,
    predictTrajectory,
    onCollision,
    getState: () => state,
    getBurrito: () => burrito,
    getBlocks: () => blocks,
    getBags: () => bags,
    getBagsRemaining: () => bags.filter(b => b.alive).length,
    setTimeScale: s => { if (engine) engine.timing.timeScale = s; },
    getBurritosLeft: () => burritosLeft,
    getBurritosStart: () => burritosStart,
    getLevelIndex: () => levelIndex,
    getLevel: () => CONFIG.levels[levelIndex],
    getLevelCount: () => CONFIG.levels.length,
    getAnchor: () => ({ x: CONFIG.slingshot.anchorX, y: CONFIG.slingshot.anchorY }),
  };
})();
