import type { User } from '@supabase/supabase-js';

export interface MockUser extends User {
  demo: true;
}

const mockUsers: Map<string, MockUser> = new Map();

function generateMockUser(email: string): MockUser {
  const userId = `demo_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  return {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: email,
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {
      provider: 'demo',
      providers: ['demo'],
    },
    user_metadata: {
      demo: true,
    },
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_anonymous: false,
    demo: true,
  } as MockUser;
}

export const mockAuth = {
  signUp: async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const user = generateMockUser(email);
    mockUsers.set(email, user);
    localStorage.setItem('demo_user', JSON.stringify(user));
    return { user, session: null };
  },

  signIn: async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const user = generateMockUser(email);
    mockUsers.set(email, user);
    localStorage.setItem('demo_user', JSON.stringify(user));
    return { user, session: null };
  },

  signOut: async () => {
    localStorage.removeItem('demo_user');
    mockUsers.clear();
  },

  getCurrentUser: (): MockUser | null => {
    const stored = localStorage.getItem('demo_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  },
};
