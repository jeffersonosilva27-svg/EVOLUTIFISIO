import React, { useState } from 'react';
import PacienteDashboard from '../components/Dashboard/PacienteDashboard';

export default function PacienteDetalhes({ paciente, onVoltar }) {
  const [abaAtiva, setAbaAtiva] = useState('dashboard');

  return (
    <div className="animate-in fade-in duration-500">
      {/* Cabeçalho do Prontuário */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onVoltar}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{paciente.nome}</h1>
            <p className="text-slate-500">Prontuário: {paciente.id.substring(0, 8)}...</p>
          </div>
        </div>
        
        {/* Seletor de Abas Internas */}
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
          <button 
            onClick={() => setAbaAtiva('dashboard')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${abaAtiva === 'dashboard' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setAbaAtiva('historico')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${abaAtiva === 'historico' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}
          >
            Evoluções (SOAP)
          </button>
        </div>
      </div>

      {/* Conteúdo Dinâmico */}
      {abaAtiva === 'dashboard' ? (
        <PacienteDashboard pacienteId={paciente.id} />
      ) : (
        <div className="p-8 text-center text-slate-500 italic">
          Lista de evoluções SOAP filtradas para este paciente...
        </div>
      )}
    </div>
  );
}