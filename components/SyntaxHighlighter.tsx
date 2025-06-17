import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SyntaxHighlighterProps {
  code: string;
  language: string;
}

export function SyntaxHighlighter({ code, language }: SyntaxHighlighterProps) {
  const highlightPython = (text: string) => {
    const keywords = [
      'def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally',
      'import', 'from', 'as', 'return', 'yield', 'break', 'continue', 'pass', 'lambda',
      'and', 'or', 'not', 'in', 'is', 'True', 'False', 'None', 'with', 'async', 'await'
    ];
    
    const builtins = [
      'print', 'input', 'len', 'range', 'enumerate', 'zip', 'map', 'filter', 'reduce',
      'str', 'int', 'float', 'bool', 'list', 'dict', 'set', 'tuple', 'type', 'isinstance'
    ];

    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
      const tokens: Array<{ text: string; type: string }> = [];
      let currentToken = '';
      let inString = false;
      let stringChar = '';
      let inComment = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (!inString && !inComment && (char === '"' || char === "'")) {
          if (currentToken) {
            tokens.push({ text: currentToken, type: 'default' });
            currentToken = '';
          }
          inString = true;
          stringChar = char;
          currentToken = char;
        } else if (inString && char === stringChar && line[i - 1] !== '\\') {
          currentToken += char;
          tokens.push({ text: currentToken, type: 'string' });
          currentToken = '';
          inString = false;
          stringChar = '';
        } else if (!inString && char === '#') {
          if (currentToken) {
            tokens.push({ text: currentToken, type: 'default' });
            currentToken = '';
          }
          inComment = true;
          currentToken = char;
        } else if (inString || inComment) {
          currentToken += char;
        } else if (/\s/.test(char)) {
          if (currentToken) {
            const tokenType = keywords.includes(currentToken) ? 'keyword' :
                            builtins.includes(currentToken) ? 'builtin' :
                            /^\d+$/.test(currentToken) ? 'number' : 'default';
            tokens.push({ text: currentToken, type: tokenType });
            currentToken = '';
          }
          tokens.push({ text: char, type: 'default' });
        } else {
          currentToken += char;
        }
      }
      
      if (currentToken) {
        const tokenType = inComment ? 'comment' :
                        inString ? 'string' :
                        keywords.includes(currentToken) ? 'keyword' :
                        builtins.includes(currentToken) ? 'builtin' :
                        /^\d+$/.test(currentToken) ? 'number' : 'default';
        tokens.push({ text: currentToken, type: tokenType });
      }
      
      return (
        <Text key={lineIndex} style={styles.line}>
          {tokens.map((token, tokenIndex) => (
            <Text key={tokenIndex} style={[styles.token, styles[token.type]]}>
              {token.text}
            </Text>
          ))}
          {'\n'}
        </Text>
      );
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.code}>
        {language === 'python' ? highlightPython(code) : code}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  code: {
    fontSize: 14,
    fontFamily: 'FiraCode-Regular',
    lineHeight: 20,
  },
  line: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  token: {
    fontSize: 14,
    fontFamily: 'FiraCode-Regular',
  },
  default: {
    color: '#FFFFFF',
  },
  keyword: {
    color: '#FF79C6',
    fontWeight: '600',
  },
  builtin: {
    color: '#8BE9FD',
  },
  string: {
    color: '#F1FA8C',
  },
  comment: {
    color: '#6272A4',
    fontStyle: 'italic',
  },
  number: {
    color: '#BD93F9',
  },
});