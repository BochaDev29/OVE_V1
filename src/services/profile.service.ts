import { supabase } from '../lib/supabase';
import type { TaxStatus } from '../types/budget';

export interface UserProfile {
    user_id: string;
    business_name: string;
    professional_category: 'ingeniero' | 'tecnico' | 'electricista_habilitado' | 'instalador';
    license_number: string;
    phone: string;
    email: string;
    address: string;
    province?: string; // Nuevo campo: Provincia
    logo_base64: string | null;
    tax_status?: TaxStatus;
    tax_id?: string;
}

export const ProfileService = {
    async getProfile(userId: string): Promise<UserProfile | null> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            console.error('Error fetching profile:', error);
            throw error;
        }

        return data;
    },

    async upsertProfile(profile: UserProfile): Promise<UserProfile> {
        const { data, error } = await supabase
            .from('profiles')
            .upsert(
                {
                    user_id: profile.user_id,
                    business_name: profile.business_name,
                    professional_category: profile.professional_category || 'instalador',
                    license_number: profile.license_number,
                    phone: profile.phone,
                    email: profile.email,
                    address: profile.address,
                    province: profile.province, // Guardar provincia
                    logo_base64: profile.logo_base64,
                    tax_status: profile.tax_status,
                    tax_id: profile.tax_id
                } as any,
                { onConflict: 'user_id' }
            )
            .select()
            .single();

        if (error) {
            console.error('Error upserting profile:', error);
            throw error;
        }

        return data;
    }
};
