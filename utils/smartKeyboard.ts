import { storage } from './storage';
import { KeyboardButton } from '../components/KeyboardCustomizer';
import { templateService } from './templateSystem';

interface TypingContext {
  lastWord: string;
  currentLine: string;
  isNewLine: boolean;
  lineIndentation: number;
}

interface ButtonUsage {
  buttonId: string;
  count: number;
  lastUsed: number;
  contexts: string[];
}

interface SmartPrediction {
  button: KeyboardButton;
  score: number;
  reason: 'recent' | 'contextual' | 'frequency' | 'newline';
}

class SmartKeyboardService {
  private usageData: Map<string, ButtonUsage> = new Map();
  private readonly STORAGE_KEY = 'smartKeyboardUsage';
  private readonly MAX_CONTEXTS_PER_BUTTON = 10;
  private readonly DECAY_FACTOR = 0.9;

  async initialize(): Promise<void> {
    try {
      const saved = await storage.getItem(this.STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this.usageData = new Map(Object.entries(data).map(([k, v]) => [k, v as ButtonUsage]));
      }
    } catch (error) {
      console.error('Failed to load smart keyboard data:', error);
    }
  }

  async recordButtonUsage(button: KeyboardButton, context: TypingContext): Promise<void> {
    // No longer recording usage data since we removed frequency-based suggestions
    // This keeps the function signature intact but removes the storage overhead
  }

  // Get smart text for a button based on context
  getSmartButtonText(button: KeyboardButton, context: TypingContext): string {
    // Smart colon handling for control flow statements
    if (button.label === ':') {
      const currentLine = context.currentLine.toLowerCase();
      
      // Check if this is a control flow statement that needs indentation
      const isControlFlow = /\b(for|if|elif|else|while|def|class|try|except|finally|with)\b/.test(currentLine);
      
      if (isControlFlow) {
        return ':\n    '; // Colon + newline + 4 spaces indentation
      }
    }
    
    // Default to the button's original text
    return button.text;
  }

  getSmartPredictions(
    allTabs: any[],
    context: TypingContext,
    limit: number = 6
  ): SmartPrediction[] {
    // Collect all buttons from all tabs
    const allButtons: KeyboardButton[] = [];
    for (const tab of allTabs) {
      if (tab.data) {
        allButtons.push(...tab.data);
      }
    }
    const predictions: SmartPrediction[] = [];

    for (const button of allButtons) {
      let score = 0;
      let reason: SmartPrediction['reason'] = 'contextual';

      // Priority 1: Contextual sequences (highest priority)
      const sequenceScore = this.getSequenceScore(button, context);
      if (sequenceScore > 0) {
        score = sequenceScore;
        reason = 'contextual';
      }
      // Priority 2: New line suggestions (only if no contextual match and on new line)
      else if (context.isNewLine) {
        const newLineScore = this.getNewLineScore(button);
        if (newLineScore > 0) {
          score = newLineScore;
          reason = 'newline';
        }
      }
      // No more frequency/recent usage suggestions - they add noise

      if (score > 0) {
        predictions.push({ button, score, reason });
      }
    }

    return predictions
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private getNewLineScore(button: KeyboardButton): number {
    const commonStarters: Record<string, number> = {
      'if': 0.9,
      'for': 0.8,
      'while': 0.7,
      'def': 0.6,
      'class': 0.6,
      'var': 0.6,
      'try': 0.5,
      'import': 0.5,
      'from': 0.5,
      'print': 0.4,
      '=': 0.3,
    };

    return commonStarters[button.label.toLowerCase()] || 0;
  }

  // Removed unused frequency-based scoring functions

  private getSequenceScore(button: KeyboardButton, context: TypingContext): number {
    const currentLine = context.currentLine.toLowerCase();
    const buttonLabel = button.label.toLowerCase();
    
    // Enhanced context-aware sequence scoring
    const score = this.getContextualScore(currentLine, buttonLabel);
    if (score > 0) return score;
    
    // Check if the last operator was =, +=, -=, etc.
    const operatorMatch = currentLine.match(/[+\-*/%]?=\s*$/);
    if (operatorMatch) {
      const operator = operatorMatch[0].trim();
      const sequences = this.getCommonSequences();
      if (sequences[operator] && sequences[operator].includes(buttonLabel)) {
        const index = sequences[operator].indexOf(buttonLabel);
        return 1.0 - (index * 0.1); // Higher score for earlier matches
      }
    }
    
    // Fallback to simple last word sequences
    if (!context.lastWord) return 0;
    
    // Don't suggest var operations when inside function calls
    if (context.lastWord.toLowerCase() === 'var' && /\w+\([^)]*$/.test(currentLine)) {
      return 0; // Don't suggest var operations inside function calls
    }
    
    const sequences = this.getCommonSequences();
    const lastWord = context.lastWord.toLowerCase().trim();
    
    if (sequences[lastWord]) {
      const expectedNext = sequences[lastWord];
      
      if (expectedNext.includes(buttonLabel)) {
        const index = expectedNext.indexOf(buttonLabel);
        return 1.0 - (index * 0.1); // Higher score for earlier matches
      }
    }
    
    return 0;
  }

  private getContextualScore(currentLine: string, buttonLabel: string): number {
    // Helper function to check if parentheses are balanced
    const hasUnmatchedParens = (text: string): boolean => {
      let count = 0;
      for (const char of text) {
        if (char === '(') count++;
        if (char === ')') count--;
      }
      return count > 0;
    };

    // For loop progression: for -> var/i -> in -> range( -> var -> ) -> :
    if (currentLine.includes('for ') && !currentLine.includes(' in ')) {
      if (currentLine.match(/for\s+\w+\s*$/) && buttonLabel === 'in') {
        return 1.0; // Perfect match: "for i" + "in"
      }
      if (currentLine.match(/for\s*$/) && buttonLabel === 'i') {
        return 1.0; // Perfect match: "for" + "i" (most common)
      }
      if (currentLine.match(/for\s*$/) && buttonLabel === 'var') {
        return 0.9; // Good match: "for" + template variable
      }
    }

    if (currentLine.includes('for ') && currentLine.includes(' in ') && !currentLine.includes('(')) {
      if (currentLine.match(/for\s+\w+\s+in\s*$/) && ['range', 'enumerate', 'zip'].includes(buttonLabel)) {
        return 1.0; // Perfect: "for i in" + iterable function
      }
    }

    // Iterable function parameters (range, enumerate, zip)
    if (currentLine.includes('range(')) {
      // Check if we're inside range() and need parameters
      if (currentLine.match(/range\(\s*$/) && ['10', '0', '1', 'len'].includes(buttonLabel)) {
        return 0.9; // Good: "range(" + number or len
      }
      // Check if we need to close range parentheses
      if (hasUnmatchedParens(currentLine) && currentLine.includes('range(') && buttonLabel === ')') {
        return 1.0; // Perfect: close range parenthesis
      }
    }

    if (currentLine.includes('enumerate(')) {
      // Check if we're inside enumerate() and need parameters
      if (currentLine.match(/enumerate\(\s*$/) && ['var', 'list', 'arr'].includes(buttonLabel)) {
        return 0.9; // Good: "enumerate(" + iterable
      }
      // Check if we need to close enumerate parentheses
      if (hasUnmatchedParens(currentLine) && currentLine.includes('enumerate(') && buttonLabel === ')') {
        return 1.0; // Perfect: close enumerate parenthesis
      }
    }

    if (currentLine.includes('zip(')) {
      // Check if we're inside zip() and need parameters
      if (currentLine.match(/zip\(\s*$/) && ['var', 'list', 'arr'].includes(buttonLabel)) {
        return 0.9; // Good: "zip(" + iterable
      }
      // Check if we need to close zip parentheses
      if (hasUnmatchedParens(currentLine) && currentLine.includes('zip(') && buttonLabel === ')') {
        return 1.0; // Perfect: close zip parenthesis
      }
    }

    // len() function parameters
    if (currentLine.includes('len(')) {
      // Check if we're inside len() and need parameters  
      if (currentLine.match(/len\(\s*$/) && buttonLabel === 'var') {
        return 1.0; // Perfect: "len(" + template variable
      }
      // Check if we need to close len parentheses
      if (hasUnmatchedParens(currentLine) && currentLine.includes('len(') && buttonLabel === ')') {
        return 1.0; // Perfect: close len parenthesis
      }
    }

    // After complete iterable function calls, suggest colon for for-loops
    if (currentLine.includes('for ') && !hasUnmatchedParens(currentLine) && !currentLine.includes(':')) {
      if ((currentLine.includes('range(') || currentLine.includes('len(') || currentLine.includes('enumerate(') || currentLine.includes('zip(')) && buttonLabel === ':') {
        return 1.0; // Perfect: complete for loop + ":"
      }
    }

    // If statement progression: if -> condition -> :
    if (currentLine.includes('if ') && !currentLine.includes(':')) {
      if (currentLine.match(/if\s*$/) && buttonLabel === 'condition') {
        return 1.0; // Perfect: "if" + template condition
      }
      if (currentLine.match(/if\s+[^:]+$/) && !hasUnmatchedParens(currentLine) && buttonLabel === ':') {
        return 1.0; // Perfect: complete if condition + ":"
      }
    }

    // General function call progression: function -> ( -> params -> )
    const functionPattern = /\b(print|int|str|input)\(/;
    if (functionPattern.test(currentLine)) {
      const match = currentLine.match(/\b(print|int|str|input)\(/);
      if (match) {
        const afterFunction = currentLine.substring(currentLine.indexOf(match[0]) + match[0].length);
        
        // If just opened function call, suggest parameters
        if (afterFunction.trim() === '' && buttonLabel === 'var') {
          return 0.9; // Good: function parameters with template
        }
        // If function has parameters, suggest closing
        if (hasUnmatchedParens(currentLine) && buttonLabel === ')') {
          return 0.9; // Good: close function call
        }
      }
    }

    // Function name completion - expanded list
    const functionNames = ['print', 'len', 'int', 'str', 'input', 'range', 'enumerate', 'zip', 'list', 'dict', 'set', 'tuple', 'type', 'bool', 'float', 'open', 'max', 'min', 'sum', 'abs', 'round', 'sorted', 'reversed'];
    if (functionNames.some(fn => currentLine.endsWith(fn))) {
      if (buttonLabel === '(') {
        return 1.0; // Perfect: function + "("
      }
    }

    // Assignment progression: var = value
    if (currentLine.includes('=') && !currentLine.includes('==')) {
      if (currentLine.match(/=\s*$/) && ['0', '1', '[', '{', '(', 'input', 'int', 'str', '"', "'"].includes(buttonLabel)) {
        return 0.9; // Good: assignment + value
      }
    }

    return 0;
  }

  private isInlineContext(context: TypingContext): boolean {
    // Consider it inline if there's meaningful content on the current line
    const trimmedLine = context.currentLine.trim();
    return trimmedLine.length > 0 && !context.isNewLine;
  }

  private getCommonSequences(): Record<string, string[]> {
    return {
      // Control flow
      'for': ['i', 'var'],
      'i': ['in'],
      'var': ['in', '=', '+', '-', '*', '/', '%', '<', '>', '<=', '>='],
      'if': ['condition', 'var'],
      'elif': ['condition', 'var'],
      'else': [':'],
      'while': ['condition', 'var'],
      'condition': [':', '==', '!=', '<', '>', '<=', '>=', 'and', 'or', 'not'],
      'try': [':'],
      'except': [':', 'Exception'],
      'finally': [':'],
      'with': ['open'],
      'break': [],
      'continue': [],
      'pass': [],
      'return': ['var', '0', '1', 'None', 'True', 'False', '[', '{', '('],

      // Iterables and containers
      'in': ['range', 'enumerate', 'zip', '[]', '{}', 'var'],
      'range': ['('],
      'enumerate': ['('],
      'zip': ['('],
      'len': ['('],
      
      // Functions and classes
      'def': ['function'],
      'function': ['('],
      'class': ['ClassName'],
      'lambda': ['var'],
      
      // I/O and built-ins
      'print': ['('],
      'input': ['('],
      'open': ['('],
      
      // Type constructors
      'int': ['('],
      'str': ['('],
      'float': ['('],
      'bool': ['('],
      'list': ['('],
      'dict': ['('],
      'set': ['('],
      'tuple': ['('],
      'type': ['('],
      
      // Imports
      'import': ['module', 'os', 'sys', 'math', 'random', 'json', 'datetime'],
      'from': ['module', 'os', 'sys', 'math', 'random', 'json', 'datetime'],
      'as': ['var'],
      
      // Operators and comparisons
      '=': ['var', '0', '1', '[', '{', '(', 'input', 'int', 'str', 'float', 'bool', '"', "'", 'None', 'True', 'False'],
      '+=': ['1', '0', 'var'],
      '-=': ['1', '0', 'var'],
      '*=': ['2', '0', 'var'],
      '/=': ['2', '0', 'var'],
      '==': ['0', '1', 'None', 'True', 'False', 'var', '"', "'"],
      '!=': ['0', '1', 'None', 'True', 'False', 'var', '"', "'"],
      '<': ['0', '1', 'len', 'var'],
      '>': ['0', '1', 'len', 'var'],
      '<=': ['0', '1', 'len', 'var'],
      '>=': ['0', '1', 'len', 'var'],
      
      // Logical operators
      'and': ['var', 'not'],
      'or': ['var', 'not'],
      'not': ['var', 'in'],
      'is': ['None', 'True', 'False', 'not'],
      
      // String operations
      '"': ['+', ',', ')', ']', '}'],
      "'": ['+', ',', ')', ']', '}'],
      
      // Container operations
      '[': [']', '0', '1', 'var', '"', "'"],
      '{': ['}', '"', "'", 'var'],
      '(': [')', 'var', '0', '1', '"', "'"],
      
      // Common methods (would be triggered by dot notation in real implementation)
      'append': ['('],
      'extend': ['('],
      'insert': ['('],
      'remove': ['('],
      'pop': ['('],
      'index': ['('],
      'count': ['('],
      'sort': ['('],
      'reverse': ['('],
      'split': ['('],
      'join': ['('],
      'replace': ['('],
      'strip': ['('],
      'upper': ['('],
      'lower': ['('],
      'find': ['('],
      'startswith': ['('],
      'endswith': ['('],
      
      // Exception handling
      'Exception': ['('],
      'ValueError': ['('],
      'TypeError': ['('],
      'IndexError': ['('],
      'KeyError': ['('],
      
      // Common patterns
      'True': [],
      'False': [],
      'None': [],
      'self': ['.', '[', '='],
      '__init__': ['('],
      '__str__': ['('],
      '__repr__': ['('],
      '__len__': ['('],
    };
  }

  // Removed unused context similarity and storage functions

  async clearData(): Promise<void> {
    this.usageData.clear();
    await storage.removeItem(this.STORAGE_KEY);
  }
}

export const smartKeyboardService = new SmartKeyboardService();
export type { TypingContext, SmartPrediction };