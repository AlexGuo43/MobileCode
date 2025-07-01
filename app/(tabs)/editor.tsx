import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useLocalSearchParams } from 'expo-router';
import { Play, Save, Undo, Redo, Plus, ChevronDown, Copy } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { CodeKeyboard } from '@/components/CodeKeyboard';
import { SyntaxHighlighter } from '@/components/SyntaxHighlighter';
import { TerminalPanel } from '@/components/TerminalPanel';

const { height: screenHeight } = Dimensions.get('window');
const LINE_HEIGHT = 20;
const CHAR_WIDTH = 8.4;

export default function EditorScreen() {
  const { slug } = useLocalSearchParams();
  const [code, setCode] = useState(`# Welcome to Mobile Code Editor\n`);
  const [isTerminalVisible, setIsTerminalVisible] = useState(false);
  const [activeFile, setActiveFile] = useState("main.py");
  const [language, setLanguage] = useState("python");
  const [codeDefs, setCodeDefs] = useState<any[]>([]);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const getExtension = (lang: string) => {
    const normalizedLang = lang === "python3" ? "python" : lang;
    const map: Record<string, string> = {
      python: "py",
      cpp: "cpp",
      java: "java",
      c: "c",
      csharp: "cs",
      javascript: "js",
      typescript: "ts",
      php: "php",
      swift: "swift",
      kotlin: "kt",
      dart: "dart",
      golang: "go",
      ruby: "rb",
      scala: "scala",
      rust: "rs",
      racket: "rkt",
      erlang: "erl",
      elixir: "ex",
    };
    return map[normalizedLang] || normalizedLang;
  };  
  
  const terminalOffset = useSharedValue(screenHeight);
  const editorRef = useRef<TextInput>(null);

  useEffect(() => {
    async function loadCodeDef() {
      if (!slug) return;
  
      try {
        const resp = await fetch(`https://leetcode-api-tau-eight.vercel.app/problem/${slug}/template`);
        const defs = await resp.json();
        console.log("defs: ", defs)
  
        if (Array.isArray(defs)) {
          setCodeDefs(defs);
          const preferred =
            defs.find((d: any) =>
              d.value?.toLowerCase().includes("python3")
            ) || defs[0];
          if (preferred?.defaultCode) {
            setCode(preferred.defaultCode);
            setActiveFile(`main.${getExtension(preferred.value)}`);
            if(preferred.value=="python3"){
              setLanguage("python")
            }else{
              setLanguage(preferred.value);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load code definition:", err);
      }
    }
  
    loadCodeDef();
  }, [slug]);  
  
  React.useEffect(() => {
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

  const dismissKeyboard = () => {
    Keyboard.dismiss();
    editorRef.current?.blur();
  };

  const toggleTerminal = () => {
    const newVisibility = !isTerminalVisible;
    setIsTerminalVisible(newVisibility);
    terminalOffset.value = withSpring(newVisibility ? screenHeight * 0.4 : screenHeight);
    if (newVisibility) {
      dismissKeyboard();
    }
  };

  const twoFingerGesture = Gesture.Pan()
    .minPointers(2)
    .onEnd((event) => {
      if (event.velocityY < -500) {
        runOnJS(toggleTerminal)();
      }
    });

  const terminalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: terminalOffset.value }],
  }));

  const insertCode = (text: string) => {
    let insertText = text;
    
    if (text === '\n') {
      // Handle single newline with auto-indentation (your original logic)
      const beforeCursor = code.substring(0, cursorPosition);
      const currentLine = beforeCursor.split('\n').pop() || '';
      const baseIndent = currentLine.match(/^\s+/)?.[0] || '';
      const trimmed = currentLine.trimEnd();
      const needsExtra = /[:{]\s*$/.test(trimmed);
      const indentStep = '    ';
      insertText = '\n' + baseIndent + (needsExtra ? indentStep : '');
    } else if (text.includes('\n')) {
      // For multi-line insertions from buttons, preserve the exact formatting
      // but add base indentation to subsequent lines
      const lines = text.split('\n');
      const beforeCursor = code.substring(0, cursorPosition);
      const currentLineStart = beforeCursor.lastIndexOf('\n') + 1;
      const currentLine = beforeCursor.substring(currentLineStart);
      const baseIndent = currentLine.match(/^\s*/)?.[0] || '';
      
      insertText = lines.map((line, index) => {
        if (index === 0) return line; // First line as-is
        // For all other lines, add the base indentation
        return baseIndent + line;
      }).join('\n');
    }
  
    const beforeCursor = code.substring(0, cursorPosition);
    const afterCursor = code.substring(cursorPosition);
    const newCode = beforeCursor + insertText + afterCursor;
    setCode(newCode);
    setCursorPosition(cursorPosition + insertText.length);
  
    // Focus editor and set cursor position
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        const start = cursorPosition + insertText.length;
        const end = start;
        // For native platforms use setNativeProps, for web fall back to DOM APIs
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const input = editorRef.current as any;
        if (typeof input.setNativeProps === 'function') {
          input.setNativeProps({ selection: { start, end } });
        } else if (typeof input.setSelectionRange === 'function') {
          input.setSelectionRange(start, end);
        }
      }
    }, 100);
  };

  const deindentLine = () => {
    const before = code.substring(0, cursorPosition);
    const lineStart = before.lastIndexOf('\n') + 1;
    const lineEnd = code.indexOf('\n', cursorPosition);
    const end = lineEnd === -1 ? code.length : lineEnd;
    const line = code.substring(lineStart, end);
    const indentStep = '    ';
    if (line.startsWith(indentStep)) {
      const newLine = line.substring(indentStep.length);
      const newCode = code.substring(0, lineStart) + newLine + code.substring(end);
      setCode(newCode);
      setCursorPosition(Math.max(lineStart, cursorPosition - indentStep.length));
    }
  };

  const deleteLine = () => {
    const before = code.substring(0, cursorPosition);
    const lineStart = before.lastIndexOf('\n') + 1;
    let lineEnd = code.indexOf('\n', cursorPosition);
    if (lineEnd === -1) lineEnd = code.length; else lineEnd += 1;
    const newCode = code.substring(0, lineStart) + code.substring(lineEnd);
    setCode(newCode);
    setCursorPosition(lineStart);
  };

  const handleTextChange = (text: string) => {
    const before = code.substring(0, cursorPosition);
    const after = code.substring(cursorPosition);
    if (
      text.length === code.length + 1 &&
      text.startsWith(before) &&
      text.endsWith(after) &&
      text[cursorPosition] === '\n'
    ) {
      insertCode('\n');
    } else {
      setCode(text);
    }
  };

  const copyToClipboard = () => {
    Clipboard.setStringAsync(code);
  };

  const getCursorCoords = () => {
    const beforeCursor = code.substring(0, cursorPosition);
    const lines = beforeCursor.split('\n');
    const row = lines.length - 1;
    const col = lines[lines.length - 1].length;
    return {
      top: 16 + row * LINE_HEIGHT,
      left: 16 + col * CHAR_WIDTH,
    };
  };

  const runCode = () => {
    // Dismiss keyboard first, then show terminal
    dismissKeyboard();
    setTimeout(() => {
      setIsTerminalVisible(true);
      terminalOffset.value = withSpring(screenHeight * 0.4);
    }, 100);
  };

  const cursor = getCursorCoords();
  const maxLineLength = Math.max(...code.split('\n').map((line) => line.length));
  const contentWidth = Math.max(
    maxLineLength * CHAR_WIDTH + 48,
    Dimensions.get('window').width - 50
  );

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <GestureDetector gesture={twoFingerGesture}>
          <View style={styles.editorContainer}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                disabled={codeDefs.length === 0}
                style={styles.langButton}
                onPress={() => setShowLangMenu(!showLangMenu)}
              >
                <Text style={styles.fileName}>{language}</Text>
                {codeDefs.length > 1 && (
                  <ChevronDown size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
              <View style={styles.headerActions}>
                {isKeyboardVisible && (
                  <TouchableOpacity style={styles.actionButton} onPress={dismissKeyboard}>
                    <ChevronDown size={16} color="#007AFF" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.actionButton} onPress={runCode}>
                  <Play size={16} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Save size={16} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Undo size={16} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={copyToClipboard}>
                  <Copy size={16} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Code Editor */}
            {showLangMenu && (
              <View style={styles.langMenu}>
                {codeDefs.map((def: any) => (
                  <TouchableOpacity
                    key={String(def.value)}
                    style={styles.langMenuItem}
                    onPress={() => {
                      setShowLangMenu(false);
                      if (def.defaultCode) {
                        setCode(def.defaultCode);
                        setActiveFile(`main.${getExtension(def.value)}`);
                        setLanguage(def.value);
                      }
                    }}
                  >
                    <Text style={styles.langMenuText}>{def.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.editorWrapper}>
              <ScrollView style={styles.lineNumbers} showsVerticalScrollIndicator={false}>
                {code.split('\n').map((_, index) => (
                  <Text key={index} style={styles.lineNumber}>
                    {index + 1}
                  </Text>
                ))}
              </ScrollView>
              <ScrollView horizontal style={styles.codeScroll} bounces={false} showsHorizontalScrollIndicator={false}>
                <View style={[styles.codeContainer, { width: contentWidth }]}>
                  <SyntaxHighlighter code={code} language={"python"} />
                  <View style={[styles.cursor, { left: cursor.left, top: cursor.top }]} />
                  <TextInput
                    ref={editorRef}
                    style={[styles.codeInput, { width: contentWidth }]}
                    value={code}
                    onChangeText={handleTextChange}
                    onSelectionChange={(event) => setCursorPosition(event.nativeEvent.selection.start)}
                    multiline
                    textAlignVertical="top"
                    selectionColor="#007AFF"
                    placeholderTextColor="#8E8E93"
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    keyboardType="ascii-capable"
                    blurOnSubmit={false}
                    returnKeyType="default"
                  />
                </View>
              </ScrollView>
            </View>

            {/* Code Keyboard */}
            <CodeKeyboard
              onInsert={insertCode}
              onDeindent={deindentLine}
              onDeleteLine={deleteLine}
            />
          </View>
        </GestureDetector>
      </TouchableWithoutFeedback>

      {/* Terminal Panel */}
      <Animated.View style={[styles.terminalContainer, terminalAnimatedStyle]}>
        <TerminalPanel 
          isVisible={isTerminalVisible} 
          onClose={() => {
            setIsTerminalVisible(false);
            terminalOffset.value = withSpring(screenHeight);
          }}
          code={code}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  editorContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2C2C2E',
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3E',
  },
  fileName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'FiraCode-Medium',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#3C3C3E',
  },
  langButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  langMenu: {
    position: "absolute",
    top: 56,
    left: 16,
    backgroundColor: "#2C2C2E",
    borderRadius: 6,
    paddingVertical: 4,
    zIndex: 20,
  },
  langMenuItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  langMenuText: {
    color: "#FFFFFF",
    fontFamily: "FiraCode-Regular",
  },
  editorWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  lineNumbers: {
    width: 50,
    backgroundColor: '#2C2C2E',
    paddingTop: 16,
    paddingHorizontal: 8,
    flexGrow: 0,
  },
  lineNumber: {
    color: '#8E8E93',
    fontSize: 14,
    fontFamily: 'FiraCode-Regular',
    lineHeight: 20,
    textAlign: 'right',
  },
  codeScroll: {
    flex: 1,
  },
  codeContainer: {
    position: 'relative',
  },
  codeInput: {
    color: 'transparent',
    fontSize: 14,
    fontFamily: 'FiraCode-Regular',
    lineHeight: 20,
    padding: 16,
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  cursor: {
    position: 'absolute',
    width: 2,
    height: LINE_HEIGHT,
    backgroundColor: '#007AFF',
    zIndex: 3,
  },
  terminalContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: screenHeight * 0.6,
    backgroundColor: '#000000',
    zIndex: 10,
  },
});
