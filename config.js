/**
 * BURRITO BLASTER — config.js
 * The "brain". Every tunable variable lives here. Model/View/Controller
 * read from this file only; no magic numbers elsewhere.
 */
const CONFIG = {
  canvas: { width: 1200, height: 650 },

  // World physics (matches Matter.js defaults: scale 0.001)
  gravity: { x: 0, y: 1.0, scale: 0.001 },

  ground: {
    height: 60,
    color: '#3a2418',
    stripeColor: '#6f4530',
    friction: 0.6,
  },

  sky: {
    topColor: '#ff8c3a',
    bottomColor: '#ffe29a',
    sunColor: 'rgba(255, 240, 180, 0.55)',
  },

  slingshot: {
    anchorX: 180,
    anchorY: 460,
    maxStretch: 150,
    velocityMultiplier: 0.22, // applied per-tick (Matter velocity is per-tick)
    minReleaseStretch: 20,
    bandColor: '#5b2e10',
    bandWidth: 6,
    postColor: '#7a4422',
    postWidth: 14,
    pickRadius: 70,
    pepperEmoji: '🌶',
  },

  burrito: {
    radius: 22,
    density: 0.005,
    friction: 0.05,
    frictionAir: 0.005,
    restitution: 0.35,
    foilLight: '#e2e2ea',
    foilDark: '#9c9ca8',
    tortillaColor: '#e6c688',
    creaseColor: '#7e7e88',
    startCount: 3,
  },

  trajectory: {
    steps: 32,
    skip: 1,
    dotRadius: 3.2,
    dotColor: 'rgba(255, 230, 110, 0.95)',
    minStretchToShow: 15,
    gravityPerTick: 0.278, // gravity.y * gravity.scale * (1000/60)^2
    dragPerTick: 0.995,    // 1 - frictionAir
  },

  // Fort: stacked rectangles. Mixed cheese walls + tortilla-chip slabs.
  blocks: [
    { type: 'cheese', x: 900,  y: 530, w: 30,  h: 100 },
    { type: 'cheese', x: 1020, y: 530, w: 30,  h: 100 },
    { type: 'chip',   x: 960,  y: 470, w: 150, h: 20  },
    { type: 'cheese', x: 920,  y: 415, w: 30,  h: 80  },
    { type: 'cheese', x: 1000, y: 415, w: 30,  h: 80  },
    { type: 'chip',   x: 960,  y: 365, w: 120, h: 20  },
    { type: 'cheese', x: 1080, y: 545, w: 30,  h: 70  },
    { type: 'chip',   x: 1080, y: 495, w: 60,  h: 18  },
  ],

  blockMaterials: {
    cheese: {
      density: 0.0028,
      friction: 0.5,
      restitution: 0.05,
      color: '#f4c542',
      stroke: '#a87a14',
      holeColor: '#a87a14',
    },
    chip: {
      density: 0.0018,
      friction: 0.7,
      restitution: 0.02,
      color: '#d4943a',
      stroke: '#7a4915',
      ridgeColor: '#a86c20',
    },
  },

  // Hungry Food Critics — circular targets.
  critics: [
    { x: 960,  y: 445, radius: 22 },
    { x: 960,  y: 335, radius: 22 },
    { x: 1080, y: 470, radius: 18 },
  ],
  critic: {
    bodyColor: '#7a3a9b',
    bodyStroke: '#3a1a4a',
    hatColor: '#1c0820',
    eyeWhite: '#ffffff',
    eyePupil: '#1a0820',
    mouthColor: '#1a0820',
    density: 0.002,
    friction: 0.3,
    restitution: 0.4,
    destroyThreshold: 4.5, // total impact velocity at collision
  },

  // Juice
  particles: {
    salsaColors: ['#d8232a', '#ff5a3c', '#a8121a', '#ff8a3c'],
    crumbColors: ['#f4c542', '#d4943a', '#fff4c0'],
    countOnImpact: 14,
    countOnCritic: 38,
    minSpeed: 2,
    maxSpeed: 9,
    minLife: 28,
    maxLife: 58,
    gravity: 0.35,
    sizeMin: 2,
    sizeMax: 6,
  },

  screenShake: {
    duration: 200,
    magnitude: 9,
    criticMagnitude: 15,
  },

  popups: {
    words: ['SWEET!', 'YUM!', 'SPICY!', 'NOM!', 'TASTY!'],
    color: '#fff45a',
    stroke: '#a86b00',
    font: 'bold 56px "Bangers", "Impact", sans-serif',
    life: 65,
    riseSpeed: 1.2,
  },

  impact: {
    shakeThreshold: 6, // min collision speed to trigger juice
  },

  scoring: {
    starsForRemaining: [1, 2, 3, 3], // stars for [0,1,2,3] burritos remaining
  },

  storage: {
    bestStarsKey: 'burritoBlaster.bestStars.v1',
  },

  state: {
    stopSpeedThreshold: 0.4,
    stopFrames: 25,
    settleDelayMs: 400,
  },
};
