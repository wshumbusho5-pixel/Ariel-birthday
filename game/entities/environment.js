// ============================================
// ENVIRONMENT - City, Road, Skybox
// Infinite scrolling city environment for racing
// ============================================

import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class Environment {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.scene = sceneManager.scene;

        // Road segments for infinite scrolling
        this.roadSegments = [];
        this.roadSegmentLength = 200;
        this.roadSegmentCount = 12;

        // Buildings
        this.buildings = [];
        this.buildingPool = [];

        // Street lamps
        this.streetLamps = [];
        this.lampSpacing = 30;

        // Materials (reused for performance)
        this.materials = {};

        // Track player's last chunk position for recycling
        this.lastChunkZ = 0;
    }

    async init() {
        this.createMaterials();
        this.createSkybox();
        this.createRoad();
        this.createBuildings();
        this.createStreetLamps();
        this.createAtmosphericHaze();

        console.log('Environment initialized');
    }

    createMaterials() {
        // Road surface - dark asphalt
        this.materials.road = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.9,
            metalness: 0.1
        });

        // Lane markers - white dashed
        this.materials.laneMarker = new THREE.MeshBasicMaterial({
            color: 0xffffff
        });

        // Edge lines - yellow
        this.materials.edgeLine = new THREE.MeshBasicMaterial({
            color: 0xffd700
        });

        // Building materials with variations
        this.materials.buildings = [
            new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.8 }),
            new THREE.MeshStandardMaterial({ color: 0x3a3a4a, roughness: 0.7 }),
            new THREE.MeshStandardMaterial({ color: 0x252535, roughness: 0.85 }),
            new THREE.MeshStandardMaterial({ color: 0x1f1f2f, roughness: 0.9 }),
            new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.75 })
        ];

        // Window material - emissive for lit windows
        this.materials.litWindow = new THREE.MeshBasicMaterial({
            color: 0xffeeaa,
            emissive: 0xffeeaa,
            emissiveIntensity: 0.8
        });

        // Street lamp pole
        this.materials.lampPole = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.2
        });

        // Lamp glow
        this.materials.lampGlow = new THREE.MeshBasicMaterial({
            color: 0xffddaa,
            transparent: true,
            opacity: 0.9
        });
    }

    createSkybox() {
        // Create a large inverted sphere for the sky
        const skyGeometry = new THREE.SphereGeometry(450, 32, 32);

        // Create gradient shader for sunset effect
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(CONFIG.ENVIRONMENT.SKY_COLOR) },
                bottomColor: { value: new THREE.Color(CONFIG.ENVIRONMENT.SUNSET_COLOR) },
                horizonColor: { value: new THREE.Color(0xff8855) },
                offset: { value: 20 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform vec3 horizonColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;

                void main() {
                    float h = normalize(vWorldPosition + offset).y;

                    // Create sunset gradient
                    vec3 color;
                    if (h > 0.0) {
                        // Above horizon - blend to dark blue
                        float t = pow(h, exponent);
                        color = mix(horizonColor, topColor, t);
                    } else {
                        // Below horizon - blend to sunset orange
                        float t = pow(-h, 0.5);
                        color = mix(horizonColor, bottomColor, t);
                    }

                    // Add slight glow at horizon
                    float horizonGlow = exp(-abs(h) * 5.0) * 0.3;
                    color += vec3(1.0, 0.6, 0.3) * horizonGlow;

                    gl_FragColor = vec4(color, 1.0);
                }
            `,
            side: THREE.BackSide
        });

        this.skybox = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(this.skybox);

        // Add a subtle sun glow
        const sunGeometry = new THREE.CircleGeometry(30, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xffaa44,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
        this.sun.position.set(0, 20, -400);
        this.scene.add(this.sun);

        // Sun halo
        const haloGeometry = new THREE.CircleGeometry(60, 32);
        const haloMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6633,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        this.sunHalo = new THREE.Mesh(haloGeometry, haloMaterial);
        this.sunHalo.position.set(0, 20, -399);
        this.scene.add(this.sunHalo);
    }

    createRoad() {
        const roadWidth = CONFIG.ROAD_WIDTH;

        // Create multiple road segments for infinite scrolling
        for (let i = 0; i < this.roadSegmentCount; i++) {
            const segment = this.createRoadSegment(i * this.roadSegmentLength);
            this.roadSegments.push(segment);
        }
    }

    createRoadSegment(zPosition) {
        const group = new THREE.Group();
        const roadWidth = CONFIG.ROAD_WIDTH;
        const segmentLength = this.roadSegmentLength;

        // Main road surface
        const roadGeometry = new THREE.PlaneGeometry(roadWidth, segmentLength);
        const road = new THREE.Mesh(roadGeometry, this.materials.road);
        road.rotation.x = -Math.PI / 2;
        road.position.set(0, 0.01, zPosition + segmentLength / 2);
        road.receiveShadow = true;
        group.add(road);

        // Lane markers (white dashed lines)
        const laneCount = CONFIG.LANE_COUNT;
        const laneWidth = CONFIG.LANE_WIDTH;
        const dashLength = 4;
        const dashGap = 6;
        const dashWidth = 0.3;

        for (let lane = 1; lane < laneCount; lane++) {
            const xPos = -roadWidth / 2 + lane * laneWidth;

            for (let d = 0; d < segmentLength; d += dashLength + dashGap) {
                const dashGeometry = new THREE.PlaneGeometry(dashWidth, dashLength);
                const dash = new THREE.Mesh(dashGeometry, this.materials.laneMarker);
                dash.rotation.x = -Math.PI / 2;
                dash.position.set(xPos, 0.02, zPosition + d + dashLength / 2);
                group.add(dash);
            }
        }

        // Edge lines (yellow solid)
        const edgeLineGeometry = new THREE.PlaneGeometry(0.4, segmentLength);

        const leftEdge = new THREE.Mesh(edgeLineGeometry, this.materials.edgeLine);
        leftEdge.rotation.x = -Math.PI / 2;
        leftEdge.position.set(-roadWidth / 2 + 0.5, 0.02, zPosition + segmentLength / 2);
        group.add(leftEdge);

        const rightEdge = new THREE.Mesh(edgeLineGeometry, this.materials.edgeLine);
        rightEdge.rotation.x = -Math.PI / 2;
        rightEdge.position.set(roadWidth / 2 - 0.5, 0.02, zPosition + segmentLength / 2);
        group.add(rightEdge);

        // Sidewalks
        const sidewalkWidth = 5;
        const sidewalkGeometry = new THREE.BoxGeometry(sidewalkWidth, 0.3, segmentLength);
        const sidewalkMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.9
        });

        const leftSidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
        leftSidewalk.position.set(-roadWidth / 2 - sidewalkWidth / 2 - 0.5, 0.15, zPosition + segmentLength / 2);
        leftSidewalk.receiveShadow = true;
        group.add(leftSidewalk);

        const rightSidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
        rightSidewalk.position.set(roadWidth / 2 + sidewalkWidth / 2 + 0.5, 0.15, zPosition + segmentLength / 2);
        rightSidewalk.receiveShadow = true;
        group.add(rightSidewalk);

        this.scene.add(group);

        return {
            group,
            zPosition,
            road
        };
    }

    createBuildings() {
        const buildingCount = CONFIG.ENVIRONMENT.BUILDING_COUNT;
        const roadWidth = CONFIG.ROAD_WIDTH;
        const cityWidth = CONFIG.ENVIRONMENT.CITY_WIDTH;

        // Create buildings on both sides of the road
        for (let i = 0; i < buildingCount; i++) {
            // Left side
            const leftBuilding = this.createBuilding(
                -roadWidth / 2 - 15 - Math.random() * (cityWidth / 2 - 20),
                i * 25 - 100 + Math.random() * 10
            );
            this.buildings.push(leftBuilding);

            // Right side
            const rightBuilding = this.createBuilding(
                roadWidth / 2 + 15 + Math.random() * (cityWidth / 2 - 20),
                i * 25 - 100 + Math.random() * 10
            );
            this.buildings.push(rightBuilding);
        }
    }

    createBuilding(x, z) {
        const minHeight = CONFIG.ENVIRONMENT.BUILDING_MIN_HEIGHT;
        const maxHeight = CONFIG.ENVIRONMENT.BUILDING_MAX_HEIGHT;
        const depth = CONFIG.ENVIRONMENT.BUILDING_DEPTH;

        const height = minHeight + Math.random() * (maxHeight - minHeight);
        const width = 8 + Math.random() * 15;
        const buildingDepth = depth * (0.5 + Math.random() * 0.5);

        const group = new THREE.Group();

        // Main building body
        const buildingGeometry = new THREE.BoxGeometry(width, height, buildingDepth);
        const materialIndex = Math.floor(Math.random() * this.materials.buildings.length);
        const building = new THREE.Mesh(buildingGeometry, this.materials.buildings[materialIndex]);
        building.position.y = height / 2;
        building.castShadow = true;
        building.receiveShadow = true;
        group.add(building);

        // Add lit windows
        this.addWindowsToBuilding(group, width, height, buildingDepth, x > 0);

        group.position.set(x, 0, z);
        this.scene.add(group);

        return {
            group,
            x,
            z,
            height,
            width
        };
    }

    addWindowsToBuilding(buildingGroup, width, height, depth, isFacingLeft) {
        const windowSize = 1.2;
        const windowSpacingH = 3;
        const windowSpacingV = 4;
        const windowsPerRow = Math.floor((width - 2) / windowSpacingH);
        const windowRows = Math.floor((height - 4) / windowSpacingV);

        // Create windows on the side facing the road
        const faceX = isFacingLeft ? -width / 2 - 0.01 : width / 2 + 0.01;

        for (let row = 0; row < windowRows; row++) {
            for (let col = 0; col < windowsPerRow; col++) {
                // Randomly determine if window is lit (30% chance)
                if (Math.random() > 0.3) continue;

                const windowGeometry = new THREE.PlaneGeometry(windowSize, windowSize * 1.5);
                const window = new THREE.Mesh(windowGeometry, this.materials.litWindow);

                const xOffset = -width / 2 + 2 + col * windowSpacingH;
                const yOffset = 3 + row * windowSpacingV;

                window.position.set(faceX, yOffset, xOffset);
                window.rotation.y = isFacingLeft ? Math.PI / 2 : -Math.PI / 2;

                buildingGroup.add(window);
            }
        }

        // Also add windows on the front face (facing forward)
        const frontFaceZ = depth / 2 + 0.01;
        const windowsPerRowFront = Math.floor((depth - 2) / windowSpacingH);

        for (let row = 0; row < windowRows; row++) {
            for (let col = 0; col < windowsPerRowFront; col++) {
                if (Math.random() > 0.25) continue;

                const windowGeometry = new THREE.PlaneGeometry(windowSize, windowSize * 1.5);
                const window = new THREE.Mesh(windowGeometry, this.materials.litWindow);

                const zOffset = -depth / 2 + 2 + col * windowSpacingH;
                const yOffset = 3 + row * windowSpacingV;

                window.position.set(0, yOffset, frontFaceZ);
                window.position.z = zOffset;
                window.position.x = isFacingLeft ? -width / 2 - 0.01 : width / 2 + 0.01;

                buildingGroup.add(window);
            }
        }
    }

    createStreetLamps() {
        const roadWidth = CONFIG.ROAD_WIDTH;
        const lampCount = 40;

        for (let i = 0; i < lampCount; i++) {
            const z = i * this.lampSpacing - 100;

            // Left side lamp
            const leftLamp = this.createStreetLamp(-roadWidth / 2 - 3, z);
            this.streetLamps.push(leftLamp);

            // Right side lamp (offset for variety)
            if (i % 2 === 0) {
                const rightLamp = this.createStreetLamp(roadWidth / 2 + 3, z + this.lampSpacing / 2);
                this.streetLamps.push(rightLamp);
            }
        }
    }

    createStreetLamp(x, z) {
        const group = new THREE.Group();

        // Pole
        const poleGeometry = new THREE.CylinderGeometry(0.15, 0.2, 8, 8);
        const pole = new THREE.Mesh(poleGeometry, this.materials.lampPole);
        pole.position.y = 4;
        pole.castShadow = true;
        group.add(pole);

        // Arm extending toward road
        const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 3, 8);
        const arm = new THREE.Mesh(armGeometry, this.materials.lampPole);
        arm.rotation.z = Math.PI / 2;
        arm.position.set(x > 0 ? -1.5 : 1.5, 7.5, 0);
        group.add(arm);

        // Lamp housing
        const housingGeometry = new THREE.CylinderGeometry(0.5, 0.3, 0.6, 8);
        const housing = new THREE.Mesh(housingGeometry, this.materials.lampPole);
        housing.position.set(x > 0 ? -3 : 3, 7.2, 0);
        group.add(housing);

        // Glowing bulb
        const bulbGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const bulb = new THREE.Mesh(bulbGeometry, this.materials.lampGlow);
        bulb.position.set(x > 0 ? -3 : 3, 6.8, 0);
        group.add(bulb);

        // Point light for actual illumination
        const light = new THREE.PointLight(0xffddaa, 0.8, 25, 2);
        light.position.set(x > 0 ? -3 : 3, 6.8, 0);
        light.castShadow = false; // Disable for performance
        group.add(light);

        group.position.set(x, 0, z);
        this.scene.add(group);

        return {
            group,
            x,
            z,
            light
        };
    }

    createAtmosphericHaze() {
        // Create layers of atmospheric haze for depth
        const hazeGeometry = new THREE.PlaneGeometry(800, 100);
        const hazeMaterial = new THREE.MeshBasicMaterial({
            color: CONFIG.ENVIRONMENT.SUNSET_COLOR,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        // Multiple haze layers at different distances
        this.hazeLayers = [];
        const distances = [200, 300, 400];

        for (const dist of distances) {
            const haze = new THREE.Mesh(hazeGeometry, hazeMaterial.clone());
            haze.material.opacity = 0.1 + (dist / 1000);
            haze.position.set(0, 30, dist);
            this.scene.add(haze);
            this.hazeLayers.push(haze);
        }

        // Ground haze near road
        const groundHazeGeometry = new THREE.PlaneGeometry(200, 400);
        const groundHazeMaterial = new THREE.MeshBasicMaterial({
            color: 0x333355,
            transparent: true,
            opacity: 0.08,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        this.groundHaze = new THREE.Mesh(groundHazeGeometry, groundHazeMaterial);
        this.groundHaze.rotation.x = -Math.PI / 2;
        this.groundHaze.position.set(0, 0.5, 100);
        this.scene.add(this.groundHaze);
    }

    update(dt, playerPosition, playerSpeed) {
        const playerZ = playerPosition.z;

        // Update road segments - infinite scrolling
        this.updateRoadSegments(playerZ);

        // Update buildings - recycle as player passes
        this.updateBuildings(playerZ);

        // Update street lamps
        this.updateStreetLamps(playerZ);

        // Update atmospheric elements
        this.updateAtmosphere(playerZ, playerSpeed);

        // Keep skybox centered on player
        this.skybox.position.x = playerPosition.x;
        this.skybox.position.z = playerZ;

        // Update sun position relative to player
        this.sun.position.z = playerZ - 400;
        this.sunHalo.position.z = playerZ - 399;
    }

    updateRoadSegments(playerZ) {
        const totalLength = this.roadSegmentCount * this.roadSegmentLength;

        for (const segment of this.roadSegments) {
            // Check if segment is behind player
            const segmentEnd = segment.zPosition + this.roadSegmentLength;

            if (segmentEnd < playerZ - 100) {
                // Move segment to front
                segment.zPosition += totalLength;
                segment.group.position.z = segment.zPosition;

                // Update all children positions
                segment.group.traverse((child) => {
                    if (child.isMesh && child !== segment.group) {
                        // Road mesh position is relative to group, so we just move the group
                    }
                });
            }
        }
    }

    updateBuildings(playerZ) {
        const recycleDistance = 150;
        const spawnAhead = this.roadSegmentLength * this.roadSegmentCount - 200;

        for (const building of this.buildings) {
            // If building is too far behind, move it ahead
            if (building.z < playerZ - recycleDistance) {
                building.z += spawnAhead + recycleDistance;
                building.group.position.z = building.z;

                // Randomize appearance slightly
                const newHeight = CONFIG.ENVIRONMENT.BUILDING_MIN_HEIGHT +
                    Math.random() * (CONFIG.ENVIRONMENT.BUILDING_MAX_HEIGHT - CONFIG.ENVIRONMENT.BUILDING_MIN_HEIGHT);
                building.group.scale.y = newHeight / building.height;
            }
        }
    }

    updateStreetLamps(playerZ) {
        const recycleDistance = 100;
        const totalLength = this.lampSpacing * 40;

        for (const lamp of this.streetLamps) {
            if (lamp.z < playerZ - recycleDistance) {
                lamp.z += totalLength;
                lamp.group.position.z = lamp.z;
            }
        }
    }

    updateAtmosphere(playerZ, playerSpeed) {
        // Move haze layers with player
        for (let i = 0; i < this.hazeLayers.length; i++) {
            const layer = this.hazeLayers[i];
            const baseDistance = 200 + i * 100;
            layer.position.z = playerZ + baseDistance;

            // Subtle animation
            layer.material.opacity = 0.1 + (i * 0.05) + Math.sin(Date.now() * 0.001 + i) * 0.02;
        }

        // Ground haze follows player
        this.groundHaze.position.z = playerZ + 100;

        // Increase haze intensity at higher speeds
        const speedFactor = Math.min(playerSpeed / CONFIG.PLAYER.MAX_SPEED, 1);
        this.groundHaze.material.opacity = 0.08 + speedFactor * 0.05;
    }

    dispose() {
        // Dispose of all geometries and materials
        this.scene.traverse((object) => {
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(m => m.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });

        // Remove all created objects
        for (const segment of this.roadSegments) {
            this.scene.remove(segment.group);
        }

        for (const building of this.buildings) {
            this.scene.remove(building.group);
        }

        for (const lamp of this.streetLamps) {
            this.scene.remove(lamp.group);
        }

        this.scene.remove(this.skybox);
        this.scene.remove(this.sun);
        this.scene.remove(this.sunHalo);
        this.scene.remove(this.groundHaze);

        for (const layer of this.hazeLayers) {
            this.scene.remove(layer);
        }

        console.log('Environment disposed');
    }
}
