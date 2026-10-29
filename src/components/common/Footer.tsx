import React from 'react';
import { Calendar } from 'lucide-react';
import { AppRoute } from '../../types';

interface FooterProps {
  onNavigate: (route: AppRoute) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="no-print bg-white border-t border-slate-200 py-10 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          
          {/* Brand & Description */}
          <div className="space-y-2 max-w-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-white">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-slate-900 text-sm">EventFlow</span>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">
              Plataforma profissional de gestão de eventos, inscrições e credenciamento.
            </p>
          </div>

          {/* Nav Links */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-600 font-medium">
            <button 
              onClick={() => {
                onNavigate({ name: 'landing' });
                setTimeout(() => {
                  document.getElementById('eventos')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }} 
              className="hover:text-indigo-600 transition-colors cursor-pointer"
            >
              Explorar eventos
            </button>
            <button 
              onClick={() => onNavigate({ name: 'register' })} 
              className="hover:text-indigo-600 transition-colors cursor-pointer"
            >
              Criar conta
            </button>
            <button 
              onClick={() => onNavigate({ name: 'login' })} 
              className="hover:text-indigo-600 transition-colors cursor-pointer"
            >
              Iniciar sessão
            </button>
            <button 
              onClick={() => onNavigate({ name: 'terms' })} 
              className="hover:text-indigo-600 transition-colors cursor-pointer"
            >
              Termos de utilização
            </button>
            <button 
              onClick={() => onNavigate({ name: 'privacy' })} 
              className="hover:text-indigo-600 transition-colors cursor-pointer"
            >
              Política de privacidade
            </button>
          </div>
        </div>

        {/* Bottom Year & Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-400 text-[11px]">
          <p>© {currentYear} EventFlow. Todos os direitos reservados.</p>
          <p>Gestão moderna e simplificada de eventos.</p>
        </div>
      </div>
    </footer>
  );
};
