import { Zap, FileCheck, Calculator, Users, ChevronRight } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

export default function LandingPage({ onLogin, onRegister }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg">
                <Zap className="w-5 h-5 sm:w-6 h-6 text-white" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-slate-800">
                OVE
              </span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={onLogin}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base text-slate-700 hover:text-slate-900 font-medium transition-colors"
              >
                Ingresar
              </button>
              <button
                onClick={onRegister}
                className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base font-medium transition-colors shadow-sm"
              >
                Crear Cuenta
              </button>
            </div>
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-6 px-2">
            La Plataforma Profesional para
            <span className="text-blue-600 block sm:inline"> Electricistas</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-8 px-4 leading-relaxed">
            Automatiza cálculos según normativa AEA/ERSEP, genera documentación
            técnica profesional y gestiona tus proyectos en un solo lugar.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 px-6 md:px-0">
            <button
              onClick={onRegister}
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
            >
              <span>Comenzar Gratis</span>
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={onLogin}
              className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 rounded-xl hover:bg-slate-50 font-bold text-lg transition-colors shadow-md border border-slate-200"
            >
              Ver Demo
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="bg-blue-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
              <Calculator className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3">
              Cálculos Automáticos
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Calcula automáticamente el Grado de Electrificación y Puntos
              Mínimos según normativa AEA vigente. Sin errores, sin demoras.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="bg-blue-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
              <FileCheck className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3">
              Documentación Técnica
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Genera certificaciones y presupuestos profesionales listos para
              presentar a ERSEP y clientes en segundos.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="bg-blue-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3">
              Gestión de Clientes
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Organiza todos tus proyectos y clientes en un panel centralizado.
              Accede a tu historial cuando lo necesites.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white border-t border-slate-200 py-16 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-12 text-center shadow-xl">
            <h2 className="text-3xl font-bold text-white mb-4">
              ¿Listo para digitalizar tu oficina?
            </h2>
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
              Únete a los electricistas de Córdoba que ya optimizaron su
              trabajo con nuestra plataforma.
            </p>
            <button
              onClick={onRegister}
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-semibold text-lg transition-all shadow-lg hover:shadow-xl"
            >
              Crear Cuenta Gratis
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm">
            © 2025 Oficina Virtual Electricista - Plataforma para Electricistas en
            Córdoba, Argentina
          </p>
          <p className="text-xs mt-2">
            Cumplimiento normativa AEA y requisitos ERSEP
          </p>
        </div>
      </footer>
    </div>
  );
}
