import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import { X, Download, Monitor, Smartphone, ArrowRight } from 'lucide-react-native';

interface MobileCoderHelpModalProps {
  visible: boolean;
  onClose: () => void;
}

export function MobileCoderHelpModal({ visible, onClose }: MobileCoderHelpModalProps) {

  const openExtensionMarketplace = () => {
    Linking.openURL('https://marketplace.visualstudio.com/items?itemName=MobileCoder.mobilecoder-sync');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>MobileCoder VS Code Extension</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* Main Content */}
            <View style={styles.content}>
              {/* Intro */}
              <View style={styles.section}>
                <View style={styles.iconRow}>
                  <Smartphone size={32} color="#007AFF" />
                  <ArrowRight size={24} color="#8E8E93" />
                  <Monitor size={32} color="#007AFF" />
                </View>
                <Text style={styles.subtitle}>
                  Seamlessly sync your mobile code with VS Code
                </Text>
              </View>

              {/* Features */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>What you get:</Text>
                <View style={styles.featureList}>
                  <Text style={styles.feature}>• Real-time code synchronization</Text>
                  <Text style={styles.feature}>• Full VS Code editor experience</Text>
                  <Text style={styles.feature}>• IntelliSense and debugging</Text>
                  <Text style={styles.feature}>• Extension ecosystem access</Text>
                </View>
              </View>

              {/* How it works */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>How it works:</Text>
                <View style={styles.stepList}>
                  <Text style={styles.step}>1. Install the MobileCoder extension in VS Code</Text>
                  <Text style={styles.step}>2. Sign in with the same account</Text>
                  <Text style={styles.step}>3. Your code syncs automatically</Text>
                  <Text style={styles.step}>4. Edit on mobile, continue on desktop</Text>
                </View>
              </View>

              {/* Call to Action */}
              <View style={styles.ctaSection}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={openExtensionMarketplace}
                >
                  <Download size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Install Extension</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.footer}>
                Boost your coding productivity with the power of VS Code!
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3E',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  subtitle: {
    color: '#8E8E93',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  featureList: {
    gap: 8,
  },
  feature: {
    color: '#8E8E93',
    fontSize: 15,
    lineHeight: 20,
  },
  stepList: {
    gap: 8,
  },
  step: {
    color: '#8E8E93',
    fontSize: 15,
    lineHeight: 20,
  },
  ctaSection: {
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3C3C3E',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});