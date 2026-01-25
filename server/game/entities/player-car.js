// ============================================
// PLAYER CAR - Gold Sports Car with Arcade Physics
// ============================================

import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class PlayerCar {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;

        // Position and movement
        this.position = new THREE.Vector3();
        this.rotation = new THREE.Euler();
        this.velocity = new THREE.Vector3();

        // Car state
        this.speed = 0;           // Current speed in mph
        this.rpm = 800;           // Engine RPM
        this.gear = 1;            // Current gear (1-6)
        this.damage = 0;          // Damage (0-100)
        this.nitroAmount = 1;     // Nitro fuel (0-1)
        this.isDrifting = false;
        this.isNitroActive = false;
        this.isBraking = false;

        // Internal physics state
        this.steeringAngle = 0;
        this.driftAngle = 0;
        this.wheelRotation = 0;

        // Meshes
        this.carGroup = null;
        this.wheels = [];
        this.headlights = [];
        this.taillights = [];
        this.nitroFlames = [];
    }

    init() {
        this.carGroup = new THREE.Group();

        // Create car body
        this.createBody();

        // Create wheels
        this.createWheels();

        // Create headlights
        this.createHeadlights();

        // Create taillights
        this.createTaillights();

        // Create nitro flames (hidden initially)
        this.createNitroFlames();

        // Set initial position
        const startPos = CONFIG.PLAYER.START_POSITION;
        this.carGroup.position.set(startPos.x, startPos.y, startPos.z);
        this.position.copy(this.carGroup.position);

        // Add to scene
        this.sceneManager.scene.add(this.carGroup);

        return this;
    }

    createBody() {
        // Main body - stretched box for sporty look
        const bodyGeometry = new THREE.BoxGeometry(2.2, 0.8, 4.5);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xd4af37,  // Gold - birthday theme
            metalness: 0.9,
            roughness: 0.2
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.4;
        body.castShadow = true;
        body.receiveShadow = true;
        this.carGroup.add(body);

        // Cabin/roof - smaller box on top
        const cabinGeometry = new THREE.BoxGeometry(1.8, 0.6, 2);
        const cabinMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,  // Dark tinted glass
            metalness: 0.8,
            roughness: 0.1,
            transparent: true,
            opacity: 0.8
        });
        const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
        cabin.position.set(0, 1, -0.3);
        cabin.castShadow = true;
        this.carGroup.add(cabin);

        // Hood scoop
        const scoopGeometry = new THREE.BoxGeometry(0.6, 0.15, 0.8);
        const scoop = new THREE.Mesh(scoopGeometry, bodyMaterial);
        scoop.position.set(0, 0.85, 1.2);
        scoop.castShadow = true;
        this.carGroup.add(scoop);

        // Front spoiler/bumper
        const frontBumperGeometry = new THREE.BoxGeometry(2.4, 0.2, 0.3);
        const bumperMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            metalness: 0.5,
            roughness: 0.4
        });
        const frontBumper = new THREE.Mesh(frontBumperGeometry, bumperMaterial);
        frontBumper.position.set(0, 0.1, 2.3);
        this.carGroup.add(frontBumper);

        // Rear spoiler
        const spoilerGeometry = new THREE.BoxGeometry(2, 0.08, 0.25);
        const spoilerMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            metalness: 0.7,
            roughness: 0.3
        });
        const spoiler = new THREE.Mesh(spoilerGeometry, spoilerMaterial);
        spoiler.position.set(0, 1.1, -2);
        this.carGroup.add(spoiler);

        // Spoiler stands
        const standGeometry = new THREE.BoxGeometry(0.08, 0.3, 0.08);
        [-0.8, 0.8].forEach(x => {
            const stand = new THREE.Mesh(standGeometry, spoilerMaterial);
            stand.position.set(x, 0.95, -2);
            this.carGroup.add(stand);
        });

        // Side skirts
        const skirtGeometry = new THREE.BoxGeometry(0.1, 0.25, 3.5);
        [-1.15, 1.15].forEach(x => {
            const skirt = new THREE.Mesh(skirtGeometry, bumperMaterial);
            skirt.position.set(x, 0.15, 0);
            this.carGroup.add(skirt);
        });
    }

    createWheels() {
        const wheelRadius = 0.35;
        const wheelWidth = 0.25;
        const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);
        const wheelMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            metalness: 0.3,
            roughness: 0.7
        });

        // Rim material
        const rimGeometry = new THREE.CylinderGeometry(wheelRadius * 0.7, wheelRadius * 0.7, wheelWidth + 0.02, 8);
        const rimMaterial = new THREE.MeshStandardMaterial({
            color: 0xc0c0c0,
            metalness: 0.9,
            roughness: 0.1
        });

        // Wheel positions [x, y, z]
        const wheelPositions = [
            [-0.95, 0.35, 1.4],   // Front left
            [0.95, 0.35, 1.4],    // Front right
            [-0.95, 0.35, -1.4],  // Rear left
            [0.95, 0.35, -1.4]    // Rear right
        ];

        wheelPositions.forEach((pos, index) => {
            const wheelGroup = new THREE.Group();

            // Tire
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.castShadow = true;
            wheelGroup.add(wheel);

            // Rim
            const rim = new THREE.Mesh(rimGeometry, rimMaterial);
            rim.rotation.z = Math.PI / 2;
            wheelGroup.add(rim);

            wheelGroup.position.set(pos[0], pos[1], pos[2]);
            this.carGroup.add(wheelGroup);
            this.wheels.push(wheelGroup);
        });
    }

    createHeadlights() {
        const lightGeometry = new THREE.SphereGeometry(0.12, 8, 8);
        const lightMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffee,
            emissive: 0xffffaa,
            emissiveIntensity: 1
        });

        // Headlight positions [x, z]
        const positions = [
            [-0.7, 2.2],
            [0.7, 2.2]
        ];

        positions.forEach(pos => {
            const light = new THREE.Mesh(lightGeometry, lightMaterial.clone());
            light.position.set(pos[0], 0.4, pos[1]);
            this.carGroup.add(light);
            this.headlights.push(light);

            // Add actual point light for illumination
            const pointLight = new THREE.PointLight(0xffffaa, 0.5, 30);
            pointLight.position.set(pos[0], 0.4, pos[1] + 0.5);
            this.carGroup.add(pointLight);
        });
    }

    createTaillights() {
        const lightGeometry = new THREE.BoxGeometry(0.3, 0.15, 0.05);
        const lightMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });

        // Taillight positions [x, z]
        const positions = [
            [-0.8, -2.25],
            [0.8, -2.25]
        ];

        positions.forEach(pos => {
            const light = new THREE.Mesh(lightGeometry, lightMaterial.clone());
            light.position.set(pos[0], 0.5, pos[1]);
            this.carGroup.add(light);
            this.taillights.push(light);
        });
    }

    createNitroFlames() {
        // Flame geometry - cone shape
        const flameGeometry = new THREE.ConeGeometry(0.15, 0.8, 8);
        const flameMaterial = new THREE.MeshStandardMaterial({
            color: 0x00aaff,
            emissive: 0x0066ff,
            emissiveIntensity: 2,
            transparent: true,
            opacity: 0.8
        });

        // Exhaust positions
        const positions = [
            [-0.4, 0.25, -2.3],
            [0.4, 0.25, -2.3]
        ];

        positions.forEach(pos => {
            const flame = new THREE.Mesh(flameGeometry, flameMaterial.clone());
            flame.rotation.x = Math.PI / 2;
            flame.position.set(pos[0], pos[1], pos[2]);
            flame.visible = false;
            this.carGroup.add(flame);
            this.nitroFlames.push(flame);
        });
    }

    update(dt, inputState) {
        if (!this.carGroup) return;

        const cfg = CONFIG.PLAYER;

        // Get input
        const forward = inputState.forward ? 1 : 0;
        const backward = inputState.backward ? 1 : 0;
        const left = inputState.left ? 1 : 0;
        const right = inputState.right ? 1 : 0;
        const brake = inputState.brake;
        const nitro = inputState.nitro;

        // Store braking state for taillights
        this.isBraking = brake;

        // Handle nitro
        this.updateNitro(dt, nitro);

        // Calculate target acceleration
        let acceleration = 0;
        if (forward) {
            acceleration = cfg.ACCELERATION;
        }
        if (backward) {
            acceleration = -cfg.BRAKE_FORCE;
        }
        if (brake && this.speed > 0) {
            acceleration = -cfg.BRAKE_FORCE * 1.5;
        }

        // Apply nitro boost
        const speedMultiplier = this.isNitroActive ? cfg.NITRO_BOOST : 1;
        const maxSpeed = cfg.MAX_SPEED * speedMultiplier;

        // Update speed (arcade physics - direct control)
        this.speed += acceleration * dt;

        // Apply friction/air resistance when not accelerating
        if (!forward && !backward) {
            this.speed *= CONFIG.PHYSICS.FRICTION;
        }

        // Clamp speed
        this.speed = Math.max(-20, Math.min(maxSpeed, this.speed));

        // Very slow speeds become zero
        if (Math.abs(this.speed) < 0.5 && !forward && !backward) {
            this.speed = 0;
        }

        // Steering - speed dependent (less responsive at high speed)
        const speedFactor = 1 - (Math.abs(this.speed) / maxSpeed) * 0.5;
        const turnRate = cfg.TURN_SPEED * speedFactor;

        let steeringInput = (right - left);

        // Handle drifting
        this.isDrifting = brake && Math.abs(steeringInput) > 0 && this.speed > 30;

        if (this.isDrifting) {
            // Reduced grip during drift
            this.driftAngle += steeringInput * dt * 2;
            this.driftAngle *= cfg.DRIFT_FACTOR;
        } else {
            // Normal steering
            this.driftAngle *= 0.9; // Recover from drift
        }

        // Apply steering
        if (this.speed !== 0) {
            const steerDirection = this.speed > 0 ? 1 : -1;
            const totalSteer = (steeringInput * turnRate + this.driftAngle) * steerDirection;
            this.carGroup.rotation.y -= totalSteer * dt * (Math.abs(this.speed) / 50);
        }

        // Move car forward based on rotation
        const moveSpeed = this.speed * 0.0447; // Convert mph to m/s (roughly)
        const direction = new THREE.Vector3(0, 0, 1);
        direction.applyEuler(this.carGroup.rotation);

        this.carGroup.position.x += direction.x * moveSpeed * dt;
        this.carGroup.position.z += direction.z * moveSpeed * dt;

        // Keep car on road (clamp X position)
        const halfRoad = CONFIG.ROAD_WIDTH / 2 - 1.5;
        this.carGroup.position.x = Math.max(-halfRoad, Math.min(halfRoad, this.carGroup.position.x));

        // Update position reference
        this.position.copy(this.carGroup.position);
        this.rotation.copy(this.carGroup.rotation);

        // Update RPM and gear based on speed
        this.updateGearAndRPM();

        // Update visual elements
        this.updateWheels(dt, steeringInput);
        this.updateLights();
        this.updateNitroFlames();
    }

    updateNitro(dt, nitroPressed) {
        const cfg = CONFIG.PLAYER;

        if (nitroPressed && this.nitroAmount > 0 && this.speed > 10) {
            // Using nitro
            this.isNitroActive = true;
            this.nitroAmount -= dt / cfg.NITRO_DURATION;
            this.nitroAmount = Math.max(0, this.nitroAmount);
        } else {
            // Recharging nitro
            this.isNitroActive = false;
            if (this.nitroAmount < 1) {
                this.nitroAmount += dt / cfg.NITRO_RECHARGE;
                this.nitroAmount = Math.min(1, this.nitroAmount);
            }
        }
    }

    updateGearAndRPM() {
        // Gear thresholds (mph)
        const gearSpeeds = [0, 25, 50, 85, 130, 180, 250];

        // Determine gear based on speed
        for (let i = gearSpeeds.length - 1; i >= 0; i--) {
            if (this.speed >= gearSpeeds[i]) {
                this.gear = Math.min(6, i + 1);
                break;
            }
        }

        // Calculate RPM within current gear range
        const gearMin = gearSpeeds[this.gear - 1] || 0;
        const gearMax = gearSpeeds[this.gear] || CONFIG.PLAYER.MAX_SPEED;
        const gearProgress = (this.speed - gearMin) / (gearMax - gearMin);

        // RPM ranges from 1000 to 8000 within each gear
        this.rpm = 1000 + gearProgress * 7000;
        this.rpm = Math.max(800, Math.min(8500, this.rpm));
    }

    updateWheels(dt, steeringInput) {
        // Rotate all wheels based on speed
        const wheelRotationSpeed = this.speed * 0.1;
        this.wheelRotation += wheelRotationSpeed * dt;

        this.wheels.forEach((wheel, index) => {
            // Spin wheels
            wheel.children[0].rotation.x = this.wheelRotation;
            wheel.children[1].rotation.x = this.wheelRotation;

            // Front wheels turn with steering (indices 0 and 1)
            if (index < 2) {
                wheel.rotation.y = steeringInput * 0.4;
            }
        });
    }

    updateLights() {
        // Update taillight intensity based on braking
        const brakeIntensity = this.isBraking ? 2 : 0.5;
        this.taillights.forEach(light => {
            light.material.emissiveIntensity = brakeIntensity;
        });
    }

    updateNitroFlames() {
        this.nitroFlames.forEach(flame => {
            flame.visible = this.isNitroActive;
            if (this.isNitroActive) {
                // Animate flame size
                const scale = 0.8 + Math.random() * 0.4;
                flame.scale.set(scale, 1 + Math.random() * 0.5, scale);
            }
        });
    }

    reset() {
        const startPos = CONFIG.PLAYER.START_POSITION;
        this.carGroup.position.set(startPos.x, startPos.y, startPos.z);
        this.carGroup.rotation.set(0, 0, 0);

        this.position.copy(this.carGroup.position);
        this.rotation.set(0, 0, 0);
        this.velocity.set(0, 0, 0);

        this.speed = 0;
        this.rpm = 800;
        this.gear = 1;
        this.damage = 0;
        this.nitroAmount = 1;
        this.isDrifting = false;
        this.isNitroActive = false;
        this.isBraking = false;
        this.steeringAngle = 0;
        this.driftAngle = 0;
    }

    onCollision(collision) {
        // Calculate damage based on collision intensity
        const impactSpeed = collision.relativeVelocity || this.speed * 0.3;
        const damageAmount = impactSpeed * 0.2;
        this.addDamage(damageAmount);

        // Reduce speed on collision
        this.speed *= (1 - CONFIG.PHYSICS.COLLISION_BOUNCE);

        // Push car away from collision point
        if (collision.normal) {
            const pushForce = collision.normal.clone().multiplyScalar(2);
            this.carGroup.position.add(pushForce);
        }
    }

    addDamage(amount) {
        this.damage += amount;
        this.damage = Math.min(100, Math.max(0, this.damage));

        // Visual feedback - change car color slightly based on damage
        if (this.carGroup && this.damage > 50) {
            // Car looks more damaged at high damage levels
            // Could add smoke particles, deformed geometry, etc.
        }
    }

    getCollider() {
        // Return a bounding box for collision detection
        return {
            type: 'box',
            position: this.position.clone(),
            rotation: this.rotation.y,
            width: 2.2,
            height: 1.2,
            depth: 4.5,
            mesh: this.carGroup
        };
    }
}

// Helper to create MeshStandardMaterial (for cleaner code)
function MeshStandardMaterial(options) {
    return new THREE.MeshStandardMaterial(options);
}
