import { storage } from './storage';

interface TemplateHistory {
  functions: string[];
  classes: string[];
  variables: string[];
  conditions: string[];
  modules: string[];
}

interface TemplateMatch {
  placeholder: string;
  start: number;
  end: number;
  type: 'function' | 'class' | 'variable' | 'condition' | 'module';
}

class TemplateService {
  private history: TemplateHistory = {
    functions: ['calculate', 'process', 'handle', 'get', 'set', 'update'],
    classes: ['User', 'Data', 'Handler', 'Manager', 'Controller'],
    variables: ['result', 'data', 'value', 'item', 'index', 'temp'],
    conditions: ['x > 0', 'i < len(arr)', 'data is not None', 'result == True'],
    modules: ['os', 'sys', 'math', 'random', 'json', 'datetime'],
  };

  private readonly STORAGE_KEY = 'templateHistory';

  // Template placeholders to detect
  private readonly TEMPLATE_PATTERNS = {
    function: /\bfunction\b/g,
    condition: /\bcondition\b/g,
    ClassName: /\bClassName\b/g,
    module: /\bmodule\b/g,
    var: /\bvar\b/g,
  };

  async initialize(): Promise<void> {
    try {
      const saved = await storage.getItem(this.STORAGE_KEY);
      if (saved) {
        const savedHistory = JSON.parse(saved);
        this.history = { ...this.history, ...savedHistory };
      }
    } catch (error) {
      console.error('Failed to load template history:', error);
    }
  }

  findTemplatesInText(text: string, cursorPosition: number): TemplateMatch[] {
    const matches: TemplateMatch[] = [];
    
    for (const [type, pattern] of Object.entries(this.TEMPLATE_PATTERNS)) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      
      while ((match = regex.exec(text)) !== null) {
        const placeholder = match[0];
        const start = match.index;
        const end = start + placeholder.length;
        
        matches.push({
          placeholder,
          start,
          end,
          type: this.getTemplateType(type),
        });
      }
    }
    
    return matches.sort((a, b) => a.start - b.start);
  }

  findTemplateAtPosition(text: string, position: number): TemplateMatch | null {
    const templates = this.findTemplatesInText(text, position);
    
    return templates.find(template => 
      position >= template.start && position <= template.end
    ) || null;
  }

  getSuggestionsForType(type: TemplateMatch['type']): string[] {
    switch (type) {
      case 'function':
        return this.history.functions;
      case 'class':
        return this.history.classes;
      case 'variable':
        return this.history.variables;
      case 'condition':
        return this.history.conditions;
      case 'module':
        return this.history.modules;
      default:
        return [];
    }
  }

  async addToHistory(type: TemplateMatch['type'], value: string): Promise<void> {
    if (!value.trim()) return;
    
    const historyKey = this.getHistoryKey(type);
    if (!this.history[historyKey].includes(value)) {
      this.history[historyKey].unshift(value);
      
      // Keep only the most recent 20 items
      if (this.history[historyKey].length > 20) {
        this.history[historyKey] = this.history[historyKey].slice(0, 20);
      }
      
      await this.saveHistory();
    }
  }

  replaceTemplate(text: string, template: TemplateMatch, replacement: string): string {
    return text.substring(0, template.start) + 
           replacement + 
           text.substring(template.end);
  }

  private getTemplateType(patternKey: string): TemplateMatch['type'] {
    switch (patternKey) {
      case 'function':
        return 'function';
      case 'ClassName':
        return 'class';
      case 'condition':
        return 'condition';
      case 'module':
        return 'module';
      case 'var':
        return 'variable';
      default:
        return 'variable';
    }
  }

  private getHistoryKey(type: TemplateMatch['type']): keyof TemplateHistory {
    switch (type) {
      case 'function':
        return 'functions';
      case 'class':
        return 'classes';
      case 'condition':
        return 'conditions';
      case 'module':
        return 'modules';
      default:
        return 'variables';
    }
  }

  private async saveHistory(): Promise<void> {
    try {
      await storage.setItem(this.STORAGE_KEY, JSON.stringify(this.history));
    } catch (error) {
      console.error('Failed to save template history:', error);
    }
  }
}

export const templateService = new TemplateService();
export type { TemplateMatch };