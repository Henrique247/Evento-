import React, { useState } from 'react';
import { AppRoute, UserProfile, AccountType } from '../types';
import { 
  Calendar, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  ArrowLeft, 
  AlertCircle, 
  Loader2, 
  Building2, 
  UserCheck, 
  FileText,
  ShieldCheck
} from 'lucide-react';
import { ANGOLAN_PROVINCES } from '../data/mockData';
import { authService } from '../services/authService';
import { eventService } from '../services/eventService';

interface AuthPageProps {
  mode: 'login' | 'register' | 'forgot-password';
  redirectTarget?: string;
  onNavigate: (route: AppRoute) => void;
  onAuthSuccess: (user: UserProfile) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ 
  mode, 
  redirectTarget, 
  onNavigate, 
  onAuthSuccess 
}) => {
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'forgot-password'>(mode);
  
  // Tipo de conta no registo
  const [accountType, setAccountType] = useState<AccountType>('organizer');

  // Estados de formulário comuns
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('Luanda');

  // Campos específicos
  const [fullName, setFullName] = useState(''); // Usado para nome pessoal do organizador
  const [orgName, setOrgName] = useState('');   // Usado para organização
  const [nif, setNif] = useState('');           // Obrigatório para organização
  const [legalRepresentative, setLegalRepresentative] = useState(''); // Obrigatório para organização

  // Estados de feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    // Validação de palavra-passe
    if (currentView === 'register') {
      if (password.length < 6) {
        setErrorMessage('A palavra-passe deve conter pelo menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('As palavras-passe indicadas não coincidem. Por favor confirme a palavra-passe.');
        return;
      }

      if (accountType === 'organization') {
        const cleanNif = nif.trim().toUpperCase();
        if (!cleanNif) {
          setErrorMessage('O NIF da organização é obrigatório para registar uma conta institucional.');
          return;
        }
        if (cleanNif.length < 8 || cleanNif.length > 15) {
          setErrorMessage('Por favor introduza um NIF válido de Angola (entre 8 e 15 caracteres).');
          return;
        }
        if (!legalRepresentative.trim()) {
          setErrorMessage('O nome do representante responsável é obrigatório.');
          return;
        }
        if (!orgName.trim()) {
          setErrorMessage('O nome da organização é obrigatório.');
          return;
        }
      } else {
        if (!fullName.trim()) {
          setErrorMessage('Por favor introduza o seu nome completo.');
          return;
        }
      }
    }

    setLoading(true);

    try {
      if (currentView === 'login') {
        const res = await authService.signInWithPassword(email, password);
        if (res.success && res.user) {
          onAuthSuccess(res.user);
          if (redirectTarget === 'event-new') {
            onNavigate({ name: 'event-new' });
          } else if (res.user.role === 'admin') {
            onNavigate({ name: 'privado' });
          } else {
            onNavigate({ name: 'my-events' });
          }
        } else {
          setErrorMessage(res.error || 'Não foi possível iniciar sessão. Por favor verifique o seu e-mail e palavra-passe.');
        }
      } else if (currentView === 'register') {
        const res = await authService.signUp({
          email,
          password,
          confirmPassword,
          full_name: accountType === 'organization' ? orgName : fullName,
          phone,
          province,
          account_type: accountType,
          org_name: accountType === 'organization' ? orgName : undefined,
          nif: accountType === 'organization' ? nif.trim().toUpperCase() : undefined,
          legal_representative: accountType === 'organization' ? legalRepresentative.trim() : undefined,
        });

        if (res.success && res.user) {
          if (res.requiresEmailVerification) {
            setSuccessNotice('Conta registada com sucesso! Enviámos uma mensagem de verificação para o seu e-mail. Por favor consulte a sua caixa de entrada antes de iniciar sessão.');
            setCurrentView('login');
          } else {
            onAuthSuccess(res.user);
            if (redirectTarget === 'event-new') {
              onNavigate({ name: 'event-new' });
            } else {
              onNavigate({ name: 'my-events' });
            }
          }
        } else {
          setErrorMessage(res.error || 'Não foi possível concluir o registo. Por favor tente novamente.');
        }
      } else {
        // Recuperar palavra-passe
        const res = await authService.resetPasswordForEmail(email);
        if (res.success) {
          setSuccessNotice('Se o e-mail estiver registado no EventFlow, receberá uma mensagem com as instruções de recuperação.');
        } else {
          setErrorMessage(res.error || 'Erro ao processar o pedido de recuperação.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand */}
        <div className="flex justify-center mb-4">
          <button 
            onClick={() => onNavigate({ name: 'landing' })}
            className="flex items-center gap-2 group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">EventFlow</span>
          </button>
        </div>

        <h1 className="text-center text-xl font-bold tracking-tight text-slate-900">
          {currentView === 'login' && 'Iniciar sessão na sua conta'}
          {currentView === 'register' && 'Criar conta no EventFlow'}
          {currentView === 'forgot-password' && 'Recuperar palavra-passe'}
        </h1>

        <p className="mt-1 text-center text-xs text-slate-500">
          {currentView === 'login' && 'Aceda à gestão dos seus eventos e inscrições'}
          {currentView === 'register' && 'Escolha a modalidade de conta que melhor se adapta à sua atividade'}
          {currentView === 'forgot-password' && 'Introduza o seu e-mail para repor o acesso'}
        </p>

        {redirectTarget === 'event-new' && (
          <p className="mt-3 text-center text-xs font-medium text-indigo-600 bg-indigo-50 py-1.5 px-3 rounded-lg border border-indigo-100 max-w-sm mx-auto">
            Inicie sessão para continuar a criar o seu evento.
          </p>
        )}
      </div>

      <div className={`mt-6 sm:mx-auto sm:w-full ${currentView === 'register' ? 'sm:max-w-lg' : 'sm:max-w-md'}`}>
        <div className="bg-white py-8 px-6 sm:px-8 border border-slate-200 rounded-xl shadow-xs">
          
          {/* Mensagens de Erro ou Sucesso */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className="mb-5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {successNotice}
            </div>
          )}

          {/* Seleção do tipo de conta (apenas no Registo) */}
          {currentView === 'register' && (
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Tipo de Conta *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType('organizer')}
                  className={`p-3 text-left border rounded-lg transition-all cursor-pointer flex flex-col justify-between ${
                    accountType === 'organizer'
                      ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <UserCheck className={`w-4 h-4 ${accountType === 'organizer' ? 'text-indigo-600' : 'text-slate-500'}`} />
                    <span className="text-xs font-semibold text-slate-900">Organizador</span>
                  </div>
                  <span className="text-[11px] text-slate-500 leading-tight">
                    Pessoa singular para gestão direta e independente de eventos.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType('organization')}
                  className={`p-3 text-left border rounded-lg transition-all cursor-pointer flex flex-col justify-between ${
                    accountType === 'organization'
                      ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className={`w-4 h-4 ${accountType === 'organization' ? 'text-indigo-600' : 'text-slate-500'}`} />
                    <span className="text-xs font-semibold text-slate-900">Organização</span>
                  </div>
                  <span className="text-[11px] text-slate-500 leading-tight">
                    Empresa, associação ou entidade com NIF institucional.
                  </span>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Campos de Registo: Organizador Individual */}
            {currentView === 'register' && accountType === 'organizer' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Manuel António da Silva"
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Campos de Registo: Conta de Organização */}
            {currentView === 'register' && accountType === 'organization' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome da Organização ou Empresa *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Ex: Academia de Tecnologias de Angola, Lda"
                      className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      NIF da Organização *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={nif}
                        onChange={(e) => setNif(e.target.value.toUpperCase())}
                        placeholder="Ex: 5418902143"
                        className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Representante Responsável *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={legalRepresentative}
                        onChange={(e) => setLegalRepresentative(e.target.value)}
                        placeholder="Ex: Teresa dos Santos"
                        className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-[11px] flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-slate-600 mt-0.5" />
                  <span>
                    O NIF é utilizado exclusivamente para validação institucional e faturação interna. Nunca é exibido nas páginas públicas dos eventos.
                  </span>
                </div>
              </>
            )}

            {/* E-mail */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {currentView === 'register' && accountType === 'organization' ? 'E-mail de Contacto Institucional *' : 'Endereço de E-mail *'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={accountType === 'organization' && currentView === 'register' ? 'contacto@organizacao.ao' : 'utilizador@exemplo.ao'}
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Telemóvel e Província (no Registo) */}
            {currentView === 'register' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+244 9..."
                      className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {accountType === 'organization' ? 'Província (Sede)' : 'Província'}
                  </label>
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {ANGOLAN_PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Palavra-passe */}
            {currentView !== 'forgot-password' && (
              <div className={currentView === 'register' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : ''}>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Palavra-passe *
                    </label>
                    {currentView === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage(null);
                          setSuccessNotice(null);
                          setCurrentView('forgot-password');
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        Esqueceu-se?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {currentView === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirmar Palavra-passe *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:bg-indigo-400"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {currentView === 'login' && 'Entrar'}
                {currentView === 'register' && (accountType === 'organization' ? 'Registar Organização' : 'Criar Conta de Organizador')}
                {currentView === 'forgot-password' && 'Enviar ligação de recuperação'}
              </span>
            </button>
          </form>

          {/* Navegação entre vistas */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-600">
            {currentView === 'login' && (
              <p>
                Não tem conta?{' '}
                <button
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessNotice(null);
                    setCurrentView('register');
                  }}
                  className="font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                >
                  Criar conta
                </button>
              </p>
            )}

            {currentView === 'register' && (
              <p>
                Já tem conta no EventFlow?{' '}
                <button
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessNotice(null);
                    setCurrentView('login');
                  }}
                  className="font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                >
                  Iniciar sessão
                </button>
              </p>
            )}

            {currentView === 'forgot-password' && (
              <button
                onClick={() => {
                  setErrorMessage(null);
                  setSuccessNotice(null);
                  setCurrentView('login');
                }}
                className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar ao início de sessão
              </button>
            )}
          </div>
        </div>

        {/* Voltar ao início */}
        <div className="mt-4 text-center">
          <button
            onClick={() => onNavigate({ name: 'landing' })}
            className="text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            ← Voltar à página principal
          </button>
        </div>
      </div>
    </div>
  );
};
