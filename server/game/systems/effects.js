// ============================================
// EFFECTS MANAGER - Post-processing and screen effects
// ============================================

import { CONFIG } from '../config.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import * as THREE from 'three';

export class EffectsManager {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;

        // Screen shake
        this.shakeIntensity = 0;
        this.shakeDecay = 5; // How fast shake decays
        this.originalCameraPosition = new THREE.Vector3();

        // Vignette overlay
        this.vignetteOverlay = null;

        // Near miss flash
        this.flashOverlay = null;
        this.flashDuration = 0;
    }

    init() {
        // Get references from scene manager
        this.scene = this.sceneManager.scene;
        this.camera = this.sceneManager.camera;
        this.renderer = this.sceneManager.renderer;

        // Setup post-processing composer
        this.setupComposer();

        // Create screen overlays
        this.createVignetteOverlay();
        this.createFlashOverlay();

        console.log('Effects Manager initialized');
    }

    setupComposer() {
        // Create effect composer
        this.composer = new EffectComposer(this.renderer);

        // Add render pass
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Add bloom pass
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            CONFIG.EFFECTS.BLOOM_STRENGTH,
            CONFIG.EFFECTS.BLOOM_RADIUS,
            0.85 // threshold
        );
        this.composer.addPass(bloomPass);
        this.bloomPass = bloomPass;

        // Handle resize
        window.addEventListener('resize', () => this.onResize());
    }

    createVignetteOverlay() {
        // Create CSS vignette overlay for speed effect
        this.vignetteOverlay = document.createElement('div');
        this.vignetteOverlay.id = 'speed-vignette';
        this.vignetteOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 100;
            opacity: 0;
            background: radial-gradient(
                ellipse at center,
                transparent 0%,
                transparent 40%,
                rgba(0, 0, 0, 0.3) 70%,
                rgba(0, 0, 0, 0.7) 100%
            );
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(this.vignetteOverlay);
    }

    createFlashOverlay() {
        // Create flash overlay for near-miss effect
        this.flashOverlay = document.createElement('div');
        this.flashOverlay.id = 'near-miss-flash';
        this.flashOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 101;
            opacity: 0;
            background: radial-gradient(
                ellipse at center,
                rgba(212, 175, 55, 0.4) 0%,
                rgba(212, 175, 55, 0.2) 30%,
                transparent 70%
            );
            transition: opacity 0.1s ease-out;
        `;
        document.body.appendChild(this.flashOverlay);
    }

    update(dt, state) {
        // Update screen shake
        this.updateScreenShake(dt);

        // Update speed vignette
        this.updateVignette(state.speed);

        // Update flash effect
        this.updateFlash(dt);

        // Render with post-processing
        if (this.composer) {
            this.composer.render();
        }
    }

    updateScreenShake(dt) {
        if (this.shakeIntensity > 0.001) {
            // Apply random offset to camera
            const offsetX = (Math.random() - 0.5) * this.shakeIntensity;
            const offsetY = (Math.random() - 0.5) * this.shakeIntensity;

            this.camera.position.x += offsetX;
            this.camera.position.y += offsetY;

            // Decay shake
            this.shakeIntensity *= Math.exp(-this.shakeDecay * dt);
        }
    }

    updateVignette(speed) {
        if (!this.vignetteOverlay) return;

        // Calculate vignette intensity based on speed
        const speedRatio = speed / CONFIG.PLAYER.MAX_SPEED;
        const vignetteIntensity = Math.max(0, (speedRatio - 0.5) * 2); // Starts at 50% speed

        this.vignetteOverlay.style.opacity = vignetteIntensity.toString();
    }

    updateFlash(dt) {
        if (this.flashDuration > 0) {
            this.flashDuration -= dt;
            const intensity = Math.max(0, this.flashDuration / 0.3);
            this.flashOverlay.style.opacity = intensity.toString();
        }
    }

    screenShake(intensity) {
        // Add to current shake intensity
        this.shakeIntensity = Math.max(
            this.shakeIntensity,
            intensity * CONFIG.EFFECTS.SCREEN_SHAKE_INTENSITY
        );
    }

    flashNearMiss() {
        // Trigger near-miss flash effect
        this.flashDuration = 0.3;
        this.flashOverlay.style.opacity = '1';
    }

    onResize() {
        if (this.composer) {
            this.composer.setSize(window.innerWidth, window.innerHeight);
        }
        if (this.bloomPass) {
            this.bloomPass.resolution.set(window.innerWidth, window.innerHeight);
        }
    }

    dispose() {
        // Remove overlays
        if (this.vignetteOverlay && this.vignetteOverlay.parentNode) {
            this.vignetteOverlay.parentNode.removeChild(this.vignetteOverlay);
        }
        if (this.flashOverlay && this.flashOverlay.parentNode) {
            this.flashOverlay.parentNode.removeChild(this.flashOverlay);
        }

        // Dispose composer
        if (this.composer) {
            this.composer.dispose();
        }

        // Remove resize listener
        window.removeEventListener('resize', () => this.onResize());
    }
}
