import React, { useState, useRef } from 'react';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  CreditCard, 
  ArrowLeft, 
  Check, 
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Trash2,
  Loader2,
  Building2,
  Sparkles,
  Link as LinkIcon,
  X
} from 'lucide-react';
import { AppRoute, EventModel, CreateEventInput, UserProfile } from '../types';
import { ANGOLAN_PROVINCES } from '../data/mockData';

interface EventFormPageProps {
  currentUser: UserProfile | null;
  eventId?: string;
  existingEvent?: EventModel;
  onSave: (data: CreateEventInput, isEdit: boolean) => Promise<void>;
  onNavigate: (route: AppRoute) => void;
}

const PRESET_BANNERS = [
  { label: 'Conferência Tech', url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Auditório / Negócios', url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Workshop Prático', url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Cultura & Encontro', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80' },
];

/**
 * Utilitário de redimensionamento e otimização de imagens no navegador via HTMLCanvasElement
 */
const processImageFile = (file: File, maxWidth: number, maxHeight: number, quality = 0.88): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('O ficheiro selecionado não é uma imagem válida.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(mime, quality));
      };
      img.onerror = () => reject(new Error('Erro ao carregar a imagem.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Erro ao ler o ficheiro da imagem.'));
    reader.readAsDataURL(file);
  });
};

export const EventFormPage: React.FC<EventFormPageProps> = ({
  currentUser,
  eventId,
  existingEvent,
  onSave,
  onNavigate,
}) => {
  const isEdit = Boolean(eventId && existingEvent);

  // Se não estiver autenticado, bloquear
  if (!currentUser) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 max-w-md w-full text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Autenticação Necessária</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            É necessário ter sessão iniciada para criar ou editar eventos.
          </p>
          <button
            onClick={() => onNavigate({ name: 'login', redirectTarget: 'event-new' })}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
          >
            Iniciar sessão para continuar
          </button>
        </div>
      </div>
    );
  }

  // Estados dos campos do evento
  const [title, setTitle] = useState(existingEvent?.title || '');
  const [description, setDescription] = useState(existingEvent?.description || '');
  const [category, setCategory] = useState(existingEvent?.category || 'Tecnologia & Inovação');
  const [startDate, setStartDate] = useState(existingEvent?.start_date || '2026-11-15T09:00');
  const [endDate, setEndDate] = useState(existingEvent?.end_date || '2026-11-15T17:00');
  const [locationName, setLocationName] = useState(existingEvent?.location_name || '');
  const [locationAddress, setLocationAddress] = useState(existingEvent?.location_address || '');
  const [province, setProvince] = useState(existingEvent?.province || currentUser.province || 'Luanda');
  
  const [isUnlimitedCapacity, setIsUnlimitedCapacity] = useState(existingEvent?.is_unlimited_capacity ?? false);
  const [capacity, setCapacity] = useState(existingEvent?.capacity ? String(existingEvent.capacity) : '150');
  
  const [isPaid, setIsPaid] = useState(existingEvent?.is_paid ?? false);
  const [priceAoa, setPriceAoa] = useState(existingEvent?.price_aoa ? String(existingEvent.price_aoa) : '10000');
  const [paymentInstructions, setPaymentInstructions] = useState(
    existingEvent?.payment_instructions || 
    'Pagamento via Multicaixa Express ou Transferência Bancária para o IBAN indicado pelo organizador. O envio do comprovativo é verificado pela organização antes da aprovação final.'
  );

  // Estados de Imagem (Banner e Logótipo)
  const [bannerUrl, setBannerUrl] = useState(existingEvent?.banner_url || PRESET_BANNERS[0].url);
  const [logoUrl, setLogoUrl] = useState<string>(existingEvent?.logo_url || '');
  
  // Modos de entrada de imagem
  const [bannerMode, setBannerMode] = useState<'upload' | 'preset' | 'url'>('upload');
  const [customBannerUrlInput, setCustomBannerUrlInput] = useState('');
  
  // Estados de upload e erro
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Referências para inputs de arquivo ocultos
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Manipulador de upload do banner
  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBanner(true);
    setErrorMessage(null);
    try {
      const dataUrl = await processImageFile(file, 1400, 800, 0.88);
      setBannerUrl(dataUrl);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao processar o ficheiro do banner.');
    } finally {
      setUploadingBanner(false);
      if (e.target) e.target.value = '';
    }
  };

  // Manipulador de upload do logótipo
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setErrorMessage(null);
    try {
      const dataUrl = await processImageFile(file, 500, 500, 0.92);
      setLogoUrl(dataUrl);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao processar o ficheiro do logótipo.');
    } finally {
      setUploadingLogo(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = async (statusToSet?: 'draft' | 'published') => {
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Por favor introduza o nome / título do evento.');
      return;
    }
    if (!locationName.trim()) {
      setErrorMessage('Por favor indique o nome do local ou recinto do evento.');
      return;
    }
    if (!startDate || !endDate) {
      setErrorMessage('Por favor selecione a data e hora de início e término.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateEventInput = {
        title: title.trim(),
        description: description.trim(),
        category,
        status: statusToSet || existingEvent?.status || 'published',
        start_date: startDate,
        end_date: endDate,
        location_name: locationName.trim(),
        location_address: locationAddress.trim(),
        province,
        is_unlimited_capacity: isUnlimitedCapacity,
        capacity: isUnlimitedCapacity ? 0 : Number(capacity) || 100,
        is_paid: isPaid,
        price_aoa: isPaid ? Number(priceAoa) || 0 : 0,
        payment_instructions: isPaid ? paymentInstructions.trim() : undefined,
        banner_url: bannerUrl || undefined,
        logo_url: logoUrl || undefined,
      };

      await onSave(payload, isEdit);
    } catch (err: any) {
      console.error('Erro ao guardar evento:', err);
      setErrorMessage(err.message || 'Não foi possível guardar o evento. Por favor tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate({ name: 'my-events' })}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {isEdit ? 'Editar Evento' : 'Criar Novo Evento'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Entidade / Organizador: <strong className="text-slate-700">{currentUser.org_name || currentUser.full_name}</strong>
              {currentUser.account_type === 'organization' && (
                <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  <Building2 className="w-3 h-3" /> Conta de Organização
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => onNavigate({ name: 'my-events' })}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg cursor-pointer"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit('draft')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer disabled:opacity-50"
          >
            Guardar Rascunho
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit('published')}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:bg-indigo-400"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{isEdit ? 'Guardar Alterações' : 'Publicar Evento'}</span>
          </button>
        </div>
      </div>

      {/* Alerta de Erro */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Atenção ao guardar o evento:</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Formulário Principal */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-8">
        
        {/* Seção 1: Identidade Visual (Upload de Banner e Logótipo) */}
        <div className="space-y-6">
          <div className="border-b border-slate-100 pb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-600" />
              <span>1. Identidade Visual (Banner & Logótipo)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Faça upload das imagens que representam o seu evento nas páginas públicas e convites digitais.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Upload do Logótipo (1 Coluna) */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Logótipo do Evento / Entidade
              </label>

              <input
                type="file"
                ref={logoInputRef}
                onChange={handleLogoFileChange}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
              />

              {logoUrl ? (
                <div className="relative border-2 border-indigo-200 rounded-xl p-3 bg-indigo-50/30 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-24 h-24 rounded-lg bg-white border border-slate-200 p-1 shadow-xs flex items-center justify-center overflow-hidden">
                    <img src={logoUrl} alt="Logótipo do Evento" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="px-2.5 py-1 text-[11px] font-medium text-indigo-700 bg-white border border-indigo-200 rounded-md hover:bg-indigo-50 cursor-pointer"
                    >
                      {uploadingLogo ? 'A carregar...' : 'Trocar Logo'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-white cursor-pointer"
                      title="Remover logótipo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => logoInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-indigo-50/20 flex flex-col items-center justify-center min-h-[140px]"
                >
                  {uploadingLogo ? (
                    <div className="space-y-1">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                      <span className="text-xs text-slate-500">A processar...</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1.5">
                        <Upload className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700">Carregar Logótipo</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG ou WebP (quadrado)</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Upload do Banner Principal (2 Colunas) */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Banner de Capa do Evento *
                </label>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setBannerMode('upload')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      bannerMode === 'upload' ? 'bg-indigo-100 text-indigo-800 font-bold' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Fazer Upload
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setBannerMode('preset')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      bannerMode === 'preset' ? 'bg-indigo-100 text-indigo-800 font-bold' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Predefinidos
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setBannerMode('url')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      bannerMode === 'url' ? 'bg-indigo-100 text-indigo-800 font-bold' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Link URL
                  </button>
                </div>
              </div>

              <input
                type="file"
                ref={bannerInputRef}
                onChange={handleBannerFileChange}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
              />

              {/* Pré-visualização do Banner Ativo */}
              <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-900 h-44 sm:h-48 group">
                <img 
                  src={bannerUrl} 
                  alt="Pré-visualização do Banner" 
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-95 transition-opacity" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none">
                  <div className="text-white space-y-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-white/20 backdrop-blur-xs">
                      {category}
                    </span>
                    <p className="text-sm font-bold truncate max-w-sm drop-shadow-xs">
                      {title || 'Título do seu evento'}
                    </p>
                  </div>
                  <div className="pointer-events-auto">
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white/95 hover:bg-white rounded-md shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingBanner ? 'A carregar...' : 'Trocar Banner'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Abas de Escolha Alternativa */}
              {bannerMode === 'upload' && (
                <div 
                  onClick={() => bannerInputRef.current?.click()}
                  className="border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/20 p-3 rounded-lg text-center cursor-pointer transition-colors flex items-center justify-center gap-2 text-xs text-slate-600"
                >
                  <Upload className="w-4 h-4 text-indigo-600" />
                  <span>Clique aqui para carregar uma imagem do seu computador ou telemóvel (PNG, JPG, WebP)</span>
                </div>
              )}

              {bannerMode === 'preset' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {PRESET_BANNERS.map((preset) => (
                    <button
                      type="button"
                      key={preset.label}
                      onClick={() => setBannerUrl(preset.url)}
                      className={`rounded-lg overflow-hidden border-2 text-left transition-all cursor-pointer ${
                        bannerUrl === preset.url ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-14 object-cover" />
                      <div className="p-1 bg-white text-[10px] font-medium text-slate-700 truncate">
                        {preset.label}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {bannerMode === 'url' && (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customBannerUrlInput}
                    onChange={(e) => setCustomBannerUrlInput(e.target.value)}
                    placeholder="Cole a ligação da imagem (https://...)"
                    className="block w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customBannerUrlInput.trim()) {
                        setBannerUrl(customBannerUrlInput.trim());
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shrink-0 cursor-pointer"
                  >
                    Aplicar
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Seção 2: Informações Principais */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>2. Informações Principais</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Nome do Evento *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Fórum de Tecnologia e Startups de Angola 2026"
              className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Categoria *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="Tecnologia & Inovação">Tecnologia & Inovação</option>
                <option value="Negócios & Empreendedorismo">Negócios & Empreendedorismo</option>
                <option value="Cultura & Artes">Cultura & Artes</option>
                <option value="Educação & Ciência">Educação & Ciência</option>
                <option value="Música & Festivais">Música & Festivais</option>
                <option value="Saúde & Desporto">Saúde & Desporto</option>
                <option value="Geral">Geral</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Província *
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

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Descrição Completa do Evento
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a programação, palestrantes convidados, objetivos e o que os participantes podem esperar..."
              className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Seção 3: Datas e Horários */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>3. Datas e Horários</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Início do Evento *
              </label>
              <input
                type="datetime-local"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Encerramento do Evento *
              </label>
              <input
                type="datetime-local"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Seção 4: Localização */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-600" />
            <span>4. Local do Evento</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Nome do Espaço / Edifício *
            </label>
            <input
              type="text"
              required
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Ex: Centro de Convenções de Talatona (CCTA), Hotel Kalunda..."
              className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Endereço Completo ou Ponto de Referência
            </label>
            <input
              type="text"
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              placeholder="Ex: Via C3, Talatona, junto à rotunda"
              className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Seção 5: Lotação */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>5. Capacidade e Vagas</span>
          </h2>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="unlimited"
              checked={isUnlimitedCapacity}
              onChange={(e) => setIsUnlimitedCapacity(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300"
            />
            <label htmlFor="unlimited" className="text-xs font-medium text-slate-700 cursor-pointer">
              Lotação Ilimitada (sem restrição de número máximo de convites)
            </label>
          </div>

          {!isUnlimitedCapacity && (
            <div className="max-w-xs">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Lotação Máxima (Lugares) *
              </label>
              <input
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Seção 6: Preçário e Pagamentos */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <span>6. Modalidade de Inscrição</span>
          </h2>

          <div className="flex items-center gap-6">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="pricing"
                checked={!isPaid}
                onChange={() => setIsPaid(false)}
                className="text-indigo-600"
              />
              <span className="font-medium text-emerald-800">Gratuito</span>
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="pricing"
                checked={isPaid}
                onChange={() => setIsPaid(true)}
                className="text-indigo-600"
              />
              <span className="font-medium text-amber-800">Evento Pago (Kz)</span>
            </label>
          </div>

          {isPaid && (
            <div className="space-y-4 bg-amber-50/50 p-4 rounded-xl border border-amber-200">
              <div className="max-w-xs">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-800 mb-1">
                  Valor da Inscrição (Kwanzas - Kz) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="100"
                    step="500"
                    value={priceAoa}
                    onChange={(e) => setPriceAoa(e.target.value)}
                    className="block w-full pl-3 pr-12 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500 text-xs font-bold">
                    Kz
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-800 mb-1">
                  Instruções de Pagamento aos Participantes *
                </label>
                <textarea
                  rows={3}
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                  placeholder="Instruções de transferência bancária, Multicaixa Express e envio de comprovativo..."
                  className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div className="p-3 bg-white/80 rounded-lg border border-amber-200 text-xs text-amber-900">
                <p className="font-semibold mb-0.5">Confirmação de Pagamento:</p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Para eventos pagos, os participantes seguem as coordenadas indicadas. O organizador confirma o comprovativo antes de conceder a aprovação final.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Barra de Ações Inferior */}
        <div className="pt-6 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={() => onNavigate({ name: 'my-events' })}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg cursor-pointer"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit('draft')}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer disabled:opacity-50"
          >
            Guardar Rascunho
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit('published')}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:bg-indigo-400"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{isEdit ? 'Guardar Alterações' : 'Publicar Evento'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
