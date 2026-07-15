import { createClient } from '@/lib/supabase/server';
import type { UserProfile } from '@/types';


/**
 * ProfileService — reads and writes user profiles in the Supabase profiles table.
 */
export class ProfileService {
  /**
   * Returns the profile for the currently authenticated user, or null if not logged in.
   */
  static async getCurrentProfile(): Promise<UserProfile | null> {
    const supabase = await createClient();

    // getSession() must be called before PostgREST queries to ensure the
    // session is loaded from cookies into the client's internal auth state.
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) return null;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return profile as UserProfile | null;
  }

  /**
   * Updates the profile for the currently authenticated user.
   */
  static async updateProfile(updates: Partial<Pick<UserProfile, 'location' | 'timezone' | 'onboarding_complete'>>) {
    const supabase = await createClient();

    // IMPORTANT: Call getSession() BEFORE getUser() to ensure the session
    // is loaded from cookies and stored in the client's internal auth state.
    // @supabase/ssr v0.12.0 uses skipAutoInitialize:true, so the session
    // is not loaded until getSession() is called explicitly. Without this,
    // subsequent PostgREST queries lack the Authorization header and are
    // denied by RLS policies.
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);

    if (error) throw new Error(error.message);
  }

  /**
   * Returns true if the current user has completed onboarding.
   */
  static async isOnboardingComplete(): Promise<boolean> {
    const profile = await this.getCurrentProfile();
    return profile?.onboarding_complete ?? false;
  }
}