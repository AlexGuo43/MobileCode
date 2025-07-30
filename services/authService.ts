import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://backend-production-a87d.up.railway.app/api';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface Device {
  id: string;
  user_id: string;
  name: string;
  type: 'mobile' | 'desktop';
  platform: string;
  last_active: Date;
  created_at: Date;
}

export interface LoginResponse {
  user: AuthUser;
  device: Device;
  token: string;
  expires_at: string;
}

class AuthService {
  private static readonly ACCESS_TOKEN_KEY = 'mobilecoder_access_token';
  private static readonly USER_DATA_KEY = 'mobilecoder_user_data';
  private static readonly DEVICE_DATA_KEY = 'mobilecoder_device_data';

  private getDeviceName(): string {
    return `${Platform.OS === 'ios' ? 'iPhone' : 'Android'} - MobileCoder`;
  }

  private getPlatform(): string {
    return Platform.OS;
  }

  async register(email: string, password: string, name: string): Promise<AuthUser | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      return data.data;
    } catch (error) {
      console.error('Registration error:', error);
      return null;
    }
  }

  async signIn(email: string, password: string): Promise<AuthUser | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          device_name: this.getDeviceName(),
          device_type: 'mobile',
          platform: this.getPlatform(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      const loginData: LoginResponse = data.data;

      // Store auth data securely
      await SecureStore.setItemAsync(AuthService.ACCESS_TOKEN_KEY, loginData.token);
      await SecureStore.setItemAsync(AuthService.USER_DATA_KEY, JSON.stringify(loginData.user));
      await SecureStore.setItemAsync(AuthService.DEVICE_DATA_KEY, JSON.stringify(loginData.device));

      return loginData.user;
    } catch (error) {
      console.error('Sign in error:', error);
      return null;
    }
  }


  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const accessToken = await SecureStore.getItemAsync(AuthService.ACCESS_TOKEN_KEY);
      const userDataStr = await SecureStore.getItemAsync(AuthService.USER_DATA_KEY);

      if (!accessToken || !userDataStr) {
        return null;
      }

      // Verify token is still valid by making an API call
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Token is invalid, clear stored data
        await this.signOut();
        return null;
      }

      return JSON.parse(userDataStr);
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async signOut(): Promise<void> {
    try {
      const accessToken = await SecureStore.getItemAsync(AuthService.ACCESS_TOKEN_KEY);
      
      if (accessToken) {
        // Notify server about logout
        try {
          await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });
        } catch (error) {
          console.warn('Server logout failed:', error);
        }
      }

      // Clear local data
      await SecureStore.deleteItemAsync(AuthService.ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(AuthService.USER_DATA_KEY);
      await SecureStore.deleteItemAsync(AuthService.DEVICE_DATA_KEY);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(AuthService.ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Get access token error:', error);
      return null;
    }
  }

  async getCurrentDevice(): Promise<Device | null> {
    try {
      const deviceDataStr = await SecureStore.getItemAsync(AuthService.DEVICE_DATA_KEY);
      return deviceDataStr ? JSON.parse(deviceDataStr) : null;
    } catch (error) {
      console.error('Get current device error:', error);
      return null;
    }
  }

  async getUserDevices(): Promise<Device[]> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        return [];
      }

      const response = await fetch(`${API_BASE_URL}/auth/devices`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Get user devices error:', error);
      return [];
    }
  }
}

export const authService = new AuthService();