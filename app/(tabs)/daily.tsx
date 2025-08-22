import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Play } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import RenderHTML from 'react-native-render-html';
import { WebView } from 'react-native-webview';
import { Dimensions } from 'react-native';
const { width } = Dimensions.get('window');

function isHtml(str: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(str);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case 'easy':
      return '#4CAF50'; // green
    case 'medium':
      return '#FFC107'; // yellow
    case 'hard':
      return '#F44336'; // red
    default:
      return '#AAAAAA'; // fallback gray
  }
}

function extractIframes(content: string): { content: string, iframes: string[] } {
  const iframes: string[] = [];
  const iframeRegex = /<iframe[^>]*src="([^"]+)"[^>]*><\/iframe>/g;
  let match;
  
  while ((match = iframeRegex.exec(content)) !== null) {
    iframes.push(match[1]);
  }
  
  return { content, iframes };
}

function cleanSolutionMarkdown(markdown: string): string {
  return markdown
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Convert single $ variable syntax to backticks (e.g., $var$ -> `var`)
    .replace(/\$([^$\s]+)\$/g, '`$1`')
    // Remove all $$...$$ blocks (math expressions) 
    .replace(/\$\$(.*?)\$\$/gs, '$1')
    // Convert LaTeX \textit{} to markdown italics
    .replace(/\\textit\{([^}]+)\}/g, '*$1*')
    // Convert LaTeX \textbf{} to markdown bold
    .replace(/\\textbf\{([^}]+)\}/g, '**$1**')
    // Convert LaTeX \text{} to plain text
    .replace(/\\text\{([^}]+)\}/g, '$1')
    // Mark iframe locations for replacement
    .replace(/<iframe[^>]*src="([^"]+)"[^>]*><\/iframe>/g, '\n\n**[IFRAME_PLACEHOLDER:$1]**\n\n')
    // Remove other LaTeX commands that don't have direct markdown equivalents
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
    // Clean up extra whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
}


function IframeRenderer({ url }: { url: string }) {
  const injectedJavaScript = `
    // Add viewport meta tag for responsive behavior
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';
      document.head.appendChild(meta);
    }
    
    // Add CSS to make content more mobile-friendly
    const style = document.createElement('style');
    style.textContent = \`
      body { 
        margin: 0 !important; 
        padding: 8px !important; 
        font-size: 12px !important;
        overflow-x: auto !important;
      }
      * { 
        max-width: 100% !important; 
        box-sizing: border-box !important;
      }
      .top-bar, .toolbar, .header { 
        font-size: 11px !important;
        padding: 4px !important;
        flex-wrap: wrap !important;
      }
      button, select, input {
        font-size: 11px !important;
        padding: 2px 4px !important;
        margin: 1px !important;
      }
    \`;
    document.head.appendChild(style);
    true;
  `;

  const openInBrowser = () => {
    Linking.openURL(url).catch(err => console.error('Failed to open URL:', err));
  };

  return (
    <View style={styles.iframeContainer}>
      <View style={styles.iframeHeader}>
        <Text style={styles.iframeLabel}></Text>
        <TouchableOpacity style={styles.openBrowserButton} onPress={openInBrowser}>
          <Text style={styles.openBrowserText}>Open in Browser</Text>
        </TouchableOpacity>
      </View>
      <WebView
        source={{ uri: url }}
        style={styles.iframe}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        injectedJavaScript={injectedJavaScript}
        scalesPageToFit={true}
        showsHorizontalScrollIndicator={true}
        showsVerticalScrollIndicator={true}
        bounces={false}
        scrollEnabled={true}
        nestedScrollEnabled={true}
      />
    </View>
  );
}

function SolutionRenderer({ content, iframes }: { content: string, iframes: string[] }) {
  // Split content by iframe placeholders and render both markdown and iframes
  const parts = content.split(/\*\*\[IFRAME_PLACEHOLDER:([^\]]+)\]\*\*/);
  const elements: React.ReactNode[] = [];
  let iframeIndex = 0;

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // This is regular content
      if (parts[i].trim()) {
        if (isHtml(parts[i])) {
          elements.push(
            <RenderHTML
              key={`html-${i}`}
              contentWidth={width}
              source={{ html: parts[i] }}
              baseStyle={{
                color: '#FFFFFF',
                fontSize: 14,
                lineHeight: 20,
                fontFamily: 'FiraCode-Regular',
              }}
              renderersProps={{
                img: {
                  enableExperimentalPercentWidth: true,
                },
              }}
              defaultTextProps={{
                selectable: false,
              }}
            />
          );
        } else {
          elements.push(
            <Markdown
              key={`md-${i}`}
              style={{
                body: {
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontFamily: 'FiraCode-Regular',
                  lineHeight: 22,
                },
                heading1: {
                  fontSize: 22,
                  color: '#FFD700',
                  marginBottom: 8,
                },
                heading2: {
                  fontSize: 18,
                  color: '#FFA500',
                  marginBottom: 6,
                },
                heading3: {
                  fontSize: 16,
                  color: '#00BFFF',
                  marginBottom: 4,
                },
                code_inline: {
                  backgroundColor: '#2A2A2A',
                  color: '#FF6B35',
                  fontFamily: 'FiraCode-Regular',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                },
                code_block: {
                  backgroundColor: '#2C2C2E',
                  color: '#FFFFFF',
                  fontFamily: 'FiraCode-Regular',
                  padding: 12,
                  borderRadius: 8,
                },
                fence: {
                  backgroundColor: '#2C2C2E',
                  color: '#FFFFFF',
                  fontFamily: 'FiraCode-Regular',
                  padding: 12,
                  borderRadius: 8,
                },
                bullet_list: {
                  marginLeft: 16,
                  marginBottom: 8,
                },
                list_item: {
                  marginBottom: 6,
                },
                hr: {
                  borderBottomColor: '#444',
                  borderBottomWidth: 1,
                  marginVertical: 12,
                },
                image: {
                  borderRadius: 6,
                  marginVertical: 8,
                  maxWidth: width - 32,
                },
              }}
            >
              {parts[i]}
            </Markdown>
          );
        }
      }
    } else {
      // This is an iframe URL
      const iframeUrl = parts[i];
      if (iframeUrl && iframeIndex < iframes.length) {
        elements.push(
          <IframeRenderer key={`iframe-${iframeIndex}`} url={iframeUrl} />
        );
        iframeIndex++;
      }
    }
  }

  return <>{elements}</>;
}

export default function DailyChallengeScreen() {
  const router = useRouter();
  const [description, setDescription] = useState('Loading daily challenge...');
  const [date, setDate] = useState('');
  const [qDifficulty, setQDifficulty] = useState('');
  const [activeTab, setActiveTab] = useState<'problem' | 'solution'>('problem');
  const [editorial, setEditorial] = useState('');
  const [communitySolution, setCommunitySolution] = useState('');
  const [solutionType, setSolutionType] = useState<'editorial' | 'community'>('editorial');
  const [editorialIframes, setEditorialIframes] = useState<string[]>([]);
  const [slug, setSlug] = useState('');

  useEffect(() => {
    async function loadChallenge() {
      try {
        // Replace this logic with real data fetching for the LeetCode Daily Challenge
        const resp = await fetch(
          'https://leetcode-api-tau-eight.vercel.app/daily',
        );
        const data = await resp.json();
        // fields interested: .date, .question.titleSlug, .question.difficulty, .question.content
        setDate(data.date);
        setQDifficulty(data.question.difficulty);
        setDescription(data.question.content);
        setSlug(data.question.titleSlug);
        const resp2 = await fetch(`https://leetcode-api-tau-eight.vercel.app/problem/${data.question.titleSlug}/solutions`);
        const data2 = await resp2.json();
        
        // Fetch editorial solution (index 0)
        if (data2.edges && data2.edges[0]) {
          const resp3 = await fetch(`https://leetcode-api-tau-eight.vercel.app/solution/topic/${data2.edges[0].node.topicId}`);
          const data3 = await resp3.json();
          if (data3.content) {
            const { content, iframes } = extractIframes(data3.content);
            const cleaned = cleanSolutionMarkdown(content);
            setEditorial(cleaned);
            setEditorialIframes(iframes);
          } else {
            setEditorial('Editorial solution not available.');
          }
        }
        
        // Fetch community solution (index 1)
        if (data2.edges && data2.edges[1]) {
          const resp4 = await fetch(`https://leetcode-api-tau-eight.vercel.app/solution/topic/${data2.edges[1].node.topicId}`);
          const data4 = await resp4.json();
          if (data4.content) {
            // Use the same original cleaning that was used before
            const cleaned = data4.content
              .replace(/<!--[\s\S]*?-->/g, '')
              .replace(/\$\$(.*?)\$\$/gs, '$1');
            setCommunitySolution(cleaned);
          } else {
            setCommunitySolution('Community solution not available.');
          }
        }
      } catch (e) {
        setDescription('Failed to load daily challenge.');
      }
    }

    loadChallenge();
  }, []);

  const openEditor = async () => {
    try {
      router.push({
        pathname: '/(tabs)/editor',
        params: { slug }, // pass slug as a search param
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>LeetCode Daily Challenge</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaDate}>{formatDate(date)}</Text>
          <Text style={styles.metaDate}>·</Text>
          <Text
            style={[
              styles.metaDifficulty,
              { color: getDifficultyColor(qDifficulty) },
            ]}
          >
            {qDifficulty}
          </Text>
        </View>
      </View>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'problem' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('problem')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'problem' && styles.tabButtonTextActive,
            ]}
          >
            Problem
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'solution' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('solution')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'solution' && styles.tabButtonTextActive,
            ]}
          >
            Solution
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'problem' ? (
          isHtml(description) ? (
            <RenderHTML
              key="problem-description"
              contentWidth={width}
              source={{ html: description }}
              baseStyle={{
                color: '#FFFFFF',
                fontSize: 14,
                lineHeight: 20,
                fontFamily: 'FiraCode-Regular',
              }}
              renderersProps={{
                img: {
                  enableExperimentalPercentWidth: true,
                },
              }}
              defaultTextProps={{
                selectable: false,
              }}
            />
          ) : (
            <Text style={styles.description}>{description}</Text>
          )
        ) : (
          <View>
            <View style={styles.solutionTabs}>
              <TouchableOpacity
                style={[
                  styles.solutionTab,
                  solutionType === 'editorial' && styles.solutionTabActive,
                ]}
                onPress={() => setSolutionType('editorial')}
              >
                <Text
                  style={[
                    styles.solutionTabText,
                    solutionType === 'editorial' && styles.solutionTabTextActive,
                  ]}
                >
                  Editorial
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.solutionTab,
                  solutionType === 'community' && styles.solutionTabActive,
                ]}
                onPress={() => setSolutionType('community')}
              >
                <Text
                  style={[
                    styles.solutionTabText,
                    solutionType === 'community' && styles.solutionTabTextActive,
                  ]}
                >
                  Community
                </Text>
              </TouchableOpacity>
            </View>
            {solutionType === 'editorial' ? (
              <SolutionRenderer 
                content={editorial}
                iframes={editorialIframes}
              />
            ) : (
              <Markdown
                style={{
                  body: {
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontFamily: 'FiraCode-Regular',
                    lineHeight: 22,
                  },
                  heading1: {
                    fontSize: 22,
                    color: '#FFD700',
                    marginBottom: 8,
                  },
                  heading2: {
                    fontSize: 18,
                    color: '#FFA500',
                    marginBottom: 6,
                  },
                  heading3: {
                    fontSize: 16,
                    color: '#00BFFF',
                    marginBottom: 4,
                  },
                  code_inline: {
                    backgroundColor: '#2A2A2A',
                    color: '#FF6B35',
                    fontFamily: 'FiraCode-Regular',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                  },
                  code_block: {
                    backgroundColor: '#2C2C2E',
                    color: '#FFFFFF',
                    fontFamily: 'FiraCode-Regular',
                    padding: 12,
                    borderRadius: 8,
                  },
                  fence: {
                    backgroundColor: '#2C2C2E',
                    color: '#FFFFFF',
                    fontFamily: 'FiraCode-Regular',
                    padding: 12,
                    borderRadius: 8,
                  },
                  bullet_list: {
                    marginLeft: 16,
                    marginBottom: 8,
                  },
                  list_item: {
                    marginBottom: 6,
                  },
                  hr: {
                    borderBottomColor: '#444',
                    borderBottomWidth: 1,
                    marginVertical: 12,
                  },
                  image: {
                    borderRadius: 6,
                    marginVertical: 8,
                    maxWidth: width - 32,
                  },
                }}
              >
                {communitySolution}
              </Markdown>
            )}
          </View>
        )}
      </ScrollView>
      <TouchableOpacity style={styles.button} onPress={openEditor}>
        <Play size={16} color="#FFFFFF" />
        <Text style={styles.buttonText}>Solve in Editor</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2C2C2E',
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3E',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  description: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'FiraCode-Regular',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'FiraCode-Regular',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8, // spacing between date and difficulty
  },
  metaDate: {
    color: '#AAAAAA',
    fontSize: 12,
    fontFamily: 'FiraCode-Regular',
  },
  metaDifficulty: {
    fontSize: 12,
    fontFamily: 'FiraCode-Regular',
    textTransform: 'capitalize',
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3E',
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: '#2C2C2E',
  },
  tabButtonText: {
    color: '#AAAAAA',
    fontFamily: 'FiraCode-Regular',
    fontSize: 14,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  solutionTabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3E',
  },
  solutionTab: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#2C2C2E',
  },
  solutionTabActive: {
    backgroundColor: '#007AFF',
  },
  solutionTabText: {
    color: '#AAAAAA',
    fontFamily: 'FiraCode-Regular',
    fontSize: 12,
  },
  solutionTabTextActive: {
    color: '#FFFFFF',
  },
  iframeContainer: {
    marginVertical: 16,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    padding: 12,
  },
  iframeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iframeLabel: {
    color: '#FFA500',
    fontSize: 14,
    fontFamily: 'FiraCode-Regular',
  },
  openBrowserButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  openBrowserText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'FiraCode-Regular',
  },
  iframe: {
    height: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },
});
