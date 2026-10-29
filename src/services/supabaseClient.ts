/**
 * EventFlow - Camada de Integração Supabase / PostgreSQL
 * 
 * Este ficheiro foi preparado para a futura ligação direta ao Supabase.
 * Para ativar quando tiver as credenciais do seu projeto Supabase:
 * 1. Instale o pacote: npm install @supabase/supabase-js
 * 2. Configure no seu ficheiro .env:
 *    VITE_SUPABASE_URL=https://seu-projeto.supabase.co
 *    VITE_SUPABASE_ANON_KEY=sua-chave-anon
 * 3. Ative o cliente abaixo.
 * 
 * SCHEMA SQL PREPARADO PARA POSTGRESQL (Execute no SQL Editor do Supabase):
 * 
 * create table public.organizations (
 *   id uuid primary key default gen_random_uuid(),
 *   name text not null,
 *   slug text unique not null,
 *   email text,
 *   phone text,
 *   province text default 'Luanda',
 *   logo_url text,
 *   created_at timestamptz default now()
 * );
 * 
 * create table public.events (
 *   id uuid primary key default gen_random_uuid(),
 *   organization_id uuid references public.organizations(id) on delete cascade,
 *   title text not null,
 *   description text,
 *   category text,
 *   status text check (status in ('draft', 'published', 'cancelled', 'completed')) default 'draft',
 *   start_date timestamptz not null,
 *   end_date timestamptz not null,
 *   location_name text not null,
 *   location_address text,
 *   province text not null default 'Luanda',
 *   is_unlimited_capacity boolean default false,
 *   capacity integer default 100,
 *   is_paid boolean default false,
 *   price_aoa numeric default 0,
 *   payment_instructions text,
 *   banner_url text,
 *   logo_url text,
 *   created_at timestamptz default now(),
 *   updated_at timestamptz default now()
 * );
 * 
 * create table public.tickets (
 *   id uuid primary key default gen_random_uuid(),
 *   event_id uuid references public.events(id) on delete cascade,
 *   serial_number text unique not null,
 *   attendee_name text not null,
 *   attendee_phone text not null,
 *   attendee_email text,
 *   status text check (status in ('confirmed', 'checked_in', 'cancelled')) default 'confirmed',
 *   qr_code_data text not null,
 *   checked_in_at timestamptz,
 *   created_at timestamptz default now()
 * );
 */

export interface SupabaseConfig {
  url?: string;
  anonKey?: string;
  isConfigured: boolean;
}

export const getSupabaseConfig = (): SupabaseConfig => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey),
  };
};

/**
 * Indicador de prontidão para a base de dados
 */
export const SUPABASE_ARCHITECTURE_READY = true;
