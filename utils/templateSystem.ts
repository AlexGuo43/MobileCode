import { storage } from './storage';
import { LanguageDefinition } from './languageDefinitions';

interface TemplateHistory {
  functions: string[];
  classes: string[];
  variables: string[];
  conditions: string[];
  modules: string[];
  types: string[];
}

interface TemplateMatch {
  placeholder: string;
  start: number;
  end: number;
  type: 'function' | 'class' | 'variable' | 'condition' | 'module' | 'type';
}

class TemplateService {
  private history: TemplateHistory = {
    functions: ['calculate', 'process', 'handle', 'get', 'set', 'update'],
    classes: ['User', 'Data', 'Handler', 'Manager', 'Controller'],
    variables: ['result', 'data', 'value', 'item', 'index', 'temp'],
    conditions: ['x > 0', 'i < len(arr)', 'data is not None', 'result == True'],
    modules: ['os', 'sys', 'math', 'random', 'json', 'datetime'],
    types: ['int', 'string', 'bool', 'float', 'double'],
  };

  private readonly STORAGE_KEY = 'templateHistory';

  // Template placeholders to detect
  private readonly TEMPLATE_PATTERNS = {
    function: /\bfunction\b/g,
    condition: /\bcondition\b/g,
    ClassName: /\bClassName\b/g,
    module: /\bmodule\b/g,
    var: /\bvar\b/g,
    type: /\btype\b/g,
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

  getSuggestionsForType(type: TemplateMatch['type'], currentLanguage?: LanguageDefinition): string[] {
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
      case 'type':
        return this.getLanguageTypes(currentLanguage);
      default:
        return [];
    }
  }

  private getLanguageTypes(currentLanguage?: LanguageDefinition): string[] {
    // Combine language-specific types with user history
    const languageTypes = this.getTypesForLanguage(currentLanguage?.key);
    const historyTypes = this.history.types.filter(t => !languageTypes.includes(t));
    
    // Language types first, then user history
    return [...languageTypes, ...historyTypes];
  }

  private getTypesForLanguage(languageKey?: string): string[] {
    switch (languageKey) {
      case 'python':
        return ['int', 'str', 'float', 'bool', 'list', 'dict', 'set', 'tuple', 'None'];
      case 'javascript':
        return ['let', 'const', 'var', 'string', 'number', 'boolean', 'object', 'array'];
      case 'typescript':
        return ['string', 'number', 'boolean', 'object', 'array', 'any', 'void', 'null', 'undefined'];
      case 'java':
        return ['int', 'String', 'double', 'boolean', 'char', 'float', 'long', 'byte', 'ArrayList', 'HashMap'];
      case 'cpp':
        return ['int', 'string', 'double', 'bool', 'char', 'float', 'vector<int>', 'map<int, int>', 'auto'];
      case 'c':
        return ['int', 'double', 'char', 'float', 'long', 'short', 'unsigned', 'void', 'struct'];
      case 'go':
        return ['int', 'string', 'float64', 'bool', 'byte', 'rune', '[]int', 'map[string]int', 'interface{}'];
      case 'rust':
        return ['i32', 'String', 'f64', 'bool', 'char', 'u32', 'Vec<i32>', 'HashMap<String, i32>', 'Option<T>'];
      case 'csharp':
        return ['int', 'string', 'double', 'bool', 'char', 'float', 'decimal', 'List<int>', 'Dictionary<string, int>'];
      case 'php':
        return ['int', 'string', 'float', 'bool', 'array', 'object', 'null', 'mixed', 'callable'];
      default:
        return ['int', 'string', 'bool', 'float', 'double'];
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
      case 'type':
        return 'type';
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
      case 'type':
        return 'types';
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