import React from 'react';
import { 
  ArrowLeft, 
  Shield, 
  FileText, 
  Info, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Building2, 
  UserCheck, 
  ShieldCheck,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { AppRoute, UserProfile } from '../types';

interface InfoPageProps {
  type: 'about' | 'terms' | 'privacy' | 'profile';
  currentUser?: UserProfile | null;
  onNavigate: (route: AppRoute) => void;
  onLogout?: () => void;
}

export const InfoPage: React.FC<InfoPageProps> = ({ 
  type, 
  currentUser, 
  onNavigate, 
  onLogout 
}) => {
  return (
    <div className="min-h-[70vh] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Top Back Button */}
        <div>
          <button
            onClick={() => onNavigate({ name: 'landing' })}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao início</span>
          </button>
        </div>

        {/* Content Box */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          
          {/* SOBRE A PLATAFORMA */}
          {type === 'about' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <Info className="w-5 h-5 text-indigo-600" />
                <h1 className="text-xl font-bold text-slate-900">Sobre a Plataforma EventFlow</h1>
              </div>

              <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
                <p>
                  O <strong>EventFlow</strong> é uma solução de software concebida para modernizar a organização de eventos, conferências, seminários e encontros comunitários ou corporativos.
                </p>
                <p>
                  A plataforma permite que diferentes organizadores publiquem as suas atividades, controlem a lotação de vagas em tempo real, forneçam informações detalhadas aos participantes e emitam credenciais digitais intransferíveis munidas de código QR.
                </p>
                <p>
                  Com interface responsiva e ferramentas dedicadas para a equipa de receção, o EventFlow assegura maior agilidade no credenciamento e rigor na prevenção de acessos duplicados ou não autorizados.
                </p>
              </div>
            </div>
          )}

          {/* TERMOS DE UTILIZAÇÃO */}
          {type === 'terms' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h1 className="text-xl font-bold text-slate-900">Termos de Utilização</h1>
              </div>

              <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
                <h2 className="font-bold text-slate-800 text-sm">1. Condições Gerais</h2>
                <p>
                  O acesso e utilização da plataforma EventFlow implica a aceitação plena dos presentes termos. A plataforma destina-se à publicação legítima de eventos e à inscrição de participantes.
                </p>

                <h2 className="font-bold text-slate-800 text-sm">2. Responsabilidade do Organizador</h2>
                <p>
                  Cada utilizador é o único responsável pela veracidade das informações, datas, locais e condições de pagamento associadas aos eventos que publica.
                </p>

                <h2 className="font-bold text-slate-800 text-sm">3. Inscrições e Credenciais</h2>
                <p>
                  O convite digital emitido é de uso pessoal e intransferível. A validação do acesso no local do evento é da competência exclusiva da organização responsável pelo respetivo evento.
                </p>
              </div>
            </div>
          )}

          {/* POLÍTICA DE PRIVACIDADE */}
          {type === 'privacy' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <Shield className="w-5 h-5 text-indigo-600" />
                <h1 className="text-xl font-bold text-slate-900">Política de Privacidade</h1>
              </div>

              <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
                <h2 className="font-bold text-slate-800 text-sm">1. Tratamento de Dados Pessoais</h2>
                <p>
                  Os dados recolhidos durante o registo na plataforma e no ato de inscrição em eventos (como nome completo, número de telemóvel e endereço de e-mail) são utilizados exclusivamente para efeitos de emissão de convites, validação de entradas na portaria e contacto relativo ao evento.
                </p>

                <h2 className="font-bold text-slate-800 text-sm">2. Confidencialidade e Dados Fiscais</h2>
                <p>
                  O Número de Identificação Fiscal (NIF) fornecido pelas organizações é estritamente confidencial, sendo protegido contra visualização pública e utilizado apenas para validação institucional e faturação interna.
                </p>
              </div>
            </div>
          )}

          {/* PERFIL DO UTILIZADOR */}
          {type === 'profile' && currentUser && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <User className="w-5 h-5 text-indigo-600" />
                  <h1 className="text-xl font-bold text-slate-900">Perfil de Utilizador</h1>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {currentUser.role === 'admin' 
                      ? 'Administrador Geral' 
                      : currentUser.account_type === 'organization' 
                        ? 'Conta de Organização' 
                        : 'Conta de Organizador'}
                  </span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {currentUser.status === 'active' ? 'Ativa' : 'Suspensa'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {currentUser.account_type === 'organization' ? (
                  <>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-purple-600" /> Nome da Organização
                      </span>
                      <p className="font-semibold text-slate-900 text-sm">{currentUser.org_name || currentUser.full_name}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                        <Lock className="w-3 h-3 text-indigo-600" /> NIF Institucional (Confidencial)
                      </span>
                      <p className="font-mono font-semibold text-slate-900 text-sm">{currentUser.nif || 'Não especificado'}</p>
                    </div>

                    {currentUser.legal_representative && (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Representante Legal</span>
                        <p className="font-semibold text-slate-900 text-sm">{currentUser.legal_representative}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-indigo-600" /> Nome Completo
                    </span>
                    <p className="font-semibold text-slate-900 text-sm">{currentUser.full_name}</p>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">E-mail</span>
                  <p className="font-semibold text-slate-900 text-sm">{currentUser.email}</p>
                </div>

                {currentUser.phone && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Telemóvel</span>
                    <p className="font-semibold text-slate-900 text-sm">{currentUser.phone}</p>
                  </div>
                )}

                {currentUser.province && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Localização / Sede</span>
                    <p className="font-semibold text-slate-900 text-sm">{currentUser.province}</p>
                  </div>
                )}
              </div>

              {currentUser.account_type === 'organization' && (
                <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 text-indigo-900 text-[11px] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    Os dados da sua organização estão salvaguardados com certificação institucional. O NIF nunca é exposto nas listagens públicas dos eventos.
                  </span>
                </div>
              )}

              {onLogout && (
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={onLogout}
                    className="px-4 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Terminar Sessão
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
