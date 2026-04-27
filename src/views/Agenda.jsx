import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Plus, Trash2, X, ChevronLeft, ChevronRight,
  Layers, Loader2, Copy, User, MapPin, Sparkles, FileText, AlertTriangle, XCircle, AlertCircle
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
  const [modalCancelamento, setModalCancelamento] = useState(false); // NOVO ESTADO
  
  const [filaConflitos, setFilaConflitos] = useState([]);
  const [agendamentosBons, setAgendamentosBons] = useState([]);
  const [idxConflito, setIdxConflito] = useState(0);
  const [dualExistente, setDualExistente] = useState(null);
  const [dualNovo, setDualNovo] = useState(null);

  useEffect(() => {
    if (!user) return;
    const unsubAgenda = onSnapshot(collection(db, "agendamentos"), snap => {
      setAgendamentos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubPac = onSnapshot(collection(db, "pacientes"), snap => {
      setPacientes(snap.docs.map(d => ({ id: d.id, nome: d.data()?.nome || 'Paciente sem nome' })));
    });
    const unsubProf = onSnapshot(collection(db, "profissionais"), snap => {
      setProfissionais(snap.docs.map(d => ({ id: d.id, nome: d.data()?.nome || '', categoriaBase: d.data()?.categoriaBase || '' })).filter(p => p.nome));
    });
    return () => { unsubAgenda(); unsubPac(); unsubProf(); };
  }, [user]);

  const getNumeroSessao = (ag) => {
    const sessoesPaciente = agendamentos
      .filter(s => s.pacienteId === ag.pacienteId && s.status !== 'cancelado')
      .sort((a, b) => getMinutos(a.hora) - getMinutos(b.hora));
    const index = sessoesPaciente.findIndex(s => s.id === ag.id);
    return index + 1;
  };

  const verificarConflito = (d, h, pId, l, idIgnorar = null) => {
    return agendamentos.find(a => 
      a.id !== idIgnorar && a.data === d && a.hora === h && a.status !== 'cancelado' &&
      (a.profissionalId === pId || (a.local === l && l !== 'Atendimento Domiciliar' && l !== 'Ginásio Clínico'))
    );
  };

  const abrirFormEdicao = async (agend) => {
    setAgendamentoEditando(agend.id);
    setForm({ pacienteId: agend.pacienteId || '', pacienteNome: agend.paciente || '', tipo: agend.tipo || 'Atendimento', data: agend.data || '', hora: agend.hora || '', local: agend.local || '', profissionalId: agend.profissionalId || '', profissionalNome: agend.profissional || '' });
    setMostrarForm(true);
    try {
      const analise = await analisarCapacidadePaciente([]); 
      setInsightCapacidade(analise || "Sem histórico clínico.");
    } catch (e) { setInsightCapacidade("IA Indisponível."); }
  };

  const tentarSalvar = (e) => {
    e.preventDefault();
    if (!form.pacienteId || !form.profissionalId) return alert("Preencha tudo.");
    if (agendamentoEditando) {
      const pendentes = agendamentos.filter(a => a.pacienteId === form.pacienteId && a.id !== agendamentoEditando && (!a.status || a.status === 'pendente'));
      if (pendentes.length > 0) setModalEscopo({ open: true, type: 'edit' });
      else aplicarEdicao('unico');
    } else {
      processarNovoAgendamento();
    }
  };

  const tentarExcluir = (e) => {
    if (e) e.preventDefault();
    const pendentes = agendamentos.filter(a => a.pacienteId === form.pacienteId && a.id !== agendamentoEditando && (!a.status || a.status === 'pendente'));
    setModalCancelamento(false); // Fecha o modal de cancelamento
    if (pendentes.length > 0) {
        setModalEscopo({ open: true, type: 'delete' });
    } else {
        if(window.confirm("Apagar permanentemente este erro de agendamento da base de dados?")) {
           aplicarExclusao('unico');
        }
    }
  };

  // NOVA FUNÇÃO: Aplicar Status de Cancelamento
  const aplicarCancelamento = async (motivo) => {
    setCarregandoIA(true);
    try {
      await updateDoc(doc(db, "agendamentos", agendamentoEditando), {
         status: 'cancelado',
         motivoCancelamento: motivo,
         dataCancelamento: new Date().toISOString(),
         canceladoPor: user?.name || 'Equipe'
      });
      alert(`Sessão classificada como: ${motivo}.`);
      setModalCancelamento(false);
      setMostrarForm(false);
      setAgendamentoEditando(null);
    } catch (error) {
      alert("Erro ao cancelar o atendimento.");
    }
    setCarregandoIA(false);
  };

  const aplicarExclusao = async (escopo) => {
    setModalEscopo({ open: false, type: '' });
    setCarregandoIA(true);
    const refAtual = agendamentos.find(a => a.id === agendamentoEditando);
    let alvos = [refAtual];
    if (escopo !== 'unico') {
       const pendentes = agendamentos.filter(a => a.pacienteId === form.pacienteId && a.id !== agendamentoEditando && (!a.status || a.status === 'pendente'));
       if (escopo === 'futuros') alvos = [...alvos, ...pendentes.filter(a => a.data >= refAtual.data)];
       else if (escopo === 'todos') alvos = [...alvos, ...pendentes];
    }
    await Promise.all(alvos.map(a => deleteDoc(doc(db, "agendamentos", a.id))));
    alert(`${alvos.length} erro(s) de agendamento apagado(s) da base.`);
    setMostrarForm(false);
    setCarregandoIA(false);
  };

  const aplicarEdicao = async (escopo) => {
    setModalEscopo({ open: false, type: '' });
    setCarregandoIA(true);
    const refAtual = agendamentos.find(a => a.id === agendamentoEditando);
    let alvos = [refAtual];
    if (escopo !== 'unico') {
       const pendentes = agendamentos.filter(a => a.pacienteId === form.pacienteId && a.id !== agendamentoEditando && (!a.status || a.status === 'pendente'));
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
       setAgendamentosBons(novosBons); setFilaConflitos(novosConflitos); setIdxConflito(0); setMostrarForm(false);
    } else {
       await Promise.all(novosBons.map(ag => { const { originalId, isEdit, ...rest } = ag; return updateDoc(doc(db, "agendamentos", originalId), rest); }));
       setMostrarForm(false);
    }
    setCarregandoIA(false);
  };

  // CORREÇÃO DO LOTE: Limite de segurança e check de dias
  const processarNovoAgendamento = async () => {
      setCarregandoIA(true);
      let novosBons = [];
      let novosConflitos = [];
      
      if (!isLote) {
         const conflito = verificarConflito(form.data, form.hora, form.profissionalId, form.local);
         if (conflito) novosConflitos.push({ novo: { ...form }, existente: conflito });
         else novosBons.push({ ...form });
      } else {
         if (loteConfig.diasSemana.length === 0) {
            setCarregandoIA(false);
            return alert("Selecione pelo menos um dia da semana para agendar o lote!");
         }
         
         const [ano, mes, diaSplit] = form.data.split('-');
         let dt = new Date(ano, mes - 1, diaSplit, 12, 0, 0);
         let sessoesProcessadas = 0; 
         let limiteDeSeguranca = 0; // Proteção contra loop infinito
         
         while (sessoesProcessadas < loteConfig.quantidade && limiteDeSeguranca < 365) {
            limiteDeSeguranca++;
            if (loteConfig.diasSemana.includes(dt.getDay())) {
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
         setAgendamentosBons(novosBons); setFilaConflitos(novosConflitos); setIdxConflito(0); setMostrarForm(false);
      } else {
         await Promise.all(novosBons.map(ag => addDoc(collection(db, "agendamentos"), { ...ag, paciente: ag.pacienteNome, profissional: ag.profissionalNome, status: 'pendente' })));
         alert("Agendamento efetuado com sucesso!");
         setMostrarForm(false);
      }
      setCarregandoIA(false);
  };

  const resolverConflito = async (acao) => {
    setCarregandoIA(true);
    if (acao === 'salvar') {
        if (dualExistente && dualExistente.id) {
            await updateDoc(doc(db, "agendamentos", dualExistente.id), { data: dualExistente.data, hora: dualExistente.hora, profissionalId: dualExistente.profissionalId, local: dualExistente.local });
        }
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

  const rotearParaEvolucao = () => {
    const agendamento = agendamentos.find(a => a.id === agendamentoEditando);
    if (agendamento?.pacienteId) {
      setMostrarForm(false); navegarPara('pacientes', { pacienteId: agendamento.pacienteId, atualizarStatusAgendamento: agendamento.id });
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

  if (!user) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#00A1FF]" size={40}/></div>;

  return (
    <div className="flex flex-col h-full space-y-4 animate-in fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black text-[#0F214A] uppercase">{infoData.mes}</h2>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-[10px] font-black uppercase">Semana {infoData.semana}</span>
          <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black">Hoje: {agendamentos.filter(a => a.data === hoje && a.status !== 'cancelado').length} Sessões</span>
        </div>
        <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl">
          <button onClick={() => { const d = new Date(dataSelecionada); d.setDate(d.getDate()-7); setDataSelecionada(d); }} className="p-2 hover:bg-slate-200 rounded-lg transition-colors"><ChevronLeft size={18}/></button>
          <button onClick={() => setDataSelecionada(new Date())} className="px-5 py-2 font-black text-[11px] uppercase hover:bg-white rounded-lg transition-colors">Hoje</button>
          <button onClick={() => { const d = new Date(dataSelecionada); d.setDate(d.getDate()+7); setDataSelecionada(d); }} className="p-2 hover:bg-slate-200 rounded-lg transition-colors"><ChevronRight size={18}/></button>
        </div>
        <button onClick={() => { setAgendamentoEditando(null); setForm({...form, data: hoje}); setIsLote(false); setMostrarForm(true); }} className="bg-[#00A1FF] text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 text-sm shadow-md hover:bg-blue-500 transition-colors"><Plus size={18}/> Novo Agendamento</button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 flex-1 overflow-hidden flex flex-col shadow-sm">
        <div className="overflow-auto flex-1 relative custom-scrollbar">
          <table className="w-full border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md">
              <tr>
                <th className="p-3 border-b border-r text-left min-w-[140px] sticky left-0 bg-slate-50 z-40"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipe</span></th>
                {dias.map(dia => {
                  const iso = obterDataLocalISO(dia);
                  return (
                    <th key={iso} className={`p-2 border-b min-w-[150px] text-center ${iso === hoje ? 'bg-[#e5f5ff] border-b-4 border-b-[#00A1FF]' : ''}`}>
                      <div className={`text-[9px] font-black uppercase tracking-widest ${iso === hoje ? 'text-[#00A1FF]' : 'text-slate-400'}`}>{DIAS_NOMES[dia.getDay()]}</div>
                      <div className={`text-lg font-black ${iso === hoje ? 'text-[#0F214A]' : 'text-slate-800'}`}>{dia.getDate()}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {profissionais.map(prof => (
                <tr key={prof.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 border-r border-b sticky left-0 bg-white z-20 shadow-[2px_0_5px_rgba(0,0,0,0.02)] align-top">
                    <div className="font-black text-[#0F214A] text-[11px] leading-tight truncate">{prof.nome}</div>
                    <div className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 truncate tracking-widest">{prof.categoriaBase}</div>
                  </td>
                  {dias.map(dia => {
                    const iso = obterDataLocalISO(dia);
                    
                    // FILTRO: Não mostrar os cancelados na grelha da agenda!
                    const ags = agendamentos
                      .filter(a => a.data === iso && a.profissionalId === prof.id && a.status !== 'cancelado')
                      .sort((a,b) => getMinutos(a.hora) - getMinutos(b.hora));

                    return (
                      <td key={iso} className={`p-1.5 border-b border-r border-slate-100 align-top min-h-[100px] ${iso === hoje ? 'bg-blue-50/10' : ''}`}>
                        {ags.map(ag => (
                          <div key={ag.id} onClick={() => abrirFormEdicao(ag)} className={`p-2 mb-1.5 rounded-xl border cursor-pointer transition-all shadow-sm ${ag.status === 'realizado' ? 'bg-green-50 border-green-200 opacity-70 hover:opacity-100' : 'bg-white border-slate-200 hover:border-[#00A1FF]'}`}>
                            <div className="flex justify-between items-start mb-1 gap-1">
                              <span className={`text-[10px] font-black ${ag.status === 'realizado' ? 'text-green-700' : 'text-slate-700'}`}>{ag.hora}</span>
                              <span className={`px-1.5 py-0.5 rounded flex items-center gap-0.5 text-[8px] font-black shrink-0 ${ag.status === 'realizado' ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-[#00A1FF]'}`}>
                                <Layers size={8}/> {ag.pacoteInfo || `Sessão ${getNumeroSessao(ag)}`}
                              </span>
                            </div>
                            <div className="font-black text-[#0F214A] text-[10px] leading-tight truncate uppercase mb-1.5">{ag.paciente}</div>
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

      {/* JANELA MODAL DE CANCELAMENTO / MOTIVO */}
      {modalCancelamento && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[130]">
          <div className="bg-white p-8 rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95">
             <h3 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-2">
               <AlertCircle className="text-red-500" size={20}/> Cancelar Atendimento
             </h3>
             <p className="text-slate-500 font-medium mb-6 text-sm">
               Selecione o motivo para cancelar esta sessão. Apenas erros de agendamento apagam o registo da base de dados.
             </p>
             <div className="space-y-3">
                <button onClick={() => aplicarCancelamento('Cancelamento > 24h')} className="w-full p-4 rounded-xl border border-slate-200 hover:border-amber-500 font-bold text-slate-700 hover:bg-amber-50 text-left transition-all text-sm">Cancelamento Superior a 24h de prazo</button>
                <button onClick={() => aplicarCancelamento('Cancelamento < 24h')} className="w-full p-4 rounded-xl border border-slate-200 hover:border-orange-500 font-bold text-slate-700 hover:bg-orange-50 text-left transition-all text-sm">Cancelamento Inferior a 24h</button>
                <button onClick={() => aplicarCancelamento('Falta sem justificativa')} className="w-full p-4 rounded-xl border border-slate-200 hover:border-red-500 font-bold text-slate-700 hover:bg-red-50 text-left transition-all text-sm">Falta sem justificativa</button>
                
                <div className="h-px bg-slate-100 my-2"></div>
                
                <button onClick={() => tentarExcluir()} className="w-full p-4 rounded-xl border border-red-200 hover:border-red-600 font-black text-red-600 hover:bg-red-50 text-left transition-all text-sm flex items-center justify-between">
                  Erro de Agendamento <Trash2 size={16}/>
                </button>
             </div>
             <button onClick={() => setModalCancelamento(false)} className="w-full mt-6 py-3 font-bold text-slate-400 hover:text-slate-600 text-sm">Voltar à Edição</button>
          </div>
        </div>
      )}

      {/* JANELA DE EXCLUSÃO EM LOTE (Abre ao clicar no erro de agendamento) */}
      {modalEscopo.open && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[120]">
          <div className="bg-white p-8 rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95">
             <h3 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-2">
               <Copy className="text-[#00A1FF]" size={20}/> {modalEscopo.type === 'edit' ? 'Alterar Pacote?' : 'Apagar Múltiplas Sessões?'}
             </h3>
             <p className="text-slate-500 font-medium mb-6 text-sm">
               {modalEscopo.type === 'edit' ? 'Deseja aplicar a mudança de horário, profissional e sala para outras sessões pendentes deste paciente?' : 'Sendo um erro, você deseja excluir também as outras sessões futuras que foram agendadas?'}
             </p>
             <div className="space-y-2">
                <button onClick={() => modalEscopo.type === 'edit' ? aplicarEdicao('unico') : aplicarExclusao('unico')} className="w-full p-4 rounded-xl border border-slate-200 hover:border-[#00A1FF] font-black text-slate-700 hover:bg-blue-50 text-left transition-all text-sm">Apenas nesta sessão</button>
                <button onClick={() => modalEscopo.type === 'edit' ? aplicarEdicao('futuros') : aplicarExclusao('futuros')} className="w-full p-4 rounded-xl border border-slate-200 hover:border-[#00A1FF] font-black text-slate-700 hover:bg-blue-50 text-left transition-all text-sm">Nesta e nas próximas sessões</button>
                <button onClick={() => modalEscopo.type === 'edit' ? aplicarEdicao('todos') : aplicarExclusao('todos')} className="w-full p-4 rounded-xl border border-slate-200 hover:border-[#00A1FF] font-black text-slate-700 hover:bg-blue-50 text-left transition-all text-sm">Em todas as sessões pendentes</button>
             </div>
             <button onClick={() => setModalEscopo({open: false, type: ''})} className="w-full mt-4 py-3 font-bold text-slate-400 hover:text-slate-600 text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* JANELA DE CONFLITOS DE AGENDA DUPLA */}
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

                          <div className="bg-blue-50 p-5 rounded-[20px] border border-[#00A1FF]/30">
                              <span className="text-[9px] font-black uppercase text-[#00A1FF] tracking-widest bg-blue-100 px-2 py-1 rounded">Tentativa (Novo)</span>
                              <h4 className="text-lg font-black text-[#0F214A] mt-3 mb-3">{dualNovo.pacienteNome || dualNovo.paciente}</h4>
                              <div className="space-y-2">
                                  <input type="date" value={dualNovo.data} onChange={e => setDualNovo({...dualNovo, data: e.target.value})} className="w-full p-3 rounded-lg border border-transparent focus:border-[#00A1FF] font-bold text-xs bg-white outline-none shadow-sm" />
                                  <input type="time" value={dualNovo.hora} onChange={e => setDualNovo({...dualNovo, hora: e.target.value})} className="w-full p-3 rounded-lg border border-transparent focus:border-[#00A1FF] font-bold text-xs bg-white outline-none shadow-sm" />
                                  <select value={dualNovo.profissionalId} onChange={e => { const p = profissionais.find(x=>x.id===e.target.value); setDualNovo({...dualNovo, profissionalId: p.id, profissionalNome: p.nome}); }} className="w-full p-3 rounded-lg border border-transparent focus:border-[#00A1FF] font-bold text-xs bg-white outline-none shadow-sm">
                                      {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                  </select>
                                  <select value={dualNovo.local} onChange={e => setDualNovo({...dualNovo, local: e.target.value})} className="w-full p-3 rounded-lg border border-transparent focus:border-[#00A1FF] font-bold text-xs bg-white outline-none shadow-sm">
                                      {LOCAIS.map(l => <option key={l} value={l}>{l}</option>)}
                                  </select>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="mt-6 flex flex-col md:flex-row gap-3 shrink-0">
                      <button onClick={() => resolverConflito('pular')} disabled={carregandoIA} className="flex-1 py-3 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-colors text-sm">Pular Janela 2</button>
                      <button onClick={() => resolverConflito('salvar')} disabled={carregandoIA} className="flex-[2] bg-[#0F214A] text-white font-black rounded-xl hover:bg-[#00A1FF] transition-all flex items-center justify-center gap-2 shadow-lg text-sm">
                          {carregandoIA ? <Loader2 className="animate-spin" size={16} /> : 'Salvar Alterações'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* JANELA DE GERENCIAMENTO DE SESSÃO / CRIAR NOVO */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black uppercase text-[#0F214A]">{agendamentoEditando ? 'Gerir Sessão' : 'Novo Agendamento'}</h3>
                <button onClick={()=>setMostrarForm(false)} className="p-2 bg-slate-100 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X size={18}/></button>
             </div>
             
             {agendamentoEditando && (
               <div className="flex gap-2 mb-6">
                 <button onClick={rotearParaEvolucao} className="flex-[2] bg-green-500 text-white py-3 rounded-xl font-black flex justify-center items-center gap-2 shadow-md hover:bg-green-600 transition-colors text-sm">
                   <FileText size={16}/> Abrir Prontuário
                 </button>
                 {hasAccess(['gestor_clinico', 'recepcao']) && (
                   <button onClick={() => setModalCancelamento(true)} className="px-4 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors border border-red-100 flex items-center gap-2 text-sm">
                     <XCircle size={16}/> Cancelar / Erro
                   </button>
                 )}
               </div>
             )}

             <form onSubmit={tentarSalvar} className="space-y-4">
                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-2">Paciente</label>
                   <select required className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 text-sm outline-none border-2 border-transparent focus:border-[#00A1FF] transition-all" value={form.pacienteId} onChange={e => setForm({...form, pacienteId: e.target.value, pacienteNome: pacientes.find(p=>p.id===e.target.value)?.nome})}>
                     <option value="">Selecionar Paciente...</option>
                     {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                   </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-2">Profissional</label>
                     <select required className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 text-sm outline-none border-2 border-transparent focus:border-[#00A1FF] transition-all" value={form.profissionalId} onChange={e => { const p = profissionais.find(x=>x.id===e.target.value); setForm({...form, profissionalId: p.id, profissionalNome: p.nome}); }}>
                        <option value="">Fisioterapeuta...</option>
                        {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                     </select>
                  </div>
                  <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-2">Sala / Local</label>
                     <select required className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 text-sm outline-none border-2 border-transparent focus:border-[#00A1FF] transition-all" value={form.local} onChange={e => setForm({...form, local: e.target.value})}>
                        <option value="">Local...</option>
                        {LOCAIS.map(l => <option key={l} value={l}>{l}</option>)}
                     </select>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-200 mt-2">
                   {!agendamentoEditando && (
                     <div className="flex items-center justify-between mb-5 border-b border-slate-200 pb-4">
                       <span className="font-black text-sm text-[#0F214A]">Agendar Pacote (Lote)</span>
                       <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={isLote} onChange={e => setIsLote(e.target.checked)} />
                          <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00A1FF] shadow-inner"></div>
                       </label>
                     </div>
                   )}
                   
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-2">Data Inicial</label>
                         <input type="date" className="w-full p-4 bg-white rounded-2xl font-bold text-slate-700 text-sm outline-none border-2 border-transparent focus:border-[#00A1FF] transition-all shadow-sm" value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
                      </div>
                      <div>
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-2">Hora</label>
                         <input type="time" className="w-full p-4 bg-white rounded-2xl font-bold text-slate-700 text-sm outline-none border-2 border-transparent focus:border-[#00A1FF] transition-all shadow-sm" value={form.hora} onChange={e => setForm({...form, hora: e.target.value})} />
                      </div>
                   </div>
                   
                   {isLote && !agendamentoEditando && (
                     <div className="mt-5 pt-5 border-t border-slate-200 animate-in fade-in duration-300">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block text-center">Quais dias da semana?</label>
                        <div className="flex gap-2 mb-5 justify-center">
                          {[1,2,3,4,5,6].map(d => (
                            <button key={d} type="button" onClick={() => setLoteConfig(prev => ({ ...prev, diasSemana: prev.diasSemana.includes(d) ? prev.diasSemana.filter(x=>x!==d) : [...prev.diasSemana, d] }))} className={`w-10 h-10 flex items-center justify-center rounded-full font-black text-xs transition-all shadow-sm ${loteConfig.diasSemana.includes(d) ? 'bg-[#00A1FF] text-white scale-110' : 'bg-white border border-slate-200 text-slate-400 hover:bg-blue-50'}`}>
                              {DIAS_NOMES[d].charAt(0)}
                            </button>
                          ))}
                        </div>
                        
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-2">Total de Sessões no Pacote</label>
                        <input type="number" min="2" max="100" className="w-full p-4 rounded-2xl border-2 border-transparent outline-none focus:border-[#00A1FF] font-black text-slate-700 bg-white text-lg text-center shadow-sm" value={loteConfig.quantidade} onChange={e => setLoteConfig({...loteConfig, quantidade: parseInt(e.target.value)})}/>
                     </div>
                   )}
                </div>

                <button type="submit" disabled={carregandoIA} className="w-full bg-[#0F214A] text-white py-5 rounded-[24px] font-black text-lg hover:bg-[#00A1FF] transition-all mt-4 shadow-xl flex items-center justify-center">
                  {carregandoIA ? <Loader2 className="animate-spin" size={24} /> : (agendamentoEditando ? 'Guardar Alterações' : 'Confirmar Agendamento')}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}