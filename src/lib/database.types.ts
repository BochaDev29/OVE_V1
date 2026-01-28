export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          matricula_ersep: string | null
          phone: string | null
          business_name: string | null
          professional_category: string | null
          license_number: string | null
          address: string | null
          logo_base64: string | null
          tax_status: string | null
          tax_id: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          matricula_ersep?: string | null
          phone?: string | null
          business_name?: string | null
          professional_category?: string | null
          license_number?: string | null
          address?: string | null
          logo_base64?: string | null
          tax_status?: string | null
          tax_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          matricula_ersep?: string | null
          phone?: string | null
          business_name?: string | null
          professional_category?: string | null
          license_number?: string | null
          address?: string | null
          logo_base64?: string | null
          tax_status?: string | null
          tax_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          calculation_data: Json | null
          drawing_data: Json | null
          documentation_data: Json | null
          status: string | null
          client_cuit: string | null
          client_address: string | null
          client_city: string | null
          client_catastro: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          calculation_data?: Json | null
          drawing_data?: Json | null
          documentation_data?: Json | null
          status?: string | null
          client_cuit?: string | null
          client_address?: string | null
          client_city?: string | null
          client_catastro?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          calculation_data?: Json | null
          drawing_data?: Json | null
          documentation_data?: Json | null
          status?: string | null
          client_cuit?: string | null
          client_address?: string | null
          client_city?: string | null
          client_catastro?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      circuits: {
        Row: {
          id: string
          project_id: string
          name: string
          type: string
          points_count: number | null
          wire_section: number | null
          protection_amps: number | null
          is_validated: boolean | null
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          type: string
          points_count?: number | null
          wire_section?: number | null
          protection_amps?: number | null
          is_validated?: boolean | null
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          type?: string
          points_count?: number | null
          wire_section?: number | null
          protection_amps?: number | null
          is_validated?: boolean | null
        }
      }
      plan_elements: {
        Row: {
          id: string
          project_id: string
          type: string
          x: number
          y: number
          rotation: number | null
          properties: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          type: string
          x: number
          y: number
          rotation?: number | null
          properties?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          type?: string
          x?: number
          y?: number
          rotation?: number | null
          properties?: Json | null
          created_at?: string
        }
      }
    }
  }
}
