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
  Linking,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import {
  Play,
  Save,
  Undo,
  Redo,
  Plus,
  ChevronDown,
  ExternalLink,
} from 'lucide-react-native';
import { CodeKeyboard } from '@/components/CodeKeyboard';
import { SyntaxHighlighter } from '@/components/SyntaxHighlighter';
import { TerminalPanel } from '@/components/TerminalPanel';

const { height: screenHeight } = Dimensions.get('window');
const LINE_HEIGHT = 20;
const CHAR_WIDTH = 8.4;
const INITIAL_CODE = `# Welcome to Mobile Code Editor\n`;

export default function EditorScreen() {
  const { slug, fileUri } = useLocalSearchParams<{ slug?: string; fileUri?: string }>();
  const [code, setCode] = useState(INITIAL_CODE);
  const [isTerminalVisible, setIsTerminalVisible] = useState(false);
  const [activeFile, setActiveFile] = useState('main.py');
  const [language, setLanguage] = useState('python');
  const [codeDefs, setCodeDefs] = useState<any[]>([]);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [history, setHistory] = useState([{ code: INITIAL_CODE, cursor: 0 }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const getExtension = (lang: string) => {
    const normalizedLang = lang === 'python3' ? 'python' : lang;
    const map: Record<string, string> = {
      python: 'py',
      cpp: 'cpp',
      java: 'java',
      c: 'c',
      csharp: 'cs',
      javascript: 'js',
      typescript: 'ts',
      php: 'php',
      swift: 'swift',
      kotlin: 'kt',
      dart: 'dart',
      golang: 'go',
      ruby: 'rb',
      scala: 'scala',
      rust: 'rs',
      racket: 'rkt',
      erlang: 'erl',
      elixir: 'ex',
    };
    return map[normalizedLang] || normalizedLang;
  };

  const getLangFromExt = (ext: string) => {
    const map: Record<string, string> = {
      py: 'python',
      js: 'javascript',
      ts: 'typescript',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      php: 'php',
      swift: 'swift',
      kt: 'kotlin',
      dart: 'dart',
      go: 'golang',
      rb: 'ruby',
      scala: 'scala',
      rs: 'rust',
      rkt: 'racket',
      erl: 'erlang',
      ex: 'elixir',
    };
    return map[ext] || 'plaintext';
  };

  const terminalOffset = useSharedValue(screenHeight);
  const editorRef = useRef<TextInput>(null);
  const lineNumbersRef = useRef<ScrollView>(null);
  const codeScrollRef = useRef<ScrollView>(null);
  const horizontalScrollRef = useRef<ScrollView>(null);
  const [showSystemKeyboard, setShowSystemKeyboard] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const focusFromInsert = useRef(false);

  const updateHistory = (newCode: string, newCursor: number) => {
    setHistory((prev) => {
      const truncated = prev.slice(0, historyIndex + 1);
      truncated.push({ code: newCode, cursor: newCursor });
      return truncated;
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const { code: prevCode, cursor } = history[newIndex];
    setHistoryIndex(newIndex);
    setCode(prevCode);
    moveCursor(cursor);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const { code: nextCode, cursor } = history[newIndex];
    setHistoryIndex(newIndex);
    setCode(nextCode);
    moveCursor(cursor);
  };

  useEffect(() => {
    async function loadCodeDef() {
      if (!slug) return;

      try {
        const resp = await fetch(
          `https://leetcode-api-tau-eight.vercel.app/problem/${slug}/template`,
        );
        const defs = await resp.json();
        console.log('defs: ', defs);

        if (Array.isArray(defs)) {
          setCodeDefs(defs);
          const preferred =
            defs.find((d: any) => d.value?.toLowerCase().includes('python3')) ||
            defs[0];
          if (preferred?.defaultCode) {
            setCode(preferred.defaultCode);
            updateHistory(preferred.defaultCode, preferred.defaultCode.length);
            setActiveFile(`main.${getExtension(preferred.value)}`);
            if (preferred.value == 'python3') {
              setLanguage('python');
            } else {
              setLanguage(preferred.value);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load code definition:', err);
      }
    }

    loadCodeDef();
  }, [slug]);

  useEffect(() => {
    async function loadLocalFile() {
      if (!fileUri) return;
        try {
          const content = await FileSystem.readAsStringAsync(fileUri as string);
          setCode(content);
          updateHistory(content, content.length);
          const name = fileUri.split('/').pop() || 'file';
          setActiveFile(name);
        const ext = name.split('.').pop() || '';
        setLanguage(getLangFromExt(ext));
      } catch (e) {
        console.error('Failed to load file', e);
      }
    }
    loadLocalFile();
  }, [fileUri]);

  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      },
    );

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
    terminalOffset.value = withSpring(
      newVisibility ? screenHeight * 0.15 : screenHeight,
    );
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
    setShowSystemKeyboard(false);
    Keyboard.dismiss();
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

      insertText = lines
        .map((line, index) => {
          if (index === 0) return line; // First line as-is
          // For all other lines, add the base indentation
          return baseIndent + line;
        })
        .join('\n');
    }

    const beforeCursor = code.substring(0, cursorPosition);
    const afterCursor = code.substring(cursorPosition);
    const newCode = beforeCursor + insertText + afterCursor;
    setCode(newCode);
    updateHistory(newCode, cursorPosition + insertText.length);
    setCursorPosition(cursorPosition + insertText.length);

    // Focus editor and set cursor position
    setTimeout(() => {
      if (editorRef.current) {
        focusFromInsert.current = true;
        editorRef.current.focus();
        Keyboard.dismiss();
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
        focusFromInsert.current = false;
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
      const newCode =
        code.substring(0, lineStart) + newLine + code.substring(end);
      setCode(newCode);
      updateHistory(
        newCode,
        Math.max(lineStart, cursorPosition - indentStep.length),
      );
      setCursorPosition(
        Math.max(lineStart, cursorPosition - indentStep.length),
      );
    }
  };

  const deleteLine = () => {
    const before = code.substring(0, cursorPosition);
    const lineStart = before.lastIndexOf('\n') + 1;
    let lineEnd = code.indexOf('\n', cursorPosition);
    if (lineEnd === -1) lineEnd = code.length;
    else lineEnd += 1;
    const newCode = code.substring(0, lineStart) + code.substring(lineEnd);
    setCode(newCode);
    updateHistory(newCode, lineStart);
    setCursorPosition(lineStart);
  };

  const moveCursor = (pos: number) => {
    setCursorPosition(pos);
    // Always keep TextInput selection in sync, even when not editing
    if (editorRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const input = editorRef.current as any;
      if (typeof input.setNativeProps === 'function') {
        input.setNativeProps({ selection: { start: pos, end: pos } });
      } else if (typeof input.setSelectionRange === 'function') {
        input.setSelectionRange(pos, pos);
      }
    }
  };

  const moveCursorUp = () => {
    const before = code.substring(0, cursorPosition);
    const currentLineStart = before.lastIndexOf('\n') + 1;
    if (currentLineStart === 0) return;
    const prevLineEnd = currentLineStart - 1;
    moveCursor(prevLineEnd);
  };

  const moveCursorDown = () => {
    const nextLineStart = code.indexOf('\n', cursorPosition);
    if (nextLineStart === -1) return;
    const nextLineEnd = code.indexOf('\n', nextLineStart + 1);
    moveCursor(nextLineEnd === -1 ? code.length : nextLineEnd);
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
      updateHistory(text, cursorPosition + (text.length - code.length));
    }
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
      terminalOffset.value = withSpring(screenHeight * 0.15);
    }, 100);
  };

  const saveFile = async () => {
    if (!fileUri) return;
    try {
      await FileSystem.writeAsStringAsync(fileUri as string, code);
    } catch (e) {
      console.error('Failed to save file', e);
    }
  };

  const cursor = getCursorCoords();
  const maxLineLength = Math.max(
    ...code.split('\n').map((line) => line.length),
  );
  const contentWidth = Math.max(
    maxLineLength * CHAR_WIDTH + 48,
    Dimensions.get('window').width - 50,
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
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={dismissKeyboard}
                  >
                    <ChevronDown size={16} color="#007AFF" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.actionButton} onPress={runCode}>
                  <Play size={16} color="#007AFF" />
                </TouchableOpacity>
                {slug && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => Linking.openURL(`https://leetcode.com/problems/${slug}`)}
                  >
                    <ExternalLink size={16} color="#007AFF" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.actionButton} onPress={saveFile}>
                  <Save size={16} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={undo}>
                  <Undo size={16} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={redo}>
                  <Redo size={16} color="#007AFF" />
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
                        updateHistory(def.defaultCode, def.defaultCode.length);
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
            <ScrollView
              style={styles.editorWrapper}
              showsVerticalScrollIndicator={true}
              showsHorizontalScrollIndicator={false}
              bounces={false}
              automaticallyAdjustContentInsets={false}
              automaticallyAdjustKeyboardInsets={false}
              keyboardShouldPersistTaps="handled"
            >
              <ScrollView
                ref={horizontalScrollRef}
                horizontal
                bounces={false}
                showsHorizontalScrollIndicator={false}
                automaticallyAdjustContentInsets={false}
                automaticallyAdjustKeyboardInsets={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={[styles.codeContainer, { width: contentWidth + 50 }]}>
                  {/* Line numbers column */}
                  <View style={styles.lineNumbersColumn}>
                    {code.split('\n').map((_, index) => (
                      <Text key={index} style={styles.lineNumber}>
                        {index + 1}
                      </Text>
                    ))}
                  </View>
                  
                  {/* Code content */}
                  <View style={styles.codeContentColumn}>
                    <SyntaxHighlighter code={code} language={'python'} />
                    <View
                      style={[
                        styles.cursor,
                        { left: cursor.left, top: cursor.top },
                      ]}
                    />
                    {/* Overlay to capture double-taps for editing */}
                    {!isEditing && (
                      <TouchableOpacity
                        style={styles.editOverlay}
                        activeOpacity={1}
                        onPress={() => {
                          setIsEditing(true);
                          setTimeout(() => {
                            editorRef.current?.focus();
                            setShowSystemKeyboard(true);
                          }, 100);
                        }}
                      />
                    )}
                    {/* TextInput only active when editing */}
                    <TextInput
                      ref={editorRef}
                      style={[styles.codeInput, { width: contentWidth }]}
                      value={code}
                      selection={{ start: cursorPosition, end: cursorPosition }}
                      onChangeText={handleTextChange}
                      onSelectionChange={(event) =>
                        setCursorPosition(event.nativeEvent.selection.start)
                      }
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
                      showSoftInputOnFocus={isEditing}
                      scrollEnabled={false}
                      disableScrollViewPanResponder={true}
                      pointerEvents={isEditing ? 'auto' : 'none'}
                      onFocus={() => {
                        if (focusFromInsert.current) {
                          setShowSystemKeyboard(false);
                          Keyboard.dismiss();
                        } else {
                          setIsEditing(true);
                          setShowSystemKeyboard(true);
                        }
                      }}
                      onBlur={() => {
                        setIsEditing(false);
                        setShowSystemKeyboard(false);
                      }}
                    />
                  </View>
                </View>
              </ScrollView>
            </ScrollView>

            {/* Code Keyboard */}
            <CodeKeyboard
              onInsert={insertCode}
              onDeindent={deindentLine}
              onDeleteLine={deleteLine}
              onMoveUpLine={moveCursorUp}
              onMoveDownLine={moveCursorDown}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  langMenu: {
    position: 'absolute',
    top: 56,
    left: 16,
    backgroundColor: '#2C2C2E',
    borderRadius: 6,
    paddingVertical: 4,
    zIndex: 20,
  },
  langMenuItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  langMenuText: {
    color: '#FFFFFF',
    fontFamily: 'FiraCode-Regular',
  },
  editorWrapper: {
    flex: 1,
  },
  lineNumbersColumn: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 50,
    backgroundColor: '#1C1C1E',
    paddingTop: 16,
    paddingHorizontal: 8,
    zIndex: 1,
  },
  lineNumber: {
    color: '#8E8E93',
    fontSize: 14,
    fontFamily: 'FiraCode-Regular',
    lineHeight: 20,
    textAlign: 'right',
  },
  codeContentColumn: {
    marginLeft: 50,
    position: 'relative',
  },
  editOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
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
    bottom: 90,
    height: '80%',
    backgroundColor: '#000000',
    zIndex: 10,
  },
});
