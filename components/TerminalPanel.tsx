import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Play, Trash2, ChevronDown } from 'lucide-react-native';

interface TerminalPanelProps {
  isVisible: boolean;
  onClose: () => void;
  code: string;
}

export function TerminalPanel({ isVisible, onClose, code }: TerminalPanelProps) {
  const [output, setOutput] = useState<Array<{ type: 'input' | 'output' | 'error'; text: string }>>([
    { type: 'output', text: 'Mobile Code Terminal v1.0' },
    { type: 'output', text: 'Type "run" to execute the current code or enter Python commands.' },
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isVisible]);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
    inputRef.current?.blur();
  };

  const simulatePythonExecution = (pythonCode: string) => {
    const lines = pythonCode.split('\n');
    const results: string[] = [];
    
    // Simple simulation of Python code execution
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('print(')) {
        const match = trimmed.match(/print\((.*)\)/);
        if (match) {
          let content = match[1];
          // Handle f-strings
          if (content.includes('f"') || content.includes("f'")) {
            content = content.replace(/f["'](.*?)["']/, '$1');
            content = content.replace(/\{([^}]+)\}/g, (_, expr) => {
              if (expr.includes('fibonacci')) {
                const num = expr.match(/\d+/)?.[0];
                if (num) {
                  const fib = fibonacci(parseInt(num));
                  return fib.toString();
                }
              }
              return expr;
            });
          }
          // Remove quotes
          content = content.replace(/^["']|["']$/g, '');
          results.push(content);
        }
      } else if (trimmed.includes('fibonacci(')) {
        // Simulate fibonacci execution
        for (let i = 0; i < 10; i++) {
          results.push(`F(${i}) = ${fibonacci(i)}`);
        }
        break;
      }
    }
    
    return results;
  };

  const fibonacci = (n: number): number => {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
  };

  const executeCommand = (command: string) => {
    setOutput(prev => [...prev, { type: 'input', text: `>>> ${command}` }]);
    
    if (command.toLowerCase() === 'run') {
      try {
        const results = simulatePythonExecution(code);
        results.forEach(result => {
          setOutput(prev => [...prev, { type: 'output', text: result }]);
        });
      } catch (error) {
        setOutput(prev => [...prev, { type: 'error', text: `Error: ${error}` }]);
      }
    } else if (command.toLowerCase() === 'clear') {
      setOutput([
        { type: 'output', text: 'Mobile Code Terminal v1.0' },
        { type: 'output', text: 'Type "run" to execute the current code or enter Python commands.' },
      ]);
    } else if (command.toLowerCase() === 'help') {
      setOutput(prev => [
        ...prev,
        { type: 'output', text: 'Available commands:' },
        { type: 'output', text: '  run    - Execute the current code' },
        { type: 'output', text: '  clear  - Clear the terminal' },
        { type: 'output', text: '  help   - Show this help message' },
        { type: 'output', text: '  exit   - Close the terminal' },
      ]);
    } else if (command.toLowerCase() === 'exit') {
      dismissKeyboard();
      setTimeout(() => onClose(), 100);
    } else {
      // Simulate Python command execution
      try {
        if (command.includes('print(')) {
          const match = command.match(/print\((.*)\)/);
          if (match) {
            let content = match[1];
            content = content.replace(/^["']|["']$/g, '');
            setOutput(prev => [...prev, { type: 'output', text: content }]);
          }
        } else if (command.match(/^\d+\s*[\+\-\*\/]\s*\d+$/)) {
          // Simple math evaluation
          const result = eval(command);
          setOutput(prev => [...prev, { type: 'output', text: result.toString() }]);
        } else {
          setOutput(prev => [...prev, { type: 'output', text: `>>> ${command}` }]);
        }
      } catch (error) {
        setOutput(prev => [...prev, { type: 'error', text: `Error: Invalid syntax` }]);
      }
    }
    
    setCommandHistory(prev => [command, ...prev]);
    setHistoryIndex(-1);
    
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSubmit = () => {
    if (currentInput.trim()) {
      executeCommand(currentInput.trim());
      setCurrentInput('');
    }
  };

  const clearTerminal = () => {
    setOutput([
      { type: 'output', text: 'Mobile Code Terminal v1.0' },
      { type: 'output', text: 'Type "run" to execute the current code or enter Python commands.' },
    ]);
  };

  if (!isVisible) return null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Terminal</Text>
          <View style={styles.headerActions}>
            {isKeyboardVisible && (
              <TouchableOpacity style={styles.headerButton} onPress={dismissKeyboard}>
                <ChevronDown size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.headerButton} onPress={() => executeCommand('run')}>
              <Play size={16} color="#00FF00" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={clearTerminal}>
              <Trash2 size={16} color="#FF6B6B" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={() => {
              dismissKeyboard();
              setTimeout(() => onClose(), 100);
            }}>
              <X size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Output */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.output}
          showsVerticalScrollIndicator
          keyboardDismissMode="on-drag"
          bounces={false}
          contentContainerStyle={{ paddingBottom: 50 }}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          nestedScrollEnabled={true}
          scrollEnabled={true}
        >
          {output.map((item, index) => (
            <Text
              key={index}
              style={[
                styles.outputText,
                item.type === 'input' && styles.inputText,
                item.type === 'error' && styles.errorText,
              ]}
            >
              {item.text}
            </Text>
          ))}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.prompt}>{'>>> '}</Text>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={currentInput}
            onChangeText={setCurrentInput}
            onSubmitEditing={handleSubmit}
            placeholder="Enter command..."
            placeholderTextColor="#666666"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="send"
            blurOnSubmit={false}
          />
        </View>
      </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'FiraCode-Medium',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#333333',
  },
  output: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: '100%',
  },
  outputText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'FiraCode-Regular',
    lineHeight: 20,
    marginBottom: 2,
  },
  inputText: {
    color: '#00FF00',
  },
  errorText: {
    color: '#FF6B6B',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  prompt: {
    color: '#00FF00',
    fontSize: 14,
    fontFamily: 'FiraCode-Regular',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'FiraCode-Regular',
    marginLeft: 8,
  },
});