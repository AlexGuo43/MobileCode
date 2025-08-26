import { storage } from './storage';
import { KeyboardButton } from '../components/KeyboardCustomizer';
import { templateService } from './templateSystem';
import { LanguageDefinition } from './languageDefinitions';

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
  getSmartButtonText(button: KeyboardButton, context: TypingContext, currentLanguage?: LanguageDefinition): string {
    const currentLine = context.currentLine.toLowerCase();
    
    // Language-specific smart text handling
    if (currentLanguage?.key === 'python') {
      // Smart spacing for Python "for i in" sequences
      if (button.label === 'in') {
        // If the line ends with a single character variable (like "i", "x", "item"), add space before "in"
        if (/\bfor\s+\w+$/.test(currentLine.trim())) {
          return ' in ';
        }
      }
      
      // Smart colon handling for control flow statements
      if (button.label === ':') {
        // Check if this is a control flow statement that needs indentation
        const isControlFlow = /\b(for|if|elif|else|while|def|class|try|except|finally|with)\b/.test(currentLine);
        
        if (isControlFlow) {
          return ':\n    '; // Colon + newline + 4 spaces indentation
        }
      }
    }
    
    // Default to the button's original text
    return button.text;
  }

  getSmartPredictions(
    allTabs: any[],
    context: TypingContext,
    currentLanguage: LanguageDefinition,
    limit: number = 6
  ): SmartPrediction[] {
    // Collect all buttons from all tabs and deduplicate by label
    const buttonMap = new Map<string, KeyboardButton>();
    for (const tab of allTabs) {
      if (tab.data) {
        for (const button of tab.data) {
          // Only keep the first instance of each label to avoid duplicates
          if (!buttonMap.has(button.label)) {
            buttonMap.set(button.label, button);
          }
        }
      }
    }
    const allButtons: KeyboardButton[] = Array.from(buttonMap.values());
    const predictions: SmartPrediction[] = [];

    for (const button of allButtons) {
      let score = 0;
      let reason: SmartPrediction['reason'] = 'contextual';

      // Priority 1: Contextual sequences (highest priority)
      const sequenceScore = this.getSequenceScore(button, context, currentLanguage);
      if (sequenceScore > 0) {
        score = sequenceScore;
        reason = 'contextual';
      }
      // Priority 2: New line suggestions (only if no contextual match and on new line)
      else if (context.isNewLine) {
        const newLineScore = this.getNewLineScore(button, currentLanguage);
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

  private getNewLineScore(button: KeyboardButton, currentLanguage: LanguageDefinition): number {
    let commonStarters: Record<string, number> = {};
    
    // Language-specific new line starters
    switch (currentLanguage.key) {
      case 'python':
        commonStarters = {
          'var': 1.0, 'type': 0.95, 'if': 0.9, 'for': 0.8, 'while': 0.7, 'def': 0.6,
          'class': 0.6, 'try': 0.5, 'import': 0.5, 'from': 0.5, 'print': 0.4
        };
        break;
        
      case 'cpp':
        commonStarters = {
          '#include': 1.0, 'var': 0.98, 'type': 0.95, 'for': 0.8, 'if': 0.75, 'while': 0.7, 
          'cout': 0.65, 'const': 0.4, 'class': 0.35
        };
        break;
        
      case 'c':
        commonStarters = {
          '#include': 1.0, 'var': 0.98, 'type': 0.95, 'printf': 0.8, 'scanf': 0.75, 'if': 0.7, 
          'for': 0.65, 'while': 0.6, 'struct': 0.55, 'typedef': 0.5, 'const': 0.45, 'static': 0.4
        };
        break;
        
      case 'java':
        commonStarters = {
          'public': 1.0, 'private': 0.95, 'var': 0.92, 'type': 0.9, 'class': 0.7, 'if': 0.65, 
          'for': 0.6, 'while': 0.55, 'try': 0.5, 'import': 0.45, 'new': 0.4
        };
        break;
        
      case 'javascript':
        commonStarters = {
          'let': 1.0, 'const': 0.95, 'var': 0.9, 'function': 0.85, 'if': 0.8,
          'for': 0.75, 'while': 0.7, 'try': 0.65, 'import': 0.6, 'export': 0.55,
          'class': 0.5, 'console.log': 0.45
        };
        break;
        
      case 'typescript':
        commonStarters = {
          'let': 1.0, 'const': 0.95, 'var': 0.92, 'type': 0.9, 'interface': 0.85, 'function': 0.8,
          'class': 0.75, 'if': 0.7, 'for': 0.65, 'import': 0.6, 'export': 0.55,
          'public': 0.5, 'private': 0.45
        };
        break;
        
      case 'go':
        commonStarters = {
          'package': 1.0, 'import': 0.95, 'func': 0.9, 'var': 0.88, 'type': 0.8,
          'if': 0.75, 'for': 0.7, 'const': 0.65, 'fmt.Println': 0.6
        };
        break;
        
      case 'rust':
        commonStarters = {
          'fn': 1.0, 'let': 0.95, 'var': 0.92, 'type': 0.9, 'if': 0.85, 'for': 0.8, 'match': 0.75,
          'struct': 0.7, 'enum': 0.65, 'impl': 0.6, 'use': 0.55, 'pub': 0.5
        };
        break;
        
      case 'csharp':
        commonStarters = {
          'public': 1.0, 'private': 0.95, 'using': 0.9, 'class': 0.85, 'var': 0.82, 'type': 0.8,
          'if': 0.65, 'for': 0.6, 'foreach': 0.55
        };
        break;
        
      case 'php':
        commonStarters = {
          '<?php': 1.0, '$': 0.95, 'var': 0.92, 'type': 0.9, 'echo': 0.85, 'if': 0.8, 'for': 0.75,
          'foreach': 0.7, 'function': 0.65, 'class': 0.6, 'try': 0.55
        };
        break;
        
      default:
        // Generic fallback
        commonStarters = {
          'var': 0.98, 'type': 0.95, 'if': 0.9, 'for': 0.8, 'while': 0.7, 'try': 0.6, 'function': 0.5
        };
    }

    return commonStarters[button.label.toLowerCase()] || 0;
  }

  // Removed unused frequency-based scoring functions

  private getSequenceScore(button: KeyboardButton, context: TypingContext, currentLanguage: LanguageDefinition): number {
    const currentLine = context.currentLine.toLowerCase();
    const buttonLabel = button.label.toLowerCase();
    
    // Enhanced context-aware sequence scoring
    const score = this.getContextualScore(currentLine, buttonLabel, currentLanguage);
    if (score > 0) return score;
    
    // Check if the last operator was =, +=, -=, etc.
    const operatorMatch = currentLine.match(/[+\-*/%]?=\s*$/);
    if (operatorMatch) {
      const operator = operatorMatch[0].trim();
      const sequences = currentLanguage.sequences;
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
    
    const sequences = currentLanguage.sequences;
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

  private getContextualScore(currentLine: string, buttonLabel: string, currentLanguage: LanguageDefinition): number {
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

    // Universal patterns that work across languages

    // 1. Type/variable declaration patterns: "int var", "string name", etc.
    const typePattern = /\b(type|int|string|double|float|bool|char|var|let|const|public|private)\s+$/;
    if (typePattern.test(currentLine)) {
      // After a type declaration, suggest variable names
      if (['var', 'name', 'value', 'i', 'x', 'item', 'temp'].includes(buttonLabel)) {
        return 1.0; // Perfect: type + variable name
      }
    }

    // 1.5. Type + variable patterns: "int var", "std::vector<int> var" -> suggest "="
    const typeVarPattern = currentLanguage.key === 'cpp' || currentLanguage.key === 'c' ?
      // C/C++: Handle complex types like std::vector<int>, const int*, etc.
      /\b(type|int|string|double|float|bool|char|const|static|std::\w+(?:<[^>]+>)?|\w+\*?)\s+\w+\s*$/ :
      // Other languages: Simple types
      /\b(type|int|string|double|float|bool|char|var|let|const|public|private)\s+\w+\s*$/;
    
    if (typeVarPattern.test(currentLine)) {
      // After "type variable", suggest assignment operator
      if (buttonLabel === '=') {
        return 1.0; // Perfect: type variable + =
      }
      if ([';', ','].includes(buttonLabel)) {
        return 0.8; // Good: type variable + end statement
      }
    }

    // 2. Assignment patterns: "var =", "name =", "int var =", etc.
    const assignmentPattern = /(\w+\s*=\s*$|(?:type|int|string|double|float|bool|char|let|const|var|public|private)\s+\w+\s*=\s*$)/;
    if (assignmentPattern.test(currentLine)) {
      // After assignment operator, suggest common values
      if (['0', '1', 'true', 'false', 'null', 'undefined', 'new', '"', "'", '[', '{', '('].includes(buttonLabel)) {
        return 0.9; // Good: assignment + value
      }
    }

    // 3. Function call patterns: suggest opening parenthesis after function names
    const { builtins } = currentLanguage.syntax;
    const endsWithBuiltin = builtins.some(builtin => {
      const pattern = new RegExp(`\\b${builtin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
      return pattern.test(currentLine);
    });
    
    if (endsWithBuiltin && buttonLabel === '(') {
      return 1.0; // Perfect: function + "("
    }

    // 4. Semicolon suggestions for complete statements in C-style languages
    const needsSemicolon = ['javascript', 'typescript', 'java', 'cpp', 'c', 'csharp'].includes(currentLanguage.key);
    if (needsSemicolon && buttonLabel === ';') {
      // Suggest semicolon after complete variable declarations
      const varDeclPattern = currentLanguage.key === 'cpp' || currentLanguage.key === 'c' ?
        // C/C++: Handle complex types like std::vector<int> var = value, const int* ptr, etc.
        /\b(int|string|double|float|bool|char|const|static|std::\w+(?:<[^>]+>)?|\w+\*?)\s+\w+(\s*=\s*.+)?\s*$/ :
        // Other languages: Simple types
        /\b(int|string|double|float|bool|char|let|const|var|public|private)\s+\w+(\s*=\s*.+)?\s*$/;
      
      if (varDeclPattern.test(currentLine)) {
        return 1.0; // Perfect: complete variable declaration + ;
      }
      // Suggest semicolon after function calls: "function()", "obj.method()"
      if (/\w+(\.\w+)?\([^)]*\)\s*$/.test(currentLine)) {
        return 0.9; // Good: function call + ;
      }
      // Suggest semicolon after simple assignments: "var = value", "obj.prop = value"
      if (/\w+(\.\w+)?\s*=\s*.+\s*$/.test(currentLine)) {
        return 0.9; // Good: assignment + ;
      }
      // Suggest semicolon after single expressions: "variable", "123", "true"
      if (/^\s*\w+\s*$/.test(currentLine)) {
        return 0.7; // Okay: single expression + ;
      }
    }

    // 5. Language-specific patterns
    switch (currentLanguage.key) {
      case 'python':
        return this.getPythonContextualScore(currentLine, buttonLabel);
      case 'cpp':
        return this.getCppContextualScore(currentLine, buttonLabel);
      case 'c':
        return this.getCContextualScore(currentLine, buttonLabel);
      case 'java':
        return this.getJavaContextualScore(currentLine, buttonLabel);
      case 'javascript':
      case 'typescript':
        return this.getJavaScriptContextualScore(currentLine, buttonLabel);
      case 'go':
        return this.getGoContextualScore(currentLine, buttonLabel);
      case 'rust':
        return this.getRustContextualScore(currentLine, buttonLabel);
      case 'csharp':
        return this.getCSharpContextualScore(currentLine, buttonLabel);
      case 'php':
        return this.getPhpContextualScore(currentLine, buttonLabel);
    }

    return 0;
  }

  private isInlineContext(context: TypingContext): boolean {
    // Consider it inline if there's meaningful content on the current line
    const trimmedLine = context.currentLine.trim();
    return trimmedLine.length > 0 && !context.isNewLine;
  }

  private getPythonContextualScore(currentLine: string, buttonLabel: string): number {
    // Python-specific contextual patterns
    
    // For loop progression: for -> var/i -> in -> range( -> var -> ) -> :
    if (currentLine.includes('for ') && !currentLine.includes(' in ')) {
      if (currentLine.match(/for\s+\w+\s*$/) && buttonLabel === 'in') {
        return 1.0; // Perfect match: "for i" + "in"
      }
      if (currentLine.match(/for\s*$/) && buttonLabel === 'i') {
        return 1.0; // Perfect match: "for" + "i" (most common)
      }
    }

    if (currentLine.includes('for ') && currentLine.includes(' in ') && !currentLine.includes('(')) {
      if (currentLine.match(/for\s+\w+\s+in\s*$/) && ['range', 'enumerate', 'zip'].includes(buttonLabel)) {
        return 1.0; // Perfect: "for i in" + iterable function
      }
    }

    // Colon suggestions for control flow
    const controlFlowPattern = /\b(for|if|elif|else|while|def|class|try|except|finally|with)\b.*[^:]$/;
    if (controlFlowPattern.test(currentLine) && buttonLabel === ':') {
      return 1.0; // Perfect: control flow + colon
    }

    return 0;
  }

  private getCppContextualScore(currentLine: string, buttonLabel: string): number {
    // General C++ contextual patterns inspired by competitive programming but useful for all C++
    
    // Include statements
    if (currentLine.includes('#include')) {
      if (currentLine.match(/#include\s*$/) && ['<iostream>', '<vector>', '<string>', '<algorithm>'].includes(buttonLabel)) {
        return 1.0; // Perfect: #include + standard headers
      }
    }
    
    // Vector/container operations (common in all C++)
    if (currentLine.match(/\b\w+\s*$/) && currentLine.includes('vector')) {
      if (buttonLabel === '.size()') return 1.0; // Any vector variable + .size()
      if (buttonLabel === '[') return 0.9; // Any vector variable + [index]
      if (buttonLabel === '.push_back') return 0.9; // Any vector variable + push_back
    }
    
    // Container declaration patterns
    if (currentLine.match(/vector<\w+>\s*$/) && ['var', 'data', 'items', 'arr'].includes(buttonLabel)) {
      return 1.0; // Perfect: vector<type> + common variable names
    }
    if (currentLine.match(/map<\w+,\s*\w+>\s*$/) && ['var', 'data', 'mp'].includes(buttonLabel)) {
      return 1.0; // Perfect: map<key,value> + variable names
    }
    
    // For loop patterns (general C++ loops, not just LeetCode)
    if (currentLine.includes('for ') && !currentLine.includes('{')) {
      if (currentLine.match(/for\s*\(\s*$/) && buttonLabel === 'int') {
        return 1.0; // Perfect: for ( + int
      }
      if (currentLine.match(/for\s*\(\s*int\s*$/) && ['i', 'j', 'k', 'var'].includes(buttonLabel)) {
        return 1.0; // Perfect: for (int + loop variable
      }
      if (currentLine.match(/for\s*\(\s*int\s+\w+\s*=\s*0;\s*\w+\s*<\s*$/) && ['.size()', 'n', 'var'].includes(buttonLabel)) {
        return 1.0; // Perfect: for (int i = 0; i < + size/limit
      }
      if (currentLine.match(/for\s*\(\s*auto&?\s*$/) && buttonLabel === 'var') {
        return 1.0; // Perfect: for (auto + variable (range-based for)
      }
    }
    
    // I/O operations
    if (currentLine.includes('cout')) {
      if (currentLine.match(/cout\s*$/) && buttonLabel === '<<') {
        return 1.0; // Perfect: cout + <<
      }
      if (currentLine.match(/cout\s*<<.*$/) && ['endl', '"', 'var'].includes(buttonLabel)) {
        return 0.9; // Good: cout << ... + common continuations
      }
    }
    
    // Type declarations and assignments  
    if (currentLine.match(/\b(int|string|double|bool|char|auto|const|type)\s+\w+\s*$/) && buttonLabel === '=') {
      return 1.0; // Perfect: type var + =
    }
    if (currentLine.match(/\b(int|string|double|bool|char|auto|const|type)\s*$/) && buttonLabel === 'var') {
      return 1.0; // Perfect: type + var
    }
    
    // Control flow completions
    if (currentLine.match(/\b(if|while)\s*\(\s*$/) && ['var', 'true', 'false'].includes(buttonLabel)) {
      return 0.9; // Good: if/while ( + condition start
    }
    
    // Semicolon completions for statements
    if (currentLine.match(/\w+\s*=\s*[^;]+$/) && buttonLabel === ';') {
      return 1.0; // Perfect: assignment + semicolon
    }
    if (currentLine.match(/\w+\s*\([^)]*\)\s*$/) && buttonLabel === ';') {
      return 1.0; // Perfect: function call + semicolon
    }
    
    // Return statements with common values
    if (currentLine.includes('return')) {
      if (currentLine.match(/return\s*$/) && ['0', 'true', 'false', 'var'].includes(buttonLabel)) {
        return 1.0; // Perfect: return + common values
      }
    }
    
    return 0;
  }

  private getCContextualScore(currentLine: string, buttonLabel: string): number {
    // Include progression: #include -> <header>
    if (currentLine.includes('#include')) {
      if (currentLine.match(/#include\s*$/) && ['<stdio.h>', '<stdlib.h>', '<string.h>'].includes(buttonLabel)) {
        return 1.0; // Perfect: #include + standard headers
      }
    }

    // Printf formatting: printf -> ("format", ...)
    if (currentLine.includes('printf')) {
      if (currentLine.match(/printf\s*$/) && buttonLabel === '(') {
        return 1.0; // Perfect: printf + (
      }
      if (currentLine.match(/printf\s*\(\s*$/) && buttonLabel === '"') {
        return 1.0; // Perfect: printf(" + format string
      }
      if (currentLine.match(/printf\s*\([^)]*%d[^)]*$/) && ['var', ','].includes(buttonLabel)) {
        return 0.9; // Good: printf with %d needs variable
      }
    }

    // Scanf formatting: scanf -> ("format", &var)
    if (currentLine.includes('scanf')) {
      if (currentLine.match(/scanf\s*\([^)]*,\s*$/) && buttonLabel === '&') {
        return 1.0; // Perfect: scanf format + &
      }
    }

    return 0;
  }

  private getJavaContextualScore(currentLine: string, buttonLabel: string): number {
    // System.out progression: System -> .out -> .println
    if (currentLine.includes('System')) {
      if (currentLine.match(/System\s*$/) && buttonLabel === '.') {
        return 1.0; // Perfect: System + .
      }
      if (currentLine.match(/System\.\s*$/) && buttonLabel === 'out') {
        return 1.0; // Perfect: System. + out
      }
      if (currentLine.match(/System\.out\s*$/) && buttonLabel === '.') {
        return 1.0; // Perfect: System.out + .
      }
      if (currentLine.match(/System\.out\.\s*$/) && ['println', 'print'].includes(buttonLabel)) {
        return 1.0; // Perfect: System.out. + println
      }
    }

    // For-each loop: for (Type item : collection)
    if (currentLine.includes('for ') && currentLine.includes(':')) {
      if (currentLine.match(/for\s*\([^)]*:\s*$/) && ['collection', 'list', 'array'].includes(buttonLabel)) {
        return 1.0; // Perfect: for (item : + collection
      }
    }

    // Access modifiers: public/private + type + name
    if (currentLine.match(/\b(public|private|protected)\s+(static\s+)?(int|String|double|boolean)\s*$/) && ['var', 'name'].includes(buttonLabel)) {
      return 1.0; // Perfect: access modifier + type + name
    }

    return 0;
  }

  private getJavaScriptContextualScore(currentLine: string, buttonLabel: string): number {
    // Arrow function progression: () => {}
    if (currentLine.includes('=>')) {
      if (currentLine.match(/=>\s*$/) && buttonLabel === '{') {
        return 1.0; // Perfect: => + {
      }
    }

    // Function declaration: function name() {}
    if (currentLine.includes('function')) {
      if (currentLine.match(/function\s*$/) && ['name', 'functionName'].includes(buttonLabel)) {
        return 1.0; // Perfect: function + name
      }
      if (currentLine.match(/function\s+\w+\s*$/) && buttonLabel === '(') {
        return 1.0; // Perfect: function name + (
      }
    }

    // Console operations: console.log(), console.error()
    if (currentLine.includes('console')) {
      if (currentLine.match(/console\s*$/) && buttonLabel === '.') {
        return 1.0; // Perfect: console + .
      }
      if (currentLine.match(/console\.\s*$/) && ['log', 'error', 'warn'].includes(buttonLabel)) {
        return 1.0; // Perfect: console. + method
      }
    }

    // Import/export patterns: import {} from ''
    if (currentLine.includes('import')) {
      if (currentLine.match(/import\s*$/) && buttonLabel === '{') {
        return 1.0; // Perfect: import + {
      }
      if (currentLine.match(/import\s*\{[^}]*\}\s*$/) && buttonLabel === 'from') {
        return 1.0; // Perfect: import {} + from
      }
      if (currentLine.match(/from\s*$/) && buttonLabel === '"') {
        return 1.0; // Perfect: from + "module"
      }
    }

    return 0;
  }

  private getGoContextualScore(currentLine: string, buttonLabel: string): number {
    // Package declaration: package main
    if (currentLine.includes('package')) {
      if (currentLine.match(/package\s*$/) && buttonLabel === 'main') {
        return 1.0; // Perfect: package + main
      }
    }

    // Import patterns: import "fmt"
    if (currentLine.includes('import')) {
      if (currentLine.match(/import\s*$/) && buttonLabel === '"') {
        return 1.0; // Perfect: import + "
      }
      if (currentLine.match(/import\s*"\s*$/) && ['fmt', 'os', 'io'].includes(buttonLabel)) {
        return 1.0; // Perfect: import " + package
      }
    }

    // Function declaration: func main() {}
    if (currentLine.includes('func')) {
      if (currentLine.match(/func\s*$/) && ['main', 'name'].includes(buttonLabel)) {
        return 1.0; // Perfect: func + name
      }
      if (currentLine.match(/func\s+\w+\s*$/) && buttonLabel === '(') {
        return 1.0; // Perfect: func name + (
      }
    }

    // Variable assignment: name := value
    if (currentLine.match(/\w+\s*:=\s*$/) && ['0', '"', 'make', 'new'].includes(buttonLabel)) {
      return 0.9; // Good: := + value
    }

    return 0;
  }

  private getRustContextualScore(currentLine: string, buttonLabel: string): number {
    // Let binding: let mut name: type = value
    if (currentLine.includes('let')) {
      if (currentLine.match(/let\s*$/) && buttonLabel === 'mut') {
        return 1.0; // Perfect: let + mut
      }
      if (currentLine.match(/let\s+(mut\s+)?\w+\s*$/) && buttonLabel === ':') {
        return 1.0; // Perfect: let name + :
      }
      if (currentLine.match(/let\s+(mut\s+)?\w+\s*:\s*\w+\s*$/) && buttonLabel === '=') {
        return 1.0; // Perfect: let name: type + =
      }
    }

    // Match expressions: match value { pattern => result }
    if (currentLine.includes('match')) {
      if (currentLine.match(/match\s+\w+\s*$/) && buttonLabel === '{') {
        return 1.0; // Perfect: match value + {
      }
      if (currentLine.match(/\w+\s*$/) && buttonLabel === '=>') {
        return 0.9; // Good: pattern + =>
      }
    }

    // Function definition: fn name() -> ReturnType
    if (currentLine.includes('fn')) {
      if (currentLine.match(/fn\s*$/) && ['main', 'name'].includes(buttonLabel)) {
        return 1.0; // Perfect: fn + name
      }
      if (currentLine.match(/fn\s+\w+\s*\([^)]*\)\s*$/) && buttonLabel === '->') {
        return 1.0; // Perfect: fn name() + ->
      }
    }

    return 0;
  }

  private getCSharpContextualScore(currentLine: string, buttonLabel: string): number {
    // Using statements: using System;
    if (currentLine.includes('using')) {
      if (currentLine.match(/using\s*$/) && ['System', 'System.Collections.Generic'].includes(buttonLabel)) {
        return 1.0; // Perfect: using + namespace
      }
    }

    // Console operations: Console.WriteLine()
    if (currentLine.includes('Console')) {
      if (currentLine.match(/Console\s*$/) && buttonLabel === '.') {
        return 1.0; // Perfect: Console + .
      }
      if (currentLine.match(/Console\.\s*$/) && ['WriteLine', 'Write', 'ReadLine'].includes(buttonLabel)) {
        return 1.0; // Perfect: Console. + method
      }
    }

    // Foreach loop: foreach (var item in collection)
    if (currentLine.includes('foreach')) {
      if (currentLine.match(/foreach\s*\(\s*$/) && ['var', 'int', 'string'].includes(buttonLabel)) {
        return 1.0; // Perfect: foreach ( + type
      }
      if (currentLine.match(/foreach\s*\([^)]*\s+in\s*$/) && ['collection', 'list'].includes(buttonLabel)) {
        return 1.0; // Perfect: foreach (var item in + collection
      }
    }

    return 0;
  }

  private getPhpContextualScore(currentLine: string, buttonLabel: string): number {
    // Variable assignment: $name = value
    if (currentLine.includes('$')) {
      if (currentLine.match(/\$\w*\s*=\s*$/) && ['"', "'", '0', 'array'].includes(buttonLabel)) {
        return 0.9; // Good: $var = + value
      }
    }

    // Echo/print statements: echo "string"
    if (currentLine.includes('echo') || currentLine.includes('print')) {
      if (currentLine.match(/(echo|print)\s*$/) && ['"', "'", '$'].includes(buttonLabel)) {
        return 1.0; // Perfect: echo + string/variable
      }
    }

    // Foreach loop: foreach ($array as $item)
    if (currentLine.includes('foreach')) {
      if (currentLine.match(/foreach\s*\(\s*\$\w+\s*$/) && buttonLabel === 'as') {
        return 1.0; // Perfect: foreach ($array + as
      }
      if (currentLine.match(/foreach\s*\([^)]*\s+as\s*$/) && buttonLabel === '$') {
        return 1.0; // Perfect: foreach ($array as + $item
      }
    }

    return 0;
  }


  // Removed unused context similarity and storage functions

  async clearData(): Promise<void> {
    this.usageData.clear();
    await storage.removeItem(this.STORAGE_KEY);
  }
}

export const smartKeyboardService = new SmartKeyboardService();
export type { TypingContext, SmartPrediction };