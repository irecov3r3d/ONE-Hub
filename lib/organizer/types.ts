export interface OrganizerFile {
  path: string;
  name: string;
  extension: string;
  size: number;
  modifiedAt: number;
}

export interface OrganizerRule {
  id: string;
  name: string;
  matchType: 'extension' | 'nameContains' | 'regex' | 'tagIncludes';
  pattern: string;
  destinationTemplate: string;
  enabled: boolean;
}

export interface OrganizerTagResult {
  path: string;
  tags: string[];
  primaryTag: string;
}

export interface OrganizerMoveItem {
  from: string;
  to: string;
}

export interface OrganizerMovePlan {
  moves: OrganizerMoveItem[];
}
