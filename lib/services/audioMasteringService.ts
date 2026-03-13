// Audio Mastering Service
// Provides professional mastering tools: EQ, compression, limiting, stereo enhancement

import type {
  MasteringSettings,
  EQBand,
  CompressionSettings,
  LimiterSettings,
  MidSideSettings,
  ExciterSettings,
  SaturationSettings,
  DitheringSettings,
} from '@/types';

export class AudioMasteringService {
  private audioContext: AudioContext;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  /**
   * Apply mastering settings to an audio file
   */
  async applyMastering(
    file: File,
    settings: MasteringSettings
  ): Promise<Blob> {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    // Process audio through mastering chain
    const processedBuffer = await this.processMasteringChain(audioBuffer, settings);

    // Convert back to audio file
    const blob = await this.audioBufferToWav(processedBuffer);

    return blob;
  }

  /**
   * Process audio through the complete mastering chain
   */
  private async processMasteringChain(
    audioBuffer: AudioBuffer,
    settings: MasteringSettings
  ): Promise<AudioBuffer> {
    // Extract channel data
    const channels = this.extractChannelData(audioBuffer);

    // Apply processing chain in order:
    // 1. EQ
    // 2. Compression
    // 3. Exciter/Saturation
    // 4. Stereo Processing
    // 5. Limiting
    // 6. Normalization to target LUFS
    // 7. Dithering (if needed)

    let processedChannels = channels;

    // 1. EQ
    if (settings.eqBands.some(band => band.enabled)) {
      processedChannels = this.applyEQ(processedChannels, settings.eqBands, audioBuffer.sampleRate);
    }

    // 2. Compression
    if (settings.compression.some(comp => comp.enabled)) {
      processedChannels = this.applyCompression(
        processedChannels,
        settings.compression,
        audioBuffer.sampleRate
      );
    }

    // 3. Exciter
    if (settings.exciter?.enabled) {
      processedChannels = this.applyExciter(processedChannels, settings.exciter);
    }

    // 4. Saturation
    if (settings.saturation?.enabled) {
      processedChannels = this.applySaturation(processedChannels, settings.saturation);
    }

    // 5. Stereo Processing
    if (settings.midSideProcessing.enabled) {
      processedChannels = this.applyMidSideProcessing(
        processedChannels,
        settings.midSideProcessing
      );
    }

    // 6. Limiting
    if (settings.limiting.enabled) {
      processedChannels = this.applyLimiting(
        processedChannels,
        settings.limiting,
        audioBuffer.sampleRate
      );
    }

    // 7. Normalize to target LUFS
    processedChannels = this.normalizeToLUFS(
      processedChannels,
      settings.targetLUFS,
      audioBuffer.sampleRate
    );

    // 8. Dithering
    if (settings.dithering?.enabled) {
      processedChannels = this.applyDithering(processedChannels, settings.dithering);
    }

    // Create new AudioBuffer with processed data
    const processedBuffer = this.audioContext.createBuffer(
      processedChannels.length,
      processedChannels[0].length,
      audioBuffer.sampleRate
    );

    for (let i = 0; i < processedChannels.length; i++) {
      processedBuffer.getChannelData(i).set(processedChannels[i]);
      processedBuffer.copyToChannel(processedChannels[i] as any, i);
    }

    return processedBuffer;
  }

  /**
   * Extract channel data from audio buffer
   */
  private extractChannelData(audioBuffer: AudioBuffer): Float32Array[] {
    const channels: Float32Array[] = [];
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      const channelData = audioBuffer.getChannelData(i);
      const copy = new Float32Array(channelData.length);
      copy.set(channelData);
      channels.push(copy);
    }
    return channels;
  }

  /**
   * Apply EQ to audio
   */
  private applyEQ(
    channels: Float32Array[],
    eqBands: EQBand[],
    sampleRate: number
  ): Float32Array[] {
    const processedChannels = channels.map(channel => {
      const copy = new Float32Array(channel.length);
      copy.set(channel);
      return copy;
    });

    for (const band of eqBands) {
      if (!band.enabled) continue;

      // Apply biquad filter for each EQ band
      for (let ch = 0; ch < processedChannels.length; ch++) {
        processedChannels[ch] = this.applyBiquadFilter(
          processedChannels[ch],
          band,
          sampleRate
        );
      }
    }

    return processedChannels;
  }

  /**
   * Apply biquad filter (EQ)
   */
  private applyBiquadFilter(
    input: Float32Array<ArrayBufferLike>,
    band: EQBand,
    sampleRate: number
  ): Float32Array<ArrayBuffer> {
    const output = new Float32Array(input.length);
    const coeffs = this.calculateBiquadCoefficients(band, sampleRate);

    // Apply filter (Direct Form I)
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

    for (let i = 0; i < input.length; i++) {
      const x0 = input[i];
      const y0 = coeffs.b0 * x0 + coeffs.b1 * x1 + coeffs.b2 * x2
        - coeffs.a1 * y1 - coeffs.a2 * y2;

      output[i] = y0;

      x2 = x1;
      x1 = x0;
      y2 = y1;
      y1 = y0;
    }

    return output;
  }

  /**
   * Calculate biquad filter coefficients
   */
  private calculateBiquadCoefficients(band: EQBand, sampleRate: number): {
    b0: number;
    b1: number;
    b2: number;
    a1: number;
    a2: number;
  } {
    const freq = band.frequency;
    const gain = band.gain;
    const q = band.q;

    const omega = (2 * Math.PI * freq) / sampleRate;
    const sn = Math.sin(omega);
    const cs = Math.cos(omega);
    const alpha = sn / (2 * q);
    const A = Math.pow(10, gain / 40);

    let b0 = 0, b1 = 0, b2 = 0, a0 = 0, a1 = 0, a2 = 0;

    switch (band.type) {
      case 'bell':
        b0 = 1 + alpha * A;
        b1 = -2 * cs;
        b2 = 1 - alpha * A;
        a0 = 1 + alpha / A;
        a1 = -2 * cs;
        a2 = 1 - alpha / A;
        break;

      case 'lowShelf':
        b0 = A * ((A + 1) - (A - 1) * cs + 2 * Math.sqrt(A) * alpha);
        b1 = 2 * A * ((A - 1) - (A + 1) * cs);
        b2 = A * ((A + 1) - (A - 1) * cs - 2 * Math.sqrt(A) * alpha);
        a0 = (A + 1) + (A - 1) * cs + 2 * Math.sqrt(A) * alpha;
        a1 = -2 * ((A - 1) + (A + 1) * cs);
        a2 = (A + 1) + (A - 1) * cs - 2 * Math.sqrt(A) * alpha;
        break;

      case 'highShelf':
        b0 = A * ((A + 1) + (A - 1) * cs + 2 * Math.sqrt(A) * alpha);
        b1 = -2 * A * ((A - 1) + (A + 1) * cs);
        b2 = A * ((A + 1) + (A - 1) * cs - 2 * Math.sqrt(A) * alpha);
        a0 = (A + 1) - (A - 1) * cs + 2 * Math.sqrt(A) * alpha;
        a1 = 2 * ((A - 1) - (A + 1) * cs);
        a2 = (A + 1) - (A - 1) * cs - 2 * Math.sqrt(A) * alpha;
        break;

      case 'lowPass':
        b0 = (1 - cs) / 2;
        b1 = 1 - cs;
        b2 = (1 - cs) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cs;
        a2 = 1 - alpha;
        break;

      case 'highPass':
        b0 = (1 + cs) / 2;
        b1 = -(1 + cs);
        b2 = (1 + cs) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cs;
        a2 = 1 - alpha;
        break;

      case 'notch':
        b0 = 1;
        b1 = -2 * cs;
        b2 = 1;
        a0 = 1 + alpha;
        a1 = -2 * cs;
        a2 = 1 - alpha;
        break;

      default:
        b0 = 1;
        b1 = 0;
        b2 = 0;
        a0 = 1;
        a1 = 0;
        a2 = 0;
    }

    // Normalize coefficients
    return {
      b0: b0 / a0,
      b1: b1 / a0,
      b2: b2 / a0,
      a1: a1 / a0,
      a2: a2 / a0,
    };
  }

  /**
   * Apply compression
   */
  private applyCompression(
    channels: Float32Array[],
    compSettings: CompressionSettings[],
    sampleRate: number
  ): Float32Array[] {
    let processedChannels = channels.map(ch => {
      const copy = new Float32Array(ch.length);
      copy.set(ch);
      return copy;
    });

    for (const compressor of compSettings) {
      if (!compressor.enabled) continue;

      processedChannels = this.applyCompressor(processedChannels, compressor, sampleRate);
    }

    return processedChannels;
  }

  /**
   * Apply single compressor
   */
  private applyCompressor(
    channels: Float32Array<ArrayBufferLike>[],
    settings: CompressionSettings,
    sampleRate: number
  ): Float32Array<ArrayBuffer>[] {
    const threshold = Math.pow(10, settings.threshold / 20);
    const ratio = settings.ratio;
    const attackSamples = (settings.attack / 1000) * sampleRate;
    const releaseSamples = (settings.release / 1000) * sampleRate;
    const knee = settings.knee;
    const makeupGain = Math.pow(10, settings.makeupGain / 20);

    const processedChannels = channels.map(channel => new Float32Array(channel.length));
    let envelope = 0;

    for (let i = 0; i < channels[0].length; i++) {
      // Calculate stereo RMS for envelope detection
      let sumSquares = 0;
      for (const channel of channels) {
        sumSquares += channel[i] * channel[i];
      }
      const rms = Math.sqrt(sumSquares / channels.length);

      // Envelope follower
      if (rms > envelope) {
        envelope += (rms - envelope) / attackSamples;
      } else {
        envelope += (rms - envelope) / releaseSamples;
      }

      // Calculate gain reduction
      let gainReduction = 1;
      if (envelope > threshold) {
        // Soft knee compression
        const overThreshold = envelope - threshold;
        const kneeRange = knee / 2;

        if (overThreshold < kneeRange) {
          // Soft knee region
          const kneeRatio = overThreshold / kneeRange;
          gainReduction = 1 - (kneeRatio * (1 - 1 / ratio));
        } else {
          // Above knee
          gainReduction = 1 / ratio;
        }
      }

      // Apply gain reduction and makeup gain to all channels
      for (let ch = 0; ch < channels.length; ch++) {
        processedChannels[ch][i] = channels[ch][i] * gainReduction * makeupGain;
      }
    }

    return processedChannels;
  }

  /**
   * Apply limiting
   */
  private applyLimiting(
    channels: Float32Array[],
    settings: LimiterSettings,
    sampleRate: number
  ): Float32Array[] {
    const threshold = Math.pow(10, settings.threshold / 20);
    const ceiling = Math.pow(10, settings.ceiling / 20);
    const releaseSamples = (settings.release / 1000) * sampleRate;
    const lookaheadSamples = Math.floor((settings.lookahead / 1000) * sampleRate);

    const processedChannels = channels.map(ch => new Float32Array(ch.length));
    let envelope = 0;

    for (let i = 0; i < channels[0].length; i++) {
      // Lookahead: check future samples
      let peakAhead = 0;
      for (let la = 0; la < lookaheadSamples && i + la < channels[0].length; la++) {
        for (const channel of channels) {
          peakAhead = Math.max(peakAhead, Math.abs(channel[i + la]));
        }
      }

      // Envelope follower
      if (peakAhead > envelope) {
        envelope = peakAhead; // Fast attack for limiting
      } else {
        envelope += (peakAhead - envelope) / releaseSamples;
      }

      // Calculate gain reduction
      let gainReduction = 1;
      if (envelope > threshold) {
        gainReduction = threshold / envelope;
      }

      // Apply limiting to all channels
      for (let ch = 0; ch < channels.length; ch++) {
        let sample = channels[ch][i] * gainReduction;

        // Hard clip at ceiling
        sample = Math.max(-ceiling, Math.min(ceiling, sample));

        processedChannels[ch][i] = sample;
      }
    }

    return processedChannels;
  }

  /**
   * Apply mid/side processing
   */
  private applyMidSideProcessing(
    channels: Float32Array[],
    settings: MidSideSettings
  ): Float32Array[] {
    if (channels.length < 2) {
      // Mono - no mid/side processing
      return channels;
    }

    const left = channels[0];
    const right = channels[1];
    const processedLeft = new Float32Array(left.length);
    const processedRight = new Float32Array(right.length);

    const midGain = Math.pow(10, settings.midGain / 20);
    const sideGain = Math.pow(10, settings.sideGain / 20);
    const stereoWidth = settings.stereoWidth / 100;

    for (let i = 0; i < left.length; i++) {
      // Encode to mid/side
      let mid = (left[i] + right[i]) / 2;
      let side = (left[i] - right[i]) / 2;

      // Apply gains
      mid *= midGain;
      side *= sideGain * stereoWidth;

      // Decode back to left/right
      processedLeft[i] = mid + side;
      processedRight[i] = mid - side;
    }

    return [processedLeft, processedRight];
  }

  /**
   * Apply harmonic exciter
   */
  private applyExciter(
    channels: Float32Array[],
    settings: ExciterSettings
  ): Float32Array[] {
    const amount = settings.amount / 100;
    const mix = settings.mix / 100;

    return channels.map(channel => {
      const output = new Float32Array(channel.length);

      for (let i = 0; i < channel.length; i++) {
        const input = channel[i];

        // Generate harmonics using soft clipping
        const excited = Math.tanh(input * (1 + amount * 2));

        // Mix with dry signal
        output[i] = input * (1 - mix) + excited * mix;
      }

      return output;
    });
  }

  /**
   * Apply saturation
   */
  private applySaturation(
    channels: Float32Array[],
    settings: SaturationSettings
  ): Float32Array[] {
    const drive = settings.drive / 100;
    const mix = settings.mix / 100;

    return channels.map(channel => {
      const output = new Float32Array(channel.length);

      for (let i = 0; i < channel.length; i++) {
        const input = channel[i];
        let saturated = input;

        switch (settings.type) {
          case 'tape':
            // Tape-style soft saturation
            saturated = Math.tanh(input * (1 + drive * 3));
            break;

          case 'tube':
            // Tube-style asymmetric saturation
            if (input > 0) {
              saturated = Math.tanh(input * (1 + drive * 4));
            } else {
              saturated = Math.tanh(input * (1 + drive * 2));
            }
            break;

          case 'transistor':
            // Transistor-style hard clipping
            const threshold = 0.7 - drive * 0.3;
            if (Math.abs(input) > threshold) {
              saturated = Math.sign(input) * (threshold + (Math.abs(input) - threshold) * 0.3);
            }
            break;

          case 'digital':
            // Digital-style bit reduction
            const bits = 16 - Math.floor(drive * 8);
            const steps = Math.pow(2, bits);
            saturated = Math.round(input * steps) / steps;
            break;
        }

        // Mix with dry signal
        output[i] = input * (1 - mix) + saturated * mix;
      }

      return output;
    });
  }

  /**
   * Normalize to target LUFS
   */
  private normalizeToLUFS(
    channels: Float32Array[],
    targetLUFS: number,
    sampleRate: number
  ): Float32Array[] {
    // Calculate current LUFS (simplified)
    const mono = this.convertToMono(channels);
    let sumSquares = 0;

    for (const sample of mono) {
      sumSquares += sample * sample;
    }

    const rms = Math.sqrt(sumSquares / mono.length);
    const currentLUFS = -0.691 + 10 * Math.log10(rms * rms);

    // Calculate gain adjustment
    const gainAdjustmentDB = targetLUFS - currentLUFS;
    const gainMultiplier = Math.pow(10, gainAdjustmentDB / 20);

    // Apply gain to all channels
    return channels.map(channel => {
      const output = new Float32Array(channel.length);
      for (let i = 0; i < channel.length; i++) {
        output[i] = Math.max(-1, Math.min(1, channel[i] * gainMultiplier));
      }
      return output;
    });
  }

  /**
   * Apply dithering
   */
  private applyDithering(
    channels: Float32Array[],
    settings: DitheringSettings
  ): Float32Array[] {
    if (settings.type === 'none') return channels;

    const targetBits = settings.depth;
    const steps = Math.pow(2, targetBits - 1);

    return channels.map(channel => {
      const output = new Float32Array(channel.length);

      for (let i = 0; i < channel.length; i++) {
        let sample = channel[i];

        // Add dither noise
        if (settings.type === 'triangular') {
          const dither = (Math.random() + Math.random() - 1) / steps;
          sample += dither;
        } else if (settings.type === 'shaped') {
          // Simplified noise shaping
          const dither = (Math.random() * 2 - 1) / steps;
          sample += dither;
        }

        // Quantize
        sample = Math.round(sample * steps) / steps;

        output[i] = sample;
      }

      return output;
    });
  }

  /**
   * Convert multi-channel to mono
   */
  private convertToMono(channels: Float32Array[]): Float32Array {
    if (channels.length === 1) return channels[0];

    const mono = new Float32Array(channels[0].length);
    for (let i = 0; i < mono.length; i++) {
      let sum = 0;
      for (const channel of channels) {
        sum += channel[i];
      }
      mono[i] = sum / channels.length;
    }
    return mono;
  }

  /**
   * Convert AudioBuffer to WAV blob
   */
  private async audioBufferToWav(audioBuffer: AudioBuffer): Promise<Blob> {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;

    // WAV file parameters
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const fileSize = 44 + dataSize;

    // Create ArrayBuffer for WAV file
    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    // Write WAV header
    let offset = 0;

    // "RIFF" chunk descriptor
    this.writeString(view, offset, 'RIFF'); offset += 4;
    view.setUint32(offset, fileSize - 8, true); offset += 4;
    this.writeString(view, offset, 'WAVE'); offset += 4;

    // "fmt " sub-chunk
    this.writeString(view, offset, 'fmt '); offset += 4;
    view.setUint32(offset, 16, true); offset += 4; // Sub-chunk size
    view.setUint16(offset, 1, true); offset += 2; // Audio format (1 = PCM)
    view.setUint16(offset, numberOfChannels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, byteRate, true); offset += 4;
    view.setUint16(offset, blockAlign, true); offset += 2;
    view.setUint16(offset, bytesPerSample * 8, true); offset += 2; // Bits per sample

    // "data" sub-chunk
    this.writeString(view, offset, 'data'); offset += 4;
    view.setUint32(offset, dataSize, true); offset += 4;

    // Write audio data
    const channels: Float32Array[] = [];
    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }

    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < numberOfChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Write string to DataView
   */
  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Create default mastering preset
   */
  static createDefaultPreset(): MasteringSettings {
    return {
      targetLUFS: -14,
      truePeakLimit: -1,
      eqBands: [
        {
          id: 'hp',
          enabled: true,
          frequency: 30,
          gain: 0,
          q: 0.7,
          type: 'highPass',
        },
        {
          id: 'bass',
          enabled: false,
          frequency: 100,
          gain: 0,
          q: 1.0,
          type: 'bell',
        },
        {
          id: 'mids',
          enabled: false,
          frequency: 1000,
          gain: 0,
          q: 1.0,
          type: 'bell',
        },
        {
          id: 'presence',
          enabled: false,
          frequency: 5000,
          gain: 0,
          q: 1.0,
          type: 'bell',
        },
      ],
      compression: [
        {
          id: 'main',
          enabled: false,
          threshold: -18,
          ratio: 3,
          attack: 10,
          release: 100,
          knee: 6,
          makeupGain: 0,
        },
      ],
      limiting: {
        enabled: true,
        threshold: -1,
        ceiling: -0.3,
        release: 50,
        lookahead: 5,
        oversampling: 1,
      },
      stereoWidth: 100,
      midSideProcessing: {
        enabled: false,
        midGain: 0,
        sideGain: 0,
        stereoWidth: 100,
      },
      exciter: {
        enabled: false,
        amount: 30,
        harmonics: 2,
        mix: 20,
      },
      saturation: {
        enabled: false,
        type: 'tape',
        drive: 20,
        mix: 30,
      },
      dithering: {
        enabled: false,
        type: 'triangular',
        depth: 16,
        noiseShaping: false,
      },
    };
  }

  /**
   * Create mastering preset from analysis suggestions
   */
  static createPresetFromSuggestions(
    suggestions: any
  ): MasteringSettings {
    const preset = this.createDefaultPreset();

    // Set target LUFS
    preset.targetLUFS = suggestions.targetLUFS;

    // Apply EQ suggestions
    if (suggestions.eqSuggestions) {
      for (const eqSugg of suggestions.eqSuggestions) {
        preset.eqBands.push({
          id: `eq-${eqSugg.frequency}`,
          enabled: true,
          frequency: eqSugg.frequency,
          gain: eqSugg.gain,
          q: eqSugg.q,
          type: eqSugg.type,
        });
      }
    }

    // Apply compression suggestion
    if (suggestions.compressionSuggestion) {
      preset.compression[0].enabled = true;
      preset.compression[0].threshold = suggestions.compressionSuggestion.threshold;
      preset.compression[0].ratio = suggestions.compressionSuggestion.ratio;
      preset.compression[0].attack = suggestions.compressionSuggestion.attack;
      preset.compression[0].release = suggestions.compressionSuggestion.release;
      preset.compression[0].knee = suggestions.compressionSuggestion.knee;
      preset.compression[0].makeupGain = suggestions.compressionSuggestion.makeupGain;
    }

    // Apply limiting suggestion
    if (suggestions.limitingSuggestion) {
      preset.limiting.enabled = true;
      preset.limiting.threshold = suggestions.limitingSuggestion.threshold;
      preset.limiting.ceiling = suggestions.limitingSuggestion.ceiling;
      preset.limiting.release = suggestions.limitingSuggestion.release;
    }

    // Apply stereo enhancement
    if (suggestions.stereoEnhancement) {
      preset.midSideProcessing.enabled = suggestions.stereoEnhancement.midSideProcessing;
      preset.stereoWidth = 100 + suggestions.stereoEnhancement.widthAdjustment;
    }

    return preset;
  }
}

export default AudioMasteringService;
