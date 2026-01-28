import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Definimos la estructura del Usuario para la App
interface User {
  id: string;
  name: string;
  email: string;
  role: 'user'; // Simplificado para MVP
  matricula?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean; // Nuevo: para saber si estamos verificando sesión
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Efecto para escuchar cambios en la sesión (Login/Logout/Inicio)
  useEffect(() => {
    // Verificar sesión actual al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        mapUser(session.user);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    // Escuchar cambios en tiempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        mapUser(session.user);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Función auxiliar para transformar el usuario de Supabase a nuestro formato
  const mapUser = async (supabaseUser: any) => {
    try {
      // Intentamos buscar datos extra en la tabla profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      setUser({
        id: supabaseUser.id,
        name: profile?.full_name || supabaseUser.user_metadata?.full_name || 'Usuario',
        email: supabaseUser.email || '',
        role: 'user',
        matricula: profile?.matricula_ersep,
      });
    } catch (error) {
      console.error('Error al mapear usuario:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Función de Login Real
  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  // 3. Función de Registro Real
  const register = async (name: string, email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name, // Esto activará el Trigger en SQL
        },
      },
    });
    if (error) throw error;
    // Nota: Supabase puede requerir confirmar email por defecto. 
    // Si te da error, avísame para desactivarlo en el panel.
  };

  // 4. Función de Logout Real
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}