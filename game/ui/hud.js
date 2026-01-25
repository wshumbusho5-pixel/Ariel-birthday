// ============================================
// HUD - All UI elements (DOM-based)
// ============================================

import { CONFIG } from '../config.js';

export class HUD {
    constructor() {
        this.container = null;
        this.elements = {};
        this.isVisible = false;
        this.nearMissQueue = [];
        this.lastScore = 0;
    }

    init() {
        // Get or create HUD container
        this.container = document.getElementById('hud-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'hud-container';
            document.body.appendChild(this.container);
        }

        // Inject global styles
        this.injectStyles();

        // Create all HUD elements
        this.createSpeedometer();
        this.createNitroBar();
        this.createScore();
        this.createGearIndicator();
        this.createDamageIndicator();
        this.createNearMissPopup();
        this.createMenuScreen();
        this.createPauseOverlay();
        this.createGameOverScreen();
        this.createMobileControls();

        // Initially hide HUD
        this.hide();

        console.log('HUD initialized');
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@500;700&display=swap');

            #hud-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 1000;
                font-family: 'Orbitron', 'Rajdhani', sans-serif;
            }

            #hud-container * {
                box-sizing: border-box;
            }

            #hud-container button {
                pointer-events: auto;
            }

            /* Animations */
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }

            @keyframes slideIn {
                from { transform: translateX(100px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100px); opacity: 0; }
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }

            @keyframes scorePopup {
                0% { transform: scale(1); }
                50% { transform: scale(1.3); color: ${CONFIG.UI.COLORS.SUCCESS}; }
                100% { transform: scale(1); }
            }

            @keyframes glow {
                0%, 100% { box-shadow: 0 0 10px rgba(212, 175, 55, 0.5); }
                50% { box-shadow: 0 0 20px rgba(212, 175, 55, 0.8), 0 0 40px rgba(212, 175, 55, 0.4); }
            }

            @keyframes nearMissSlide {
                0% { transform: translateX(100%); opacity: 0; }
                15% { transform: translateX(0); opacity: 1; }
                85% { transform: translateX(0); opacity: 1; }
                100% { transform: translateX(100%); opacity: 0; }
            }

            /* Speedometer */
            .speedometer {
                position: absolute;
                bottom: 30px;
                right: 30px;
                width: 180px;
                height: 180px;
                background: radial-gradient(circle, rgba(20, 20, 30, 0.9) 0%, rgba(10, 10, 15, 0.95) 100%);
                border-radius: 50%;
                border: 3px solid ${CONFIG.UI.COLORS.PRIMARY};
                box-shadow:
                    0 0 20px rgba(212, 175, 55, 0.3),
                    inset 0 0 30px rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
            }

            .speedometer::before {
                content: '';
                position: absolute;
                top: 10px;
                left: 10px;
                right: 10px;
                bottom: 10px;
                border-radius: 50%;
                border: 1px solid rgba(212, 175, 55, 0.3);
            }

            .speedo-marks {
                position: absolute;
                width: 100%;
                height: 100%;
            }

            .speedo-mark {
                position: absolute;
                width: 2px;
                height: 10px;
                background: ${CONFIG.UI.COLORS.PRIMARY};
                left: 50%;
                top: 8px;
                transform-origin: 50% 82px;
            }

            .speedo-mark.major {
                height: 15px;
                width: 3px;
            }

            .speedo-needle {
                position: absolute;
                width: 4px;
                height: 60px;
                background: linear-gradient(to top, ${CONFIG.UI.COLORS.DANGER}, #ff8888);
                bottom: 50%;
                left: calc(50% - 2px);
                transform-origin: 50% 100%;
                transform: rotate(-135deg);
                border-radius: 2px;
                transition: transform 0.1s ease-out;
                box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
            }

            .speedo-needle::after {
                content: '';
                position: absolute;
                bottom: -8px;
                left: -6px;
                width: 16px;
                height: 16px;
                background: ${CONFIG.UI.COLORS.PRIMARY};
                border-radius: 50%;
            }

            .speedo-digital {
                font-size: 32px;
                font-weight: 900;
                color: ${CONFIG.UI.COLORS.PRIMARY};
                text-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
                z-index: 1;
                margin-top: 20px;
            }

            .speedo-unit {
                font-size: 12px;
                color: rgba(212, 175, 55, 0.7);
                letter-spacing: 2px;
                margin-top: -5px;
            }

            /* Nitro Bar */
            .nitro-bar {
                position: absolute;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%);
                width: 300px;
                height: 20px;
                background: rgba(20, 20, 30, 0.9);
                border: 2px solid ${CONFIG.UI.COLORS.NITRO};
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 0 15px rgba(59, 130, 246, 0.3);
            }

            .nitro-fill {
                height: 100%;
                width: 100%;
                background: linear-gradient(90deg,
                    ${CONFIG.UI.COLORS.NITRO} 0%,
                    #60a5fa 50%,
                    #93c5fd 100%
                );
                transition: width 0.2s ease-out;
                box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
                position: relative;
            }

            .nitro-fill::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 50%;
                background: linear-gradient(to bottom,
                    rgba(255, 255, 255, 0.3),
                    transparent
                );
            }

            .nitro-label {
                position: absolute;
                top: -25px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 12px;
                color: ${CONFIG.UI.COLORS.NITRO};
                letter-spacing: 3px;
                text-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
            }

            /* Score */
            .score-display {
                position: absolute;
                top: 20px;
                right: 30px;
                text-align: right;
            }

            .score-label {
                font-size: 12px;
                color: rgba(212, 175, 55, 0.7);
                letter-spacing: 3px;
                margin-bottom: 5px;
            }

            .score-value {
                font-size: 36px;
                font-weight: 900;
                color: ${CONFIG.UI.COLORS.PRIMARY};
                text-shadow: 0 0 20px rgba(212, 175, 55, 0.5);
            }

            .score-value.animating {
                animation: scorePopup 0.3s ease-out;
            }

            /* Gear Indicator */
            .gear-indicator {
                position: absolute;
                bottom: 220px;
                right: 45px;
                width: 60px;
                height: 60px;
                background: rgba(20, 20, 30, 0.9);
                border: 2px solid ${CONFIG.UI.COLORS.PRIMARY};
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
            }

            .gear-label {
                font-size: 10px;
                color: rgba(212, 175, 55, 0.7);
                letter-spacing: 1px;
            }

            .gear-value {
                font-size: 28px;
                font-weight: 900;
                color: ${CONFIG.UI.COLORS.PRIMARY};
                text-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
            }

            /* Damage Indicator */
            .damage-indicator {
                position: absolute;
                top: 20px;
                left: 30px;
                width: 150px;
            }

            .damage-label {
                font-size: 12px;
                color: rgba(239, 68, 68, 0.7);
                letter-spacing: 2px;
                margin-bottom: 5px;
            }

            .damage-bar {
                width: 100%;
                height: 8px;
                background: rgba(20, 20, 30, 0.9);
                border: 1px solid ${CONFIG.UI.COLORS.DANGER};
                border-radius: 4px;
                overflow: hidden;
            }

            .damage-fill {
                height: 100%;
                width: 0%;
                background: linear-gradient(90deg,
                    ${CONFIG.UI.COLORS.SUCCESS} 0%,
                    #fbbf24 50%,
                    ${CONFIG.UI.COLORS.DANGER} 100%
                );
                transition: width 0.3s ease-out;
            }

            /* Near Miss Popup */
            .near-miss-container {
                position: absolute;
                top: 50%;
                right: 30px;
                transform: translateY(-50%);
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .near-miss-popup {
                background: linear-gradient(135deg,
                    rgba(212, 175, 55, 0.9) 0%,
                    rgba(180, 140, 20, 0.9) 100%
                );
                padding: 10px 25px;
                border-radius: 5px;
                font-size: 18px;
                font-weight: 700;
                color: #000;
                text-shadow: none;
                animation: nearMissSlide 1.5s ease-out forwards;
                box-shadow: 0 0 20px rgba(212, 175, 55, 0.5);
            }

            /* Menu Screen */
            .menu-screen {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg,
                    rgba(10, 10, 20, 0.95) 0%,
                    rgba(20, 20, 40, 0.95) 100%
                );
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.5s ease-out;
            }

            .menu-title {
                font-size: 48px;
                font-weight: 900;
                color: ${CONFIG.UI.COLORS.PRIMARY};
                text-shadow:
                    0 0 20px rgba(212, 175, 55, 0.5),
                    0 0 40px rgba(212, 175, 55, 0.3);
                margin-bottom: 10px;
                text-align: center;
                animation: glow 2s infinite;
            }

            .menu-subtitle {
                font-size: 18px;
                color: rgba(255, 255, 255, 0.7);
                margin-bottom: 60px;
                letter-spacing: 3px;
            }

            .menu-start-btn {
                background: linear-gradient(135deg,
                    ${CONFIG.UI.COLORS.PRIMARY} 0%,
                    #b8860b 100%
                );
                border: none;
                padding: 20px 60px;
                font-size: 20px;
                font-weight: 700;
                font-family: 'Orbitron', sans-serif;
                color: #000;
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 0 30px rgba(212, 175, 55, 0.5);
                text-transform: uppercase;
                letter-spacing: 3px;
            }

            .menu-start-btn:hover {
                transform: scale(1.05);
                box-shadow: 0 0 50px rgba(212, 175, 55, 0.8);
            }

            .menu-controls {
                margin-top: 40px;
                color: rgba(255, 255, 255, 0.5);
                font-size: 14px;
                text-align: center;
                line-height: 2;
            }

            /* Pause Overlay */
            .pause-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.2s ease-out;
            }

            .pause-text {
                font-size: 64px;
                font-weight: 900;
                color: ${CONFIG.UI.COLORS.PRIMARY};
                text-shadow: 0 0 30px rgba(212, 175, 55, 0.5);
                margin-bottom: 30px;
            }

            .pause-resume {
                font-size: 18px;
                color: rgba(255, 255, 255, 0.7);
                animation: pulse 2s infinite;
            }

            /* Game Over Screen */
            .gameover-screen {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg,
                    rgba(10, 10, 20, 0.98) 0%,
                    rgba(30, 10, 10, 0.98) 100%
                );
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.5s ease-out;
            }

            .gameover-title {
                font-size: 64px;
                font-weight: 900;
                color: ${CONFIG.UI.COLORS.DANGER};
                text-shadow: 0 0 30px rgba(239, 68, 68, 0.5);
                margin-bottom: 30px;
            }

            .gameover-score-label {
                font-size: 18px;
                color: rgba(255, 255, 255, 0.7);
                letter-spacing: 3px;
                margin-bottom: 10px;
            }

            .gameover-score {
                font-size: 72px;
                font-weight: 900;
                color: ${CONFIG.UI.COLORS.PRIMARY};
                text-shadow: 0 0 30px rgba(212, 175, 55, 0.5);
                margin-bottom: 50px;
            }

            .gameover-buttons {
                display: flex;
                gap: 20px;
            }

            .gameover-btn {
                background: transparent;
                border: 2px solid ${CONFIG.UI.COLORS.PRIMARY};
                padding: 15px 40px;
                font-size: 16px;
                font-weight: 700;
                font-family: 'Orbitron', sans-serif;
                color: ${CONFIG.UI.COLORS.PRIMARY};
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 2px;
            }

            .gameover-btn:hover {
                background: ${CONFIG.UI.COLORS.PRIMARY};
                color: #000;
            }

            .gameover-btn.primary {
                background: ${CONFIG.UI.COLORS.PRIMARY};
                color: #000;
            }

            .gameover-btn.primary:hover {
                background: #f0d060;
            }

            /* Mobile Controls */
            .mobile-controls {
                display: none;
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                padding: 20px;
                pointer-events: auto;
            }

            @media (max-width: 768px), (pointer: coarse) {
                .mobile-controls {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                }

                .speedometer {
                    width: 120px;
                    height: 120px;
                    bottom: 140px;
                    right: 20px;
                }

                .speedo-digital {
                    font-size: 24px;
                }

                .speedo-needle {
                    height: 40px;
                }

                .speedo-mark {
                    transform-origin: 50% 52px;
                }

                .nitro-bar {
                    width: 200px;
                    bottom: 150px;
                }

                .gear-indicator {
                    bottom: 140px;
                    right: 150px;
                    width: 50px;
                    height: 50px;
                }

                .gear-value {
                    font-size: 22px;
                }
            }

            .mobile-left-controls,
            .mobile-right-controls {
                display: flex;
                gap: 10px;
            }

            .mobile-btn {
                width: 70px;
                height: 70px;
                border-radius: 50%;
                border: 2px solid rgba(255, 255, 255, 0.3);
                background: rgba(20, 20, 30, 0.8);
                color: #fff;
                font-size: 24px;
                font-weight: 700;
                display: flex;
                align-items: center;
                justify-content: center;
                touch-action: manipulation;
                user-select: none;
                -webkit-user-select: none;
            }

            .mobile-btn:active {
                background: rgba(212, 175, 55, 0.3);
                border-color: ${CONFIG.UI.COLORS.PRIMARY};
            }

            .mobile-btn.gas {
                width: 90px;
                height: 90px;
                background: rgba(34, 197, 94, 0.3);
                border-color: ${CONFIG.UI.COLORS.SUCCESS};
            }

            .mobile-btn.brake {
                background: rgba(239, 68, 68, 0.3);
                border-color: ${CONFIG.UI.COLORS.DANGER};
            }

            .mobile-btn.nitro {
                background: rgba(59, 130, 246, 0.3);
                border-color: ${CONFIG.UI.COLORS.NITRO};
            }

            .mobile-center-controls {
                display: flex;
                flex-direction: column;
                gap: 10px;
                align-items: center;
            }
        `;
        document.head.appendChild(style);
    }

    createSpeedometer() {
        const speedo = document.createElement('div');
        speedo.className = 'speedometer';

        // Create speed marks
        const marks = document.createElement('div');
        marks.className = 'speedo-marks';
        for (let i = 0; i <= 10; i++) {
            const mark = document.createElement('div');
            mark.className = 'speedo-mark' + (i % 2 === 0 ? ' major' : '');
            mark.style.transform = `rotate(${-135 + i * 27}deg)`;
            marks.appendChild(mark);
        }
        speedo.appendChild(marks);

        // Create needle
        const needle = document.createElement('div');
        needle.className = 'speedo-needle';
        speedo.appendChild(needle);
        this.elements.speedoNeedle = needle;

        // Create digital display
        const digital = document.createElement('div');
        digital.className = 'speedo-digital';
        digital.textContent = '0';
        speedo.appendChild(digital);
        this.elements.speedoDigital = digital;

        // Create unit label
        const unit = document.createElement('div');
        unit.className = 'speedo-unit';
        unit.textContent = 'MPH';
        speedo.appendChild(unit);

        this.container.appendChild(speedo);
        this.elements.speedometer = speedo;
    }

    createNitroBar() {
        const container = document.createElement('div');
        container.className = 'nitro-bar';

        const label = document.createElement('div');
        label.className = 'nitro-label';
        label.textContent = 'NITRO';
        container.appendChild(label);

        const fill = document.createElement('div');
        fill.className = 'nitro-fill';
        container.appendChild(fill);
        this.elements.nitroFill = fill;

        this.container.appendChild(container);
        this.elements.nitroBar = container;
    }

    createScore() {
        const container = document.createElement('div');
        container.className = 'score-display';

        const label = document.createElement('div');
        label.className = 'score-label';
        label.textContent = 'SCORE';
        container.appendChild(label);

        const value = document.createElement('div');
        value.className = 'score-value';
        value.textContent = '0';
        container.appendChild(value);
        this.elements.scoreValue = value;

        this.container.appendChild(container);
        this.elements.scoreDisplay = container;
    }

    createGearIndicator() {
        const container = document.createElement('div');
        container.className = 'gear-indicator';

        const label = document.createElement('div');
        label.className = 'gear-label';
        label.textContent = 'GEAR';
        container.appendChild(label);

        const value = document.createElement('div');
        value.className = 'gear-value';
        value.textContent = '1';
        container.appendChild(value);
        this.elements.gearValue = value;

        this.container.appendChild(container);
        this.elements.gearIndicator = container;
    }

    createDamageIndicator() {
        const container = document.createElement('div');
        container.className = 'damage-indicator';

        const label = document.createElement('div');
        label.className = 'damage-label';
        label.textContent = 'DAMAGE';
        container.appendChild(label);

        const bar = document.createElement('div');
        bar.className = 'damage-bar';

        const fill = document.createElement('div');
        fill.className = 'damage-fill';
        bar.appendChild(fill);
        this.elements.damageFill = fill;

        container.appendChild(bar);
        this.container.appendChild(container);
        this.elements.damageIndicator = container;
    }

    createNearMissPopup() {
        const container = document.createElement('div');
        container.className = 'near-miss-container';
        this.container.appendChild(container);
        this.elements.nearMissContainer = container;
    }

    createMenuScreen() {
        const menu = document.createElement('div');
        menu.className = 'menu-screen';
        menu.style.display = 'none';

        const title = document.createElement('div');
        title.className = 'menu-title';
        title.textContent = "STREET RACING";
        menu.appendChild(title);
        this.elements.menuTitle = title;

        const subtitle = document.createElement('div');
        subtitle.className = 'menu-subtitle';
        subtitle.textContent = 'High-Speed Urban Chase';
        menu.appendChild(subtitle);
        this.elements.menuSubtitle = subtitle;

        const startBtn = document.createElement('button');
        startBtn.className = 'menu-start-btn';
        startBtn.textContent = 'START RACE';
        menu.appendChild(startBtn);
        this.elements.menuStartBtn = startBtn;

        const controls = document.createElement('div');
        controls.className = 'menu-controls';
        controls.innerHTML = `
            WASD or Arrow Keys to Drive<br>
            SHIFT for Nitro | SPACE to Brake<br>
            C to Change Camera | ESC to Pause
        `;
        menu.appendChild(controls);

        this.container.appendChild(menu);
        this.elements.menuScreen = menu;
    }

    createPauseOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'pause-overlay';
        overlay.style.display = 'none';

        const text = document.createElement('div');
        text.className = 'pause-text';
        text.textContent = 'PAUSED';
        overlay.appendChild(text);

        const resume = document.createElement('div');
        resume.className = 'pause-resume';
        resume.textContent = 'Press ESC to Resume';
        overlay.appendChild(resume);

        this.container.appendChild(overlay);
        this.elements.pauseOverlay = overlay;
    }

    createGameOverScreen() {
        const screen = document.createElement('div');
        screen.className = 'gameover-screen';
        screen.style.display = 'none';

        const title = document.createElement('div');
        title.className = 'gameover-title';
        title.textContent = 'WASTED';
        screen.appendChild(title);

        const scoreLabel = document.createElement('div');
        scoreLabel.className = 'gameover-score-label';
        scoreLabel.textContent = 'FINAL SCORE';
        screen.appendChild(scoreLabel);

        const score = document.createElement('div');
        score.className = 'gameover-score';
        score.textContent = '0';
        screen.appendChild(score);
        this.elements.gameoverScore = score;

        const buttons = document.createElement('div');
        buttons.className = 'gameover-buttons';

        const restartBtn = document.createElement('button');
        restartBtn.className = 'gameover-btn primary';
        restartBtn.textContent = 'RESTART';
        buttons.appendChild(restartBtn);
        this.elements.gameoverRestartBtn = restartBtn;

        const menuBtn = document.createElement('button');
        menuBtn.className = 'gameover-btn';
        menuBtn.textContent = 'MENU';
        buttons.appendChild(menuBtn);
        this.elements.gameoverMenuBtn = menuBtn;

        screen.appendChild(buttons);
        this.container.appendChild(screen);
        this.elements.gameoverScreen = screen;
    }

    createMobileControls() {
        const controls = document.createElement('div');
        controls.className = 'mobile-controls';

        // Left side - steering
        const left = document.createElement('div');
        left.className = 'mobile-left-controls';

        const leftBtn = document.createElement('button');
        leftBtn.className = 'mobile-btn';
        leftBtn.innerHTML = '&#9664;';
        leftBtn.dataset.control = 'left';
        left.appendChild(leftBtn);

        const rightBtn = document.createElement('button');
        rightBtn.className = 'mobile-btn';
        rightBtn.innerHTML = '&#9654;';
        rightBtn.dataset.control = 'right';
        left.appendChild(rightBtn);

        controls.appendChild(left);

        // Center - nitro
        const center = document.createElement('div');
        center.className = 'mobile-center-controls';

        const nitroBtn = document.createElement('button');
        nitroBtn.className = 'mobile-btn nitro';
        nitroBtn.textContent = 'N2O';
        nitroBtn.dataset.control = 'nitro';
        center.appendChild(nitroBtn);

        controls.appendChild(center);

        // Right side - gas/brake
        const right = document.createElement('div');
        right.className = 'mobile-right-controls';

        const brakeBtn = document.createElement('button');
        brakeBtn.className = 'mobile-btn brake';
        brakeBtn.innerHTML = '&#9724;';
        brakeBtn.dataset.control = 'brake';
        right.appendChild(brakeBtn);

        const gasBtn = document.createElement('button');
        gasBtn.className = 'mobile-btn gas';
        gasBtn.innerHTML = '&#9650;';
        gasBtn.dataset.control = 'gas';
        right.appendChild(gasBtn);

        controls.appendChild(right);

        this.container.appendChild(controls);
        this.elements.mobileControls = controls;

        // Setup touch events
        this.setupMobileControls();
    }

    setupMobileControls() {
        const buttons = this.elements.mobileControls.querySelectorAll('.mobile-btn');

        buttons.forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('mobileControl', {
                    detail: { control: btn.dataset.control, pressed: true }
                }));
            });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('mobileControl', {
                    detail: { control: btn.dataset.control, pressed: false }
                }));
            });
        });
    }

    update(state) {
        if (!this.isVisible) return;

        // Update speedometer
        const speedRatio = Math.min(state.speed / CONFIG.UI.SPEEDO_MAX, 1);
        const needleRotation = -135 + speedRatio * 270;
        this.elements.speedoNeedle.style.transform = `rotate(${needleRotation}deg)`;
        this.elements.speedoDigital.textContent = Math.round(state.speed);

        // Update nitro bar
        this.elements.nitroFill.style.width = `${state.nitro * 100}%`;

        // Update score with animation
        if (state.score !== this.lastScore) {
            this.elements.scoreValue.textContent = state.score.toLocaleString();
            if (state.score > this.lastScore) {
                this.elements.scoreValue.classList.remove('animating');
                void this.elements.scoreValue.offsetWidth; // Force reflow
                this.elements.scoreValue.classList.add('animating');
            }
            this.lastScore = state.score;
        }

        // Update gear
        this.elements.gearValue.textContent = state.gear;

        // Update damage
        this.elements.damageFill.style.width = `${state.damage}%`;
    }

    show() {
        this.isVisible = true;
        this.elements.speedometer.style.display = 'flex';
        this.elements.nitroBar.style.display = 'block';
        this.elements.scoreDisplay.style.display = 'block';
        this.elements.gearIndicator.style.display = 'flex';
        this.elements.damageIndicator.style.display = 'block';
    }

    hide() {
        this.isVisible = false;
        this.elements.speedometer.style.display = 'none';
        this.elements.nitroBar.style.display = 'none';
        this.elements.scoreDisplay.style.display = 'none';
        this.elements.gearIndicator.style.display = 'none';
        this.elements.damageIndicator.style.display = 'none';
    }

    showMenu(options = {}) {
        if (options.title) {
            this.elements.menuTitle.textContent = options.title;
        }
        if (options.subtitle) {
            this.elements.menuSubtitle.textContent = options.subtitle;
        }

        this.elements.menuStartBtn.onclick = () => {
            if (options.onStart) options.onStart();
        };

        // Also allow Enter key to start
        this.menuKeyHandler = (e) => {
            if (e.code === 'Enter' || e.code === 'Space') {
                if (options.onStart) options.onStart();
            }
        };
        window.addEventListener('keydown', this.menuKeyHandler);

        this.elements.menuScreen.style.display = 'flex';
    }

    hideMenu() {
        this.elements.menuScreen.style.display = 'none';
        if (this.menuKeyHandler) {
            window.removeEventListener('keydown', this.menuKeyHandler);
        }
    }

    showPause() {
        this.elements.pauseOverlay.style.display = 'flex';
    }

    hidePause() {
        this.elements.pauseOverlay.style.display = 'none';
    }

    showGameOver(options = {}) {
        this.elements.gameoverScore.textContent = (options.score || 0).toLocaleString();

        this.elements.gameoverRestartBtn.onclick = () => {
            if (options.onRestart) options.onRestart();
            this.hideGameOver();
        };

        this.elements.gameoverMenuBtn.onclick = () => {
            if (options.onMenu) options.onMenu();
            this.hideGameOver();
        };

        this.elements.gameoverScreen.style.display = 'flex';
        this.hide();
    }

    hideGameOver() {
        this.elements.gameoverScreen.style.display = 'none';
    }

    showNearMiss(count = 1) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const popup = document.createElement('div');
                popup.className = 'near-miss-popup';
                popup.textContent = `NEAR MISS! +${CONFIG.SCORING.NEAR_MISS_POINTS}`;

                this.elements.nearMissContainer.appendChild(popup);

                // Remove after animation
                setTimeout(() => {
                    if (popup.parentNode) {
                        popup.parentNode.removeChild(popup);
                    }
                }, 1500);
            }, i * 100);
        }
    }
}
