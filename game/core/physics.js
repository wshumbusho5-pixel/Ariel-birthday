// ============================================
// PHYSICS ENGINE - Collision Detection and Physics Helpers
// Provides AABB collision detection and utility functions
// ============================================

import { CONFIG } from '../config.js';

/**
 * PhysicsEngine - Handles collision detection and physics calculations
 * Uses AABB (Axis-Aligned Bounding Box) for efficient collision checks
 */
export class PhysicsEngine {
    constructor() {
        // Physics constants from config
        this.gravity = CONFIG.PHYSICS.GRAVITY;
        this.friction = CONFIG.PHYSICS.FRICTION;
        this.airResistance = CONFIG.PHYSICS.AIR_RESISTANCE;
        this.collisionBounce = CONFIG.PHYSICS.COLLISION_BOUNCE;

        // Near miss distance from scoring config
        this.nearMissDistance = CONFIG.SCORING.NEAR_MISS_DISTANCE;
    }

    /**
     * Initialize the physics engine
     * Called by main.js during game setup
     */
    init() {
        // Physics engine is ready after constructor
        // This method exists for consistency with other modules
        console.log('Physics engine initialized');
    }

    /**
     * Check for collisions between player and traffic vehicles
     * Uses AABB (Axis-Aligned Bounding Box) collision detection
     *
     * @param {Object} playerCollider - Player collider { position: {x,y,z}, size: {x,y,z} }
     * @param {Array} trafficColliders - Array of traffic colliders
     * @returns {Array} Array of collision results { point, intensity, otherCollider }
     */
    checkCollisions(playerCollider, trafficColliders) {
        const collisions = [];

        if (!playerCollider || !trafficColliders || trafficColliders.length === 0) {
            return collisions;
        }

        // Get player AABB bounds
        const playerMin = {
            x: playerCollider.position.x - playerCollider.size.x / 2,
            y: playerCollider.position.y - playerCollider.size.y / 2,
            z: playerCollider.position.z - playerCollider.size.z / 2
        };
        const playerMax = {
            x: playerCollider.position.x + playerCollider.size.x / 2,
            y: playerCollider.position.y + playerCollider.size.y / 2,
            z: playerCollider.position.z + playerCollider.size.z / 2
        };

        // Check each traffic collider
        for (const trafficCollider of trafficColliders) {
            if (!trafficCollider) continue;

            // Get traffic AABB bounds
            const trafficMin = {
                x: trafficCollider.position.x - trafficCollider.size.x / 2,
                y: trafficCollider.position.y - trafficCollider.size.y / 2,
                z: trafficCollider.position.z - trafficCollider.size.z / 2
            };
            const trafficMax = {
                x: trafficCollider.position.x + trafficCollider.size.x / 2,
                y: trafficCollider.position.y + trafficCollider.size.y / 2,
                z: trafficCollider.position.z + trafficCollider.size.z / 2
            };

            // AABB intersection test
            if (this._aabbIntersect(playerMin, playerMax, trafficMin, trafficMax)) {
                // Calculate collision point (center of overlap)
                const overlapCenter = {
                    x: (Math.max(playerMin.x, trafficMin.x) + Math.min(playerMax.x, trafficMax.x)) / 2,
                    y: (Math.max(playerMin.y, trafficMin.y) + Math.min(playerMax.y, trafficMax.y)) / 2,
                    z: (Math.max(playerMin.z, trafficMin.z) + Math.min(playerMax.z, trafficMax.z)) / 2
                };

                // Calculate collision intensity based on overlap depth
                const overlapX = Math.min(playerMax.x, trafficMax.x) - Math.max(playerMin.x, trafficMin.x);
                const overlapY = Math.min(playerMax.y, trafficMax.y) - Math.max(playerMin.y, trafficMin.y);
                const overlapZ = Math.min(playerMax.z, trafficMax.z) - Math.max(playerMin.z, trafficMin.z);

                // Intensity is normalized based on the minimum overlap dimension
                const minOverlap = Math.min(overlapX, overlapY, overlapZ);
                const maxSize = Math.max(
                    playerCollider.size.x,
                    playerCollider.size.y,
                    playerCollider.size.z
                );
                const intensity = clamp(minOverlap / maxSize, 0, 1);

                collisions.push({
                    point: overlapCenter,
                    intensity: intensity,
                    otherCollider: trafficCollider
                });
            }
        }

        return collisions;
    }

    /**
     * Check for near misses (close passes without collision)
     * Used for scoring bonus points
     *
     * @param {Object} playerCollider - Player collider { position: {x,y,z}, size: {x,y,z} }
     * @param {Array} trafficColliders - Array of traffic colliders
     * @param {number} distance - Maximum distance for a near miss (optional, uses config default)
     * @returns {number} Count of near misses
     */
    checkNearMisses(playerCollider, trafficColliders, distance = null) {
        let nearMissCount = 0;
        const threshold = distance !== null ? distance : this.nearMissDistance;

        if (!playerCollider || !trafficColliders || trafficColliders.length === 0) {
            return nearMissCount;
        }

        for (const trafficCollider of trafficColliders) {
            if (!trafficCollider) continue;

            // Calculate distance between centers
            const dist = distance3D(
                playerCollider.position,
                trafficCollider.position
            );

            // Calculate minimum safe distance (sum of half-sizes plus threshold)
            const minSafeDist = (
                (playerCollider.size.x + trafficCollider.size.x) / 2 +
                (playerCollider.size.z + trafficCollider.size.z) / 2
            ) / 2; // Average of X and Z for approximate radius

            // Check if within near miss range but not colliding
            const nearMissRange = minSafeDist + threshold;

            // If close but not overlapping, it's a near miss
            if (dist < nearMissRange && dist > minSafeDist * 0.9) {
                nearMissCount++;
            }
        }

        return nearMissCount;
    }

    /**
     * AABB intersection test
     * @private
     * @param {Object} aMin - Minimum bounds of box A {x, y, z}
     * @param {Object} aMax - Maximum bounds of box A {x, y, z}
     * @param {Object} bMin - Minimum bounds of box B {x, y, z}
     * @param {Object} bMax - Maximum bounds of box B {x, y, z}
     * @returns {boolean} True if boxes intersect
     */
    _aabbIntersect(aMin, aMax, bMin, bMax) {
        return (
            aMin.x <= bMax.x && aMax.x >= bMin.x &&
            aMin.y <= bMax.y && aMax.y >= bMin.y &&
            aMin.z <= bMax.z && aMax.z >= bMin.z
        );
    }

    /**
     * Calculate separation vector to resolve collision
     * @param {Object} playerCollider - Player collider
     * @param {Object} otherCollider - Other collider
     * @returns {Object} Separation vector {x, y, z}
     */
    getSeparationVector(playerCollider, otherCollider) {
        const dx = playerCollider.position.x - otherCollider.position.x;
        const dy = playerCollider.position.y - otherCollider.position.y;
        const dz = playerCollider.position.z - otherCollider.position.z;

        // Calculate overlap on each axis
        const overlapX = (playerCollider.size.x + otherCollider.size.x) / 2 - Math.abs(dx);
        const overlapY = (playerCollider.size.y + otherCollider.size.y) / 2 - Math.abs(dy);
        const overlapZ = (playerCollider.size.z + otherCollider.size.z) / 2 - Math.abs(dz);

        // Find minimum overlap axis (most efficient separation)
        if (overlapX < overlapY && overlapX < overlapZ) {
            return { x: Math.sign(dx) * overlapX, y: 0, z: 0 };
        } else if (overlapY < overlapZ) {
            return { x: 0, y: Math.sign(dy) * overlapY, z: 0 };
        } else {
            return { x: 0, y: 0, z: Math.sign(dz) * overlapZ };
        }
    }

    /**
     * Apply bounce response to velocity
     * @param {Object} velocity - Current velocity {x, y, z}
     * @param {Object} separation - Separation vector from collision
     * @returns {Object} New velocity after bounce
     */
    applyBounce(velocity, separation) {
        const newVelocity = { ...velocity };

        // Reflect velocity on collision axis
        if (separation.x !== 0) {
            newVelocity.x = -velocity.x * this.collisionBounce;
        }
        if (separation.y !== 0) {
            newVelocity.y = -velocity.y * this.collisionBounce;
        }
        if (separation.z !== 0) {
            newVelocity.z = -velocity.z * this.collisionBounce;
        }

        return newVelocity;
    }
}

// ============================================
// HELPER FUNCTIONS (exported for use elsewhere)
// ============================================

/**
 * Linear interpolation between two values
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Calculate 3D distance between two points
 * @param {Object} a - First point {x, y, z}
 * @param {Object} b - Second point {x, y, z}
 * @returns {number} Distance between points
 */
export function distance3D(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate 2D distance (ignoring Y axis)
 * Useful for ground-plane distance checks
 * @param {Object} a - First point {x, z}
 * @param {Object} b - Second point {x, z}
 * @returns {number} Distance on XZ plane
 */
export function distance2D(a, b) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Normalize a vector to unit length
 * @param {Object} v - Vector {x, y, z}
 * @returns {Object} Normalized vector
 */
export function normalize(v) {
    const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (length === 0) return { x: 0, y: 0, z: 0 };
    return {
        x: v.x / length,
        y: v.y / length,
        z: v.z / length
    };
}

/**
 * Dot product of two vectors
 * @param {Object} a - First vector {x, y, z}
 * @param {Object} b - Second vector {x, y, z}
 * @returns {number} Dot product
 */
export function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Map a value from one range to another
 * @param {number} value - Value to map
 * @param {number} inMin - Input range minimum
 * @param {number} inMax - Input range maximum
 * @param {number} outMin - Output range minimum
 * @param {number} outMax - Output range maximum
 * @returns {number} Mapped value
 */
export function mapRange(value, inMin, inMax, outMin, outMax) {
    return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
}

/**
 * Smooth step interpolation (eased)
 * @param {number} t - Value between 0 and 1
 * @returns {number} Smoothed value
 */
export function smoothstep(t) {
    return t * t * (3 - 2 * t);
}
