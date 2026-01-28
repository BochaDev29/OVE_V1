-- 1. Limpiar políticas previas para evitar el error "policy already exists"
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Enable access to own profile" on public.profiles; -- Por si acaso creaste alguna con otro nombre

-- 2. Crear la tabla si no existe
create table if not exists public.profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null unique,
  business_name text,
  license_number text,
  phone text,
  email text,
  address text,
  logo_base64 text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Habilitar la seguridad (RLS)
alter table public.profiles enable row level security;

-- 4. Re-crear las políticas CORRECTAMENTE
create policy "Users can view own profile" 
on public.profiles for select 
using (auth.uid() = user_id);

create policy "Users can insert own profile" 
on public.profiles for insert 
with check (auth.uid() = user_id);

create policy "Users can update own profile" 
on public.profiles for update 
using (auth.uid() = user_id);

-- 5. Permisos básicos (asegura que el rol authenticated pueda usar la tabla)
grant all on public.profiles to authenticated;
grant all on public.profiles to service_role;
