process.env.DISABLE_HMR = 'true';
import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================================================
// SUPABASE BACKEND SEGURO (Privado ao processo do Servidor)
// ========================================================
// As variáveis SUPABASE_SECRET_KEY e SUPABASE_URL residem exclusivamente no servidor Node.js
// e NUNCA são enviadas para o cliente ou para o bundle de frontend.
const backendSupabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const backendSupabaseSecret = process.env.SUPABASE_SECRET_KEY || '';

// Cliente com privilégios de serviço para operações administrativas (bypassa RLS no backend quando necessário)
const supabaseAdmin: SupabaseClient | null = (backendSupabaseUrl && backendSupabaseSecret)
  ? createClient(backendSupabaseUrl, backendSupabaseSecret, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

if (supabaseAdmin) {
  console.log('[BACKEND SEGURO] Supabase Admin ativado com chave secreta privada no servidor.');
} else {
  console.log('[BACKEND SEGURO] Supabase Admin em modo standard/espera (SUPABASE_SECRET_KEY privada não configurada).');
}

// Tipos para backend
export type AccountType = 'organizer' | 'organization';
export type UserAccountStatus = 'active' | 'suspended';

export interface ServerUser {
  id: string;
  email: string;
  passwordHash: string;
  account_type: AccountType;
  full_name: string;
  org_name?: string;
  nif?: string; // Confidencial: apenas para organização e administradores
  legal_representative?: string;
  phone: string;
  province: string;
  role: 'admin' | 'organizer' | 'scanner';
  status: UserAccountStatus;
  created_at: string;
}

export interface ServerEvent {
  id: string;
  owner_id: string;
  owner_name: string;
  owner_account_type?: AccountType;
  title: string;
  description: string;
  category: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  start_date: string;
  end_date: string;
  location_name: string;
  location_address: string;
  province: string;
  is_unlimited_capacity: boolean;
  capacity: number;
  registered_count: number;
  validated_count: number;
  is_paid: boolean;
  price_aoa: number;
  payment_instructions?: string;
  banner_url?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ServerTicket {
  id: string;
  event_id: string;
  serial_number: string;
  attendee_name: string;
  attendee_phone: string;
  attendee_email?: string;
  status: 'confirmed' | 'checked_in' | 'cancelled';
  checked_in_at?: string;
  created_at: string;
  qr_code_data: string;
}

export interface ServerAuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  target_type: 'event' | 'user' | 'organization';
  target_id: string;
  details: string;
  created_at: string;
}

// Base de dados em memória inicial (no servidor)
const users: ServerUser[] = [
  {
    id: 'usr-admin-1',
    email: 'admin@eventflow.ao',
    passwordHash: 'admin123',
    account_type: 'organizer',
    full_name: 'Administrador Geral',
    phone: '+244 923 000 001',
    province: 'Luanda',
    role: 'admin',
    status: 'active',
    created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
  },
  {
    id: 'usr-org-1',
    email: 'organizador@eventflow.ao',
    passwordHash: 'organizador123',
    account_type: 'organizer',
    full_name: 'Henrique Mendes',
    phone: '+244 923 456 789',
    province: 'Luanda',
    role: 'organizer',
    status: 'active',
    created_at: new Date('2026-01-10T00:00:00Z').toISOString(),
  },
  {
    id: 'usr-org-2',
    email: 'contacto@culturaviva.ao',
    passwordHash: 'cultura123',
    account_type: 'organization',
    full_name: 'Cultura Viva Produções, Lda',
    org_name: 'Cultura Viva Produções, Lda',
    nif: '5418902143',
    legal_representative: 'Ana Paula Lourenço',
    phone: '+244 912 333 444',
    province: 'Benguela',
    role: 'organizer',
    status: 'active',
    created_at: new Date('2026-01-12T00:00:00Z').toISOString(),
  }
];

const sessions = new Map<string, string>(); // token -> userId

const auditLogs: ServerAuditLog[] = [
  {
    id: 'log-001',
    admin_id: 'usr-admin-1',
    admin_name: 'Administrador Geral',
    action: 'inicializacao_sistema',
    target_type: 'organization',
    target_id: 'usr-org-2',
    details: 'Validação da conta institucional Cultura Viva Produções, Lda (NIF 5418902143)',
    created_at: new Date('2026-01-12T09:00:00Z').toISOString(),
  }
];

const events: ServerEvent[] = [
  {
    id: 'evt-001',
    owner_id: 'usr-org-1',
    owner_name: 'Henrique Mendes',
    owner_account_type: 'organizer',
    title: 'Conferência Tech Angola 2026',
    description: 'O maior encontro anual sobre tecnologia, startups e inovação digital em Luanda. Painéis de discussão com fundadores e líderes empresariais.',
    category: 'Tecnologia & Inovação',
    status: 'published',
    start_date: '2026-11-12T09:00',
    end_date: '2026-11-13T18:00',
    location_name: 'Centro de Convenções de Talatona (CCTA)',
    location_address: 'Via AL17, Talatona',
    province: 'Luanda',
    is_unlimited_capacity: false,
    capacity: 250,
    registered_count: 2,
    validated_count: 1,
    is_paid: true,
    price_aoa: 25000,
    payment_instructions: 'Transferência para IBAN: AO06.0040.0000.1234.5678.9012.3 (Banco BAI) ou via Multicaixa Express para o número 923 456 789.',
    banner_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
    created_at: '2026-02-10T10:00:00Z',
    updated_at: '2026-02-10T10:00:00Z',
  },
  {
    id: 'evt-002',
    owner_id: 'usr-org-2',
    owner_name: 'Cultura Viva Produções, Lda',
    owner_account_type: 'organization',
    title: 'Fórum Agronegócio & Sustentabilidade',
    description: 'Encontro estratégico sobre financiamento rural, irrigação e canais de exportação de produtos agrícolas nacionais.',
    category: 'Negócios & Agricultura',
    status: 'published',
    start_date: '2026-10-05T08:30',
    end_date: '2026-10-05T17:00',
    location_name: 'Hotel Serra da Chela',
    location_address: 'Rua Comandante Liberdade, Lubango',
    province: 'Huíla',
    is_unlimited_capacity: false,
    capacity: 120,
    registered_count: 1,
    validated_count: 0,
    is_paid: false,
    price_aoa: 0,
    banner_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&auto=format&fit=crop&q=80',
    created_at: '2026-02-14T11:00:00Z',
    updated_at: '2026-02-14T11:00:00Z',
  },
  {
    id: 'evt-003',
    owner_id: 'usr-org-1',
    owner_name: 'Henrique Mendes',
    owner_account_type: 'organizer',
    title: 'Workshop de Cibersegurança Prática',
    description: 'Formação intensiva sobre proteção de dados, arquitetura zero trust e prevenção de ataques ransomware em ambientes empresariais.',
    category: 'Formação & Educação',
    status: 'published',
    start_date: '2026-09-20T14:00',
    end_date: '2026-09-20T18:00',
    location_name: 'Auditório Mediateca Zé Dú',
    location_address: 'Cazenga',
    province: 'Luanda',
    is_unlimited_capacity: false,
    capacity: 30,
    registered_count: 0,
    validated_count: 0,
    is_paid: false,
    price_aoa: 0,
    banner_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&auto=format&fit=crop&q=80',
    created_at: '2026-02-18T08:00:00Z',
    updated_at: '2026-02-18T08:00:00Z',
  }
];

const tickets: ServerTicket[] = [
  {
    id: 'tkt-001',
    event_id: 'evt-001',
    serial_number: 'EVF-2026-9812A',
    attendee_name: 'Kieza Sebastiana Neto',
    attendee_phone: '+244 923 111 222',
    attendee_email: 'kieza.neto@example.ao',
    status: 'confirmed',
    created_at: '2026-02-12T14:32:00Z',
    qr_code_data: 'EVF-TICKET:EVF-2026-9812A:evt-001',
  },
  {
    id: 'tkt-002',
    event_id: 'evt-001',
    serial_number: 'EVF-2026-7452B',
    attendee_name: 'Manuel Domingos Costa',
    attendee_phone: '+244 944 555 666',
    attendee_email: 'manuel.costa@empresa.co.ao',
    status: 'checked_in',
    checked_in_at: '2026-11-12T08:45:10Z',
    created_at: '2026-02-15T10:15:00Z',
    qr_code_data: 'EVF-TICKET:EVF-2026-7452B:evt-001',
  },
  {
    id: 'tkt-003',
    event_id: 'evt-002',
    serial_number: 'EVF-2026-3398C',
    attendee_name: 'Dra. Esperança de Carvalho',
    attendee_phone: '+244 912 333 444',
    attendee_email: 'esperanca.carvalho@agro.ao',
    status: 'confirmed',
    created_at: '2026-02-18T16:40:00Z',
    qr_code_data: 'EVF-TICKET:EVF-2026-3398C:evt-002',
  }
];

// Helper para remover passwordHash e dados sensíveis
function toSafeUser(user: ServerUser, viewerIsAdminOrSelf = false): Partial<ServerUser> {
  const { passwordHash: _, ...safe } = user;
  if (!viewerIsAdminOrSelf) {
    delete safe.nif;
  }
  return safe;
}

// Middleware de Autenticação Real no Servidor
interface AuthenticatedRequest extends Request {
  user?: ServerUser;
}

async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sessão não autenticada. É necessário iniciar sessão.' });
  }

  const token = authHeader.substring(7);

  // 1. Verificação segura via Supabase Auth (quando o cliente admin estiver ativo)
  if (supabaseAdmin) {
    try {
      const { data: authData, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && authData?.user) {
        // Obter perfil na base de dados com privilégios de servidor
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profile) {
          if (profile.status === 'suspended') {
            return res.status(403).json({ error: 'A sua conta foi suspensa pela moderação da plataforma.' });
          }
          req.user = {
            id: profile.id,
            email: profile.email,
            passwordHash: '',
            account_type: profile.account_type,
            full_name: profile.full_name,
            phone: profile.phone || '',
            province: profile.province || 'Luanda',
            role: profile.role,
            status: profile.status,
            created_at: profile.created_at,
          };
          return next();
        }
      }
    } catch {
      // Continua para fallback de sessão local se falhar verificação remota
    }
  }

  // 2. Verificação de sessão interna
  const userId = sessions.get(token);
  if (!userId) {
    return res.status(401).json({ error: 'Sessão expirada ou inválida. Por favor inicie sessão novamente.' });
  }

  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(401).json({ error: 'Utilizador não encontrado.' });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'A sua conta foi suspensa pela moderação da plataforma.' });
  }

  req.user = user;
  next();
}

// Middleware para Administrador Geral (Proteção estrita no servidor)
function adminMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Acesso não autorizado. Esta área requer privilégios de Administrador Geral da plataforma.' 
    });
  }
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // === ROTAS DE AUTENTICAÇÃO ===

  // Criar conta (Registo: Organizador vs Organização)
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { 
      email, 
      password, 
      confirmPassword,
      full_name, 
      phone, 
      province,
      account_type = 'organizer',
      org_name,
      nif,
      legal_representative
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Por favor preencha todos os campos obrigatórios.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ error: 'As palavras-passe não coincidem. Por favor confirme a palavra-passe.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A palavra-passe deve conter pelo menos 6 caracteres.' });
    }

    const type: AccountType = account_type === 'organization' ? 'organization' : 'organizer';

    // Validações específicas por tipo de conta
    if (type === 'organization') {
      if (!org_name || !nif || !legal_representative) {
        return res.status(400).json({ 
          error: 'Para registar uma organização é obrigatório indicar o Nome da Organização, NIF e Representante Responsável.' 
        });
      }
      const cleanNif = String(nif).trim().toUpperCase();
      if (cleanNif.length < 8 || cleanNif.length > 15) {
        return res.status(400).json({ error: 'Por favor introduza um NIF angolano válido (entre 8 e 15 caracteres).' });
      }
    } else {
      if (!full_name) {
        return res.status(400).json({ error: 'Por favor indique o seu nome completo.' });
      }
    }

    const existing = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'Já existe uma conta associada a este endereço de e-mail.' });
    }

    // Regra estrita de segurança: novos utilizadores registados publicamente NUNCA recebem privilégios de admin
    const newUser: ServerUser = {
      id: `usr-${Date.now()}`,
      email: email.trim().toLowerCase(),
      passwordHash: password,
      account_type: type,
      full_name: (type === 'organization' ? (org_name || full_name) : full_name).trim(),
      org_name: type === 'organization' ? org_name.trim() : undefined,
      nif: type === 'organization' ? String(nif).trim().toUpperCase() : undefined,
      legal_representative: type === 'organization' ? legal_representative.trim() : undefined,
      phone: phone?.trim() || '',
      province: province || 'Luanda',
      role: 'organizer', // Sempre 'organizer', nunca admin
      status: 'active',
      created_at: new Date().toISOString(),
    };

    users.push(newUser);

    const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    sessions.set(token, newUser.id);

    return res.status(201).json({ user: toSafeUser(newUser, true), token });
  });

  // Iniciar sessão normal
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Informe o e-mail e a palavra-passe.' });
    }

    const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || user.passwordHash !== password) {
      return res.status(401).json({ error: 'E-mail ou palavra-passe incorretos.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'A sua conta foi suspensa pela moderação da plataforma. Contacte o suporte.' });
    }

    const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    sessions.set(token, user.id);

    return res.json({ user: toSafeUser(user, true), token });
  });

  // Iniciar sessão administrativa dedicada (/privado)
  app.post('/api/auth/admin/login', (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Introduza o e-mail administrativo e a palavra-passe.' });
    }

    const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || user.passwordHash !== password) {
      return res.status(401).json({ error: 'Credenciais administrativas incorretas.' });
    }

    // Validação estrita da função administrativa no backend
    if (user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Acesso negado: a conta informada não possui privilégios de Administrador Geral.' 
      });
    }

    const token = `tok_admin_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    sessions.set(token, user.id);

    // Registar no histórico de auditoria
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      admin_id: user.id,
      admin_name: user.full_name,
      action: 'inicio_sessao_admin',
      target_type: 'user',
      target_id: user.id,
      details: `Início de sessão administrativo autenticado com sucesso.`,
      created_at: new Date().toISOString(),
    });

    return res.json({ user: toSafeUser(user, true), token });
  });

  // Obter perfil autenticado
  app.get('/api/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    return res.json({ user: toSafeUser(req.user!, true) });
  });

  // Terminar sessão
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      sessions.delete(token);
    }
    return res.json({ success: true });
  });

  // === ROTAS PÚBLICAS DE EVENTOS ===

  // Listar apenas eventos públicos e publicados (Sem NIF)
  app.get('/api/events/public', (req: Request, res: Response) => {
    const { q, province } = req.query;
    
    let publicEvents = events.filter(e => e.status === 'published');

    if (province && typeof province === 'string' && province !== 'all') {
      publicEvents = publicEvents.filter(e => e.province.toLowerCase() === province.toLowerCase());
    }

    if (q && typeof q === 'string') {
      const query = q.toLowerCase();
      publicEvents = publicEvents.filter(e => 
        e.title.toLowerCase().includes(query) ||
        e.location_name.toLowerCase().includes(query) ||
        e.category.toLowerCase().includes(query) ||
        (e.owner_name && e.owner_name.toLowerCase().includes(query))
      );
    }

    // Assegura que nenhum NIF ou detalhe privado seja exposto
    return res.json({ events: publicEvents });
  });

  // Obter detalhe de um evento público
  app.get('/api/events/:id/public', (req: Request, res: Response) => {
    const event = events.find(e => e.id === req.params.id && e.status === 'published');
    if (!event) {
      return res.status(404).json({ error: 'Evento não encontrado ou não está disponível publicamente.' });
    }
    return res.json({ event });
  });

  // Inscrição pública de participante num evento
  app.post('/api/events/:id/register', (req: Request, res: Response) => {
    const { attendee_name, attendee_phone, attendee_email } = req.body;
    const event = events.find(e => e.id === req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    if (event.status !== 'published') {
      return res.status(400).json({ error: 'Este evento não está a aceitar inscrições no momento.' });
    }

    if (!attendee_name || !attendee_phone) {
      return res.status(400).json({ error: 'Nome e telemóvel são obrigatórios para a inscrição.' });
    }

    // Verificação de lotação
    if (!event.is_unlimited_capacity && event.registered_count >= event.capacity) {
      return res.status(400).json({ error: 'Lotação esgotada. Não existem mais vagas disponíveis para este evento.' });
    }

    const serialNumber = `EVF-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
    
    const newTicket: ServerTicket = {
      id: `tkt-${Date.now()}`,
      event_id: event.id,
      serial_number: serialNumber,
      attendee_name: attendee_name.trim(),
      attendee_phone: attendee_phone.trim(),
      attendee_email: attendee_email?.trim() || undefined,
      status: 'confirmed',
      created_at: new Date().toISOString(),
      qr_code_data: `EVF-TICKET:${serialNumber}:${event.id}`,
    };

    tickets.push(newTicket);
    event.registered_count += 1;
    event.updated_at = new Date().toISOString();

    return res.status(201).json({
      success: true,
      ticket: newTicket,
      event: {
        id: event.id,
        title: event.title,
        start_date: event.start_date,
        location_name: event.location_name,
        province: event.province,
      }
    });
  });

  // Consultar convite pelo número de série
  app.get('/api/tickets/:serial', (req: Request, res: Response) => {
    const serial = req.params.serial;
    const ticket = tickets.find(t => t.serial_number.toUpperCase() === serial.toUpperCase());
    if (!ticket) {
      return res.status(404).json({ error: 'Convite não encontrado no sistema.' });
    }
    const event = events.find(e => e.id === ticket.event_id);
    return res.json({ ticket, event });
  });

  // === ÁREA DO ORGANIZADOR AUTENTICADO ===

  // Obter os eventos criados pelo utilizador logado
  app.get('/api/events/mine', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const myEvents = events.filter(e => e.owner_id === user.id);
    return res.json({ events: myEvents });
  });

  // Criar evento
  app.post('/api/events', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const {
      title,
      description,
      category,
      start_date,
      end_date,
      location_name,
      location_address,
      province,
      is_unlimited_capacity,
      capacity,
      is_paid,
      price_aoa,
      payment_instructions,
      banner_url,
      logo_url,
      status = 'published',
    } = req.body;

    if (!title || !start_date || !end_date || !location_name || !province) {
      return res.status(400).json({ error: 'Por favor preencha os campos obrigatórios (Título, datas, local e província).' });
    }

    const newEvent: ServerEvent = {
      id: `evt-${Date.now()}`,
      owner_id: user.id,
      owner_name: user.full_name,
      owner_account_type: user.account_type,
      title: title.trim(),
      description: (description || '').trim(),
      category: category || 'Geral',
      status: status || 'published',
      start_date,
      end_date,
      location_name: location_name.trim(),
      location_address: location_address?.trim() || '',
      province: province || user.province || 'Luanda',
      is_unlimited_capacity: Boolean(is_unlimited_capacity),
      capacity: is_unlimited_capacity ? 0 : Number(capacity) || 50,
      registered_count: 0,
      validated_count: 0,
      is_paid: Boolean(is_paid),
      price_aoa: is_paid ? Number(price_aoa) || 0 : 0,
      payment_instructions: payment_instructions?.trim() || undefined,
      banner_url: banner_url || undefined,
      logo_url: logo_url || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    events.push(newEvent);
    return res.status(201).json({ success: true, event: newEvent });
  });

  // Atualizar evento existente
  app.put('/api/events/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const event = events.find(e => e.id === req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    if (event.owner_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Não tem permissão para alterar este evento.' });
    }

    Object.assign(event, req.body, {
      updated_at: new Date().toISOString()
    });

    return res.json({ success: true, event });
  });

  // Eliminar evento
  app.delete('/api/events/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const idx = events.findIndex(e => e.id === req.params.id);

    if (idx === -1) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    const event = events[idx];
    if (event.owner_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Não tem permissão para eliminar este evento.' });
    }

    events.splice(idx, 1);

    if (user.role === 'admin') {
      auditLogs.unshift({
        id: `log-${Date.now()}`,
        admin_id: user.id,
        admin_name: user.full_name,
        action: 'eliminacao_evento',
        target_type: 'event',
        target_id: event.id,
        details: `Eliminação do evento "${event.title}" pelo administrador geral.`,
        created_at: new Date().toISOString(),
      });
    }

    return res.json({ success: true });
  });

  // Listar participantes do meu evento
  app.get('/api/events/:id/attendees', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const event = events.find(e => e.id === req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    if (event.owner_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado aos participantes deste evento.' });
    }

    const attendees = tickets.filter(t => t.event_id === event.id);
    return res.json({ attendees });
  });

  // === SCANNER DE PORTARIA (VALIDAÇÃO REAL) ===
  app.post('/api/scanner/validate', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, reason: 'empty_code', message: 'Nenhum código fornecido para validação.' });
    }

    let serial = code.trim();
    if (serial.startsWith('EVF-TICKET:')) {
      const parts = serial.split(':');
      serial = parts[1];
    }

    const ticket = tickets.find(t => t.serial_number.toUpperCase() === serial.toUpperCase());
    if (!ticket) {
      return res.json({
        success: false,
        reason: 'not_found',
        message: 'Convite inválido: o código não consta na base de dados de inscrições autorizadas.',
      });
    }

    const event = events.find(e => e.id === ticket.event_id);
    if (!event) {
      return res.json({
        success: false,
        reason: 'invalid_event',
        message: 'Evento associado ao convite não foi localizado no sistema.',
      });
    }

    if (event.owner_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        reason: 'forbidden_event',
        message: 'Acesso negado: a sua conta não tem autorização para validar ingressos deste evento.',
      });
    }

    if (ticket.status === 'checked_in') {
      return res.json({
        success: false,
        reason: 'already_used',
        message: `Atenção: Este convite já foi utilizado e validado anteriormente em ${new Date(ticket.checked_in_at!).toLocaleTimeString('pt-AO')}.`,
        ticket,
        event,
      });
    }

    if (ticket.status === 'cancelled') {
      return res.json({
        success: false,
        reason: 'ticket_cancelled',
        message: 'Acesso recusado: esta credencial foi cancelada pela organização.',
        ticket,
        event,
      });
    }

    const nowIso = new Date().toISOString();
    ticket.status = 'checked_in';
    ticket.checked_in_at = nowIso;
    event.validated_count += 1;

    return res.json({
      success: true,
      reason: 'valid',
      message: 'Convite autêntico e validado com sucesso! Entrada autorizada.',
      ticket,
      event,
    });
  });

  // === ÁREA ADMINISTRATIVA /privado (VALIDAÇÃO ESTRITA NO SERVIDOR) ===

  // Consultar todos os eventos para administração geral
  app.get('/api/admin/events', authMiddleware, adminMiddleware, (req: AuthenticatedRequest, res: Response) => {
    return res.json({ 
      events,
      totalCount: events.length,
    });
  });

  // Indicadores gerais da plataforma
  app.get('/api/admin/metrics', authMiddleware, adminMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const totalEvents = events.length;
    const publishedEvents = events.filter(e => e.status === 'published').length;
    const totalUsers = users.length;
    const organizersCount = users.filter(u => u.account_type === 'organizer' && u.role !== 'admin').length;
    const organizationsCount = users.filter(u => u.account_type === 'organization').length;
    const totalRegistered = events.reduce((sum, e) => sum + (e.registered_count || 0), 0);
    const totalValidated = events.reduce((sum, e) => sum + (e.validated_count || 0), 0);

    return res.json({
      totalEvents,
      publishedEvents,
      totalUsers,
      organizersCount,
      organizationsCount,
      totalRegistered,
      totalValidated,
    });
  });

  // Consultar utilizadores e organizações (com NIF restrito aos administradores)
  app.get('/api/admin/users', authMiddleware, adminMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const { type, status, q } = req.query;
    let list = users.filter(u => u.role !== 'admin'); // Não expõe conta super admin como organizador

    if (type && typeof type === 'string' && (type === 'organizer' || type === 'organization')) {
      list = list.filter(u => u.account_type === type);
    }

    if (status && typeof status === 'string' && status !== 'all') {
      list = list.filter(u => u.status === status);
    }

    if (q && typeof q === 'string') {
      const query = q.toLowerCase();
      list = list.filter(u => 
        u.full_name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.org_name && u.org_name.toLowerCase().includes(query)) ||
        (u.nif && u.nif.toLowerCase().includes(query)) ||
        (u.legal_representative && u.legal_representative.toLowerCase().includes(query))
      );
    }

    // Administrador tem direito legítimo a visualizar os dados de auditoria e NIF confidencial
    const safeList = list.map(u => toSafeUser(u, true));
    return res.json({ users: safeList });
  });

  // Alterar estado de utilizador/organização (Suspender / Reativar)
  app.put('/api/admin/users/:id/status', authMiddleware, adminMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const admin = req.user!;
    const { status } = req.body;
    const target = users.find(u => u.id === req.params.id);

    if (!target) {
      return res.status(404).json({ error: 'Conta não encontrada.' });
    }

    if (target.role === 'admin') {
      return res.status(400).json({ error: 'Não é permitido suspender a conta de um Administrador Geral.' });
    }

    if (status !== 'active' && status !== 'suspended') {
      return res.status(400).json({ error: 'Estado inválido. Utilize "active" ou "suspended".' });
    }

    target.status = status;

    // Registar no histórico de auditoria
    const actionName = status === 'suspended' ? 'suspensao_conta' : 'reativacao_conta';
    const targetLabel = target.account_type === 'organization' ? `Organização "${target.org_name || target.full_name}"` : `Organizador "${target.full_name}"`;
    
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      admin_id: admin.id,
      admin_name: admin.full_name,
      action: actionName,
      target_type: target.account_type === 'organization' ? 'organization' : 'user',
      target_id: target.id,
      details: `${status === 'suspended' ? 'Suspensão' : 'Reativação'} de ${targetLabel} (${target.email}).`,
      created_at: new Date().toISOString(),
    });

    return res.json({ success: true, user: toSafeUser(target, true) });
  });

  // Consultar histórico de auditoria
  app.get('/api/admin/audit-logs', authMiddleware, adminMiddleware, (req: AuthenticatedRequest, res: Response) => {
    return res.json({ logs: auditLogs });
  });

  // Moderação de estado de evento pelo Administrador Geral
  app.put('/api/admin/events/:id/status', authMiddleware, adminMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const admin = req.user!;
    const { status } = req.body;
    const event = events.find(e => e.id === req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    event.status = status;
    event.updated_at = new Date().toISOString();

    // Registar na auditoria
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      admin_id: admin.id,
      admin_name: admin.full_name,
      action: 'moderacao_evento',
      target_type: 'event',
      target_id: event.id,
      details: `Alteração do estado do evento "${event.title}" para "${status}".`,
      created_at: new Date().toISOString(),
    });

    return res.json({ success: true, event });
  });

  // === ROTA /privado EXPLICITA PARA SPA ===
  app.get('/privado', (req: Request, res: Response, next: NextFunction) => {
    next();
  });

  // === VITE / STATIC CLIENT MIDDLEWARE ===
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EventFlow server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
