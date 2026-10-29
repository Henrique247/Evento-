-- ========================================================
-- EVENTFLOW — MIGRAÇÃO 002: POLÍTICAS DE SEGURANÇA RLS
-- Row Level Security (RLS) para isolamento rigoroso de dados
-- ========================================================

-- 1. ATIVAÇÃO DE RLS EM TODAS AS TABELAS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------
-- 2. POLÍTICAS PARA A TABELA: events
-- --------------------------------------------------------

DROP POLICY IF EXISTS "Eventos publicados são visíveis publicamente" ON public.events;
CREATE POLICY "Eventos publicados são visíveis publicamente" 
  ON public.events 
  FOR SELECT 
  USING (status = 'published');

DROP POLICY IF EXISTS "Organizadores podem ver todos os seus eventos" ON public.events;
CREATE POLICY "Organizadores podem ver todos os seus eventos" 
  ON public.events 
  FOR SELECT 
  TO authenticated 
  USING (
    auth.uid() = owner_id 
    OR 
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Utilizadores autenticados podem criar eventos" ON public.events;
CREATE POLICY "Utilizadores autenticados podem criar eventos" 
  ON public.events 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'active')
  );

DROP POLICY IF EXISTS "Proprietários e gestores podem atualizar os seus eventos" ON public.events;
CREATE POLICY "Proprietários e gestores podem atualizar os seus eventos" 
  ON public.events 
  FOR UPDATE 
  TO authenticated 
  USING (
    auth.uid() = owner_id 
    OR 
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Apenas proprietário ou administrador pode eliminar evento" ON public.events;
CREATE POLICY "Apenas proprietário ou administrador pode eliminar evento" 
  ON public.events 
  FOR DELETE 
  TO authenticated 
  USING (
    auth.uid() = owner_id 
    OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- --------------------------------------------------------
-- 3. POLÍTICAS PARA A TABELA: organizations
-- --------------------------------------------------------

-- O NIF e os dados da organização NUNCA SÃO PÚBLICOS
-- Apenas membros autenticados da organização ou administradores da plataforma podem consultar
DROP POLICY IF EXISTS "Apenas membros ou administradores podem consultar dados da organização" ON public.organizations;
CREATE POLICY "Apenas membros ou administradores podem consultar dados da organização" 
  ON public.organizations 
  FOR SELECT 
  TO authenticated 
  USING (
    id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Utilizadores autenticados podem registar uma organização" ON public.organizations;
CREATE POLICY "Utilizadores autenticados podem registar uma organização" 
  ON public.organizations 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Gestores autorizados podem atualizar a organização" ON public.organizations;
CREATE POLICY "Gestores autorizados podem atualizar a organização" 
  ON public.organizations 
  FOR UPDATE 
  TO authenticated 
  USING (
    id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- --------------------------------------------------------
-- 4. POLÍTICAS PARA A TABELA: organization_members
-- --------------------------------------------------------

DROP POLICY IF EXISTS "Membros podem ver membros da mesma organização" ON public.organization_members;
CREATE POLICY "Membros podem ver membros da mesma organização" 
  ON public.organization_members 
  FOR SELECT 
  TO authenticated 
  USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Administradores da organização podem gerir membros" ON public.organization_members;
CREATE POLICY "Administradores da organização podem gerir membros" 
  ON public.organization_members 
  FOR ALL 
  TO authenticated 
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    user_id = auth.uid()
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- --------------------------------------------------------
-- 5. POLÍTICAS PARA A TABELA: profiles
-- --------------------------------------------------------

DROP POLICY IF EXISTS "Utilizador pode consultar o seu próprio perfil" ON public.profiles;
CREATE POLICY "Utilizador pode consultar o seu próprio perfil" 
  ON public.profiles 
  FOR SELECT 
  TO authenticated 
  USING (
    id = auth.uid() 
    OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Utilizador pode atualizar o seu perfil sem auto-promoção" ON public.profiles;
CREATE POLICY "Utilizador pode atualizar o seu perfil sem auto-promoção" 
  ON public.profiles 
  FOR UPDATE 
  TO authenticated 
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() 
    AND (role = (SELECT role FROM public.profiles WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  );

DROP POLICY IF EXISTS "Utilizador pode criar o seu registo de perfil" ON public.profiles;
CREATE POLICY "Utilizador pode criar o seu registo de perfil" 
  ON public.profiles 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (id = auth.uid());

-- --------------------------------------------------------
-- 6. POLÍTICAS PARA A TABELA: tickets
-- --------------------------------------------------------

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

DROP POLICY IF EXISTS "Organizadores e participantes podem consultar convites" ON public.tickets;
CREATE POLICY "Organizadores e participantes podem consultar convites" 
  ON public.tickets 
  FOR SELECT 
  USING (
    TRUE
  );

DROP POLICY IF EXISTS "Apenas organizador do evento pode validar ingressos" ON public.tickets;
CREATE POLICY "Apenas organizador do evento pode validar ingressos" 
  ON public.tickets 
  FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = event_id AND (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );
