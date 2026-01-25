// ============================================
// GAME CONFIGURATION - SHARED CONSTANTS
// All agents reference this file, DO NOT create conflicting constants elsewhere
// ============================================

export const CONFIG = {
    // Display
    CANVAS_ID: 'game-canvas',
    TARGET_FPS: 60,

    // World dimensions
    ROAD_WIDTH: 40,
    ROAD_LENGTH: 2000,
    LANE_COUNT: 4,
    LANE_WIDTH: 10,

    // Player car
    PLAYER: {
        MAX_SPEED: 250,         // mph
        ACCELERATION: 80,       // units/sec²
        BRAKE_FORCE: 120,
        TURN_SPEED: 2.5,
        DRIFT_FACTOR: 0.95,
        NITRO_BOOST: 1.5,
        NITRO_DURATION: 3,      // seconds
        NITRO_RECHARGE: 5,      // seconds
        START_POSITION: { x: 0, y: 0.5, z: 0 }
    },

    // Traffic
    TRAFFIC: {
        COUNT: 8,
        MIN_SPEED: 40,
        MAX_SPEED: 70,
        SPAWN_DISTANCE: 300,
        DESPAWN_DISTANCE: 100,
        LANE_CHANGE_CHANCE: 0.005,
        COLORS: [
            0x2563eb, // blue
            0xdc2626, // red
            0x16a34a, // green
            0xfbbf24, // yellow
            0x8b5cf6, // purple
            0xf97316, // orange
            0x64748b, // slate
            0xffffff  // white
        ]
    },

    // Environment
    ENVIRONMENT: {
        BUILDING_COUNT: 60,
        BUILDING_MIN_HEIGHT: 20,
        BUILDING_MAX_HEIGHT: 80,
        BUILDING_DEPTH: 30,
        CITY_WIDTH: 200,
        SKY_COLOR: 0x1a1a2e,
        SUNSET_COLOR: 0xff6b35,
        AMBIENT_LIGHT: 0x404040,
        SUN_COLOR: 0xffaa55,
        FOG_NEAR: 100,
        FOG_FAR: 500
    },

    // Physics
    PHYSICS: {
        GRAVITY: -9.81,
        FRICTION: 0.98,
        AIR_RESISTANCE: 0.99,
        COLLISION_BOUNCE: 0.3
    },

    // Camera
    CAMERA: {
        FOV: 75,
        NEAR: 0.1,
        FAR: 1000,
        CHASE_DISTANCE: 12,
        CHASE_HEIGHT: 5,
        CHASE_SMOOTHING: 0.1,
        VIEWS: ['chase', 'hood', 'cockpit', 'cinematic']
    },

    // Effects
    EFFECTS: {
        BLOOM_STRENGTH: 0.8,
        BLOOM_RADIUS: 0.4,
        MOTION_BLUR_STRENGTH: 0.5,
        SPEED_LINES_THRESHOLD: 150, // mph
        SCREEN_SHAKE_INTENSITY: 0.5
    },

    // Audio
    AUDIO: {
        MASTER_VOLUME: 0.7,
        ENGINE_VOLUME: 0.5,
        EFFECTS_VOLUME: 0.6,
        MUSIC_VOLUME: 0.3
    },

    // UI
    UI: {
        SPEEDO_MAX: 280,
        COLORS: {
            PRIMARY: '#d4af37',     // gold
            SECONDARY: '#ffffff',
            DANGER: '#ef4444',
            SUCCESS: '#22c55e',
            NITRO: '#3b82f6'
        }
    },

    // Scoring
    SCORING: {
        NEAR_MISS_DISTANCE: 3,
        NEAR_MISS_POINTS: 100,
        DRIFT_POINTS_PER_SEC: 50,
        SPEED_BONUS_THRESHOLD: 150,
        SPEED_BONUS_MULTIPLIER: 2
    }
};

// Key bindings
export const KEYS = {
    FORWARD: ['ArrowUp', 'KeyW'],
    BACKWARD: ['ArrowDown', 'KeyS'],
    LEFT: ['ArrowLeft', 'KeyA'],
    RIGHT: ['ArrowRight', 'KeyD'],
    BRAKE: ['Space'],
    NITRO: ['ShiftLeft', 'ShiftRight'],
    CAMERA: ['KeyC'],
    PAUSE: ['Escape', 'KeyP']
};
