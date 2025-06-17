import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { TerminalPanel } from '@/components/TerminalPanel';

export default function TerminalScreen() {
  const sampleCode = `# Terminal Session - Full Screen Mode
def greet(name):
    return f"Hello, {name}!"

print(greet("Mobile Developer"))

# You can run Python commands here
for i in range(5):
    print(f"Count: {i}")
`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.terminalContainer}>
        <TerminalPanel 
          isVisible={true}
          onClose={() => {}}
          code={sampleCode}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  terminalContainer: {
    flex: 1,
  },
});