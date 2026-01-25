// ============================================
// SCENE MANAGER - Three.js Scene, Renderer, Camera, Lighting
// Handles all rendering and camera logic for the racing game
// ============================================

import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * SceneManager - Manages the Three.js scene, renderer, camera, and lighting
 * Provides chase camera logic with smooth following and multiple camera views
 */
export class SceneManager {
    constructor() {
        // Core Three.js objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        // Camera state
        this.currentViewIndex = 0;
        this.cameraViews = CONFIG.CAMERA.VIEWS;

        // Camera smoothing state
        this.cameraPosition = new THREE.Vector3();
        this.cameraLookAt = new THREE.Vector3();

        // Bind methods for event handlers
        this.onResize = this.onResize.bind(this);
    }

    /**
     * Initialize the scene, renderer, camera, and lighting
     * @returns {Object} - References to scene, camera, and renderer
     */
    init() {
        // Create the scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(CONFIG.ENVIRONMENT.SKY_COLOR);

        // Add atmospheric fog
        this.scene.fog = new THREE.Fog(
            CONFIG.ENVIRONMENT.SKY_COLOR,
            CONFIG.ENVIRONMENT.FOG_NEAR,
            CONFIG.ENVIRONMENT.FOG_FAR
        );

        // Create perspective camera
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(
            CONFIG.CAMERA.FOV,
            aspect,
            CONFIG.CAMERA.NEAR,
            CONFIG.CAMERA.FAR
        );

        // Set initial camera position
        this.camera.position.set(0, CONFIG.CAMERA.CHASE_HEIGHT, -CONFIG.CAMERA.CHASE_DISTANCE);
        this.camera.lookAt(0, 0, 0);

        // Initialize camera smoothing vectors
        this.cameraPosition.copy(this.camera.position);
        this.cameraLookAt.set(0, 0, 0);

        // Create WebGL renderer with antialiasing and shadows
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById(CONFIG.CANVAS_ID),
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });

        // Configure renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap for performance
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        // Setup lighting
        this._setupLighting();

        // Listen for window resize
        window.addEventListener('resize', this.onResize);

        return {
            scene: this.scene,
            camera: this.camera,
            renderer: this.renderer
        };
    }

    /**
     * Setup scene lighting - ambient and directional (sunset style)
     * @private
     */
    _setupLighting() {
        // Dim ambient light for base illumination
        const ambientLight = new THREE.AmbientLight(
            CONFIG.ENVIRONMENT.AMBIENT_LIGHT,
            0.4
        );
        this.scene.add(ambientLight);

        // Main directional light (sunset orange)
        const sunLight = new THREE.DirectionalLight(
            CONFIG.ENVIRONMENT.SUN_COLOR,
            1.2
        );
        sunLight.position.set(100, 50, 50);
        sunLight.castShadow = true;

        // Configure shadow map for quality shadows
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 500;
        sunLight.shadow.camera.left = -100;
        sunLight.shadow.camera.right = 100;
        sunLight.shadow.camera.top = 100;
        sunLight.shadow.camera.bottom = -100;
        sunLight.shadow.bias = -0.0001;

        this.scene.add(sunLight);

        // Add a secondary fill light from the opposite side
        const fillLight = new THREE.DirectionalLight(
            CONFIG.ENVIRONMENT.SUNSET_COLOR,
            0.3
        );
        fillLight.position.set(-50, 30, -50);
        this.scene.add(fillLight);

        // Hemisphere light for natural sky/ground gradient
        const hemiLight = new THREE.HemisphereLight(
            CONFIG.ENVIRONMENT.SUNSET_COLOR, // sky color
            0x1a1a2e, // ground color
            0.3
        );
        this.scene.add(hemiLight);
    }

    /**
     * Render the scene
     */
    render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Update camera position to follow target with smoothing
     * @param {Object} targetPos - Target position {x, y, z}
     * @param {number} targetRot - Target rotation in radians (Y-axis)
     * @param {number} speed - Current speed (affects camera behavior)
     */
    updateCamera(targetPos, targetRot, speed) {
        if (!this.camera) return;

        const view = this.cameraViews[this.currentViewIndex];
        const smoothing = CONFIG.CAMERA.CHASE_SMOOTHING;

        // Speed-based dynamic adjustments
        const speedFactor = Math.min(speed / CONFIG.PLAYER.MAX_SPEED, 1);
        const dynamicDistance = CONFIG.CAMERA.CHASE_DISTANCE + speedFactor * 4;
        const dynamicHeight = CONFIG.CAMERA.CHASE_HEIGHT + speedFactor * 2;
        const dynamicFOV = CONFIG.CAMERA.FOV + speedFactor * 15;

        // Calculate desired camera position based on view type
        let desiredPosition = new THREE.Vector3();
        let desiredLookAt = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);

        switch (view) {
            case 'chase':
                // Behind and above the car
                desiredPosition.set(
                    targetPos.x - Math.sin(targetRot) * dynamicDistance,
                    targetPos.y + dynamicHeight,
                    targetPos.z - Math.cos(targetRot) * dynamicDistance
                );
                break;

            case 'hood':
                // On the hood, looking forward
                desiredPosition.set(
                    targetPos.x,
                    targetPos.y + 1.5,
                    targetPos.z + 2
                );
                desiredLookAt.set(
                    targetPos.x + Math.sin(targetRot) * 50,
                    targetPos.y + 1,
                    targetPos.z + Math.cos(targetRot) * 50
                );
                break;

            case 'cockpit':
                // Inside the car, first-person view
                desiredPosition.set(
                    targetPos.x,
                    targetPos.y + 1.2,
                    targetPos.z + 0.5
                );
                desiredLookAt.set(
                    targetPos.x + Math.sin(targetRot) * 50,
                    targetPos.y + 0.8,
                    targetPos.z + Math.cos(targetRot) * 50
                );
                break;

            case 'cinematic':
                // Dynamic orbital camera
                const time = Date.now() * 0.0002;
                const orbitRadius = 20 + speedFactor * 10;
                desiredPosition.set(
                    targetPos.x + Math.sin(time) * orbitRadius,
                    targetPos.y + 8 + Math.sin(time * 2) * 2,
                    targetPos.z + Math.cos(time) * orbitRadius
                );
                break;

            default:
                // Default to chase view
                desiredPosition.set(
                    targetPos.x - Math.sin(targetRot) * dynamicDistance,
                    targetPos.y + dynamicHeight,
                    targetPos.z - Math.cos(targetRot) * dynamicDistance
                );
        }

        // Smoothly interpolate camera position
        this.cameraPosition.lerp(desiredPosition, smoothing);
        this.cameraLookAt.lerp(desiredLookAt, smoothing * 1.5);

        // Apply to camera
        this.camera.position.copy(this.cameraPosition);
        this.camera.lookAt(this.cameraLookAt);

        // Smoothly adjust FOV based on speed
        this.camera.fov += (dynamicFOV - this.camera.fov) * 0.05;
        this.camera.updateProjectionMatrix();
    }

    /**
     * Cycle to the next camera view
     * @returns {string} - Name of the new camera view
     */
    nextCameraView() {
        this.currentViewIndex = (this.currentViewIndex + 1) % this.cameraViews.length;
        return this.cameraViews[this.currentViewIndex];
    }

    /**
     * Handle window resize
     */
    onResize() {
        if (!this.camera || !this.renderer) return;

        const width = window.innerWidth;
        const height = window.innerHeight;

        // Update camera aspect ratio
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        // Update renderer size
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    /**
     * Clean up resources and event listeners
     */
    dispose() {
        // Remove event listener
        window.removeEventListener('resize', this.onResize);

        // Dispose of renderer
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }

        // Clear scene
        if (this.scene) {
            // Traverse and dispose of all objects
            this.scene.traverse((object) => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            this.scene = null;
        }

        this.camera = null;
    }
}
