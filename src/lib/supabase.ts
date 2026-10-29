import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * CLIENTE SUPABASE FRONTEND (PÚBLICO)
 * 
 * DIRETIVA DE SEGURANÇA:
 * - Este cliente é executado exclusivamente no navegador.
 * - Utiliza estritamente a chave pública (publishable / anon).
 * - Todas as consultas e mutações estão sujeitas às políticas Row Level Security (RLS) do Supabase.
 * - NUNCA importe ou utilize SUPABASE_SECRET_KEY neste módulo.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Verificação de segurança ativa contra vazamento acidental de chaves secretas no frontend
if (supabaseAnonKey && (supabaseAnonKey.includes('service_role') || supabaseAnonKey.toLowerCase().includes('secret'))) {
  console.error('[SEGURANÇA CRÍTICA] Tentativa de inicialização do frontend com chave de serviço/secreta bloqueada.');
  throw new Error('Erro de Segurança: Apenas a chave pública (publishable / anon) é permitida no frontend.');
}

// Validação de presença das credenciais públicas reais
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl !== 'https://seu-projeto.supabase.co' && 
    supabaseAnonKey !== 'sua-chave-anon-publica' &&
    supabaseAnonKey !== 'sua-chave-publica-anon'
  );
};

// Instanciação segura do cliente Supabase para o navegador
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured() ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured() ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
