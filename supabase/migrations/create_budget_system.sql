-- =====================================================
-- Sistema de Presupuestos V1
-- Tablas para gestión de presupuestos personalizados
-- =====================================================

-- 1. ITEMS DE PRESUPUESTO POR USUARIO
-- Cada usuario define sus propios items con precios
CREATE TABLE IF NOT EXISTS public.user_budget_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Definición del item
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'Eléctrico', 'Cableado', 'Obra Civil', etc.
  unit TEXT NOT NULL, -- 'unidad', 'metro', 'global'
  
  -- Precio
  unit_price NUMERIC NOT NULL DEFAULT 0,
  
  -- Metadata
  is_custom BOOLEAN DEFAULT true, -- true = creado por usuario, false = de plantilla AEA
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, name),
  CHECK (unit_price >= 0)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_budget_items_user_id ON public.user_budget_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_budget_items_category ON public.user_budget_items(category);
CREATE INDEX IF NOT EXISTS idx_user_budget_items_active ON public.user_budget_items(is_active);

-- 2. PLANTILLAS DE PRESUPUESTO
-- Para reutilizar configuraciones de presupuesto
CREATE TABLE IF NOT EXISTS public.user_budget_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_user_budget_templates_user_id ON public.user_budget_templates(user_id);

-- 3. PRESUPUESTOS GENERADOS
-- Presupuestos temporales para editar antes de exportar
CREATE TABLE IF NOT EXISTS public.generated_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Items del presupuesto (editable)
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Totales
  subtotal NUMERIC NOT NULL DEFAULT 0,
  markup_percentage NUMERIC DEFAULT 0,
  markup_amount NUMERIC DEFAULT 0,
  vat_percentage NUMERIC DEFAULT 21,
  vat_amount NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  
  -- Validez
  validity_days INTEGER DEFAULT 5,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_edited TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CHECK (subtotal >= 0),
  CHECK (markup_percentage >= 0),
  CHECK (vat_percentage >= 0),
  CHECK (validity_days > 0)
);

CREATE INDEX IF NOT EXISTS idx_generated_budgets_project_id ON public.generated_budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_budgets_user_id ON public.generated_budgets(user_id);

-- 4. ACTUALIZAR TABLA PROFILES
-- Agregar campos para perfil fiscal
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS tax_status TEXT DEFAULT 'particular',
  ADD COLUMN IF NOT EXISTS tax_id TEXT;

-- Constraint para tax_status
ALTER TABLE public.profiles 
  ADD CONSTRAINT check_tax_status 
  CHECK (tax_status IN ('responsable_inscripto', 'monotributista', 'particular'));

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.user_budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_budget_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_budgets ENABLE ROW LEVEL SECURITY;

-- Policies para user_budget_items
CREATE POLICY "Users can view own budget items"
  ON public.user_budget_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budget items"
  ON public.user_budget_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budget items"
  ON public.user_budget_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budget items"
  ON public.user_budget_items FOR DELETE
  USING (auth.uid() = user_id);

-- Policies para user_budget_templates
CREATE POLICY "Users can view own templates"
  ON public.user_budget_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
  ON public.user_budget_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON public.user_budget_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON public.user_budget_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Policies para generated_budgets
CREATE POLICY "Users can view own budgets"
  ON public.generated_budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets"
  ON public.generated_budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
  ON public.generated_budgets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
  ON public.generated_budgets FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- GRANTS
-- =====================================================

GRANT ALL ON public.user_budget_items TO authenticated;
GRANT ALL ON public.user_budget_templates TO authenticated;
GRANT ALL ON public.generated_budgets TO authenticated;

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para user_budget_items
DROP TRIGGER IF EXISTS update_user_budget_items_updated_at ON public.user_budget_items;
CREATE TRIGGER update_user_budget_items_updated_at
    BEFORE UPDATE ON public.user_budget_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para user_budget_templates
DROP TRIGGER IF EXISTS update_user_budget_templates_updated_at ON public.user_budget_templates;
CREATE TRIGGER update_user_budget_templates_updated_at
    BEFORE UPDATE ON public.user_budget_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para generated_budgets (last_edited)
CREATE OR REPLACE FUNCTION update_last_edited_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_edited = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_generated_budgets_last_edited ON public.generated_budgets;
CREATE TRIGGER update_generated_budgets_last_edited
    BEFORE UPDATE ON public.generated_budgets
    FOR EACH ROW
    EXECUTE FUNCTION update_last_edited_column();
