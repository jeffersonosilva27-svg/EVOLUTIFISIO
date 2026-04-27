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

export default function Agenda({ user, hasAccess, navegarPara }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  
  const [mostrarForm, setMostrarForm] = useState(false);
  const [agendamentoEditando, setAgendamentoEditando] = useState(null);
  
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [insightCapacidade, setInsightCapacidade] = useState('');

  const [form, setForm] = useState({
    pacienteId: '', pacienteNome: '', tipo: 'Atendimento', local: '',
    data: obterDataLocalISO(new Date()), hora: '08:00', 
    profissionalId: '', profissionalNome: ''
  });

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
    const unsubAgenda = onSnapshot(query(collection(db, "agendamentos"), orderBy("hora", "asc")), snap => {
      setAgendamentos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubPac = onSnapshot(query(collection(db, "pacientes"), orderBy("nome", "asc")), snap => {
      setPacientes(snap.docs.map(d => ({ id: d.id, nome: d.data()?.nome || 'Paciente sem nome' })));
    });
    const unsubProf = onSnapshot(query(collection(db, "profissionais"), orderBy("nome", "asc")), snap => {
      setProfissionais(snap.docs.map(d => ({ id: d.id, nome: d.data()?.nome || '', categoriaBase: d.data()?.categoriaBase || '' })).filter(p => p.nome));
    });
    return () => { unsubAgenda(); unsubPac(); unsubProf(); };
  }, [user]);

  useEffect(() => {
    if (filaConflitos.length > 0 && filaConflitos[idxConflito]) {
        setDualExistente(filaConflitos[idxConflito].existente);
        setDualNovo(filaConflitos[idxConflito].novo);
    }
  }, [idxConflito, filaConflitos]);

  const verificarConflito = (d, h, pId, l, idIgnorar = null) => {
    return agendamentos.find(a => 
      a.id !== idIgnorar &&
      a.data === d && a.hora === h && a.status !== 'cancelado' &&
      (a.profissionalId === pId || (a.local === l && l !== 'Atendimento Domiciliar' && l !== 'Ginásio Clínico'))
    );
  };

  const abrirFormEdicao = async (agend) => {
    setAgendamentoEditando(agend.id);
    setForm({
      pacienteId: agend.pacienteId || '', pacienteNome: agend.paciente || '', tipo: agend.tipo || 'Atendimento',
      data: agend.data || '', hora: agend.hora || '', local: agend.local || '',
      profissionalId: agend.profissionalId || '', profissionalNome: agend.profissional || ''
    });

    if (!agend.pacienteId) {
       setInsightCapacidade('Selecione um paciente para ver a análise da IA.');
       setMostrarForm(true); return;
    }

    setInsightCapacidade('Processando histórico com o Agente Clínico IA...');
    setMostrarForm(true);

    try {
      const analise = await analisarCapacidadePaciente([]); 
      setInsightCapacidade(analise || "Paciente sem histórico suficiente.");
    } catch (e) { setInsightCapacidade(`Falha no Agente IA: ${e.message}`); }
  };

  const tentarExcluir = (e) => {
    e.preventDefault();
    const pendentes = agendamentos.filter(a => a.pacienteId === form.pacienteId && a.id !== agendamentoEditando && a.status === 'pendente');
    if (pendentes.length > 0) {
        setModalEscopo({ open: true, type: 'delete' });
    } else {
        if(window.confirm("Apagar permanentemente este agendamento?")) {
           aplicarExclusao('unico');
        }
    }
  };

  const aplicarExclusao = async (escopo) => {
    setModalEscopo({ open: false, type: '' });
    setCarregandoIA(true);
    const refAtual = agendamentos.find(a => a.id === agendamentoEditando);
    let alvos = [refAtual];
    if (escopo !== 'unico') {
       const pendentes = agendamentos.filter(a => a.pacienteId === form.pacienteId && a.id !== agendamentoEditando && a.status === 'pendente');
       if (escopo === 'futuros') alvos = [...alvos, ...pendentes.filter(a => a.data >= refAtual.data)];
       else if (escopo === 'todos') alvos = [...alvos, ...pendentes];
    }
    await Promise.all(alvos.map(a => deleteDoc(doc(db, "agendamentos", a.id))));
    alert(`${alvos.length} sessão(ões) excluída(s).`);
    setMostrarForm(false);
    setCarregandoIA(false);
  };

  const tentarSalvar = (e) => {
    e.preventDefault();
    if (!form.pacienteId || !form.profissionalId) return alert("Preencha Paciente e Profissional.");
    if (agendamentoEditando) {
      const pendentes = agendamentos.filter(a => a.pacienteId === form.pacienteId && a.id !== agendamentoEditando && a.status === 'pendente');
      if (pendentes.length > 0) {
         setModalEscopo({ open: true, type: 'edit' });
      } else {
         aplicarEdicao('unico');
      }
    } else {
      processarNovoAgendamento();
    }
  };

  const aplicarEdicao = async (escopo) => {
    setModalEscopo({ open: false, type: '' });
    setCarregandoIA(true);
    const refAtual = agendamentos.find(a => a.id === agendamentoEditando);
    let alvos = [refAtual];
    if (escopo !== 'unico') {
       const pendentes = agendamentos.filter(a => a.pacienteId === form.pacienteId && a.id !== agendamentoEditando && a.status === 'pendente');
       if (escopo === 'futuros') alvos = [...alvos, ...pendentes.filter(a => a.data >= refAtual.data)];
       else if (escopo === 'todos') alvos = [...alvos, ...pendentes];
    }
    let novosBons = [];
    let novosConflitos = [];
    for (let alvo of alvos) {
        const isAtual = alvo.id === agendamentoEditando;
        const novaData = isAtual ? form.data : alvo.data; 
        const agNovo = { ...alvo, data: novaData, hora: form.hora, profissionalId: form.profissionalId, profissionalNome: form.profissionalNome, local: form.local, paciente: form.pacienteNome, isEdit: true, originalId: alvo.id };
        const conflito = verificarConflito(agNovo.data, agNovo.hora, agNovo.profissionalId, agNovo.local, alvo.id);
        if (conflito) novosConflitos.push({ novo: agNovo, existente: conflito });
        else novosBons.push(agNovo);
    }
    if (novosConflitos.length > 0) {
       setAgendamentosBons(novosBons);
       setFilaConflitos(novosConflitos);
       setIdxConflito(0);
       setMostrarForm(false);
       setCarregandoIA(false);
       return; 
    }
    await Promise.all(novosBons.map(ag => {
        const { originalId, isEdit, ...rest } = ag;
        return updateDoc(doc(db, "agendamentos", originalId), rest);
    }));
    alert(`Agenda atualizada! ${alvos.length} sessões alteradas.`);
    setMostrarForm(false); 
    setCarregandoIA(false);
  };

  const processarNovoAgendamento = async () => {
      setCarregandoIA(true);
      let novosBons = [];
      let novosConflitos = [];
      if (!isLote) {
         const conflito = verificarConflito(form.data, form.hora, form.profissionalId, form.local);
         if (conflito) novosConflitos.push({ novo: { ...form }, existente: conflito });
         else novosBons.push({ ...form });
      } else {
         if(loteConfig.diasSemana.length === 0) {
           setCarregandoIA(false); return alert("Selecione os dias da semana para o lote.");
         }
         const [ano, mes, diaSplit] = form.data.split('-');
         let dt = new Date(ano, mes - 1, diaSplit, 12, 0, 0);
         let sessoesProcessadas = 0; 
         let limiteSeguranca = 0; 
         const diasDesejados = loteConfig.diasSemana.map(Number); 
         while (sessoesProcessadas < loteConfig.quantidade && limiteSeguranca < 365) {
            limiteSeguranca++;
            const diaDaSemana = dt.getDay();
            if (diasDesejados.includes(diaDaSemana)) {
               const dIso = obterDataLocalISO(dt);
               const agNovo = { ...form, data: dIso, pacoteInfo: `${sessoesProcessadas+1}/${loteConfig.quantidade}` };
               const conflito = verificarConflito(dIso, form.hora, form.profissionalId, form.local);
               if (conflito) novosConflitos.push({ novo: agNovo, existente: conflito });
               else novosBons.push(agNovo);
               sessoesProcessadas++; 
            }
            dt.setDate(dt.getDate() + 1); 
         }
      }
      if (novosConflitos.length > 0) {
         setAgendamentosBons(novosBons);
         setFilaConflitos(novosConflitos);
         setIdxConflito(0);
         setMostrarForm(false);
         setCarregandoIA(false);
         return; 
      }
      await Promise.all(novosBons.map(ag => 
         addDoc(collection(db, "agendamentos"), { ...ag, paciente: ag.pacienteNome, profissional: ag.profissionalNome, status: 'pendente' })
      ));
      alert(`✅ Sucesso! Agendamento concluído.`);
      setMostrarForm(false); 
      setCarregandoIA(false);
  };

  const resolverConflito = async (acao) => {
    setCarregandoIA(true);
    if (acao === 'salvar') {
        if (dualExistente && dualExistente.id) {
            await updateDoc(doc(db, "agendamentos", dualExistente.id), {
                data: dualExistente.data, hora: dualExistente.hora,
                profissionalId: dualExistente.profissionalId, local: dualExistente.local
            });
        }
        setAgendamentosBons(prev => [...prev, dualNovo]);
    }
    const prox = idxConflito + 1;
    if (prox < filaConflitos.length) {
        setIdxConflito(prox);
    } else {
        await Promise.all(agendamentosBons.map(ag => {
            if (ag.isEdit) {
                const { originalId, isEdit, ...rest } = ag;
                return updateDoc(doc(db, "agendamentos", originalId), rest);
            } else {
                return addDoc(collection(db, "agendamentos"), {
                   ...ag, paciente: ag.pacienteNome || ag.paciente, profissional: ag.profissionalNome || ag.profissional, status: 'pendente'
                });
            }
        }));
        alert("Resolução concluída!");
        setFilaConflitos([]); setAgendamentosBons([]);
    }
    setCarregandoIA(false);
  };

  const rotearParaEvolucao = () => {
    const agendamento = agendamentos.find(a => a.id === agendamentoEditando);
    if (agendamento?.pacienteId) {
      setMostrarForm(false);
      navegarPara('pacientes', { pacienteId: agendamento.pacienteId, atualizarStatusAgendamento: agendamento.id });
    }
  };

  const dias = (() => {
    const dArr = []; const inicio = new Date(dataSelecionada);
    inicio.setDate(inicio.getDate() - inicio.getDay()); 
    for (let i = 0; i < 7; i++) { dArr.push(new Date(inicio)); inicio.setDate(inicio.getDate() + 1); }
    return dArr;
  })();
  
  const infoData = getInfoData(dataSelecionada);
  const hoje = obterDataLocalISO(new Date());

  if (!user) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={40}/></div>;

  return (
    <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-500 relative">
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <CalendarIcon className="text-blue-600 hidden md:block" size={24}/>
          <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">{infoData.mes}</h2>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest leading-none">
            Semana {infoData.semana}
          </span>
        </div>

        <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
          <button onClick={() => { const d = new Date(dataSelecionada); d.setDate(d.getDate()-7); setDataSelecionada(d); }} className="p-2 hover:bg-white rounded-xl transition-all text-slate-500 hover:text-slate-900"><ChevronLeft size={18}/></button>
          <button onClick={() => setDataSelecionada(new Date())} className="px-5 py-2 hover:bg-white rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-600 transition-all">Semana Atual</button>
          <button onClick={() => { const d = new Date(dataSelecionada); d.setDate(d.getDate()+7); setDataSelecionada(d); }} className="p-2 hover:bg-white rounded-xl transition-all text-slate-500 hover:text-slate-900"><ChevronRight size={18}/></button>
        </div>

        <button onClick={() => { setAgendamentoEditando(null); setForm({...form, data: hoje}); setIsLote(false); setMostrarForm(true); }} className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm">
          <Plus size={18}/> Novo Agendamento
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 flex-1 overflow-hidden flex flex-col shadow-sm">
        <div className="overflow-auto custom-scrollbar flex-1 relative">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md">
              <tr>
                <th className="p-3 border-b border-r text-left min-w-[140px] max-w-[180px] sticky left-0 bg-slate-50 z-40"><span className="text-[10px] font-black uppercase text-slate-400">Equipe</span></th>
                {dias.map(dia => {
                  const iso = obterDataLocalISO(dia);
                  const isHoje = iso === hoje;
                  return (
                    <th key={iso} className={`p-2 border-b min-w-[150px] max-w-[180px] text-center ${isHoje ? 'bg-blue-50/80 border-b-4 border-b-blue-600' : ''}`}>
                      <div className={`text-[9px] font-black uppercase ${isHoje ? 'text-blue-600' : 'text-slate-400'}`}>{DIAS_NOMES[dia.getDay()]}</div>
                      <div className={`text-lg font-black ${isHoje ? 'text-blue-700' : 'text-slate-800'}`}>{dia.getDate()}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {profissionais.map(prof => (
                <tr key={prof.id} className="group">
                  <td className="p-3 border-r border-b sticky left-0 bg-white group-hover:bg-slate-50 z-20 shadow-[2px_0_10px_rgba(0,0,0,0.02)] align-top">
                    <div className="font-black text-slate-800 text-[11px] leading-tight truncate">{prof.nome}</div>
                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5 truncate">{prof.categoriaBase}</div>
                  </td>
                  {dias.map(dia => {
                    const iso = obterDataLocalISO(dia);
                    const ags = agendamentos.filter(a => a.data === iso && a.profissionalId === prof.id);
                    return (
                      <td key={iso} className={`p-1.5 border-b border-r border-slate-100 align-top min-h-[100px] ${iso === hoje ? 'bg-blue-50/20' : ''}`}>
                        {ags.map(ag => (
                          /* COMPACT CARD DESIGN */
                          <div key={ag.id} onClick={() => abrirFormEdicao(ag)} className={`p-2 mb-1.5 rounded-xl border cursor-pointer transition-all shadow-sm hover:shadow-md ${ag.status === 'realizado' ? 'bg-green-50 border-green-200 opacity-70 hover:opacity-100' : 'bg-white border-blue-100 hover:border-blue-400'}`}>
                            <div className="flex justify-between items-start mb-1 gap-1">
                              <span className="text-[10px] font-black text-slate-700">{ag.hora}</span>
                              {ag.pacoteInfo && <span className="bg-purple-100 text-purple-700 px-1 rounded flex items-center gap-0.5 text-[8px] font-black shrink-0"><Layers size={8}/> {ag.pacoteInfo}</span>}
                            </div>
                            <div className="font-black text-slate-800 text-[10px] leading-tight truncate uppercase mb-1.5" title={ag.paciente}>{ag.paciente}</div>
                            <div className="flex items-center gap-1 text-[8px] font-black text-slate-500 uppercase mt-auto truncate w-full">
                               <MapPin size={8} className="shrink-0"/> <span className="truncate">{ag.local}</span>
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

      {modalEscopo.open && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[120]">
          <div className="bg-white p-8 rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95">
             <h3 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-2">
               <Copy className="text-blue-600" size={20}/> {modalEscopo.type === 'edit' ? 'Alterar Pacote?' : 'Apagar Múltiplas Sessões?'}
             </h3>
             <p className="text-slate-500 font-medium mb-6 text-sm">
               {modalEscopo.type === 'edit' ? 'Deseja aplicar a mudança de horário, profissional e sala para outras sessões pendentes deste paciente?' : 'Você deseja excluir também as outras sessões agendadas para este paciente?'}
             </p>
             <div className="space-y-2">
                <button onClick={() => modalEscopo.type === 'edit' ? aplicarEdicao('unico') : aplicarExclusao('unico')} className="w-full p-4 rounded-xl border border-slate-200 hover:border-blue-500 font-black text-slate-700 hover:bg-blue-50 text-left transition-all text-sm">Apenas nesta sessão</button>
                <button onClick={() => modalEscopo.type === 'edit' ? aplicarEdicao('futuros') : aplicarExclusao('futuros')} className="w-full p-4 rounded-xl border border-slate-200 hover:border-blue-500 font-black text-slate-700 hover:bg-blue-50 text-left transition-all text-sm">Nesta e nas próximas sessões</button>
                <button onClick={() => modalEscopo.type === 'edit' ? aplicarEdicao('todos') : aplicarExclusao('todos')} className="w-full p-4 rounded-xl border border-slate-200 hover:border-blue-500 font-black text-slate-700 hover:bg-blue-50 text-left transition-all text-sm">Em todas as sessões pendentes</button>
             </div>
             <button onClick={() => setModalEscopo({open: false, type: ''})} className="w-full mt-4 py-3 font-bold text-slate-400 hover:text-slate-600 text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {filaConflitos.length > 0 && dualExistente && dualNovo && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[110]">
              <div className="bg-white w-full max-w-4xl rounded-[32px] shadow-2xl p-6 animate-in zoom-in-95 flex flex-col max-h-[95vh]">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4 shrink-0">
                     <div>
                       <h3 className="text-xl font-black text-red-600 flex items-center gap-2"><AlertTriangle size={20}/> Conflito Detectado</h3>
                       <p className="text-slate-500 font-medium text-xs mt-1">Comparativo (Conflito {idxConflito + 1} de {filaConflitos.length})</p>
                     </div>
                     <button onClick={() => { setFilaConflitos([]); setAgendamentosBons([]); }} className="p-2 bg-slate-50 hover:bg-red-50 rounded-full text-slate-400 hover:text-red-500 transition-colors"><X size={18}/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-slate-50 p-5 rounded-[20px] border border-slate-200">
                              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest bg-white px-2 py-1 rounded border border-slate-200">Já Agendado</span>
                              <h4 className="text-lg font-black text-slate-800 mt-3 mb-3">{dualExistente.paciente}</h4>
                              <div className="space-y-2">
                                  <input type="date" value={dualExistente.data} onChange={e => setDualExistente({...dualExistente, data: e.target.value})} className="w-full p-3 rounded-lg border border-slate-200 font-bold text-xs outline-none" />
                                  <input type="time" value={dualExistente.hora} onChange={e => setDualExistente({...dualExistente, hora: e.target.value})} className="w-full p-3 rounded-lg border border-slate-200 font-bold text-xs outline-none" />
                                  <select value={dualExistente.profissionalId} onChange={e => setDualExistente({...dualExistente, profissionalId: e.target.value})} className="w-full p-3 rounded-lg border border-slate-200 font-bold text-xs outline-none">
                                      {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                  </select>
                                  <select value={dualExistente.local} onChange={e => setDualExistente({...dualExistente, local: e.target.value})} className="w-full p-3 rounded-lg border border-slate-200 font-bold text-xs outline-none">
                                      {LOCAIS.map(l => <option key={l} value={l}>{l}</option>)}
                                  </select>
                              </div>
                          </div>

                          <div className="bg-blue-50 p-5 rounded-[20px] border border-blue-400">
                              <span className="text-[9px] font-black uppercase text-blue-700 tracking-widest bg-blue-100 px-2 py-1 rounded">Tentativa (Novo)</span>
                              <h4 className="text-lg font-black text-blue-900 mt-3 mb-3">{dualNovo.pacienteNome || dualNovo.paciente}</h4>
                              <div className="space-y-2">
                                  <input type="date" value={dualNovo.data} onChange={e => setDualNovo({...dualNovo, data: e.target.value})} className="w-full p-3 rounded-lg border border-transparent focus:border-blue-500 font-bold text-xs bg-white outline-none" />
                                  <input type="time" value={dualNovo.hora} onChange={e => setDualNovo({...dualNovo, hora: e.target.value})} className="w-full p-3 rounded-lg border border-transparent focus:border-blue-500 font-bold text-xs bg-white outline-none" />
                                  <select value={dualNovo.profissionalId} onChange={e => { const p = profissionais.find(x=>x.id===e.target.value); setDualNovo({...dualNovo, profissionalId: p.id, profissionalNome: p.nome}); }} className="w-full p-3 rounded-lg border border-transparent focus:border-blue-500 font-bold text-xs bg-white outline-none">
                                      {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                  </select>
                                  <select value={dualNovo.local} onChange={e => setDualNovo({...dualNovo, local: e.target.value})} className="w-full p-3 rounded-lg border border-transparent focus:border-blue-500 font-bold text-xs bg-white outline-none">
                                      {LOCAIS.map(l => <option key={l} value={l}>{l}</option>)}
                                  </select>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="mt-6 flex flex-col md:flex-row gap-3 shrink-0">
                      <button onClick={() => resolverConflito('pular')} disabled={carregandoIA} className="flex-1 py-3 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-colors text-sm">Pular Janela 2</button>
                      <button onClick={() => resolverConflito('salvar')} disabled={carregandoIA} className="flex-[2] py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-md text-sm">
                          {carregandoIA ? <Loader2 className="animate-spin" size={16} /> : 'Salvar Alterações'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {mostrarForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl p-8 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black uppercase tracking-tighter">{agendamentoEditando ? 'Gerir Sessão' : 'Novo Agendamento'}</h3>
                <button onClick={()=>setMostrarForm(false)} className="p-2 bg-slate-100 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X size={18}/></button>
             </div>
             
             {agendamentoEditando && (
               <div className="flex gap-2 mb-6">
                 <button onClick={rotearParaEvolucao} className="flex-[2] bg-green-600 text-white py-3 rounded-xl font-black flex justify-center items-center gap-2 shadow-md hover:bg-green-700 transition-colors text-sm">
                   <FileText size={16}/> Abrir Prontuário
                 </button>
                 {(user?.role === 'gestor_clinico' || hasAccess?.(['gestor_clinico'])) && (
                   <button onClick={tentarExcluir} className="px-4 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors border border-red-100 flex items-center gap-2 text-sm" title="Apagar Sessão">
                     <Trash2 size={16}/> Apagar
                   </button>
                 )}
               </div>
             )}

             <form onSubmit={tentarSalvar} className="space-y-3">
                <select required className="w-full p-3 bg-slate-50 rounded-xl font-bold border border-transparent focus:border-blue-500 outline-none text-slate-700 text-sm" value={form.pacienteId} onChange={e => setForm({...form, pacienteId: e.target.value, pacienteNome: pacientes.find(p=>p.id===e.target.value)?.nome})}>
                  <option value="">Selecionar Paciente...</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <select required className="p-3 bg-slate-50 rounded-xl font-bold border border-transparent focus:border-blue-500 outline-none text-slate-700 text-sm" value={form.profissionalId} onChange={e => { const p = profissionais.find(x=>x.id===e.target.value); setForm({...form, profissionalId: p.id, profissionalNome: p.nome}); }}>
                    <option value="">Fisioterapeuta...</option>
                    {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                  <select required className="p-3 bg-slate-50 rounded-xl font-bold border border-transparent focus:border-blue-500 outline-none text-slate-700 text-sm" value={form.local} onChange={e => setForm({...form, local: e.target.value})}>
                    <option value="">Local...</option>
                    {LOCAIS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                <div className="p-5 bg-slate-50 rounded-[20px] border border-slate-100">
                   {!agendamentoEditando && (
                     <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
                       <span className="font-black text-xs text-slate-800 flex items-center gap-2"><Layers size={14} className="text-blue-600"/> Agendar em Lote</span>
                       <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={isLote} onChange={e => setIsLote(e.target.checked)} />
                          <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                       </label>
                     </div>
                   )}
                   <div className="grid grid-cols-2 gap-3">
                      <input type="date" className="p-3 bg-white rounded-xl font-bold border border-transparent focus:border-blue-500 outline-none text-slate-700 text-sm" value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
                      <input type="time" className="p-3 bg-white rounded-xl font-bold border border-transparent focus:border-blue-500 outline-none text-slate-700 text-sm" value={form.hora} onChange={e => setForm({...form, hora: e.target.value})} />
                   </div>
                   
                   {isLote && !agendamentoEditando && (
                     <div className="mt-3 pt-3 animate-in fade-in">
                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Dias da Semana (Seg a Sáb)</label>
                        <div className="flex gap-1.5 mb-3">
                          {[1,2,3,4,5,6].map(d => (
                            <button key={d} type="button" onClick={() => setLoteConfig(prev => ({ ...prev, diasSemana: prev.diasSemana.includes(d) ? prev.diasSemana.filter(x=>x!==d) : [...prev.diasSemana, d] }))} className={`flex-1 py-2 rounded-lg font-black text-[10px] border transition-all ${loteConfig.diasSemana.includes(d) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
                              {DIAS_NOMES[d]}
                            </button>
                          ))}
                        </div>
                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Quantidade de Sessões</label>
                        <input type="number" className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:border-blue-500 font-bold text-slate-700 bg-white text-sm" value={loteConfig.quantidade} onChange={e => setLoteConfig({...loteConfig, quantidade: parseInt(e.target.value)})}/>
                     </div>
                   )}
                </div>

                <button type="submit" disabled={carregandoIA} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-sm hover:bg-black transition-colors mt-2 shadow-md flex items-center justify-center">
                  {carregandoIA ? <Loader2 className="animate-spin" size={18}/> : (agendamentoEditando ? 'Guardar Alterações' : 'Confirmar Agendamento')}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}