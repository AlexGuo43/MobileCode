import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { templateService } from '../utils/templateSystem';
import { getLanguageByKey } from '../utils/languageDefinitions';

interface SyntaxHighlighterProps {
  code: string;
  language: string;
  onTemplateClick?: (position: number) => void;
}

export function SyntaxHighlighter({ code, language, onTemplateClick }: SyntaxHighlighterProps) {
  const highlightCode = (text: string, languageKey: string) => {
    const languageDefinition = getLanguageByKey(languageKey);
    const { keywords, builtins, stringDelimiters, commentStart, blockComment } = languageDefinition.syntax;

    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
      const tokens: Array<{ text: string; type: string }> = [];
      let currentToken = '';
      let inString = false;
      let stringChar = '';
      let inComment = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        // Check for string delimiters
        if (!inString && !inComment && stringDelimiters.includes(char)) {
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
        } else if (!inString && !inComment && line.substring(i).startsWith(commentStart)) {
          if (currentToken) {
            tokens.push({ text: currentToken, type: 'default' });
            currentToken = '';
          }
          inComment = true;
          currentToken = commentStart;
          i += commentStart.length - 1; // Skip comment start characters
        } else if (inString || inComment) {
          currentToken += char;
        } else if (/\s/.test(char) || /[()[\]{},.:;=+\-*/<>!&|%]/.test(char)) {
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
          {tokens.map((token, tokenIndex) => {
            // Calculate position of this token in the full text
            let position = 0;
            for (let i = 0; i < lineIndex; i++) {
              position += lines[i].length + 1; // +1 for newline
            }
            for (let i = 0; i < tokenIndex; i++) {
              position += tokens[i].text.length;
            }
            
            // Check if this token text is a template placeholder
            const cleanToken = token.text.replace(/[^\w]/g, '').trim().toLowerCase(); // Remove punctuation and normalize case
            const isTemplate = ['function', 'condition', 'classname', 'module', 'var', 'type'].includes(cleanToken);
            
            // Just highlight templates, use button for interaction
            if (isTemplate) {
              return (
                <Text
                  key={tokenIndex}
                  style={[
                    styles.token, 
                    styles[token.type as keyof typeof styles],
                    styles.template
                  ]}
                >
                  {token.text}
                </Text>
              );
            }
            
            return (
              <Text
                key={tokenIndex}
                style={[styles.token, styles[token.type as keyof typeof styles]]}
              >
                {token.text}
              </Text>
            );
          })}
          {'\n'}
        </Text>
      );
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.code}>
        {highlightCode(code, language)}
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
    // prevent text wrapping for long lines
    // @ts-ignore -- whiteSpace is for web only
    whiteSpace: 'pre',
  },
  line: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    // prevent automatic wrapping within lines
    // @ts-ignore -- whiteSpace is for web only
    whiteSpace: 'pre',
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
  template: {
    backgroundColor: '#007AFF',
    color: '#FFFFFF',
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  templateButton: {
    borderRadius: 4,
  },
});