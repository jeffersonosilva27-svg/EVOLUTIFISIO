import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Plus, Trash2, X, ChevronLeft, ChevronRight,
  Layers, Loader2, Copy, User, MapPin, Sparkles, FileText, AlertTriangle, Ban, CheckCircle2, Lightbulb, Dumbbell, Target, DollarSign
} from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { temAcessoClinica } from '../App';

const LOCAIS = [
  'Sala 701', 'Sala 702', 'Sala 703', 'Sala 704', 'Sala 705', 
  'Ginásio Clínico', 'Prancha Ortostática', 'Atendimento Domiciliar', 'Atendimento Hospitalar'
];

const DIAS_NOMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const obterDataLocalISO = (data) => {
  const d = data instanceof Date ? data : new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const getMinutos = (horaStr) => {
  if (!horaStr) return 0;
  const p = horaStr.split(':');
  return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
};

export default function Agenda({ user, hasAccess, navegarPara, setModalActive }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [mostrarForm, setMostrarForm] = useState(false);
  const [agendamentoEditando, setAgendamentoEditando] = useState(null);
  const [modoCancelamento, setModoCancelamento] = useState(false);
  const [mostrandoConduta, setMostrandoConduta] = useState(false);
  const [carregandoIA, setCarregandoIA] = useState(false);
  
  // PATCH 4.1: Adicionado valorSessao no estado inicial
  const [form, setForm] = useState({ 
    pacienteId: '', pacienteNome: '', tipo: 'Atendimento', local: '', 
    data: obterDataLocalISO(new Date()), hora: '08:00', profissionalId: '', profissionalNome: '', clinicaVinculo: '',
    valorSessao: '' 
  });

  const [isLote, setIsLote] = useState(false);
  const [loteConfig, setLoteConfig] = useState({ quantidade: 10, diasSemana: [] });

  useEffect(() => {
    if (setModalActive) setModalActive(mostrarForm);
  }, [mostrarForm, setModalActive]);

  useEffect(() => {
    if (!user) return;
    
    const unsubAgenda = onSnapshot(collection(db, "agendamentos"), snap => {
      const ags = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAgendamentos(ags.filter(a => temAcessoClinica(user.clinicasAcesso, a.clinicaVinculo)));
    });

    const unsubPac = onSnapshot(collection(db, "pacientes"), snap => {
      const pacs = snap.docs.map(d => ({ id: d.id, nome: d.data()?.nome || 'Sem nome', clinicaVinculo: d.data()?.clinicaVinculo }));
      setPacientes(pacs.filter(p => temAcessoClinica(user.clinicasAcesso, p.clinicaVinculo)));
    });

    const unsubProf = onSnapshot(collection(db, "profissionais"), snap => {
      const profs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProfissionais(profs.filter(p => 
        p.nome && 
        p.categoriaBase !== 'recepcao' && 
        p.role !== 'recepcao' && 
        p.status !== 'oculto' && 
        temAcessoClinica(user.clinicasAcesso, p.clinicasAcesso)
      ));
    });

    return () => { unsubAgenda(); unsubPac(); unsubProf(); };
  }, [user]);

  const verificarConflito = (d, h, pId, l, idIgnorar = null) => {
    return agendamentos.find(a => a.id !== idIgnorar && a.data === d && a.hora === h && a.status !== 'cancelado' && (a.profissionalId === pId || (a.local === l && !['Atendimento Domiciliar', 'Ginásio Clínico', 'Atendimento Hospitalar'].includes(l))));
  };

  const abrirFormEdicao = (agend) => {
    setIsLote(false);
    setAgendamentoEditando(agend.id);
    setForm({ 
        pacienteId: agend.pacienteId, pacienteNome: agend.paciente, tipo: agend.tipo, 
        data: agend.data, hora: agend.hora, local: agend.local, profissionalId: agend.profissionalId, 
        profissionalNome: agend.profissional, clinicaVinculo: agend.clinicaVinculo,
        valorSessao: agend.valorSessao || '' // PATCH 4.1: Recupera o valor se existir
    });
    setMostrarForm(true);
  };

  const fecharFormularioGeral = () => { 
      setMostrarForm(false); 
      setModoCancelamento(false); 
      setMostrandoConduta(false);
      setAgendamentoEditando(null); 
      setIsLote(false); 
  };

  const toggleDiaSemana = (dia) => {
    setLoteConfig(prev => ({
      ...prev,
      diasSemana: prev.diasSemana.includes(dia) ? prev.diasSemana.filter(d => d !== dia) : [...prev.diasSemana, dia]
    }));
  };

  const processarAgendamento = async (e) => {
    e.preventDefault();
    setCarregandoIA(true);
    
    const pacSelecionado = pacientes.find(p => p.id === form.pacienteId);
    const clinicaDoPac = Array.isArray(pacSelecionado?.clinicaVinculo) ? pacSelecionado.clinicaVinculo[0] : pacSelecionado?.clinicaVinculo;
    
    // Filtra o valorSessao para garantir que envia null/vazio se não foi preenchido
    const payload = { 
        ...form, 
        paciente: form.pacienteNome, 
        profissional: form.profissionalNome, 
        clinicaVinculo: clinicaDoPac,
        valorSessao: form.valorSessao ? String(form.valorSessao) : '' 
    };

    try {
      if (agendamentoEditando) {
        const conflito = verificarConflito(form.data, form.hora, form.profissionalId, form.local, agendamentoEditando);
        if (conflito) { alert("Conflito detectado!"); setCarregandoIA(false); return; }
        await updateDoc(doc(db, "agendamentos", agendamentoEditando), payload);
        alert("Alteração guardada!");
      } else if (!isLote) {
        const conflito = verificarConflito(form.data, form.hora, form.profissionalId, form.local);
        if (conflito) { alert("Conflito detectado!"); setCarregandoIA(false); return; }
        await addDoc(collection(db, "agendamentos"), { ...payload, status: 'pendente' });
        alert("Agendamento criado!");
      } else {
        if (loteConfig.diasSemana.length === 0) { alert("Selecione pelo menos um dia da semana."); setCarregandoIA(false); return; }
        
        let sessoesCriadas = 0;
        let dataAtual = new Date(form.data + 'T12:00:00');
        let listaNovos = [];

        while (sessoesCriadas < loteConfig.quantidade) {
          if (loteConfig.diasSemana.includes(dataAtual.getDay())) {
            const dIso = obterDataLocalISO(dataAtual);
            if (!verificarConflito(dIso, form.hora, form.profissionalId, form.local)) {
              listaNovos.push({
                ...payload,
                data: dIso,
                status: 'pendente',
                loteInfo: `${sessoesCriadas + 1}/${loteConfig.quantidade}`
              });
            }
            sessoesCriadas++;
          }
          dataAtual.setDate(dataAtual.getDate() + 1);
        }
        
        await Promise.all(listaNovos.map(item => addDoc(collection(db, "agendamentos"), item)));
        alert(`${listaNovos.length} sessões agendadas com sucesso!`);
      }
      fecharFormularioGeral();
    } catch (error) { alert("Erro ao processar agendamento."); }
    setCarregandoIA(false);
  };

  const aplicarExclusaoErro = async () => {
    if(window.confirm("Remover este erro de agendamento permanentemente?")) {
        await deleteDoc(doc(db, "agendamentos", agendamentoEditando)); 
        fecharFormularioGeral();
    }
  };

  const pacientesOrdenados = [...pacientes].sort((a, b) => a.nome.localeCompare(b.nome));
  const profissionaisOrdenados = [...profissionais].sort((a, b) => {
      if (a.id === user?.id) return -1;
      if (b.id === user?.id) return 1;
      return a.nome.localeCompare(b.nome);
  });
  
  const dias = (() => { const dArr = []; const inicio = new Date(dataSelecionada); inicio.setDate(inicio.getDate() - inicio.getDay()); for (let i = 0; i < 7; i++) { dArr.push(new Date(inicio)); inicio.setDate(inicio.getDate() + 1); } return dArr; })();
  const hoje = obterDataLocalISO(new Date());

  const agendamentoAtivo = agendamentos.find(a => a.id === agendamentoEditando);

  if (!user) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#00A1FF]" size={40}/></div>;

  return (
    <div className="flex flex-col space-y-4 animate-in fade-in relative h-[calc(100dvh-170px)] md:h-[calc(100vh-140px)]">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm shrink-0">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Agenda Clínica</h2>
        <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl w-full md:w-auto justify-between">
          <button onClick={() => { const d = new Date(dataSelecionada); d.setDate(d.getDate()-7); setDataSelecionada(d); }} className="p-2 hover:bg-white rounded-xl transition-colors"><ChevronLeft size={18}/></button>
          <button onClick={() => setDataSelecionada(new Date())} className="px-5 py-2 font-black text-[11px] uppercase">Hoje</button>
          <button onClick={() => { const d = new Date(dataSelecionada); d.setDate(d.getDate()+7); setDataSelecionada(d); }} className="p-2 hover:bg-white rounded-xl transition-colors"><ChevronRight size={18}/></button>
        </div>
        <button onClick={() => { setAgendamentoEditando(null); setForm({...form, data: hoje, valorSessao: ''}); setIsLote(false); setMostrarForm(true); }} className="w-full md:w-auto bg-[#00A1FF] text-white px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-100"><Plus size={18}/> Novo Agendamento</button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 flex-1 flex flex-col shadow-sm min-h-0 overflow-hidden">
        <div className="overflow-auto flex-1 w-full custom-scrollbar">
          <table className="w-full border-collapse min-w-[850px]">
            <thead className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md shadow-sm">
              <tr>
                <th className="p-3 border-b border-r text-left min-w-[130px] sticky left-0 bg-slate-50 z-40 shadow-[2px_0_5px_rgba(0,0,0,0.05)]"><span className="text-[10px] font-black text-slate-400 uppercase">Profissional</span></th>
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
                <tr key={prof.id} className={prof.id === user.id ? 'bg-blue-50/20' : ''}>
                  <td className="p-3 border-r border-b sticky left-0 bg-white z-20 shadow-[2px_0_5px_rgba(0,0,0,0.02)] align-top">
                    <div className="font-black text-slate-800 text-[11px] truncate flex items-center gap-1">
                        {prof.id === user.id && <div className="w-2 h-2 bg-green-500 rounded-full shrink-0"></div>}
                        <span className="truncate">{prof.nome}</span>
                    </div>
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
                          
                          const minutosAtuais = new Date().getHours() * 60 + new Date().getMinutes();
                          const dataAtualStr = obterDataLocalISO(new Date());
                          const isSessaoPassada = ag.data < dataAtualStr || (ag.data === dataAtualStr && getMinutos(ag.hora) < minutosAtuais);
                          const isSemEvolucao = isSessaoPassada && !isRealizado && !isCancelado;

                          const cardClasses = isCancelado 
                            ? 'bg-orange-50 border-orange-200 opacity-70'
                            : isConfirmado ? 'bg-[#e5f5ff] border-[#00A1FF] ring-1 ring-[#00A1FF]/30'
                            : 'bg-white border-blue-100 hover:border-[#00A1FF] hover:shadow-md';

                          return (
                            <div key={ag.id} onClick={() => abrirFormEdicao(ag)} className={`p-2 mb-1.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between min-h-[60px] relative animate-in fade-in zoom-in-95 ${cardClasses}`}>
                               {isSemEvolucao && <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" title="Pendente de Evolução SOAP"></div>}
                               {isRealizado && <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" title="Atendimento Realizado e Assinado"></div>}
                               
                               <div className="flex justify-between items-start">
                                  <span className={`text-[10px] font-black ${isSemEvolucao ? 'text-slate-800' : 'text-slate-700'}`}>{ag.hora}</span>
                                  {ag.exerciciosPlanejados?.length > 0 && <Lightbulb size={12} className={`text-amber-500 fill-amber-400/30 shrink-0 ${(isSemEvolucao || isRealizado) ? 'mr-3' : ''}`} />}
                               </div>
                               <div className={`font-black text-[10px] truncate uppercase ${isSemEvolucao ? 'text-slate-900' : 'text-[#0F214A]'}`}>{ag.paciente}</div>
                               <div className="text-[7px] font-black text-slate-400 uppercase truncate"><MapPin size={8} className="inline mr-0.5"/> {ag.local}</div>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto custom-scrollbar relative">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black uppercase text-[#0F214A] tracking-tighter">{agendamentoEditando ? 'Gerir Sessão' : 'Novo Agendamento'}</h3>
                <button onClick={fecharFormularioGeral} className="p-2 bg-slate-100 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X size={18}/></button>
             </div>
             
             {agendamentoEditando && !modoCancelamento && !mostrandoConduta && (
               <div className="flex flex-wrap gap-2 mb-6">
                 <button onClick={() => { fecharFormularioGeral(); navegarPara('pacientes', { pacienteId: form.pacienteId, atualizarStatusAgendamento: agendamentoEditando }); }} className="flex-1 bg-green-600 text-white py-3 px-4 rounded-xl font-black flex justify-center items-center gap-1.5 text-xs shadow-md">
                    <FileText size={14}/> Prontuário
                 </button>
                 
                 {agendamentoAtivo?.exerciciosPlanejados?.length > 0 && agendamentoAtivo?.profissionalId === user.id && (
                     <button onClick={() => setMostrandoConduta(true)} className="flex-1 bg-amber-400 text-[#0F214A] py-3 px-4 rounded-xl font-black flex justify-center items-center gap-1.5 text-xs shadow-md">
                        <Dumbbell size={14}/> Ver Conduta
                     </button>
                 )}
                 
                 <button onClick={() => setModoCancelamento(true)} className="flex-1 bg-orange-50 text-orange-600 py-3 px-4 rounded-xl font-bold flex justify-center items-center gap-1.5 text-xs border border-orange-200">
                    <Ban size={14}/> Cancelar Sessão
                 </button>
               </div>
             )}

             {mostrandoConduta && agendamentoAtivo && (
                 <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-2xl border border-blue-200 animate-in zoom-in-95">
                    <h4 className="font-black text-[#0F214A] mb-4 flex items-center gap-2"><Target size={18} className="text-[#00A1FF]"/> Conduta Planejada</h4>
                    <div className="space-y-2 mb-4">
                        {agendamentoAtivo.exerciciosPlanejados.map((ex, i) => (
                            <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                <span className="font-bold text-slate-800 text-sm">{ex.nome}</span>
                                <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{ex.series}x{ex.reps} {ex.carga ? `• ${ex.carga}` : ''}</span>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setMostrandoConduta(false)} className="w-full py-3 bg-white text-slate-600 rounded-xl font-bold text-sm border hover:bg-slate-50 transition-colors">Voltar</button>
                 </div>
             )}

             {modoCancelamento ? (
                 <div className="mb-6 p-5 bg-orange-50 border border-orange-200 rounded-2xl animate-in zoom-in-95">
                     <h4 className="font-black text-orange-800 mb-4 flex items-center gap-2"><Ban size={18}/> Categoria de Cancelamento</h4>
                     <div className="grid grid-cols-1 gap-2">
                         <button onClick={() => { updateDoc(doc(db, "agendamentos", agendamentoEditando), { status: 'cancelado', motivoCancelamento: 'Cancelamento > 24h (isento)' }); fecharFormularioGeral(); }} className="w-full text-left p-3 bg-white border border-orange-200 rounded-xl font-bold text-sm hover:bg-orange-100 transition-colors shadow-sm">Cancelamento &gt; 24 horas (isento)</button>
                         <button onClick={() => { updateDoc(doc(db, "agendamentos", agendamentoEditando), { status: 'cancelado', motivoCancelamento: 'Cancelamento < 24h' }); fecharFormularioGeral(); }} className="w-full text-left p-3 bg-white border border-orange-200 rounded-xl font-bold text-sm hover:bg-orange-100 transition-colors shadow-sm">Cancelamento &lt; 24 Horas</button>
                         <button onClick={() => { updateDoc(doc(db, "agendamentos", agendamentoEditando), { status: 'cancelado', motivoCancelamento: 'Falta sem justificativa' }); fecharFormularioGeral(); }} className="w-full text-left p-3 bg-white border border-orange-200 rounded-xl font-black text-red-600 hover:bg-orange-100 transition-colors shadow-sm">Falta sem justificativa</button>
                         <button onClick={aplicarExclusaoErro} className="w-full text-left p-3 mt-2 bg-red-50 border border-red-200 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors text-red-700 flex items-center justify-between shadow-sm"><span>Erro de agendamento (Apagar)</span> <Trash2 size={16}/></button>
                     </div>
                     <button onClick={() => setModoCancelamento(false)} className="w-full mt-4 p-3 font-bold text-slate-500 text-sm hover:bg-white rounded-xl transition-colors">Voltar</button>
                 </div>
             ) : !mostrandoConduta && (
                 <form onSubmit={processarAgendamento} className="space-y-4">
                    {!agendamentoEditando && (
                      <div className="flex bg-slate-100 p-1 rounded-2xl mb-2">
                        <button type="button" onClick={() => setIsLote(false)} className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${!isLote ? 'bg-white shadow-sm text-[#00A1FF]' : 'text-slate-500'}`}>SESSÃO ÚNICA</button>
                        <button type="button" onClick={() => setIsLote(true)} className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${isLote ? 'bg-[#0F214A] text-white shadow-sm' : 'text-slate-500'}`}>EM LOTE (PACOTE)</button>
                      </div>
                    )}

                    <select required className="w-full p-3.5 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#00A1FF] focus:bg-white transition-all" value={form.pacienteId} onChange={e => setForm({...form, pacienteId: e.target.value, pacienteNome: pacientes.find(p=>p.id===e.target.value)?.nome})}>
                      <option value="">Selecionar Paciente...</option>
                      {pacientesOrdenados.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <select required className="p-3.5 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#00A1FF] focus:bg-white" value={form.profissionalId} onChange={e => { const p = profissionais.find(x=>x.id===e.target.value); setForm({...form, profissionalId: p.id, profissionalNome: p.nome}); }}>
                          <option value="">Fisio / TO...</option>
                          {profissionaisOrdenados.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                      </select>
                      <select required className={`p-3.5 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#00A1FF] focus:bg-white`} value={form.local} onChange={e => setForm({...form, local: e.target.value})}>
                          <option value="">Sala / Local...</option>
                          {LOCAIS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>

                    <div className="p-5 bg-slate-50 rounded-3xl space-y-4 border border-slate-100">
                        {/* PATCH 4.1: Campo de Valor da Sessão incluído aqui */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-4 border-b border-slate-200">
                            <div className="space-y-1 sm:col-span-3">
                              <label className="text-[9px] font-black text-[#00A1FF] uppercase ml-1 flex items-center gap-1"><DollarSign size={12}/> Valor Personalizado (R$) - Opcional</label>
                              <input type="number" step="0.01" placeholder="Em branco = Valor Base do Paciente" className="p-3 bg-white rounded-xl font-bold text-sm w-full border border-blue-100 focus:border-[#00A1FF] focus:ring-2 focus:ring-blue-50 outline-none transition-all placeholder:text-slate-300" value={form.valorSessao} onChange={e => setForm({...form, valorSessao: e.target.value})} title="Preencha apenas se quiser cobrar um valor diferente do habitual nesta sessão." />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{isLote ? 'DATA INÍCIO' : 'DATA'}</label>
                              <input type="date" required className="p-3 bg-white rounded-xl font-bold text-sm w-full border border-slate-200" value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">HORÁRIO</label>
                              <input type="time" required className="p-3 bg-white rounded-xl font-bold text-sm w-full border border-slate-200" value={form.hora} onChange={e => setForm({...form, hora: e.target.value})} />
                            </div>
                        </div>

                        {isLote && (
                          <div className="space-y-4 animate-in slide-in-from-top-2">
                             <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">QUANTIDADE DE SESSÕES</label>
                                <input type="number" min="1" max="50" className="w-full p-3 bg-white rounded-xl font-black text-sm border border-slate-200" value={loteConfig.quantidade} onChange={e => setLoteConfig({...loteConfig, quantidade: parseInt(e.target.value)})} />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1 text-center block">DIAS DE ATENDIMENTO NA SEMANA</label>
                                <div className="flex justify-between gap-1">
                                  {[1,2,3,4,5,6].map(d => (
                                    <button key={d} type="button" onClick={() => toggleDiaSemana(d)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all border-2 ${loteConfig.diasSemana.includes(d) ? 'bg-[#0F214A] border-[#0F214A] text-white shadow-md' : 'bg-white border-slate-200 text-slate-400'}`}>
                                      {DIAS_NOMES[d].toUpperCase()}
                                    </button>
                                  ))}
                                </div>
                             </div>
                          </div>
                        )}
                    </div>

                    <button type="submit" disabled={carregandoIA} className={`w-full py-4 rounded-2xl font-black text-sm transition-all flex justify-center items-center gap-2 shadow-xl ${isLote ? 'bg-[#0F214A] text-white hover:bg-black' : 'bg-[#00A1FF] text-white hover:bg-blue-600'}`}>
                        {carregandoIA ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={18}/> {agendamentoEditando ? 'GUARDAR ALTERAÇÕES' : isLote ? 'GERAR PACOTE DE SESSÕES' : 'CONFIRMAR AGENDAMENTO'}</>}
                    </button>
                 </form>
             )}
          </div>
        </div>
      )}
    </div>
  );
}