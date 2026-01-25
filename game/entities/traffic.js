// ============================================
// TRAFFIC MANAGER - AI Traffic Cars
// ============================================

import * as THREE from 'three';
import { CONFIG } from '../config.js';

class TrafficCar {
    constructor(lane, zPosition, color) {
        this.lane = lane;
        this.speed = this.randomSpeed();
        this.targetLane = lane;
        this.laneChangeProgress = 0;
        this.isBraking = false;

        // Create mesh
        this.mesh = this.createMesh(color);
        this.mesh.position.set(this.getLaneX(lane), 0.5, zPosition);

        // Collision box dimensions
        this.width = 2;
        this.height = 1.2;
        this.depth = 4;
    }

    createMesh(color) {
        const group = new THREE.Group();

        // Main body
        const bodyGeometry = new THREE.BoxGeometry(2, 0.7, 4);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.7,
            roughness: 0.3
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.35;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Cabin
        const cabinGeometry = new THREE.BoxGeometry(1.6, 0.5, 1.8);
        const cabinMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            metalness: 0.5,
            roughness: 0.2,
            transparent: true,
            opacity: 0.7
        });
        const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
        cabin.position.set(0, 0.9, -0.2);
        cabin.castShadow = true;
        group.add(cabin);

        // Wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12);
        const wheelMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            metalness: 0.3,
            roughness: 0.7
        });

        const wheelPositions = [
            [-0.9, 0.3, 1.2],
            [0.9, 0.3, 1.2],
            [-0.9, 0.3, -1.2],
            [0.9, 0.3, -1.2]
        ];

        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(pos[0], pos[1], pos[2]);
            wheel.castShadow = true;
            group.add(wheel);
        });

        // Headlights
        const headlightGeometry = new THREE.SphereGeometry(0.1, 6, 6);
        const headlightMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffee,
            emissive: 0xffffaa,
            emissiveIntensity: 0.5
        });

        [[-0.6, 0.35, 2], [0.6, 0.35, 2]].forEach(pos => {
            const headlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
            headlight.position.set(pos[0], pos[1], pos[2]);
            group.add(headlight);
        });

        // Taillights
        const taillightGeometry = new THREE.BoxGeometry(0.25, 0.12, 0.05);
        this.taillightMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.3
        });

        [[-0.7, 0.4, -2], [0.7, 0.4, -2]].forEach(pos => {
            const taillight = new THREE.Mesh(taillightGeometry, this.taillightMaterial);
            taillight.position.set(pos[0], pos[1], pos[2]);
            group.add(taillight);
        });

        return group;
    }

    randomSpeed() {
        const minSpeed = CONFIG.TRAFFIC.MIN_SPEED;
        const maxSpeed = CONFIG.TRAFFIC.MAX_SPEED;
        return minSpeed + Math.random() * (maxSpeed - minSpeed);
    }

    getLaneX(lane) {
        // Calculate X position for a given lane (0-3)
        const laneWidth = CONFIG.LANE_WIDTH;
        const totalWidth = CONFIG.ROAD_WIDTH;
        const startX = -totalWidth / 2 + laneWidth / 2;
        return startX + lane * laneWidth;
    }

    update(dt, playerPosition, playerSpeed) {
        // Move forward
        const moveSpeed = this.speed * 0.0447; // Convert mph to m/s
        this.mesh.position.z += moveSpeed * dt;

        // Check if player is close behind - activate brake lights
        const distanceToPlayer = this.mesh.position.z - playerPosition.z;
        const inSameLane = Math.abs(this.mesh.position.x - playerPosition.x) < CONFIG.LANE_WIDTH * 0.8;

        this.isBraking = inSameLane && distanceToPlayer > 0 && distanceToPlayer < 30 && playerSpeed > this.speed;

        // Update brake light intensity
        this.taillightMaterial.emissiveIntensity = this.isBraking ? 1.5 : 0.3;

        // Handle lane changes
        if (this.targetLane !== this.lane) {
            this.laneChangeProgress += dt * 2; // Lane change takes 0.5 seconds

            if (this.laneChangeProgress >= 1) {
                this.lane = this.targetLane;
                this.laneChangeProgress = 0;
            }

            // Smooth lane change interpolation
            const currentX = this.getLaneX(this.lane);
            const targetX = this.getLaneX(this.targetLane);
            const t = this.smoothstep(this.laneChangeProgress);
            this.mesh.position.x = currentX + (targetX - currentX) * t;
        } else {
            // Random lane change chance
            if (Math.random() < CONFIG.TRAFFIC.LANE_CHANGE_CHANCE) {
                this.tryLaneChange();
            }
        }
    }

    tryLaneChange() {
        // Randomly decide to change lane left or right
        const direction = Math.random() > 0.5 ? 1 : -1;
        const newLane = this.lane + direction;

        // Check if new lane is valid
        if (newLane >= 0 && newLane < CONFIG.LANE_COUNT) {
            this.targetLane = newLane;
            this.laneChangeProgress = 0;
        }
    }

    smoothstep(t) {
        // Smooth interpolation function
        return t * t * (3 - 2 * t);
    }

    getCollider() {
        return {
            type: 'box',
            position: this.mesh.position.clone(),
            rotation: 0,
            width: this.width,
            height: this.height,
            depth: this.depth,
            mesh: this.mesh
        };
    }
}

export class TrafficManager {
    constructor(sceneManager, physicsEngine) {
        this.sceneManager = sceneManager;
        this.physicsEngine = physicsEngine;
        this.cars = [];
        this.colorIndex = 0;
    }

    init() {
        // Initial spawn of traffic cars
        this.spawnInitialCars();
        return this;
    }

    spawnInitialCars() {
        const count = CONFIG.TRAFFIC.COUNT;
        const spawnDistance = CONFIG.TRAFFIC.SPAWN_DISTANCE;

        for (let i = 0; i < count; i++) {
            // Spread cars across all lanes and distances
            const lane = i % CONFIG.LANE_COUNT;
            const zOffset = (i / count) * spawnDistance + 50; // Start 50 units ahead

            this.spawnCar(lane, zOffset);
        }
    }

    spawnCar(lane, zPosition) {
        // Get next color from the rotation
        const colors = CONFIG.TRAFFIC.COLORS;
        const color = colors[this.colorIndex % colors.length];
        this.colorIndex++;

        // Create new traffic car
        const car = new TrafficCar(lane, zPosition, color);

        // Add to scene
        this.sceneManager.scene.add(car.mesh);

        // Add to cars array
        this.cars.push(car);

        return car;
    }

    update(dt, playerPosition, playerSpeed) {
        const spawnDistance = CONFIG.TRAFFIC.SPAWN_DISTANCE;
        const despawnDistance = CONFIG.TRAFFIC.DESPAWN_DISTANCE;

        // Update each car and check for despawn
        const carsToRemove = [];

        this.cars.forEach(car => {
            // Update car AI
            car.update(dt, playerPosition, playerSpeed);

            // Check if car should be despawned (too far behind player)
            const distanceBehind = playerPosition.z - car.mesh.position.z;
            if (distanceBehind > despawnDistance) {
                carsToRemove.push(car);
            }
        });

        // Remove despawned cars
        carsToRemove.forEach(car => {
            this.removeCar(car);
        });

        // Spawn new cars to maintain count
        while (this.cars.length < CONFIG.TRAFFIC.COUNT) {
            this.spawnCarAhead(playerPosition, spawnDistance);
        }
    }

    spawnCarAhead(playerPosition, distance) {
        // Random lane
        const lane = Math.floor(Math.random() * CONFIG.LANE_COUNT);

        // Position ahead of player with some randomness
        const zPosition = playerPosition.z + distance + Math.random() * 100;

        // Check for overlap with existing cars
        const minSpacing = 15; // Minimum distance between cars
        const tooClose = this.cars.some(car => {
            const sameLane = car.lane === lane;
            const zDiff = Math.abs(car.mesh.position.z - zPosition);
            return sameLane && zDiff < minSpacing;
        });

        if (!tooClose) {
            this.spawnCar(lane, zPosition);
        } else {
            // Try a different lane
            const altLane = (lane + 1) % CONFIG.LANE_COUNT;
            this.spawnCar(altLane, zPosition);
        }
    }

    removeCar(car) {
        // Remove from scene
        this.sceneManager.scene.remove(car.mesh);

        // Dispose of geometry and materials
        car.mesh.traverse(child => {
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });

        // Remove from array
        const index = this.cars.indexOf(car);
        if (index > -1) {
            this.cars.splice(index, 1);
        }
    }

    reset() {
        // Remove all cars
        while (this.cars.length > 0) {
            this.removeCar(this.cars[0]);
        }

        // Reset color index
        this.colorIndex = 0;

        // Respawn initial cars
        this.spawnInitialCars();
    }

    getColliders() {
        // Return array of colliders for all traffic cars
        return this.cars.map(car => car.getCollider());
    }
}
