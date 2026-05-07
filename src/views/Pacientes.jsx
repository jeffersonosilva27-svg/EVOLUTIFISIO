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

// --- SUBCOMPONENTE DASHBOARD ---
const DashboardInterno = ({ pacienteId }) => {
  const [avaliacoes, setAvaliacoes] = useState([]);
  useEffect(() => {
    if (!pacienteId) return;
    const q = query(collection(db, "pacientes", pacienteId, "avaliacoes"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => setAvaliacoes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [pacienteId]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {avaliacoes.slice(0, 3).map((av, i) => (
          <div key={i} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-indigo-500 uppercase">{av.escalaId}</p>
            <h4 className="text-2xl font-black text-slate-800 mt-1">{av.scoreTotal} <span className="text-xs text-slate-400">pts</span></h4>
            <p className="text-[10px] text-slate-500 font-bold mt-2">{new Date(av.timestamp).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
      {avaliacoes.length === 0 && <div className="p-10 border-2 border-dashed border-slate-200 rounded-[32px] text-center text-slate-400">Nenhuma escala aplicada.</div>}
    </div>
  );
};

const GRUPOS_MUSCULARES = ['Cervical', 'Ombros / Manguito', 'Dorsal / Escápulas', 'Peitoral', 'Core / Abdômen', 'Lombar', 'Pelve / Quadril', 'Coxas / Isquiotibiais', 'Joelhos', 'Panturrilhas / Tornozelos', 'Funcionais', 'Recursos Terapêuticos'];

const obterDataLocalISO = (data) => {
  const d = data instanceof Date ? data : new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export default function Pacientes({ pacientes, hasAccess, user }) {
  const [termoBusca, setTermoBusca] = useState('');
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [tabAtiva, setTabAtiva] = useState('historico'); 
  const [escalaAtiva, setEscalaAtiva] = useState(null);
  
  // Estados de Dados
  const [evolucoes, setEvolucoes] = useState([]);
  const [planoTratamento, setPlanoTratamento] = useState([]);
  const [bancoExerciciosGlobais, setBancoExerciciosGlobais] = useState([]);
  const [agendamentosFuturos, setAgendamentosFuturos] = useState([]);
  
  // Estados de Formulário
  const [novoSoap, setNovoSoap] = useState('');
  const [metricaPain, setMetricaPain] = useState(0);
  const [dataEvolucao, setDataEvolucao] = useState(obterDataLocalISO(new Date()));
  const [horaEvolucao, setHoraEvolucao] = useState(new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}));
  const [novoExercicio, setNovoExercicio] = useState({ musculo: '', nome: '', carga: '', series: '3', reps: '10' });
  const [sessaoModulacaoId, setSessaoModulacaoId] = useState('');
  const [exerciciosSessao, setExerciciosSessao] = useState([]);

  const escalasDisponiveis = [escalaBerg, escalaBarthel, escalaTUG, escalaFMA, escalaSCIM, escalaWISCI, escalaMAS];

  // Monitoramento Firebase Global
  useEffect(() => {
    const unsubBanco = onSnapshot(collection(db, "banco_exercicios"), (snap) => setBancoExerciciosGlobais(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsubBanco();
  }, []);

  // Monitoramento Firebase Específico do Paciente
  useEffect(() => {
    if (pacienteSelecionado) {
      const qEvo = query(collection(db, "pacientes", pacienteSelecionado.id, "evolucoes"), orderBy("data", "desc"));
      const unsubEvo = onSnapshot(qEvo, (snap) => setEvolucoes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
      
      const qPlano = query(collection(db, "pacientes", pacienteSelecionado.id, "plano_tratamento"));
      const unsubPlano = onSnapshot(qPlano, (snap) => setPlanoTratamento(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

      const qAg = query(collection(db, "agendamentos"), where("pacienteId", "==", pacienteSelecionado.id));
      const unsubAg = onSnapshot(qAg, (snap) => {
        const ags = snap.docs.map(d => ({id: d.id, ...d.data()})).filter(a => a.status !== 'realizado').sort((a,b) => new Date(a.data) - new Date(b.data));
        setAgendamentosFuturos(ags);
      });

      return () => { unsubEvo(); unsubPlano(); unsubAg(); };
    }
  }, [pacienteSelecionado]);

  // Funções de Plano e Exercícios
  const adicionarExercicio = async (e) => {
    e.preventDefault();
    const nomeNorm = novoExercicio.nome.trim().toLowerCase();
    const existeNoBanco = bancoExerciciosGlobais.some(ex => ex.nome.toLowerCase() === nomeNorm);
    if (!existeNoBanco) await addDoc(collection(db, "banco_exercicios"), { nome: novoExercicio.nome, categoria: novoExercicio.musculo });
    await addDoc(collection(db, "pacientes", pacienteSelecionado.id, "plano_tratamento"), { ...novoExercicio, dataInclusao: new Date().toISOString() });
    setNovoExercicio({ musculo: '', nome: '', carga: '', series: '3', reps: '10' });
  };

  const handleSelectModulacao = (id) => {
    setSessaoModulacaoId(id);
    const ag = agendamentosFuturos.find(a => a.id === id);
    setExerciciosSessao(ag?.exerciciosPlanejados || []);
  };

  const toggleExercicioSessao = (ex) => {
    setExerciciosSessao(prev => prev.some(e => e.id === ex.id) ? prev.filter(e => e.id !== ex.id) : [...prev, ex]);
  };

  const salvarModulacaoSessao = async () => {
    await updateDoc(doc(db, "agendamentos", sessaoModulacaoId), { exerciciosPlanejados: exerciciosSessao });
    alert("Sessão modulada!");
  };

  const puxarCondutaParaEvolucao = (ag) => {
    const texto = ag.exerciciosPlanejados.map(ex => `• ${ex.nome} (${ex.series}x${ex.reps} ${ex.carga ? `- ${ex.carga}` : ''})`).join('\n');
    setNovoSoap(prev => prev + "\n\nCONDUTA REALIZADA:\n" + texto);
  };

  const salvarEvolucao = async () => {
    if (!novoSoap) return;
    const dataFinalISO = new Date(`${dataEvolucao}T${horaEvolucao}:00`).toISOString();
    await addDoc(collection(db, "pacientes", pacienteSelecionado.id, "evolucoes"), {
      texto: novoSoap, data: dataFinalISO, profissional: `${user.nome} (CREFITO: ${user.registro || 'N/A'})`, metricaPain
    });
    setNovoSoap('');
  };

  const filtrados = (pacientes || []).filter(p => p.nome?.toLowerCase().includes(termoBusca.toLowerCase()));

  return (
    <div className="space-y-6 pb-20">
      {pacienteSelecionado ? (
        <div className="animate-in slide-in-from-right-4 duration-300">
          <header className="flex items-center gap-4 mb-6">
            <button onClick={() => {setPacienteSelecionado(null); setEscalaAtiva(null);}} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft size={24} /></button>
            <h2 className="text-2xl font-black text-[#0F214A]">{pacienteSelecionado.nome}</h2>
          </header>

          <div className="flex border-b border-slate-200 mb-6 overflow-x-auto hide-scrollbar">
            {['dashboard', 'historico', 'plano'].map(aba => (
              <button key={aba} onClick={() => {setTabAtiva(aba); setEscalaAtiva(null);}} className={`px-6 py-4 text-sm font-bold capitalize transition-all border-b-2 ${tabAtiva === aba ? 'border-[#00A1FF] text-[#00A1FF]' : 'border-transparent text-slate-400'}`}>{aba}</button>
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
                   <EscalaRenderer escalaData={escalaAtiva} pacienteId={pacienteSelecionado.id} onSalvar={() => setEscalaAtiva(null)} />
                </div>
              )}
            </div>
          )}

          {tabAtiva === 'historico' && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-8 rounded-[32px] border border-blue-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black">Nova Evolução (SOAPER)</h3>
                  {agendamentosFuturos.find(a => a.exerciciosPlanejados?.length > 0) && (
                    <button onClick={() => puxarCondutaParaEvolucao(agendamentosFuturos.find(a => a.exerciciosPlanejados?.length > 0))} className="text-[10px] bg-[#0F214A] text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-2">
                      <CornerDownRight size={12}/> Puxar Conduta Modulada
                    </button>
                  )}
                </div>
                <textarea className="w-full p-4 rounded-2xl border-none outline-none h-40 mb-4 shadow-inner text-sm" placeholder="S: ... O: ... A: ... P: ..." value={novoSoap} onChange={e => setNovoSoap(e.target.value)} />
                <button onClick={salvarEvolucao} className="bg-[#00A1FF] text-white px-8 py-3 rounded-xl font-black">Assinar Prontuário</button>
              </div>
              {evolucoes.map(evo => (
                <div key={evo.id} className="bg-white p-6 rounded-[24px] border border-slate-100"><p className="text-slate-700 text-sm whitespace-pre-wrap">{evo.texto}</p>
                <div className="mt-4 pt-4 border-t border-slate-50 text-[10px] font-bold text-slate-400">{new Date(evo.data).toLocaleDateString()} - {evo.profissional}</div></div>
              ))}
            </div>
          )}

          {tabAtiva === 'plano' && (
            <div className="space-y-6">
              {/* MODULAÇÃO DE SESSÃO */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-[32px] border border-blue-100">
                <h3 className="font-black text-[#0F214A] flex items-center gap-2 mb-6"><Layers size={20}/> Planejar Sessão Específica</h3>
                <select className="w-full p-4 bg-white border border-blue-200 rounded-2xl font-bold text-sm mb-4" value={sessaoModulacaoId} onChange={(e) => handleSelectModulacao(e.target.value)}>
                  <option value="">Selecione um agendamento...</option>
                  {agendamentosFuturos.map(ag => <option key={ag.id} value={ag.id}>{new Date(ag.data).toLocaleDateString()} - {ag.hora}</option>)}
                </select>
                {sessaoModulacaoId && (
                  <div className="animate-in fade-in space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {planoTratamento.map(ex => (
                        <button key={ex.id} onClick={() => toggleExercicioSessao(ex)} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${exerciciosSessao.some(e => e.id === ex.id) ? 'bg-[#0F214A] text-white' : 'bg-white text-slate-600'}`}>{ex.nome}</button>
                      ))}
                    </div>
                    <button onClick={salvarModulacaoSessao} className="bg-[#00A1FF] text-white px-6 py-2 rounded-xl font-black text-xs">Salvar Modulação</button>
                  </div>
                )}
              </div>

              {/* BANCO E PRESCRIÇÃO */}
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                <h3 className="font-black mb-6">Prescrição Master</h3>
                <form onSubmit={adicionarExercicio} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <select className="p-3 bg-slate-50 rounded-xl font-bold text-sm" value={novoExercicio.musculo} onChange={e => setNovoExercicio({...novoExercicio, musculo: e.target.value})} required>
                    <option value="">Grupo...</option>
                    {GRUPOS_MUSCULARES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <input list="exercicios-globais" className="p-3 bg-slate-50 rounded-xl font-bold text-sm md:col-span-2" placeholder="Nome do Exercício..." value={novoExercicio.nome} onChange={e => setNovoExercicio({...novoExercicio, nome: e.target.value})} required />
                  <datalist id="exercicios-globais">{bancoExerciciosGlobais.map(ex => <option key={ex.id} value={ex.nome}/>)}</datalist>
                  <input className="p-3 bg-slate-50 rounded-xl text-sm" placeholder="Carga" value={novoExercicio.carga} onChange={e => setNovoExercicio({...novoExercicio, carga: e.target.value})} />
                  <input className="p-3 bg-slate-50 rounded-xl text-sm" placeholder="Séries" value={novoExercicio.series} onChange={e => setNovoExercicio({...novoExercicio, series: e.target.value})} />
                  <input className="p-3 bg-slate-50 rounded-xl text-sm" placeholder="Reps" value={novoExercicio.reps} onChange={e => setNovoExercicio({...novoExercicio, reps: e.target.value})} />
                  <button type="submit" className="bg-[#0F214A] text-white rounded-xl font-black md:col-span-3 py-3">Adicionar ao Plano</button>
                </form>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {planoTratamento.map(ex => (
                    <div key={ex.id} className="p-4 border border-slate-100 rounded-2xl flex justify-between items-center">
                      <div><p className="text-[10px] font-black text-indigo-500 uppercase">{ex.musculo}</p><h4 className="font-bold text-sm">{ex.nome}</h4><p className="text-[10px] text-slate-400">{ex.series}x{ex.reps} {ex.carga}</p></div>
                      <button onClick={async () => await deleteDoc(doc(db, "pacientes", pacienteSelecionado.id, "plano_tratamento", ex.id))} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <header className="flex justify-between items-end"><h1 className="text-4xl font-black text-[#0F214A]">Pacientes</h1><button className="bg-[#00A1FF] text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2"><Plus size={20}/> Novo</button></header>
          <div className="bg-white p-4 rounded-[24px] border border-slate-200 flex items-center"><Search className="text-slate-300 mr-2" /><input placeholder="Buscar..." className="flex-1 outline-none font-bold" value={termoBusca} onChange={e => setTermoBusca(e.target.value)} /></div>
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