import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Linking,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useLocalSearchParams } from 'expo-router';
import * as FS from '@/utils/fs';
import {
  Play,
  Save,
  Undo,
  Redo,
  Plus,
  ChevronDown,
  ExternalLink,
  Copy,
} from 'lucide-react-native';
import { CodeKeyboard } from '@/components/CodeKeyboard';
import { SyntaxHighlighter } from '@/components/SyntaxHighlighter';
import { TerminalPanel } from '@/components/TerminalPanel';
import { TemplateRenamer } from '@/components/TemplateRenamer';
import { templateService, TemplateMatch } from '@/utils/templateSystem';
import { syncService } from '@/services/syncService';
// No clipboard import needed - using React Native's built-in method
import { authService } from '@/services/authService';
import { useLanguage } from '@/contexts/LanguageContext';

const { height: screenHeight } = Dimensions.get('window');
const LINE_HEIGHT = 20;
const DEFAULT_CHAR_WIDTH = 8.4;
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
  const { currentLanguage, setLanguageByFileExtension } = useLanguage();
  const [language, setLanguage] = useState('python'); // Keep for LeetCode compatibility
  const [codeDefs, setCodeDefs] = useState<any[]>([]);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showTemplateRenamer, setShowTemplateRenamer] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<TemplateMatch | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [charWidth, setCharWidth] = useState(DEFAULT_CHAR_WIDTH);
  const [cursorCoords, setCursorCoords] = useState<{ left: number; top: number }>({ left: 16, top: 16 });
  const [history, setHistory] = useState([{ code: INITIAL_CODE, cursor: 0 }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState('');
  const [suppressAutoScroll, setSuppressAutoScroll] = useState(false);
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
      const tempPath = FS.cacheDirectory + filename;
      await FS.writeText(tempPath, content);
      
      const success = await syncService.uploadFile(tempPath, filename);
      
      // Clean up temp file
      await FS.remove(tempPath, { idempotent: true });
      
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
  // Keep content width from shrinking while editing to avoid horizontal jumps
  const maxContentWidthRef = useRef(0);
  const [showSystemKeyboard, setShowSystemKeyboard] = useState(false);
  const [hScrollX, setHScrollX] = useState(0);
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
    const template = templateService.findTemplateAtPosition(code, position);
    
    if (template) {
      setActiveTemplate(template);
      setShowTemplateRenamer(true);
    } else {
      // Force it to work with the first template we know exists
      const allTemplates = templateService.findTemplatesInText(code, 0);
      if (allTemplates.length > 0) {
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
          const content = await FS.readText(fileUri as string);
          setCode(content);
          setOriginalContent(content);
          setIsModified(false);
          setLastSavedContent(content);
          updateHistory(content, content.length);
          const name = fileUri.split('/').pop() || 'file';
          setActiveFile(cloudFileName || name);
          
          // Detect and set language based on file extension
          setLanguageByFileExtension(name);
          
          // Also set local language state for LeetCode compatibility
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
          await FS.writeText(fileUri as string, code);
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

  const insertCode = (text: string, options?: { fromKeyboard?: boolean }) => {
    if (!options?.fromKeyboard) {
      setShowSystemKeyboard(false);
      Keyboard.dismiss();
    }
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
    const newCursorPosition = cursorPosition + insertText.length;
    
    setCode(newCode);
    updateHistory(newCode, newCursorPosition);
    setIsModified(newCode !== originalContent);
    setTextSelection({ start: newCursorPosition, end: newCursorPosition });
    setCursorPosition(newCursorPosition);

    if (options?.fromKeyboard) {
      if (!isEditing) setIsEditing(true);
      setTimeout(() => {
        if (editorRef.current) {
          focusFromInsert.current = true;
          editorRef.current.focus();
          setShowSystemKeyboard(true);
          moveCursor(newCursorPosition);
          focusFromInsert.current = false;
        }
      }, 0);
    } else {
      // Keep system keyboard hidden after snippet inserts
      if (isEditing) setIsEditing(false);
    }
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
    const lines = code.split('\n');
    const beforeCursor = code.substring(0, cursorPosition);
    const currentLineIndex = beforeCursor.split('\n').length - 1;
    
    // Check if there's a next line
    if (currentLineIndex + 1 < lines.length) {
      // Calculate the start position of the next line
      let nextLineStart = 0;
      for (let i = 0; i <= currentLineIndex; i++) {
        nextLineStart += lines[i].length + 1; // +1 for the newline character
      }
      
      // Move to the end of the next line
      const nextLine = lines[currentLineIndex + 1];
      moveCursor(nextLineStart + nextLine.length);
    } else {
      // No next line exists - create a new line
      const newCode = code + '\n';
      setCode(newCode);
      updateHistory(newCode, newCode.length);
      moveCursor(newCode.length);
    }
  };

  const moveCursorLeft = () => {
    if (cursorPosition > 0) {
      moveCursor(cursorPosition - 1);
    }
  };

  const moveCursorRight = () => {
    if (cursorPosition < code.length) {
      moveCursor(cursorPosition + 1);
    }
  };

  const handleTextChange = (text: string) => {
    // Compute diff to determine insertion point and inserted text
    let i = 0;
    while (i < code.length && i < text.length && code[i] === text[i]) i++;
    let j = 0;
    while (
      j < code.length - i &&
      j < text.length - i &&
      code[code.length - 1 - j] === text[text.length - 1 - j]
    ) j++;

    const removed = code.slice(i, code.length - j);
    const added = text.slice(i, text.length - j);

    // If Enter inserted, apply auto-indent
    if (added === "\n") {
      insertCode("\n", { fromKeyboard: true });
      return;
    }

    // Generic update: set code and move cursor to end of inserted segment
    setCode(text);
    const newCursor = i + added.length;
    updateHistory(text, newCursor);
    setIsModified(text !== originalContent);
    moveCursor(newCursor);
  };


  const getCursorCoords = () => {
    const beforeCursor = code.substring(0, cursorPosition);
    const lines = beforeCursor.split('\n');
    const row = lines.length - 1;
    const col = lines[lines.length - 1].length;
    return {
      top: 16 + row * LINE_HEIGHT,
      left: 16 + col * charWidth,
    };
  };

  // Removed previous caret-visibility scroll correction to avoid fighting iOS animations

  const runCode = () => {
    // Dismiss keyboard first, then show terminal
    dismissKeyboard();
    setTimeout(() => {
      setIsTerminalVisible(true);
      terminalOffset.value = withSpring(screenHeight * 0.15);
    }, 100);
  };

  const copyCode = async () => {
    try {
      await Share.share({
        message: code,
        title: 'Code from Mobile Code Editor',
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share code. Try selecting and copying the text manually.');
    }
  };

  const saveFile = async () => {
    try {
      if (fileUri) {
        // Save to existing file
        await FS.writeText(fileUri as string, code);
        setOriginalContent(code);
        setIsModified(false);
        setLastSavedContent(code);
        
        // Auto-save to cloud if authenticated
        if (isAuthenticated) {
          await autoSaveToCloud(activeFile, code);
        }
      } else {
        const extension = getExtension(language);
        
        if (slug && codeDefs.length > 0) {
          // Auto-name using LeetCode problem slug
          const autoFilename = `lc-${slug}.${extension}`;
          
          try {
            const ROOT_DIR = FS.documentDirectory + 'files/';
            await FS.ensureDir(ROOT_DIR);
            const newPath = ROOT_DIR + autoFilename;
            
            await FS.writeText(newPath, code);
            setOriginalContent(code);
            setIsModified(false);
            setActiveFile(autoFilename);
            setLastSavedContent(code);
            
            // Auto-save to cloud if authenticated
            if (isAuthenticated) {
              await autoSaveToCloud(autoFilename, code);
            }
          } catch (e) {
            console.error('Failed to save file', e);
            Alert.alert('Error', 'Failed to save file. Please try again.');
          }
        } else {
          // Prompt for filename for regular files
          const defaultName = `untitled.${extension}`;
          if (Platform.OS === 'android') {
            // Android: Alert.prompt is not supported; use default name
            try {
              const ROOT_DIR = FS.documentDirectory + 'files/';
              await FS.ensureDir(ROOT_DIR);
              const newPath = ROOT_DIR + defaultName;
              await FS.writeText(newPath, code);
              setOriginalContent(code);
              setIsModified(false);
              setActiveFile(defaultName);
              setLastSavedContent(code);
              if (isAuthenticated) {
                await autoSaveToCloud(defaultName, code);
              }
              Alert.alert('Saved', `Saved as ${defaultName}`);
            } catch (e) {
              console.error('Failed to save file', e);
              Alert.alert('Error', 'Failed to save file. Please try again.');
            }
          } else {
            Alert.prompt(
              'Save File',
              'Enter a filename:',
              async (filename: string) => {
                if (!filename || !filename.trim()) {
                  return; // User cancelled or entered empty name
                }
                let finalFilename = filename.trim();
                if (!finalFilename.includes('.')) {
                  finalFilename += `.${extension}`;
                }
                try {
                  const ROOT_DIR = FS.documentDirectory + 'files/';
                  await FS.ensureDir(ROOT_DIR);
                  const newPath = ROOT_DIR + finalFilename;
                  await FS.writeText(newPath, code);
                  setOriginalContent(code);
                  setIsModified(false);
                  setActiveFile(finalFilename);
                  setLastSavedContent(code);
                  if (isAuthenticated) {
                    await autoSaveToCloud(finalFilename, code);
                  }
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
      }
    } catch (e) {
      console.error('Failed to save file', e);
      Alert.alert('Error', 'Failed to save file. Please try again.');
    }
  };

  const cursor = cursorCoords;
  const maxLineLength = Math.max(
    ...code.split('\n').map((line) => line.length),
  );
  const contentWidth = Math.max(
    maxLineLength * charWidth + 48,
    Dimensions.get('window').width - 50,
  );

  // Stabilize width: never shrink during an edit session
  const stableContentWidth = Math.max(contentWidth, maxContentWidthRef.current);
  maxContentWidthRef.current = stableContentWidth;
  
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Measure character width for accurate cursor positioning on Android */}
      <Text
        style={{ position: 'absolute', opacity: 0, fontFamily: 'FiraCode-Regular', fontSize: 14, lineHeight: LINE_HEIGHT }}
        allowFontScaling={false}
        onLayout={(e) => {
          const width = e.nativeEvent.layout.width;
          // We render 100 chars below; divide to get per-char width
          if (width > 0) setCharWidth(width / 100);
        }}
      >
        {/* 100 monospace characters for better precision */}
        MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM
      </Text>
      {/* Measure cursor position using native text layout to avoid char-width drift on Android */}
      <Text
        style={{ position: 'absolute', opacity: 0, fontFamily: 'FiraCode-Regular', fontSize: 14, lineHeight: LINE_HEIGHT }}
        allowFontScaling={false}
        onTextLayout={(e) => {
          const lines = e.nativeEvent.lines || [];
          const row = Math.max(0, lines.length - 1);
          const width = lines[row]?.width ?? 0;
          setCursorCoords({ left: 16 + width, top: 16 + row * LINE_HEIGHT });
        }}
      >
        {code.substring(0, cursorPosition) || ' '}
      </Text>
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
                <TouchableOpacity style={styles.actionButton} onPress={copyCode}>
                  <Copy size={16} color="#007AFF" />
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
                scrollEnabled={!suppressAutoScroll}
                onScroll={(e) => setHScrollX(e.nativeEvent.contentOffset.x)}
                scrollEventThrottle={16}
              >
                <View style={[styles.codeContainer, { width: stableContentWidth + 50, minHeight: contentHeight }]}>
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
                      language={currentLanguage.key} 
                      onTemplateClick={handleTemplateClick}
                    />
                    {(Platform.OS === 'android' || !isEditing) && (
                      <View
                        style={[
                          styles.cursor,
                          { left: cursor.left, top: cursor.top },
                        ]}
                      />
                    )}
                    {/* Overlay to capture double-taps for editing */}
                    {!isEditing && (
                      <TouchableWithoutFeedback
                        onPress={() => {
                          setIsEditing(true);
                          setTimeout(() => {
                            editorRef.current?.focus();
                            setShowSystemKeyboard(true);
                          }, 100);
                        }}
                      >
                        <View style={styles.editOverlay} pointerEvents="box-only" />
                      </TouchableWithoutFeedback>
                    )}
                  </View>
                </View>
              </ScrollView>
              {/* TextInput overlay only when editing (prevents Android dark overlay artifacts) */}
              {isEditing && (
                <TextInput
                  ref={editorRef}
                  style={[
                    styles.codeInput,
                    {
                      width: stableContentWidth,
                      transform: [{ translateX: 50 - hScrollX }],
                      height: contentHeight,
                      opacity: Platform.OS === 'android' ? 0.01 : 1,
                    },
                  ]}
                  value={code}
                  selection={textSelection}
                  onChangeText={handleTextChange}
                  onKeyPress={(e) => {
                    if (e.nativeEvent.key === 'Backspace') {
                      setSuppressAutoScroll(true);
                      setTimeout(() => setSuppressAutoScroll(false), 450);
                    }
                  }}
                  onSelectionChange={(event) => {
                    const { start, end } = event.nativeEvent.selection;
                    setTextSelection({ start, end });
                    setCursorPosition(end);
                  }}
                  multiline
                  textAlignVertical="top"
                  selectionColor={Platform.OS === 'android' ? 'transparent' : '#007AFF'}
                  placeholderTextColor="#8E8E93"
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  keyboardType="ascii-capable"
                  allowFontScaling={false}
                  blurOnSubmit={false}
                  returnKeyType="default"
                  showSoftInputOnFocus={isEditing}
                  scrollEnabled={false}
                  pointerEvents="auto"
                  underlineColorAndroid="transparent"
                  caretHidden={Platform.OS === 'android'}
                  importantForAutofill="no"
                  autoComplete="off"
                  disableFullscreenUI
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
              )}
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
              onMoveLeftLine={moveCursorLeft}
              onMoveRightLine={moveCursorRight}
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
        currentLanguage={currentLanguage}
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
