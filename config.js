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

  /**
   * LEVELS — ordered campaign. Each level defines its own fort layout,
   * critic placement and burrito budget. Coordinates assume ground top
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
      critics: [
        { x: 960,  y: 445, radius: 22 },
        { x: 960,  y: 335, radius: 22 },
        { x: 1080, y: 470, radius: 18 },
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
      critics: [
        { x: 1000, y: 244, radius: 18 }, // perched on the tower's tip
        { x: 1000, y: 451, radius: 20 }, // middle floor
        { x: 1000, y: 568, radius: 20 }, // base, between pillars
        { x: 1110, y: 572, radius: 16 }, // hiding off to the side
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
      critics: [
        { x: 780,  y: 392, radius: 16 }, // teetering on the front wall
        { x: 830,  y: 570, radius: 18 }, // ground, between walls
        { x: 910,  y: 482, radius: 18 }, // perched on inner stack
        { x: 1130, y: 512, radius: 18 }, // behind back wall
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
      critics: [
        { x: 730,  y: 454, radius: 18 }, // on Fort A floor 1
        { x: 730,  y: 370, radius: 18 }, // on Fort A floor 2 (top)
        { x: 1035, y: 454, radius: 18 }, // on Fort B floor 1
        { x: 1035, y: 344, radius: 18 }, // on Fort B floor 2
        { x: 1035, y: 262, radius: 18 }, // on Fort B summit
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
      critics: [
        { x: 885,  y: 485, radius: 16 }, // sealed inside the bunker
        { x: 885,  y: 387, radius: 16 }, // on top of the bunker roof
        { x: 1090, y: 456, radius: 14 }, // between right top pillars
        { x: 1090, y: 345, radius: 18 }, // crowning the right tower
        { x: 1170, y: 572, radius: 16 }, // out on the right flank
      ],
    },
  ],

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

  /**
   * Stars are awarded based on the ratio of burritos remaining to the
   * level's starting budget. 1 star = won at all, 2 = >=1/3 budget left,
   * 3 = >=2/3 budget left.
   */
  scoring: {
    twoStarsAtRatio: 1 / 3,
    threeStarsAtRatio: 2 / 3,
  },

  storage: {
    bestStarsKey: 'burritoBlaster.bestStars.v2',
    progressKey: 'burritoBlaster.progress.v2',
  },

  state: {
    stopSpeedThreshold: 0.4,
    stopFrames: 25,
    settleDelayMs: 400,
  },
};
