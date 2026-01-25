// ============================================
// AUDIO MANAGER - Sound effects and music using Web Audio API
// ============================================

import { CONFIG } from '../config.js';

export class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isInitialized = false;
        this.isPlaying = false;

        // Sound nodes
        this.engineOsc = null;
        this.engineGain = null;
        this.windNoise = null;
        this.windGain = null;

        // Music nodes
        this.musicGain = null;
        this.musicOscillators = [];

        // State
        this.currentRPM = 0;
        this.currentSpeed = 0;
    }

    async init() {
        try {
            // Create audio context (requires user interaction on some browsers)
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create master gain
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = CONFIG.AUDIO.MASTER_VOLUME;
            this.masterGain.connect(this.audioContext.destination);

            // Setup engine sound
            this.setupEngineSound();

            // Setup wind sound
            this.setupWindSound();

            // Setup music system
            this.setupMusic();

            this.isInitialized = true;
            console.log('Audio Manager initialized');

            // Resume on user interaction if suspended
            document.addEventListener('click', () => this.resumeContext(), { once: true });
            document.addEventListener('keydown', () => this.resumeContext(), { once: true });

        } catch (error) {
            console.warn('Audio initialization failed:', error);
        }
    }

    async resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    setupEngineSound() {
        // Engine gain node
        this.engineGain = this.audioContext.createGain();
        this.engineGain.gain.value = 0;
        this.engineGain.connect(this.masterGain);

        // Create multiple oscillators for richer engine sound
        this.engineOscillators = [];

        // Main engine tone
        const mainOsc = this.audioContext.createOscillator();
        mainOsc.type = 'sawtooth';
        mainOsc.frequency.value = 80;
        this.engineOscillators.push({ osc: mainOsc, baseFreq: 80, multiplier: 1 });

        // Harmonic 1
        const harm1 = this.audioContext.createOscillator();
        harm1.type = 'square';
        harm1.frequency.value = 160;
        this.engineOscillators.push({ osc: harm1, baseFreq: 160, multiplier: 2, gain: 0.3 });

        // Harmonic 2 (low rumble)
        const harm2 = this.audioContext.createOscillator();
        harm2.type = 'triangle';
        harm2.frequency.value = 40;
        this.engineOscillators.push({ osc: harm2, baseFreq: 40, multiplier: 0.5, gain: 0.5 });

        // Connect oscillators with individual gains
        this.engineOscillators.forEach(item => {
            const gain = this.audioContext.createGain();
            gain.gain.value = item.gain || 1;
            item.osc.connect(gain);
            gain.connect(this.engineGain);
            item.gainNode = gain;
        });
    }

    setupWindSound() {
        // Wind gain node
        this.windGain = this.audioContext.createGain();
        this.windGain.gain.value = 0;
        this.windGain.connect(this.masterGain);

        // Create white noise for wind
        const bufferSize = 2 * this.audioContext.sampleRate;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        this.windNoiseBuffer = noiseBuffer;

        // Create lowpass filter for wind
        this.windFilter = this.audioContext.createBiquadFilter();
        this.windFilter.type = 'lowpass';
        this.windFilter.frequency.value = 500;
        this.windFilter.connect(this.windGain);
    }

    setupMusic() {
        // Music gain node
        this.musicGain = this.audioContext.createGain();
        this.musicGain.gain.value = CONFIG.AUDIO.MUSIC_VOLUME;
        this.musicGain.connect(this.masterGain);
    }

    startEngine() {
        if (!this.isInitialized) return;

        this.resumeContext();

        // Start engine oscillators
        this.engineOscillators.forEach(item => {
            if (item.osc.context.state !== 'closed') {
                try {
                    item.osc.start();
                } catch (e) {
                    // Already started
                }
            }
        });

        // Fade in engine
        this.engineGain.gain.setTargetAtTime(
            CONFIG.AUDIO.ENGINE_VOLUME,
            this.audioContext.currentTime,
            0.1
        );

        // Start wind noise
        this.startWindNoise();

        this.isPlaying = true;
    }

    startWindNoise() {
        if (this.windNoise) return;

        this.windNoise = this.audioContext.createBufferSource();
        this.windNoise.buffer = this.windNoiseBuffer;
        this.windNoise.loop = true;
        this.windNoise.connect(this.windFilter);
        this.windNoise.start();
    }

    stopEngine() {
        if (!this.isInitialized) return;

        // Fade out engine
        this.engineGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.3);

        // Fade out wind
        this.windGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.3);

        this.isPlaying = false;
    }

    update(state) {
        if (!this.isInitialized || !this.isPlaying) return;

        const { rpm, speed, isDrifting, isNitro } = state;

        // Update engine frequency based on RPM (0-8000 typical range)
        const rpmNormalized = (rpm || 0) / 8000;
        const baseFreq = 60 + rpmNormalized * 200; // 60Hz to 260Hz

        this.engineOscillators.forEach(item => {
            const targetFreq = baseFreq * item.multiplier;
            item.osc.frequency.setTargetAtTime(
                targetFreq,
                this.audioContext.currentTime,
                0.05
            );
        });

        // Nitro boost effect - add higher frequencies
        const engineVolume = isNitro
            ? CONFIG.AUDIO.ENGINE_VOLUME * 1.3
            : CONFIG.AUDIO.ENGINE_VOLUME;
        this.engineGain.gain.setTargetAtTime(
            engineVolume,
            this.audioContext.currentTime,
            0.1
        );

        // Update wind based on speed
        const speedNormalized = (speed || 0) / CONFIG.PLAYER.MAX_SPEED;
        const windVolume = speedNormalized * 0.3;
        this.windGain.gain.setTargetAtTime(
            windVolume,
            this.audioContext.currentTime,
            0.2
        );

        // Update wind filter based on speed
        const windFilterFreq = 300 + speedNormalized * 2000;
        this.windFilter.frequency.setTargetAtTime(
            windFilterFreq,
            this.audioContext.currentTime,
            0.1
        );

        // Tire screech when drifting
        if (isDrifting && !this.screechNoise) {
            this.startScreech();
        } else if (!isDrifting && this.screechNoise) {
            this.stopScreech();
        }
    }

    startScreech() {
        if (!this.isInitialized || this.screechNoise) return;

        // Create filtered noise for tire screech
        const bufferSize = this.audioContext.sampleRate;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        this.screechNoise = this.audioContext.createBufferSource();
        this.screechNoise.buffer = noiseBuffer;
        this.screechNoise.loop = true;

        // Bandpass filter for screech
        const screechFilter = this.audioContext.createBiquadFilter();
        screechFilter.type = 'bandpass';
        screechFilter.frequency.value = 2000;
        screechFilter.Q.value = 5;

        const screechGain = this.audioContext.createGain();
        screechGain.gain.value = 0.15;

        this.screechNoise.connect(screechFilter);
        screechFilter.connect(screechGain);
        screechGain.connect(this.masterGain);

        this.screechNoise.start();
        this.screechGain = screechGain;
    }

    stopScreech() {
        if (this.screechNoise) {
            this.screechGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.1);
            setTimeout(() => {
                if (this.screechNoise) {
                    this.screechNoise.stop();
                    this.screechNoise = null;
                    this.screechGain = null;
                }
            }, 150);
        }
    }

    playCollision(intensity = 1) {
        if (!this.isInitialized) return;

        this.resumeContext();

        // Create impact sound - short noise burst
        const bufferSize = this.audioContext.sampleRate * 0.15;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            // Envelope: quick attack, fast decay
            const envelope = Math.exp(-i / (bufferSize * 0.1));
            output[i] = (Math.random() * 2 - 1) * envelope;
        }

        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;

        // Lowpass for thump
        const lowpass = this.audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 200 + intensity * 300;

        const gain = this.audioContext.createGain();
        gain.gain.value = Math.min(intensity, 1) * CONFIG.AUDIO.EFFECTS_VOLUME;

        noiseSource.connect(lowpass);
        lowpass.connect(gain);
        gain.connect(this.masterGain);

        noiseSource.start();

        // Add metallic clang
        const clangOsc = this.audioContext.createOscillator();
        clangOsc.type = 'square';
        clangOsc.frequency.value = 150 + Math.random() * 100;

        const clangGain = this.audioContext.createGain();
        clangGain.gain.value = 0.2 * intensity;
        clangGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.05);

        clangOsc.connect(clangGain);
        clangGain.connect(this.masterGain);

        clangOsc.start();
        clangOsc.stop(this.audioContext.currentTime + 0.1);
    }

    playNitro() {
        if (!this.isInitialized) return;

        // Whoosh sound - filtered noise sweep
        const bufferSize = this.audioContext.sampleRate * 0.5;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            const envelope = Math.sin((i / bufferSize) * Math.PI);
            output[i] = (Math.random() * 2 - 1) * envelope;
        }

        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        filter.frequency.setTargetAtTime(4000, this.audioContext.currentTime, 0.2);
        filter.Q.value = 2;

        const gain = this.audioContext.createGain();
        gain.gain.value = 0.3;

        noiseSource.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noiseSource.start();
    }

    playMusic() {
        if (!this.isInitialized) return;

        this.stopMusic();

        // Create a simple synthwave-style music loop
        // Using oscillators to create a driving beat

        const bpm = 128;
        const beatDuration = 60 / bpm;

        // Bass pattern
        this.playMusicLoop(bpm);
    }

    playMusicLoop(bpm) {
        if (!this.isInitialized) return;

        const beatDuration = 60 / bpm;
        const now = this.audioContext.currentTime;

        // Simple bass line notes (in Hz)
        const bassNotes = [82.41, 82.41, 110, 98, 82.41, 82.41, 123.47, 110]; // E2, E2, A2, G2...

        // Schedule bass notes
        bassNotes.forEach((freq, i) => {
            const startTime = now + (i * beatDuration);
            this.playBassNote(freq, startTime, beatDuration * 0.8);
        });

        // Schedule kick drum
        for (let i = 0; i < 8; i++) {
            this.playKick(now + (i * beatDuration));
        }

        // Hi-hat on off-beats
        for (let i = 0; i < 16; i++) {
            if (i % 2 === 1) {
                this.playHiHat(now + (i * beatDuration / 2));
            }
        }

        // Loop the music
        this.musicLoopTimeout = setTimeout(() => {
            if (this.isPlaying) {
                this.playMusicLoop(bpm);
            }
        }, bassNotes.length * beatDuration * 1000);
    }

    playBassNote(frequency, startTime, duration) {
        const osc = this.audioContext.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = frequency;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        const gain = this.audioContext.createGain();
        gain.gain.value = 0;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
        gain.gain.setValueAtTime(0.15, startTime + duration - 0.05);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.1);
    }

    playKick(startTime) {
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 150;
        osc.frequency.setValueAtTime(150, startTime);
        osc.frequency.exponentialRampToValueAtTime(50, startTime + 0.1);

        const gain = this.audioContext.createGain();
        gain.gain.value = 0;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(startTime);
        osc.stop(startTime + 0.2);
    }

    playHiHat(startTime) {
        // Create short noise burst for hi-hat
        const bufferSize = this.audioContext.sampleRate * 0.05;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;

        const gain = this.audioContext.createGain();
        gain.gain.value = 0.1;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        noise.start(startTime);
    }

    stopMusic() {
        if (this.musicLoopTimeout) {
            clearTimeout(this.musicLoopTimeout);
            this.musicLoopTimeout = null;
        }

        // Fade out music
        if (this.musicGain) {
            this.musicGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.2);
            setTimeout(() => {
                if (this.musicGain) {
                    this.musicGain.gain.value = CONFIG.AUDIO.MUSIC_VOLUME;
                }
            }, 500);
        }
    }

    playGameOver() {
        if (!this.isInitialized) return;

        this.resumeContext();

        // Descending tone for game over
        const osc = this.audioContext.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 440;
        osc.frequency.setTargetAtTime(110, this.audioContext.currentTime, 0.5);

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000;
        filter.frequency.setTargetAtTime(200, this.audioContext.currentTime, 0.5);

        const gain = this.audioContext.createGain();
        gain.gain.value = 0.2;
        gain.gain.setTargetAtTime(0, this.audioContext.currentTime + 0.5, 0.3);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.audioContext.currentTime + 1.5);
    }

    pause() {
        if (this.audioContext && this.audioContext.state === 'running') {
            this.audioContext.suspend();
        }
    }

    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    dispose() {
        this.stopEngine();
        this.stopMusic();
        this.stopScreech();

        if (this.audioContext) {
            this.audioContext.close();
        }

        this.isInitialized = false;
    }
}
