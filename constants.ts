
import { AppType, Category, Shortcut } from './types';

export const INITIAL_SHORTCUTS: Shortcut[] = [
  // Windows
  { id: 'w1', app: AppType.WINDOWS, keys: ['Win', 'D'], action: 'Show Desktop', description: 'Minimizes all windows to show the desktop.', category: Category.SYSTEM, difficulty: 'Beginner' },
  { id: 'w2', app: AppType.WINDOWS, keys: ['Win', 'E'], action: 'File Explorer', description: 'Opens a new File Explorer window.', category: Category.FILES, difficulty: 'Beginner' },
  { id: 'w3', app: AppType.WINDOWS, keys: ['Win', 'L'], action: 'Lock PC', description: 'Locks your computer immediately.', category: Category.SYSTEM, difficulty: 'Beginner' },
  { id: 'w4', app: AppType.WINDOWS, keys: ['Alt', 'Tab'], action: 'Switch Apps', description: 'Cycle through open applications.', category: Category.NAVIGATION, difficulty: 'Beginner' },
  { id: 'w5', app: AppType.WINDOWS, keys: ['Win', 'Shift', 'S'], action: 'Snipping Tool', description: 'Take a screenshot or screen snip.', category: Category.TOOLS, difficulty: 'Beginner' },
  { id: 'w6', app: AppType.WINDOWS, keys: ['Win', 'V'], action: 'Clipboard History', description: 'Opens your clipboard history.', category: Category.SYSTEM, difficulty: 'Advanced' },
  { id: 'w7', app: AppType.WINDOWS, keys: ['Ctrl', 'Shift', 'Esc'], action: 'Task Manager', description: 'Opens Task Manager directly.', category: Category.SYSTEM, difficulty: 'Beginner' },
  { id: 'w8', app: AppType.WINDOWS, keys: ['Win', 'X'], action: 'Quick Link Menu', description: 'Opens the hidden start context menu.', category: Category.SYSTEM, difficulty: 'Advanced' },

  // macOS
  { id: 'm1', app: AppType.MACOS, keys: ['Cmd', 'Space'], action: 'Spotlight Search', description: 'Opens the system search bar.', category: Category.SYSTEM, difficulty: 'Beginner' },
  { id: 'm2', app: AppType.MACOS, keys: ['Cmd', 'Tab'], action: 'Switch Apps', description: 'Switch between active applications.', category: Category.NAVIGATION, difficulty: 'Beginner' },
  { id: 'm3', app: AppType.MACOS, keys: ['Cmd', 'Shift', '4'], action: 'Screenshot Area', description: 'Select an area to take a screenshot.', category: Category.TOOLS, difficulty: 'Beginner' },
  { id: 'm4', app: AppType.MACOS, keys: ['Cmd', ','], action: 'Settings', description: 'Opens preferences for the current app.', category: Category.GENERAL, difficulty: 'Beginner' },
  { id: 'm5', app: AppType.MACOS, keys: ['Cmd', 'Q'], action: 'Quit App', description: 'Force closes the active application.', category: Category.SYSTEM, difficulty: 'Beginner' },
  { id: 'm6', app: AppType.MACOS, keys: ['Cmd', 'Shift', '5'], action: 'Screen Recording', description: 'Opens screen capture and recording tools.', category: Category.TOOLS, difficulty: 'Advanced' },

  // Chrome
  { id: 'c1', app: AppType.CHROME, keys: ['Ctrl', 'T'], action: 'New Tab', description: 'Opens a new browser tab.', category: Category.GENERAL, difficulty: 'Beginner' },
  { id: 'c2', app: AppType.CHROME, keys: ['Ctrl', 'Shift', 'T'], action: 'Reopen Tab', description: 'Reopens the last closed tab.', category: Category.GENERAL, difficulty: 'Beginner' },
  { id: 'c3', app: AppType.CHROME, keys: ['Ctrl', 'L'], action: 'Address Bar', description: 'Focuses the address bar.', category: Category.NAVIGATION, difficulty: 'Beginner' },
  { id: 'c4', app: AppType.CHROME, keys: ['Ctrl', 'Shift', 'N'], action: 'Incognito', description: 'Opens a new incognito window.', category: Category.SYSTEM, difficulty: 'Beginner' },

  // Slack
  { id: 's1', app: AppType.SLACK, keys: ['Ctrl', 'K'], action: 'Jump to...', description: 'Quickly find channels or people.', category: Category.COMMUNICATION, difficulty: 'Beginner' },
  { id: 's2', app: AppType.SLACK, keys: ['Alt', 'Up'], action: 'Previous Channel', description: 'Navigate to previous channel.', category: Category.NAVIGATION, difficulty: 'Beginner' },

  // Blender
  { id: 'b1', app: AppType.BLENDER, keys: ['G'], action: 'Grab / Move', description: 'Moves the selected object or geometry.', category: Category.MODELING, difficulty: 'Beginner' },
  { id: 'b2', app: AppType.BLENDER, keys: ['R'], action: 'Rotate', description: 'Rotates the selected object or geometry.', category: Category.MODELING, difficulty: 'Beginner' },
  { id: 'b3', app: AppType.BLENDER, keys: ['S'], action: 'Scale', description: 'Scales the selected object or geometry.', category: Category.MODELING, difficulty: 'Beginner' },
  { id: 'b12', app: AppType.BLENDER, keys: ['Ctrl', 'J'], action: 'Join Objects', description: 'Joins selected objects into one.', category: Category.MODELING, difficulty: 'Advanced' },

  // Community Examples
  { id: 'com1', app: AppType.VSCODE, keys: ['Ctrl', 'Alt', 'L'], action: 'Format Document', description: 'Auto-formats code using Prettier.', category: Category.EDITING, difficulty: 'Beginner', author: 'Sarah_Dev', isCommunity: true },
  { id: 'com2', app: AppType.FIGMA, keys: ['Alt', '2'], action: 'Assets Panel', description: 'Quick access to library assets.', category: Category.VIEWPORT, difficulty: 'Advanced', author: 'DesignKing', isCommunity: true }
];

export const APP_CONFIG: Record<string, { color: string; icon: string; description: string }> = {
  [AppType.BLENDER]: { color: 'bg-orange-500', icon: '🧊', description: '3D Creation Suite' },
  [AppType.VSCODE]: { color: 'bg-blue-600', icon: '💻', description: 'Code Editor' },
  [AppType.PHOTOSHOP]: { color: 'bg-blue-800', icon: '🎨', description: 'Photo Editing' },
  [AppType.FIGMA]: { color: 'bg-purple-500', icon: '✨', description: 'UI Design' },
  [AppType.WINDOWS]: { color: 'bg-sky-500', icon: '🪟', description: 'Windows OS' },
  [AppType.MACOS]: { color: 'bg-slate-800', icon: '🍎', description: 'macOS' },
  [AppType.CHROME]: { color: 'bg-emerald-500', icon: '🌐', description: 'Web Browser' },
  [AppType.SLACK]: { color: 'bg-rose-500', icon: '💬', description: 'Team Chat' },
  [AppType.PREMIERE]: { color: 'bg-purple-900', icon: '📽️', description: 'Video Editing' },
  [AppType.AFTEREFFECTS]: { color: 'bg-indigo-900', icon: '💥', description: 'Motion Graphics' }
};
