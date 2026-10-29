import React, { useState } from 'react';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  User, 
  Phone, 
  QrCode, 
  Printer, 
  Copy, 
  Check, 
  ArrowLeft, 
  ShieldCheck
} from 'lucide-react';
import { AppRoute, Ticket, EventModel } from '../types';
import { QrCodeDisplay } from '../components/common/QrCodeGenerator';
import { StatusBadge } from '../components/common/Badge';

interface TicketViewPageProps {
  ticket: Ticket;
  event: EventModel;
  onNavigate: (route: AppRoute) => void;
}

export const TicketViewPage: React.FC<TicketViewPageProps> = ({
  ticket,
  event,
  onNavigate,
}) => {
  const [copied, setCopied] = useState(false);

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

  const handleCopySerial = () => {
    navigator.clipboard.writeText(ticket.serial_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100/70 py-10 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* Barra superior de ações */}
        <div className="no-print flex items-center justify-between">
          <button
            onClick={() => onNavigate({ name: 'event-public', eventId: event.id })}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Página do Evento</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Imprimir / Guardar em PDF</span>
          </button>
        </div>

        {/* Cartão de Convite Digital */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Cabeçalho */}
          <div className="bg-slate-900 text-white p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center text-white">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="font-bold tracking-tight text-sm">EventFlow</span>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Organizador
                </span>
                <span className="text-xs font-semibold text-slate-200 truncate max-w-[180px] block">
                  {event.owner_name || 'Organizador Registado'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">
                Convite Oficial de Entrada
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                {event.title}
              </h1>
            </div>
          </div>

          {/* Corpo do Convite */}
          <div className="p-6 space-y-6">
            
            {/* Detalhes do Participante */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Participante
                </span>
                <p className="text-base font-bold text-slate-900">{ticket.attendee_name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{ticket.attendee_phone}</p>
                {ticket.attendee_email && (
                  <p className="text-xs text-slate-400">{ticket.attendee_email}</p>
                )}
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Estado do Convite
                </span>
                <div className="mt-1">
                  <StatusBadge status={ticket.status} size="sm" />
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Tipo: {event.is_paid ? 'Ingresso Pago' : 'Entrada Gratuita'}
                </span>
              </div>
            </div>

            {/* Logística */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b border-slate-100 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Data e Hora
                </span>
                <p className="font-semibold text-slate-800">{formatDate(event.start_date)}</p>
                <p className="text-slate-500">Até: {formatDate(event.end_date)}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Local
                </span>
                <p className="font-semibold text-slate-800">{event.location_name}</p>
                <p className="text-slate-500">{event.location_address}, {event.province}</p>
              </div>
            </div>

            {/* Código QR e Número de Série */}
            <div className="pt-2 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Apresente este código na portaria
              </span>

              {/* Exibição nítida do QR Code */}
              <QrCodeDisplay value={ticket.qr_code_data} size={180} />

              {/* Tag com Número de Série */}
              <div className="mt-4 flex items-center gap-2">
                <div className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200 tracking-wider">
                  {ticket.serial_number}
                </div>
                <button
                  onClick={handleCopySerial}
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  title="Copiar número de série"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <p className="text-[10px] text-slate-400 mt-3 max-w-xs leading-relaxed">
                Código intransferível gerado pela plataforma EventFlow. Válido para credenciamento na entrada do recinto.
              </p>
            </div>

          </div>

          {/* Rodapé de Segurança */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Convite Oficial EventFlow</span>
            </div>
            <span className="font-mono text-[10px] text-slate-400">
              Nº {ticket.serial_number}
            </span>
          </div>

        </div>

      </div>
    </div>
  );
};
