import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Plus, Trash2, X, ChevronLeft, ChevronRight,
  Layers, Loader2, Copy, User, MapPin, Sparkles, FileText, AlertTriangle, Ban, CheckCircle2, Lightbulb
} from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const LOCAIS = [
  'Sala 701', 'Sala 702', 'Sala 703', 'Sala 704', 'Sala 705', 
  'Ginásio Clínico', 'Prancha Ortostática', 'Atendimento Domiciliar', 'Atendimento Hospitalar'
];

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
  const [modoCancelamento, setModoCancelamento] = useState(false);
  const [carregandoIA, setCarregandoIA] = useState(false);
  
  const [form, setForm] = useState({ 
    pacienteId: '', pacienteNome: '', tipo: 'Atendimento', local: '', 
    data: obterDataLocalISO(new Date()), hora: '08:00', profissionalId: '', profissionalNome: '' 
  });

  const [isLote, setIsLote] = useState(false);
  const [loteConfig, setLoteConfig] = useState({ quantidade: 10, diasSemana: [] });
  const [filaConflitos, setFilaConflitos] = useState([]);
  const [agendamentosBons, setAgendamentosBons] = useState([]);
  const [idxConflito, setIdxConflito] = useState(0);

  useEffect(() => {
    if (!user) return;
    const unsubAgenda = onSnapshot(collection(db, "agendamentos"), snap => setAgendamentos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubPac = onSnapshot(collection(db, "pacientes"), snap => setPacientes(snap.docs.map(d => ({ id: d.id, nome: d.data()?.nome || 'Paciente sem nome' }))));
    const unsubProf = onSnapshot(collection(db, "profissionais"), snap => {
      const profs = snap.docs.map(d => ({ id: d.id, nome: d.data()?.nome || '', categoriaBase: d.data()?.categoriaBase || '' })).filter(p => p.nome);
      setProfissionais(profs);
    });
    return () => { unsubAgenda(); unsubPac(); unsubProf(); };
  }, [user]);

  const verificarConflito = (d, h, pId, l, idIgnorar = null) => {
    return agendamentos.find(a => a.id !== idIgnorar && a.data === d && a.hora === h && a.status !== 'cancelado' && (a.profissionalId === pId || (a.local === l && l !== 'Atendimento Domiciliar' && l !== 'Ginásio Clínico' && l !== 'Atendimento Hospitalar')));
  };

  const getSalasRecomendadas = () => {
    const prof = profissionais.find(p => p.id === form.profissionalId);
    if (!prof) return [];
    if (prof.categoriaBase === 'fisio') return ['Sala 701', 'Sala 703'];
    if (prof.categoriaBase === 'to') return ['Sala 704', 'Sala 705'];
    return [];
  };

  const verificarUsoSala702 = () => {
    if (form.local !== 'Sala 702') return true;
    const recomendadas = getSalasRecomendadas();
    const ocupadas = agendamentos.filter(a => a.data === form.data && a.hora === form.hora && a.status !== 'cancelado').map(a => a.local);
    const temDisponivel = recomendadas.some(sala => !ocupadas.includes(sala));
    
    if (temDisponivel) {
      return window.confirm("Atenção: Existem salas preferenciais disponíveis. A Sala 702 deve ser usada apenas como último recurso. Deseja prosseguir mesmo assim?");
    }
    return true;
  };

  const fecharFormularioGeral = () => { setMostrarForm(false); setModoCancelamento(false); };

  const abrirFormEdicao = (agend) => {
    setModoCancelamento(false);
    setAgendamentoEditando(agend.id);
    setForm({ pacienteId: agend.pacienteId || '', pacienteNome: agend.paciente || '', tipo: agend.tipo || 'Atendimento', data: agend.data || '', hora: agend.hora || '', local: agend.local || '', profissionalId: agend.profissionalId || '', profissionalNome: agend.profissional || '' });
    setMostrarForm(true);
  };

  // ====== AQUI ESTÁ A CORREÇÃO DE EDIÇÃO DA AGENDA ======
  const processarEdicao = async () => {
    setCarregandoIA(true);
    try {
        const conflito = verificarConflito(form.data, form.hora, form.profissionalId, form.local, agendamentoEditando);
        if (conflito) {
            alert("Conflito! Já existe um paciente para este profissional ou sala neste horário.");
            setCarregandoIA(false);
            return;
        }

        await updateDoc(doc(db, "agendamentos", agendamentoEditando), {
            pacienteId: form.pacienteId,
            paciente: form.pacienteNome,
            data: form.data,
            hora: form.hora,
            local: form.local,
            profissionalId: form.profissionalId,
            profissional: form.profissionalNome
        });
        
        alert("Agendamento alterado com sucesso!");
        fecharFormularioGeral();
    } catch (e) {
        alert("Erro ao salvar alterações da agenda.");
    }
    setCarregandoIA(false);
  };

  const tentarSalvar = (e) => {
    e.preventDefault();
    if (!verificarUsoSala702()) return;
    
    // Se estiver editando, chama o método corrigido direto. Senão cria novo.
    if (agendamentoEditando) { 
        processarEdicao(); 
    } else { 
        processarNovoAgendamento(); 
    }
  };
  // =======================================================

  const confirmarAtendimento = async (e) => {
    e.preventDefault();
    setCarregandoIA(true);
    try {
        await updateDoc(doc(db, "agendamentos", agendamentoEditando), { status: 'confirmado' });
        alert("Atendimento confirmado com sucesso!");
        fecharFormularioGeral();
    } catch (error) { alert("Erro ao confirmar atendimento."); }
    setCarregandoIA(false);
  };

  const processarNovoAgendamento = async () => {
      setCarregandoIA(true);
      let novosBons = [];
      let novosConflitos = [];

      if (!isLote) {
         const conflito = verificarConflito(form.data, form.hora, form.profissionalId, form.local);
         if (conflito) novosConflitos.push({ novo: { ...form }, existente: conflito }); else novosBons.push({ ...form });
      } else {
         const [ano, mes, diaSplit] = form.data.split('-');
         let dt = new Date(ano, mes - 1, diaSplit, 12, 0, 0);
         let sessoesProcessadas = 0; 
         while (sessoesProcessadas < loteConfig.quantidade) {
            if (loteConfig.diasSemana.includes(dt.getDay())) {
               const dIso = obterDataLocalISO(dt);
               const agNovo = { ...form, data: dIso, pacoteInfo: `${sessoesProcessadas+1}/${loteConfig.quantidade}` };
               const conflito = verificarConflito(dIso, form.hora, form.profissionalId, form.local);
               if (conflito) novosConflitos.push({ novo: agNovo, existente: conflito }); else novosBons.push(agNovo);
               sessoesProcessadas++; 
            }
            dt.setDate(dt.getDate() + 1); 
         }
      }

      if (novosConflitos.length > 0) {
          setAgendamentosBons(novosBons); setFilaConflitos(novosConflitos); setIdxConflito(0); setMostrarForm(false);
      } else {
          await Promise.all(novosBons.map(ag => addDoc(collection(db, "agendamentos"), { ...ag, paciente: ag.pacienteNome, profissional: ag.profissionalNome, status: 'pendente' })));
          fecharFormularioGeral();
      }
      setCarregandoIA(false);
  };

  const tentarExcluir = (e) => {
    e.preventDefault();
    if(window.confirm("Deseja apagar este erro de agendamento? (O registro será excluído permanentemente).")) { aplicarExclusao('unico'); }
  };

  const aplicarExclusao = async (escopo) => {
    await deleteDoc(doc(db, "agendamentos", agendamentoEditando));
    alert(`Sessão excluída.`); fecharFormularioGeral();
  };

  const confirmarCancelamento = async (motivo) => {
    await updateDoc(doc(db, "agendamentos", agendamentoEditando), { status: 'cancelado', motivoCancelamento: motivo });
    alert(`Sessão cancelada.`); fecharFormularioGeral();
  };

  const rotearParaEvolucao = () => {
    const ag = agendamentos.find(a => a.id === agendamentoEditando);
    if (ag) { fecharFormularioGeral(); navegarPara('pacientes', { pacienteId: ag.pacienteId, atualizarStatusAgendamento: ag.id }); }
  };

  const pacientesOrdenados = [...pacientes].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  const profissionaisOrdenados = [...profissionais].sort((a, b) => {
    if (a.id === user.id) return -1;
    return (a.nome || '').localeCompare(b.nome || '');
  });

  const dias = (() => { const dArr = []; const inicio = new Date(dataSelecionada); inicio.setDate(inicio.getDate() - inicio.getDay()); for (let i = 0; i < 7; i++) { dArr.push(new Date(inicio)); inicio.setDate(inicio.getDate() + 1); } return dArr; })();
  const hoje = obterDataLocalISO(new Date());

  if (!user) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#00A1FF]" size={40}/></div>;

  return (
    <div className="flex flex-col h-full space-y-4 animate-in fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm shrink-0">
        <h2 className="text-xl font-black text-slate-900 uppercase">Agenda Clínica</h2>
        <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl w-full md:w-auto justify-between">
          <button onClick={() => { const d = new Date(dataSelecionada); d.setDate(d.getDate()-7); setDataSelecionada(d); }} className="p-2"><ChevronLeft size={18}/></button>
          <button onClick={() => setDataSelecionada(new Date())} className="px-5 py-2 font-black text-[11px] uppercase">Hoje</button>
          <button onClick={() => { const d = new Date(dataSelecionada); d.setDate(d.getDate()+7); setDataSelecionada(d); }} className="p-2"><ChevronRight size={18}/></button>
        </div>
        <button onClick={() => { setAgendamentoEditando(null); setForm({...form, data: hoje}); setIsLote(false); setMostrarForm(true); }} className="w-full md:w-auto bg-[#00A1FF] text-white px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 text-sm"><Plus size={18}/> Novo Agendamento</button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 flex-1 flex flex-col shadow-sm min-w-0 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto flex-1 relative w-full touch-pan-x custom-scrollbar">
          <table className="w-full border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md">
              <tr>
                <th className="p-3 border-b border-r text-left min-w-[120px] sticky left-0 bg-slate-50 z-40"><span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Profissional</span></th>
                {dias.map(dia => (
                  <th key={dia.toISOString()} className={`p-2 border-b min-w-[130px] text-center ${obterDataLocalISO(dia) === hoje ? 'bg-blue-50/80 border-b-4 border-b-[#00A1FF]' : ''}`}>
                    <div className="text-[9px] font-black uppercase text-slate-400">{DIAS_NOMES[dia.getDay()]}</div>
                    <div className="text-lg font-black text-slate-800">{dia.getDate()}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profissionaisOrdenados.map(prof => (
                <tr key={prof.id} className={prof.id === user.id ? 'bg-blue-50/30' : ''}>
                  <td className="p-3 border-r border-b sticky left-0 bg-white z-20 shadow-sm align-top">
                    <div className="font-black text-slate-800 text-[11px] truncate flex items-center gap-1">
                        {prof.id === user.id && <div className="w-2 h-2 bg-green-500 rounded-full shrink-0"></div>}
                        <span className="truncate">{prof.nome}</span>
                    </div>
                    <div className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 truncate">{prof.categoriaBase}</div>
                  </td>
                  {dias.map(dia => {
                    const iso = obterDataLocalISO(dia);
                    const ags = agendamentos.filter(a => a.data === iso && a.profissionalId === prof.id).sort((a,b) => getMinutos(a.hora) - getMinutos(b.hora));
                    return (
                      <td key={iso} className="p-1.5 border-b border-r border-slate-100 align-top min-h-[100px]">
                        {ags.map(ag => {
                          const isCancelado = ag.status === 'cancelado';
                          const isRealizado = ag.status === 'realizado';
                          const isConfirmado = ag.status === 'confirmado';
                          const isFalta = ag.motivoCancelamento === 'Falta sem aviso';

                          const cardClasses = isCancelado 
                            ? (isFalta ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200')
                            : isRealizado ? 'bg-green-50 border-green-200 opacity-70'
                            : isConfirmado ? 'bg-[#e5f5ff] border-[#00A1FF] ring-1 ring-[#00A1FF]/30'
                            : 'bg-white border-blue-100 hover:border-[#00A1FF]';

                          return (
                            <div key={ag.id} onClick={() => abrirFormEdicao(ag)} className={`p-2 mb-1.5 rounded-xl border cursor-pointer transition-all shadow-sm flex flex-col justify-between min-h-[60px] ${cardClasses}`}>
                               {isCancelado ? (
                                  <div className="flex items-center gap-1.5" title={`Cancelado: ${ag.motivoCancelamento}`}>
                                     <span className="text-[8px] font-black">{ag.hora}</span>
                                     <span className="text-[8px] font-black truncate uppercase line-through">{ag.paciente}</span>
                                  </div>
                               ) : (
                                  <>
                                    <div className="flex justify-between items-start mb-1">
                                       <span className={`text-[10px] font-black ${isConfirmado ? 'text-[#00A1FF]' : 'text-slate-700'}`}>{ag.hora}</span>
                                       {ag.exerciciosPlanejados && ag.exerciciosPlanejados.length > 0 && <Lightbulb size={12} className="text-amber-500 fill-amber-400/30 shrink-0" title="Sessão Modulada" />}
                                    </div>
                                    <div className={`font-black text-[10px] truncate uppercase ${isConfirmado ? 'text-[#0F214A]' : 'text-slate-800'}`}>{ag.paciente}</div>
                                    <div className="flex items-center gap-1 text-[7px] font-black text-slate-500 uppercase mt-auto"><MapPin size={8} className="shrink-0"/> <span className="truncate">{ag.local}</span></div>
                                  </>
                               )}
                            </div>
                          );
                        })}
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
          <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black uppercase text-[#0F214A]">{agendamentoEditando ? 'Gerir Sessão' : 'Novo Agendamento'}</h3>
                <button onClick={fecharFormularioGeral} className="p-2 bg-slate-100 rounded-full hover:text-red-500"><X size={18}/></button>
             </div>
             
             {agendamentoEditando && !modoCancelamento && (
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                 <button onClick={rotearParaEvolucao} className="bg-green-600 text-white py-3 rounded-xl font-black flex justify-center items-center gap-1.5 text-xs shadow-md hover:bg-green-700 transition-colors">
                    <FileText size={14}/> Prontuário
                 </button>

                 <button onClick={confirmarAtendimento} disabled={carregandoIA} className="bg-blue-50 text-blue-600 py-3 rounded-xl font-black flex justify-center items-center gap-1.5 text-xs border border-blue-200 hover:bg-blue-100 transition-colors">
                    {carregandoIA ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>} Confirmar
                 </button>
                 
                 <button onClick={() => setModoCancelamento(true)} className="bg-orange-50 text-orange-600 py-3 rounded-xl font-bold flex justify-center items-center gap-1.5 text-xs border border-orange-200 hover:bg-orange-100 transition-colors">
                    <Ban size={14}/> Cancelar
                 </button>

                 <button onClick={tentarExcluir} className="bg-red-50 text-red-600 py-3 rounded-xl font-bold flex justify-center items-center gap-1.5 text-xs border border-red-200 hover:bg-red-100 transition-colors">
                    <Trash2 size={14}/> Apagar
                 </button>
               </div>
             )}

             {modoCancelamento ? (
                 <div className="mb-6 p-5 bg-orange-50 border border-orange-200 rounded-2xl animate-in zoom-in-95">
                     <h4 className="font-black text-orange-800 mb-3 flex items-center gap-2"><Ban size={18}/> Qual o motivo?</h4>
                     <div className="space-y-2">
                         <button onClick={() => confirmarCancelamento('Antecedência > 24h')} className="w-full text-left p-3 bg-white border border-orange-200 rounded-xl font-bold text-sm">Paciente cancelou com mais de 24h</button>
                         <button onClick={() => confirmarCancelamento('Antecedência > 12h')} className="w-full text-left p-3 bg-white border border-orange-200 rounded-xl font-bold text-sm">Paciente cancelou com mais de 12h</button>
                         <button onClick={() => confirmarCancelamento('Falta sem aviso')} className="w-full text-left p-3 bg-white border border-red-200 rounded-xl font-black text-red-600 text-sm">Falta não agendada / Sem aviso</button>
                     </div>
                     <button onClick={() => setModoCancelamento(false)} className="w-full mt-4 p-3 font-bold text-slate-500 text-sm">Voltar</button>
                 </div>
             ) : (
                 <form onSubmit={tentarSalvar} className="space-y-3">
                    <select required className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:border-[#00A1FF] border-2 border-transparent truncate" value={form.pacienteId} onChange={e => setForm({...form, pacienteId: e.target.value, pacienteNome: pacientes.find(p=>p.id===e.target.value)?.nome})}>
                      <option value="">Selecionar Paciente...</option>
                      {pacientesOrdenados.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <select required className="p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:border-[#00A1FF] border-2 border-transparent truncate" value={form.profissionalId} onChange={e => { const p = profissionais.find(x=>x.id===e.target.value); setForm({...form, profissionalId: p.id, profissionalNome: p.nome}); }}>
                          <option value="">Fisioterapeuta / TO...</option>
                          {profissionaisOrdenados.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                      </select>

                      <select required className={`p-3 rounded-xl font-bold text-sm outline-none border-2 truncate ${getSalasRecomendadas().includes(form.local) ? 'border-green-200 bg-green-50' : 'bg-slate-50 border-transparent'}`} value={form.local} onChange={e => setForm({...form, local: e.target.value})}>
                          <option value="">Selecionar Sala...</option>
                          {LOCAIS.map(l => (
                            <option key={l} value={l}>
                              {l} {getSalasRecomendadas().includes(l) ? '⭐' : ''} {l === 'Sala 702' ? '(Reserva)' : ''}
                            </option>
                          ))}
                      </select>
                    </div>

                    {form.profissionalId && (
                      <div className="px-3 py-2 bg-blue-50 rounded-lg text-[10px] font-bold text-blue-700 flex items-center gap-2">
                        <MapPin size={12} className="shrink-0"/> Sugestão: {getSalasRecomendadas().join(' ou ')}. Use a 702 apenas se necessário.
                      </div>
                    )}

                    <div className="p-4 bg-slate-50 rounded-[20px] border border-slate-100">
                       <div className="grid grid-cols-2 gap-3">
                          <input type="date" className="p-3 bg-white rounded-xl font-bold text-sm w-full" value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
                          <input type="time" className="p-3 bg-white rounded-xl font-bold text-sm w-full" value={form.hora} onChange={e => setForm({...form, hora: e.target.value})} />
                       </div>
                    </div>
                    <button type="submit" disabled={carregandoIA} className="w-full bg-[#0F214A] text-white py-4 rounded-xl font-black text-sm hover:bg-[#00A1FF] transition-all">
                        {carregandoIA ? <Loader2 className="animate-spin mx-auto" /> : (agendamentoEditando ? 'Guardar Alterações' : 'Confirmar Agendamento')}
                    </button>
                 </form>
             )}
          </div>
        </div>
      )}
    </div>
  );
}