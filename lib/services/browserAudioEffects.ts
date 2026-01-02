// Browser-based audio effects using Web Audio API
// 100% free, no API keys needed, runs in the browser

export interface AudioEffectParams {
  reverb?: {
    roomSize: number; // 0-1
    damping: number; // 0-1
   };
  delay?: {
    delayTime: number; // seconds
    feedback: number; // 0-1
    mix: number; // 0-1
  };
  filter?: {
    type: 'lowpass' | 'highpass' | 'bandpass' | 'notch';
    frequency: number; // Hz
    q: number; // quality factor
  };
  compressor?: {
    threshold: number; // dB
    knee: number; // dB
    ratio: number; // 1-20
    attack: number; // seconds
    release: number; // seconds
  };
  gain?: {
    value: number; // 0-2 (1 = no change)
  };
  bass?: {
    boost: number; // dB (-20 to 20)
  };
}

export class BrowserAudioEffects {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private effectNodes: AudioNode[] = [];

  /**
   * Initialize audio context with the given audio element
   */
  async initialize(audioElement: HTMLAudioElement): Promise<void> {
    this.audioElement = audioElement;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create source from audio element
    this.sourceNode = this.audioContext.createMediaElementSource(audioElement);
  }

  /**
   * Apply effects to the audio
   */
  applyEffects(effects: AudioEffectParams): void {
    if (!this.audioContext || !this.sourceNode) {
      throw new Error('Audio not initialized');
    }

    // Disconnect previous effects
    this.clearEffects();

    let currentNode: AudioNode = this.sourceNode;
    const destination = this.audioContext.destination;

    // Apply effects in order

    // 1. Bass boost (low shelf filter)
    if (effects.bass) {
      const bassBoost = this.audioContext.createBiquadFilter();
      bassBoost.type = 'lowshelf';
      bassBoost.frequency.value = 200; // Boost frequencies below 200Hz
      bassBoost.gain.value = effects.bass.boost;
      currentNode.connect(bassBoost);
      currentNode = bassBoost;
      this.effectNodes.push(bassBoost);
    }

    // 2. Filter
    if (effects.filter) {
      const filter = this.audioContext.createBiquadFilter();
      filter.type = effects.filter.type;
      filter.frequency.value = effects.filter.frequency;
      filter.Q.value = effects.filter.q;
      currentNode.connect(filter);
      currentNode = filter;
      this.effectNodes.push(filter);
    }

    // 3. Compressor
    if (effects.compressor) {
      const compressor = this.audioContext.createDynamicsCompressor();
      compressor.threshold.value = effects.compressor.threshold;
      compressor.knee.value = effects.compressor.knee;
      compressor.ratio.value = effects.compressor.ratio;
      compressor.attack.value = effects.compressor.attack;
      compressor.release.value = effects.compressor.release;
      currentNode.connect(compressor);
      currentNode = compressor;
      this.effectNodes.push(compressor);
    }

    // 4. Delay
    if (effects.delay) {
      const { delayNode, feedbackNode, wetNode, dryNode, outputNode } =
        this.createDelay(effects.delay);

      currentNode.connect(delayNode);
      currentNode.connect(dryNode);
      delayNode.connect(feedbackNode);
      feedbackNode.connect(delayNode);
      feedbackNode.connect(wetNode);
      wetNode.connect(outputNode);
      dryNode.connect(outputNode);

      currentNode = outputNode;
      this.effectNodes.push(delayNode, feedbackNode, wetNode, dryNode, outputNode);
    }

    // 5. Reverb (using convolver)
    if (effects.reverb) {
      const reverb = this.createReverb(effects.reverb);
      currentNode.connect(reverb);
      currentNode = reverb;
      this.effectNodes.push(reverb);
    }

    // 6. Gain
    if (effects.gain) {
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = effects.gain.value;
      currentNode.connect(gainNode);
      currentNode = gainNode;
      this.effectNodes.push(gainNode);
    }

    // Connect final node to destination
    currentNode.connect(destination);
  }

  /**
   * Create delay effect
   */
  private createDelay(params: { delayTime: number; feedback: number; mix: number }) {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const delayNode = this.audioContext.createDelay(5.0);
    delayNode.delayTime.value = params.delayTime;

    const feedbackNode = this.audioContext.createGain();
    feedbackNode.gain.value = params.feedback;

    const wetNode = this.audioContext.createGain();
    wetNode.gain.value = params.mix;

    const dryNode = this.audioContext.createGain();
    dryNode.gain.value = 1 - params.mix;

    const outputNode = this.audioContext.createGain();
    outputNode.gain.value = 1;

    return { delayNode, feedbackNode, wetNode, dryNode, outputNode };
  }

  /**
   * Create reverb effect using impulse response
   */
  private createReverb(params: { roomSize: number; damping: number }): ConvolverNode {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const convolver = this.audioContext.createConvolver();

    // Generate impulse response
    const rate = this.audioContext.sampleRate;
    const length = rate * params.roomSize * 3; // Up to 3 seconds reverb
    const impulse = this.audioContext.createBuffer(2, length, rate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // Exponential decay with damping
        const decay = Math.exp(-i / (length * params.damping));
        channelData[i] = (Math.random() * 2 - 1) * decay;
      }
    }

    convolver.buffer = impulse;
    return convolver;
  }

  /**
   * Analyze audio and return frequency data
   */
  getFrequencyData(): Uint8Array {
    if (!this.audioContext || !this.sourceNode) {
      return new Uint8Array(0);
    }

    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 2048;

    this.sourceNode.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    return dataArray;
  }

  /**
   * Get waveform data for visualization
   */
  getWaveformData(): Uint8Array {
    if (!this.audioContext || !this.sourceNode) {
      return new Uint8Array(0);
    }

    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 2048;

    this.sourceNode.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(dataArray);

    return dataArray;
  }

  /**
   * Clear all applied effects
   */
  clearEffects(): void {
    if (!this.sourceNode || !this.audioContext) return;

    // Disconnect all effect nodes
    this.effectNodes.forEach(node => {
      try {
        node.disconnect();
      } catch (e) {
        // Already disconnected
      }
    });

    this.effectNodes = [];

    // Reconnect source directly to destination
    this.sourceNode.connect(this.audioContext.destination);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.clearEffects();

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.audioElement = null;
  }
}

// Preset effects for common use cases
export const EffectPresets = {
  'None': {},

  'Warm': {
    bass: { boost: 3 },
    filter: { type: 'lowshelf' as const, frequency: 300, q: 1 },
    compressor: { threshold: -24, knee: 30, ratio: 3, attack: 0.003, release: 0.25 },
  },

  'Bright': {
    filter: { type: 'highshelf' as const, frequency: 2000, q: 1 },
    gain: { value: 1.1 },
  },

  'Heavy Bass': {
    bass: { boost: 8 },
    compressor: { threshold: -18, knee: 10, ratio: 4, attack: 0.003, release: 0.15 },
  },

  'Reverb Hall': {
    reverb: { roomSize: 0.8, damping: 0.5 },
    gain: { value: 0.85 },
  },

  'Echo': {
    delay: { delayTime: 0.5, feedback: 0.4, mix: 0.3 },
  },

  'Telephone': {
    filter: { type: 'bandpass' as const, frequency: 1000, q: 2 },
    gain: { value: 0.8 },
  },

  'Lo-Fi': {
    bass: { boost: 4 },
    filter: { type: 'lowpass' as const, frequency: 3000, q: 1 },
    gain: { value: 0.9 },
  },

  'Club': {
    bass: { boost: 6 },
    compressor: { threshold: -12, knee: 6, ratio: 6, attack: 0.001, release: 0.1 },
    gain: { value: 1.2 },
  },
};
