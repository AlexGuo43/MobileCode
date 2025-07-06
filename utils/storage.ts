import { Platform } from 'react-native';

interface Storage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

// Simple storage implementation that works across platforms
class SimpleStorage implements Storage {
  private data: { [key: string]: string } = {};

  async getItem(key: string): Promise<string | null> {
    console.log('Storage getItem called for key:', key);
    try {
      // Try localStorage first (works on web and sometimes React Native)
      if (typeof localStorage !== 'undefined') {
        const value = localStorage.getItem(key);
        console.log('localStorage getValue:', value);
        return value;
      }
    } catch (error) {
      console.warn('localStorage not available:', error);
    }
    
    // Fallback to memory storage
    const value = this.data[key] || null;
    console.log('Memory storage getValue:', value);
    return value;
  }

  async setItem(key: string, value: string): Promise<void> {
    console.log('Storage setItem called for key:', key, 'value length:', value.length);
    try {
      // Try localStorage first (works on web and sometimes React Native)
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
        console.log('Saved to localStorage');
        return;
      }
    } catch (error) {
      console.warn('localStorage not available:', error);
    }
    
    // Fallback to memory storage
    this.data[key] = value;
    console.log('Saved to memory storage');
  }

  async removeItem(key: string): Promise<void> {
    console.log('Storage removeItem called for key:', key);
    try {
      // Try localStorage first (works on web and sometimes React Native)
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
        console.log('Removed from localStorage');
        return;
      }
    } catch (error) {
      console.warn('localStorage not available:', error);
    }
    
    // Fallback to memory storage
    delete this.data[key];
    console.log('Removed from memory storage');
  }
}

export const storage = new SimpleStorage();