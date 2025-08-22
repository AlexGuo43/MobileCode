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
    const contextString = this.contextToString(context);
    const existing = this.usageData.get(button.id);
    
    if (existing) {
      existing.count += 1;
      existing.lastUsed = Date.now();
      existing.contexts.unshift(contextString);
      if (existing.contexts.length > this.MAX_CONTEXTS_PER_BUTTON) {
        existing.contexts = existing.contexts.slice(0, this.MAX_CONTEXTS_PER_BUTTON);
      }
    } else {
      this.usageData.set(button.id, {
        buttonId: button.id,
        count: 1,
        lastUsed: Date.now(),
        contexts: [contextString],
      });
    }

    await this.saveUsageData();
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
    const now = Date.now();

    for (const button of allButtons) {
      let score = 0;
      let reason: SmartPrediction['reason'] = 'frequency';

      // Priority 1: Contextual sequences (highest priority)
      const sequenceScore = this.getSequenceScore(button, context);
      if (sequenceScore > 0) {
        score = sequenceScore * 2; // Boost contextual matches
        reason = 'contextual';
      }
      // Priority 2: New line suggestions (only if no contextual match)
      else if (context.isNewLine) {
        const newLineScore = this.getNewLineScore(button);
        if (newLineScore > 0) {
          score = newLineScore;
          reason = 'newline';
        }
      }
      // Priority 3: Recent usage (only if not inline and no better match)
      else if (!this.isInlineContext(context)) {
        const usage = this.usageData.get(button.id);
        if (usage) {
          const recencyScore = this.getRecencyScore(usage.lastUsed, now);
          if (recencyScore > 0.5) { // Only very recent usage
            score = recencyScore * 0.3; // Lower than contextual
            reason = 'recent';
          }
        }
      }

      if (score > 0) {
        predictions.push({ button, score, reason });
      }
    }

    return predictions
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private getNewLineScore(button: KeyboardButton): number {
    const commonStarters = {
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

  private getRecencyScore(lastUsed: number, now: number): number {
    const daysDiff = (now - lastUsed) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.pow(this.DECAY_FACTOR, daysDiff));
  }

  private getContextScore(contexts: string[], currentContext: TypingContext): number {
    const currentContextString = this.contextToString(currentContext);
    let score = 0;

    for (const context of contexts) {
      if (this.contextSimilarity(context, currentContextString) > 0.7) {
        score += 0.3;
      }
    }

    return Math.min(score, 1.0);
  }

  private getSequenceScore(button: KeyboardButton, context: TypingContext): number {
    const currentLine = context.currentLine.toLowerCase();
    const buttonLabel = button.label.toLowerCase();
    
    // Enhanced context-aware sequence scoring
    const score = this.getContextualScore(currentLine, buttonLabel);
    if (score > 0) return score;
    
    // Fallback to simple last word sequences
    if (!context.lastWord) return 0;
    
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

    if (currentLine.includes('for ') && currentLine.includes(' in ') && !currentLine.includes('range(')) {
      if (currentLine.match(/for\s+\w+\s+in\s*$/) && buttonLabel === 'range') {
        return 1.0; // Perfect: "for i in" + "range"
      }
    }

    // Range function parameters
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

    // After complete range() or len(), suggest colon for for-loops
    if (currentLine.includes('for ') && !hasUnmatchedParens(currentLine) && !currentLine.includes(':')) {
      if ((currentLine.includes('range(') || currentLine.includes('len(')) && buttonLabel === ':') {
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

    // Function name completion
    if (['print', 'len', 'int', 'str', 'input'].some(fn => currentLine.endsWith(fn))) {
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
      'for': ['i', 'var', 'range', 'enumerate'],
      'i': ['in'],
      'var': ['in', '='],
      'if': ['condition'],
      'elif': ['condition'],
      'while': ['condition'],
      'condition': [':'],
      'print': ['('],
      'def': ['function'],
      'function': ['('],
      'class': ['ClassName'],
      'import': ['module'],
      'from': ['module'],
      '=': ['0', '1', '[', '{', '(', 'input', 'int', 'str', '"', "'", 'var'],
      'range': ['('],
      'len': ['('],
      'enumerate': ['('],
      'int': ['('],
      'str': ['('],
      'list': ['('],
      'dict': ['('],
      'in': ['range', '[]', '{}'],
      '==': ['0', '1', 'true', 'false', 'none', 'var'],
      '!=': ['0', '1', 'true', 'false', 'none', 'var'],
    };
  }

  private contextToString(context: TypingContext): string {
    return `${context.lastWord}|${context.isNewLine ? 'newline' : 'inline'}|${context.lineIndentation}`;
  }

  private contextSimilarity(context1: string, context2: string): number {
    const parts1 = context1.split('|');
    const parts2 = context2.split('|');
    
    let similarity = 0;
    if (parts1[0] === parts2[0]) similarity += 0.5; // same last word
    if (parts1[1] === parts2[1]) similarity += 0.3; // same line type
    if (Math.abs(parseInt(parts1[2]) - parseInt(parts2[2])) <= 1) similarity += 0.2; // similar indentation
    
    return similarity;
  }

  private async saveUsageData(): Promise<void> {
    try {
      const data = Object.fromEntries(this.usageData);
      await storage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save smart keyboard data:', error);
    }
  }

  async clearData(): Promise<void> {
    this.usageData.clear();
    await storage.removeItem(this.STORAGE_KEY);
  }
}

export const smartKeyboardService = new SmartKeyboardService();
export type { TypingContext, SmartPrediction };