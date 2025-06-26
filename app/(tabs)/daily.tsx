import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Play } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function DailyChallengeScreen() {
  const router = useRouter();
  const [description, setDescription] = useState('Loading daily challenge...');

  useEffect(() => {
    async function loadChallenge() {
      try {
        // Replace this logic with real data fetching for the LeetCode Daily Challenge
        const text = await Promise.resolve('Daily challenge description goes here.');
        setDescription(text);
      } catch (e) {
        setDescription('Failed to load daily challenge.');
      }
    }

    loadChallenge();
  }, []);

  const openEditor = () => {
    router.push('/(tabs)/index');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Challenge</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.description}>{description}</Text>
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
});
