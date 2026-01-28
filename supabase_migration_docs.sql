-- Agregar columna para guardar la documentación (Memoria, Materiales, Fotos)
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS documentation_data JSONB DEFAULT '{}'::jsonb;
