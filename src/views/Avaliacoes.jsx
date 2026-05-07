import React, { useState, useEffect } from 'react';
import EscalaRenderer from '../components/Avaliacoes/EscalaRenderer';
import { escalaBerg } from '../data/escalas/berg';
import { escalaBarthel } from '../data/escalas/barthel';
import { escalaTUG } from '../data/escalas/tug';
import { escalaFMA } from '../data/escalas/fuglMeyer';
import { escalaSCIM } from '../data/escalas/scim';
import { escalaWISCI } from '../data/escalas/wisci';
import { escalaMAS } from '../data/escalas/ashworth';
import { db } from '../services/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

export default function Avaliacoes() {
  const [escalaAtiva, setEscalaAtiva] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [pacienteSelecionado, setPacienteSelecionado] = useState('');

  // Busca lista de pacientes reais para o vínculo
  useEffect(() => {
    const fetchPacientes = async () => {
      const querySnapshot = await getDocs(collection(db, "pacientes"));
      const lista = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPacientes(lista);
    };
    fetchPacientes();
  }, []);

  // Adicionamos a escalaBarthel aqui para que o botão seja renderizado
  const escalasDisponiveis = [escalaBerg, escalaBarthel, escalaTUG, escalaFMA,escalaSCIM, escalaWISCI, escalaMAS];

  const handleSalvarAvaliacao = (dados) => {
    if (!pacienteSelecionado) {
      alert("Por favor, selecione um paciente antes de salvar.");
      return;
    }
    // Lógica para salvar na subcoleção 'avaliacoes' do paciente no Firebase
    console.log("Vínculo do Paciente:", pacienteSelecionado);
    console.log("Dados da Escala:", dados);
    setEscalaAtiva(null);
    setPacienteSelecionado('');
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Centro de Avaliações</h1>
        <p className="text-slate-500 dark:text-slate-400">Selecione uma escala validada para aplicar ao paciente.</p>
      </header>

      {!escalaAtiva ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {escalasDisponiveis.map(escala => (
            <button
              key={escala.id}
              onClick={() => setEscalaAtiva(escala)}
              className="flex flex-col text-left p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all shadow-sm hover:shadow-md"
            >
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mb-4 text-indigo-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{escala.nome}</h3>
              <p className="text-sm text-slate-500 mt-1">{escala.descricao}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <button 
              onClick={() => setEscalaAtiva(null)}
              className="text-slate-600 hover:text-indigo-600 font-medium flex items-center gap-2"
            >
              ← Voltar ao Menu
            </button>
            
            <div className="flex items-center gap-4">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Paciente:</label>
              <select 
                value={pacienteSelecionado}
                onChange={(e) => setPacienteSelecionado(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm"
              >
                <option value="">Selecione o paciente...</option>
                {pacientes.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <EscalaRenderer 
            escalaData={escalaAtiva} 
            pacienteId={pacienteSelecionado} 
            onSalvar={handleSalvarAvaliacao} 
          />
        </div>
      )}
    </div>
  );
}