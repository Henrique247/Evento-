import React, { useState } from 'react';
import { 
  Calendar, 
  Layers, 
  QrCode, 
  LogIn, 
  UserPlus, 
  Menu, 
  X, 
  PlusCircle,
  LogOut,
  User,
  ShieldAlert,
  BarChart3
} from 'lucide-react';
import { AppRoute, UserProfile } from '../../types';

interface NavbarProps {
  currentRoute: AppRoute;
  currentUser: UserProfile | null;
  onNavigate: (route: AppRoute) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentRoute, 
  currentUser, 
  onNavigate, 
  onLogout 
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isCurrent = (name: AppRoute['name']) => currentRoute.name === name;

  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    if (currentRoute.name !== 'landing') {
      onNavigate({ name: 'landing' });
      // Aguardar render da landing page antes de fazer scroll
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleNav = (route: AppRoute) => {
    onNavigate(route);
    setMobileMenuOpen(false);
  };

  const handleCreateEventClick = () => {
    if (!currentUser) {
      handleNav({ name: 'login', redirectTarget: 'event-new' });
    } else {
      handleNav({ name: 'event-new' });
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logótipo / Nome EventFlow */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (currentRoute.name === 'landing') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  handleNav({ name: 'landing' });
                }
              }}
              className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-hidden"
              aria-label="EventFlow Início"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs group-hover:bg-indigo-700 transition-colors">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                EventFlow
              </span>
            </button>
          </div>

          {/* Navegação Desktop */}
          <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
            <button
              onClick={() => {
                if (currentRoute.name === 'landing') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  handleNav({ name: 'landing' });
                }
              }}
              className={`px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                isCurrent('landing') 
                  ? 'text-indigo-600 bg-indigo-50/70 font-semibold' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              Início
            </button>

            <button
              onClick={() => scrollToSection('eventos')}
              className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 rounded-lg transition-colors cursor-pointer"
            >
              Explorar eventos
            </button>

            <button
              onClick={() => scrollToSection('como-funciona')}
              className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 rounded-lg transition-colors cursor-pointer"
            >
              Como funciona
            </button>

            <button
              onClick={() => scrollToSection('organizadores')}
              className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 rounded-lg transition-colors cursor-pointer"
            >
              Para organizadores
            </button>

            <button
              onClick={() => scrollToSection('faq')}
              className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 rounded-lg transition-colors cursor-pointer"
            >
              Perguntas frequentes
            </button>

            {/* Links para utilizador comum autenticado */}
            {currentUser && !isAdmin && (
              <>
                <span className="w-px h-5 bg-slate-200 mx-1"></span>
                <button
                  onClick={() => handleNav({ name: 'my-events' })}
                  className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isCurrent('my-events') || isCurrent('event-edit')
                      ? 'text-indigo-600 bg-indigo-50/70 font-semibold' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Os meus eventos</span>
                </button>

                <button
                  onClick={() => handleNav({ name: 'scanner' })}
                  className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isCurrent('scanner') 
                      ? 'text-indigo-600 bg-indigo-50/70 font-semibold' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>Scanner</span>
                </button>
              </>
            )}
          </nav>

          {/* Ações à Direita: Baseadas no Estado da Sessão */}
          <div className="hidden lg:flex items-center gap-3">
            {!currentUser ? (
              <>
                <button
                  onClick={() => handleNav({ name: 'login' })}
                  className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <LogIn className="w-4 h-4 text-slate-500" />
                  <span>Iniciar sessão</span>
                </button>

                <button
                  onClick={() => handleNav({ name: 'register' })}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Criar conta</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCreateEventClick}
                  className="px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Criar evento</span>
                </button>

                <button
                  onClick={() => handleNav({ name: 'profile' })}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-left transition-colors cursor-pointer"
                  title="Consultar perfil"
                >
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    {currentUser.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-slate-800 leading-tight">
                      {currentUser.full_name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {isAdmin ? 'Administrador Geral' : 'Organizador'}
                    </p>
                  </div>
                </button>

                <button
                  onClick={onLogout}
                  className="p-2 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Terminar sessão"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Botão de Menu para Dispositivos Móveis */}
          <div className="flex lg:hidden items-center gap-2">
            {!currentUser && (
              <button
                onClick={() => handleNav({ name: 'register' })}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
              >
                Criar conta
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg focus:outline-hidden cursor-pointer"
              aria-label="Abrir menu de navegação"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu Dropdown Compacto e Funcional para Telemóveis */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-1 shadow-lg animate-in slide-in-from-top-2 duration-150">
          {currentUser && (
            <div className="p-3 mb-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  {currentUser.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{currentUser.full_name}</p>
                  <p className="text-[11px] text-slate-500">{currentUser.email}</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                {isAdmin ? 'Admin Geral' : 'Organizador'}
              </span>
            </div>
          )}

          <button
            onClick={() => {
              if (currentRoute.name === 'landing') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setMobileMenuOpen(false);
              } else {
                handleNav({ name: 'landing' });
              }
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2"
          >
            Início
          </button>

          <button
            onClick={() => scrollToSection('eventos')}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2"
          >
            Explorar eventos
          </button>

          <button
            onClick={() => scrollToSection('como-funciona')}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2"
          >
            Como funciona
          </button>

          <button
            onClick={() => scrollToSection('organizadores')}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2"
          >
            Para organizadores
          </button>

          <button
            onClick={() => scrollToSection('faq')}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2"
          >
            Perguntas frequentes
          </button>

          {!currentUser ? (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <button
                onClick={() => handleNav({ name: 'login' })}
                className="w-full py-2.5 text-center text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4 text-slate-500" />
                <span>Iniciar sessão</span>
              </button>
              <button
                onClick={() => handleNav({ name: 'register' })}
                className="w-full py-2.5 text-center text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Criar conta</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <button
                onClick={() => handleNav({ name: 'my-events' })}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2"
              >
                <Layers className="w-4 h-4 text-indigo-600" />
                Os meus eventos
              </button>

              <button
                onClick={handleCreateEventClick}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4 text-indigo-600" />
                Criar evento
              </button>

              <button
                onClick={() => handleNav({ name: 'scanner' })}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2"
              >
                <QrCode className="w-4 h-4 text-emerald-600" />
                Scanner de entradas
              </button>

              <button
                onClick={() => handleNav({ name: 'profile' })}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2"
              >
                <User className="w-4 h-4 text-slate-500" />
                Perfil
              </button>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full py-2 text-center text-sm font-semibold text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50"
                >
                  Terminar sessão
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
