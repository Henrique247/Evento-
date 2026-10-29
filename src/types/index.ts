/**
 * Definições de Tipos do EventFlow
 */

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

export type TicketStatus = 'confirmed' | 'checked_in' | 'cancelled';

export type AccountType = 'organizer' | 'organization';

export type UserRole = 'admin' | 'organizer' | 'scanner';

export type UserAccountStatus = 'active' | 'suspended';

export interface UserProfile {
  id: string;
  email: string;
  account_type: AccountType;
  full_name: string; // Para organizador: seu nome; Para organização: nome da organização ou representante
  org_name?: string; // Nome da entidade (se organização)
  nif?: string; // NIF confidencial (apenas para organização, visível para o próprio e administradores)
  legal_representative?: string; // Representante legal (se organização)
  phone?: string;
  province?: string;
  role: UserRole;
  status: UserAccountStatus;
  created_at?: string;
}

export interface EventModel {
  id: string;
  owner_id: string;
  owner_name?: string;
  owner_account_type?: AccountType;
  title: string;
  description: string;
  category: string;
  status: EventStatus;
  start_date: string; // ISO string YYYY-MM-DDTHH:mm
  end_date: string;   // ISO string YYYY-MM-DDTHH:mm
  location_name: string;
  location_address: string;
  province: string;   // Ex: Luanda, Benguela, Huambo, etc.
  is_unlimited_capacity: boolean;
  capacity: number;
  registered_count: number;
  validated_count: number;
  is_paid: boolean;
  price_aoa: number;  // Valor em Kwanzas (Kz)
  payment_instructions?: string; // Ex: Coordenadas IBAN, Multicaixa Express
  banner_url?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  event_id: string;
  serial_number: string; // Ex: EVF-2026-89412
  attendee_name: string;
  attendee_phone: string;
  attendee_email?: string;
  status: TicketStatus;
  checked_in_at?: string;
  created_at: string;
  qr_code_data: string;
}

export interface CreateEventInput {
  title: string;
  description: string;
  category: string;
  status?: EventStatus;
  start_date: string;
  end_date: string;
  location_name: string;
  location_address: string;
  province: string;
  is_unlimited_capacity: boolean;
  capacity: number;
  is_paid: boolean;
  price_aoa: number;
  payment_instructions?: string;
  banner_url?: string;
  logo_url?: string;
}

export interface RegisterAttendeeInput {
  attendee_name: string;
  attendee_phone: string;
  attendee_email?: string;
}

export interface PlatformMetrics {
  totalEvents: number;
  publishedEvents: number;
  totalUsers: number;
  organizersCount: number;
  organizationsCount: number;
  totalRegistered: number;
  totalValidated: number;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  target_type: 'event' | 'user' | 'organization';
  target_id: string;
  details: string;
  created_at: string;
}

export type AppRoute =
  | { name: 'landing' }
  | { name: 'events' }
  | { name: 'my-events' }
  | { name: 'event-new'; redirectAfterLogin?: boolean }
  | { name: 'event-edit'; eventId: string }
  | { name: 'event-public'; eventId: string }
  | { name: 'ticket'; serialNumber: string }
  | { name: 'scanner' }
  | { name: 'login'; redirectTarget?: string }
  | { name: 'register'; redirectTarget?: string }
  | { name: 'forgot-password' }
  | { name: 'profile' }
  | { name: 'privado' } // Acesso administrativo pela rota /privado
  | { name: 'about' }
  | { name: 'terms' }
  | { name: 'privacy' };
