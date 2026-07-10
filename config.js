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
    pickRadius: 110, // touch-friendly hit area in world pixels
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

  bag: {
    paperColor: '#b97a3a',
    paperShadow: '#7a4e1f',
    paperHighlight: '#e0a96a',
    foldColor: '#6e4319',
    foldStroke: '#3a2210',
    creaseColor: '#8a5a26',
    density: 0.0018,
    friction: 0.45,
    restitution: 0.18,
    destroyThreshold: 4.5, // total impact velocity at collision
  },

  /**
   * LEVELS — ordered campaign. Each level defines its own fort layout,
   * bag placement and burrito budget. Coordinates assume ground top
   * at y = canvas.height - ground.height = 590.
   */
  levels: [
    {
      name: 'Salsa Standoff',
      hint: 'Smack the cheese walls clean over.',
      burritos: 3,
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
      bags: [
        { x: 960,  y: 445, size: 44 },
        { x: 960,  y: 335, size: 44 },
        { x: 1080, y: 470, size: 36 },
      ],
    },

    {
      name: 'Tortilla Tower',
      hint: 'One spine, three floors. Aim high.',
      burritos: 3,
      blocks: [
        // Base
        { type: 'cheese', x: 950,  y: 540, w: 28,  h: 100 },
        { type: 'cheese', x: 1050, y: 540, w: 28,  h: 100 },
        { type: 'chip',   x: 1000, y: 482, w: 130, h: 18  },
        // Floor 2
        { type: 'cheese', x: 960,  y: 425, w: 28,  h: 86  },
        { type: 'cheese', x: 1040, y: 425, w: 28,  h: 86  },
        { type: 'chip',   x: 1000, y: 372, w: 110, h: 18  },
        // Floor 3
        { type: 'cheese', x: 980,  y: 322, w: 25,  h: 80  },
        { type: 'cheese', x: 1020, y: 322, w: 25,  h: 80  },
        { type: 'chip',   x: 1000, y: 272, w: 90,  h: 16  },
      ],
      bags: [
        { x: 1000, y: 244, size: 36 }, // perched on the tower's tip
        { x: 1000, y: 451, size: 40 }, // middle floor
        { x: 1000, y: 568, size: 40 }, // base, between pillars
        { x: 1110, y: 572, size: 32 }, // hiding off to the side
      ],
    },

    {
      name: 'Chip Trench',
      hint: 'Walls everywhere. Arc your shots over the top.',
      burritos: 3,
      blocks: [
        // Tall front wall
        { type: 'cheese', x: 780, y: 500, w: 24,  h: 180 },
        // Inner stack
        { type: 'cheese', x: 880, y: 555, w: 28,  h: 70  },
        { type: 'cheese', x: 940, y: 555, w: 28,  h: 70  },
        { type: 'chip',   x: 910, y: 510, w: 90,  h: 18  },
        // Even taller back wall
        { type: 'cheese', x: 1050, y: 460, w: 26, h: 260 },
        // Hidden platform behind back wall
        { type: 'chip',   x: 1130, y: 540, w: 100, h: 18 },
      ],
      bags: [
        { x: 780,  y: 392, size: 32 }, // teetering on the front wall
        { x: 830,  y: 570, size: 36 }, // ground, between walls
        { x: 910,  y: 482, size: 36 }, // perched on inner stack
        { x: 1130, y: 512, size: 36 }, // behind back wall
      ],
    },

    {
      name: 'Guac Gauntlet',
      hint: 'Two forts, twice the trouble. Manage your budget.',
      burritos: 4,
      blocks: [
        // Fort A — close, short
        { type: 'cheese', x: 700, y: 540, w: 26, h: 100 },
        { type: 'cheese', x: 760, y: 540, w: 26, h: 100 },
        { type: 'chip',   x: 730, y: 482, w: 80, h: 18  },
        { type: 'cheese', x: 715, y: 438, w: 24, h: 70  },
        { type: 'cheese', x: 745, y: 438, w: 24, h: 70  },
        { type: 'chip',   x: 730, y: 398, w: 60, h: 16  },
        // Fort B — far, taller
        { type: 'cheese', x: 990,  y: 540, w: 28, h: 100 },
        { type: 'cheese', x: 1080, y: 540, w: 28, h: 100 },
        { type: 'chip',   x: 1035, y: 482, w: 110, h: 18 },
        { type: 'cheese', x: 1000, y: 425, w: 28,  h: 84 },
        { type: 'cheese', x: 1070, y: 425, w: 28,  h: 84 },
        { type: 'chip',   x: 1035, y: 372, w: 95,  h: 18 },
        { type: 'cheese', x: 1035, y: 322, w: 28,  h: 80 },
      ],
      bags: [
        { x: 730,  y: 454, size: 36 }, // on Fort A floor 1
        { x: 730,  y: 370, size: 36 }, // on Fort A floor 2 (top)
        { x: 1035, y: 454, size: 36 }, // on Fort B floor 1
        { x: 1035, y: 344, size: 36 }, // on Fort B floor 2
        { x: 1035, y: 262, size: 36 }, // on Fort B summit
      ],
    },

    {
      name: 'Salsa Verde Vault',
      hint: 'Heavy fortifications. Precision over power.',
      burritos: 4,
      blocks: [
        // Tall shielding front wall
        { type: 'cheese', x: 780, y: 470, w: 26, h: 240 },
        // Inner bunker base
        { type: 'cheese', x: 850, y: 555, w: 22, h: 70 },
        { type: 'cheese', x: 920, y: 555, w: 22, h: 70 },
        { type: 'chip',   x: 885, y: 511, w: 90, h: 18 },
        // Bunker walls
        { type: 'cheese', x: 855, y: 462, w: 20, h: 78 },
        { type: 'cheese', x: 915, y: 462, w: 20, h: 78 },
        // Bunker roof
        { type: 'chip',   x: 885, y: 413, w: 90, h: 18 },
        // Right tower base + floor
        { type: 'cheese', x: 1050, y: 540, w: 24, h: 100 },
        { type: 'cheese', x: 1130, y: 540, w: 24, h: 100 },
        { type: 'chip',   x: 1090, y: 481, w: 100, h: 18 },
        // Right tower top pillars + cap
        { type: 'cheese', x: 1060, y: 425, w: 22, h: 90 },
        { type: 'cheese', x: 1120, y: 425, w: 22, h: 90 },
        { type: 'chip',   x: 1090, y: 372, w: 80, h: 16 },
      ],
      bags: [
        { x: 885,  y: 485, size: 32 }, // sealed inside the bunker
        { x: 885,  y: 387, size: 32 }, // on top of the bunker roof
        { x: 1090, y: 456, size: 28 }, // between right top pillars
        { x: 1090, y: 345, size: 36 }, // crowning the right tower
        { x: 1170, y: 572, size: 32 }, // out on the right flank
      ],
    },
  ],

  // Juice
  particles: {
    salsaColors: ['#d8232a', '#ff5a3c', '#a8121a', '#ff8a3c'],
    crumbColors: ['#f4c542', '#d4943a', '#fff4c0'],
    countOnImpact: 14,
    countOnBag: 38,
    minSpeed: 2,
    maxSpeed: 9,
    minLife: 28,
    maxLife: 58,
    gravity: 0.35,
    sizeMin: 2,
    sizeMax: 6,
    maxOnscreen: 260, // cap to keep mobile GPUs happy
  },

  render: {
    maxDPR: 2, // cap devicePixelRatio for crisp-but-not-wasteful rendering
  },

  screenShake: {
    duration: 200,
    magnitude: 9,
    bagMagnitude: 15,
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

  // Multi-bag-per-shot combo escalation.
  combo: {
    words: ['', 'DOUBLE!', 'TRIPLE!', 'RAMPAGE!'],
    multipliers: [1, 2, 3, 4],
    pitchStep: 0.22,        // bag-pop pitch rises this much per combo step
    popupColor: '#7dff5a',
    popupStroke: '#14400a',
  },

  // Game-feel time manipulation.
  feel: {
    hitstopFrames: 4,       // physics freeze on every bag pop
    slowmoScale: 0.3,       // engine time scale when the LAST bag pops
    slowmoDurationMs: 700,
  },

  // Streak trail behind the flying burrito.
  trail: {
    maxPoints: 14,
    color: '255, 214, 90', // rgb triplet; alpha computed per point
    maxAlpha: 0.45,
    minRadius: 3,
    maxRadius: 10,
  },

  // Idle re-engagement nudge on the slingshot.
  nudge: {
    idleDelayMs: 4000,
    ringColor: 'rgba(255, 244, 90, 0.9)',
    ringWidth: 3,
    text: 'DRAG TO AIM',
    textColor: '#fff45a',
    textStroke: '#5a1a0a',
    font: 'bold 26px "Bangers", "Impact", sans-serif',
    pulseSpeed: 0.09,
  },

  // Subtle life on the paper bags so the scene never looks frozen.
  bagIdle: {
    breatheAmp: 0.022,
    breatheSpeed: 0.06,
  },

  /**
   * Stars are awarded based on the ratio of burritos remaining to the
   * level's starting budget. 1 star = won at all, 2 = >=1/3 budget left,
   * 3 = >=2/3 budget left.
   */
  scoring: {
    twoStarsAtRatio: 1 / 3,
    threeStarsAtRatio: 2 / 3,
    chipsPerBagMin: 8,
    chipsPerBagMax: 18,
    chipsPerBagSizeFactor: 0.3,    // chips ≈ round(bag.size * factor)
    chipsPerBagSpeedFactor: 0.4,   // + round(speed * factor)
    chipBonusPerLeftover: 25,      // per surviving burrito on win
    chipBonusThreeStar: 100,       // extra for a 3-star clear
    countUpMs: 800,                // win-overlay chip tally animation
  },

  chips: {
    fillTop: '#f7d160',
    fillBottom: '#c98a2a',
    stroke: '#6a3e0e',
    ridge: '#a06618',
    sizeMin: 8,
    sizeMax: 13,
    explodeSpeedMin: 4,
    explodeSpeedMax: 10,
    explodeUpwardBias: 4,
    explodeGravity: 0.42,
    explodeDrag: 0.96,
    explodeFramesMin: 22,
    explodeFramesMax: 30,
    homeFramesMin: 30,
    homeFramesMax: 46,
    rotVelMax: 0.32,
    homeArrivalDistance: 14,
    maxOnscreen: 80,
  },

  audio: {
    masterVolume: 0.45,

    // Slingshot release: short pitched whoosh
    launch: {
      freqStart: 620,
      freqEnd: 90,
      duration: 0.22,
      peak: 0.32,
      type: 'sawtooth',
    },

    // Generic impact thud (block-on-block, burrito-on-block)
    impact: {
      durationMin: 0.06,
      durationMax: 0.13,
      cutoffStart: 1800,
      cutoffEnd: 180,
      peakMin: 0.18,
      peakMax: 0.5,
    },

    // Bag destruction: crinkly band-pass noise + descending sine "boop"
    bag: {
      noiseDuration: 0.16,
      noiseCenterHz: 2400,
      noiseQ: 1.4,
      noisePeak: 0.4,
      blipFreq: 660,
      blipFreqEnd: 280,
      blipDuration: 0.14,
      blipPeak: 0.34,
    },

    // Slingshot band creak while stretching (pitch follows tension)
    creak: {
      freqBase: 90,
      freqMax: 230,
      peak: 0.12,
      duration: 0.06,
      stretchStep: 22, // world px of stretch change per creak tick
    },

    // Win fanfare (C5 / E5 / G5)
    win: { notes: [523.25, 659.25, 783.99], step: 0.11, type: 'triangle', peak: 0.3, release: 0.4 },
    // Lose stinger (G3 / C3)
    lose: { notes: [196.0, 130.81], step: 0.19, type: 'sawtooth', peak: 0.24, release: 0.45 },
  },

  haptics: {
    launch: 25,
    impact: 12,
    bag: [18, 30, 55],
    win: [60, 40, 60, 40, 120],
    lose: [120, 60, 120],
  },

  storage: {
    bestStarsKey: 'burritoBlaster.bestStars.v2',
    progressKey: 'burritoBlaster.progress.v2',
    muteKey: 'burritoBlaster.muted.v2',
    chipsKey: 'burritoBlaster.totalChips.v2',
  },

  state: {
    stopSpeedThreshold: 0.4,
    stopFrames: 25,
    settleDelayMs: 400,
  },
};
