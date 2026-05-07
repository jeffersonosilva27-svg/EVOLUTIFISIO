import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, X, ChevronLeft, Award, Smartphone, CreditCard,
  Trash2, Edit3, Landmark, Sparkles, ChevronRight, MessageCircle,
  TrendingDown, FileText, Loader2, CalendarClock, Target, ShieldAlert, 
  Package, ShoppingCart, CheckCircle2, Layers, Dumbbell, Users, CornerDownRight, 
  Lightbulb, FileDown, Building2, LayoutGrid, List, BarChart3, ClipboardCheck
} from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, where, writeBatch, getDocs } from 'firebase/firestore';

// Componentes e Escalas
import EscalaRenderer from '../components/Avaliacoes/EscalaRenderer';
import { escalaBerg } from '../data/escalas/berg';
import { escalaBarthel } from '../data/escalas/barthel';
import { escalaTUG } from '../data/escalas/tug';
import { escalaFMA } from '../data/escalas/fuglMeyer';
import { escalaSCIM } from '../data/escalas/scim';
import { escalaWISCI } from '../data/escalas/wisci';
import { escalaMAS } from '../data/escalas/ashworth';

// --- SUBCOMPONENTE DASHBOARD (Interno para evitar erro de import) ---
const DashboardInterno = ({ pacienteId }) => {
  const [avaliacoes, setAvaliacoes] = useState([]);

  useEffect(() => {
    if (!pacienteId) return;
    const q = query(collection(db, "pacientes", pacienteId, "avaliacoes"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => {
      setAvaliacoes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [pacienteId]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {avaliacoes.slice(0, 3).map((av, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-indigo-500 uppercase">{av.escalaId}</p>
            <h4 className="text-2xl font-black text-slate-800 dark:text-white mt-1">
              {av.scoreTotal} <span className="text-xs text-slate-400">pts</span>
            </h4>
            <p className="text-[10px] text-slate-500 font-bold mt-2">{new Date(av.timestamp).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
      
      {avaliacoes.length === 0 && (
        <div className="p-10 border-2 border-dashed border-slate-200 rounded-[32px] text-center text-slate-400">
           Nenhuma escala aplicada recentemente.
        </div>
      )}
    </div>
  );
};

const GRUPOS_MUSCULARES = [
  'Cervical', 'Ombros / Manguito', 'Dorsal / Escápulas', 'Peitoral', 
  'Core / Abdômen', 'Lombar', 'Pelve / Quadril', 'Coxas / Isquiotibiais', 
  'Joelhos', 'Panturrilhas / Tornozelos', 'Membros Superiores (Geral)',
  'Respiratório / TMI', 'Funcionais', 'Recursos Terapêuticos'
];

const obterDataLocalISO = (data) => {
  const d = data instanceof Date ? data : new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export default function Pacientes({ pacientes, hasAccess, user, navParams }) {
  const [termoBusca, setTermoBusca] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [tabAtiva, setTabAtiva] = useState('historico'); 
  const [escalaAtiva, setEscalaAtiva] = useState(null);
  const [evolucoes, setEvolucoes] = useState([]);
  const [novoSoap, setNovoSoap] = useState('');
  const [metricaPain, setMetricaPain] = useState(0);
  const [dataEvolucao, setDataEvolucao] = useState(obterDataLocalISO(new Date()));
  const [horaEvolucao, setHoraEvolucao] = useState(new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}));
  
  const escalasDisponiveis = [escalaBerg, escalaBarthel, escalaTUG, escalaFMA, escalaSCIM, escalaWISCI, escalaMAS];

  // Carregar dados ao selecionar paciente
  useEffect(() => {
    if (pacienteSelecionado) {
      const qEvo = query(collection(db, "pacientes", pacienteSelecionado.id, "evolucoes"), orderBy("data", "desc"));
      return onSnapshot(qEvo, (snap) => setEvolucoes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    }
  }, [pacienteSelecionado]);

  const handleSalvarEscala = async (dados) => {
    await addDoc(collection(db, "pacientes", pacienteSelecionado.id, "avaliacoes"), {
      ...dados,
      profissional: user.nome || 'Profissional',
      timestamp: new Date().toISOString()
    });
    setEscalaAtiva(null);
    alert("Avaliação salva!");
  };

  const salvarEvolucao = async () => {
    if (!novoSoap) return;
    const dataFinalISO = new Date(`${dataEvolucao}T${horaEvolucao}:00`).toISOString();
    await addDoc(collection(db, "pacientes", pacienteSelecionado.id, "evolucoes"), {
      texto: novoSoap,
      data: dataFinalISO,
      profissional: `${user.nome} (CREFITO: ${user.registro || 'N/A'})`,
      profissionalId: user.id,
      metricaPain
    });
    setNovoSoap('');
    alert("Prontuário assinado!");
  };

  const filtrados = (pacientes || []).filter(p => p.nome?.toLowerCase().includes(termoBusca.toLowerCase()));

  return (
    <div className="space-y-6 pb-20">
      {pacienteSelecionado ? (
        <div className="animate-in slide-in-from-right-4 duration-300">
          <header className="flex items-center gap-4 mb-6">
            <button onClick={() => {setPacienteSelecionado(null); setEscalaAtiva(null);}} className="p-2 hover:bg-slate-100 rounded-full">
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-2xl font-black text-[#0F214A]">{pacienteSelecionado.nome}</h2>
          </header>

          <div className="flex border-b border-slate-200 mb-6 overflow-x-auto hide-scrollbar">
            {['dashboard', 'historico', 'plano'].map(aba => (
              <button key={aba} onClick={() => {setTabAtiva(aba); setEscalaAtiva(null);}} className={`px-6 py-4 text-sm font-bold capitalize transition-all border-b-2 ${tabAtiva === aba ? 'border-[#00A1FF] text-[#00A1FF]' : 'border-transparent text-slate-400'}`}>
                {aba}
              </button>
            ))}
          </div>

          {tabAtiva === 'dashboard' && (
            <div className="space-y-6">
              {!escalaAtiva ? (
                <>
                  <DashboardInterno pacienteId={pacienteSelecionado.id} />
                  <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                    <h3 className="font-black mb-6 flex items-center gap-2"><ClipboardCheck className="text-[#00A1FF]"/> Aplicar Escala</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {escalasDisponiveis.map(escala => (
                        <button key={escala.id} onClick={() => setEscalaAtiva(escala)} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-[#00A1FF] transition-all text-left">
                          <h4 className="font-black text-sm">{escala.nome}</h4>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white p-6 rounded-[32px] shadow-sm">
                   <button onClick={() => setEscalaAtiva(null)} className="mb-6 text-sm font-bold text-slate-400 flex items-center gap-1">← Voltar</button>
                   <EscalaRenderer escalaData={escalaAtiva} pacienteId={pacienteSelecionado.id} onSalvar={handleSalvarEscala} />
                </div>
              )}
            </div>
          )}

          {tabAtiva === 'historico' && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-8 rounded-[32px] border border-blue-100">
                <h3 className="font-black mb-4">Nova Evolução (SOAPER)</h3>
                <textarea className="w-full p-4 rounded-2xl border-none outline-none h-40 mb-4 shadow-inner" placeholder="Evolução do dia..." value={novoSoap} onChange={e => setNovoSoap(e.target.value)} />
                <button onClick={salvarEvolucao} className="bg-[#00A1FF] text-white px-8 py-3 rounded-xl font-black">Assinar</button>
              </div>
              {evolucoes.map(evo => (
                <div key={evo.id} className="bg-white p-6 rounded-[24px] border border-slate-100">
                  <p className="text-slate-700 whitespace-pre-wrap">{evo.texto}</p>
                  <div className="mt-4 pt-4 border-t border-slate-50 text-[10px] font-bold text-slate-400">
                    {new Date(evo.data).toLocaleDateString()} - {evo.profissional}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <header className="flex justify-between items-end">
             <h1 className="text-4xl font-black text-[#0F214A]">Pacientes</h1>
             <button className="bg-[#00A1FF] text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2"><Plus size={20}/> Novo</button>
          </header>
          <div className="bg-white p-4 rounded-[24px] border border-slate-200 flex items-center">
            <Search className="text-slate-300 mr-2" />
            <input placeholder="Buscar..." className="flex-1 outline-none font-bold" value={termoBusca} onChange={e => setTermoBusca(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtrados.map(p => (
              <div key={p.id} onClick={() => setPacienteSelecionado(p)} className="bg-white p-6 rounded-[24px] border border-slate-200 hover:border-[#00A1FF] transition-all cursor-pointer group">
                <h3 className="font-black text-lg group-hover:text-[#00A1FF]">{p.nome}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">CPF: {p.cpf}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}