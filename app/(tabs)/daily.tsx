import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Play } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import RenderHTML from 'react-native-render-html';
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

export default function DailyChallengeScreen() {
  const router = useRouter();
  const [description, setDescription] = useState('Loading daily challenge...');
  const [date, setDate] = useState('');
  const [qSlug, setQSlug] = useState('');
  const [qDifficulty, setQDifficulty] = useState('');
  const [activeTab, setActiveTab] = useState<'problem' | 'solution'>('problem');
  const [solution, setSolution] = useState('');

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
        setQSlug(data.question.titleSlug);
        setQDifficulty(data.question.difficulty);
        setDescription(data.question.content);
        if (data.question.solution) {
          setSolution(data.question.solution);
        } else if (data.question.solutions) {
          setSolution(data.question.solutions);
        } else {
          setSolution('Solution not available.');
        }
      } catch (e) {
        setDescription('Failed to load daily challenge.');
      }
    }

    loadChallenge();
  }, []);

  const openEditor = () => {
    router.push('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Coding Challenge</Text>
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
              contentWidth={width}
              source={{ html: description }}
              baseStyle={{
                color: '#FFFFFF',
                fontSize: 14,
                lineHeight: 20,
                fontFamily: 'FiraCode-Regular',
              }}
            />
          ) : (
            <Text style={styles.description}>{description}</Text>
          )
        ) : isHtml(solution) ? (
          <RenderHTML
            contentWidth={width}
            source={{ html: solution }}
            baseStyle={{
              color: '#FFFFFF',
              fontSize: 14,
              lineHeight: 20,
              fontFamily: 'FiraCode-Regular',
            }}
          />
        ) : (
          <Text style={styles.description}>{solution}</Text>
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
});
