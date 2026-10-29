import { 
  EventModel, 
  Ticket, 
  UserProfile, 
  CreateEventInput, 
  RegisterAttendeeInput, 
  PlatformMetrics,
  AdminAuditLog 
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { authService, RegisterInput } from './authService';

const TOKEN_KEY = 'eventflow_session_token';
const USER_KEY = 'eventflow_session_user';

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setStoredSession(token: string, user: UserProfile): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('Erro ao armazenar sessão local', err);
  }
}

function clearStoredSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (err) {
    console.error('Erro ao limpar sessão', err);
  }
}

function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    return null;
  }
  return null;
}

const LOCAL_CUSTOM_EVENTS_KEY = 'eventflow_local_custom_events';

function getLocalCustomEvents(): EventModel[] {
  try {
    const raw = localStorage.getItem(LOCAL_CUSTOM_EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCustomEvent(event: EventModel): void {
  try {
    const list = getLocalCustomEvents().filter(e => e.id !== event.id);
    list.unshift(event);
    localStorage.setItem(LOCAL_CUSTOM_EVENTS_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Erro ao gravar evento localmente', err);
  }
}

function removeLocalCustomEvent(id: string): void {
  try {
    const list = getLocalCustomEvents().filter(e => e.id !== id);
    localStorage.setItem(LOCAL_CUSTOM_EVENTS_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Erro ao remover evento localmente', err);
  }
}

export const eventService = {
  // === CONFIGURAÇÃO SUPABASE ===

  isBackendConnected(): boolean {
    return isSupabaseConfigured();
  },

  // === AUTENTICAÇÃO ===
  
  getToken(): string | null {
    return authService.getToken();
  },

  getCurrentUser(): UserProfile | null {
    return authService.getCurrentUser();
  },

  isAuthenticated(): boolean {
    return authService.isAuthenticated();
  },

  isAdmin(): boolean {
    const user = authService.getCurrentUser();
    return user?.role === 'admin';
  },

  async login(email: string, password: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    return authService.signInWithPassword(email, password);
  },

  async uploadEventImage(file: File, bucketName = 'event-assets'): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!isSupabaseConfigured()) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ success: true, url: e.target?.result as string });
        reader.onerror = () => resolve({ success: false, error: 'Erro ao ler ficheiro localmente.' });
        reader.readAsDataURL(file);
      });
    }

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `events/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        return { success: true, url: dataUrl };
      }

      const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      return { success: true, url: data.publicUrl };
    } catch (err: any) {
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        return { success: true, url: dataUrl };
      } catch {
        return { success: false, error: err.message || 'Erro ao fazer upload da imagem.' };
      }
    }
  },

  async register(data: RegisterInput): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    return authService.signUp(data);
  },

  async adminLogin(email: string, password: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Credenciais administrativas inválidas ou privilégios insuficientes.' };
      }

      setStoredSession(data.token, data.user);
      return { success: true, user: data.user };
    } catch {
      return { success: false, error: 'Falha de comunicação com o servidor administrativo.' };
    }
  },

  async logout(): Promise<void> {
    return authService.signOut();
  },

  async verifySession(): Promise<UserProfile | null> {
    return authService.verifySession();
  },

  // === EVENTOS PÚBLICOS ===
  
  async getPublicEvents(params?: { q?: string; province?: string }): Promise<EventModel[]> {
    let list: EventModel[] = [];

    if (isSupabaseConfigured()) {
      try {
        let query = supabase
          .from('events')
          .select('*')
          .eq('status', 'published')
          .order('start_date', { ascending: true });

        if (params?.province && params.province !== 'all') {
          query = query.eq('province', params.province);
        }

        if (params?.q) {
          query = query.ilike('title', `%${params.q}%`);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          list = data as EventModel[];
        }
      } catch (err) {
        console.warn('Aviso: Falha ao consultar eventos no Supabase:', err);
      }
    }

    if (list.length === 0) {
      try {
        const searchParams = new URLSearchParams();
        if (params?.q) searchParams.set('q', params.q);
        if (params?.province && params.province !== 'all') searchParams.set('province', params.province);

        const res = await fetch(`/api/events/public?${searchParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.events)) {
            list = data.events;
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar eventos públicos da API', err);
      }
    }

    // Merge com quaisquer eventos locais publicados
    const local = getLocalCustomEvents().filter(e => e.status === 'published');
    const combined = [...local, ...list];
    const uniqueMap = new Map<string, EventModel>();
    for (const ev of combined) {
      if (!uniqueMap.has(ev.id)) {
        uniqueMap.set(ev.id, ev);
      }
    }

    let result = Array.from(uniqueMap.values());
    if (params?.province && params.province !== 'all') {
      result = result.filter(e => e.province === params.province);
    }
    if (params?.q) {
      const qLower = params.q.toLowerCase();
      result = result.filter(e => 
        e.title.toLowerCase().includes(qLower) || 
        (e.description && e.description.toLowerCase().includes(qLower)) ||
        e.location_name.toLowerCase().includes(qLower)
      );
    }
    return result;
  },

  async getPublicEventById(id: string): Promise<EventModel | null> {
    // 1. Verificar na cache local persistente
    const local = getLocalCustomEvents().find(e => e.id === id);
    if (local) return local;

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          return data as EventModel;
        }
      } catch (err) {
        console.warn('Aviso: Erro ao obter evento do Supabase:', err);
      }
    }

    try {
      const res = await fetch(`/api/events/${id}/public`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.event || null;
    } catch {
      return null;
    }
  },

  async registerAttendee(eventId: string, input: RegisterAttendeeInput): Promise<{ success: boolean; ticket?: Ticket; error?: string }> {
    if (isSupabaseConfigured()) {
      try {
        const serialNumber = `EVF-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
        const newTicket = {
          event_id: eventId,
          serial_number: serialNumber,
          attendee_name: input.attendee_name.trim(),
          attendee_phone: input.attendee_phone.trim(),
          attendee_email: input.attendee_email?.trim() || null,
          status: 'confirmed',
          qr_code_data: `EVF-TICKET:${serialNumber}:${eventId}`,
        };

        const { data, error } = await supabase
          .from('tickets')
          .insert(newTicket)
          .select()
          .single();

        if (error) {
          return { success: false, error: 'Erro ao emitir convite no Supabase: ' + error.message };
        }

        // Atualizar contador de inscritos
        const { data: currentEvent } = await supabase.from('events').select('registered_count').eq('id', eventId).single();
        if (currentEvent) {
          await supabase.from('events').update({ registered_count: (currentEvent.registered_count || 0) + 1 }).eq('id', eventId);
        }

        return { success: true, ticket: data as Ticket };
      } catch (err: any) {
        return { success: false, error: 'Falha de comunicação ao registar convite.' };
      }
    }

    try {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Erro na inscrição.' };
      }
      return { success: true, ticket: data.ticket };
    } catch {
      return { success: false, error: 'Falha de comunicação ao registar inscrição.' };
    }
  },

  async getTicketBySerial(serial: string): Promise<{ ticket?: Ticket; event?: EventModel; error?: string }> {
    if (isSupabaseConfigured()) {
      try {
        const { data: ticket, error: tErr } = await supabase
          .from('tickets')
          .select('*')
          .eq('serial_number', serial.toUpperCase())
          .single();

        if (tErr || !ticket) {
          return { error: 'Convite não localizado no Supabase.' };
        }

        const { data: event } = await supabase
          .from('events')
          .select('*')
          .eq('id', ticket.event_id)
          .single();

        return { ticket: ticket as Ticket, event: event as EventModel };
      } catch {
        return { error: 'Erro ao consultar convite no Supabase.' };
      }
    }

    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(serial)}`);
      if (!res.ok) {
        const err = await res.json();
        return { error: err.error || 'Convite não encontrado.' };
      }
      const data = await res.json();
      return { ticket: data.ticket, event: data.event };
    } catch {
      return { error: 'Falha ao consultar convite no servidor.' };
    }
  },

  // === OS MEUS EVENTOS ===

  async getMyEvents(): Promise<EventModel[]> {
    const user = getStoredUser();
    if (!user) return [];

    let eventsList: EventModel[] = [];

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          eventsList = data as EventModel[];
        }
      } catch (err) {
        console.warn('Aviso: Falha ao consultar eventos do utilizador no Supabase:', err);
      }
    }

    if (eventsList.length === 0) {
      const token = getStoredToken();
      if (token) {
        try {
          const res = await fetch('/api/events/mine', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.events)) {
              eventsList = data.events;
            }
          }
        } catch {
          // Fallback silencioso
        }
      }
    }

    // Merge com quaisquer eventos guardados localmente pelo utilizador
    const local = getLocalCustomEvents().filter(e => e.owner_id === user.id);
    const combined = [...local, ...eventsList];
    const uniqueMap = new Map<string, EventModel>();
    for (const ev of combined) {
      if (!uniqueMap.has(ev.id)) {
        uniqueMap.set(ev.id, ev);
      }
    }
    return Array.from(uniqueMap.values());
  },

  async createEvent(input: CreateEventInput): Promise<{ success: boolean; event?: EventModel; error?: string }> {
    const user = getStoredUser();
    if (!user) {
      return { success: false, error: 'É necessário iniciar sessão para criar eventos.' };
    }

    const eventPayload = {
      owner_id: user.id,
      owner_name: user.full_name,
      owner_account_type: user.account_type,
      title: input.title.trim(),
      description: (input.description || '').trim(),
      category: input.category || 'Geral',
      status: input.status || 'published',
      start_date: input.start_date,
      end_date: input.end_date,
      location_name: input.location_name.trim(),
      location_address: input.location_address?.trim() || '',
      province: input.province || user.province || 'Luanda',
      is_unlimited_capacity: Boolean(input.is_unlimited_capacity),
      capacity: input.is_unlimited_capacity ? 0 : Number(input.capacity) || 50,
      registered_count: 0,
      validated_count: 0,
      is_paid: Boolean(input.is_paid),
      price_aoa: input.is_paid ? Number(input.price_aoa) || 0 : 0,
      payment_instructions: input.payment_instructions?.trim() || undefined,
      banner_url: input.banner_url || undefined,
      logo_url: input.logo_url || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Tentar Supabase PostgreSQL
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('events')
          .insert(eventPayload)
          .select()
          .maybeSingle();

        if (!error && data) {
          return { success: true, event: data as EventModel };
        }
        if (error) {
          return { success: false, error: `Erro ao guardar evento na base de dados: ${error.message}` };
        }
      } catch (err: any) {
        return { success: false, error: `Falha de comunicação com o Supabase: ${err.message || 'Erro desconhecido'}` };
      }
    }

    // 2. Tentar API do servidor Node.js
    const token = getStoredToken();
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (res.ok && data.event) {
        return { success: true, event: data.event };
      }
      return { success: false, error: data.error || 'Erro ao criar evento no servidor.' };
    } catch {
      return { success: false, error: 'Base de dados indisponível. Não foi possível confirmar a gravação.' };
    }
  },

  async updateEvent(id: string, input: Partial<CreateEventInput> & { status?: EventModel['status'] }): Promise<{ success: boolean; event?: EventModel; error?: string }> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('events')
          .update({ ...input, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .maybeSingle();

        if (!error && data) {
          return { success: true, event: data as EventModel };
        }
        if (error) {
          return { success: false, error: `Erro ao atualizar evento: ${error.message}` };
        }
      } catch (err: any) {
        return { success: false, error: `Falha ao atualizar no Supabase: ${err.message}` };
      }
    }

    const token = getStoredToken();
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (res.ok && data.event) {
        return { success: true, event: data.event };
      }
      return { success: false, error: data.error || 'Erro ao atualizar evento no servidor.' };
    } catch {
      return { success: false, error: 'Falha de comunicação ao atualizar evento.' };
    }
  },

  async deleteEvent(id: string): Promise<{ success: boolean; error?: string }> {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', id);

        if (error) {
          return { success: false, error: error.message };
        }
        removeLocalCustomEvent(id);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: `Erro ao eliminar evento: ${err.message}` };
      }
    }

    const token = getStoredToken();
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Erro ao eliminar evento.' };
      }
      removeLocalCustomEvent(id);
      return { success: true };
    } catch {
      return { success: false, error: 'Falha ao eliminar evento no servidor.' };
    }
  },

  async getEventAttendees(eventId: string): Promise<{ success: boolean; attendees?: Ticket[]; error?: string }> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .eq('event_id', eventId);

        if (!error && data) {
          return { success: true, attendees: data as Ticket[] };
        }
      } catch {
        // Fallback
      }
    }

    const token = getStoredToken();
    if (!token) return { success: false, error: 'Sessão não autenticada.' };

    try {
      const res = await fetch(`/api/events/${eventId}/attendees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Acesso negado aos participantes.' };
      }
      return { success: true, attendees: data.attendees };
    } catch {
      return { success: false, error: 'Falha ao obter lista de participantes.' };
    }
  },

  // === SCANNER DE ENTRADAS ===
  
  async validateTicketServer(code: string): Promise<{
    success: boolean;
    reason: string;
    message: string;
    ticket?: Ticket;
    event?: EventModel;
  }> {
    const token = getStoredToken();
    if (!token) {
      return {
        success: false,
        reason: 'unauthenticated',
        message: 'Acesso negado: o scanner requer uma sessão autenticada com permissão de portaria.',
      };
    }

    try {
      const res = await fetch('/api/scanner/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      return data;
    } catch {
      return {
        success: false,
        reason: 'server_error',
        message: 'Falha de ligação ao servidor de validação de convites.',
      };
    }
  },

  // === ADMINISTRAÇÃO GERAL (/privado) ===

  async getAdminAllEvents(): Promise<{ success: boolean; events?: EventModel[]; error?: string }> {
    const token = getStoredToken();
    if (!token) return { success: false, error: 'Sessão não autenticada.' };

    try {
      const res = await fetch('/api/admin/events', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Acesso não autorizado.' };
      }
      return { success: true, events: data.events };
    } catch {
      return { success: false, error: 'Falha ao contactar a administração geral.' };
    }
  },

  async getAdminMetrics(): Promise<{ success: boolean; metrics?: PlatformMetrics; error?: string }> {
    const token = getStoredToken();
    if (!token) return { success: false, error: 'Sessão não autenticada.' };

    try {
      const res = await fetch('/api/admin/metrics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Acesso não autorizado aos indicadores.' };
      }
      return { success: true, metrics: data };
    } catch {
      return { success: false, error: 'Falha ao obter métricas da plataforma.' };
    }
  },

  async updateEventStatusAdmin(id: string, status: EventModel['status']): Promise<{ success: boolean; error?: string }> {
    const token = getStoredToken();
    if (!token) return { success: false, error: 'Sessão não autenticada.' };

    try {
      const res = await fetch(`/api/admin/events/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Não foi possível alterar o estado do evento.' };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Falha de comunicação com o servidor administrativo.' };
    }
  },

  async getAdminUsers(params?: { type?: 'organizer' | 'organization'; status?: string; q?: string }): Promise<{ success: boolean; users?: UserProfile[]; error?: string }> {
    const token = getStoredToken();
    if (!token) return { success: false, error: 'Sessão não autenticada.' };

    try {
      const searchParams = new URLSearchParams();
      if (params?.type) searchParams.set('type', params.type);
      if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
      if (params?.q) searchParams.set('q', params.q);

      const res = await fetch(`/api/admin/users?${searchParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Acesso não autorizado aos utilizadores.' };
      }
      return { success: true, users: data.users };
    } catch {
      return { success: false, error: 'Falha de comunicação com o servidor ao consultar contas.' };
    }
  },

  async updateUserStatusAdmin(userId: string, status: 'active' | 'suspended'): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const token = getStoredToken();
    if (!token) return { success: false, error: 'Sessão não autenticada.' };

    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Não foi possível alterar o estado da conta.' };
      }
      return { success: true, user: data.user };
    } catch {
      return { success: false, error: 'Falha de comunicação com o servidor ao atualizar conta.' };
    }
  },

  async getAdminAuditLogs(): Promise<{ success: boolean; logs?: AdminAuditLog[]; error?: string }> {
    const token = getStoredToken();
    if (!token) return { success: false, error: 'Sessão não autenticada.' };

    try {
      const res = await fetch('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Acesso não autorizado ao histórico de auditoria.' };
      }
      return { success: true, logs: data.logs };
    } catch {
      return { success: false, error: 'Falha ao obter histórico de auditoria.' };
    }
  }
};
