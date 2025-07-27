import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { LogIn, LogOut, Cloud, UserPlus, Smartphone, X } from 'lucide-react-native';
import { authService, AuthUser } from '../services/authService';
import { syncService, SyncResults } from '../services/syncService';

interface AuthButtonProps {
  onAuthStateChange?: (user: AuthUser | null) => void;
}

type AuthMode = 'login' | 'register' | 'pair';

export function AuthButton({ onAuthStateChange }: AuthButtonProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [pairingCode, setPairingCode] = useState('');

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    setIsLoading(true);
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      onAuthStateChange?.(currentUser);
    } catch (error) {
      console.error('Check auth state error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setPairingCode('');
  };

  const handleAuth = async () => {
    if (authMode === 'pair') {
      if (!pairingCode.trim()) {
        Alert.alert('Error', 'Please enter a pairing code.');
        return;
      }
      
      setIsLoading(true);
      try {
        const user = await authService.pairWithCode(pairingCode.trim());
        if (user) {
          setUser(user);
          onAuthStateChange?.(user);
          setShowAuthModal(false);
          clearForm();
          Alert.alert('Success', `Welcome, ${user.name}! Your device has been paired.`);
        } else {
          Alert.alert('Error', 'Invalid pairing code. Please check and try again.');
        }
      } catch (error) {
        console.error('Pairing error:', error);
        Alert.alert('Error', 'Failed to pair device. Please try again.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    if (authMode === 'register' && !name.trim()) {
      Alert.alert('Error', 'Please enter your name.');
      return;
    }

    setIsLoading(true);
    try {
      let user: AuthUser | null = null;
      
      if (authMode === 'register') {
        user = await authService.register(email.trim(), password, name.trim());
        if (user) {
          // Auto-login after registration
          user = await authService.signIn(email.trim(), password);
        }
      } else {
        user = await authService.signIn(email.trim(), password);
      }

      if (user) {
        setUser(user);
        onAuthStateChange?.(user);
        setShowAuthModal(false);
        clearForm();
        Alert.alert(
          'Success', 
          `Welcome, ${user.name}! Your files can now sync across devices.`
        );
      } else {
        Alert.alert(
          'Error', 
          authMode === 'register' 
            ? 'Registration failed. Please try again.' 
            : 'Invalid email or password.'
        );
      }
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Your local files will remain, but syncing will be disabled.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await authService.signOut();
              setUser(null);
              onAuthStateChange?.(null);
              Alert.alert('Signed Out', 'You have been signed out successfully.');
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'An error occurred during sign out.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSync = async () => {
    if (!user) {
      Alert.alert('Not Signed In', 'Please sign in to sync your files.');
      return;
    }

    setIsSyncing(true);
    try {
      const results: SyncResults = await syncService.syncAllFiles();
      
      if (results.failed === 0) {
        if (results.conflicts > 0) {
          Alert.alert('Sync Complete', 'Files synced successfully with some conflicts resolved.');
        } else {
          Alert.alert('Sync Complete', 'Files synced successfully.');
        }
      } else {
        Alert.alert('Sync Completed with Issues', 'Some files failed to sync. Please try again.');
      }
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Sync Error', 'An error occurred while syncing files.');
    } finally {
      setIsSyncing(false);
    }
  };

  const renderAuthModal = () => (
    <Modal
      visible={showAuthModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowAuthModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {authMode === 'login' && 'Sign In'}
            {authMode === 'register' && 'Create Account'}
            {authMode === 'pair' && 'Pair Device'}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowAuthModal(false)}
          >
            <X size={24} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
          {authMode === 'pair' ? (
            <View>
              <Text style={styles.description}>
                Enter the 6-digit pairing code from your other device to sync your files.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="000000"
                value={pairingCode}
                onChangeText={setPairingCode}
                keyboardType="number-pad"
                maxLength={6}
                autoCapitalize="none"
                autoComplete="off"
                textAlign="center"
                fontSize={24}
                letterSpacing={4}
              />
            </View>
          ) : (
            <View>
              <Text style={styles.description}>
                {authMode === 'login' 
                  ? 'Sign in to sync your files across devices.' 
                  : 'Create an account to start syncing your files.'}
              </Text>
              
              {authMode === 'register' && (
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoComplete="name"
                />
              )}
              
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.authButton, isLoading && styles.authButtonDisabled]}
            onPress={handleAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                {authMode === 'login' && <LogIn size={16} color="#FFFFFF" />}
                {authMode === 'register' && <UserPlus size={16} color="#FFFFFF" />}
                {authMode === 'pair' && <Smartphone size={16} color="#FFFFFF" />}
                <Text style={styles.authButtonText}>
                  {authMode === 'login' && 'Sign In'}
                  {authMode === 'register' && 'Create Account'}
                  {authMode === 'pair' && 'Pair Device'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.authModeSwitch}>
            {authMode === 'login' ? (
              <>
                <TouchableOpacity onPress={() => setAuthMode('register')}>
                  <Text style={styles.linkText}>Don't have an account? Sign up</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAuthMode('pair')}>
                  <Text style={styles.linkText}>Have a pairing code? Pair device</Text>
                </TouchableOpacity>
              </>
            ) : authMode === 'register' ? (
              <TouchableOpacity onPress={() => setAuthMode('login')}>
                <Text style={styles.linkText}>Already have an account? Sign in</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setAuthMode('login')}>
                <Text style={styles.linkText}>Don't have a code? Sign in instead</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  if (isLoading && !showAuthModal) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }

  if (!user) {
    return (
      <View>
        <TouchableOpacity 
          style={styles.signInButton} 
          onPress={() => setShowAuthModal(true)}
        >
          <LogIn size={16} color="#FFFFFF" />
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>
        {renderAuthModal()}
      </View>
    );
  }

  return (
    <View style={styles.signedInContainer}>
      <View style={styles.userInfo}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {user.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
          {user.name}
        </Text>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.actionButton, isSyncing && styles.syncingButton]} 
          onPress={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Cloud size={16} color="#FFFFFF" />
          )}
          <Text style={styles.actionText}>
            {isSyncing ? '...' : 'Sync'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <LogOut size={14} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
    height: 36,
  },
  signInText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  signedInContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    maxWidth: '100%',
    flexShrink: 1,
    borderWidth: 1,
    borderColor: '#3C3C3E',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
    maxWidth: '60%',
  },
  avatarPlaceholder: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  syncingButton: {
    backgroundColor: '#8E8E93',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  signOutButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#3C3C3E',
    borderWidth: 1,
    borderColor: '#4C4C4E',
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3E',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  description: {
    color: '#8E8E93',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3C3C3E',
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  authButtonDisabled: {
    backgroundColor: '#8E8E93',
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  authModeSwitch: {
    marginTop: 24,
    gap: 12,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});