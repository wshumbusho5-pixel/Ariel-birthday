// ============================================
// INPUT MANAGER - Keyboard and Touch Input Handling
// Tracks keyboard state and provides mobile touch controls
// ============================================

import { KEYS } from '../config.js';

/**
 * InputManager - Handles all player input (keyboard and touch)
 * Provides a unified interface for input state and event emission
 */
export class InputManager {
    constructor() {
        // Keyboard state tracking
        this.keyState = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            brake: false,
            nitro: false
        };

        // Event listeners storage
        this.eventListeners = {
            pause: [],
            camera: []
        };

        // Touch control elements
        this.touchElements = [];
        this.touchContainer = null;

        // Bound event handlers (for cleanup)
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onTouchStart = this._onTouchStart.bind(this);
        this._onTouchEnd = this._onTouchEnd.bind(this);

        // Track if we're on mobile
        this.isMobile = false;
    }

    /**
     * Initialize input handling
     * Sets up keyboard listeners and creates touch controls on mobile
     */
    init() {
        // Setup keyboard event listeners
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);

        // Detect mobile and create touch controls
        this.isMobile = this._detectMobile();
        if (this.isMobile) {
            this._createTouchControls();
        }

        return this;
    }

    /**
     * Detect if running on a mobile device
     * @private
     * @returns {boolean}
     */
    _detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || ('ontouchstart' in window)
            || (navigator.maxTouchPoints > 0);
    }

    /**
     * Handle keydown events
     * @private
     * @param {KeyboardEvent} event
     */
    _onKeyDown(event) {
        const key = event.code;

        // Check directional controls
        if (KEYS.FORWARD.includes(key)) {
            this.keyState.forward = true;
        }
        if (KEYS.BACKWARD.includes(key)) {
            this.keyState.backward = true;
        }
        if (KEYS.LEFT.includes(key)) {
            this.keyState.left = true;
        }
        if (KEYS.RIGHT.includes(key)) {
            this.keyState.right = true;
        }
        if (KEYS.BRAKE.includes(key)) {
            this.keyState.brake = true;
            event.preventDefault(); // Prevent page scroll on space
        }
        if (KEYS.NITRO.includes(key)) {
            this.keyState.nitro = true;
        }

        // Emit single-press events (only on initial press)
        if (!event.repeat) {
            if (KEYS.PAUSE.includes(key)) {
                this._emit('pause');
            }
            if (KEYS.CAMERA.includes(key)) {
                this._emit('camera');
            }
        }
    }

    /**
     * Handle keyup events
     * @private
     * @param {KeyboardEvent} event
     */
    _onKeyUp(event) {
        const key = event.code;

        // Update state when keys are released
        if (KEYS.FORWARD.includes(key)) {
            this.keyState.forward = false;
        }
        if (KEYS.BACKWARD.includes(key)) {
            this.keyState.backward = false;
        }
        if (KEYS.LEFT.includes(key)) {
            this.keyState.left = false;
        }
        if (KEYS.RIGHT.includes(key)) {
            this.keyState.right = false;
        }
        if (KEYS.BRAKE.includes(key)) {
            this.keyState.brake = false;
        }
        if (KEYS.NITRO.includes(key)) {
            this.keyState.nitro = false;
        }
    }

    /**
     * Create mobile touch control buttons
     * @private
     */
    _createTouchControls() {
        // Create container for touch controls
        this.touchContainer = document.createElement('div');
        this.touchContainer.id = 'touch-controls';
        this.touchContainer.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 200px;
            pointer-events: none;
            z-index: 1000;
            display: flex;
            justify-content: space-between;
            padding: 20px;
        `;

        // Left side controls (steering)
        const leftControls = document.createElement('div');
        leftControls.style.cssText = `
            display: flex;
            gap: 10px;
            align-items: flex-end;
        `;

        // Right side controls (gas/brake/nitro)
        const rightControls = document.createElement('div');
        rightControls.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 10px;
            align-items: flex-end;
        `;

        // Create steering buttons
        const leftBtn = this._createTouchButton('LEFT', '<', 'left');
        const rightBtn = this._createTouchButton('RIGHT', '>', 'right');
        leftControls.appendChild(leftBtn);
        leftControls.appendChild(rightBtn);

        // Create action buttons
        const nitroBtn = this._createTouchButton('NITRO', 'N', 'nitro', '#3b82f6');
        const gasBtn = this._createTouchButton('GAS', '^', 'forward', '#22c55e');
        const brakeBtn = this._createTouchButton('BRAKE', 'v', 'brake', '#ef4444');

        // Gas and brake row
        const actionRow = document.createElement('div');
        actionRow.style.cssText = `display: flex; gap: 10px;`;
        actionRow.appendChild(brakeBtn);
        actionRow.appendChild(gasBtn);

        rightControls.appendChild(nitroBtn);
        rightControls.appendChild(actionRow);

        // Add to container
        this.touchContainer.appendChild(leftControls);
        this.touchContainer.appendChild(rightControls);
        document.body.appendChild(this.touchContainer);
    }

    /**
     * Create a single touch button
     * @private
     * @param {string} label - Button label for accessibility
     * @param {string} text - Display text
     * @param {string} action - Key state to modify
     * @param {string} color - Background color
     * @returns {HTMLElement}
     */
    _createTouchButton(label, text, action, color = '#666') {
        const button = document.createElement('button');
        button.setAttribute('aria-label', label);
        button.textContent = text;
        button.style.cssText = `
            width: 70px;
            height: 70px;
            border-radius: 50%;
            border: 3px solid rgba(255,255,255,0.3);
            background: ${color};
            color: white;
            font-size: 24px;
            font-weight: bold;
            pointer-events: auto;
            touch-action: none;
            opacity: 0.7;
            transition: opacity 0.1s, transform 0.1s;
            user-select: none;
            -webkit-user-select: none;
        `;

        // Touch event handlers
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.keyState[action] = true;
            button.style.opacity = '1';
            button.style.transform = 'scale(1.1)';
        }, { passive: false });

        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.keyState[action] = false;
            button.style.opacity = '0.7';
            button.style.transform = 'scale(1)';
        }, { passive: false });

        button.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.keyState[action] = false;
            button.style.opacity = '0.7';
            button.style.transform = 'scale(1)';
        }, { passive: false });

        // Store reference for cleanup
        this.touchElements.push(button);

        return button;
    }

    /**
     * Handle touch start events (for controls)
     * @private
     * @param {TouchEvent} event
     */
    _onTouchStart(event) {
        // Handled by individual button listeners
    }

    /**
     * Handle touch end events (for controls)
     * @private
     * @param {TouchEvent} event
     */
    _onTouchEnd(event) {
        // Handled by individual button listeners
    }

    /**
     * Get the current input state
     * @returns {Object} Current state of all inputs
     */
    getState() {
        return {
            forward: this.keyState.forward,
            backward: this.keyState.backward,
            left: this.keyState.left,
            right: this.keyState.right,
            brake: this.keyState.brake,
            nitro: this.keyState.nitro
        };
    }

    /**
     * Register an event listener
     * @param {string} event - Event name ('pause' or 'camera')
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].push(callback);
        } else {
            console.warn(`InputManager: Unknown event '${event}'`);
        }
    }

    /**
     * Remove an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    off(event, callback) {
        if (this.eventListeners[event]) {
            const index = this.eventListeners[event].indexOf(callback);
            if (index !== -1) {
                this.eventListeners[event].splice(index, 1);
            }
        }
    }

    /**
     * Emit an event to all registered listeners
     * @private
     * @param {string} event - Event name
     * @param {*} data - Optional data to pass to listeners
     */
    _emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`InputManager: Error in ${event} listener:`, error);
                }
            });
        }
    }

    /**
     * Clean up all event listeners and touch controls
     */
    dispose() {
        // Remove keyboard listeners
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);

        // Remove touch controls
        if (this.touchContainer && this.touchContainer.parentNode) {
            this.touchContainer.parentNode.removeChild(this.touchContainer);
        }
        this.touchElements = [];
        this.touchContainer = null;

        // Clear event listeners
        this.eventListeners = {
            pause: [],
            camera: []
        };

        // Reset state
        this.keyState = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            brake: false,
            nitro: false
        };
    }
}
