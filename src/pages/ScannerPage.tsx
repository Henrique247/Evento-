import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Clock, 
  ArrowLeft,
  ShieldCheck,
  Lock,
  Loader2
} from 'lucide-react';
import { AppRoute, Ticket, EventModel, UserProfile } from '../types';
import { eventService } from '../services/eventService';

interface ScannerPageProps {
  currentUser: UserProfile | null;
  initialSerial?: string;
  onNavigate: (route: AppRoute) => void;
}

export const ScannerPage: React.FC<ScannerPageProps> = ({ 
  currentUser,
  initialSerial = '', 
  onNavigate 
}) => {
  const [inputCode, setInputCode] = useState(initialSerial);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [scanResult, setScanResult] = useState<{
    status: 'idle' | 'success' | 'already_used' | 'invalid' | 'unauthorized';
    message: string;
    ticket?: Ticket;
    event?: EventModel;
    timestamp?: string;
  }>({
    status: 'idle',
    message: 'Aguardando validação de convite pelo operador de portaria.',
  });

  const [scanHistory, setScanHistory] = useState<Array<{
    id: string;
    serial: string;
    attendee: string;
    status: string;
    time: string;
  }>>([]);

  // Regra 1: Visitantes não autenticados são encaminhados para iniciar sessão
  if (!currentUser) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 max-w-md w-full text-center shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Acesso Restrito à Portaria</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            O scanner de credenciamento requer autenticação e autorização prévia no evento correspondente.
          </p>
          <button
            onClick={() => onNavigate({ name: 'login', redirectTarget: 'scanner' })}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
          >
            Iniciar sessão para aceder ao scanner
          </button>
        </div>
      </div>
    );
  }

  // Se veio com serial prévio
  useEffect(() => {
    if (initialSerial) {
      handleValidateCode(initialSerial);
    }
  }, [initialSerial]);

  // Gestão de câmara (Apenas quando o utilizador autorizado clica para iniciar)
  const toggleCamera = async () => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      setCameraError('Permissão de câmara não concedida ou câmara não disponível. Introduza o código manualmente.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Validação estrita via Servidor Backend
  const handleValidateCode = async (codeToTest: string) => {
    const trimmed = codeToTest.trim();
    if (!trimmed) return;

    setValidating(true);
    try {
      const res = await eventService.validateTicketServer(trimmed);
      const timeStr = new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      if (res.success && res.ticket) {
        setScanResult({
          status: 'success',
          message: res.message,
          ticket: res.ticket,
          event: res.event,
          timestamp: timeStr,
        });

        setScanHistory(prev => [
          {
            id: `h-${Date.now()}`,
            serial: res.ticket!.serial_number,
            attendee: res.ticket!.attendee_name,
            status: 'success',
            time: timeStr,
          },
          ...prev.slice(0, 6),
        ]);
      } else if (res.reason === 'already_used') {
        setScanResult({
          status: 'already_used',
          message: res.message,
          ticket: res.ticket,
          event: res.event,
          timestamp: timeStr,
        });
      } else if (res.reason === 'unauthorized') {
        setScanResult({
          status: 'unauthorized',
          message: res.message,
          timestamp: timeStr,
        });
      } else {
        setScanResult({
          status: 'invalid',
          message: res.message || 'Convite não reconhecido pelo servidor.',
          timestamp: timeStr,
        });
      }
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleValidateCode(inputCode);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate({ name: 'my-events' })}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <QrCode className="w-6 h-6 text-emerald-600" />
              <span>Scanner de Entradas</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Operador autenticado: <strong className="text-slate-700">{currentUser.full_name}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setScanResult({
              status: 'idle',
              message: 'Aguardando próxima leitura...',
            });
            setInputCode('');
          }}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Limpar</span>
        </button>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Coluna Esquerda: Câmara e Entrada Manual */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Caixa de Visualização da Câmara */}
          <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-4/3 flex flex-col items-center justify-center p-6 text-center border border-slate-800 shadow-md">
            {cameraActive ? (
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                muted
              />
            ) : (
              <div className="space-y-3 z-10 max-w-xs">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
                  <Camera className="w-7 h-7" />
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  Leitor Ótico de Código QR
                </p>
                <p className="text-[11px] text-slate-500">
                  Clique no botão abaixo para ligar a câmara quando estiver na portaria.
                </p>
                <button
                  onClick={toggleCamera}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Iniciar Câmara</span>
                </button>
              </div>
            )}

            {/* Retículo do Scanner */}
            <div className="absolute inset-10 border border-emerald-500/30 rounded-xl pointer-events-none flex flex-col justify-between p-2">
              <div className="flex justify-between">
                <span className="w-3 h-3 border-t-2 border-l-2 border-emerald-400"></span>
                <span className="w-3 h-3 border-t-2 border-r-2 border-emerald-400"></span>
              </div>
              <div className="flex justify-between">
                <span className="w-3 h-3 border-b-2 border-l-2 border-emerald-400"></span>
                <span className="w-3 h-3 border-b-2 border-r-2 border-emerald-400"></span>
              </div>
            </div>

            {cameraActive && (
              <button
                onClick={stopCamera}
                className="absolute top-3 right-3 z-20 px-3 py-1 bg-black/60 backdrop-blur-md text-white text-xs font-medium rounded-lg border border-white/20 hover:bg-black/80 flex items-center gap-1.5 cursor-pointer"
              >
                <CameraOff className="w-3.5 h-3.5" />
                <span>Desativar</span>
              </button>
            )}
          </div>

          {cameraError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Validação por Código de Série */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Validar por Número de Série
            </label>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="Ex: EVF-2026-9812A"
                  className="block w-full px-3 py-2 text-sm font-mono uppercase tracking-wider border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={validating}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {validating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Verificar</span>
              </button>
            </form>
          </div>

        </div>

        {/* Coluna Direita: Resultado da Validação no Servidor */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className={`p-6 rounded-2xl border transition-all ${
            scanResult.status === 'success' 
              ? 'bg-emerald-500/10 border-emerald-300' 
              : scanResult.status === 'already_used'
              ? 'bg-amber-500/10 border-amber-300'
              : scanResult.status === 'invalid' || scanResult.status === 'unauthorized'
              ? 'bg-rose-500/10 border-rose-300'
              : 'bg-white border-slate-200 shadow-xs'
          }`}>
            
            <div className="flex items-center gap-3 mb-3">
              {scanResult.status === 'success' && (
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              )}

              {scanResult.status === 'already_used' && (
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              )}

              {(scanResult.status === 'invalid' || scanResult.status === 'unauthorized') && (
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                  <XCircle className="w-6 h-6" />
                </div>
              )}

              {scanResult.status === 'idle' && (
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                  <QrCode className="w-6 h-6" />
                </div>
              )}

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Resultado
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {scanResult.status === 'success' && 'Entrada Autorizada'}
                  {scanResult.status === 'already_used' && 'Entrada Já Validada'}
                  {scanResult.status === 'invalid' && 'Convite Não Encontrado'}
                  {scanResult.status === 'unauthorized' && 'Sem Permissão no Evento'}
                  {scanResult.status === 'idle' && 'Pronto para Leitura'}
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {scanResult.message}
            </p>

            {/* Apresentação segura dos dados do participante apenas quando autorizado */}
            {scanResult.ticket && (
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Participante:</span>
                  <span className="font-bold text-slate-900">{scanResult.ticket.attendee_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Telemóvel:</span>
                  <span className="font-mono text-slate-700">{scanResult.ticket.attendee_phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nº de Série:</span>
                  <span className="font-mono font-bold text-slate-900">{scanResult.ticket.serial_number}</span>
                </div>
                {scanResult.event && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Evento:</span>
                    <span className="font-medium text-slate-800 truncate max-w-[160px]">
                      {scanResult.event.title}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Histórico Recente de Entradas */}
          {scanHistory.length > 0 && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Validações Recentes
                </h4>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
              </div>

              <div className="space-y-2">
                {scanHistory.map((item) => (
                  <div key={item.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{item.attendee}</p>
                      <p className="font-mono text-[10px] text-slate-500">{item.serial}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
