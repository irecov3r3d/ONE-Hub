// DAW Export - Generate mastering settings for Logic Pro, Ableton, Pro Tools, FL Studio
// Export analysis data in formats that can be imported into professional DAWs

import type { MasteringSettings, AudioAnalysisResult } from '@/types';

export class DAWExportService {
  /**
   * Export for Logic Pro X (XML format)
   * ⚡ Bolt Optimization: Accumulates lines in an array to eliminate intermediate string allocations.
   */
  exportForLogicPro(settings: MasteringSettings, analysis: AudioAnalysisResult): string {
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<ChannelEQ version="1.0">'
    ];

    // Export EQ bands
    settings.eqBands.forEach((band, index) => {
      if (band.enabled) {
        lines.push(
          `  <Band${index + 1}>`,
          `    <Frequency>${band.frequency}</Frequency>`,
          `    <Gain>${band.gain}</Gain>`,
          `    <Q>${band.q}</Q>`,
          `    <Type>${this.convertEQTypeToLogic(band.type)}</Type>`,
          `    <Enabled>true</Enabled>`,
          `  </Band${index + 1}>`
        );
      }
    });

    lines.push('</ChannelEQ>', '');

    // Compressor settings
    if (settings.compression.length > 0) {
      const comp = settings.compression[0];
      lines.push(
        '<Compressor version="1.0">',
        `  <Threshold>${comp.threshold}</Threshold>`,
        `  <Ratio>${comp.ratio}</Ratio>`,
        `  <Attack>${comp.attack}</Attack>`,
        `  <Release>${comp.release}</Release>`,
        `  <Knee>${comp.knee}</Knee>`,
        `  <MakeupGain>${comp.makeupGain}</MakeupGain>`,
        '</Compressor>',
        ''
      );
    }

    // Limiter settings
    if (settings.limiting.enabled) {
      lines.push(
        '<AdaptiveLimiter version="1.0">',
        `  <OutputLevel>${settings.limiting.ceiling}</OutputLevel>`,
        `  <GainReduction>${settings.limiting.threshold - settings.limiting.ceiling}</GainReduction>`,
        `  <Release>${settings.limiting.release}</Release>`,
        '</AdaptiveLimiter>'
      );
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Export for Ableton Live (ALS format - simplified)
   */
  exportForAbleton(settings: MasteringSettings, analysis: AudioAnalysisResult): string {
    const preset: any = {
      name: `Mastered - ${analysis.fileInfo.fileName}`,
      devices: [],
    };

    // EQ Eight
    const eqDevice = {
      type: 'EqEight',
      parameters: settings.eqBands.map(band => ({
        frequency: band.frequency,
        gain: band.gain,
        q: band.q,
        type: band.type,
        enabled: band.enabled,
      })),
    };
    preset.devices.push(eqDevice);

    // Compressor
    if (settings.compression.length > 0) {
      const comp = settings.compression[0];
      preset.devices.push({
        type: 'Compressor',
        threshold: comp.threshold,
        ratio: comp.ratio,
        attack: comp.attack,
        release: comp.release,
        knee: comp.knee,
        makeupGain: comp.makeupGain,
      });
    }

    // Limiter
    if (settings.limiting.enabled) {
      preset.devices.push({
        type: 'Limiter',
        ceiling: settings.limiting.ceiling,
        release: settings.limiting.release,
      });
    }

    // Utility (for stereo width)
    preset.devices.push({
      type: 'Utility',
      width: settings.stereoWidth,
    });

    return JSON.stringify(preset, null, 2);
  }

  /**
   * Export for Pro Tools (TXT format with instructions)
   * ⚡ Bolt Optimization: Uses array accumulator to eliminate string re-allocation overhead.
   */
  exportForProTools(settings: MasteringSettings, analysis: AudioAnalysisResult): string {
    const lines: string[] = [
      '=== PRO TOOLS MASTERING SETTINGS ===',
      '',
      `File: ${analysis.fileInfo.fileName}`,
      `Target LUFS: ${settings.targetLUFS}`,
      `True Peak Limit: ${settings.truePeakLimit} dBTP`,
      '',
      '--- CHANNEL STRIP (7-BAND EQ3) ---'
    ];

    settings.eqBands.forEach((band, index) => {
      if (band.enabled) {
        lines.push(`Band ${index + 1}: ${band.frequency} Hz, ${band.gain > 0 ? '+' : ''}${band.gain} dB, Q=${band.q}, Type=${band.type}`);
      }
    });
    lines.push('');

    // Dynamics
    if (settings.compression.length > 0) {
      const comp = settings.compression[0];
      lines.push(
        '--- DYNAMICS III (Compressor/Limiter) ---',
        'Compressor Section:',
        `  Threshold: ${comp.threshold} dB`,
        `  Ratio: ${comp.ratio}:1`,
        `  Attack: ${comp.attack} ms`,
        `  Release: ${comp.release} ms`,
        `  Knee: ${comp.knee} dB`,
        `  Make-up Gain: ${comp.makeupGain} dB`,
        ''
      );
    }

    if (settings.limiting.enabled) {
      lines.push(
        'Limiter Section (Maxim/L2):',
        `  Threshold: ${settings.limiting.threshold} dB`,
        `  Ceiling: ${settings.limiting.ceiling} dBFS`,
        `  Release: ${settings.limiting.release} ms`,
        ''
      );
    }

    // Mid/Side Processing
    if (settings.midSideProcessing.enabled) {
      lines.push(
        '--- MID/SIDE PROCESSING (Center) ---',
        `  Mid Gain: ${settings.midSideProcessing.midGain} dB`,
        `  Side Gain: ${settings.midSideProcessing.sideGain} dB`,
        `  Stereo Width: ${settings.midSideProcessing.stereoWidth}%`,
        ''
      );
    }

    // Metering
    lines.push(
      '--- METERING (Insight 2) ---',
      `  Target: ${settings.targetLUFS} LUFS`,
      `  True Peak Limit: ${settings.truePeakLimit} dBTP`,
      `  Current LUFS: ${analysis.loudness.integratedLUFS.toFixed(1)}`,
      `  Current True Peak: ${analysis.loudness.truePeakMax.toFixed(1)} dBTP`,
      '',
      '--- CURRENT ANALYSIS ---',
      `  Integrated LUFS: ${analysis.loudness.integratedLUFS.toFixed(1)}`,
      `  Dynamic Range: ${analysis.loudness.dynamicRange.toFixed(1)} dB`,
      `  BPM: ${analysis.temporal.bpm}`,
      `  Key: ${analysis.musical.key}`
    );

    return lines.join('\n') + '\n';
  }

  /**
   * Export for FL Studio (FST format)
   */
  exportForFLStudio(settings: MasteringSettings, analysis: AudioAnalysisResult): string {
    const fstPreset = {
      name: `Mastered_${analysis.fileInfo.fileName}`,
      version: '1.0',
      plugins: [] as any[],
    };

    // Parametric EQ 2
    fstPreset.plugins.push({
      name: 'Fruity Parametric EQ 2',
      bands: settings.eqBands.map(band => ({
        freq: band.frequency,
        gain: band.gain,
        q: band.q,
        type: this.convertEQTypeToFLStudio(band.type),
        enabled: band.enabled,
      })),
    });

    // Compressor
    if (settings.compression.length > 0) {
      const comp = settings.compression[0];
      fstPreset.plugins.push({
        name: 'Fruity Compressor',
        threshold: comp.threshold,
        ratio: comp.ratio,
        attack: comp.attack,
        release: comp.release,
        gain: comp.makeupGain,
      });
    }

    // Limiter
    if (settings.limiting.enabled) {
      fstPreset.plugins.push({
        name: 'Fruity Limiter',
        ceiling: settings.limiting.ceiling,
        sustain: settings.limiting.release,
      });
    }

    // Stereo Enhancer
    fstPreset.plugins.push({
      name: 'Fruity Stereo Enhancer',
      stereoSeparation: settings.stereoWidth - 100,
    });

    return JSON.stringify(fstPreset, null, 2);
  }

  /**
   * Export universal CSV format (works with any DAW)
   * ⚡ Bolt Optimization: Uses array accumulator to avoid O(N) string re-allocations during CSV generation.
   */
  exportUniversalCSV(settings: MasteringSettings, analysis: AudioAnalysisResult): string {
    const lines: string[] = [
      'Parameter,Value,Unit,Notes',
      `Target LUFS,${settings.targetLUFS},LUFS,`,
      `True Peak Limit,${settings.truePeakLimit},dBTP,`,
      '',
      'EQ Band,Frequency (Hz),Gain (dB),Q,Type,Enabled'
    ];

    settings.eqBands.forEach((band, i) => {
      lines.push(`Band ${i + 1},${band.frequency},${band.gain},${band.q},${band.type},${band.enabled}`);
    });
    lines.push('');

    // Compression
    if (settings.compression.length > 0) {
      const comp = settings.compression[0];
      lines.push(
        'Compression Parameter,Value,Unit',
        `Threshold,${comp.threshold},dB`,
        `Ratio,${comp.ratio},:1`,
        `Attack,${comp.attack},ms`,
        `Release,${comp.release},ms`,
        `Knee,${comp.knee},dB`,
        `Makeup Gain,${comp.makeupGain},dB`,
        ''
      );
    }

    // Limiting
    if (settings.limiting.enabled) {
      lines.push(
        'Limiter Parameter,Value,Unit',
        `Threshold,${settings.limiting.threshold},dB`,
        `Ceiling,${settings.limiting.ceiling},dB`,
        `Release,${settings.limiting.release},ms`,
        `Lookahead,${settings.limiting.lookahead},ms`,
        ''
      );
    }

    // Stereo
    lines.push(
      'Stereo Parameter,Value,Unit',
      `Stereo Width,${settings.stereoWidth},%`
    );

    if (settings.midSideProcessing.enabled) {
      lines.push(
        `Mid Gain,${settings.midSideProcessing.midGain},dB`,
        `Side Gain,${settings.midSideProcessing.sideGain},dB`
      );
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Export complete analysis as JSON (universal)
   */
  exportAnalysisJSON(analysis: AudioAnalysisResult): string {
    return JSON.stringify(analysis, null, 2);
  }

  /**
   * Convert EQ type to Logic Pro format
   */
  private convertEQTypeToLogic(type: string): string {
    const map: Record<string, string> = {
      bell: 'Parametric',
      lowShelf: 'Low Shelf',
      highShelf: 'High Shelf',
      lowPass: 'Low Pass',
      highPass: 'High Pass',
      notch: 'Notch',
    };
    return map[type] || 'Parametric';
  }

  /**
   * Convert EQ type to FL Studio format
   */
  private convertEQTypeToFLStudio(type: string): number {
    const map: Record<string, number> = {
      bell: 0,
      lowShelf: 1,
      highShelf: 2,
      lowPass: 3,
      highPass: 4,
      notch: 5,
    };
    return map[type] || 0;
  }

  /**
   * Create download blob for export
   */
  createDownloadBlob(content: string, format: 'xml' | 'json' | 'txt' | 'csv'): Blob {
    const mimeTypes = {
      xml: 'application/xml',
      json: 'application/json',
      txt: 'text/plain',
      csv: 'text/csv',
    };

    return new Blob([content], { type: mimeTypes[format] });
  }

  /**
   * Generate filename for export
   */
  generateFilename(baseName: string, daw: string, format: string): string {
    const clean = baseName.replace(/[^a-zA-Z0-9]/g, '_');
    return `${clean}_${daw}_mastering.${format}`;
  }
}

export default DAWExportService;
