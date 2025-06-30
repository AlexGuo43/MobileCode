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
import { Play, Save, Undo, Redo, Plus, ChevronDown } from 'lucide-react-native';
import { CodeKeyboard } from '@/components/CodeKeyboard';
import { SyntaxHighlighter } from '@/components/SyntaxHighlighter';
import { TerminalPanel } from '@/components/TerminalPanel';

const { height: screenHeight } = Dimensions.get('window');

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
    const beforeCursor = code.substring(0, cursorPosition);
    const afterCursor = code.substring(cursorPosition);
    const newCode = beforeCursor + text + afterCursor;
    setCode(newCode);
    setCursorPosition(cursorPosition + text.length);

    // Focus editor and set cursor position
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        const start = cursorPosition + text.length;
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

  const runCode = () => {
    // Dismiss keyboard first, then show terminal
    dismissKeyboard();
    setTimeout(() => {
      setIsTerminalVisible(true);
      terminalOffset.value = withSpring(screenHeight * 0.4);
    }, 100);
  };

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
              
              <View style={styles.codeContainer}>
                <SyntaxHighlighter code={code} language={"python"} />
                <TextInput
                  ref={editorRef}
                  style={styles.codeInput}
                  value={code}
                  onChangeText={setCode}
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
            </View>

            {/* Code Keyboard */}
            <CodeKeyboard onInsert={insertCode} />
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
  codeContainer: {
    flex: 1,
    position: 'relative',
  },
  codeInput: {
    flex: 1,
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