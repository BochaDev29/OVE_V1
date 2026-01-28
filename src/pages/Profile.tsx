import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ProfileService, UserProfile } from '../services/profile.service';
import { ArrowLeft, Upload, Save, Building, User, Phone, Mail, MapPin } from 'lucide-react';

export default function Profile() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<UserProfile>({
        user_id: '',
        business_name: '',
        professional_category: 'instalador',
        license_number: '',
        phone: '',
        email: '',
        address: '',
        logo_base64: null
    });

    useEffect(() => {
        if (user) {
            loadProfile();
        }
    }, [user]);

    const loadProfile = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const data = await ProfileService.getProfile(user.id);
            if (data) {
                setFormData({
                    user_id: user.id,
                    business_name: data.business_name || '',
                    professional_category: data.professional_category || 'instalador',
                    license_number: data.license_number || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    address: data.address || '',
                    logo_base64: data.logo_base64 || null
                });
            } else {
                setFormData(prev => ({ ...prev, user_id: user.id, email: user.email || '' }));
            }
        } catch (error) {
            console.error("Error loading profile", error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, logo_base64: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            setSaving(true);
            console.log('Enviando datos de perfil:', formData);
            await ProfileService.upsertProfile(formData);
            alert('Perfil actualizado correctamente');
        } catch (error: any) {
            console.error("Error updating profile:", error);
            alert(`Error al guardar el perfil: ${error.message || JSON.stringify(error)}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-center">Cargando perfil...</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-6 flex justify-center">
            <div className="max-w-3xl w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

                {/* Header */}
                <div className="bg-white border-b border-slate-100 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-2xl font-bold text-slate-800">Mi Perfil Profesional</h1>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8">

                    {/* Logo Section */}
                    <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                        {formData.logo_base64 ? (
                            <div className="relative group">
                                <img src={formData.logo_base64} alt="Logo" className="h-32 object-contain rounded-md" />
                                <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center rounded-md cursor-pointer" onClick={() => document.getElementById('logo-upload')?.click()}>
                                    <span className="text-white text-sm font-medium">Cambiar Logo</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-slate-400">
                                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-2">
                                    <Upload size={24} />
                                </div>
                                <span className="text-sm">Subir Logo de la Empresa</span>
                            </div>
                        )}
                        <input
                            id="logo-upload"
                            type="file"
                            accept="image/*"
                            className={formData.logo_base64 ? 'hidden' : 'mt-4 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'}
                            onChange={handleLogoUpload}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Business Name */}
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Building size={16} className="text-slate-400" />
                                Nombre / Razón Social
                            </label>
                            <input
                                type="text"
                                name="business_name"
                                value={formData.business_name || ''}
                                onChange={handleChange}
                                placeholder="Ej. Electricidad Martínez S.A."
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>

                        {/* Professional Category */}
                        <div className="space-y-3 md:col-span-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <User size={16} className="text-slate-400" />
                                Categoría Profesional *
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                                    <input
                                        type="radio"
                                        name="professional_category"
                                        value="ingeniero"
                                        checked={formData.professional_category === 'ingeniero'}
                                        onChange={handleChange}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-medium text-slate-900">Ingeniero</div>
                                        <div className="text-xs text-slate-500">Cat I - Matrícula habilitante</div>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                                    <input
                                        type="radio"
                                        name="professional_category"
                                        value="tecnico"
                                        checked={formData.professional_category === 'tecnico'}
                                        onChange={handleChange}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-medium text-slate-900">Técnico</div>
                                        <div className="text-xs text-slate-500">Cat II - Matrícula habilitante</div>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                                    <input
                                        type="radio"
                                        name="professional_category"
                                        value="electricista_habilitado"
                                        checked={formData.professional_category === 'electricista_habilitado'}
                                        onChange={handleChange}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-medium text-slate-900">Electricista Habilitado</div>
                                        <div className="text-xs text-slate-500">Cat III - Nº Habilitación</div>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                                    <input
                                        type="radio"
                                        name="professional_category"
                                        value="instalador"
                                        checked={formData.professional_category === 'instalador'}
                                        onChange={handleChange}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-medium text-slate-900">Instalador</div>
                                        <div className="text-xs text-slate-500">Sin habilitación formal</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* License Number - Conditional */}
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <User size={16} className="text-slate-400" />
                                {formData.professional_category === 'electricista_habilitado'
                                    ? 'Nº Habilitación'
                                    : formData.professional_category === 'instalador'
                                        ? 'Nº Credencial (opcional)'
                                        : 'Nº Matrícula'}
                                {formData.professional_category !== 'instalador' && ' *'}
                            </label>
                            <input
                                type="text"
                                name="license_number"
                                value={formData.license_number || ''}
                                onChange={handleChange}
                                placeholder={
                                    formData.professional_category === 'electricista_habilitado'
                                        ? 'Ej: HAB-12345 o ERSeP 12345'
                                        : formData.professional_category === 'instalador'
                                            ? 'Dejar vacío si no tiene'
                                            : 'Ej: MAT-12345 o ERSeP 12345'
                                }
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                required={formData.professional_category !== 'instalador'}
                            />
                            {formData.professional_category === 'instalador' && (
                                <p className="text-xs text-slate-500">
                                    Solo completar si tiene algún tipo de credencial
                                </p>
                            )}
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Phone size={16} className="text-slate-400" />
                                Teléfono
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone || ''}
                                onChange={handleChange}
                                placeholder="+54 9 11 ..."
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Mail size={16} className="text-slate-400" />
                                Email de Contacto
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>

                        {/* Address */}
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <MapPin size={16} className="text-slate-400" />
                                Dirección Comercial
                            </label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address || ''}
                                onChange={handleChange}
                                placeholder="Calle Falsa 123, Ciudad"
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={18} />
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
