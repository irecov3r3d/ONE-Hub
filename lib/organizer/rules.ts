import type {
  OrganizerFile,
  OrganizerMovePlan,
  OrganizerRule,
  OrganizerTagResult,
} from './types';

export const DEFAULT_DESTINATION = 'Unsorted/{ext}';

const sanitizePatternList = (pattern: string) =>
  pattern
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);

const safeRegex = (pattern: string) => {
  try {
    return new RegExp(pattern, 'i');
  } catch {
    return null;
  }
};

const applyTemplate = (
  template: string,
  file: OrganizerFile,
  tag?: string,
) => {
  const date = new Date(file.modifiedAt);
  return template
    .replaceAll('{year}', String(date.getFullYear()))
    .replaceAll('{month}', String(date.getMonth() + 1).padStart(2, '0'))
    .replaceAll('{ext}', file.extension || 'misc')
    .replaceAll('{tag}', tag ?? 'misc')
    .replaceAll('{name}', file.name.replace(/\n/g, ' '));
};

const matchesRule = (
  file: OrganizerFile,
  rule: OrganizerRule,
  tagResults: Record<string, OrganizerTagResult>,
) => {
  const pattern = rule.pattern.trim();
  if (!pattern) return false;

  if (rule.matchType === 'extension') {
    const list = sanitizePatternList(pattern);
    return list.includes(file.extension.toLowerCase());
  }

  if (rule.matchType === 'nameContains') {
    const list = sanitizePatternList(pattern);
    return list.some(part => file.name.toLowerCase().includes(part));
  }

  if (rule.matchType === 'regex') {
    const regex = safeRegex(pattern);
    return regex ? regex.test(file.name) : false;
  }

  if (rule.matchType === 'tagIncludes') {
    const list = sanitizePatternList(pattern);
    const tags = tagResults[file.path]?.tags ?? [];
    return list.some(tag => tags.map(entry => entry.toLowerCase()).includes(tag));
  }

  return false;
};

export const buildMovePlan = (
  files: OrganizerFile[],
  rules: OrganizerRule[],
  tagResults: Record<string, OrganizerTagResult>,
): OrganizerMovePlan => {
  const moves = files.map(file => {
    const matchedRule = rules.find(rule => matchesRule(file, rule, tagResults));
    const destinationTemplate = matchedRule?.destinationTemplate || DEFAULT_DESTINATION;
    const tag = tagResults[file.path]?.primaryTag;
    return {
      from: file.path,
      to: applyTemplate(destinationTemplate, file, tag),
    };
  });

  return { moves };
};

export const createEmptyRule = (): OrganizerRule => ({
  id: `rule-${crypto.randomUUID()}`,
  name: 'New rule',
  matchType: 'extension',
  pattern: '',
  destinationTemplate: DEFAULT_DESTINATION,
  enabled: true,
});

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export const getRuleSummary = (rule: OrganizerRule) => {
  const typeLabel: Record<OrganizerRule['matchType'], string> = {
    extension: 'Extensions',
    nameContains: 'Name contains',
    regex: 'Regex match',
    tagIncludes: 'AI tag',
  };

  return `${typeLabel[rule.matchType]}: ${rule.pattern || 'none'} → ${rule.destinationTemplate}`;
};
