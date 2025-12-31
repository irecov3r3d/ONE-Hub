// Smart Response Detection Service
// Intelligent detection of AI response completion, validation, and routing

// ============================================================================
// TYPES
// ============================================================================

export interface DetectionConfig {
  // Detection method
  method: DetectionMethod;

  // Timing
  pollInterval?: number;      // How often to check (ms)
  timeout?: number;           // Max time to wait (ms)
  minWait?: number;           // Minimum wait before checking (ms)

  // Stability detection
  stableFor?: number;         // Content must be stable for this long (ms)
  stableChecks?: number;      // Number of stable checks required

  // Validation
  validation?: ValidationConfig;

  // Retry on failure
  retryOnInvalid?: boolean;
  maxRetries?: number;
  retryPrompt?: string;       // Clarification prompt for retries
}

export type DetectionMethod =
  | 'streaming-indicator'    // Look for streaming/loading indicators
  | 'content-stable'         // Wait for content to stop changing
  | 'element-appear'         // Wait for specific element to appear
  | 'element-disappear'      // Wait for loading element to disappear
  | 'text-match'            // Wait for text pattern to appear
  | 'length-threshold'      // Wait for minimum content length
  | 'custom';               // Custom detection function

export interface ValidationConfig {
  // Content requirements
  minLength?: number;
  maxLength?: number;
  mustContain?: string[];
  mustNotContain?: string[];
  pattern?: string;           // Regex pattern

  // Structure validation
  format?: ContentFormat;
  schema?: ContentSchema;

  // Custom validation
  customValidator?: string;   // JavaScript function as string
}

export type ContentFormat =
  | 'any'
  | 'text'
  | 'numbered-list'
  | 'bulleted-list'
  | 'code-block'
  | 'json'
  | 'markdown'
  | 'structured';

export interface ContentSchema {
  type: 'object' | 'array' | 'string';
  properties?: Record<string, ContentSchema>;
  items?: ContentSchema;
  required?: string[];
  minItems?: number;
  maxItems?: number;
}

export interface DetectionResult {
  success: boolean;
  content?: string;
  extractedData?: any;
  validationErrors?: string[];
  duration: number;
  retryCount: number;
}

// AI Provider-specific detection configurations
export interface ProviderDetectionConfig {
  streamingIndicator: string;
  loadingIndicator: string;
  responseContainer: string;
  codeBlockSelector: string;
  copyButtonSelector?: string;
  typingIndicator?: string;
}

// ============================================================================
// PROVIDER CONFIGURATIONS
// ============================================================================

export const PROVIDER_CONFIGS: Record<string, ProviderDetectionConfig> = {
  chatgpt: {
    streamingIndicator: '[data-message-author-role="assistant"] .result-streaming',
    loadingIndicator: '.text-token-text-secondary .animate-spin',
    responseContainer: '[data-message-author-role="assistant"]:last-child .markdown',
    codeBlockSelector: 'pre code',
    copyButtonSelector: '[data-testid="copy-code-button"]',
    typingIndicator: '.cursor-blink',
  },
  claude: {
    streamingIndicator: '[data-is-streaming="true"]',
    loadingIndicator: '.animate-pulse',
    responseContainer: '.prose:last-of-type',
    codeBlockSelector: 'pre code',
    typingIndicator: '[data-is-streaming="true"]',
  },
  gemini: {
    streamingIndicator: '.loading-indicator',
    loadingIndicator: '.pending-response',
    responseContainer: 'model-response .response-content:last-child',
    codeBlockSelector: 'code-block',
  },
  suno: {
    streamingIndicator: '.generating-indicator',
    loadingIndicator: '[class*="loading"]',
    responseContainer: '[data-track-id]',
    codeBlockSelector: '',
  },
  midjourney: {
    streamingIndicator: '.progress-bar',
    loadingIndicator: '[class*="pending"]',
    responseContainer: '[class*="imageWrapper"] img',
    codeBlockSelector: '',
  },
};

// ============================================================================
// SMART DETECTION SERVICE
// ============================================================================

export class ResponseDetectionService {
  private observers: Map<string, MutationObserver> = new Map();
  private contentHistory: Map<string, string[]> = new Map();

  // ============================================================================
  // MAIN DETECTION METHOD
  // ============================================================================

  async waitForResponse(
    provider: string,
    config: DetectionConfig,
    getContent: () => Promise<string | null>,
    getElement?: (selector: string) => Promise<Element | null>
  ): Promise<DetectionResult> {
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = config.maxRetries || 3;

    // Wait minimum time if specified
    if (config.minWait) {
      await this.delay(config.minWait);
    }

    while (retryCount <= maxRetries) {
      try {
        // Detect completion based on method
        const detected = await this.detectCompletion(
          provider,
          config,
          getContent,
          getElement
        );

        if (!detected.success) {
          return {
            success: false,
            validationErrors: ['Response detection timed out'],
            duration: Date.now() - startTime,
            retryCount,
          };
        }

        // Validate content if validation config provided
        if (config.validation && detected.content) {
          const validation = this.validateContent(detected.content, config.validation);

          if (!validation.valid) {
            if (config.retryOnInvalid && retryCount < maxRetries) {
              retryCount++;
              console.log(`Validation failed, retry ${retryCount}/${maxRetries}`);

              // Could trigger a retry prompt here if available
              await this.delay(1000);
              continue;
            }

            return {
              success: false,
              content: detected.content,
              validationErrors: validation.errors,
              duration: Date.now() - startTime,
              retryCount,
            };
          }

          return {
            success: true,
            content: detected.content,
            extractedData: validation.extractedData,
            duration: Date.now() - startTime,
            retryCount,
          };
        }

        return {
          success: true,
          content: detected.content,
          duration: Date.now() - startTime,
          retryCount,
        };
      } catch (error) {
        if (retryCount < maxRetries) {
          retryCount++;
          await this.delay(1000);
          continue;
        }
        throw error;
      }
    }

    return {
      success: false,
      validationErrors: ['Max retries exceeded'],
      duration: Date.now() - startTime,
      retryCount,
    };
  }

  // ============================================================================
  // DETECTION METHODS
  // ============================================================================

  private async detectCompletion(
    provider: string,
    config: DetectionConfig,
    getContent: () => Promise<string | null>,
    getElement?: (selector: string) => Promise<Element | null>
  ): Promise<{ success: boolean; content?: string }> {
    const timeout = config.timeout || 60000;
    const pollInterval = config.pollInterval || 500;
    const startTime = Date.now();

    const providerConfig = PROVIDER_CONFIGS[provider];

    switch (config.method) {
      case 'streaming-indicator':
        return this.waitForStreamingComplete(
          providerConfig,
          timeout,
          pollInterval,
          getContent,
          getElement
        );

      case 'content-stable':
        return this.waitForContentStable(
          config.stableFor || 2000,
          config.stableChecks || 3,
          timeout,
          pollInterval,
          getContent
        );

      case 'element-appear':
        return this.waitForElement(
          providerConfig.responseContainer,
          true,
          timeout,
          pollInterval,
          getContent,
          getElement
        );

      case 'element-disappear':
        return this.waitForElement(
          providerConfig.loadingIndicator,
          false,
          timeout,
          pollInterval,
          getContent,
          getElement
        );

      case 'text-match':
        // Wait for specific text pattern
        return this.waitForTextPattern(
          config.validation?.pattern || '',
          timeout,
          pollInterval,
          getContent
        );

      case 'length-threshold':
        return this.waitForLength(
          config.validation?.minLength || 100,
          timeout,
          pollInterval,
          getContent
        );

      default:
        // Fallback to content-stable
        return this.waitForContentStable(
          2000,
          3,
          timeout,
          pollInterval,
          getContent
        );
    }
  }

  private async waitForStreamingComplete(
    providerConfig: ProviderDetectionConfig,
    timeout: number,
    pollInterval: number,
    getContent: () => Promise<string | null>,
    getElement?: (selector: string) => Promise<Element | null>
  ): Promise<{ success: boolean; content?: string }> {
    const startTime = Date.now();

    // First wait for streaming to start
    let streamingStarted = false;
    while (Date.now() - startTime < timeout / 2) {
      if (getElement) {
        const indicator = await getElement(providerConfig.streamingIndicator);
        if (indicator) {
          streamingStarted = true;
          break;
        }
      }
      await this.delay(pollInterval);
    }

    // Then wait for streaming to complete
    while (Date.now() - startTime < timeout) {
      if (getElement) {
        const indicator = await getElement(providerConfig.streamingIndicator);
        const loading = await getElement(providerConfig.loadingIndicator);

        if (!indicator && !loading && streamingStarted) {
          // Streaming complete, get final content
          const content = await getContent();
          return { success: true, content: content || undefined };
        }
      }
      await this.delay(pollInterval);
    }

    // Timeout - try to get content anyway
    const content = await getContent();
    return { success: !!content, content: content || undefined };
  }

  private async waitForContentStable(
    stableFor: number,
    stableChecks: number,
    timeout: number,
    pollInterval: number,
    getContent: () => Promise<string | null>
  ): Promise<{ success: boolean; content?: string }> {
    const startTime = Date.now();
    let lastContent = '';
    let stableCount = 0;
    let lastChangeTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const content = await getContent();

      if (content !== lastContent) {
        lastContent = content || '';
        lastChangeTime = Date.now();
        stableCount = 0;
      } else if (content && Date.now() - lastChangeTime >= stableFor / stableChecks) {
        stableCount++;
        if (stableCount >= stableChecks) {
          return { success: true, content };
        }
      }

      await this.delay(pollInterval);
    }

    return { success: !!lastContent, content: lastContent || undefined };
  }

  private async waitForElement(
    selector: string,
    shouldExist: boolean,
    timeout: number,
    pollInterval: number,
    getContent: () => Promise<string | null>,
    getElement?: (selector: string) => Promise<Element | null>
  ): Promise<{ success: boolean; content?: string }> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (getElement) {
        const element = await getElement(selector);
        const exists = !!element;

        if (exists === shouldExist) {
          const content = await getContent();
          return { success: true, content: content || undefined };
        }
      }
      await this.delay(pollInterval);
    }

    const content = await getContent();
    return { success: false, content: content || undefined };
  }

  private async waitForTextPattern(
    pattern: string,
    timeout: number,
    pollInterval: number,
    getContent: () => Promise<string | null>
  ): Promise<{ success: boolean; content?: string }> {
    const startTime = Date.now();
    const regex = new RegExp(pattern);

    while (Date.now() - startTime < timeout) {
      const content = await getContent();
      if (content && regex.test(content)) {
        return { success: true, content };
      }
      await this.delay(pollInterval);
    }

    const content = await getContent();
    return { success: false, content: content || undefined };
  }

  private async waitForLength(
    minLength: number,
    timeout: number,
    pollInterval: number,
    getContent: () => Promise<string | null>
  ): Promise<{ success: boolean; content?: string }> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const content = await getContent();
      if (content && content.length >= minLength) {
        return { success: true, content };
      }
      await this.delay(pollInterval);
    }

    const content = await getContent();
    return { success: false, content: content || undefined };
  }

  // ============================================================================
  // CONTENT VALIDATION
  // ============================================================================

  validateContent(
    content: string,
    config: ValidationConfig
  ): { valid: boolean; errors: string[]; extractedData?: any } {
    const errors: string[] = [];
    let extractedData: any = undefined;

    // Length validation
    if (config.minLength && content.length < config.minLength) {
      errors.push(`Content too short: ${content.length} < ${config.minLength}`);
    }
    if (config.maxLength && content.length > config.maxLength) {
      errors.push(`Content too long: ${content.length} > ${config.maxLength}`);
    }

    // Must contain
    if (config.mustContain) {
      for (const term of config.mustContain) {
        if (!content.includes(term)) {
          errors.push(`Missing required text: "${term}"`);
        }
      }
    }

    // Must not contain
    if (config.mustNotContain) {
      for (const term of config.mustNotContain) {
        if (content.includes(term)) {
          errors.push(`Contains forbidden text: "${term}"`);
        }
      }
    }

    // Pattern matching
    if (config.pattern) {
      const regex = new RegExp(config.pattern);
      if (!regex.test(content)) {
        errors.push(`Content does not match pattern: ${config.pattern}`);
      }
    }

    // Format validation
    if (config.format && config.format !== 'any') {
      const formatResult = this.validateFormat(content, config.format);
      if (!formatResult.valid) {
        errors.push(...formatResult.errors);
      } else {
        extractedData = formatResult.data;
      }
    }

    // Schema validation (for JSON content)
    if (config.schema) {
      try {
        const parsed = JSON.parse(content);
        const schemaResult = this.validateSchema(parsed, config.schema);
        if (!schemaResult.valid) {
          errors.push(...schemaResult.errors);
        } else {
          extractedData = parsed;
        }
      } catch {
        errors.push('Content is not valid JSON');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      extractedData,
    };
  }

  private validateFormat(
    content: string,
    format: ContentFormat
  ): { valid: boolean; errors: string[]; data?: any } {
    const errors: string[] = [];

    switch (format) {
      case 'numbered-list': {
        const lines = content.split('\n').filter((l) => l.trim());
        const numbered = lines.filter((l) => /^\d+[\.\)]\s/.test(l.trim()));
        if (numbered.length < 2) {
          errors.push('Expected numbered list with at least 2 items');
        }
        return {
          valid: errors.length === 0,
          errors,
          data: numbered.map((l) => l.replace(/^\d+[\.\)]\s*/, '').trim()),
        };
      }

      case 'bulleted-list': {
        const lines = content.split('\n').filter((l) => l.trim());
        const bulleted = lines.filter((l) => /^[-*•]\s/.test(l.trim()));
        if (bulleted.length < 2) {
          errors.push('Expected bulleted list with at least 2 items');
        }
        return {
          valid: errors.length === 0,
          errors,
          data: bulleted.map((l) => l.replace(/^[-*•]\s*/, '').trim()),
        };
      }

      case 'code-block': {
        const codeBlockMatch = content.match(/```[\s\S]*?```/);
        if (!codeBlockMatch) {
          errors.push('Expected code block (```...```)');
        }
        return {
          valid: errors.length === 0,
          errors,
          data: codeBlockMatch?.[0]?.replace(/```\w*\n?/g, '').trim(),
        };
      }

      case 'json': {
        try {
          const data = JSON.parse(content);
          return { valid: true, errors: [], data };
        } catch {
          // Try to extract JSON from markdown code block
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) {
            try {
              const data = JSON.parse(jsonMatch[1].trim());
              return { valid: true, errors: [], data };
            } catch {
              errors.push('Invalid JSON in code block');
            }
          } else {
            errors.push('Content is not valid JSON');
          }
          return { valid: false, errors };
        }
      }

      case 'markdown': {
        // Basic markdown validation - check for headers or formatting
        const hasMarkdown =
          /^#+\s/m.test(content) ||
          /\*\*.*\*\*/.test(content) ||
          /\[.*\]\(.*\)/.test(content);
        if (!hasMarkdown) {
          errors.push('Expected markdown formatting');
        }
        return { valid: errors.length === 0, errors };
      }

      default:
        return { valid: true, errors: [] };
    }
  }

  private validateSchema(
    data: any,
    schema: ContentSchema,
    path = ''
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (schema.type === 'object') {
      if (typeof data !== 'object' || Array.isArray(data)) {
        errors.push(`${path || 'root'}: expected object`);
        return { valid: false, errors };
      }

      // Check required properties
      if (schema.required) {
        for (const prop of schema.required) {
          if (!(prop in data)) {
            errors.push(`${path || 'root'}: missing required property "${prop}"`);
          }
        }
      }

      // Validate properties
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          if (key in data) {
            const result = this.validateSchema(
              data[key],
              propSchema,
              path ? `${path}.${key}` : key
            );
            errors.push(...result.errors);
          }
        }
      }
    } else if (schema.type === 'array') {
      if (!Array.isArray(data)) {
        errors.push(`${path || 'root'}: expected array`);
        return { valid: false, errors };
      }

      if (schema.minItems && data.length < schema.minItems) {
        errors.push(`${path || 'root'}: array too short (min ${schema.minItems})`);
      }
      if (schema.maxItems && data.length > schema.maxItems) {
        errors.push(`${path || 'root'}: array too long (max ${schema.maxItems})`);
      }

      if (schema.items) {
        data.forEach((item, index) => {
          const result = this.validateSchema(item, schema.items!, `${path}[${index}]`);
          errors.push(...result.errors);
        });
      }
    } else if (schema.type === 'string') {
      if (typeof data !== 'string') {
        errors.push(`${path || 'root'}: expected string`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ============================================================================
  // AI ROUTING / DECISION MAKING
  // ============================================================================

  async analyzeResponseForRouting(
    content: string,
    options: string[],
    context?: string
  ): Promise<{ decision: string; confidence: number; reasoning: string }> {
    // Simple keyword-based routing (in production, would use actual AI)
    const lowerContent = content.toLowerCase();

    // Score each option based on keyword presence
    const scores: { option: string; score: number; matches: string[] }[] = options.map(
      (option) => {
        const keywords = option.toLowerCase().split(/[\s-_]+/);
        const matches = keywords.filter(
          (kw) => kw.length > 3 && lowerContent.includes(kw)
        );
        return {
          option,
          score: matches.length / keywords.length,
          matches,
        };
      }
    );

    // Sort by score
    scores.sort((a, b) => b.score - a.score);

    const best = scores[0];
    const confidence = best.score > 0 ? Math.min(best.score * 2, 1) : 0.5;

    return {
      decision: best.option,
      confidence,
      reasoning:
        best.matches.length > 0
          ? `Matched keywords: ${best.matches.join(', ')}`
          : 'No strong keyword matches, using first option as default',
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  cleanup(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers.clear();
    this.contentHistory.clear();
  }
}

// Singleton instance
export const responseDetection = new ResponseDetectionService();
