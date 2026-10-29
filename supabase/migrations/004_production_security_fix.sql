-- ========================================================
-- EVENTFLOW — MIGRAÇÃO 004: CORRECÇÃO DE SEGURANÇA E RLS PARA PRODUÇÃO
-- ========================================================

-- 1. Assegurar bucket de storage para ativos de eventos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-assets', 'event-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de Storage para event-assets
DROP POLICY IF EXISTS "Imagens de eventos são públicas para leitura" ON storage.objects;
CREATE POLICY "Imagens de eventos são públicas para leitura"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-assets');

DROP POLICY IF EXISTS "Utilizadores autenticados podem fazer upload de imagens de eventos" ON storage.objects;
CREATE POLICY "Utilizadores autenticados podem fazer upload de imagens de eventos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'event-assets');

DROP POLICY IF EXISTS "Proprietários podem atualizar as suas imagens de eventos" ON storage.objects;
CREATE POLICY "Proprietários podem atualizar as suas imagens de eventos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'event-assets');

DROP POLICY IF EXISTS "Proprietários podem eliminar as suas imagens de eventos" ON storage.objects;
CREATE POLICY "Proprietários podem eliminar as suas imagens de eventos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'event-assets');

-- 3. Endurecer segurança da tabela tickets (remover SELECT público permissivo USING (TRUE))
DROP POLICY IF EXISTS "Organizadores e participantes podem consultar convites" ON public.tickets;
DROP POLICY IF EXISTS "Organizadores e administradores podem consultar convites" ON public.tickets;
CREATE POLICY "Organizadores e administradores podem consultar convites" 
  ON public.tickets 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = tickets.event_id 
      AND (
        events.owner_id = auth.uid() 
        OR events.organization_id IN (
          SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
      )
    )
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Garantir que inserção de tickets (inscrições públicas) permanece funcional
DROP POLICY IF EXISTS "Qualquer pessoa pode inscrever-se num evento publicado" ON public.tickets;
CREATE POLICY "Qualquer pessoa pode inscrever-se num evento publicado" 
  ON public.tickets 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = event_id AND status = 'published'
    )
  );
