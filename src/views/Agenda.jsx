import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Plus, Trash2, X, ChevronLeft, ChevronRight,
  Layers, Edit3, Loader2, Copy, User, MapPin, Sparkles, FileText, Info, AlertCircle
} from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { resolverConflitoAgenda, analisarCapacidadePaciente } from '../services/geminiService';

const LOCAIS = ['Sala 701', 'Sala 702', 'Ginásio', 'Pilates', 'Prancha Ortostática', 'Domiciliar'];
const TIPOS = ['Atendimento', 'Avaliação', 'Reavaliação'];
const DIAS_NOMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// FUNÇÃO BLINDADA DE FUSO HORÁRIO
const obterDataLocalISO = (data) => {
  if (!(data instanceof Date) || isNaN(data)) data = new Date();
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

export default function Agenda({ user, hasAccess }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  
  const [mostrarForm, setMostrarForm] = useState(false);
  const [agendamentoEditando, setAgendamentoEditando] = useState(null);
  const [confirmacaoEdicao, setConfirmacaoEdicao] = useState(false);
  const [modalSoap, setModalSoap] = useState(null);
  
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [conflitoIA, setConflitoIA] = useState('');
  const [insightCapacidade, setInsightCapacidade] = useState('');
  const [textoSoap, setTextoSoap] = useState('');
  const [numeroSessaoAtual, setNumeroSessaoAtual] = useState(0);

  const [form, setForm] = useState({
    pacienteId: '', pacienteNome: '', tipo: 'Atendimento', local: '',
    data: obterDataLocalISO(new Date()), hora: '08:00', 
    profissionalId: '', profissionalNome: '', registroProf: ''
  });

  const [isLote, setIsLote] = useState(false);
  const [loteConfig, setLoteConfig] = useState({ quantidade: 10, diasSemana: [] });

  useEffect(() => {
    if (!user) return;
    const unsubAgenda = onSnapshot(query(collection(db, "agendamentos"), orderBy("hora", "asc")), snap => {
      setAgendamentos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubPac = onSnapshot(query(collection(db, "pacientes"), orderBy("nome", "asc")), snap => {
      setPacientes(snap.docs.map(d => ({ id: d.id, nome: d.data()?.nome || 'Paciente sem nome' })));
    });
    const unsubProf = onSnapshot(query(collection(db, "profissionais"), orderBy("nome", "asc")), snap => {
      setProfissionais(snap.docs.map(d => ({ 
        id: d.id, nome: d.data()?.nome || '', registro: d.data()?.registro || '', categoriaBase: d.data()?.categoriaBase || '' 
      })).filter(p => p.nome));
    });
    return () => { unsubAgenda(); unsubPac(); unsubProf(); };
  }, [user]);

  const mudarSemana = (dias) => {
    const nova = new Date(dataSelecionada);
    nova.setDate(nova.getDate() + dias);
    setDataSelecionada(nova);
  };

  const getDiasSemana = () => {
    const dArr = [];
    const inicio = new Date(dataSelecionada);
    inicio.setDate(inicio.getDate() - inicio.getDay()); 
    for (let i = 0; i < 7; i++) {
      dArr.push(new Date(inicio));
      inicio.setDate(inicio.getDate() + 1);
    }
    return dArr;
  };

  const verificarConflito = (d, h, pId, l) => {
    return agendamentos.find(a => 
      a.data === d && a.hora === h && a.status !== 'cancelado' &&
      (a.profissionalId === pId || (a.local === l && l !== 'Domiciliar' && l !== 'Ginásio'))
    );
  };

  const abrirFormEdicao = async (agend) => {
    setAgendamentoEditando(agend.id);
    setForm({
      pacienteId: agend.pacienteId || '', pacienteNome: agend.paciente || '', tipo: agend.tipo || 'Atendimento',
      data: agend.data || '', hora: agend.hora || '', local: agend.local || '',
      profissionalId: agend.profissionalId || '', profissionalNome: agend.profissional || '', registroProf: agend.registroProf || ''
    });
    setInsightCapacidade('Analisando histórico de evoluções do paciente com IA...');
    setMostrarForm(true);

    try {
      const q = query(collection(db, "pacientes", agend.pacienteId, "evolucoes"), orderBy("data", "desc"));
      const snap = await getDocs(q);
      if (snap.empty) {
        setInsightCapacidade('Paciente sem histórico de evoluções na base.');
      } else {
        const historico = snap.docs.map(d => d.data().texto).slice(0, 3);
        const analise = await analisarCapacidadePaciente(historico);
        setInsightCapacidade(analise);
      }
    } catch (e) { setInsightCapacidade('Agente IA indisponível no momento.'); }
  };

  const efetivarSalvamento = async (escopo = 'unico') => {
    setCarregandoIA(true);
    try {
      const ref = doc(db, "agendamentos", agendamentoEditando);
      await updateDoc(ref, { ...form, paciente: form.pacienteNome, profissional: form.profissionalNome });

      if (escopo !== 'unico') {
        const payload = { hora: form.hora, profissionalId: form.profissionalId, profissionalNome: form.profissionalNome, local: form.local };
        const alvos = agendamentos.filter(a => 
          a.pacienteId === form.pacienteId && a.id !== agendamentoEditando && a.status === 'pendente' &&
          (escopo === 'todos' ? true : a.data >= form.data)
        );
        await Promise.all(alvos.map(a => updateDoc(doc(db, "agendamentos", a.id), payload)));
      }
      setMostrarForm(false); setConfirmacaoEdicao(false);
      alert("Agenda atualizada!");
    } catch (e) { alert("Erro ao salvar."); }
    setCarregandoIA(false);
  };

  const salvarAction = async (e) => {
    e.preventDefault();
    if (!form.pacienteId || !form.profissionalId) return alert("Preencha Paciente e Profissional.");

    if (agendamentoEditando) {
      const outros = agendamentos.filter(a => a.pacienteId === form.pacienteId && a.id !== agendamentoEditando && a.status === 'pendente');
      if (outros.length > 0) setConfirmacaoEdicao(true);
      else efetivarSalvamento('unico');
    } else {
      setCarregandoIA(true);
      if (!isLote) {
         if (verificarConflito(form.data, form.hora, form.profissionalId, form.local)) {
           const sug = await resolverConflitoAgenda({ data: form.data, hora: form.hora, motivo: 'Conflito de Agenda' });
           setConflitoIA(sug); setCarregandoIA(false); return;
         }
         await addDoc(collection(db, "agendamentos"), { ...form, paciente: form.pacienteNome, profissional: form.profissionalNome, status: 'pendente' });
      } else {
         if(loteConfig.diasSemana.length === 0) { alert("Selecione os dias da semana."); setCarregandoIA(false); return; }
         let count = 0; let dt = new Date(form.data + 'T12:00:00');
         while (count < loteConfig.quantidade) {
            if (loteConfig.diasSemana.includes(dt.getDay())) {
               const dIso = obterDataLocalISO(dt);
               if (!verificarConflito(dIso, form.hora, form.profissionalId, form.local)) {
                  await addDoc(collection(db, "agendamentos"), { ...form, data: dIso, paciente: form.pacienteNome, profissional: form.profissionalNome, status: 'pendente', pacoteInfo: `${count+1}/${loteConfig.quantidade}` });
                  count++;
               }
            }
            dt.setDate(dt.getDate() + 1);
         }
      }
      setMostrarForm(false); setCarregandoIA(false); alert("Salvo com sucesso!");
    }
  };

  const abrirEvolucao = async (agendamento) => {
    setModalSoap(agendamento);
    setTextoSoap('');
    const snap = await getDocs(query(collection(db, "pacientes", agendamento.pacienteId, "evolucoes")));
    setNumeroSessaoAtual(snap.size + 1);
  };

  const salvarEvolucaoAgenda = async () => {
    if (!textoSoap) return;
    await addDoc(collection(db, "pacientes", modalSoap.pacienteId, "evolucoes"), { texto: textoSoap, data: new Date().toISOString(), profissional: user?.name, numeroSessao: numeroSessaoAtual });
    await updateDoc(doc(db, "agendamentos", modalSoap.id), { status: 'realizado' });
    setModalSoap(null);
    alert("Prontuário atualizado!");
  };

  const excluirAgendamento = async (id) => {
    if (window.confirm("Apagar permanentemente este agendamento?")) {
      await deleteDoc(doc(db, "agendamentos", id));
      setMostrarForm(false);
    }
  }

  const dias = getDiasSemana();
  const hoje = obterDataLocalISO(new Date());

  if (!user) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={40}/></div>;

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 flex items-center"><CalendarIcon className="mr-3 text-blue-600"/> Agenda Matriz</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">
            {dataSelecionada.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex bg-white border border-slate-200 rounded-2xl shadow-sm">
            <button onClick={() => mudarSemana(-7)} className="p-3 hover:bg-slate-50 border-r border-slate-200"><ChevronLeft size={20}/></button>
            <button onClick={() => setDataSelecionada(new Date())} className="px-6 font-black text-sm hover:bg-slate-50">Semana Atual</button>
            <button onClick={() => mudarSemana(7)} className="p-3 hover:bg-slate-50 border-l border-slate-200"><ChevronRight size={20}/></button>
          </div>
          <button onClick={() => { setAgendamentoEditando(null); setForm({...form, data: hoje}); setConflitoIA(''); setMostrarForm(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-blue-100 hover:scale-105 transition-all flex items-center gap-2">
            <Plus size={18}/> Novo Agendamento
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 flex-1 overflow-hidden flex flex-col shadow-sm">
        <div className="overflow-auto custom-scrollbar flex-1 relative">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-30 bg-slate-50/90 backdrop-blur-md">
              <tr>
                <th className="p-4 border-b border-r text-left w-64 sticky left-0 bg-slate-50 z-40">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Equipe Clínica</span>
                </th>
                {dias.map(dia => {
                  const iso = obterDataLocalISO(dia);
                  const isHoje = iso === hoje;
                  return (
                    <th key={iso} className={`p-4 border-b min-w-[220px] text-center ${isHoje ? 'bg-blue-50/80 border-b-2 border-b-blue-600' : ''}`}>
                      <div className={`text-[10px] font-black uppercase tracking-widest ${isHoje ? 'text-blue-600' : 'text-slate-400'}`}>{DIAS_NOMES[dia.getDay()]}</div>
                      <div className={`text-2xl font-black ${isHoje ? 'text-blue-700' : 'text-slate-800'}`}>{dia.getDate()}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {profissionais.map(prof => (
                <tr key={prof.id} className="group">
                  <td className="p-4 border-r border-b sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-20 shadow-[4px_0_12px_rgba(0,0,0,0.02)]">
                    <div className="font-black text-slate-900">{prof.nome}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{prof.categoriaBase}</div>
                  </td>
                  {dias.map(dia => {
                    const iso = obterDataLocalISO(dia);
                    const ags = agendamentos.filter(a => a.data === iso && a.profissionalId === prof.id);
                    return (
                      <td key={iso} className={`p-2 border-b border-r border-slate-100 align-top min-h-[120px] ${iso === hoje ? 'bg-blue-50/30' : ''}`}>
                        {ags.map(ag => (
                          <div key={ag.id} onClick={() => abrirFormEdicao(ag)} className={`p-3 mb-2 rounded-2xl border-2 cursor-pointer hover:-translate-y-1 transition-transform shadow-sm group/card ${ag.status === 'realizado' ? 'bg-green-50 border-green-200' : 'bg-white border-blue-100 hover:border-blue-400'}`}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[11px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">{ag.hora}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1"><MapPin size={10}/> {ag.local?.split(' ')[0]}</span>
                            </div>
                            <div className="font-black text-slate-800 text-xs truncate uppercase tracking-tight mt-1">{ag.paciente}</div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 font-bold">
                              <span className="flex items-center gap-1 italic"><User size={10} /> {prof.nome.split(' ')[0]}</span>
                              {ag.pacoteInfo && <span className="bg-purple-100 text-purple-700 px-1.5 rounded-md flex items-center gap-1" title="Lote"><Layers size={8}/> {ag.pacoteInfo}</span>}
                            </div>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-10 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-900">{agendamentoEditando ? 'Gerir Sessão' : 'Novo Agendamento'}</h3>
              <button onClick={() => setMostrarForm(false)} className="p-2 bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><X size={20}/></button>
            </div>

            {agendamentoEditando && (
              <>
                <div className="mb-6 p-6 bg-blue-600 rounded-[32px] text-white shadow-xl shadow-blue-100 relative overflow-hidden">
                  <Sparkles className="absolute right-4 top-4 opacity-20" size={48}/>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-2">Agente Clínico IA</h4>
                  <p className="font-bold text-sm leading-relaxed">{insightCapacidade}</p>
                </div>
                
                <div className="flex gap-3 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <button onClick={() => { setMostrarForm(false); abrirEvolucao(agendamentos.find(a=>a.id===agendamentoEditando)); }} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-black shadow-md hover:bg-green-700 flex justify-center items-center gap-2">
                    <FileText size={18}/> Iniciar Atendimento
                  </button>
                  <button onClick={async () => { await updateDoc(doc(db,"agendamentos",agendamentoEditando),{status:'cancelado'}); setMostrarForm(false); }} className="px-5 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 hover:text-amber-600 transition-colors" title="Falta/Cancelar">
                    <X size={20}/>
                  </button>
                  {/* SEGURANÇA: Somente gestores apagam agendamentos */}
                  {(user?.role === 'gestor_clinico' || hasAccess?.(['gestor_clinico'])) && (
                    <button onClick={() => excluirAgendamento(agendamentoEditando)} className="px-5 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors border border-red-100">
                      <Trash2 size={20}/>
                    </button>
                  )}
                </div>
              </>
            )}

            <form onSubmit={salvarAction} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Paciente</label>
                  <select required className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none font-bold text-slate-700" value={form.pacienteId} onChange={e => setForm({...form, pacienteId: e.target.value, pacienteNome: pacientes.find(p=>p.id===e.target.value)?.nome})}>
                    <option value="">Selecionar Paciente...</option>
                    {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Tipo</label>
                  <select className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none font-bold text-slate-700" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                    {TIPOS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Profissional</label>
                  <select required className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none font-bold text-slate-700" value={form.profissionalId} onChange={e => { const p = profissionais.find(x=>x.id===e.target.value); setForm({...form, profissionalId: p?.id, profissionalNome: p?.nome, registroProf: p?.registro}); }}>
                    <option value="">Agenda de...</option>
                    {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Sala/Local</label>
                  <select required className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none font-bold text-slate-700" value={form.local} onChange={e => setForm({...form, local: e.target.value})}>
                    <option value="">Selecione Local...</option>
                    {LOCAIS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                 {!agendamentoEditando && (
                   <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
                     <span className="font-black text-sm text-slate-800 flex items-center gap-2"><Layers size={18} className="text-blue-600"/> Agendar em Lote</span>
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={isLote} onChange={e => setIsLote(e.target.checked)} />
                        <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                     </label>
                   </div>
                 )}
                 <div className="grid grid-cols-2 gap-4">
                    <input type="date" className="p-4 rounded-xl border-2 outline-none focus:border-blue-500 font-bold text-slate-700" value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
                    <input type="time" className="p-4 rounded-xl border-2 outline-none focus:border-blue-500 font-bold text-slate-700" value={form.hora} onChange={e => setForm({...form, hora: e.target.value})} />
                 </div>
                 {isLote && (
                   <div className="mt-4 pt-4 animate-in fade-in">
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Dias da Semana</label>
                      <div className="flex gap-2 mb-4">
                        {[1,2,3,4,5].map(d => (
                          <button key={d} type="button" onClick={() => setLoteConfig(prev => ({ ...prev, diasSemana: prev.diasSemana.includes(d) ? prev.diasSemana.filter(x=>x!==d) : [...prev.diasSemana, d] }))} className={`flex-1 py-3 rounded-xl font-black text-xs border-2 transition-all ${loteConfig.diasSemana.includes(d) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
                            {DIAS_NOMES[d]}
                          </button>
                        ))}
                      </div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Quantidade de Sessões</label>
                      <input type="number" className="w-full p-4 rounded-xl border-2 outline-none focus:border-blue-500 font-bold text-slate-700" value={loteConfig.quantidade} onChange={e => setLoteConfig({...loteConfig, quantidade: parseInt(e.target.value)})}/>
                   </div>
                 )}
              </div>

              {conflitoIA && <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl text-amber-800 text-xs font-bold flex gap-2 items-center"><Info size={20} className="shrink-0"/> {conflitoIA}</div>}

              <button type="submit" disabled={carregandoIA} className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-lg shadow-xl hover:bg-black transition-all flex items-center justify-center">
                {carregandoIA ? <Loader2 className="animate-spin" /> : (agendamentoEditando ? 'Salvar Mudanças' : 'Agendar Paciente')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmação Lote */}
      {confirmacaoEdicao && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white p-10 rounded-[40px] w-full max-w-md shadow-2xl animate-in zoom-in-95">
             <h3 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-2"><Copy className="text-blue-600"/> Alterar Pacote?</h3>
             <p className="text-slate-500 font-medium mb-8">Onde você deseja aplicar a mudança de horário, profissional e sala para este paciente?</p>
             <div className="space-y-3">
                <button onClick={() => efetivarSalvamento('unico')} className="w-full p-5 rounded-2xl border-2 border-slate-200 hover:border-blue-500 font-black text-slate-700 hover:bg-blue-50 text-left transition-all">Apenas nesta sessão</button>
                <button onClick={() => efetivarSalvamento('futuros')} className="w-full p-5 rounded-2xl border-2 border-slate-200 hover:border-blue-500 font-black text-slate-700 hover:bg-blue-50 text-left transition-all">Nesta e nas próximas</button>
                <button onClick={() => efetivarSalvamento('todos')} className="w-full p-5 rounded-2xl border-2 border-slate-200 hover:border-blue-500 font-black text-slate-700 hover:bg-blue-50 text-left transition-all">Em todas as pendentes</button>
             </div>
             <button onClick={() => setConfirmacaoEdicao(false)} className="w-full mt-6 py-4 font-bold text-slate-400 hover:text-slate-600">Cancelar Alteração</button>
          </div>
        </div>
      )}

      {/* Modal Evolução */}
      {modalSoap && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white p-10 rounded-[40px] w-full max-w-2xl shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-slate-900 flex items-center"><FileText className="mr-3 text-blue-600"/> Assinar Evolução</h3>
                <button onClick={() => setModalSoap(null)} className="p-2 bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><X size={20}/></button>
             </div>
             
             {numeroSessaoAtual > 0 && numeroSessaoAtual % 10 === 0 && (
               <div className="mb-6 p-6 bg-red-600 text-white rounded-[24px] font-black flex items-center gap-4 animate-pulse shadow-lg">
                 <AlertCircle size={32}/> 
                 <div>
                   <h4 className="text-xl tracking-tight">Reavaliação Obrigatória</h4>
                   <p className="text-red-100 font-medium text-sm mt-1">Sessão nº {numeroSessaoAtual} atingida.</p>
                 </div>
               </div>
             )}
             
             <textarea className="w-full border-2 border-slate-200 p-6 rounded-3xl h-48 outline-none focus:border-blue-500 mb-6 font-medium text-slate-700 bg-slate-50" placeholder="Descreva tecnicamente o atendimento realizado..." value={textoSoap} onChange={e => setTextoSoap(e.target.value)} />
             <button onClick={salvarEvolucaoAgenda} className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black text-lg shadow-xl hover:bg-blue-700 transition-colors">Finalizar e Guardar no Prontuário</button>
          </div>
        </div>
      )}
    </div>
  );
}