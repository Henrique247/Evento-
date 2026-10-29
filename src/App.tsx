/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppRoute, EventModel, CreateEventInput, EventStatus, UserProfile } from './types';
import { eventService } from './services/eventService';
import { authService } from './services/authService';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPages';
import { EventsListPage } from './pages/EventsListPage';
import { EventFormPage } from './pages/EventFormPage';
import { EventPublicPage } from './pages/EventPublicPage';
import { TicketViewPage } from './pages/TicketViewPage';
import { ScannerPage } from './pages/ScannerPage';
import { AdminPage } from './pages/AdminPage';
import { InfoPage } from './pages/InfoPages';

export default function App() {
  const [route, setRoute] = useState<AppRoute>({ name: 'landing' });
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(eventService.getCurrentUser());
  const [publicEvents, setPublicEvents] = useState<EventModel[]>([]);
  const [myEvents, setMyEvents] = useState<EventModel[]>([]);
  const [selectedPublicEvent, setSelectedPublicEvent] = useState<EventModel | null>(null);
  const [selectedTicketData, setSelectedTicketData] = useState<{ ticket?: any; event?: any } | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Carregar eventos públicos e verificar sessão real
  const loadData = async () => {
    try {
      const verifiedUser = await eventService.verifySession();
      setCurrentUser(verifiedUser);

      // Eventos públicos (apenas os publicados)
      const pubList = await eventService.getPublicEvents();
      setPublicEvents(pubList);

      // Se autenticado, carregar os eventos do utilizador
      if (verifiedUser) {
        const mine = await eventService.getMyEvents();
        setMyEvents(mine);
      } else {
        setMyEvents([]);
      }
    } catch (err) {
      console.error('Erro ao sincronizar dados', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  // Resolução de rotas por URL pathname e hash
  const parseCurrentLocation = (): AppRoute => {
    const pathname = window.location.pathname;
    const hash = window.location.hash.replace('#', '');

    // Rota dedicada administrativa /privado
    if (pathname === '/privado' || pathname.startsWith('/privado') || hash === 'privado' || hash === 'admin') {
      return { name: 'privado' };
    }

    if (hash === 'events') return { name: 'events' };
    if (hash === 'my-events') return { name: 'my-events' };
    if (hash === 'event-new') return { name: 'event-new' };
    if (hash === 'scanner') return { name: 'scanner' };
    if (hash === 'login') return { name: 'login' };
    if (hash === 'register') return { name: 'register' };
    if (hash === 'forgot-password') return { name: 'forgot-password' };
    if (hash === 'profile') return { name: 'profile' };
    if (hash === 'about') return { name: 'about' };
    if (hash === 'terms') return { name: 'terms' };
    if (hash === 'privacy') return { name: 'privacy' };
    if (hash.startsWith('event-public/')) {
      const id = hash.replace('event-public/', '');
      return { name: 'event-public', eventId: id };
    }
    if (hash.startsWith('ticket/')) {
      const serial = hash.replace('ticket/', '');
      return { name: 'ticket', serialNumber: serial };
    }
    if (hash.startsWith('event-edit/')) {
      const id = hash.replace('event-edit/', '');
      return { name: 'event-edit', eventId: id };
    }

    return { name: 'landing' };
  };

  useEffect(() => {
    loadData();

    // Sincronização inicial de rota
    setRoute(parseCurrentLocation());

    // Ouvir alterações de navegação do browser
    const handleLocationChange = () => {
      setRoute(parseCurrentLocation());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    // Ouvir alterações de estado de autenticação do Supabase
    const authSub = authService.onAuthStateChange((user) => {
      setCurrentUser(user);
      if (user) {
        eventService.getMyEvents().then(setMyEvents);
      } else {
        setMyEvents([]);
      }
    });

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
      authSub.unsubscribe();
    };
  }, []);

  // Navegação protegida
  const handleNavigate = (newRoute: AppRoute) => {
    // Regra: Proteção para rota de criação de evento
    if (newRoute.name === 'event-new' && !eventService.isAuthenticated()) {
      setRoute({ name: 'login', redirectTarget: 'event-new' });
      window.location.hash = 'login';
      return;
    }

    // Regra: Proteção para rota de scanner
    if (newRoute.name === 'scanner' && !eventService.isAuthenticated()) {
      setRoute({ name: 'login', redirectTarget: 'scanner' });
      window.location.hash = 'login';
      return;
    }

    // Regra: Proteção para "Os meus eventos"
    if (newRoute.name === 'my-events' && !eventService.isAuthenticated()) {
      setRoute({ name: 'login', redirectTarget: 'my-events' });
      window.location.hash = 'login';
      return;
    }

    setRoute(newRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Atualizar URL e Hash de forma elegante
    if (newRoute.name === 'landing') {
      if (window.location.pathname === '/privado') {
        window.history.pushState(null, '', '/');
      }
      window.location.hash = '';
    } else if (newRoute.name === 'privado') {
      window.history.pushState(null, '', '/privado');
      window.location.hash = 'privado';
    } else if (newRoute.name === 'event-public') {
      window.location.hash = `event-public/${newRoute.eventId}`;
    } else if (newRoute.name === 'ticket') {
      window.location.hash = `ticket/${newRoute.serialNumber}`;
    } else if (newRoute.name === 'event-edit') {
      window.location.hash = `event-edit/${newRoute.eventId}`;
    } else {
      window.location.hash = newRoute.name;
    }
  };

  // Carregar dados de evento público quando rota muda
  useEffect(() => {
    if (route.name === 'event-public') {
      eventService.getPublicEventById(route.eventId).then(evt => {
        setSelectedPublicEvent(evt);
      });
    } else if (route.name === 'ticket') {
      eventService.getTicketBySerial(route.serialNumber).then(res => {
        setSelectedTicketData(res);
      });
    }
  }, [route]);

  // Gestão de Sessão
  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    loadData();
  };

  const handleLogout = async () => {
    await eventService.logout();
    setCurrentUser(null);
    setMyEvents([]);
    handleNavigate({ name: 'landing' });
  };

  // Operações de Eventos
  const handleSaveEvent = async (data: CreateEventInput, isEdit: boolean) => {
    let res: { success: boolean; event?: EventModel; error?: string };
    if (isEdit && route.name === 'event-edit') {
      res = await eventService.updateEvent(route.eventId, data);
    } else {
      res = await eventService.createEvent(data);
    }

    if (!res.success) {
      throw new Error(res.error || 'Não foi possível guardar o evento.');
    }

    await loadData();
    handleNavigate({ name: 'my-events' });
  };

  const handleUpdateStatus = async (id: string, status: EventStatus) => {
    await eventService.updateEvent(id, { status });
    await loadData();
  };

  const handleDeleteEvent = async (id: string) => {
    await eventService.deleteEvent(id);
    await loadData();
  };

  // Se a rota for a área administrativa dedicada /privado, renderizamos o painel com controlo de acesso restrito
  if (route.name === 'privado') {
    return (
      <AdminPage
        currentUser={currentUser}
        onNavigate={handleNavigate}
        initialTab="metrics"
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      
      {/* Barra de Navegação Pública e de Organizadores */}
      <Navbar 
        currentRoute={route} 
        currentUser={currentUser}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1">
        
        {/* 1. Página Inicial / Eventos Disponíveis */}
        {(route.name === 'landing' || route.name === 'events') && (
          <LandingPage
            events={publicEvents}
            currentUser={currentUser}
            loading={loadingInitial}
            onRetry={loadData}
            onNavigate={handleNavigate}
          />
        )}

        {/* 2. Os Meus Eventos (Utilizador Autenticado) */}
        {route.name === 'my-events' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <EventsListPage
              currentUser={currentUser}
              events={myEvents}
              onNavigate={handleNavigate}
              onUpdateStatus={handleUpdateStatus}
              onDeleteEvent={handleDeleteEvent}
            />
          </div>
        )}

        {/* 3. Criar Novo Evento (Protegido) */}
        {route.name === 'event-new' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <EventFormPage
              currentUser={currentUser}
              onSave={handleSaveEvent}
              onNavigate={handleNavigate}
            />
          </div>
        )}

        {/* 4. Editar Evento (Protegido) */}
        {route.name === 'event-edit' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <EventFormPage
              currentUser={currentUser}
              eventId={route.eventId}
              existingEvent={myEvents.find(e => e.id === route.eventId) || publicEvents.find(e => e.id === route.eventId)}
              onSave={handleSaveEvent}
              onNavigate={handleNavigate}
            />
          </div>
        )}

        {/* 5. Página Pública do Evento (Qualquer pessoa pode consultar e inscrever-se) */}
        {route.name === 'event-public' && (
          selectedPublicEvent ? (
            <EventPublicPage
              event={selectedPublicEvent}
              onNavigate={handleNavigate}
            />
          ) : (
            <div className="py-20 text-center text-xs text-slate-500">
              A carregar informações do evento...
            </div>
          )
        )}

        {/* 6. Convite Digital */}
        {route.name === 'ticket' && (
          selectedTicketData?.ticket && selectedTicketData?.event ? (
            <TicketViewPage
              ticket={selectedTicketData.ticket}
              event={selectedTicketData.event}
              onNavigate={handleNavigate}
            />
          ) : (
            <div className="py-20 text-center text-xs text-slate-500">
              A consultar convite no sistema...
            </div>
          )
        )}

        {/* 7. Scanner de Entradas (Acesso restrito e validação no servidor) */}
        {route.name === 'scanner' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <ScannerPage
              currentUser={currentUser}
              onNavigate={handleNavigate}
            />
          </div>
        )}

        {/* 8. Autenticação (Iniciar Sessão, Criar Conta, Recuperar Palavra-passe) */}
        {(route.name === 'login' || route.name === 'register' || route.name === 'forgot-password') && (
          <AuthPage
            mode={route.name}
            redirectTarget={route.name !== 'forgot-password' ? (route as any).redirectTarget : undefined}
            onNavigate={handleNavigate}
            onAuthSuccess={handleAuthSuccess}
          />
        )}

        {/* 9. Páginas Informativas e Perfil */}
        {(route.name === 'about' || route.name === 'terms' || route.name === 'privacy' || route.name === 'profile') && (
          <InfoPage
            type={route.name}
            currentUser={currentUser}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
          />
        )}

      </main>

      {/* Rodapé Profissional e Discreto */}
      <Footer onNavigate={handleNavigate} />

    </div>
  );
}
