/**
 * src/services/authService.ts
 * Real Supabase auth service for Expo / React Native.
 */

import { supabase } from '../lib/supabase';
import { TeamId } from '../types/team';
import { User } from '../types/user';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  teamId: TeamId;
}

export interface AuthResult {
  user: User;
  token: string | null;
}

function mapProfileToUser(profile: any): User {
  return {
    id: profile.id,
    username: profile.username,
    email: profile.email ?? '',
    teamId: profile.team_id,
    score: profile.score ?? 0,
    postersContributed: profile.posters_contributed ?? 0,
    joinedAt: profile.created_at,
    avatarUrl: profile.avatar_url ?? undefined,
  };
}

async function loadProfile(userId: string, email?: string | null): Promise<User> {
  const delays = [200, 400, 800, 1500, 2500];
  let lastError: any = null;

  for (let i = 0; i < delays.length; i++) {
    console.log(`Loading profile for user ${userId}, attempt ${i + 1}`);

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, team_id, score, posters_contributed, avatar_url, created_at')
      .eq('id', userId)
      .single();

    if (!error && data) {
      return mapProfileToUser({
        ...data,
        email: email ?? '',
      });
    }

    lastError = error;

    if (i < delays.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delays[i]));
    }
  }

  console.log('PROFILE LOAD FAILED:', lastError);

  // fallback minim, doar ca să nu crape complet UI-ul
  return {
    id: userId,
    username: email?.split('@')[0] ?? 'artist',
    email: email ?? '',
    teamId: 'minimalist' as TeamId,
    score: 0,
    joinedAt: new Date().toISOString(),
    postersContributed: 0,
  };
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: payload.email,
      password: payload.password,
    });

    if (error) {
      console.log('LOGIN ERROR:', error);
      throw error;
    }

    if (!data.user) {
      throw new Error('No user returned from login');
    }

    if (!data.session) {
      throw new Error('Login succeeded but no session was returned.');
    }

    const profileUser = await loadProfile(data.user.id, data.user.email);

    return {
      user: profileUser,
      token: data.session.access_token ?? null,
    };
  },

  async register(payload: RegisterPayload): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          username: payload.username,
          team_id: payload.teamId,
        },
      },
    });

    if (error) {
      console.log('REGISTER ERROR:', error);
      throw error;
    }

    if (!data.user) {
      throw new Error('No user returned from registration');
    }

    if (!data.session) {
      throw new Error(
        'Contul a fost creat, dar trebuie confirmat emailul înainte de login.'
      );
    }

    const profileUser = await loadProfile(data.user.id, data.user.email);

    return {
      user: profileUser,
      token: data.session.access_token ?? null,
    };
  },

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.log('LOGOUT ERROR:', error);
      throw error;
    }
  },

  async restoreSession(): Promise<AuthResult | null> {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.log('RESTORE SESSION ERROR:', error);
      throw error;
    }

    const session = data.session;

    if (!session?.user) {
      return null;
    }

    const profileUser = await loadProfile(session.user.id, session.user.email);

    return {
      user: profileUser,
      token: session.access_token ?? null,
    };
  },
};