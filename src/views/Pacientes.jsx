import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, X, ChevronLeft, Award, Smartphone, CreditCard,
  Trash2, Edit3, DollarSign, Sparkles, Download, 
  TrendingDown, History, Info, Loader2, FileText, CalendarClock, Dumbbell, Target
} from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { realizarAnaliseIAHistorico, transcreverExameIA } from '../services/geminiService';

const GRUPOS_MUSCULARES = [
  'Cervical', 'Ombros / Manguito', 'Dorsal / Escápulas', 'Peitoral', 
  'Core / Abdômen', 'Lombar', 'Pelve / Quadril', 'Coxas / Isquiotibiais', 
  'Joelhos', 'Panturrilhas / Tornozelos', 'Membros Superiores (Geral)'
];

export default function Pacientes({ pacientes, hasAccess, user, navParams }) {
  const [termoBusca, setTermoBusca] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [tabAtiva, setTabAtiva] = useState('historico'); 
  
  const [evolucoes, setEvolucoes] = useState([]);
  const [novoSoap, setNovoSoap] = useState('');
  const [metricaPain, setMetricaPain] = useState(5); 
  const [editandoEvolucaoId, setEditandoEvolucaoId] = useState(null);

  const [editando, setEditando] = useState(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  
  const [analiseIA, setAnaliseIA] = useState('');
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [exameProcessando, setExameProcessando] = useState(false);
  const [laudoExame, setLaudoExame] = useState('');

  const [planoTratamento, setPlanoTratamento] = useState([]);
  const [novoExercicio, setNovoExercicio] = useState({ musculo: '', nome: '', carga: '', series: '3', reps: '10' });

  const [novoPaciente, setNovoPaciente] = useState({
    nome: '', cpf: '', whatsapp: '', emergencia: '', valor: '', observacoes: ''
  });

  const paramConsumido = useRef(false);

  useEffect(() => {
    if (navParams?.pacienteId && !paramConsumido.current && pacientes.length > 0) {
      const p = pacientes.find(x => x.id === navParams.pacienteId);
      if (p) {
        setPacienteSelecionado(p);
        setTabAtiva('historico');
        paramConsumido.current = true;
      }
    }
  }, [navParams, pacientes]);

  useEffect(() => {
     paramConsumido.current = false;
  }, [navParams]);


  const salvarPaciente = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await updateDoc(doc(db, "pacientes", editando), novoPaciente);
        alert("Dados atualizados!");
      } else {
        await addDoc(collection(db, "pacientes"), { ...novoPaciente, dataCadastro: new Date().toISOString(), status: 'ativo' });
        alert("Paciente cadastrado!");
      }
      setMostrarForm(false); setEditando(null); setNovoPaciente({ nome: '', cpf: '', whatsapp: '', emergencia: '', valor: '', observacoes: '' });
    } catch (error) { alert("Erro ao salvar."); }
  };

  const abrirEdicao = (p) => {
    setEditando(p.id);
    setNovoPaciente({ nome: p.nome, cpf: p.cpf, whatsapp: p.whatsapp, emergencia: p.emergencia, valor: p.valor, observacoes: p.observacoes || '' });
    setMostrarForm(true);
  };

  const excluirPaciente = async (id) => {
    // CORREÇÃO: A RECEPÇÃO AGORA PODE APAGAR PACIENTES
    if (!hasAccess(['gestor_clinico', 'recepcao'])) return alert("Sem permissão para apagar registros.");
    if (confirmarExclusao) {
      await deleteDoc(doc(db, "pacientes", id));
      setPacienteSelecionado(null);
      setConfirmarExclusao(false);
      alert("Registro removido permanentemente.");
    } else {
      setConfirmarExclusao(true);
    }
  };

  const dispararAnaliseIA = async () => {
    setCarregandoIA(true);
    const analise = await realizarAnaliseIAHistorico(pacienteSelecionado.nome, evolucoes);
    setAnaliseIA(analise);
    setTabAtiva('ia');
    setCarregandoIA(false);
  };

  const handleUploadExame = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExameProcessando(true);
    setLaudoExame(''); 
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64 = reader.result.split(',')[1];
        const resultado = await transcreverExameIA(base64);
        setLaudoExame(resultado);
      } catch (error) { alert("Erro ao processar exame."); }
      setExameProcessando(false);
    };
  };

  useEffect(() => {
    if (pacienteSelecionado) {
      const qEvo = query(collection(db, "pacientes", pacienteSelecionado.id, "evolucoes"), orderBy("data", "desc"));
      const unsubEvo = onSnapshot(qEvo, (snapshot) => {
        setEvolucoes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const qPlano = query(collection(db, "pacientes", pacienteSelecionado.id, "plano_tratamento"));
      const unsubPlano = onSnapshot(qPlano, (snapshot) => {
        setPlanoTratamento(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      setLaudoExame('');
      setAnaliseIA('');
      setEditandoEvolucaoId(null);
      setNovoSoap('');
      
      return () => { unsubEvo(); unsubPlano(); };
    }
  }, [pacienteSelecionado]);

  const iniciarEdicaoEvolucao = (evo) => {
    setNovoSoap(evo.texto);
    setMetricaPain(evo.metricaPain || 5);
    setEditandoEvolucaoId(evo.id);
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const salvarEvolucao = async () => {
    if (!novoSoap) return alert("Escreva algo antes de salvar.");
    try {
      if (editandoEvolucaoId) {
        await updateDoc(doc(db, "pacientes", pacienteSelecionado.id, "evolucoes", editandoEvolucaoId), {
          texto: novoSoap, metricaPain, dataEdicao: new Date().toISOString() 
        });
        alert("Evolução atualizada com sucesso!");
      } else {
        await addDoc(collection(db, "pacientes", pacienteSelecionado.id, "evolucoes"), {
          texto: novoSoap, data: new Date().toISOString(), profissional: user?.name, metricaPain
        });
        if (navParams?.atualizarStatusAgendamento) {
          await updateDoc(doc(db, "agendamentos", navParams.atualizarStatusAgendamento), { status: 'realizado' });
        }
        alert("Evolução guardada com sucesso!");
      }
      setNovoSoap(''); setEditandoEvolucaoId(null); setMetricaPain(5);
    } catch (e) { alert("Erro ao salvar evolução."); }
  };

  const adicionarExercicio = async (e) => {
    e.preventDefault();
    if(!novoExercicio.musculo || !novoExercicio.nome) return alert("Preencha o Músculo e o Exercício.");
    try {
      await addDoc(collection(db, "pacientes", pacienteSelecionado.id, "plano_tratamento"), {
        ...novoExercicio, dataInclusao: new Date().toISOString(), profissional: user?.name || 'Equipe'
      });
      setNovoExercicio({ musculo: '', nome: '', carga: '', series: '3', reps: '10' });
    } catch (e) { alert("Erro ao adicionar exercício."); }
  };

  const removerExercicio = async (id) => {
    if(window.confirm("Remover este exercício do plano?")) {
      await deleteDoc(doc(db, "pacientes", pacienteSelecionado.id, "plano_tratamento", id));
    }
  };

  const filtrados = (pacientes || []).filter(p => (p.nome || '').toLowerCase().includes(termoBusca.toLowerCase()));

  const abasDisponiveis = [
    { id: 'historico', icon: History, label: 'Histórico Clínico', restrito: false },
    { id: 'plano', icon: Dumbbell, label: 'Plano de Tratamento', restrito: false },
    { id: 'financeiro', icon: DollarSign, label: 'Financeiro', restrito: true },
    { id: 'dados', icon: Info, label: 'Arquivos e Exames', restrito: false },
    { id: 'ia', icon: Sparkles, label: 'Agente IA', restrito: false }
  ];

  if (pacienteSelecionado) {
    const historicoEVAReal = [...evolucoes]
       .filter(e => e.metricaPain !== undefined && e.metricaPain !== null)
       .reverse()
       .slice(-10);

    const planoAgrupado = GRUPOS_MUSCULARES.reduce((acc, musculo) => {
        const exs = planoTratamento.filter(e => e.musculo === musculo);
        if(exs.length > 0) acc[musculo] = exs;
        return acc;
    }, {});
    
    const musculosUsados = [...new Set(planoTratamento.map(e => e.musculo))];
    musculosUsados.forEach(m => {
        if(!GRUPOS_MUSCULARES.includes(m)) {
            const exs = planoTratamento.filter(e => e.musculo === m);
            if(exs.length > 0) planoAgrupado[m] = exs;
        }
    });

    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 pb-28">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button onClick={() => {setPacienteSelecionado(null); setTabAtiva('historico');}} className="flex items-center text-slate-500 font-bold hover:text-blue-600 transition-colors">
            <ChevronLeft className="mr-1"/> Voltar para a Base
          </button>
          <div className="flex gap-2">
            <button onClick={() => abrirEdicao(pacienteSelecionado)} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 shadow-sm"><Edit3 size={18} className="text-slate-600"/></button>
            <button onClick={() => dispararAnaliseIA()} className="p-3 bg-[#1a1b1e] text-white rounded-2xl hover:bg-black shadow-lg flex items-center gap-2">
              {carregandoIA ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18} className="text-blue-400"/>}
              <span className="text-xs font-bold">Analisar com IA</span>
            </button>
            {/* CORREÇÃO: A RECEPÇÃO AGORA VÊ E PODE USAR O BOTÃO DE EXCLUIR */}
            {(hasAccess(['gestor_clinico', 'recepcao'])) && (
              <button onClick={() => excluirPaciente(pacienteSelecionado.id)} className={`p-3 rounded-2xl border shadow-sm transition-colors ${confirmarExclusao ? 'bg-red-600 text-white' : 'bg-white text-red-500 hover:bg-red-50'}`}>
                {confirmarExclusao ? 'Clique para confirmar' : <Trash2 size={18}/>}
              </button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
            <h2 className="text-3xl font-black text-slate-900">{pacienteSelecionado.nome}</h2>
            <div className="flex flex-wrap gap-4 mt-3 text-slate-500 text-xs font-bold uppercase tracking-widest">
              <span className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center"><Smartphone size={12} className="mr-1.5"/> {pacienteSelecionado.whatsapp}</span>
              <span className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center"><CreditCard size={12} className="mr-1.5"/> {pacienteSelecionado.cpf}</span>
              {hasAccess(['gestor_clinico', 'admin_fin']) && (
                <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl border border-blue-100">Sessão: R$ {pacienteSelecionado.valor}</span>
              )}
            </div>
          </div>
          
          <div className="bg-[#1a1b1e] text-white p-8 rounded-[32px] shadow-xl relative overflow-hidden">
             <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-4">Evolução de Dor Real (EVA)</p>
             {historicoEVAReal.length > 0 ? (
                 <div className="flex items-end gap-1.5 h-12">
                    {historicoEVAReal.map((evo, i) => (
                      <div 
                        key={i} 
                        title={`Data: ${new Date(evo.data).toLocaleDateString()} - Dor: ${evo.metricaPain}`}
                        className="flex-1 bg-blue-500 rounded-t-md opacity-50 hover:opacity-100 transition-opacity relative group cursor-pointer" 
                        style={{height: `${Math.max(evo.metricaPain * 10, 5)}%`}}
                      >
                         <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white text-slate-900 text-[9px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            {evo.metricaPain}
                         </span>
                      </div>
                    ))}
                 </div>
             ) : (
                 <div className="flex items-center justify-center h-12 border-2 border-dashed border-slate-700 rounded-xl">
                    <span className="text-xs font-bold text-slate-500">Nenhum dado registrado.</span>
                 </div>
             )}
             <p className="mt-4 text-xs font-bold text-blue-300 flex items-center"><TrendingDown size={14} className="mr-1"/> Gráfico Cronológico</p>
          </div>
        </div>

        <div className="flex border-b border-slate-200 overflow-x-auto custom-scrollbar pb-1">
          {abasDisponiveis.map(tab => {
            if (tab.restrito && !hasAccess(['gestor_clinico', 'admin_fin'])) return null;
            return (
              <button 
                key={tab.id}
                onClick={() => setTabAtiva(tab.id)}
                className={`px-6 py-4 flex items-center gap-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${tabAtiva === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                <tab.icon size={16}/> {tab.label}
              </button>
            )
          })}
        </div>

        <div className="mt-6">
          {tabAtiva === 'historico' && (
            <div className="space-y-6">
               <div className={`p-8 rounded-[32px] border transition-colors ${editandoEvolucaoId ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-100'}`}>
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
                    <h3 className={`font-bold ${editandoEvolucaoId ? 'text-amber-900' : 'text-blue-900'}`}>
                      {editandoEvolucaoId ? 'Editando Evolução' : 'Nova Evolução Clínica'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3">
                      {editandoEvolucaoId && (
                        <button onClick={() => {setEditandoEvolucaoId(null); setNovoSoap(''); setMetricaPain(5);}} className="text-xs font-black text-amber-600 hover:text-amber-800 underline">Cancelar Edição</button>
                      )}
                      <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-blue-200 shadow-sm w-full md:w-auto">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Escala EVA: {metricaPain}</span>
                        <input type="range" min="0" max="10" className="w-24 cursor-pointer accent-blue-600" value={metricaPain} onChange={e => setMetricaPain(e.target.value)}/>
                      </div>
                    </div>
                  </div>
                  <textarea className="w-full border-2 border-white rounded-2xl p-5 h-32 mb-4 outline-none focus:border-blue-500 bg-white/80 font-medium text-slate-700" placeholder="Descreva o atendimento..." value={novoSoap} onChange={e => setNovoSoap(e.target.value)} />
                  <div className="flex gap-3">
                    <button onClick={salvarEvolucao} className={`${editandoEvolucaoId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'} text-white px-8 py-3 rounded-xl font-black shadow-lg transition-colors w-full md:w-auto`}>
                      {editandoEvolucaoId ? 'Guardar Alterações' : 'Assinar Registro'}
                    </button>
                  </div>
               </div>
               
               <div className="space-y-4">
                  {evolucoes.map(evo => (
                    <div key={evo.id} className={`bg-white p-6 rounded-[24px] border shadow-sm transition-all ${editandoEvolucaoId === evo.id ? 'border-amber-400 ring-4 ring-amber-50' : 'border-slate-100 hover:border-blue-200'}`}>
                      <div className="flex justify-between mb-4">
                        <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{evo.texto}</p>
                        {evo.metricaPain !== undefined && <div className="text-red-500 font-black text-lg bg-red-50 px-3 py-1 rounded-xl h-fit shrink-0 ml-4">EVA {evo.metricaPain}</div>}
                      </div>
                      
                      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 text-[10px] font-bold text-slate-400 border-t border-slate-100 pt-4 mt-2">
                        <div className="flex items-center gap-2">
                           <CalendarClock size={14} className="text-slate-300 shrink-0"/>
                           <span className="uppercase tracking-widest text-slate-500">
                             Atendimento: <span className="text-slate-700">{new Date(evo.data).toLocaleDateString('pt-BR')}</span> às {new Date(evo.data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                           </span>
                           {evo.dataEdicao && <span className="italic text-slate-300 ml-1">(Editado)</span>}
                        </div>
                        
                        <div className="flex items-center gap-4 self-end md:self-auto">
                           <button onClick={() => iniciarEdicaoEvolucao(evo)} className="text-blue-500 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg transition-colors">
                             <Edit3 size={12}/> Editar
                           </button>
                           <span className="text-blue-600 uppercase flex items-center gap-1"><Award size={12}/> {evo.profissional}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {evolucoes.length === 0 && <p className="text-center text-slate-400 font-bold p-10">Nenhum histórico encontrado.</p>}
               </div>
            </div>
          )}

          {tabAtiva === 'plano' && (
             <div className="space-y-6 animate-in slide-in-from-bottom-4">
                <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm">
                   <h3 className="font-black text-slate-800 mb-6 flex items-center"><Target className="text-blue-600 mr-2"/> Prescrição de Exercícios</h3>
                   
                   <form onSubmit={adicionarExercicio} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-8">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                         <div className="md:col-span-1">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Foco Muscular</label>
                           <select required className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-bold text-slate-700 text-sm" value={novoExercicio.musculo} onChange={e => setNovoExercicio({...novoExercicio, musculo: e.target.value})}>
                              <option value="">Selecione...</option>
                              {GRUPOS_MUSCULARES.map(m => <option key={m} value={m}>{m}</option>)}
                           </select>
                         </div>
                         <div className="md:col-span-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Exercício / Aparelho</label>
                           <input required type="text" placeholder="Ex: Supino Reto" className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-bold text-slate-700 text-sm" value={novoExercicio.nome} onChange={e => setNovoExercicio({...novoExercicio, nome: e.target.value})}/>
                         </div>
                         <div className="md:col-span-1">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Carga</label>
                           <input type="text" placeholder="Ex: 10kg" className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-bold text-slate-700 text-sm" value={novoExercicio.carga} onChange={e => setNovoExercicio({...novoExercicio, carga: e.target.value})}/>
                         </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 mt-4 items-center justify-between md:justify-start">
                         <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-slate-200">
                           <label className="text-xs font-bold text-slate-500">Séries:</label>
                           <input type="number" min="1" className="w-12 text-center font-black outline-none bg-transparent" value={novoExercicio.series} onChange={e => setNovoExercicio({...novoExercicio, series: e.target.value})}/>
                         </div>
                         <span className="text-slate-400 font-black">X</span>
                         <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-slate-200">
                           <label className="text-xs font-bold text-slate-500">Reps/Tempo:</label>
                           <input type="text" className="w-16 text-center font-black outline-none bg-transparent" value={novoExercicio.reps} onChange={e => setNovoExercicio({...novoExercicio, reps: e.target.value})}/>
                         </div>
                         
                         <button type="submit" className="w-full md:w-auto md:ml-auto bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black hover:bg-blue-700 transition-colors shadow-md text-sm">Adicionar ao Plano</button>
                      </div>
                   </form>

                   {Object.keys(planoAgrupado).length > 0 ? (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {Object.entries(planoAgrupado).map(([musculo, exercicios]) => (
                             <div key={musculo} className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                <div className="bg-slate-50 border-b border-slate-100 p-3 flex justify-between items-center">
                                   <h4 className="font-black text-slate-700 text-sm uppercase tracking-wide">{musculo}</h4>
                                   <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{exercicios.length} exer.</span>
                                </div>
                                <ul className="divide-y divide-slate-50">
                                   {exercicios.map(ex => (
                                      <li key={ex.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-start group">
                                         <div>
                                            <p className="font-bold text-slate-800 leading-tight">{ex.nome}</p>
                                            <div className="flex items-center gap-3 mt-2 text-xs font-bold text-slate-500">
                                               {ex.carga && <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-100">Carga: {ex.carga}</span>}
                                               <span>{ex.series} séries de {ex.reps}</span>
                                            </div>
                                         </div>
                                         <button onClick={() => removerExercicio(ex.id)} className="text-slate-300 hover:text-red-500 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all p-1"><Trash2 size={16}/></button>
                                      </li>
                                   ))}
                                </ul>
                             </div>
                          ))}
                       </div>
                   ) : (
                       <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                          <Dumbbell size={40} className="mx-auto text-slate-300 mb-3"/>
                          <p className="font-bold text-slate-500">Nenhum exercício prescrito.</p>
                       </div>
                   )}
                </div>
             </div>
          )}

          {tabAtiva === 'financeiro' && hasAccess(['gestor_clinico', 'admin_fin']) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2">
               <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                  <h3 className="font-black text-slate-800 mb-6 flex items-center"><DollarSign className="text-green-600 mr-2"/> Extrato de Cobrança</h3>
                  <div className="space-y-4">
                     <div className="flex justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-sm font-bold text-slate-600">Sessões Realizadas</span>
                        <span className="font-black text-slate-900">R$ {(pacienteSelecionado.valor * evolucoes.length).toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between p-5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
                        <span className="text-sm font-black">Total em Aberto</span>
                        <span className="font-black text-2xl">R$ {(pacienteSelecionado.valor * evolucoes.length).toFixed(2)}</span>
                     </div>
                  </div>
                  <button className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-black transition-colors flex items-center justify-center gap-2"><Download size={20}/> Gerar Fatura PDF</button>
               </div>
            </div>
          )}

          {tabAtiva === 'dados' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
              <div className="bg-white p-6 md:p-10 rounded-[32px] border border-slate-100 shadow-sm">
                <h3 className="font-black text-slate-800 mb-6 flex items-center"><FileText className="mr-2 text-blue-600"/> Arquivos e Exames</h3>
                <div className="bg-slate-50 p-6 md:p-10 rounded-[24px] border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-center hover:bg-slate-100 transition-colors">
                  <input type="file" id="exame" className="hidden" onChange={handleUploadExame} accept="image/*,application/pdf" />
                  <label htmlFor="exame" className="cursor-pointer bg-slate-900 text-white px-6 py-4 rounded-xl font-black flex items-center gap-3 hover:scale-105 transition-all shadow-lg text-sm">
                    {exameProcessando ? <Loader2 className="animate-spin"/> : <Plus/>} 
                    {exameProcessando ? 'A Analisar Exame...' : 'Anexar Ficheiro de Exame'}
                  </label>
                  <p className="text-xs text-slate-500 mt-4 font-bold">A Inteligência Artificial transcreverá os dados numéricos.</p>
                </div>
                {laudoExame && (
                  <div className="mt-8 bg-blue-50 p-6 md:p-8 rounded-[32px] border border-blue-100 animate-in zoom-in-95">
                    <h4 className="font-black text-blue-900 mb-6 flex items-center gap-2 border-b border-blue-200 pb-4">
                      <Sparkles className="text-blue-600"/> Laudo Transcrito (IA)
                    </h4>
                    <div className="prose prose-blue prose-sm max-w-none text-slate-700 font-medium">
                      {laudoExame.split('\n').map((linha, i) => <p key={i} className="mb-2 leading-relaxed">{linha}</p>)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tabAtiva === 'ia' && (
            <div className="bg-slate-900 text-white p-6 md:p-10 rounded-[40px] shadow-2xl relative overflow-hidden min-h-[500px]">
              <div className="relative z-10">
                <h3 className="text-2xl font-black mb-8 flex items-center gap-4"><Sparkles className="text-blue-400" size={32}/> Análise do Agente IA</h3>
                {carregandoIA ? (
                  <div className="flex flex-col items-center justify-center h-64">
                    <Loader2 className="animate-spin text-blue-400 mb-4" size={48}/>
                    <p className="font-black animate-pulse uppercase tracking-widest text-xs">A ler histórico completo...</p>
                  </div>
                ) : analiseIA ? (
                  <div className="prose prose-invert prose-blue max-w-none text-slate-300 font-medium leading-relaxed">
                    {analiseIA.split('\n').map((linha, i) => <p key={i} className="mb-3">{linha}</p>)}
                  </div>
                ) : (
                  <div className="text-center py-20">
                     <p className="text-slate-400 font-bold mb-6">Nenhuma análise gerada para este histórico ainda.</p>
                     <button onClick={dispararAnaliseIA} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-700 transition-colors shadow-lg">Iniciar Processamento Quanti-Qualitativo</button>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-blue-600/20 blur-[100px] rounded-full"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 pb-28">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Base de Pacientes</h1>
          <p className="text-slate-500 font-medium mt-1">Gerencie prontuários, faturamento e anexos clínicos.</p>
        </div>
        <button onClick={() => setMostrarForm(true)} className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg shadow-blue-200 hover:scale-105 transition-all flex items-center justify-center gap-2 w-full md:w-auto">
          <Plus size={20}/> Novo Registro
        </button>
      </div>

      <div className="bg-white p-4 rounded-[24px] border border-slate-200 shadow-sm flex items-center focus-within:ring-2 focus-within:ring-blue-500 transition-all">
        <Search className="text-slate-400 mr-3" size={24}/>
        <input placeholder="Procurar paciente pelo nome..." className="flex-1 outline-none text-slate-700 bg-transparent font-bold w-full" value={termoBusca} onChange={e => setTermoBusca(e.target.value)} />
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="p-6">Identificação do Paciente</th>
                <th className="p-6">Status / Contato</th>
                <th className="p-6 text-right">Acesso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map(p => (
                <tr key={p.id} className="hover:bg-blue-50/50 cursor-pointer transition-colors group" onClick={() => setPacienteSelecionado(p)}>
                  <td className="p-6">
                    <div className="font-black text-slate-900 text-lg">{p.nome}</div>
                    <div className="text-xs text-slate-500 font-bold uppercase mt-1 tracking-widest">CPF: {p.cpf}</div>
                  </td>
                  <td className="p-6">
                     <div className="text-sm text-slate-600 font-medium flex items-center gap-2">
                       <Smartphone size={14} className="text-slate-400"/> {p.whatsapp}
                     </div>
                  </td>
                  <td className="p-6 text-right">
                     <div className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-xl border border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50 transition-all shadow-sm">
                        <ChevronLeft className="rotate-180 text-blue-600" size={18}/>
                     </div>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                 <tr>
                    <td colSpan="3" className="p-10 text-center font-bold text-slate-400">Nenhum paciente encontrado.</td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white p-8 md:p-10 rounded-[40px] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
             <div className="flex justify-between items-center mb-8">
                <h3 className="font-black text-2xl text-slate-900">{editando ? 'Atualizar Dados' : 'Novo Paciente'}</h3>
                <button onClick={() => setMostrarForm(false)} className="text-slate-400 hover:text-red-500 bg-slate-100 hover:bg-red-50 p-2 rounded-full transition-colors"><X/></button>
             </div>
             <form onSubmit={salvarPaciente} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="md:col-span-2">
                  <input required placeholder="Nome Completo" className="w-full border-2 p-4 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-bold text-slate-700" value={novoPaciente.nome} onChange={e => setNovoPaciente({...novoPaciente, nome: e.target.value})} />
                </div>
                <input required placeholder="CPF" className="w-full border-2 p-4 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-bold text-slate-700" value={novoPaciente.cpf} onChange={e => setNovoPaciente({...novoPaciente, cpf: e.target.value})} />
                <input required placeholder="WhatsApp" className="w-full border-2 p-4 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-bold text-slate-700" value={novoPaciente.whatsapp} onChange={e => setNovoPaciente({...novoPaciente, whatsapp: e.target.value})} />
                <input required placeholder="Tel. Emergência" className="w-full border-2 p-4 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-bold text-slate-700" value={novoPaciente.emergencia} onChange={e => setNovoPaciente({...novoPaciente, emergencia: e.target.value})} />
                {hasAccess(['gestor_clinico', 'admin_fin']) && (
                  <input required type="number" placeholder="Valor da Sessão (R$)" className="w-full border-2 p-4 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-bold text-green-600" value={novoPaciente.valor} onChange={e => setNovoPaciente({...novoPaciente, valor: e.target.value})} />
                )}
                <textarea placeholder="Observações clínicas iniciais..." className="w-full md:col-span-2 border-2 p-4 rounded-xl bg-slate-50 outline-none focus:border-blue-500 h-24 font-medium text-slate-700" value={novoPaciente.observacoes} onChange={e => setNovoPaciente({...novoPaciente, observacoes: e.target.value})} />
                
                <button type="submit" className="w-full md:col-span-2 bg-blue-600 text-white py-4 md:py-5 rounded-[24px] font-black text-lg shadow-xl hover:bg-blue-700 transition-all">
                  {editando ? 'Salvar Alterações' : 'Concluir Cadastro no Sistema'}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}