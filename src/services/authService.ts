import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile, AccountType } from '../types';

// Chaves de armazenamento utilizadas APENAS para fallback local (quando Supabase não está configurado)
const FALLBACK_TOKEN_KEY = 'eventflow_fallback_token';
const FALLBACK_USER_KEY = 'eventflow_fallback_user';

export interface RegisterInput {
  email: string;
  password: string;
  confirmPassword?: string;
  full_name: string;
  phone?: string;
  province?: string;
  account_type?: AccountType;
  org_name?: string;
  nif?: string;
  legal_representative?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: UserProfile;
  error?: string;
  requiresEmailVerification?: boolean;
}

/**
 * Traduz e formata mensagens de erro do Supabase Auth para português de Angola
 */
export function formatSupabaseAuthError(error: any): string {
  if (!error) return 'Ocorreu um erro inesperado durante a autenticação.';

  const message = (typeof error === 'string' ? error : error.message || '').toLowerCase();
  const status = error.status;

  if (message.includes('invalid login credentials') || message.includes('invalid_grant')) {
    return 'E-mail ou palavra-passe incorretos. Por favor verifique os dados introduzidos.';
  }
  if (message.includes('user already registered') || message.includes('already registered')) {
    return 'Já existe uma conta registada com este endereço de e-mail.';
  }
  if (message.includes('password should be at least') || message.includes('weak_password')) {
    return 'A palavra-passe deve conter pelo menos 6 caracteres.';
  }
  if (message.includes('email not confirmed')) {
    return 'O seu endereço de e-mail ainda não foi confirmado. Verifique a sua caixa de entrada e pasta de spam.';
  }
  if (message.includes('email rate limit exceeded') || message.includes('over_email_send_rate_limit') || message.includes('rate limit') || status === 429) {
    return 'Limite temporário de envio de e-mails atingido no serviço de autenticação. Por favor aguarde alguns minutos ou confirme o link enviado.';
  }
  if (message.includes('network') || message.includes('fetch') || status === 0) {
    return 'Falha na ligação à rede. Por favor verifique o seu acesso à internet.';
  }
  if (message.includes('signup disabled')) {
    return 'O registo de novas contas encontra-se temporariamente suspenso pela administração.';
  }

  return error.message || 'Erro durante a operação de autenticação.';
}

// Cache em memória e localStorage para acesso síncrono rápido
let inMemoryProfile: UserProfile | null = null;
let inMemoryAccessToken: string | null = null;

try {
  const cachedUser = localStorage.getItem('eventflow_session_user') || localStorage.getItem(FALLBACK_USER_KEY);
  if (cachedUser) {
    inMemoryProfile = JSON.parse(cachedUser);
  }
  const cachedToken = localStorage.getItem('eventflow_session_token') || localStorage.getItem(FALLBACK_TOKEN_KEY);
  if (cachedToken) {
    inMemoryAccessToken = cachedToken;
  }
} catch {}

function saveSession(user: UserProfile | null, token: string | null) {
  inMemoryProfile = user;
  inMemoryAccessToken = token;
  try {
    if (user) {
      localStorage.setItem('eventflow_session_user', JSON.stringify(user));
      localStorage.setItem(FALLBACK_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem('eventflow_session_user');
      localStorage.removeItem(FALLBACK_USER_KEY);
    }
    if (token) {
      localStorage.setItem('eventflow_session_token', token);
      localStorage.setItem(FALLBACK_TOKEN_KEY, token);
    } else {
      localStorage.removeItem('eventflow_session_token');
      localStorage.removeItem(FALLBACK_TOKEN_KEY);
    }
  } catch {}
}

// Inicialização imediata do listener nativo de sessão do Supabase
if (isSupabaseConfigured()) {
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) {
      inMemoryAccessToken = data.session.access_token;
    }
  }).catch(() => {});

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      inMemoryAccessToken = session.access_token;
    } else {
      inMemoryAccessToken = null;
      inMemoryProfile = null;
      saveSession(null, null);
    }
  });
}

/**
 * Constrói de forma segura e idempotente o UserProfile a partir do utilizador Supabase Auth
 * com tolerância a falhas na tabela de perfis (fallback para user_metadata).
 */
function buildUserProfileFromAuth(authUser: any, profileRecord?: any): UserProfile {
  const meta = authUser.user_metadata || {};
  const accountType: AccountType = profileRecord?.account_type || meta.account_type || 'organizer';
  
  // Regra estrita: O papel de administrador NUNCA pode ser herdado de user_metadata enviado no frontend
  const safeRole = profileRecord?.role === 'admin' ? 'admin' : (profileRecord?.role || 'organizer');

  const fullName = profileRecord?.full_name || meta.full_name || (accountType === 'organization' ? meta.org_name : authUser.email) || authUser.email;
  const orgName = profileRecord?.org_name || meta.org_name;
  const nif = profileRecord?.nif || meta.nif;
  const legalRep = profileRecord?.legal_representative || meta.legal_representative;

  return {
    id: authUser.id,
    email: authUser.email || profileRecord?.email || '',
    account_type: accountType,
    full_name: fullName,
    org_name: orgName,
    nif: nif,
    legal_representative: legalRep,
    phone: profileRecord?.phone || meta.phone || '',
    province: profileRecord?.province || meta.province || 'Luanda',
    role: safeRole,
    status: profileRecord?.status || 'active',
    created_at: profileRecord?.created_at || authUser.created_at,
  };
}

export const authService = {
  /**
   * Indica se a ligação direta ao Supabase está ativada com credenciais reais
   */
  isSupabaseActive(): boolean {
    return isSupabaseConfigured();
  },

  /**
   * Obtém o token da sessão ativa (utiliza o token nativo do Supabase)
   */
  getToken(): string | null {
    if (isSupabaseConfigured()) {
      return inMemoryAccessToken;
    }
    try {
      return localStorage.getItem(FALLBACK_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Obtém o utilizador em sessão ativa
   */
  getCurrentUser(): UserProfile | null {
    if (isSupabaseConfigured()) {
      return inMemoryProfile;
    }
    try {
      const raw = localStorage.getItem(FALLBACK_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /**
   * Verifica se existe utilizador autenticado
   */
  isAuthenticated(): boolean {
    if (isSupabaseConfigured()) {
      return Boolean(inMemoryAccessToken || inMemoryProfile);
    }
    return Boolean(this.getToken() && this.getCurrentUser());
  },

  /**
   * Autenticação via supabase.auth.signInWithPassword
   * Utiliza a persistência nativa do cliente Supabase no navegador (sem duplicação de tokens no localStorage).
   */
  async signInWithPassword(email: string, password: string): Promise<AuthResponse> {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. SUPABASE AUTH REAL
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error || !data.user) {
          return {
            success: false,
            error: formatSupabaseAuthError(error),
          };
        }

        // Tentar obter dados do perfil na tabela profiles (idempotente com fallback para user_metadata)
        let profileRecord: any = null;
        try {
          const { data: pRecord } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();
          profileRecord = pRecord;
        } catch {
          // Continua em fallback seguro com metadados do utilizador caso a tabela ainda não exista
        }

        const userProfile = buildUserProfileFromAuth(data.user, profileRecord);

        // Verificação de moderação
        if (userProfile.status === 'suspended') {
          await supabase.auth.signOut();
          inMemoryProfile = null;
          inMemoryAccessToken = null;
          return {
            success: false,
            error: 'A sua conta foi suspensa pela moderação da plataforma. Contacte o suporte.',
          };
        }

        // Atualizar estado em memória e localStorage
        saveSession(userProfile, data.session?.access_token || null);

        return {
          success: true,
          user: userProfile,
        };
      } catch (err: any) {
        console.error('[authService] Erro ao autenticar no Supabase:', err);
        return {
          success: false,
          error: formatSupabaseAuthError(err),
        };
      }
    }

    // 2. FALLBACK LOCAL (apenas quando Supabase não estiver configurado)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Credenciais inválidas.' };
      }

      saveSession(data.user, data.token);
      return { success: true, user: data.user };
    } catch {
      return {
        success: false,
        error: 'Falha de comunicação com o serviço de autenticação.',
      };
    }
  },

  /**
   * Registo via supabase.auth.signUp
   * Criação com metadados estruturados, persistência nativa e tratamento idempotente de perfil.
   */
  async signUp(input: RegisterInput): Promise<AuthResponse> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const accountType: AccountType = input.account_type === 'organization' ? 'organization' : 'organizer';
    const displayName = accountType === 'organization'
      ? (input.org_name || input.full_name).trim()
      : input.full_name.trim();

    // 1. SUPABASE AUTH REAL
    if (isSupabaseConfigured()) {
      try {
        const { data: authData, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: input.password,
          options: {
            data: {
              full_name: displayName,
              phone: input.phone?.trim() || '',
              province: input.province || 'Luanda',
              account_type: accountType,
              org_name: accountType === 'organization' ? input.org_name?.trim() : undefined,
              nif: accountType === 'organization' ? input.nif?.trim().toUpperCase() : undefined,
              legal_representative: accountType === 'organization' ? input.legal_representative?.trim() : undefined,
            },
          },
        });

        if (error || !authData.user) {
          return {
            success: false,
            error: formatSupabaseAuthError(error),
          };
        }

        const userId = authData.user.id;

        // Tentativa de sincronização na tabela profiles (se existir na base de dados)
        try {
          await supabase.from('profiles').upsert({
            id: userId,
            email: normalizedEmail,
            full_name: displayName,
            phone: input.phone?.trim() || '',
            account_type: accountType,
            province: input.province || 'Luanda',
            role: 'organizer',
            status: 'active',
          });
        } catch {
          // Mantém consistência através de auth.users.user_metadata
        }

        // Se for Organização e tabela existir, tenta registar entidade institucional
        if (accountType === 'organization' && input.org_name && input.nif) {
          try {
            const { data: orgData } = await supabase.from('organizations').insert({
              name: input.org_name.trim(),
              nif: input.nif.trim().toUpperCase(),
              email: normalizedEmail,
              phone: input.phone?.trim() || '',
              legal_representative: input.legal_representative?.trim() || displayName,
              province: input.province || 'Luanda',
              status: 'active',
            }).select().maybeSingle();

            if (orgData) {
              await supabase.from('organization_members').insert({
                organization_id: orgData.id,
                user_id: userId,
                role: 'admin',
              });
            }
          } catch {
            // Continua seguro com os metadados
          }
        }

        const userProfile = buildUserProfileFromAuth(authData.user);

        // Se o Supabase emitiu sessão imediata (confirmação de email desligada)
        if (authData.session) {
          saveSession(userProfile, authData.session.access_token);
        }

        return {
          success: true,
          user: userProfile,
          requiresEmailVerification: !authData.session,
        };
      } catch (err: any) {
        console.error('[authService] Erro no registo Supabase:', err);
        return {
          success: false,
          error: formatSupabaseAuthError(err),
        };
      }
    }

    // 2. FALLBACK LOCAL (apenas quando Supabase não estiver configurado)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password: input.password,
          confirmPassword: input.confirmPassword,
          full_name: displayName,
          phone: input.phone?.trim() || '',
          province: input.province || 'Luanda',
          account_type: accountType,
          org_name: input.org_name?.trim(),
          nif: input.nif?.trim().toUpperCase(),
          legal_representative: input.legal_representative?.trim(),
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        return { success: false, error: result.error || 'Erro ao criar conta.' };
      }

      saveSession(result.user, result.token);
      return { success: true, user: result.user };
    } catch {
      return {
        success: false,
        error: 'Falha de comunicação com o servidor ao registar utilizador.',
      };
    }
  },

  /**
   * Recuperação de palavra-passe com supabase.auth.resetPasswordForEmail
   */
  async resetPasswordForEmail(email: string): Promise<{ success: boolean; error?: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/#login`,
        });
        if (error) {
          return { success: false, error: formatSupabaseAuthError(error) };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: formatSupabaseAuthError(err) };
      }
    }

    return { success: true };
  },

  /**
   * Terminar sessão via supabase.auth.signOut
   * Limpa a sessão nativa do Supabase e o estado em memória.
   */
  async signOut(): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[authService] Erro ao terminar sessão no Supabase:', err);
      }
    }

    const fallbackToken = this.getToken();
    if (fallbackToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${fallbackToken}` },
        });
      } catch {
        // Ignora erro de rede em logout
      }
    }

    saveSession(null, null);
  },

  /**
   * Verificação e restauro de sessão nativa via supabase.auth.getSession()
   */
  async verifySession(): Promise<UserProfile | null> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!error && data.session?.user) {
          const authUser = data.session.user;

          let profileRecord: any = null;
          try {
            const { data: pRecord } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authUser.id)
              .maybeSingle();
            profileRecord = pRecord;
          } catch {
            // Continua com metadados nativos
          }

          const userProfile = buildUserProfileFromAuth(authUser, profileRecord);

          if (userProfile.status === 'suspended') {
            await supabase.auth.signOut();
            saveSession(null, null);
            return null;
          }

          saveSession(userProfile, data.session.access_token);
          return userProfile;
        }
        saveSession(null, null);
        return null;
      } catch (err) {
        console.warn('[authService] Falha ao restabelecer sessão nativa do Supabase:', err);
        return inMemoryProfile;
      }
    }

    // Fallback para sessão local gravada
    try {
      const rawUser = localStorage.getItem(FALLBACK_USER_KEY);
      const token = localStorage.getItem(FALLBACK_TOKEN_KEY);
      if (rawUser && token) {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          saveSession(json.user, token);
          return json.user;
        }
      }
    } catch {
      // Ignora erro
    }

    return null;
  },

  /**
   * Ouvir alterações no estado de autenticação nativo do Supabase
   */
  onAuthStateChange(callback: (user: UserProfile | null) => void) {
    if (!isSupabaseConfigured()) return { unsubscribe: () => {} };

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        inMemoryAccessToken = session.access_token;
        const user = await authService.verifySession();
        callback(user);
      } else if (event === 'SIGNED_OUT') {
        inMemoryAccessToken = null;
        inMemoryProfile = null;
        callback(null);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        inMemoryAccessToken = session.access_token;
      }
    });

    return {
      unsubscribe: () => {
        listener.subscription.unsubscribe();
      },
    };
  },
};
