import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Search, 
  Filter, 
  Users, 
  ArrowRight, 
  Ticket as TicketIcon,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  ArrowDown,
  RefreshCw,
  AlertCircle,
  Building2,
  HelpCircle,
  FileCheck2,
  Send,
  Eye,
  Info
} from 'lucide-react';
import { AppRoute, EventModel, UserProfile } from '../types';
import { ANGOLAN_PROVINCES } from '../data/mockData';

interface LandingPageProps {
  events: EventModel[];
  currentUser: UserProfile | null;
  loading?: boolean;
  error?: string | null;
  onNavigate: (route: AppRoute) => void;
  onRetry?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  events, 
  currentUser,
  loading = false,
  error = null,
  onNavigate,
  onRetry
}) => {
  // Estados de pesquisa e filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'upcoming' | 'this_month'>('all');
  const [pricingFilter, setPricingFilter] = useState<'all' | 'free' | 'paid'>('all');

  // Estado do Acordeão de FAQ
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Filtrar estritamente eventos publicados e ativos
  const publishedEvents = useMemo(() => {
    return events.filter(e => e.status === 'published');
  }, [events]);

  // Lista única de categorias presentes nos eventos publicados
  const categories = useMemo(() => {
    const set = new Set<string>();
    publishedEvents.forEach(e => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set);
  }, [publishedEvents]);

  // Filtragem combinada
  const filteredEvents = useMemo(() => {
    return publishedEvents.filter(evt => {
      // Pesquisa por texto no título, localidade, província ou descrição
      const matchesSearch = 
        evt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evt.location_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evt.province.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evt.description.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro de província
      const matchesProvince = provinceFilter === 'all' || evt.province.toLowerCase() === provinceFilter.toLowerCase();

      // Filtro de categoria
      const matchesCategory = categoryFilter === 'all' || evt.category.toLowerCase() === categoryFilter.toLowerCase();

      // Filtro de preço
      let matchesPricing = true;
      if (pricingFilter === 'free') matchesPricing = !evt.is_paid;
      else if (pricingFilter === 'paid') matchesPricing = evt.is_paid;

      // Filtro de data
      let matchesDate = true;
      if (dateFilter === 'upcoming') {
        const now = new Date();
        matchesDate = new Date(evt.start_date) >= now;
      } else if (dateFilter === 'this_month') {
        const now = new Date();
        const eventDate = new Date(evt.start_date);
        matchesDate = eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
      }

      return matchesSearch && matchesProvince && matchesCategory && matchesPricing && matchesDate;
    });
  }, [publishedEvents, searchTerm, provinceFilter, categoryFilter, pricingFilter, dateFilter]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-PT', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleStartOrganizing = () => {
    if (!currentUser) {
      onNavigate({ name: 'login', redirectTarget: 'event-new' });
    } else {
      onNavigate({ name: 'event-new' });
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setProvinceFilter('all');
    setCategoryFilter('all');
    setDateFilter('all');
    setPricingFilter('all');
  };

  const faqItems = [
    {
      q: 'Preciso de uma conta para ver os eventos?',
      a: 'Não. Os eventos publicados podem ser consultados publicamente por qualquer visitante sem necessidade de criar conta ou iniciar sessão.'
    },
    {
      q: 'Preciso de uma conta para organizar um evento?',
      a: 'Sim. Para criar e gerir eventos, deves iniciar sessão numa conta autorizada de organizador.'
    },
    {
      q: 'Posso inscrever-me num evento sem criar uma conta?',
      a: 'Sim. Depende do processo de inscrição disponibilizado pelo evento. Quando as inscrições públicas estiverem ativadas, podes preencher o formulário diretamente com o teu nome e contacto.'
    },
    {
      q: 'Como recebo o meu convite?',
      a: 'O sistema apresenta a confirmação da inscrição imediatamente no ecrã e disponibiliza o convite digital com o código QR e o respetivo número de série para descarregar ou imprimir.'
    },
    {
      q: 'Posso organizar eventos pagos?',
      a: 'A plataforma prevê essa possibilidade, permitindo aos organizadores configurar o valor da inscrição em Kwanzas (Kz) e as respetivas instruções de pagamento para validação manual.'
    },
    {
      q: 'Como posso validar os convites?',
      a: 'Os organizadores autorizados podem utilizar a ferramenta de scanner de entradas na portaria do evento para verificar a autenticidade e o estado dos convites.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      {/* 1. SECÇÃO HERO */}
      <section id="inicio" className="relative bg-white border-b border-slate-200 py-16 sm:py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Texto Principal */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold uppercase tracking-wider border border-slate-200">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Gestão moderna de eventos</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-950 leading-[1.12]">
                Os teus eventos. Mais organizados, mais acessíveis.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl">
                O EventFlow é uma plataforma de gestão de eventos que aproxima organizadores e participantes. Descobre eventos publicados, faz a tua inscrição e gere os teus próprios eventos num único lugar.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => scrollToSection('eventos')}
                  className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all text-sm sm:text-base flex items-center gap-2 cursor-pointer"
                >
                  <span>Explorar eventos</span>
                  <ArrowDown className="w-4 h-4" />
                </button>

                <button
                  onClick={handleStartOrganizing}
                  className="px-5 py-3.5 bg-white hover:bg-slate-50 text-slate-800 font-medium rounded-lg border border-slate-300 transition-all text-sm sm:text-base flex items-center gap-2 cursor-pointer"
                >
                  <span>Começar a organizar</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Destaques de transparência */}
              <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center gap-6 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Inscrições públicas sem login obrigatório
                </span>
                <span className="flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-indigo-600" />
                  Convites digitais com código QR
                </span>
              </div>
            </div>

            {/* Composição Visual Elegante (Sem excesso de efeitos) */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-sm sm:max-w-md bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-5">
                
                {/* Cabeçalho do Cartão Mockup */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                      EF
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">Convite Digital Oficial</p>
                      <p className="text-[10px] text-slate-400 font-mono">Nº EVF-2026-9812A</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Confirmado
                  </span>
                </div>

                {/* Evento Mockup Real */}
                <div className="space-y-2">
                  <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">
                    Tecnologia & Inovação
                  </span>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    Angola Tech Summit 2026
                  </h3>
                  <div className="space-y-1 text-xs text-slate-500">
                    <p className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      12 Nov 2026 • 08:30
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      Centro de Convenções de Talatona, Luanda
                    </p>
                  </div>
                </div>

                {/* Bloco QR Code Simulado com Limpeza */}
                <div className="pt-2 flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-slate-800">Credenciamento de Portaria</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Apresenta o código para validação na entrada do evento.
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-white rounded-lg border border-slate-200 p-1 flex items-center justify-center shrink-0">
                    <QrCode className="w-10 h-10 text-slate-900" />
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 text-center">
                  Plataforma EventFlow • Inscrição & Credenciamento
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. SECÇÃO DE EVENTOS PUBLICADOS */}
      <section id="eventos" className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full scroll-mt-14">
        
        {/* Cabeçalho da Secção */}
        <div className="max-w-2xl mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
            Eventos disponíveis
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Descobre os próximos eventos e encontra aquele em que queres participar.
          </p>
        </div>

        {/* Barra de Pesquisa e Filtros */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs mb-8 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            
            {/* Input de Pesquisa por nome */}
            <div className="sm:col-span-12 lg:col-span-5 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar evento por nome ou palavra-chave..."
                className="block w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Filtro de Categoria */}
            <div className="sm:col-span-4 lg:col-span-3">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filtrar por tipo de evento"
                className="block w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">Todas as categorias</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Filtro de Província/Localização */}
            <div className="sm:col-span-4 lg:col-span-2">
              <select
                value={provinceFilter}
                onChange={(e) => setProvinceFilter(e.target.value)}
                aria-label="Filtrar por localização ou província"
                className="block w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">Todas as regiões</option>
                {ANGOLAN_PROVINCES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Filtro de Modalidade (Gratuito vs Pago) */}
            <div className="sm:col-span-4 lg:col-span-2">
              <select
                value={pricingFilter}
                onChange={(e) => setPricingFilter(e.target.value as any)}
                aria-label="Filtrar por modalidade de preço"
                className="block w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">Todos os tipos</option>
                <option value="free">Gratuitos</option>
                <option value="paid">Pagos</option>
              </select>
            </div>

          </div>

          {/* Linha secundária de filtros rápidos e contador */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Período:</span>
              <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-slate-50 text-xs">
                <button
                  type="button"
                  onClick={() => setDateFilter('all')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    dateFilter === 'all' ? 'bg-white font-semibold text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter('upcoming')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    dateFilter === 'upcoming' ? 'bg-white font-semibold text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Próximos
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter('this_month')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    dateFilter === 'this_month' ? 'bg-white font-semibold text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Este mês
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span>
                A mostrar <strong className="text-slate-800">{filteredEvents.length}</strong> evento{filteredEvents.length === 1 ? '' : 's'} publicado{filteredEvents.length === 1 ? '' : 's'}
              </span>
              {(searchTerm || provinceFilter !== 'all' || categoryFilter !== 'all' || pricingFilter !== 'all' || dateFilter !== 'all') && (
                <button
                  onClick={handleResetFilters}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Estado: Erro ao Carregar */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center max-w-lg mx-auto my-6 space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
            <h3 className="font-bold text-slate-900 text-sm">Não foi possível carregar os eventos</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tentar novamente</span>
              </button>
            )}
          </div>
        )}

        {/* Estado: Carregamento */}
        {loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 animate-pulse">
                <div className="h-44 bg-slate-200 rounded-lg"></div>
                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                <div className="h-6 bg-slate-200 rounded w-4/5"></div>
                <div className="h-3 bg-slate-200 rounded w-full"></div>
                <div className="h-9 bg-slate-100 rounded-lg"></div>
              </div>
            ))}
          </div>
        )}

        {/* Estado: Nenhum Evento Encontrado */}
        {!loading && !error && filteredEvents.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-xl mx-auto my-6 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Ainda não existem eventos disponíveis
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Não foram encontrados eventos que correspondam aos filtros de pesquisa atuais. Volte a consultar em breve para novidades.
            </p>
            {(searchTerm || provinceFilter !== 'all' || categoryFilter !== 'all' || pricingFilter !== 'all' || dateFilter !== 'all') ? (
              <button
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
              >
                Limpar filtros de pesquisa
              </button>
            ) : (
              <button
                onClick={handleStartOrganizing}
                className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Criar o primeiro evento</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Lista / Grid de Eventos Publicados */}
        {!loading && !error && filteredEvents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((evt) => {
              const isSoldOut = !evt.is_unlimited_capacity && evt.registered_count >= evt.capacity;
              const remainingSpots = evt.is_unlimited_capacity ? null : Math.max(0, evt.capacity - evt.registered_count);

              return (
                <div 
                  key={evt.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Imagem / Banner do Evento (ou Fallback com calendário) */}
                    {evt.banner_url ? (
                      <div className="h-44 relative bg-slate-100 overflow-hidden">
                        <img 
                          src={evt.banner_url} 
                          alt={evt.title} 
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded text-xs font-semibold text-slate-900 border border-slate-200 shadow-2xs">
                          {evt.is_paid ? `${evt.price_aoa.toLocaleString('pt-PT')} Kz` : 'Gratuito'}
                        </div>
                        {evt.logo_url && (
                          <div className="absolute bottom-2 left-3 w-9 h-9 rounded-lg bg-white p-0.5 border border-slate-200 shadow-xs overflow-hidden z-10 flex items-center justify-center">
                            <img src={evt.logo_url} alt="" className="w-full h-full object-contain" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-32 bg-slate-100 flex items-center justify-center text-slate-400 relative">
                        {evt.logo_url ? (
                          <div className="w-12 h-12 rounded-xl bg-white p-1 border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden">
                            <img src={evt.logo_url} alt="" className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <Calendar className="w-8 h-8" />
                        )}
                        <div className="absolute top-3 right-3 bg-white px-2.5 py-1 rounded text-xs font-semibold text-slate-900 border border-slate-200">
                          {evt.is_paid ? `${evt.price_aoa.toLocaleString('pt-PT')} Kz` : 'Gratuito'}
                        </div>
                      </div>
                    )}

                    {/* Detalhes do Evento */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="text-indigo-600 uppercase tracking-wider truncate max-w-[170px]">
                          {evt.category}
                        </span>
                        
                        {/* Estado das Inscrições */}
                        {isSoldOut ? (
                          <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 shrink-0">
                            Sem vagas
                          </span>
                        ) : (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                            Inscrições Abertas
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-slate-900 text-lg leading-snug line-clamp-2">
                        {evt.title}
                      </h3>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {evt.description}
                      </p>

                      <div className="pt-2 space-y-1.5 text-xs text-slate-500 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatDate(evt.start_date)}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{evt.location_name}, {evt.province}</span>
                        </div>

                        {/* Vagas disponíveis */}
                        <div className="flex items-center gap-1.5 pt-1 text-[11px]">
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {evt.is_unlimited_capacity ? (
                              <span className="text-slate-600 font-medium">Lotação ilimitada</span>
                            ) : (
                              <span className={isSoldOut ? 'text-rose-600 font-semibold' : 'text-slate-700 font-medium'}>
                                {isSoldOut ? 'Inscrições encerradas por lotação' : `${remainingSpots} vaga${remainingSpots === 1 ? '' : 's'} restante${remainingSpots === 1 ? '' : 's'}`}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação do Cartão */}
                  <div className="p-5 pt-0 flex items-center gap-2">
                    <button
                      onClick={() => onNavigate({ name: 'event-public', eventId: evt.id })}
                      className="flex-1 py-2 text-center text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                    >
                      Ver detalhes
                    </button>

                    {!isSoldOut && (
                      <button
                        onClick={() => onNavigate({ name: 'event-public', eventId: evt.id })}
                        className="flex-1 py-2 text-center text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                      >
                        Inscrever-me
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </section>

      {/* 3. SECÇÃO “O QUE É O EVENTFLOW?” */}
      <section id="sobre" className="py-16 sm:py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-3xl mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-2">
              Sobre a plataforma
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
              O que é o EventFlow?
            </h2>
            <p className="mt-3 text-base text-slate-600 leading-relaxed font-normal">
              O EventFlow é uma plataforma criada para facilitar a divulgação, organização e gestão de eventos. Permite que os organizadores publiquem eventos e acompanhem as inscrições, enquanto os participantes descobrem oportunidades e recebem os dados da sua inscrição.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Vantagem 1 */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-2xs">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">
                Descobrir eventos
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Encontra eventos publicados e consulta as informações antes de te inscreveres.
              </p>
            </div>

            {/* Vantagem 2 */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-2xs">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">
                Organizar eventos
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cria e gere eventos através de uma área reservada ao organizador.
              </p>
            </div>

            {/* Vantagem 3 */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-2xs">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">
                Controlar as entradas
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Utiliza convites com códigos QR únicos para validar entradas, quando essa funcionalidade estiver disponível e configurada.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 4. SECÇÃO “COMO FUNCIONA?” */}
      <section id="como-funciona" className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200 scroll-mt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-2">
              Passo a passo
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
              Como funciona?
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Um processo simples tanto para quem participa como para quem organiza.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Passo 1 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                01
              </span>
              <h3 className="font-bold text-slate-900 text-base">
                1. Descobre
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Explora os eventos disponíveis na plataforma.
              </p>
            </div>

            {/* Passo 2 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                02
              </span>
              <h3 className="font-bold text-slate-900 text-base">
                2. Inscreve-te
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Abre os detalhes do evento e preenche o formulário de inscrição.
              </p>
            </div>

            {/* Passo 3 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                03
              </span>
              <h3 className="font-bold text-slate-900 text-base">
                3. Recebe o teu convite
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Quando o sistema de inscrições estiver operacional, recebe a confirmação e o convite digital com o respetivo código QR, se aplicável.
              </p>
            </div>

            {/* Passo 4 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                04
              </span>
              <h3 className="font-bold text-slate-900 text-base">
                4. Participa
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Apresenta o convite para validação na entrada, quando o organizador disponibilizar esse processo.
              </p>
            </div>

          </div>

          {/* Nota de esclarecimento sobre inscrição pública */}
          <div className="mt-8 p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 flex items-start gap-3 shadow-2xs">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-slate-800">Participação acessível:</strong> A inscrição num evento não exige necessariamente a criação de uma conta de participante. Os organizadores podem recolher os dados básicos (nome e telemóvel) diretamente na página pública do evento.
            </p>
          </div>

        </div>
      </section>

      {/* 5. SECÇÃO DESTINADA AOS ORGANIZADORES */}
      <section id="organizadores" className="py-16 sm:py-20 bg-white border-t border-slate-200 scroll-mt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-6 space-y-5">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block">
                Área do Organizador
              </span>

              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 leading-tight">
                Tens um evento para organizar?
              </h2>

              <p className="text-base text-slate-600 leading-relaxed font-normal">
                Publica o teu evento, acompanha as inscrições e organiza a participação num único espaço. O EventFlow ajuda-te a manter as informações do evento e dos participantes mais organizadas.
              </p>

              <div className="pt-2">
                <button
                  onClick={handleStartOrganizing}
                  className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-all text-sm sm:text-base inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Criar o meu evento</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lista de Funcionalidades */}
            <div className="lg:col-span-6 bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-2">
                Recursos para a tua organização
              </h3>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Criar e editar eventos:</strong> controlo total sobre o ciclo de vida e estado (rascunho, publicado, cancelado).</span>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Informações completas:</strong> adiciona descrições detalhadas, datas de início e término, recinto e imagem de capa.</span>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Gestão de lotação:</strong> define capacidade limitada ou ilimitada com bloqueio automático ao esgotar.</span>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Link público de partilha:</strong> página de inscrição acessível aos teus participantes sem complicações.</span>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Acompanhamento de inscritos:</strong> consulta os participantes registados e as vagas preenchidas em tempo real.</span>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Scanner de portaria:</strong> validação de convites através de câmara ou código numérico com proteção contra reentradas.</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 6. SECÇÃO DE CONFIANÇA E CONTROLO */}
      <section className="py-12 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-white border border-slate-200 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Área reservada e privacidade de dados
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Cada organizador tem uma área reservada e acede exclusivamente aos eventos e dados de participantes para os quais possui autorização. O sistema foi desenhado para assegurar que as informações privadas permaneçam protegidas.
          </p>
        </div>
      </section>

      {/* 7. PERGUNTAS FREQUENTES (FAQ) */}
      <section id="faq" className="py-16 sm:py-20 bg-white border-t border-slate-200 scroll-mt-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-2">
              Dúvidas comuns
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
              Perguntas frequentes
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Respostas claras sobre como funciona o EventFlow para organizadores e participantes.
            </p>
          </div>

          <div className="space-y-3">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div 
                  key={index}
                  className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full p-4 sm:p-5 text-left font-semibold text-slate-900 text-sm sm:text-base flex items-center justify-between gap-4 hover:bg-slate-50 cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span>{item.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 sm:pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 8. CHAMADA FINAL PARA AÇÃO (CTA) */}
      <section className="py-16 bg-slate-900 text-white border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
            O teu próximo evento pode começar aqui.
          </h2>

          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            Descobre o que está a acontecer ou dá o primeiro passo para organizar o teu próprio evento.
          </p>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => scrollToSection('eventos')}
              className="px-5 py-3 bg-white text-slate-900 hover:bg-slate-100 text-sm font-semibold rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Explorar eventos</span>
              <ArrowDown className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate({ name: 'register' })}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Criar conta</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
