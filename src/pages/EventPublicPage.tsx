import React, { useState } from 'react';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  CreditCard, 
  Share2, 
  CheckCircle2, 
  Ticket as TicketIcon, 
  ArrowLeft,
  AlertCircle,
  Phone,
  Mail,
  User,
  Download,
  FileText
} from 'lucide-react';
import { AppRoute, EventModel, Ticket } from '../types';
import { eventService } from '../services/eventService';

interface EventPublicPageProps {
  event: EventModel;
  onNavigate: (route: AppRoute) => void;
}

export const EventPublicPage: React.FC<EventPublicPageProps> = ({
  event,
  onNavigate,
}) => {
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeePhone, setAttendeePhone] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedTicket, setGeneratedTicket] = useState<Ticket | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const isSoldOut = !event.is_unlimited_capacity && event.registered_count >= event.capacity;
  const remainingSpots = event.is_unlimited_capacity ? null : Math.max(0, event.capacity - event.registered_count);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-PT', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!attendeeName.trim() || !attendeePhone.trim()) {
      setErrorMessage('Por favor informe o seu nome e telemóvel.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await eventService.registerAttendee(event.id, {
        attendee_name: attendeeName,
        attendee_phone: attendeePhone,
        attendee_email: attendeeEmail || undefined,
      });

      if (res.success && res.ticket) {
        setGeneratedTicket(res.ticket);
      } else {
        setErrorMessage(res.error || 'Não foi possível concluir a inscrição.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navegação e Partilha */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate({ name: 'landing' })}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar aos eventos</span>
          </button>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-500" />
            <span>{copiedLink ? 'Ligação copiada!' : 'Partilhar evento'}</span>
          </button>
        </div>

        {/* Banner do Evento */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          {event.banner_url && (
            <div className="h-64 sm:h-80 relative bg-slate-900">
              <img
                src={event.banner_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />
              
              <div className="absolute bottom-6 left-6 right-6 text-white flex items-end justify-between gap-4">
                <div className="space-y-2 max-w-2xl">
                  <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-white/20 backdrop-blur-xs text-white">
                    {event.category}
                  </span>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white drop-shadow-xs">
                    {event.title}
                  </h1>
                </div>
                {event.logo_url && (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white p-1.5 shadow-lg border-2 border-white/90 overflow-hidden shrink-0 flex items-center justify-center">
                    <img src={event.logo_url} alt="Logótipo do evento" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>
            </div>
          )}

          {!event.banner_url && (
            <div className="p-6 sm:p-8 bg-slate-900 text-white flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-white/20 text-white">
                  {event.category}
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-2">
                  {event.title}
                </h1>
              </div>
              {event.logo_url && (
                <div className="w-16 h-16 rounded-xl bg-white p-1.5 shadow-md overflow-hidden shrink-0">
                  <img src={event.logo_url} alt="Logótipo do evento" className="w-full h-full object-contain" />
                </div>
              )}
            </div>
          )}

          {/* Barra de Organizador */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              {event.logo_url && (
                <img src={event.logo_url} alt="" className="w-5 h-5 rounded object-contain border border-slate-200 bg-white" />
              )}
              <span>Organizado por: <strong className="text-slate-800">{event.owner_name || 'Organizador Registado'}</strong></span>
            </div>
            <span className="font-medium text-slate-500">{event.province}</span>
          </div>
        </div>

        {/* Corpo Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Coluna Esquerda: Descrição e Localização */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Descrição */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h2 className="text-base font-bold text-slate-900">Sobre o Evento</h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </div>

            {/* Data e Localização */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900">Data e Localização</h2>
              
              <div className="space-y-3 text-sm text-slate-700">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Início</p>
                    <p className="text-xs text-slate-500 capitalize">{formatDate(event.start_date)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Encerramento</p>
                    <p className="text-xs text-slate-500 capitalize">{formatDate(event.end_date)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{event.location_name}</p>
                    <p className="text-xs text-slate-500">{event.location_address}</p>
                    <p className="text-xs font-medium text-indigo-600 mt-0.5">{event.province}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Instruções de Pagamento (Se pago) */}
            {event.is_paid && event.payment_instructions && (
              <div className="bg-amber-50/70 p-6 rounded-xl border border-amber-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <CreditCard className="w-4 h-4 text-amber-700" />
                  <span>Instruções de Pagamento</span>
                </div>
                <p className="text-xs text-amber-950 whitespace-pre-line leading-relaxed">
                  {event.payment_instructions}
                </p>
                <div className="pt-2 text-[11px] text-amber-900 border-t border-amber-200/60 flex items-center justify-between">
                  <span>Confirmação: Validação manual pelo organizador</span>
                  
                  {/* Botão Exportar Comprovativo - Em desenvolvimento (Regra estrita do prompt) */}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-200/60 text-amber-900 text-[10px] font-semibold">
                    <FileText className="w-3 h-3" />
                    Exportar comprovativo (Em desenvolvimento)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita: Inscrição */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
              
              <div className="border-b border-slate-100 pb-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Preço do Ingresso
                </span>
                <div className="text-2xl font-bold text-slate-950 mt-1">
                  {event.is_paid ? `${event.price_aoa.toLocaleString('pt-PT')} Kz` : 'Gratuito'}
                </div>
              </div>

              {/* Vagas */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Vagas disponíveis:</span>
                  <span className={`font-bold ${isSoldOut ? 'text-rose-600' : 'text-slate-900'}`}>
                    {event.is_unlimited_capacity ? 'Ilimitadas' : (isSoldOut ? 'Esgotadas' : `${remainingSpots} restantes`)}
                  </span>
                </div>

                {!event.is_unlimited_capacity && (
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-1.5 rounded-full ${isSoldOut ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ 
                        width: `${Math.min(100, (event.registered_count / event.capacity) * 100)}%` 
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Inscrição Confirmada */}
              {generatedTicket ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Inscrição Confirmada</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      O seu convite digital foi emitido com o número de série:
                    </p>
                    <p className="font-mono text-xs font-bold text-emerald-800 bg-white py-1.5 px-2 rounded border border-emerald-200 mt-2">
                      {generatedTicket.serial_number}
                    </p>
                  </div>

                  <button
                    onClick={() => onNavigate({ name: 'ticket', serialNumber: generatedTicket.serial_number })}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <TicketIcon className="w-4 h-4" />
                    <span>Ver Convite Digital</span>
                  </button>
                </div>
              ) : (
                /* Formulário de Inscrição */
                <form onSubmit={handleSubmit} className="space-y-4">
                  {errorMessage && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome do Participante *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        disabled={isSoldOut}
                        value={attendeeName}
                        onChange={(e) => setAttendeeName(e.target.value)}
                        placeholder="Nome e Sobrenome"
                        className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Telemóvel *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        required
                        disabled={isSoldOut}
                        value={attendeePhone}
                        onChange={(e) => setAttendeePhone(e.target.value)}
                        placeholder="+244 9..."
                        className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      E-mail (Opcional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        disabled={isSoldOut}
                        value={attendeeEmail}
                        onChange={(e) => setAttendeeEmail(e.target.value)}
                        placeholder="utilizador@exemplo.ao"
                        className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSoldOut || isSubmitting}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <TicketIcon className="w-4 h-4" />
                    <span>
                      {isSoldOut ? 'Lotação Esgotada' : 'Confirmar Inscrição'}
                    </span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
