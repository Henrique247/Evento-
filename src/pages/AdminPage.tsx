import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Calendar, 
  Users, 
  Building2, 
  UserCheck, 
  FileText, 
  Lock, 
  Mail, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  BarChart3, 
  Layers, 
  History, 
  LogOut, 
  ArrowLeft, 
  Loader2, 
  Ban, 
  Play, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { AppRoute, EventModel, UserProfile, PlatformMetrics, AdminAuditLog } from '../types';
import { StatusBadge } from '../components/common/Badge';
import { eventService } from '../services/eventService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

interface AdminPageProps {
  currentUser: UserProfile | null;
  onNavigate: (route: AppRoute) => void;
  initialTab?: 'metrics' | 'events' | 'organizers' | 'organizations' | 'audit';
}

type AdminTab = 'metrics' | 'events' | 'organizers' | 'organizations' | 'audit';

export const AdminPage: React.FC<AdminPageProps> = ({ 
  currentUser, 
  onNavigate,
  initialTab = 'metrics' 
}) => {
  const [tab, setTab] = useState<AdminTab>(initialTab);

  // Estados de autenticação administrativa no formulário /privado
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);

  // Estados dos dados administrativos
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [events, setEvents] = useState<EventModel[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Filtros
  const [eventSearch, setEventSearch] = useState('');
  const [eventStatusFilter, setEventStatusFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');

  // Modal de Confirmação para ações críticas
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionLabel: string;
    isDestructive: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionLabel: '',
    isDestructive: false,
    onConfirm: async () => {},
  });

  const isAdmin = currentUser?.role === 'admin';

  // Carregar dados quando utilizador for administrador válido
  useEffect(() => {
    if (isAdmin) {
      loadAllAdminData();
    }
  }, [currentUser]);

  const loadAllAdminData = async () => {
    setLoadingData(true);
    try {
      const [mRes, eRes, uRes, aRes] = await Promise.all([
        eventService.getAdminMetrics(),
        eventService.getAdminAllEvents(),
        eventService.getAdminUsers(),
        eventService.getAdminAuditLogs(),
      ]);

      if (mRes.success && mRes.metrics) setMetrics(mRes.metrics);
      if (eRes.success && eRes.events) setEvents(eRes.events);
      if (uRes.success && uRes.users) setUsers(uRes.users);
      if (aRes.success && aRes.logs) setAuditLogs(aRes.logs);
    } finally {
      setLoadingData(false);
    }
  };

  // Submissão do login administrativo
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError(null);
    setAdminLoginLoading(true);

    try {
      const res = await eventService.adminLogin(adminEmail, adminPassword);
      if (res.success && res.user) {
        // Redireciona e recarrega página administrativa
        window.location.reload();
      } else {
        setAdminLoginError(res.error || 'Credenciais de administrador inválidas.');
      }
    } finally {
      setAdminLoginLoading(false);
    }
  };

  // Moderação de Evento
  const handleUpdateEventStatus = (eventId: string, newStatus: EventModel['status'], eventTitle: string) => {
    const isCancel = newStatus === 'cancelled';
    setConfirmModal({
      isOpen: true,
      title: isCancel ? 'Cancelar Evento na Plataforma' : 'Reativar Evento',
      description: isCancel 
        ? `Tem a certeza de que deseja cancelar o evento "${eventTitle}"? Ele deixará de aceitar inscrições públicas.`
        : `Deseja reativar o evento "${eventTitle}" para que fique visível e publicado?`,
      actionLabel: isCancel ? 'Sim, Cancelar Evento' : 'Sim, Reativar',
      isDestructive: isCancel,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await eventService.updateEventStatusAdmin(eventId, newStatus);
          if (res.success) {
            setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: newStatus } : e));
            // Atualizar métricas e auditoria
            loadAllAdminData();
          } else {
            alert(res.error || 'Não foi possível alterar o estado.');
          }
        } finally {
          setActionLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Eliminar Evento
  const handleDeleteEvent = (eventId: string, eventTitle: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Evento Definitivamente',
      description: `Atenção: A eliminação do evento "${eventTitle}" removerá permanentemente o evento e todos os registos associados. Esta ação não pode ser revertida.`,
      actionLabel: 'Eliminar Definitivamente',
      isDestructive: true,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await eventService.deleteEvent(eventId);
          if (res.success) {
            setEvents(prev => prev.filter(e => e.id !== eventId));
            loadAllAdminData();
          } else {
            alert(res.error || 'Erro ao eliminar evento.');
          }
        } finally {
          setActionLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Alterar estado de utilizador/organização (Suspender / Reativar)
  const handleToggleUserStatus = (user: UserProfile) => {
    const isSuspending = user.status === 'active';
    const targetName = user.account_type === 'organization' ? (user.org_name || user.full_name) : user.full_name;

    setConfirmModal({
      isOpen: true,
      title: isSuspending ? 'Suspender Conta' : 'Reativar Conta',
      description: isSuspending
        ? `Tem a certeza de que deseja suspender a conta de "${targetName}"? O utilizador perderá o acesso e não poderá publicar ou gerir eventos até nova avaliação.`
        : `Deseja restabelecer o acesso total para a conta de "${targetName}"?`,
      actionLabel: isSuspending ? 'Suspender Conta' : 'Reativar Conta',
      isDestructive: isSuspending,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const newStatus = isSuspending ? 'suspended' : 'active';
          const res = await eventService.updateUserStatusAdmin(user.id, newStatus);
          if (res.success && res.user) {
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
            loadAllAdminData();
          } else {
            alert(res.error || 'Não foi possível alterar o estado da conta.');
          }
        } finally {
          setActionLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // 1. VISTA DE AUTENTICAÇÃO ADMINISTRATIVA (Se não for Admin)
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Logo / Badge */}
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>

          <h1 className="text-center text-xl font-bold tracking-tight text-white">
            EventFlow • Acesso Administrativo
          </h1>
          <p className="mt-1 text-center text-xs text-slate-400">
            Área de supervisão e moderação confidencial (/privado)
          </p>

          {/* Aviso se o utilizador logado for conta comum */}
          {currentUser && (
            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-semibold">Privilégios Insuficientes</p>
                <p className="text-[11px] text-amber-300/80 mt-0.5">
                  A conta com sessão ativa ({currentUser.email}) possui permissões de{' '}
                  <span className="font-mono">{currentUser.account_type === 'organization' ? 'Organização' : 'Organizador'}</span>.
                  Apenas contas com função de Administrador Geral podem aceder.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-slate-800/90 py-8 px-6 sm:px-8 border border-slate-700 rounded-2xl shadow-xl backdrop-blur-xs">
            
            {adminLoginError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{adminLoginError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  E-mail Administrativo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@eventflow.ao"
                    className="block w-full pl-9 pr-3 py-2 text-sm bg-slate-900/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Palavra-passe de Administrador
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full pl-9 pr-3 py-2 text-sm bg-slate-900/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={adminLoginLoading}
                className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:bg-indigo-700"
              >
                {adminLoginLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>A validar permissões no servidor...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Autenticar no Painel /privado</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-700/60 text-center">
              <button
                onClick={() => onNavigate({ name: 'landing' })}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar à página pública
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. FILTRAGEM DE EVENTOS E UTILIZADORES
  const filteredEvents = events.filter(e => {
    const matchesSearch = 
      e.title.toLowerCase().includes(eventSearch.toLowerCase()) ||
      (e.owner_name && e.owner_name.toLowerCase().includes(eventSearch.toLowerCase())) ||
      e.province.toLowerCase().includes(eventSearch.toLowerCase());
    const matchesStatus = eventStatusFilter === 'all' || e.status === eventStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const organizersList = users.filter(u => u.account_type === 'organizer' && u.role !== 'admin').filter(u => {
    const matchesSearch = 
      u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.phone && u.phone.includes(userSearch));
    const matchesStatus = userStatusFilter === 'all' || u.status === userStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const organizationsList = users.filter(u => u.account_type === 'organization').filter(u => {
    const matchesSearch = 
      (u.org_name && u.org_name.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.nif && u.nif.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.legal_representative && u.legal_representative.toLowerCase().includes(userSearch.toLowerCase())) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesStatus = userStatusFilter === 'all' || u.status === userStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-100/70 pb-16">
      
      {/* Top Bar Administrativa */}
      <div className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white">EventFlow Admin</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  /privado
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Sessão ativa: <span className="text-slate-200 font-medium">{currentUser.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate({ name: 'landing' })}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver site público</span>
            </button>
            <button
              onClick={async () => {
                await eventService.logout();
                window.location.reload();
              }}
              className="px-3 py-1.5 text-xs text-rose-300 hover:text-rose-100 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Terminar sessão</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* Navegação por Abas Administrativas */}
        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-1">
          <button
            onClick={() => setTab('metrics')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              tab === 'metrics'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Visão Geral</span>
          </button>

          <button
            onClick={() => setTab('events')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              tab === 'events'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Eventos ({events.length})</span>
          </button>

          <button
            onClick={() => setTab('organizers')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              tab === 'organizers'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Organizadores ({metrics?.organizersCount || organizersList.length})</span>
          </button>

          <button
            onClick={() => setTab('organizations')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              tab === 'organizations'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Organizações ({metrics?.organizationsCount || organizationsList.length})</span>
          </button>

          <button
            onClick={() => setTab('audit')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              tab === 'audit'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Histórico de Auditoria</span>
          </button>
        </div>

        {/* Loading global */}
        {loadingData && (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>A sincronizar dados administrativos do servidor...</span>
          </div>
        )}

        {/* ABA 1: VISÃO GERAL */}
        {!loadingData && tab === 'metrics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Total de Eventos
                </span>
                <p className="text-2xl font-bold text-slate-900">{metrics?.totalEvents || 0}</p>
                <p className="text-[11px] text-slate-400 mt-1">Registados na plataforma</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Eventos Publicados
                </span>
                <p className="text-2xl font-bold text-emerald-600">{metrics?.publishedEvents || 0}</p>
                <p className="text-[11px] text-emerald-700 font-medium mt-1">Ativos para o público</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Organizadores
                </span>
                <p className="text-2xl font-bold text-indigo-600">{metrics?.organizersCount || 0}</p>
                <p className="text-[11px] text-slate-400 mt-1">Contas singulares</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Organizações
                </span>
                <p className="text-2xl font-bold text-purple-600">{metrics?.organizationsCount || 0}</p>
                <p className="text-[11px] text-slate-400 mt-1">Entidades com NIF</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Inscrições
                </span>
                <p className="text-2xl font-bold text-slate-900">{metrics?.totalRegistered || 0}</p>
                <p className="text-[11px] text-slate-400 mt-1">Participantes emitidos</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Entradas Validadas
                </span>
                <p className="text-2xl font-bold text-slate-900">{metrics?.totalValidated || 0}</p>
                <p className="text-[11px] text-slate-400 mt-1">Check-in na portaria</p>
              </div>
            </div>

            {/* Dashboard: Volume de Inscrições por Evento */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    <span>Volume de Inscrições e Validações por Evento</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Comparativo entre participantes inscritos e check-ins validados em cada evento da plataforma
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {events.length} Eventos Ativos
                </span>
              </div>

              <div className="h-80 w-full pt-4">
                {events.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    Nenhum evento registado para exibir no gráfico.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={events.map(e => ({
                        name: e.title.length > 22 ? e.title.substring(0, 22) + '...' : e.title,
                        fullTitle: e.title,
                        Inscritos: e.registered_count || 0,
                        Validados: e.validated_count || 0,
                      }))}
                      margin={{ top: 10, right: 30, left: 0, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        angle={-20} 
                        textAnchor="end" 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                        interval={0}
                        height={50}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any, name: any) => [
                          `${value} participantes`, 
                          name === 'Inscritos' ? 'Total Inscritos' : 'Check-ins Validados'
                        ]}
                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fullTitle || label}
                      />
                      <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                      <Bar dataKey="Inscritos" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Inscritos" />
                      <Bar dataKey="Validados" fill="#10b981" radius={[4, 4, 0, 0]} name="Validados" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Resumo e Ações Rápidas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Estado de Segurança e Acesso
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  O painel administrativo restrito (/privado) opera com validação de credenciais no servidor. Apenas utilizadores com a função <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-700">admin</span> autenticada têm acesso à leitura e modificação de contas e eventos.
                </p>
                <div className="pt-2 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Servidor Ativo
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confidencialidade de NIF Assegurada
                  </span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-600" />
                  Últimas Ações Registadas
                </h3>
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-slate-400">Ainda não foram registadas ações de auditoria.</p>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.slice(0, 3).map((log) => (
                      <div key={log.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">{log.action}</span>
                          <span className="text-[10px] text-slate-400">{new Date(log.created_at).toLocaleTimeString('pt-AO')}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">{log.details}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: GESTÃO DE EVENTOS */}
        {!loadingData && tab === 'events' && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  placeholder="Pesquisar por título, organizador ou província..."
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Estado:</span>
                <select
                  value={eventStatusFilter}
                  onChange={(e) => setEventStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="all">Todos os estados</option>
                  <option value="published">Publicado</option>
                  <option value="draft">Rascunho</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="completed">Concluído</option>
                </select>
              </div>
            </div>

            {/* Tabela de Eventos */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Evento</th>
                      <th className="p-3.5">Organizador / Tipo</th>
                      <th className="p-3.5">Data & Lotação</th>
                      <th className="p-3.5">Estado</th>
                      <th className="p-3.5 text-right">Moderação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5">
                          <p className="font-bold text-slate-900">{evt.title}</p>
                          <p className="text-[11px] text-slate-500">{evt.province} • {evt.category}</p>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5">
                            {evt.owner_account_type === 'organization' ? (
                              <Building2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            )}
                            <span className="font-semibold text-slate-800">{evt.owner_name || 'Desconhecido'}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {evt.owner_account_type === 'organization' ? 'Organização' : 'Organizador'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <p className="font-medium text-slate-700">
                            {new Date(evt.start_date).toLocaleDateString('pt-AO')}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {evt.registered_count} / {evt.is_unlimited_capacity ? '∞' : evt.capacity} inscritos
                          </p>
                        </td>
                        <td className="p-3.5">
                          <StatusBadge status={evt.status} size="sm" />
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          {evt.status === 'published' ? (
                            <button
                              onClick={() => handleUpdateEventStatus(evt.id, 'cancelled', evt.title)}
                              className="px-2.5 py-1 text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded cursor-pointer transition-colors"
                            >
                              Suspender/Cancelar
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateEventStatus(evt.id, 'published', evt.title)}
                              className="px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded cursor-pointer transition-colors"
                            >
                              Reativar
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteEvent(evt.id, evt.title)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer transition-colors"
                            title="Eliminar evento definitivamente"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredEvents.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-xs text-slate-400">
                          Nenhum evento encontrado para os critérios pesquisados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: GESTÃO DE ORGANIZADORES */}
        {!loadingData && tab === 'organizers' && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Pesquisar organizador por nome, e-mail ou telemóvel..."
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Estado:</span>
                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="all">Todos</option>
                  <option value="active">Ativos</option>
                  <option value="suspended">Suspensos</option>
                </select>
              </div>
            </div>

            {/* Tabela de Organizadores */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Organizador</th>
                      <th className="p-3.5">E-mail</th>
                      <th className="p-3.5">Telemóvel & Província</th>
                      <th className="p-3.5">Estado da Conta</th>
                      <th className="p-3.5 text-right">Ação Administrativa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {organizersList.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                              {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'O'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{user.full_name}</p>
                              <span className="text-[10px] text-slate-400 font-mono">ID: {user.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-medium text-slate-700">{user.email}</td>
                        <td className="p-3.5">
                          <p className="text-slate-700">{user.phone || 'Não indicado'}</p>
                          <p className="text-[11px] text-slate-400">{user.province || 'Luanda'}</p>
                        </td>
                        <td className="p-3.5">
                          {user.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Ativa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                              <Ban className="w-3 h-3" /> Suspensa
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleToggleUserStatus(user)}
                            className={`px-3 py-1 text-[11px] font-medium rounded border cursor-pointer transition-colors ${
                              user.status === 'active'
                                ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                            }`}
                          >
                            {user.status === 'active' ? 'Suspender' : 'Reativar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {organizersList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-xs text-slate-400">
                          Nenhum organizador encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ABA 4: GESTÃO DE ORGANIZAÇÕES (COM NIF CONFIDENCIAL) */}
        {!loadingData && tab === 'organizations' && (
          <div className="space-y-4">
            {/* Aviso de Confidencialidade */}
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span>
                  O NIF é uma informação restrita a entidades corporativas e administradores. Não é divulgado publicamente nem no convite dos participantes.
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-purple-200/60 font-semibold text-[10px] text-purple-800 shrink-0">
                Acesso Restrito
              </span>
            </div>

            {/* Filtros */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Pesquisar organização por nome, NIF, representante ou e-mail..."
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Estado:</span>
                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="all">Todas</option>
                  <option value="active">Ativas</option>
                  <option value="suspended">Suspensas</option>
                </select>
              </div>
            </div>

            {/* Tabela de Organizações */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Organização / Entidade</th>
                      <th className="p-3.5">NIF (Confidencial)</th>
                      <th className="p-3.5">Representante</th>
                      <th className="p-3.5">Contactos</th>
                      <th className="p-3.5">Estado</th>
                      <th className="p-3.5 text-right">Ação Administrativa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {organizationsList.map((org) => (
                      <tr key={org.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{org.org_name || org.full_name}</p>
                              <span className="text-[10px] text-slate-400 font-mono">ID: {org.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded font-mono text-xs font-semibold text-slate-800">
                            {org.nif || 'NÃO REGISTADO'}
                          </span>
                        </td>
                        <td className="p-3.5 font-medium text-slate-800">
                          {org.legal_representative || 'Não indicado'}
                        </td>
                        <td className="p-3.5">
                          <p className="text-slate-700">{org.email}</p>
                          <p className="text-[11px] text-slate-400">{org.phone || 'Sem telemóvel'} • {org.province || 'Luanda'}</p>
                        </td>
                        <td className="p-3.5">
                          {org.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Ativa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                              <Ban className="w-3 h-3" /> Suspensa
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleToggleUserStatus(org)}
                            className={`px-3 py-1 text-[11px] font-medium rounded border cursor-pointer transition-colors ${
                              org.status === 'active'
                                ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                            }`}
                          >
                            {org.status === 'active' ? 'Suspender' : 'Reativar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {organizationsList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-xs text-slate-400">
                          Nenhuma organização registada com os filtros atuais.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ABA 5: HISTÓRICO DE AUDITORIA */}
        {!loadingData && tab === 'audit' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Registo Imutável de Auditoria</h3>
                  <p className="text-xs text-slate-500">Histórico de ações críticas realizadas por administradores</p>
                </div>
                <button
                  onClick={loadAllAdminData}
                  className="px-3 py-1.5 text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg bg-indigo-50 cursor-pointer"
                >
                  Atualizar Histórico
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Data & Hora</th>
                      <th className="p-3.5">Administrador</th>
                      <th className="p-3.5">Ação Realizada</th>
                      <th className="p-3.5">Alvo</th>
                      <th className="p-3.5">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                          {new Date(log.created_at).toLocaleString('pt-AO')}
                        </td>
                        <td className="p-3.5 font-semibold text-slate-800">
                          {log.admin_name}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 border border-slate-200 text-slate-700">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 font-mono text-[11px]">
                          {log.target_type}: {log.target_id}
                        </td>
                        <td className="p-3.5 text-slate-700 font-medium">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-xs text-slate-400">
                          Nenhum registo de auditoria gerado até ao momento.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* DIÁLOGO / MODAL DE CONFIRMAÇÃO PARA AÇÕES CRÍTICAS */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                confirmModal.isDestructive ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'
              }`}>
                {confirmModal.isDestructive ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <h3 className="text-base font-bold text-slate-900">{confirmModal.title}</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmModal.description}
            </p>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  confirmModal.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400'
                    : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400'
                }`}
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{confirmModal.actionLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
