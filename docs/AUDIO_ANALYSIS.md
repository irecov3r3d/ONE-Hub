# Audio Analysis & Mastering Tool

## Overview

The Audio Analysis & Mastering Tool is a comprehensive, browser-based solution for analyzing audio files and applying professional mastering. It provides detailed technical data that can be used to understand and recreate audio with precision.

## Features

### 1. **Full Spectrum Analysis**
- Complete frequency spectrum breakdown (20 Hz - 20 kHz)
- Frequency band analysis:
  - Sub Bass (20-60 Hz)
  - Bass (60-250 Hz)
  - Low Mids (250-500 Hz)
  - Mids (500-2000 Hz)
  - High Mids (2-4 kHz)
  - Presence (4-6 kHz)
  - Brilliance (6-20 kHz)
- Spectral characteristics:
  - Spectral Centroid (brightness indicator)
  - Spectral Rolloff
  - Spectral Flux
  - Spectral Flatness
- Dominant frequency detection with musical note mapping

### 2. **Temporal & Rhythm Analysis**
- **BPM Detection**: Automatic tempo detection with confidence scoring
- **Beat Detection**: Precise beat and downbeat timestamps
- **Time Signature**: Automatic time signature detection
- **Onset Detection**: Note attack detection for rhythm analysis
- **Section Detection**: Automatic song structure analysis (intro, verse, chorus, etc.)

### 3. **Loudness Metering (EBU R128 / ITU-R BS.1770)**
- **Integrated LUFS**: Industry-standard loudness measurement
- **Loudness Range (LRA)**: Dynamic range measurement
- **Momentary & Short-term LUFS**: Real-time loudness tracking
- **True Peak Levels**: Inter-sample peak detection
- **RMS Levels**: Average power measurement (L/R/Mid/Side)
- **Sample Peak Levels**: Digital peak detection
- **Crest Factor**: Punch and dynamics indicator
- **Dynamic Range**: Overall dynamic range measurement
- **Loudness Over Time**: Time-based loudness graph data

### 4. **Musical Features**
- **Key Detection**: Automatic musical key identification
- **Scale Detection**: Major/Minor and modal scale detection
- **Pitch Class Analysis**: Note content distribution
- **Tempo Stability**: Tempo variation measurement
- **Energy Level**: Overall track energy
- **Danceability**: Rhythmic suitability for dancing
- **Valence**: Musical positiveness/happiness
- **Acousticness**: Likelihood of acoustic instruments
- **Instrumentalness**: Likelihood of no vocals

### 5. **Stereo Field Analysis**
- **Stereo Width**: Spatial width measurement (0-200%)
- **Phase Correlation**: Mono compatibility (-1 to +1)
- **Pan Balance**: Left/Right balance
- **Mid/Side Analysis**: Mid and side signal content
- **Frequency-Dependent Stereo**: Stereo width per frequency band

### 6. **Harmonic Analysis**
- **Fundamental Frequency**: Root frequency detection
- **Harmonic Series**: Up to 10 harmonics with frequencies and magnitudes
- **Harmonic-to-Noise Ratio**: Signal purity measurement
- **Total Harmonic Distortion (THD)**: Distortion percentage
- **Inharmonicity**: Deviation from pure harmonic series
- **MFCC**: Mel-frequency cepstral coefficients for timbre analysis

### 7. **Quality Assessment**
- **Quality Score**: Overall audio quality rating (0-100)
- **Clipping Detection**: Digital clipping identification and quantification
- **Noise Floor**: Background noise level measurement
- **Signal-to-Noise Ratio (SNR)**: Signal clarity measurement
- **DC Offset Detection**: DC bias detection
- **Bit Depth Utilization**: Dynamic range usage
- **Silent Section Detection**: Gaps and silence identification
- **Issue Detection**: Automatic problem identification with severity levels

### 8. **Mastering Suggestions**
The system provides intelligent mastering recommendations based on analysis:
- **EQ Suggestions**: Specific frequency adjustments with reasons
- **Compression Settings**: Optimal dynamics processing
- **Limiting Settings**: Loudness maximization parameters
- **Stereo Enhancement**: Width and spatial adjustments
- **Target LUFS**: Recommended loudness normalization

### 9. **Auto-Mastering**
Apply professional mastering automatically based on analysis:
- **Parametric EQ**: Up to 8 bands with 6 filter types
- **Multiband Compression**: Dynamic range control
- **Brick-Wall Limiting**: Transparent loudness maximization
- **Mid/Side Processing**: Stereo field manipulation
- **Harmonic Exciter**: Subtle harmonic enhancement
- **Saturation**: Analog-style warmth (Tape/Tube/Transistor/Digital)
- **Dithering**: Bit depth reduction with noise shaping
- **LUFS Normalization**: Automatic loudness matching

## Supported Formats

- **MP3** (MPEG Audio Layer 3)
- **WAV** (Waveform Audio File Format)
- **FLAC** (Free Lossless Audio Codec)
- **OGG** (Ogg Vorbis)
- **M4A** (MPEG-4 Audio)

## How to Use

### Basic Analysis

1. **Upload Audio File**
   - Click the "Analysis" tab in the navigation
   - Click "Click to upload" or drag and drop an audio file
   - Click "Analyze Audio" button

2. **View Results**
   - Navigate through different analysis tabs:
     - **Overview**: Key metrics and issues
     - **Tempo & Timing**: BPM, beats, sections
     - **Frequency**: Spectrum and frequency distribution
     - **Loudness**: LUFS, peaks, dynamics
     - **Musical**: Key, scale, energy, mood
     - **Stereo**: Stereo field and correlation
     - **Harmonics**: Harmonic content and distortion
     - **Quality**: Issues and quality metrics
     - **Mastering**: AI-generated mastering suggestions

3. **Export Data**
   - **Export JSON**: Complete analysis data in JSON format
   - **Export Text**: Human-readable text report
   - Both formats contain all analysis data for recreation purposes

### Auto-Mastering

1. **Analyze** your audio file first
2. Review the **Mastering** tab for suggestions
3. Click **"Apply Auto-Mastering"** button
4. The mastered file will automatically download as WAV

### Manual Mastering Settings

You can create custom mastering presets by modifying the `MasteringSettings` interface:

```typescript
const customPreset: MasteringSettings = {
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
    // Add more EQ bands...
  ],
  compression: [{
    id: 'main',
    enabled: true,
    threshold: -18,
    ratio: 3,
    attack: 10,
    release: 100,
    knee: 6,
    makeupGain: 3,
  }],
  limiting: {
    enabled: true,
    threshold: -1,
    ceiling: -0.3,
    release: 50,
    lookahead: 5,
    oversampling: 1,
  },
  // ... other settings
};
```

## Technical Details

### Analysis Engine

The analysis engine uses:
- **Web Audio API**: For audio decoding and processing
- **FFT Analysis**: 8192-point FFT for frequency analysis
- **Autocorrelation**: For BPM detection
- **Biquad Filters**: For frequency band isolation
- **Envelope Following**: For dynamics analysis
- **K-Weighting**: For LUFS calculation (simplified)

### Mastering Engine

The mastering engine implements:
- **Biquad Filters**: All-pole IIR filters for EQ
- **RMS Compression**: Envelope-based dynamics processing
- **Lookahead Limiting**: Zero-latency brick-wall limiting
- **Mid/Side Encoding**: M/S stereo processing
- **Soft Clipping**: Analog-style saturation
- **TPDF Dithering**: Triangular PDF noise for bit depth reduction

### Performance

- **Client-Side Processing**: All processing happens in the browser
- **No Server Required**: Privacy-focused, no data upload
- **Real-Time Analysis**: Typical analysis time: 2-5 seconds
- **Mastering Speed**: Typical processing time: 5-15 seconds

## Data Export Formats

### JSON Export

Complete analysis data including:
- All numerical measurements
- Frequency spectrum arrays
- Temporal markers (beats, onsets)
- Quality metrics
- Mastering suggestions

Perfect for:
- Data archival
- Custom processing pipelines
- Machine learning datasets
- API integration

### Text Export

Human-readable report including:
- File information
- Key metrics summary
- Frequency distribution
- Loudness measurements
- Quality assessment
- Mastering recommendations

Perfect for:
- Documentation
- Client reports
- Archive notes
- Quick reference

## Use Cases

### Music Production
- Analyze reference tracks
- Compare mixes
- Identify frequency imbalances
- Optimize loudness
- Ensure streaming compatibility

### Audio Engineering
- Quality control
- Mastering preparation
- Technical documentation
- Client deliverables
- Archive metadata

### Sound Design
- Analyze sound effects
- Match sonic characteristics
- Create technical specs
- Reverse engineer sounds

### Education
- Learn audio fundamentals
- Study mixing techniques
- Understand mastering
- Analyze professional tracks

### Research
- Audio feature extraction
- Music information retrieval
- Dataset creation
- Algorithm development

## Limitations

- **BPM Detection**: Works best with consistent tempo (60-180 BPM)
- **Key Detection**: Simplified algorithm, may not detect complex harmonies
- **LUFS Calculation**: Simplified K-weighting (full ITU-R BS.1770 requires more complex filtering)
- **Browser Compatibility**: Requires modern browser with Web Audio API support
- **File Size**: Very large files (>100 MB) may cause performance issues
- **Sample Rate**: Analysis fidelity depends on source file sample rate

## Future Enhancements

- [ ] Advanced key detection with modal analysis
- [ ] Chord progression detection
- [ ] Vocal detection and isolation
- [ ] Genre classification
- [ ] Spectral editing capabilities
- [ ] Batch processing
- [ ] Cloud storage integration
- [ ] Real-time audio input analysis
- [ ] Plugin format export (VST/AU)
- [ ] Stem-specific mastering

## API Reference

### AudioAnalysisService

```typescript
const service = new AudioAnalysisService();
const analysis = await service.analyzeAudio(file);
const json = service.exportAsJSON(analysis);
const text = service.exportAsText(analysis);
```

### AudioMasteringService

```typescript
const service = new AudioMasteringService();
const preset = AudioMasteringService.createDefaultPreset();
const masteredBlob = await service.applyMastering(file, preset);

// Or create preset from analysis
const autoPreset = AudioMasteringService.createPresetFromSuggestions(
  analysis.masteringSuggestions
);
```

## License

This audio analysis and mastering tool is part of the ONE-Hub project and is open source.

## Credits

Built using:
- Web Audio API
- Next.js / React
- TypeScript
- Tailwind CSS

Implements standards:
- EBU R128 (Loudness)
- ITU-R BS.1770 (Loudness Measurement)
- AES (Audio Engineering Society) best practices

---

For questions, issues, or feature requests, please open an issue on GitHub.
