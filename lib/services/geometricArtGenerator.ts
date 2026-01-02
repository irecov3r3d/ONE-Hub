// Geometric pattern album art generator using Canvas API
// 100% free, no API keys needed, runs in the browser

export type ArtStyle =
  | 'waves'
  | 'circles'
  | 'polygons'
  | 'lines'
  | 'gradient'
  | 'mosaic'
  | 'spiral'
  | 'abstract';

export interface GeometricArtOptions {
  style: ArtStyle;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  complexity?: number; // 1-10
  seed?: string; // For reproducibility
}

export class GeometricArtGenerator {
  /**
   * Generate album art as a data URL
   */
  static generate(options: GeometricArtOptions): string {
    const {
      style,
      primaryColor = this.generateColorFromSeed(options.seed || '', 0),
      secondaryColor = this.generateColorFromSeed(options.seed || '', 1),
      backgroundColor = '#1a1a1a',
      complexity = 5,
      seed = Date.now().toString(),
    } = options;

    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('Canvas not supported');

    // Seed random number generator
    let seedValue = this.hashCode(seed);
    const seededRandom = () => {
      seedValue = (seedValue * 9301 + 49297) % 233280;
      return seedValue / 233280;
    };

    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, 1000, 1000);

    // Draw based on style
    switch (style) {
      case 'waves':
        this.drawWaves(ctx, primaryColor, secondaryColor, complexity, seededRandom);
        break;
      case 'circles':
        this.drawCircles(ctx, primaryColor, secondaryColor, complexity, seededRandom);
        break;
      case 'polygons':
        this.drawPolygons(ctx, primaryColor, secondaryColor, complexity, seededRandom);
        break;
      case 'lines':
        this.drawLines(ctx, primaryColor, secondaryColor, complexity, seededRandom);
        break;
      case 'gradient':
        this.drawGradient(ctx, primaryColor, secondaryColor);
        break;
      case 'mosaic':
        this.drawMosaic(ctx, primaryColor, secondaryColor, complexity, seededRandom);
        break;
      case 'spiral':
        this.drawSpiral(ctx, primaryColor, secondaryColor, complexity, seededRandom);
        break;
      case 'abstract':
        this.drawAbstract(ctx, primaryColor, secondaryColor, complexity, seededRandom);
        break;
    }

    return canvas.toDataURL('image/png');
  }

  /**
   * Draw wave patterns
   */
  private static drawWaves(
    ctx: CanvasRenderingContext2D,
    color1: string,
    color2: string,
    complexity: number,
    random: () => number
  ): void {
    const waveCount = complexity * 3;

    for (let i = 0; i < waveCount; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 500);

      const amplitude = 50 + random() * 150;
      const frequency = 0.005 + random() * 0.01;
      const phase = random() * Math.PI * 2;
      const yOffset = (i / waveCount) * 1000;

      for (let x = 0; x <= 1000; x += 5) {
        const y = yOffset + Math.sin(x * frequency + phase) * amplitude;
        ctx.lineTo(x, y);
      }

      const t = i / waveCount;
      ctx.strokeStyle = this.interpolateColor(color1, color2, t);
      ctx.lineWidth = 2 + random() * 4;
      ctx.globalAlpha = 0.3 + random() * 0.4;
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Draw concentric circles
   */
  private static drawCircles(
    ctx: CanvasRenderingContext2D,
    color1: string,
    color2: string,
    complexity: number,
    random: () => number
  ): void {
    const circleCount = complexity * 5;
    const centerX = 500 + (random() - 0.5) * 200;
    const centerY = 500 + (random() - 0.5) * 200;

    for (let i = 0; i < circleCount; i++) {
      const radius = (i / circleCount) * 700 + random() * 50;
      const t = i / circleCount;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);

      if (random() > 0.5) {
        ctx.fillStyle = this.interpolateColor(color1, color2, t);
        ctx.globalAlpha = 0.1 + random() * 0.3;
        ctx.fill();
      } else {
        ctx.strokeStyle = this.interpolateColor(color1, color2, t);
        ctx.lineWidth = 1 + random() * 3;
        ctx.globalAlpha = 0.4 + random() * 0.4;
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Draw random polygons
   */
  private static drawPolygons(
    ctx: CanvasRenderingContext2D,
    color1: string,
    color2: string,
    complexity: number,
    random: () => number
  ): void {
    const polyCount = complexity * 8;

    for (let i = 0; i < polyCount; i++) {
      const sides = Math.floor(3 + random() * 5);
      const x = random() * 1000;
      const y = random() * 1000;
      const radius = 30 + random() * 150;
      const rotation = random() * Math.PI * 2;

      ctx.beginPath();
      for (let j = 0; j <= sides; j++) {
        const angle = rotation + (j / sides) * Math.PI * 2;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }

      const t = random();
      ctx.fillStyle = this.interpolateColor(color1, color2, t);
      ctx.globalAlpha = 0.2 + random() * 0.3;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Draw geometric lines
   */
  private static drawLines(
    ctx: CanvasRenderingContext2D,
    color1: string,
    color2: string,
    complexity: number,
    random: () => number
  ): void {
    const lineCount = complexity * 20;

    for (let i = 0; i < lineCount; i++) {
      ctx.beginPath();
      ctx.moveTo(random() * 1000, random() * 1000);
      ctx.lineTo(random() * 1000, random() * 1000);

      const t = random();
      ctx.strokeStyle = this.interpolateColor(color1, color2, t);
      ctx.lineWidth = 1 + random() * 5;
      ctx.globalAlpha = 0.3 + random() * 0.4;
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Draw radial gradient
   */
  private static drawGradient(
    ctx: CanvasRenderingContext2D,
    color1: string,
    color2: string
  ): void {
    const gradient = ctx.createRadialGradient(500, 500, 100, 500, 500, 700);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(0.5, this.interpolateColor(color1, color2, 0.5));
    gradient.addColorStop(1, color2);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1000, 1000);
  }

  /**
   * Draw mosaic pattern
   */
  private static drawMosaic(
    ctx: CanvasRenderingContext2D,
    color1: string,
    color2: string,
    complexity: number,
    random: () => number
  ): void {
    const tileSize = Math.max(20, 100 - complexity * 8);

    for (let x = 0; x < 1000; x += tileSize) {
      for (let y = 0; y < 1000; y += tileSize) {
        const t = random();
        ctx.fillStyle = this.interpolateColor(color1, color2, t);
        ctx.globalAlpha = 0.5 + random() * 0.5;
        ctx.fillRect(
          x + random() * tileSize * 0.1,
          y + random() * tileSize * 0.1,
          tileSize - random() * tileSize * 0.2,
          tileSize - random() * tileSize * 0.2
        );
      }
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Draw spiral pattern
   */
  private static drawSpiral(
    ctx: CanvasRenderingContext2D,
    color1: string,
    color2: string,
    complexity: number,
    random: () => number
  ): void {
    const spirals = Math.floor(complexity / 2) + 1;

    for (let s = 0; s < spirals; s++) {
      const centerX = 500 + (random() - 0.5) * 400;
      const centerY = 500 + (random() - 0.5) * 400;

      ctx.beginPath();
      const turns = complexity;
      const pointsPerTurn = 50;
      const totalPoints = turns * pointsPerTurn;

      for (let i = 0; i < totalPoints; i++) {
        const angle = (i / pointsPerTurn) * Math.PI * 2;
        const radius = (i / totalPoints) * 400;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      const t = s / spirals;
      ctx.strokeStyle = this.interpolateColor(color1, color2, t);
      ctx.lineWidth = 2 + random() * 4;
      ctx.globalAlpha = 0.4 + random() * 0.3;
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Draw abstract composition
   */
  private static drawAbstract(
    ctx: CanvasRenderingContext2D,
    color1: string,
    color2: string,
    complexity: number,
    random: () => number
  ): void {
    // Combine multiple techniques
    this.drawGradient(ctx, color1, color2);
    ctx.globalCompositeOperation = 'overlay';
    this.drawCircles(ctx, color1, color2, complexity / 2, random);
    this.drawLines(ctx, color2, color1, complexity / 3, random);
    ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * Generate color from seed
   */
  private static generateColorFromSeed(seed: string, variant: number): string {
    const hash = this.hashCode(seed + variant.toString());
    const hue = (hash % 360 + 360) % 360;
    const saturation = 60 + (hash % 40);
    const lightness = 45 + (hash % 20);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  /**
   * Simple hash function
   */
  private static hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Interpolate between two colors
   */
  private static interpolateColor(color1: string, color2: string, t: number): string {
    const c1 = this.parseColor(color1);
    const c2 = this.parseColor(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Parse color string to RGB
   */
  private static parseColor(color: string): { r: number; g: number; b: number } {
    // Handle hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b };
    }

    // Handle hsl colors
    if (color.startsWith('hsl')) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return { r: 0, g: 0, b: 0 };

      ctx.fillStyle = color;
      const computed = ctx.fillStyle;

      // Parse rgb from computed style
      const match = computed.match(/\d+/g);
      if (match) {
        return {
          r: parseInt(match[0]),
          g: parseInt(match[1]),
          b: parseInt(match[2]),
        };
      }
    }

    // Default fallback
    return { r: 139, g: 92, b: 246 }; // Purple
  }
}
