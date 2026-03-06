// DAW Export - Generate mastering settings for Logic Pro, Ableton, Pro Tools, FL Studio
// Export analysis data in formats that can be imported into professional DAWs

import type { MasteringSettings, AudioAnalysisResult } from '@/types';

export class DAWExportService {
  /**
   * Export for Logic Pro X (XML format)
   */
  exportForLogicPro(settings: MasteringSettings, analysis: AudioAnalysisResult): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<ChannelEQ version="1.0">\n';

    // Export EQ bands
    settings.eqBands.forEach((band, index) => {
      if (band.enabled) {
        xml += `  <Band${index + 1}>\n`;
        xml += `    <Frequency>${band.frequency}</Frequency>\n`;
        xml += `    <Gain>${band.gain}</Gain>\n`;
        xml += `    <Q>${band.q}</Q>\n`;
        xml += `    <Type>${this.convertEQTypeToLogic(band.type)}</Type>\n`;
        xml += `    <Enabled>true</Enabled>\n`;
        xml += `  </Band${index + 1}>\n`;
      }
    });

    xml += '</ChannelEQ>\n\n';

    // Compressor settings
    if (settings.compression.length > 0) {
      const comp = settings.compression[0];
      xml += '<Compressor version="1.0">\n';
      xml += `  <Threshold>${comp.threshold}</Threshold>\n`;
      xml += `  <Ratio>${comp.ratio}</Ratio>\n`;
      xml += `  <Attack>${comp.attack}</Attack>\n`;
      xml += `  <Release>${comp.release}</Release>\n`;
      xml += `  <Knee>${comp.knee}</Knee>\n`;
      xml += `  <MakeupGain>${comp.makeupGain}</MakeupGain>\n`;
      xml += '</Compressor>\n\n';
    }

    // Limiter settings
    if (settings.limiting.enabled) {
      xml += '<AdaptiveLimiter version="1.0">\n';
      xml += `  <OutputLevel>${settings.limiting.ceiling}</OutputLevel>\n`;
      xml += `  <GainReduction>${settings.limiting.threshold - settings.limiting.ceiling}</GainReduction>\n`;
      xml += `  <Release>${settings.limiting.release}</Release>\n`;
      xml += '</AdaptiveLimiter>\n';
    }

    return xml;
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
   */
  exportForProTools(settings: MasteringSettings, analysis: AudioAnalysisResult): string {
    let instructions = '=== PRO TOOLS MASTERING SETTINGS ===\n\n';

    instructions += `File: ${analysis.fileInfo.fileName}\n`;
    instructions += `Target LUFS: ${settings.targetLUFS}\n`;
    instructions += `True Peak Limit: ${settings.truePeakLimit} dBTP\n\n`;

    // Channel Strip Setup
    instructions += '--- CHANNEL STRIP (7-BAND EQ3) ---\n';
    settings.eqBands.forEach((band, index) => {
      if (band.enabled) {
        instructions += `Band ${index + 1}: ${band.frequency} Hz, ${band.gain > 0 ? '+' : ''}${band.gain} dB, Q=${band.q}, Type=${band.type}\n`;
      }
    });
    instructions += '\n';

    // Dynamics
    if (settings.compression.length > 0) {
      const comp = settings.compression[0];
      instructions += '--- DYNAMICS III (Compressor/Limiter) ---\n';
      instructions += 'Compressor Section:\n';
      instructions += `  Threshold: ${comp.threshold} dB\n`;
      instructions += `  Ratio: ${comp.ratio}:1\n`;
      instructions += `  Attack: ${comp.attack} ms\n`;
      instructions += `  Release: ${comp.release} ms\n`;
      instructions += `  Knee: ${comp.knee} dB\n`;
      instructions += `  Make-up Gain: ${comp.makeupGain} dB\n\n`;
    }

    if (settings.limiting.enabled) {
      instructions += 'Limiter Section (Maxim/L2):\n';
      instructions += `  Threshold: ${settings.limiting.threshold} dB\n`;
      instructions += `  Ceiling: ${settings.limiting.ceiling} dBFS\n`;
      instructions += `  Release: ${settings.limiting.release} ms\n\n`;
    }

    // Mid/Side Processing
    if (settings.midSideProcessing.enabled) {
      instructions += '--- MID/SIDE PROCESSING (Center) ---\n';
      instructions += `  Mid Gain: ${settings.midSideProcessing.midGain} dB\n`;
      instructions += `  Side Gain: ${settings.midSideProcessing.sideGain} dB\n`;
      instructions += `  Stereo Width: ${settings.midSideProcessing.stereoWidth}%\n\n`;
    }

    // Metering
    instructions += '--- METERING (Insight 2) ---\n';
    instructions += `  Target: ${settings.targetLUFS} LUFS\n`;
    instructions += `  True Peak Limit: ${settings.truePeakLimit} dBTP\n`;
    instructions += `  Current LUFS: ${analysis.loudness.integratedLUFS.toFixed(1)}\n`;
    instructions += `  Current True Peak: ${analysis.loudness.truePeakMax.toFixed(1)} dBTP\n\n`;

    // Analysis Data
    instructions += '--- CURRENT ANALYSIS ---\n';
    instructions += `  Integrated LUFS: ${analysis.loudness.integratedLUFS.toFixed(1)}\n`;
    instructions += `  Dynamic Range: ${analysis.loudness.dynamicRange.toFixed(1)} dB\n`;
    instructions += `  BPM: ${analysis.temporal.bpm}\n`;
    instructions += `  Key: ${analysis.musical.key}\n`;

    return instructions;
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
   */
  exportUniversalCSV(settings: MasteringSettings, analysis: AudioAnalysisResult): string {
    let csv = 'Parameter,Value,Unit,Notes\n';

    // Target Settings
    csv += `Target LUFS,${settings.targetLUFS},LUFS,\n`;
    csv += `True Peak Limit,${settings.truePeakLimit},dBTP,\n\n`;

    // EQ Settings
    csv += 'EQ Band,Frequency (Hz),Gain (dB),Q,Type,Enabled\n';
    settings.eqBands.forEach((band, i) => {
      csv += `Band ${i + 1},${band.frequency},${band.gain},${band.q},${band.type},${band.enabled}\n`;
    });
    csv += '\n';

    // Compression
    if (settings.compression.length > 0) {
      csv += 'Compression Parameter,Value,Unit\n';
      const comp = settings.compression[0];
      csv += `Threshold,${comp.threshold},dB\n`;
      csv += `Ratio,${comp.ratio},:1\n`;
      csv += `Attack,${comp.attack},ms\n`;
      csv += `Release,${comp.release},ms\n`;
      csv += `Knee,${comp.knee},dB\n`;
      csv += `Makeup Gain,${comp.makeupGain},dB\n`;
      csv += '\n';
    }

    // Limiting
    if (settings.limiting.enabled) {
      csv += 'Limiter Parameter,Value,Unit\n';
      csv += `Threshold,${settings.limiting.threshold},dB\n`;
      csv += `Ceiling,${settings.limiting.ceiling},dB\n`;
      csv += `Release,${settings.limiting.release},ms\n`;
      csv += `Lookahead,${settings.limiting.lookahead},ms\n`;
      csv += '\n';
    }

    // Stereo
    csv += 'Stereo Parameter,Value,Unit\n';
    csv += `Stereo Width,${settings.stereoWidth},%\n`;

    if (settings.midSideProcessing.enabled) {
      csv += `Mid Gain,${settings.midSideProcessing.midGain},dB\n`;
      csv += `Side Gain,${settings.midSideProcessing.sideGain},dB\n`;
    }

    return csv;
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
