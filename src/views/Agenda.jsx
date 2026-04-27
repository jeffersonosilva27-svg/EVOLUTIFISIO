import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Plus, Trash2, X, ChevronLeft, ChevronRight,
  Layers, Loader2, Copy, User, MapPin, Sparkles, FileText, AlertTriangle
} from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { analisarCapacidadePaciente } from '../services/geminiService';

const LOCAIS = ['Sala 701', 'Sala 702', 'Ginásio Clínico', 'Studio Pilates', 'Prancha Ortostática', 'Atendimento Domiciliar'];
const DIAS_NOMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const getInfoData = (data) => {
  const d = new Date(data);
  const mes = d.toLocaleDateString('pt-BR', { month: 'long' });
  const dia = d.getDate();
  const semanaDoMes = Math.ceil((dia + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7);
  return { mes: mes.charAt(0).toUpperCase() + mes.slice(1), semana: semanaDoMes };
};

const obterDataLocalISO = (data) => {
  const d = data instanceof Date ? data : new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const getMinutos = (horaStr) => {
  if (!horaStr) return 0;
  const p = horaStr.split(':');
  return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
};

export default function Agenda({ user, hasAccess, navegarPara }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [mostrarForm, setMostrarForm] = useState(false);
  const [agendamentoEditando, setAgendamentoEditando] = useState(null);
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [insightCapacidade, setInsightCapacidade] = useState('');
  const [form, setForm] = useState({ pacienteId: '', pacienteNome: '', tipo: 'Atendimento', local: '', data: obterDataLocalISO(new Date()), hora: '08:00', profissionalId: '', profissionalNome: '' });
  const [isLote, setIsLote] = useState(false);
  const [loteConfig, setLoteConfig] = useState({ quantidade: 10, diasSemana: [] });
  const [modalEscopo, setModalEscopo] = useState({ open: false, type: '' });
  const [filaConflitos, setFilaConflitos] = useState([]);
  const [agendamentosBons, setAgendamentosBons] = useState([]);
  const [idxConflito, setIdxConflito] = useState(0);
  const [dualExistente, setDualExistente] = useState(null);
  const [dualNovo, setDualNovo] = useState(null);

  useEffect(() => {
    if (!user) return;
    const unsubAgenda = onSnapshot(collection(db, "agendamentos"), snap => setAgendamentos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubPac = onSnapshot(collection(db, "pacientes"), snap => setPacientes(snap.docs.map(d => ({ id: d.id, nome: d.data()?.nome || 'Paciente sem nome' }))));
    const unsubProf = onSnapshot(collection(db, "profissionais"), snap => {
      // ORDENAÇÃO: Usuário logado sempre no topo!
      const profs = snap.docs.map(d => ({ id: d.id, nome: d.data()?.nome || '', categoriaBase: d.data()?.categoriaBase || '' })).filter(p => p.nome);
      profs.sort((a, b) => {
         if (a.id === user.id) return -1;
         if (b.id === user.id) return 1;
         return a.nome.localeCompare(b.nome);
      });
      setProfissionais(profs);
    });
    return () => { unsubAgenda(); unsubPac(); unsubProf(); };
  }, [user]);

  const getNumeroSessao = (ag) => {
    const sessoesPaciente = agendamentos.filter(s => s.pacienteId === ag.pacienteId && s.status !== 'cancelado').sort((a, b) => getMinutos(a.hora) - getMinutos(b.hora));
    return sessoesPaciente.findIndex(s => s.id === ag.id) + 1;
  };

  const verificarConflito = (d, h, pId, l, idIgnorar = null) => {
    return agendamentos.find(a => a.id !== idIgnorar && a.data === d && a.hora === h && a.status !== 'cancelado' && (a.profissionalId === pId || (a.local === l && l !== 'Atendimento Domiciliar' && l !== 'Ginásio Clínico')));
  };

  const abrirFormEdicao = async (agend) => {
    setAgendamentoEditando(agend.id);
    setForm({ pacienteId: agend.pacienteId || '', pacienteNome: agend.paciente || '', tipo: agend.tipo || 'Atendimento', data: agend.data || '', hora: agend.hora || '', local: agend.local || '', profissionalId: agend.profissionalId || '', profissionalNome: agend.profissional || '' });
    setMostrarForm(true);
    try { const analise = await analisarCapacidadePaciente([]); setInsightCapacidade(analise || "Sem histórico."); } catch (e) { setInsightCapacidade("IA Indisponível."); }
  };

  const tentarSalvar = (e) => {
    e.preventDefault();
    if (agendamentoEditando) {
      const pendentes = agendamentos.filter(a => a.pacienteId === form.pacienteId && a.id !== agendamentoEditando && (!a.status || a.status === 'pendente'));
      if (pendentes.length > 0) setModalEscopo({ open: true, type: 'edit' });
      else aplicarEdicao('unico');
    } else { processarNovoAgendamento(); }
  };

  const tentarExcluir = (e) => {
    e.preventDefault();
    const pendentes = agendamentos.filter(a => a.pacienteId === form.pacienteId && a.id !== agendamentoEditando && (!a.status || a.status === 'pendente'));
    if (pendentes.length > 0) { setModalEscopo({ open: true, type: 'delete' }); } 
    else { if(window.confirm("Apagar agendamento?")) { aplicarExclusao('unico'); } }
  };

  const aplicarExclusao = async (escopo) => {
    setModalEscopo({ open: false, type: '' }); setCarregandoIA(true);
    const refAtual = agendamentos.find(a => a.id === agendamentoEditando); let alvos = [refAtual];
    if (escopo !== 'unico') {
       const pendentes = agendamentos.filter(a => a.pacienteId === form.pacienteId && a.id !== agendamentoEditando && (!a.status || a.status === 'pendente'));
       if (escopo === 'futuros') alvos = [...alvos, ...pendentes.filter(a => a.data >= refAtual.data)];
       else if (escopo === 'todos') alvos = [...alvos, ...pendentes];
    }
    await Promise.all(alvos.map(a => deleteDoc(doc(db, "agendamentos", a.id))));
    alert(`${alvos.length} sessão(ões) excluída(s).`); setMostrarForm(false); setCarregandoIA(false);
  };

  const aplicarEdicao = async (escopo) => {
    setModalEscopo({ open: false, type: '' }); setCarregandoIA(true);
    const refAtual = agendamentos.find(a => a.id === agendamentoEditando); let alvos = [refAtual];
    if (escopo !== 'unico') {
       const pendentes = agendamentos.filter(a => a.pacienteId === form.pacienteId && a.id !== agendamentoEditando && (!a.status || a.status === 'pendente'));
       if (escopo === 'futuros') alvos = [...alvos, ...pendentes.filter(a => a.data >= refAtual.data)];
       else if (escopo === 'todos') alvos = [...alvos, ...pendentes];
    }
    let novosBons = []; let novosConflitos = [];
    for (let alvo of alvos) {
        const isAtual = alvo.id === agendamentoEditando; const novaData = isAtual ? form.data : alvo.data; 
        const agNovo = { ...alvo, data: novaData, hora: form.hora, profissionalId: form.profissionalId, profissionalNome: form.profissionalNome, local: form.local, paciente: form.pacienteNome, isEdit: true, originalId: alvo.id };
        const conflito = verificarConflito(agNovo.data, agNovo.hora, agNovo.profissionalId, agNovo.local, alvo.id);
        if (conflito) novosConflitos.push({ novo: agNovo, existente: conflito }); else novosBons.push(agNovo);
    }
    if (novosConflitos.length > 0) { setAgendamentosBons(novosBons); setFilaConflitos(novosConflitos); setIdxConflito(0); setMostrarForm(false); } 
    else { await Promise.all(novosBons.map(ag => { const { originalId, isEdit, ...rest } = ag; return updateDoc(doc(db, "agendamentos", originalId), rest); })); setMostrarForm(false); }
    setCarregandoIA(false);
  };

  const processarNovoAgendamento = async () => {
      setCarregandoIA(true); let novosBons = []; let novosConflitos = [];
      if (!isLote) {
         const conflito = verificarConflito(form.data, form.hora, form.profissionalId, form.local);
         if (conflito) novosConflitos.push({ novo: { ...form }, existente: conflito }); else novosBons.push({ ...form });
      } else {
         const [ano, mes, diaSplit] = form.data.split('-'); let dt = new Date(ano, mes - 1, diaSplit, 12, 0, 0); let sessoesProcessadas = 0; 
         while (sessoesProcessadas < loteConfig.quantidade) {
            if (loteConfig.diasSemana.includes(dt.getDay())) {
               const dIso = obterDataLocalISO(dt); const agNovo = { ...form, data: dIso, pacoteInfo: `${sessoesProcessadas+1}/${loteConfig.quantidade}` };
               const conflito = verificarConflito(dIso, form.hora, form.profissionalId, form.local);
               if (conflito) novosConflitos.push({ novo: agNovo, existente: conflito }); else novosBons.push(agNovo); sessoesProcessadas++; 
            }
            dt.setDate(dt.getDate() + 1); 
         }
      }
      if (novosConflitos.length > 0) { setAgendamentosBons(novosBons); setFilaConflitos(novosConflitos); setIdxConflito(0); setMostrarForm(false); } 
      else { await Promise.all(novosBons.map(ag => addDoc(collection(db, "agendamentos"), { ...ag, paciente: ag.pacienteNome, profissional: ag.profissionalNome, status: 'pendente' }))); setMostrarForm(false); }
      setCarregandoIA(false);
  };

  const resolverConflito = async (acao) => {
    setCarregandoIA(true);
    if (acao === 'salvar') {
        if (dualExistente && dualExistente.id) { await updateDoc(doc(db, "agendamentos", dualExistente.id), { data: dualExistente.data, hora: dualExistente.hora, profissionalId: dualExistente.profissionalId, local: dualExistente.local }); }
        setAgendamentosBons(prev => [...prev, dualNovo]);
    }
    const prox = idxConflito + 1;
    if (prox < filaConflitos.length) { setIdxConflito(prox); } 
    else {
        await Promise.all(agendamentosBons.map(ag => {
            if (ag.isEdit) { const { originalId, isEdit, ...rest } = ag; return updateDoc(doc(db, "agendamentos", originalId), rest); } 
            else { return addDoc(collection(db, "agendamentos"), { ...ag, paciente: ag.pacienteNome || ag.paciente, profissional: ag.profissionalNome || ag.profissional, status: 'pendente' }); }
        }));
        alert("Resolução concluída!"); setFilaConflitos([]); setAgendamentosBons([]);
    }
    setCarregandoIA(false);
  };

  const dias = (() => { const dArr = []; const inicio = new Date(dataSelecionada); inicio.setDate(inicio.getDate() - inicio.getDay()); for (let i = 0; i < 7; i++) { dArr.push(new Date(inicio)); inicio.setDate(inicio.getDate() + 1); } return dArr; })();
  const infoData = getInfoData(dataSelecionada); const hoje = obterDataLocalISO(new Date());

  if (!user) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#00A1FF]" size={40}/></div>;

  return (
    <div className="flex flex-col h-full space-y-4 animate-in fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black text-slate-900 uppercase">{infoData.mes}</h2>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-[10px] font-black uppercase">Semana {infoData.semana}</span>
        </div>
        <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl">
          <button onClick={() => { const d = new Date(dataSelecionada); d.setDate(d.getDate()-7); setDataSelecionada(d); }} className="p-2"><ChevronLeft size={18}/></button>
          <button onClick={() => setDataSelecionada(new Date())} className="px-5 py-2 font-black text-[11px] uppercase">Hoje</button>
          <button onClick={() => { const d = new Date(dataSelecionada); d.setDate(d.getDate()+7); setDataSelecionada(d); }} className="p-2"><ChevronRight size={18}/></button>
        </div>
        <button onClick={() => { setAgendamentoEditando(null); setForm({...form, data: hoje}); setIsLote(false); setMostrarForm(true); }} className="bg-[#00A1FF] text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 text-sm"><Plus size={18}/> Novo Agendamento</button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 flex-1 overflow-hidden flex flex-col shadow-sm">
        <div className="overflow-auto flex-1 relative">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md">
              <tr>
                <th className="p-3 border-b border-r text-left min-w-[140px] sticky left-0 bg-slate-50 z-40"><span className="text-[10px] font-black text-slate-400">Equipe</span></th>
                {dias.map(dia => {
                  const iso = obterDataLocalISO(dia);
                  return (
                    <th key={iso} className={`p-2 border-b min-w-[150px] text-center ${iso === hoje ? 'bg-blue-50/80 border-b-4 border-b-[#00A1FF]' : ''}`}>
                      <div className={`text-[9px] font-black uppercase ${iso === hoje ? 'text-[#00A1FF]' : 'text-slate-400'}`}>{DIAS_NOMES[dia.getDay()]}</div>
                      <div className={`text-lg font-black ${iso === hoje ? 'text-[#0F214A]' : 'text-slate-800'}`}>{dia.getDate()}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {profissionais.map(prof => (
                <tr key={prof.id} className={prof.id === user.id ? 'bg-blue-50/30' : ''}>
                  <td className="p-3 border-r border-b sticky left-0 bg-white z-20 shadow-sm align-top">
                    <div className="font-black text-slate-800 text-[11px] leading-tight truncate flex items-center gap-1">
                        {prof.id === user.id && <div className="w-2 h-2 bg-green-500 rounded-full" title="Você"></div>}
                        {prof.nome}
                    </div>
                    <div className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 truncate">{prof.categoriaBase}</div>
                  </td>
                  {dias.map(dia => {
                    const iso = obterDataLocalISO(dia);
                    const ags = agendamentos.filter(a => a.data === iso && a.profissionalId === prof.id && a.status !== 'cancelado').sort((a,b) => getMinutos(a.hora) - getMinutos(b.hora));
                    return (
                      <td key={iso} className={`p-1.5 border-b border-r border-slate-100 align-top min-h-[100px] ${iso === hoje ? 'bg-blue-50/20' : ''}`}>
                        {ags.map(ag => (
                          <div key={ag.id} onClick={() => abrirFormEdicao(ag)} className={`p-2 mb-1.5 rounded-xl border cursor-pointer transition-all shadow-sm ${ag.status === 'realizado' ? 'bg-green-50 border-green-200 opacity-70' : 'bg-white border-blue-100 hover:border-[#00A1FF]'}`}>
                            <div className="flex justify-between items-start mb-1 gap-1">
                              <span className="text-[10px] font-black text-slate-700">{ag.hora}</span>
                              <span className="bg-purple-50 text-purple-700 px-1 rounded flex items-center gap-0.5 text-[8px] font-black shrink-0"><Layers size={8}/> {ag.pacoteInfo || `Sessão ${getNumeroSessao(ag)}`}</span>
                            </div>
                            <div className="font-black text-slate-800 text-[10px] leading-tight truncate uppercase mb-1.5">{ag.paciente}</div>
                            <div className="flex items-center gap-1 text-[8px] font-black text-slate-500 uppercase mt-auto truncate w-full"><MapPin size={8} className="shrink-0"/> <span className="truncate">{ag.local}</span></div>
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
      
      {/* ... Código dos Modais (Igual ao anterior) ... */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black uppercase">{agendamentoEditando ? 'Gerir Sessão' : 'Novo Agendamento'}</h3>
                <button onClick={()=>setMostrarForm(false)} className="p-2 bg-slate-100 rounded-full hover:text-red-500"><X size={18}/></button>
             </div>
             {agendamentoEditando && (
               <div className="flex gap-2 mb-6">
                 <button onClick={rotearParaEvolucao} className="flex-[2] bg-green-600 text-white py-3 rounded-xl font-black flex justify-center items-center gap-2 shadow-md text-sm"><FileText size={16}/> Abrir Prontuário</button>
                 <button onClick={tentarExcluir} className="px-4 bg-red-50 text-red-600 rounded-xl font-bold flex items-center gap-2 text-sm"><Trash2 size={16}/> Apagar</button>
               </div>
             )}
             <form onSubmit={tentarSalvar} className="space-y-3">
                <select required className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:border-[#00A1FF] border-2 border-transparent" value={form.pacienteId} onChange={e => setForm({...form, pacienteId: e.target.value, pacienteNome: pacientes.find(p=>p.id===e.target.value)?.nome})}>
                  <option value="">Selecionar Paciente...</option>{pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <select required className="p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:border-[#00A1FF] border-2 border-transparent" value={form.profissionalId} onChange={e => { const p = profissionais.find(x=>x.id===e.target.value); setForm({...form, profissionalId: p.id, profissionalNome: p.nome}); }}><option value="">Fisioterapeuta...</option>{profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
                  <select required className="p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:border-[#00A1FF] border-2 border-transparent" value={form.local} onChange={e => setForm({...form, local: e.target.value})}><option value="">Local...</option>{LOCAIS.map(l => <option key={l} value={l}>{l}</option>)}</select>
                </div>
                <div className="p-5 bg-slate-50 rounded-[20px] border border-slate-100">
                   {!agendamentoEditando && (
                     <div className="flex items-center justify-between mb-4 border-b pb-3">
                       <span className="font-black text-xs text-slate-800">Agendar em Lote</span>
                       <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={isLote} onChange={e => setIsLote(e.target.checked)} />
                          <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-[#00A1FF]"></div>
                       </label>
                     </div>
                   )}
                   <div className="grid grid-cols-2 gap-3">
                      <input type="date" className="p-3 bg-white rounded-xl font-bold text-sm outline-none focus:border-[#00A1FF] border-2 border-transparent" value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
                      <input type="time" className="p-3 bg-white rounded-xl font-bold text-sm outline-none focus:border-[#00A1FF] border-2 border-transparent" value={form.hora} onChange={e => setForm({...form, hora: e.target.value})} />
                   </div>
                   {isLote && !agendamentoEditando && (
                     <div className="mt-3 pt-3 animate-in fade-in">
                        <div className="flex gap-1.5 mb-3">{[1,2,3,4,5,6].map(d => (
                            <button key={d} type="button" onClick={() => setLoteConfig(prev => ({ ...prev, diasSemana: prev.diasSemana.includes(d) ? prev.diasSemana.filter(x=>x!==d) : [...prev.diasSemana, d] }))} className={`flex-1 py-2 rounded-lg font-black text-[10px] border transition-all ${loteConfig.diasSemana.includes(d) ? 'bg-[#00A1FF] border-[#00A1FF] text-white' : 'bg-white border-slate-200 text-slate-400'}`}>{DIAS_NOMES[d]}</button>
                          ))}</div>
                        <input type="number" className="w-full p-3 rounded-lg border-2 border-transparent outline-none focus:border-[#00A1FF] font-bold text-sm" value={loteConfig.quantidade} onChange={e => setLoteConfig({...loteConfig, quantidade: parseInt(e.target.value)})}/>
                     </div>
                   )}
                </div>
                <button type="submit" disabled={carregandoIA} className="w-full bg-[#0F214A] text-white py-4 rounded-xl font-black text-sm hover:bg-[#00A1FF] transition-all flex items-center justify-center shadow-lg">{carregandoIA ? <Loader2 className="animate-spin" /> : (agendamentoEditando ? 'Guardar Alterações' : 'Confirmar Agendamento')}</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}