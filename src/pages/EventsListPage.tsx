import React, { useState, useMemo } from 'react';
import { 
  PlusCircle, 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  Users, 
  Edit, 
  Trash2, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle,
  Eye,
  X,
  Phone,
  Mail
} from 'lucide-react';
import { AppRoute, EventModel, EventStatus, Ticket, UserProfile } from '../types';
import { StatusBadge } from '../components/common/Badge';
import { eventService } from '../services/eventService';

interface EventsListPageProps {
  currentUser: UserProfile | null;
  events: EventModel[];
  onNavigate: (route: AppRoute) => void;
  onUpdateStatus: (id: string, status: EventStatus) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
}

export const EventsListPage: React.FC<EventsListPageProps> = ({
  currentUser,
  events,
  onNavigate,
  onUpdateStatus,
  onDeleteEvent,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EventStatus>('all');
  
  // Modal de participantes privados do evento
  const [attendeesModalEvent, setAttendeesModalEvent] = useState<EventModel | null>(null);
  const [attendeesList, setAttendeesList] = useState<Ticket[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchesSearch = 
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.location_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.province.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [events, searchTerm, statusFilter]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-PT', {
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

  const handleOpenAttendees = async (evt: EventModel) => {
    setAttendeesModalEvent(evt);
    setLoadingAttendees(true);
    try {
      const res = await eventService.getEventAttendees(evt.id);
      if (res.success && res.attendees) {
        setAttendeesList(res.attendees);
      } else {
        setAttendeesList([]);
      }
    } finally {
      setLoadingAttendees(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Os meus eventos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie as suas publicações, consulte inscrições e acompanhe os participantes
          </p>
        </div>

        <button
          onClick={() => onNavigate({ name: 'event-new' })}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 self-start cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Criar Novo Evento</span>
        </button>
      </div>

      {/* Barra de Filtro e Pesquisa */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar evento por nome ou localidade..."
            className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Filtro de Estado */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Estado:</span>
          </div>

          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-medium">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({events.length})
            </button>
            <button
              onClick={() => setStatusFilter('published')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                statusFilter === 'published' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Publicados
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                statusFilter === 'draft' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rascunhos
            </button>
            <button
              onClick={() => setStatusFilter('cancelled')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                statusFilter === 'cancelled' ? 'bg-white text-rose-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cancelados
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                statusFilter === 'completed' ? 'bg-white text-sky-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Concluídos
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Eventos */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900">Nenhum evento encontrado</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Ainda não tem eventos registados nesta categoria. Crie o seu primeiro evento para começar.
            </p>
            <button
              onClick={() => onNavigate({ name: 'event-new' })}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Criar Novo Evento</span>
            </button>
          </div>
        ) : (
          filteredEvents.map((evt) => (
            <div 
              key={evt.id}
              className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors shadow-xs"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                {/* Detalhes do Evento com Thumbnail */}
                <div className="flex items-start gap-4 flex-1">
                  {(evt.logo_url || evt.banner_url) ? (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 shadow-2xs">
                      <img 
                        src={evt.logo_url || evt.banner_url} 
                        alt="" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-indigo-50 text-indigo-600 shrink-0 flex items-center justify-center border border-indigo-100 shadow-2xs">
                      <Calendar className="w-7 h-7" />
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={evt.status} size="sm" />
                      <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {evt.category}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {evt.province}
                      </span>
                      {evt.is_paid ? (
                        <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {evt.price_aoa.toLocaleString('pt-PT')} Kz
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Gratuito
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 leading-snug">
                      {evt.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(evt.start_date)}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{evt.location_name}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {evt.registered_count} {evt.is_unlimited_capacity ? 'inscritos' : `/ ${evt.capacity} vagas`} ({evt.validated_count} validados)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ações do Organizador */}
                <div className="flex flex-wrap items-center gap-2 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                  
                  {/* Ver participantes */}
                  <button
                    onClick={() => handleOpenAttendees(evt)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    title="Ver participantes inscritos"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>Inscritos ({evt.registered_count})</span>
                  </button>

                  {/* Ver página pública */}
                  {evt.status === 'published' && (
                    <button
                      onClick={() => onNavigate({ name: 'event-public', eventId: evt.id })}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                      title="Ver página de inscrição"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      <span>Ver página</span>
                    </button>
                  )}

                  {/* Editar */}
                  <button
                    onClick={() => onNavigate({ name: 'event-edit', eventId: evt.id })}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  {/* Mudar estado */}
                  {evt.status === 'draft' && (
                    <button
                      onClick={() => onUpdateStatus(evt.id, 'published')}
                      className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Publicar</span>
                    </button>
                  )}

                  {evt.status === 'published' && (
                    <>
                      <button
                        onClick={() => onUpdateStatus(evt.id, 'completed')}
                        className="px-2.5 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg cursor-pointer"
                      >
                        Concluir
                      </button>
                      <button
                        onClick={() => onUpdateStatus(evt.id, 'cancelled')}
                        className="px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </>
                  )}

                  {/* Eliminar */}
                  <button
                    onClick={() => {
                      if (window.confirm(`Tem a certeza que deseja eliminar o evento "${evt.title}"?`)) {
                        onDeleteEvent(evt.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Eliminar evento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Participantes do Evento */}
      {attendeesModalEvent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Participantes Inscritos
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {attendeesModalEvent.title}
                </p>
              </div>
              <button
                onClick={() => setAttendeesModalEvent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {loadingAttendees ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  A carregar lista de participantes...
                </div>
              ) : attendeesList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Ainda não existem participantes inscritos para este evento.
                </div>
              ) : (
                attendeesList.map((ticket) => (
                  <div key={ticket.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{ticket.attendee_name}</p>
                      <div className="flex items-center gap-3 text-slate-500 mt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {ticket.attendee_phone}
                        </span>
                        {ticket.attendee_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {ticket.attendee_email}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-[11px] font-bold text-slate-700 block">
                        {ticket.serial_number}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded mt-1 inline-block ${
                        ticket.status === 'checked_in' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {ticket.status === 'checked_in' ? 'Check-in Realizado' : 'Inscrição Confirmada'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-200 text-right">
              <button
                onClick={() => setAttendeesModalEvent(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
