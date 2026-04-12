import { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext(/** @type {any} */ (null));

/** @param {any} supabaseUser */
async function ensureUserProfile(supabaseUser) {
  if (!supabaseUser) return null;

  const { data: existing } = await supabase
    .from('app_users')
    .select('*')
    .eq('email', supabaseUser.email)
    .maybeSingle();

  if (existing) return buildUserObject(supabaseUser, existing);

  const { data: created } = await supabase
    .from('app_users')
    .insert({
      email: supabaseUser.email,
      full_name: supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
      display_name: supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
      avatar_url: supabaseUser.user_metadata?.avatar_url || null,
      role: 'employee',
    })
    .select('*')
    .maybeSingle();

  return buildUserObject(supabaseUser, created);
}

/** @param {any} supabaseUser @param {any} profile */
function buildUserObject(supabaseUser, profile) {
  return {
    id: profile?.id || supabaseUser.id,
    email: supabaseUser.email,
    full_name: profile?.full_name || supabaseUser.user_metadata?.full_name || supabaseUser.email,
    display_name: profile?.display_name || profile?.full_name || supabaseUser.email,
    role: profile?.role || 'employee',
    department: profile?.department || '',
    department_id: profile?.department_id || '',
    avatar_url: profile?.avatar_url || supabaseUser.user_metadata?.avatar_url || '',
  };
}

/** @param {{ children: import('react').ReactNode }} props */
export const AuthProvider = ({ children }) => {
  /** @type {[any, import('react').Dispatch<any>]} */
  const [user, setUser] = useState(/** @type {any} */ (null));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError] = useState(/** @type {any} */ (null));

  useEffect(() => {
    let initialDone = false;

    // Safety fallback: if Supabase never fires INITIAL_SESSION in 5s, unblock the UI
    const safetyTimer = setTimeout(() => {
      console.warn('[AuthContext] Timeout: Supabase no respondió en 5s.');
      if (!initialDone) {
        initialDone = true;
        setIsLoadingAuth(false);
      }
    }, 5000);

    // Single source of truth: onAuthStateChange fires INITIAL_SESSION on mount
    // with the stored session (if any), so we never need a separate getSession() call.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        try {
          const profile = await ensureUserProfile(session.user);
          setUser(profile);
          setIsAuthenticated(true);
        } catch (/** @type {any} */ err) {
          console.warn('[AuthContext] ensureUserProfile error:', err?.message);
          setUser({
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || session.user.email,
            display_name: session.user.user_metadata?.full_name || session.user.email,
            role: 'employee',
            department: '',
            department_id: '',
            avatar_url: '',
          });
          setIsAuthenticated(true);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }

      // Stop loading spinner after the first event (INITIAL_SESSION) resolves
      if (!initialDone) {
        initialDone = true;
        clearTimeout(safetyTimer);
        setIsLoadingAuth(false);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  const updateUser = (/** @type {Record<string, any>} */ updated) => setUser((/** @type {any} */ u) => ({ ...u, ...updated }));

  const navigateToLogin = () => { window.location.href = '/login'; };

  const checkAppState = async () => {
    setIsLoadingAuth(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await ensureUserProfile(session.user);
      setUser(profile);
      setIsAuthenticated(true);
    }
    setIsLoadingAuth(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings: null,
      logout,
      updateUser,
      navigateToLogin,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
