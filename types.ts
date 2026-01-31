
export enum AppType {
  BLENDER = 'Blender',
  VSCODE = 'VS Code',
  PHOTOSHOP = 'Photoshop',
  FIGMA = 'Figma',
  WINDOWS = 'Windows',
  MACOS = 'macOS',
  CHROME = 'Chrome',
  SLACK = 'Slack',
  PREMIERE = 'Premiere Pro',
  AFTEREFFECTS = 'After Effects'
}

export enum Category {
  GENERAL = 'General',
  NAVIGATION = 'Navigation',
  MODELING = 'Modeling',
  EDITING = 'Editing',
  TOOLS = 'Tools',
  VIEWPORT = 'Viewport',
  SELECTION = 'Selection',
  SYSTEM = 'System',
  FILES = 'Files',
  COMMUNICATION = 'Communication'
}

export interface User {
  id: string;
  name: string;
  email?: string;
  isGuest: boolean;
  avatar?: string;
}

export interface Shortcut {
  id: string;
  app: AppType | string;
  keys: string[];
  action: string;
  description: string;
  category: Category;
  difficulty: 'Beginner' | 'Advanced';
  author?: string;
  isCommunity?: boolean;
}

export interface ShortcutSet {
  id: string;
  name: string;
  app: AppType | string;
  description: string;
  author: string;
  shortcuts: Shortcut[];
  isCommunity: boolean;
  savedCount: number;
}

export interface UserShortcut {
  shortcutId: string;
  notes?: string;
  savedAt: number;
}

export interface SearchResult {
  shortcut?: Shortcut;
  explanation: string;
  confidence: number;
}
