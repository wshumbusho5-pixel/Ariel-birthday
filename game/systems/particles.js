// ============================================
// PARTICLE SYSTEM - Tire smoke, sparks, nitro, speed lines
// High-performance particle effects using BufferGeometry
// ============================================

import * as THREE from 'three';
import { CONFIG } from '../config.js';

// Individual particle data structure
class Particle {
    constructor() {
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.life = 0;
        this.maxLife = 1;
        this.size = 1;
        this.color = new THREE.Color(1, 1, 1);
        this.alpha = 1;
        this.active = false;
    }

    reset() {
        this.position.set(0, 0, 0);
        this.velocity.set(0, 0, 0);
        this.life = 0;
        this.maxLife = 1;
        this.size = 1;
        this.color.setRGB(1, 1, 1);
        this.alpha = 1;
        this.active = false;
    }
}

// Particle pool for efficient memory management
class ParticlePool {
    constructor(size) {
        this.particles = [];
        this.size = size;

        for (let i = 0; i < size; i++) {
            this.particles.push(new Particle());
        }
    }

    getParticle() {
        for (const particle of this.particles) {
            if (!particle.active) {
                particle.active = true;
                return particle;
            }
        }
        return null; // Pool exhausted
    }

    getActiveParticles() {
        return this.particles.filter(p => p.active);
    }

    getActiveCount() {
        return this.particles.filter(p => p.active).length;
    }
}

export class ParticleSystem {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.scene = sceneManager.scene;

        // Particle pools for different effect types
        this.smokePools = null;
        this.sparkPool = null;
        this.nitroPool = null;
        this.speedLinePool = null;

        // Three.js particle systems
        this.smokeSystem = null;
        this.sparkSystem = null;
        this.nitroSystem = null;
        this.speedLineSystem = null;

        // Timing
        this.smokeSpawnTimer = 0;
        this.nitroSpawnTimer = 0;

        // Constants
        this.SMOKE_POOL_SIZE = 200;
        this.SPARK_POOL_SIZE = 100;
        this.NITRO_POOL_SIZE = 150;
        this.SPEED_LINE_POOL_SIZE = 50;
    }

    init() {
        this.createSmokeSystem();
        this.createSparkSystem();
        this.createNitroSystem();
        this.createSpeedLineSystem();

        console.log('Particle system initialized');
    }

    // ============================================
    // TIRE SMOKE
    // ============================================
    createSmokeSystem() {
        this.smokePools = new ParticlePool(this.SMOKE_POOL_SIZE);

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.SMOKE_POOL_SIZE * 3);
        const colors = new Float32Array(this.SMOKE_POOL_SIZE * 3);
        const sizes = new Float32Array(this.SMOKE_POOL_SIZE);
        const alphas = new Float32Array(this.SMOKE_POOL_SIZE);

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                pointTexture: { value: this.createSmokeTexture() }
            },
            vertexShader: `
                attribute float size;
                attribute float alpha;
                attribute vec3 color;
                varying float vAlpha;
                varying vec3 vColor;

                void main() {
                    vAlpha = alpha;
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D pointTexture;
                varying float vAlpha;
                varying vec3 vColor;

                void main() {
                    vec4 texColor = texture2D(pointTexture, gl_PointCoord);
                    gl_FragColor = vec4(vColor, texColor.a * vAlpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.smokeSystem = new THREE.Points(geometry, material);
        this.scene.add(this.smokeSystem);
    }

    createSmokeTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.6, 'rgba(200, 200, 200, 0.4)');
        gradient.addColorStop(1, 'rgba(150, 150, 150, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    spawnSmoke(position, velocity, intensity = 1) {
        const particle = this.smokePools.getParticle();
        if (!particle) return;

        particle.position.copy(position);
        particle.position.x += (Math.random() - 0.5) * 0.5;
        particle.position.z += (Math.random() - 0.5) * 0.5;

        particle.velocity.set(
            (Math.random() - 0.5) * 2 + velocity.x * 0.1,
            1 + Math.random() * 2,
            (Math.random() - 0.5) * 2 + velocity.z * 0.1
        );

        particle.life = 0;
        particle.maxLife = 1.5 + Math.random() * 0.5;
        particle.size = (15 + Math.random() * 10) * intensity;

        // Gray-white smoke color
        const shade = 0.7 + Math.random() * 0.3;
        particle.color.setRGB(shade, shade, shade);
        particle.alpha = 0.6 * intensity;
    }

    // ============================================
    // SPARKS (for collisions)
    // ============================================
    createSparkSystem() {
        this.sparkPool = new ParticlePool(this.SPARK_POOL_SIZE);

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.SPARK_POOL_SIZE * 3);
        const colors = new Float32Array(this.SPARK_POOL_SIZE * 3);
        const sizes = new Float32Array(this.SPARK_POOL_SIZE);
        const alphas = new Float32Array(this.SPARK_POOL_SIZE);

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                pointTexture: { value: this.createSparkTexture() }
            },
            vertexShader: `
                attribute float size;
                attribute float alpha;
                attribute vec3 color;
                varying float vAlpha;
                varying vec3 vColor;

                void main() {
                    vAlpha = alpha;
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (200.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D pointTexture;
                varying float vAlpha;
                varying vec3 vColor;

                void main() {
                    vec4 texColor = texture2D(pointTexture, gl_PointCoord);
                    gl_FragColor = vec4(vColor * 2.0, texColor.a * vAlpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.sparkSystem = new THREE.Points(geometry, material);
        this.scene.add(this.sparkSystem);
    }

    createSparkTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 200, 100, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 150, 50, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);

        return new THREE.CanvasTexture(canvas);
    }

    spawnSparks(position, count = 30) {
        for (let i = 0; i < count; i++) {
            const particle = this.sparkPool.getParticle();
            if (!particle) break;

            particle.position.copy(position);
            particle.position.x += (Math.random() - 0.5) * 1;
            particle.position.y += Math.random() * 0.5;
            particle.position.z += (Math.random() - 0.5) * 1;

            // Spray outward from impact point
            const angle = Math.random() * Math.PI * 2;
            const speed = 5 + Math.random() * 15;
            particle.velocity.set(
                Math.cos(angle) * speed,
                2 + Math.random() * 8,
                Math.sin(angle) * speed
            );

            particle.life = 0;
            particle.maxLife = 0.5 + Math.random() * 0.5;
            particle.size = 3 + Math.random() * 4;

            // Orange/yellow spark colors
            const hue = Math.random() * 0.15; // 0 to 0.15 = red to yellow
            particle.color.setHSL(hue, 1, 0.5 + Math.random() * 0.3);
            particle.alpha = 1;
        }
    }

    // ============================================
    // NITRO FLAMES
    // ============================================
    createNitroSystem() {
        this.nitroPool = new ParticlePool(this.NITRO_POOL_SIZE);

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.NITRO_POOL_SIZE * 3);
        const colors = new Float32Array(this.NITRO_POOL_SIZE * 3);
        const sizes = new Float32Array(this.NITRO_POOL_SIZE);
        const alphas = new Float32Array(this.NITRO_POOL_SIZE);

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                pointTexture: { value: this.createNitroTexture() }
            },
            vertexShader: `
                attribute float size;
                attribute float alpha;
                attribute vec3 color;
                varying float vAlpha;
                varying vec3 vColor;

                void main() {
                    vAlpha = alpha;
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (250.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D pointTexture;
                varying float vAlpha;
                varying vec3 vColor;

                void main() {
                    vec4 texColor = texture2D(pointTexture, gl_PointCoord);
                    gl_FragColor = vec4(vColor * 1.5, texColor.a * vAlpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.nitroSystem = new THREE.Points(geometry, material);
        this.scene.add(this.nitroSystem);
    }

    createNitroTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(100, 200, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(50, 150, 255, 0.9)');
        gradient.addColorStop(0.6, 'rgba(0, 100, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 50, 200, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        return new THREE.CanvasTexture(canvas);
    }

    spawnNitro(position, direction) {
        const particle = this.nitroPool.getParticle();
        if (!particle) return;

        // Spawn at exhaust position (slightly behind and to sides)
        const exhaustOffset = Math.random() > 0.5 ? 0.4 : -0.4;
        particle.position.set(
            position.x + exhaustOffset,
            position.y + 0.3,
            position.z - 2 // Behind the car
        );

        // Add some randomness
        particle.position.x += (Math.random() - 0.5) * 0.3;
        particle.position.y += (Math.random() - 0.5) * 0.2;

        // Shoot backward
        particle.velocity.set(
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 2,
            -15 - Math.random() * 10
        );

        particle.life = 0;
        particle.maxLife = 0.3 + Math.random() * 0.2;
        particle.size = 8 + Math.random() * 6;

        // Blue flame colors
        const blueShade = 0.5 + Math.random() * 0.5;
        particle.color.setRGB(0.3 * blueShade, 0.6 * blueShade, 1);
        particle.alpha = 0.9;
    }

    // ============================================
    // SPEED LINES
    // ============================================
    createSpeedLineSystem() {
        this.speedLinePool = new ParticlePool(this.SPEED_LINE_POOL_SIZE);

        // Speed lines use line geometry for streaking effect
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.SPEED_LINE_POOL_SIZE * 6); // 2 points per line
        const colors = new Float32Array(this.SPEED_LINE_POOL_SIZE * 6);

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        this.speedLineSystem = new THREE.LineSegments(geometry, material);
        this.scene.add(this.speedLineSystem);
    }

    spawnSpeedLine(playerPosition) {
        const particle = this.speedLinePool.getParticle();
        if (!particle) return;

        // Spawn around the player's view
        const angle = Math.random() * Math.PI * 2;
        const radius = 3 + Math.random() * 8;

        particle.position.set(
            playerPosition.x + Math.cos(angle) * radius,
            playerPosition.y + 1 + Math.random() * 4,
            playerPosition.z + 20 + Math.random() * 30
        );

        particle.velocity.set(0, 0, -200 - Math.random() * 100);

        particle.life = 0;
        particle.maxLife = 0.2 + Math.random() * 0.1;
        particle.size = 2 + Math.random() * 3; // Line length

        // White speed lines
        particle.color.setRGB(1, 1, 1);
        particle.alpha = 0.6 + Math.random() * 0.4;
    }

    // ============================================
    // UPDATE LOOP
    // ============================================
    update(dt, state) {
        const { playerPosition, playerSpeed, isDrifting, isNitro } = state;

        // Spawn particles based on state
        this.updateSmokeSpawning(dt, playerPosition, playerSpeed, isDrifting);
        this.updateNitroSpawning(dt, playerPosition, isNitro);
        this.updateSpeedLineSpawning(dt, playerPosition, playerSpeed);

        // Update all particle systems
        this.updateSmokeParticles(dt);
        this.updateSparkParticles(dt);
        this.updateNitroParticles(dt);
        this.updateSpeedLineParticles(dt, playerPosition);
    }

    updateSmokeSpawning(dt, playerPosition, playerSpeed, isDrifting) {
        if (!isDrifting) return;

        this.smokeSpawnTimer += dt;
        const spawnRate = 0.02; // Every 20ms when drifting

        while (this.smokeSpawnTimer >= spawnRate) {
            this.smokeSpawnTimer -= spawnRate;

            // Spawn from both rear wheels
            const intensity = Math.min(playerSpeed / 100, 1.5);
            const velocity = new THREE.Vector3(0, 0, -playerSpeed * 0.1);

            // Left rear wheel
            this.spawnSmoke(
                new THREE.Vector3(playerPosition.x - 0.8, 0.1, playerPosition.z - 1.5),
                velocity,
                intensity
            );

            // Right rear wheel
            this.spawnSmoke(
                new THREE.Vector3(playerPosition.x + 0.8, 0.1, playerPosition.z - 1.5),
                velocity,
                intensity
            );
        }
    }

    updateNitroSpawning(dt, playerPosition, isNitro) {
        if (!isNitro) return;

        this.nitroSpawnTimer += dt;
        const spawnRate = 0.015; // High frequency for flames

        while (this.nitroSpawnTimer >= spawnRate) {
            this.nitroSpawnTimer -= spawnRate;

            // Spawn nitro flames
            this.spawnNitro(playerPosition, new THREE.Vector3(0, 0, -1));
            this.spawnNitro(playerPosition, new THREE.Vector3(0, 0, -1));
        }
    }

    updateSpeedLineSpawning(dt, playerPosition, playerSpeed) {
        if (playerSpeed < CONFIG.EFFECTS.SPEED_LINES_THRESHOLD) return;

        // Spawn rate increases with speed
        const speedFactor = (playerSpeed - CONFIG.EFFECTS.SPEED_LINES_THRESHOLD) /
            (CONFIG.PLAYER.MAX_SPEED - CONFIG.EFFECTS.SPEED_LINES_THRESHOLD);
        const spawnChance = speedFactor * 0.5;

        if (Math.random() < spawnChance) {
            this.spawnSpeedLine(playerPosition);
        }
    }

    updateSmokeParticles(dt) {
        const positions = this.smokeSystem.geometry.attributes.position.array;
        const colors = this.smokeSystem.geometry.attributes.color.array;
        const sizes = this.smokeSystem.geometry.attributes.size.array;
        const alphas = this.smokeSystem.geometry.attributes.alpha.array;

        const particles = this.smokePools.particles;
        const gravity = CONFIG.PHYSICS.GRAVITY * 0.1;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            if (p.active) {
                p.life += dt;

                if (p.life >= p.maxLife) {
                    p.reset();
                } else {
                    // Update position
                    p.position.x += p.velocity.x * dt;
                    p.position.y += p.velocity.y * dt;
                    p.position.z += p.velocity.z * dt;

                    // Slow down and rise
                    p.velocity.x *= 0.98;
                    p.velocity.y += 0.5 * dt; // Rise up
                    p.velocity.z *= 0.98;

                    // Fade out and grow
                    const lifeRatio = p.life / p.maxLife;
                    p.alpha = p.alpha * (1 - lifeRatio * 0.7);
                    p.size *= 1 + dt * 0.5; // Expand
                }
            }

            // Update buffer
            positions[i * 3] = p.active ? p.position.x : 99999;
            positions[i * 3 + 1] = p.active ? p.position.y : 99999;
            positions[i * 3 + 2] = p.active ? p.position.z : 99999;
            colors[i * 3] = p.color.r;
            colors[i * 3 + 1] = p.color.g;
            colors[i * 3 + 2] = p.color.b;
            sizes[i] = p.active ? p.size : 0;
            alphas[i] = p.active ? p.alpha : 0;
        }

        this.smokeSystem.geometry.attributes.position.needsUpdate = true;
        this.smokeSystem.geometry.attributes.color.needsUpdate = true;
        this.smokeSystem.geometry.attributes.size.needsUpdate = true;
        this.smokeSystem.geometry.attributes.alpha.needsUpdate = true;
    }

    updateSparkParticles(dt) {
        const positions = this.sparkSystem.geometry.attributes.position.array;
        const colors = this.sparkSystem.geometry.attributes.color.array;
        const sizes = this.sparkSystem.geometry.attributes.size.array;
        const alphas = this.sparkSystem.geometry.attributes.alpha.array;

        const particles = this.sparkPool.particles;
        const gravity = CONFIG.PHYSICS.GRAVITY;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            if (p.active) {
                p.life += dt;

                if (p.life >= p.maxLife) {
                    p.reset();
                } else {
                    // Update position with physics
                    p.position.x += p.velocity.x * dt;
                    p.position.y += p.velocity.y * dt;
                    p.position.z += p.velocity.z * dt;

                    // Apply gravity
                    p.velocity.y += gravity * dt;

                    // Air resistance
                    p.velocity.x *= 0.99;
                    p.velocity.z *= 0.99;

                    // Bounce off ground
                    if (p.position.y < 0.1) {
                        p.position.y = 0.1;
                        p.velocity.y *= -0.3;
                        p.velocity.x *= 0.8;
                        p.velocity.z *= 0.8;
                    }

                    // Fade out
                    const lifeRatio = p.life / p.maxLife;
                    p.alpha = 1 - lifeRatio;
                }
            }

            // Update buffer
            positions[i * 3] = p.active ? p.position.x : 99999;
            positions[i * 3 + 1] = p.active ? p.position.y : 99999;
            positions[i * 3 + 2] = p.active ? p.position.z : 99999;
            colors[i * 3] = p.color.r;
            colors[i * 3 + 1] = p.color.g;
            colors[i * 3 + 2] = p.color.b;
            sizes[i] = p.active ? p.size : 0;
            alphas[i] = p.active ? p.alpha : 0;
        }

        this.sparkSystem.geometry.attributes.position.needsUpdate = true;
        this.sparkSystem.geometry.attributes.color.needsUpdate = true;
        this.sparkSystem.geometry.attributes.size.needsUpdate = true;
        this.sparkSystem.geometry.attributes.alpha.needsUpdate = true;
    }

    updateNitroParticles(dt) {
        const positions = this.nitroSystem.geometry.attributes.position.array;
        const colors = this.nitroSystem.geometry.attributes.color.array;
        const sizes = this.nitroSystem.geometry.attributes.size.array;
        const alphas = this.nitroSystem.geometry.attributes.alpha.array;

        const particles = this.nitroPool.particles;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            if (p.active) {
                p.life += dt;

                if (p.life >= p.maxLife) {
                    p.reset();
                } else {
                    // Update position
                    p.position.x += p.velocity.x * dt;
                    p.position.y += p.velocity.y * dt;
                    p.position.z += p.velocity.z * dt;

                    // Expand and fade
                    const lifeRatio = p.life / p.maxLife;
                    p.alpha = 0.9 * (1 - lifeRatio);
                    p.size *= 1 + dt * 2;

                    // Color shift from blue to white
                    p.color.r = 0.3 + lifeRatio * 0.7;
                    p.color.g = 0.6 + lifeRatio * 0.4;
                }
            }

            // Update buffer
            positions[i * 3] = p.active ? p.position.x : 99999;
            positions[i * 3 + 1] = p.active ? p.position.y : 99999;
            positions[i * 3 + 2] = p.active ? p.position.z : 99999;
            colors[i * 3] = p.color.r;
            colors[i * 3 + 1] = p.color.g;
            colors[i * 3 + 2] = p.color.b;
            sizes[i] = p.active ? p.size : 0;
            alphas[i] = p.active ? p.alpha : 0;
        }

        this.nitroSystem.geometry.attributes.position.needsUpdate = true;
        this.nitroSystem.geometry.attributes.color.needsUpdate = true;
        this.nitroSystem.geometry.attributes.size.needsUpdate = true;
        this.nitroSystem.geometry.attributes.alpha.needsUpdate = true;
    }

    updateSpeedLineParticles(dt, playerPosition) {
        const positions = this.speedLineSystem.geometry.attributes.position.array;
        const colors = this.speedLineSystem.geometry.attributes.color.array;

        const particles = this.speedLinePool.particles;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            if (p.active) {
                p.life += dt;

                if (p.life >= p.maxLife) {
                    p.reset();
                } else {
                    // Update position - move toward player
                    p.position.x += p.velocity.x * dt;
                    p.position.y += p.velocity.y * dt;
                    p.position.z += p.velocity.z * dt;

                    // Fade based on life
                    const lifeRatio = p.life / p.maxLife;
                    p.alpha = 1 - lifeRatio;
                }
            }

            // Update line segment (start and end points)
            const idx = i * 6;
            if (p.active) {
                // Start point
                positions[idx] = p.position.x;
                positions[idx + 1] = p.position.y;
                positions[idx + 2] = p.position.z;

                // End point (behind start, creating a streak)
                const streakLength = p.size * 2;
                positions[idx + 3] = p.position.x;
                positions[idx + 4] = p.position.y;
                positions[idx + 5] = p.position.z + streakLength;

                // Colors (fade from bright to dim along the line)
                colors[idx] = p.alpha;
                colors[idx + 1] = p.alpha;
                colors[idx + 2] = p.alpha;
                colors[idx + 3] = p.alpha * 0.3;
                colors[idx + 4] = p.alpha * 0.3;
                colors[idx + 5] = p.alpha * 0.3;
            } else {
                // Hide inactive particles
                positions[idx] = 99999;
                positions[idx + 1] = 99999;
                positions[idx + 2] = 99999;
                positions[idx + 3] = 99999;
                positions[idx + 4] = 99999;
                positions[idx + 5] = 99999;
            }
        }

        this.speedLineSystem.geometry.attributes.position.needsUpdate = true;
        this.speedLineSystem.geometry.attributes.color.needsUpdate = true;
    }

    // ============================================
    // CLEANUP
    // ============================================
    dispose() {
        // Dispose smoke system
        if (this.smokeSystem) {
            this.smokeSystem.geometry.dispose();
            this.smokeSystem.material.dispose();
            this.scene.remove(this.smokeSystem);
        }

        // Dispose spark system
        if (this.sparkSystem) {
            this.sparkSystem.geometry.dispose();
            this.sparkSystem.material.dispose();
            this.scene.remove(this.sparkSystem);
        }

        // Dispose nitro system
        if (this.nitroSystem) {
            this.nitroSystem.geometry.dispose();
            this.nitroSystem.material.dispose();
            this.scene.remove(this.nitroSystem);
        }

        // Dispose speed line system
        if (this.speedLineSystem) {
            this.speedLineSystem.geometry.dispose();
            this.speedLineSystem.material.dispose();
            this.scene.remove(this.speedLineSystem);
        }

        console.log('Particle system disposed');
    }
}
