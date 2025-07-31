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
  Alert,
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
import { TemplateRenamer } from '@/components/TemplateRenamer';
import { templateService, TemplateMatch } from '@/utils/templateSystem';
import { syncService } from '@/services/syncService';
import { authService } from '@/services/authService';

const { height: screenHeight } = Dimensions.get('window');
const LINE_HEIGHT = 20;
const CHAR_WIDTH = 8.4;
const INITIAL_CODE = `# Welcome to Mobile Code Editor\n`;

export default function EditorScreen() {
  const { slug, fileUri, cloudFileName } = useLocalSearchParams<{ 
    slug?: string; 
    fileUri?: string; 
    cloudFileName?: string; 
  }>();
  const [code, setCode] = useState(INITIAL_CODE);
  const [isTerminalVisible, setIsTerminalVisible] = useState(false);
  const [activeFile, setActiveFile] = useState('main.py');
  const [language, setLanguage] = useState('python');
  const [codeDefs, setCodeDefs] = useState<any[]>([]);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showTemplateRenamer, setShowTemplateRenamer] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<TemplateMatch | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [history, setHistory] = useState([{ code: INITIAL_CODE, cursor: 0 }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState('');
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

  const autoSaveToCloud = async (filename: string, content: string) => {
    if (!isAuthenticated || !filename) return;
    
    try {
      // Create a temp file path for uploading
      const tempPath = FileSystem.cacheDirectory + filename;
      await FileSystem.writeAsStringAsync(tempPath, content);
      
      const success = await syncService.uploadFile(tempPath, filename);
      
      // Clean up temp file
      await FileSystem.deleteAsync(tempPath, { idempotent: true });
      
      if (success) {
        console.log('Auto-saved to cloud:', filename);
      } else {
        console.warn('Auto-save to cloud failed:', filename);
      }
    } catch (e) {
      console.error('Auto-save to cloud error:', e);
    }
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
  const [textSelection, setTextSelection] = useState<{start: number, end: number}>({ start: cursorPosition, end: cursorPosition });
  const [isModified, setIsModified] = useState(false);
  const [originalContent, setOriginalContent] = useState('');

  const updateHistory = (newCode: string, newCursor: number) => {
    setHistory((prev) => {
      const truncated = prev.slice(0, historyIndex + 1);
      truncated.push({ code: newCode, cursor: newCursor });
      return truncated;
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const handleTemplateClick = (position: number) => {
    console.log('handleTemplateClick called with position:', position);
    console.log('Code around position:', code.substring(Math.max(0, position - 10), position + 10));
    console.log('Current showTemplateRenamer state:', showTemplateRenamer);
    
    const template = templateService.findTemplateAtPosition(code, position);
    console.log('Found template:', template);
    
    if (template) {
      console.log('Setting activeTemplate and showTemplateRenamer to true');
      setActiveTemplate(template);
      setShowTemplateRenamer(true);
      console.log('Template renamer should now be visible');
    } else {
      console.log('No template found at position - forcing first template');
      // Force it to work with the first template we know exists
      const allTemplates = templateService.findTemplatesInText(code, 0);
      if (allTemplates.length > 0) {
        console.log('Using first template:', allTemplates[0]);
        setActiveTemplate(allTemplates[0]);
        setShowTemplateRenamer(true);
      }
    }
  };

  const handleTemplateRename = (newValue: string) => {
    if (activeTemplate) {
      const newCode = templateService.replaceTemplate(code, activeTemplate, newValue);
      setCode(newCode);
      updateHistory(newCode, cursorPosition);
      
      // Update cursor position if it was after the template
      if (cursorPosition > activeTemplate.end) {
        const lengthDiff = newValue.length - activeTemplate.placeholder.length;
        setCursorPosition(cursorPosition + lengthDiff);
      }
    }
    setActiveTemplate(null);
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
            setOriginalContent(preferred.defaultCode);
            setIsModified(false);
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
          setOriginalContent(content);
          setIsModified(false);
          setLastSavedContent(content);
          updateHistory(content, content.length);
          const name = fileUri.split('/').pop() || 'file';
          setActiveFile(cloudFileName || name);
        const ext = name.split('.').pop() || '';
        setLanguage(getLangFromExt(ext));
        // Clear code definitions since this is a local file, not a LeetCode problem
        setCodeDefs([]);
      } catch (e) {
        console.error('Failed to load file', e);
      }
    }
    loadLocalFile();
  }, [fileUri, cloudFileName]);


  useEffect(() => {
    templateService.initialize();
    
    // Check auth state
    (async () => {
      const user = await authService.getCurrentUser();
      setIsAuthenticated(!!user);
    })();
    
    // Set initial state for new files
    if (!slug && !fileUri && !cloudFileName) {
      setOriginalContent(INITIAL_CODE);
      setIsModified(false);
      setActiveFile('untitled.py');
      // Clear code definitions since this is a new file, not a LeetCode problem
      setCodeDefs([]);
    }
  }, []);

  // Periodic auto-save - saves every 3 seconds when there are changes
  useEffect(() => {
    const autoSaveInterval = setInterval(async () => {
      // Only auto-save if:
      // 1. There are unsaved changes (code different from last saved)
      // 2. We have a file to save to (fileUri exists)
      // 3. File is not just the default untitled.py
      if (code !== lastSavedContent && fileUri && activeFile !== 'untitled.py') {
        try {
          // Save locally
          await FileSystem.writeAsStringAsync(fileUri as string, code);
          setLastSavedContent(code);
          setOriginalContent(code);
          setIsModified(false);
          
          // Auto-save to cloud if authenticated
          if (isAuthenticated) {
            await autoSaveToCloud(activeFile, code);
          }
          
          console.log('Auto-saved:', activeFile);
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    }, 3000); // Auto-save every 3 seconds

    return () => clearInterval(autoSaveInterval);
  }, [code, lastSavedContent, fileUri, activeFile, isAuthenticated]);

  // Track modifications when code changes
  // useEffect(() => {
  //   setIsModified(code !== originalContent);
  // }, [code, originalContent]);

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
    // Check if content has been modified
    setIsModified(newCode !== originalContent);

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
    setTextSelection({ start: pos, end: pos });
    // Always sync TextInput selection
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
    const minLines = 20;
    const actualLines = code.split('\n').length;
    
    if (actualLines < minLines) {
      // If we have fewer lines than minimum, allow adding new lines
      const currentLineEnd = code.indexOf('\n', cursorPosition);
      const isAtEndOfCode = cursorPosition >= code.length;
      
      if (isAtEndOfCode || currentLineEnd === -1) {
        // Add a new line and move cursor there
        const newCode = code + '\n';
        setCode(newCode);
        updateHistory(newCode, newCode.length);
        setCursorPosition(newCode.length);
        return;
      }
    }
    
    // Normal cursor down movement
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
      // Check if content has been modified
      setIsModified(text !== originalContent);
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
    try {
      if (fileUri) {
        // Save to existing file
        await FileSystem.writeAsStringAsync(fileUri as string, code);
        setOriginalContent(code);
        setIsModified(false);
        setLastSavedContent(code);
        
        // Auto-save to cloud
        await autoSaveToCloud(activeFile, code);
      } else {
        const extension = getExtension(language);
        
        if (slug && codeDefs.length > 0) {
          // Auto-name using LeetCode problem slug
          const autoFilename = `lc-${slug}.${extension}`;
          
          try {
            const ROOT_DIR = FileSystem.documentDirectory + 'files/';
            await FileSystem.makeDirectoryAsync(ROOT_DIR, { intermediates: true });
            const newPath = ROOT_DIR + autoFilename;
            
            await FileSystem.writeAsStringAsync(newPath, code);
            setOriginalContent(code);
            setIsModified(false);
            setActiveFile(autoFilename);
            setLastSavedContent(code);
            
            // Auto-save to cloud
            await autoSaveToCloud(autoFilename, code);
          } catch (e) {
            console.error('Failed to save file', e);
            Alert.alert('Error', 'Failed to save file. Please try again.');
          }
        } else {
          // Prompt for filename for regular files
          const defaultName = `untitled.${extension}`;
          
          Alert.prompt(
            'Save File',
            'Enter a filename:',
            async (filename: string) => {
              if (!filename || !filename.trim()) {
                return; // User cancelled or entered empty name
              }
              
              let finalFilename = filename.trim();
              
              // Add extension if not provided
              if (!finalFilename.includes('.')) {
                finalFilename += `.${extension}`;
              }
              
              try {
                const ROOT_DIR = FileSystem.documentDirectory + 'files/';
                await FileSystem.makeDirectoryAsync(ROOT_DIR, { intermediates: true });
                const newPath = ROOT_DIR + finalFilename;
                
                await FileSystem.writeAsStringAsync(newPath, code);
                setOriginalContent(code);
                setIsModified(false);
                setActiveFile(finalFilename);
                setLastSavedContent(code);
                
                // Auto-save to cloud
                await autoSaveToCloud(finalFilename, code);
              } catch (e) {
                console.error('Failed to save file', e);
                Alert.alert('Error', 'Failed to save file. Please try again.');
              }
            },
            'plain-text',
            defaultName
          );
        }
      }
    } catch (e) {
      console.error('Failed to save file', e);
      Alert.alert('Error', 'Failed to save file. Please try again.');
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
  
  // Ensure minimum height for 20 lines to improve horizontal scrolling
  const minLines = 20;
  const actualLines = code.split('\n').length;
  const displayLines = Math.max(minLines, actualLines);
  const contentHeight = displayLines * LINE_HEIGHT + 32; // 32 for padding
  
  // Pad the code with empty lines to match the minimum display lines
  const paddedCode = actualLines < minLines 
    ? code + '\n'.repeat(minLines - actualLines)
    : code;

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
                <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                  {activeFile}{isModified ? ' *' : ''}
                </Text>
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
                        setOriginalContent(def.defaultCode);
                        setIsModified(false);
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
                <View style={[styles.codeContainer, { width: contentWidth + 50, minHeight: contentHeight }]}>
                  {/* Line numbers column */}
                  <View style={styles.lineNumbersColumn}>
                    {Array.from({ length: displayLines }, (_, index) => (
                      <Text key={index} style={styles.lineNumber}>
                        {index + 1}
                      </Text>
                    ))}
                  </View>
                  
                  {/* Code content */}
                  <View style={styles.codeContentColumn}>
                    <SyntaxHighlighter 
                      code={paddedCode} 
                      language={'python'} 
                      onTemplateClick={handleTemplateClick}
                    />
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
                      selection={textSelection}
                      onChangeText={handleTextChange}
                      onSelectionChange={(event) => {
                        const { start, end } = event.nativeEvent.selection;
                        setTextSelection({ start, end });
                        // Update cursor position to the end of selection (or just cursor if no selection)
                        setCursorPosition(end);
                      }}
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

            {/* Template Renamer Button */}
          {(() => {
            const templates = templateService.findTemplatesInText(code, 0);
            if (templates.length === 0) return null;
            
            return (
              <TouchableOpacity
                style={{
                  backgroundColor: '#007AFF',
                  padding: 10,
                  marginHorizontal: 16,
                  marginVertical: 8,
                  borderRadius: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onPress={() => {
                  handleTemplateClick(templates[0].start);
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>
                  📝 Rename "{templates[0].placeholder}"
                </Text>
              </TouchableOpacity>
            );
          })()}

          {/* Code Keyboard */}
            <CodeKeyboard
              onInsert={insertCode}
              onDeindent={deindentLine}
              onDeleteLine={deleteLine}
              onMoveUpLine={moveCursorUp}
              onMoveDownLine={moveCursorDown}
              currentText={code}
              cursorPosition={cursorPosition}
            />
          </View>
        </GestureDetector>
      </TouchableWithoutFeedback>

      {/* Terminal Panel */}
      {isTerminalVisible && (
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
      )}

      {/* Template Renamer */}
      <TemplateRenamer
        visible={showTemplateRenamer}
        template={activeTemplate}
        onClose={() => {
          setShowTemplateRenamer(false);
          setActiveTemplate(null);
        }}
        onConfirm={handleTemplateRename}
      />
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
    flexShrink: 1,
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
    flex: 1,
    minWidth: 0,
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
