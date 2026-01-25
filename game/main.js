// ============================================
// MAIN GAME CONTROLLER
// This file orchestrates all modules - agents should NOT modify this file
// ============================================

import { CONFIG } from './config.js';
import { SceneManager } from './core/scene.js';
import { InputManager } from './core/input.js';
import { PhysicsEngine } from './core/physics.js';
import { PlayerCar } from './entities/player-car.js';
import { TrafficManager } from './entities/traffic.js';
import { Environment } from './entities/environment.js';
import { EffectsManager } from './systems/effects.js';
import { ParticleSystem } from './systems/particles.js';
import { AudioManager } from './systems/audio.js';
import { HUD } from './ui/hud.js';

class Game {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.score = 0;
        this.gameState = 'menu'; // menu, playing, paused, gameover
    }

    async init() {
        console.log('🎮 Initializing Ariel\'s Street Racing...');

        // Initialize core systems
        this.scene = new SceneManager();
        await this.scene.init();

        this.input = new InputManager();
        this.input.init();

        this.physics = new PhysicsEngine();
        this.physics.init();

        // Initialize entities
        this.player = new PlayerCar(this.scene);
        await this.player.init();

        this.traffic = new TrafficManager(this.scene, this.physics);
        await this.traffic.init();

        this.environment = new Environment(this.scene);
        await this.environment.init();

        // Initialize systems
        this.effects = new EffectsManager(this.scene);
        this.effects.init();

        this.particles = new ParticleSystem(this.scene);
        this.particles.init();

        this.audio = new AudioManager();
        await this.audio.init();

        // Initialize UI
        this.hud = new HUD();
        this.hud.init();

        // Setup event listeners
        this.setupEvents();

        console.log('✅ Game initialized successfully!');
        this.showMenu();
    }

    setupEvents() {
        // Pause toggle
        this.input.on('pause', () => this.togglePause());

        // Camera switch
        this.input.on('camera', () => this.scene.nextCameraView());

        // Window resize
        window.addEventListener('resize', () => this.scene.onResize());
    }

    showMenu() {
        this.gameState = 'menu';
        this.hud.showMenu({
            onStart: () => this.startGame(),
            title: "ARIEL'S STREET RACING",
            subtitle: "Mr. President's Birthday Grand Prix"
        });
    }

    startGame() {
        this.gameState = 'playing';
        this.isRunning = true;
        this.score = 0;

        // Reset positions
        this.player.reset();
        this.traffic.reset();

        // Start audio
        this.audio.startEngine();
        this.audio.playMusic();

        // Hide menu, show HUD
        this.hud.hideMenu();
        this.hud.show();

        // Start game loop
        this.lastTime = performance.now();
        this.gameLoop();
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.isPaused = !this.isPaused;
            this.gameState = this.isPaused ? 'paused' : 'playing';

            if (this.isPaused) {
                this.hud.showPause();
                this.audio.pause();
            } else {
                this.hud.hidePause();
                this.audio.resume();
                this.lastTime = performance.now();
                this.gameLoop();
            }
        }
    }

    gameLoop() {
        if (!this.isRunning || this.isPaused) return;

        const currentTime = performance.now();
        this.deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap at 100ms
        this.lastTime = currentTime;

        // Update all systems
        this.update(this.deltaTime);

        // Render
        this.render();

        // Continue loop
        requestAnimationFrame(() => this.gameLoop());
    }

    update(dt) {
        // Get input state
        const inputState = this.input.getState();

        // Update player car
        this.player.update(dt, inputState);

        // Update traffic
        this.traffic.update(dt, this.player.position, this.player.speed);

        // Check collisions
        const collisions = this.physics.checkCollisions(
            this.player.getCollider(),
            this.traffic.getColliders()
        );

        // Handle collisions
        if (collisions.length > 0) {
            this.handleCollisions(collisions);
        }

        // Check near misses
        const nearMisses = this.physics.checkNearMisses(
            this.player.getCollider(),
            this.traffic.getColliders(),
            CONFIG.SCORING.NEAR_MISS_DISTANCE
        );

        if (nearMisses > 0) {
            this.addScore(nearMisses * CONFIG.SCORING.NEAR_MISS_POINTS);
            this.hud.showNearMiss(nearMisses);
            this.effects.flashNearMiss();
        }

        // Update environment (moving buildings/road)
        this.environment.update(dt, this.player.position, this.player.speed);

        // Update particles
        this.particles.update(dt, {
            playerPosition: this.player.position,
            playerSpeed: this.player.speed,
            isDrifting: this.player.isDrifting,
            isNitro: this.player.isNitroActive
        });

        // Update effects
        this.effects.update(dt, {
            speed: this.player.speed,
            isNitro: this.player.isNitroActive,
            isDrifting: this.player.isDrifting
        });

        // Update audio
        this.audio.update({
            rpm: this.player.rpm,
            speed: this.player.speed,
            isDrifting: this.player.isDrifting,
            isNitro: this.player.isNitroActive
        });

        // Update HUD
        this.hud.update({
            speed: this.player.speed,
            rpm: this.player.rpm,
            gear: this.player.gear,
            nitro: this.player.nitroAmount,
            score: this.score,
            damage: this.player.damage
        });

        // Update camera
        this.scene.updateCamera(this.player.position, this.player.rotation, this.player.speed);
    }

    handleCollisions(collisions) {
        for (const collision of collisions) {
            // Apply collision physics
            this.player.onCollision(collision);

            // Visual effects
            this.effects.screenShake(collision.intensity);
            this.particles.spawnSparks(collision.point);

            // Audio
            this.audio.playCollision(collision.intensity);

            // Damage
            this.player.addDamage(collision.intensity * 10);
        }

        // Check game over
        if (this.player.damage >= 100) {
            this.gameOver();
        }
    }

    addScore(points) {
        this.score += points;
    }

    gameOver() {
        this.gameState = 'gameover';
        this.isRunning = false;
        this.audio.stopEngine();
        this.audio.stopMusic();
        this.audio.playGameOver();

        this.hud.showGameOver({
            score: this.score,
            onRestart: () => this.startGame(),
            onMenu: () => this.showMenu()
        });
    }

    render() {
        this.scene.render();
    }

    // Cleanup
    dispose() {
        this.isRunning = false;
        this.scene.dispose();
        this.input.dispose();
        this.audio.dispose();
        this.particles.dispose();
    }
}

// Initialize game when DOM is ready
let game;

function updateLoadingProgress(percent, text) {
    const bar = document.getElementById('loading-bar');
    const loadingText = document.getElementById('loading-text');
    if (bar) bar.style.width = percent + '%';
    if (loadingText) loadingText.textContent = text;
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
    }
}

function showError(message) {
    const loadingText = document.getElementById('loading-text');
    if (loadingText) {
        loadingText.textContent = 'Error: ' + message;
        loadingText.style.color = '#ef4444';
    }
    console.error('Game Error:', message);
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        updateLoadingProgress(10, 'Creating game...');
        game = new Game();

        updateLoadingProgress(20, 'Loading scene...');
        await game.init();

        updateLoadingProgress(100, 'Ready!');

        // Hide loading screen after a brief delay
        setTimeout(() => {
            hideLoadingScreen();
        }, 500);

    } catch (error) {
        showError(error.message);
        console.error('Full error:', error);
    }
});

// Export for debugging
window.game = game;
