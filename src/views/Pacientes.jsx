import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, X, ChevronLeft, Award, Smartphone, CreditCard,
  Trash2, Edit3, Landmark, Sparkles, ChevronRight, MessageCircle,
  TrendingDown, FileText, Loader2, CalendarClock, Target, ShieldAlert, 
  Package, ShoppingCart, CheckCircle2, Layers, Dumbbell, Users, CornerDownRight, Lightbulb, Building2
} from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, where } from 'firebase/firestore';
import { realizarAnaliseIAHistorico, transcreverExameIA } from '../services/geminiService';

const GRUPOS_MUSCULARES = [
  'Cervical', 'Ombros / Manguito', 'Dorsal / Escápulas', 'Peitoral', 
  'Core / Abdômen', 'Lombar', 'Pelve / Quadril', 'Coxas / Isquiotibiais', 
  'Joelhos', 'Panturrilhas / Tornozelos', 'Membros Superiores (Geral)',
  'Respiratório / TMI'
];

const CLINICAS = ['Vida', 'Reabtech'];

const obterDataLocalISO = (data) => {
  const d = data instanceof Date ? data : new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const formatarDataAgenda = (dataString) => {
  if (!dataString) return '';
  const partes = dataString.split('-');
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return dataString;
};

export default function Pacientes({ pacientes, hasAccess, user, navParams, setModalActive }) {
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroClinica, setFiltroClinica] = useState('Todas');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [tabAtiva, setTabAtiva] = useState('historico'); 
  
  const [evolucoes, setEvolucoes] = useState([]);
  const [novoSoap, setNovoSoap] = useState('');
  const [metricaPain, setMetricaPain] = useState(0); 
  const [editandoEvolucaoId, setEditandoEvolucaoId] = useState(null);

  const [agendamentosFuturos, setAgendamentosFuturos] = useState([]);
  const [sessaoModulacaoId, setSessaoModulacaoId] = useState('');
  const [exerciciosSessao, setExerciciosSessao] = useState([]);

  const [editandoId, setEditandoId] = useState(null);
  const [novoPaciente, setNovoPaciente] = useState({
    nome: '', cpf: '', whatsapp: '', emergencia: '', valor: '', observacoes: '', clinica: 'Vida'
  });

  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  
  const [analiseIA, setAnaliseIA] = useState('');
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [exameProcessando, setExameProcessando] = useState(false);
  const [laudoExame, setLaudoExame] = useState('');

  const [planoTratamento, setPlanoTratamento] = useState([]);
  const [novoExercicio, setNovoExercicio] = useState({ musculo: '', nome: '', carga: '', series: '3', reps: '10' });
  
  const [bancoExerciciosGlobais, setBancoExerciciosGlobais] = useState([]);

  const [estoqueGeral, setEstoqueGeral] = useState([]);
  const [consumosPaciente, setConsumosPaciente] = useState([]);
  const [novoConsumo, setNovoConsumo] = useState({ itemId: '', quantidade: 1 });

  const paramConsumido = useRef(false);

  const nomeProfissionalLogado = user?.nome || user?.name || 'Equipe';

  useEffect(() => {
    if (navParams?.pacienteId && !paramConsumido.current && pacientes.length > 0) {
      const p = pacientes.find(x => x.id === navParams.pacienteId);
      if (p) { setPacienteSelecionado(p); setTabAtiva('historico'); paramConsumido.current = true; }
    }
  }, [navParams, pacientes]);

  useEffect(() => { paramConsumido.current = false; }, [navParams]);

  useEffect(() => {
    if (setModalActive) {
      setModalActive(mostrarForm);
    }
  }, [mostrarForm, setModalActive]);

  useEffect(() => {
     const unsubEstoque = onSnapshot(collection(db, "estoque"), snap => {
         setEstoqueGeral(snap.docs.map(d => ({ id: d.id, ...d.data() })));
     });
     const unsubBancoEx = onSnapshot(collection(db, "banco_exercicios"), snap => {
         const exs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
         exs.sort((a,b) => (a.nome || '').localeCompare(b.nome || ''));
         setBancoExerciciosGlobais(exs);
     });
     return () => { unsubEstoque(); unsubBancoEx(); };
  }, []);

  const salvarPaciente = async (e) => {
    e.preventDefault();
    try {
      if (editandoId) {
        await updateDoc(doc(db, "pacientes", editandoId), novoPaciente);
        if(pacienteSelecionado && pacienteSelecionado.id === editandoId) {
            setPacienteSelecionado({...pacienteSelecionado, ...novoPaciente});
        }
        alert("Dados atualizados!");
      } else {
        await addDoc(collection(db, "pacientes"), { ...novoPaciente, dataCadastro: new Date().toISOString(), status: 'ativo' });
        alert("Paciente cadastrado!");
      }
      fecharFormulario();
    } catch (error) { alert("Erro ao salvar."); }
  };

  const abrirFormulario = (p = null) => {
    if (p) {
        setEditandoId(p.id);
        setNovoPaciente({ 
            nome: p.nome || '', cpf: p.cpf || '', whatsapp: p.whatsapp || '', 
            emergencia: p.emergencia || '', valor: p.valor || '', observacoes: p.observacoes || '',
            clinica: p.clinica || 'Vida'
        });
    } else {
        setEditandoId(null);
        setNovoPaciente({ nome: '', cpf: '', whatsapp: '', emergencia: '', valor: '', observacoes: '', clinica: 'Vida' });
    }
    setMostrarForm(true);
  };

  const fecharFormulario = () => {
    setMostrarForm(false);
    setEditandoId(null);
    setNovoPaciente({ nome: '', cpf: '', whatsapp: '', emergencia: '', valor: '', observacoes: '', clinica: 'Vida' });
  };

  const excluirPaciente = async (id) => {
    if (!hasAccess(['gestor_clinico'])) return alert("Apenas gestores podem apagar registros.");
    if (confirmarExclusao) {
      await deleteDoc(doc(db, "pacientes", id));
      setPacienteSelecionado(null);
      setConfirmarExclusao(false);
      alert("Registro removido permanentemente.");
    } else { setConfirmarExclusao(true); }
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
    setExameProcessando(true); setLaudoExame(''); 
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try { const base64 = reader.result.split(',')[1]; const resultado = await transcreverExameIA(base64); setLaudoExame(resultado); } 
      catch (error) { alert("Erro ao processar exame."); }
      setExameProcessando(false);
    };
  };

  useEffect(() => {
    if (pacienteSelecionado) {
      setConfirmarExclusao(false);
      setSessaoModulacaoId('');
      setExerciciosSessao([]);

      const qEvo = query(collection(db, "pacientes", pacienteSelecionado.id, "evolucoes"), orderBy("data", "desc"));
      const unsubEvo = onSnapshot(qEvo, (snapshot) => setEvolucoes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
      
      const qPlano = query(collection(db, "pacientes", pacienteSelecionado.id, "plano_tratamento"));
      const unsubPlano = onSnapshot(qPlano, (snapshot) => setPlanoTratamento(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
      
      const qConsumos = query(collection(db, "consumos"), where("pacienteId", "==", pacienteSelecionado.id));
      const unsubConsumos = onSnapshot(qConsumos, (snapshot) => {
         const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
         list.sort((a,b) => new Date(b.data) - new Date(a.data));
         setConsumosPaciente(list);
      });

      const qAg = query(collection(db, "agendamentos"), where("pacienteId", "==", pacienteSelecionado.id));
      const unsubAg = onSnapshot(qAg, (snapshot) => {
          const ags = snapshot.docs
            .map(d => ({id: d.id, ...d.data()}))
            .filter(a => (a.status === 'pendente' || a.status === 'confirmado') && a.profissionalId === user?.id)
            .sort((a,b) => new Date(a.data) - new Date(b.data));
          setAgendamentosFuturos(ags);
      });

      setLaudoExame(''); setAnaliseIA(''); setEditandoEvolucaoId(null); setNovoSoap(''); setMetricaPain(0);
      return () => { unsubEvo(); unsubPlano(); unsubConsumos(); unsubAg(); };
    }
  }, [pacienteSelecionado, user]);

  const handleSelectModulacao = (id) => {
      setSessaoModulacaoId(id);
      const ag = agendamentosFuturos.find(a => a.id === id);
      setExerciciosSessao(ag?.exerciciosPlanejados || []);
  };

  const toggleExercicioSessao = (ex) => {
      setExerciciosSessao(prev => {
          const exists = prev.find(p => p.id === ex.id);
          if (exists) return prev.filter(p => p.id !== ex.id);
          return [...prev, { id: ex.id, nome: ex.nome, carga: ex.carga, series: ex.series, reps: ex.reps }];
      });
  };

  const salvarModulacaoSessao = async () => {
      if (!sessaoModulacaoId) return alert("Selecione uma sessão futura agendada.");
      try {
          await updateDoc(doc(db, "agendamentos", sessaoModulacaoId), { exerciciosPlanejados: exerciciosSessao });
          alert("Sessão modulada e guardada com sucesso!");
      } catch(e) {
          alert("Erro ao salvar modulação.");
      }
  };

  const puxarCondutaParaEvolucao = (agendamentoModulado) => {
      if (agendamentoModulado && agendamentoModulado.exerciciosPlanejados) {
          const textoEx = agendamentoModulado.exerciciosPlanejados.map(ex => `• ${ex.nome} (${ex.series}x${ex.reps}${ex.carga ? ` - ${ex.carga}` : ''})`).join('\n');
          const prefix = novoSoap ? novoSoap + '\n\n' : '';
          setNovoSoap(prefix + 'Conduta / Exercícios Planejados:\n' + textoEx + '\n\nEvolução Clínica:\n');
      }
  };

  const iniciarEdicaoEvolucao = (evo) => {
    setNovoSoap(evo.texto); 
    setMetricaPain(evo.metricaPain !== undefined ? evo.metricaPain : 0); 
    setEditandoEvolucaoId(evo.id);
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const apagarEvolucao = async (id) => {
    if(window.confirm("Tem certeza que deseja apagar esta evolução de forma permanente? Seu nome ficará no registro do sistema.")) {
        try { await deleteDoc(doc(db, "pacientes", pacienteSelecionado.id, "evolucoes", id)); } 
        catch (e) { alert("Erro ao apagar evolução."); }
    }
  };

  const salvarEvolucao = async () => {
    if (!novoSoap) return alert("Escreva algo antes de salvar.");
    try {
      if (editandoEvolucaoId) {
        await updateDoc(doc(db, "pacientes", pacienteSelecionado.id, "evolucoes", editandoEvolucaoId), { 
            texto: novoSoap, 
            metricaPain, 
            dataEdicao: new Date().toISOString() 
        });
        alert("Evolução atualizada com sucesso!");
      } else {
        await addDoc(collection(db, "pacientes", pacienteSelecionado.id, "evolucoes"), { 
            texto: novoSoap, 
            data: new Date().toISOString(), 
            profissional: nomeProfissionalLogado,
            profissionalId: user?.id, 
            metricaPain 
        });
        if (navParams?.atualizarStatusAgendamento) await updateDoc(doc(db, "agendamentos", navParams.atualizarStatusAgendamento), { status: 'realizado' });
        alert("Evolução assinada digitalmente com sucesso!");
      }
      setNovoSoap(''); setEditandoEvolucaoId(null); setMetricaPain(0);
    } catch (e) { alert("Erro ao salvar evolução."); }
  };

  const adicionarExercicio = async (e) => {
    e.preventDefault();
    if(!novoExercicio.musculo || !novoExercicio.nome) return alert("Preencha a Categoria e a Descrição.");
    try {
      const nomeFormatado = novoExercicio.nome.trim();
      const nomeNorm = nomeFormatado.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      
      const existeBanco = bancoExerciciosGlobais.find(ex => (ex.nomeNormalizado || '') === nomeNorm);
      
      if (!existeBanco) {
          await addDoc(collection(db, "banco_exercicios"), {
              nome: nomeFormatado,
              categoria: novoExercicio.musculo,
              nomeNormalizado: nomeNorm
          });
      }

      await addDoc(collection(db, "pacientes", pacienteSelecionado.id, "plano_tratamento"), { 
          ...novoExercicio, 
          nome: existeBanco ? existeBanco.nome : nomeFormatado,
          dataInclusao: new Date().toISOString(), 
          profissional: nomeProfissionalLogado
      });
      
      setNovoExercicio({ musculo: '', nome: '', carga: '', series: '3', reps: '10' });
    } catch (e) { alert("Erro ao adicionar exercício."); }
  };

  const removerExercicio = async (id) => {
    if(window.confirm("Remover esta prescrição do plano? (Não afeta o banco global)")) await deleteDoc(doc(db, "pacientes", pacienteSelecionado.id, "plano_tratamento", id));
  };

  const lancarProduto = async (e) => {
      e.preventDefault();
      const itemEstoque = estoqueGeral.find(i => i.id === novoConsumo.itemId);
      if (!itemEstoque) return alert("Selecione um produto válido.");
      if (novoConsumo.quantidade <= 0) return alert("A quantidade deve ser maior que zero.");
      
      if (itemEstoque.quantidade < novoConsumo.quantidade) {
          if (!window.confirm(`Atenção: O estoque atual (${itemEstoque.quantidade} ${itemEstoque.unidade}) é menor que a quantidade informada. Deseja lançar assim mesmo e deixar o estoque negativo?`)) return;
      }

      try {
          const precoVenda = parseFloat(itemEstoque.precoVenda) || 0;
          const precoTotal = precoVenda * novoConsumo.quantidade;

          await addDoc(collection(db, "consumos"), {
              pacienteId: pacienteSelecionado.id,
              pacienteNome: pacienteSelecionado.nome,
              itemId: itemEstoque.id,
              itemNome: itemEstoque.nome,
              unidade: itemEstoque.unidade,
              quantidade: novoConsumo.quantidade,
              precoUnitario: precoVenda,
              precoTotal: precoTotal,
              data: new Date().toISOString(),
              profissional: nomeProfissionalLogado,
              profissionalId: user?.id
          });

          await updateDoc(doc(db, "estoque", itemEstoque.id), {
              quantidade: itemEstoque.quantidade - novoConsumo.quantidade
          });

          alert("Produto lançado e descontado do estoque com sucesso!");
          setNovoConsumo({ itemId: '', quantidade: 1 });
      } catch (err) { alert("Erro ao lançar produto."); }
  };

  const estornarProduto = async (consumo) => {
      if (!window.confirm(`Deseja remover este lançamento de ${consumo.itemNome} e devolver a quantidade ao estoque?`)) return;
      try {
          await deleteDoc(doc(db, "consumos", consumo.id));
          const itemEstoque = estoqueGeral.find(i => i.id === consumo.itemId);
          if (itemEstoque) {
              await updateDoc(doc(db, "estoque", itemEstoque.id), {
                  quantidade: itemEstoque.quantidade + consumo.quantidade
              });
          }
          alert("Lançamento estornado com sucesso!");
      } catch (err) { alert("Erro ao estornar produto."); }
  };

  const filtrados = (pacientes || [])
    .filter(p => (p.nome || '').toLowerCase().includes(termoBusca.toLowerCase()))
    .filter(p => filtroClinica === 'Todas' || p.clinica === filtroClinica)
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

  const estoqueOrdenado = [...estoqueGeral].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

  const abasDisponiveis = [
    { id: 'historico', icon: FileText, label: 'Histórico Clínico', restritoFin: false, restritoClinico: false },
    { id: 'plano', icon: Dumbbell, label: 'Plano de Tratamento', restritoFin: false, restritoClinico: true },
    { id: 'produtos', icon: Package, label: 'Materiais / Produtos', restritoFin: false, restritoClinico: false },
    { id: 'financeiro', icon: Landmark, label: 'Financeiro e Cobrança', restritoFin: true, restritoClinico: false },
    { id: 'dados', icon: Search, label: 'Arquivos e Exames', restritoFin: false, restritoClinico: false },
    { id: 'ia', icon: Sparkles, label: 'Agente IA', restritoFin: false, restritoClinico: false }
  ];

  // ==============================================================================
  // RENDERIZAÇÃO DO MODAL DE FORMULÁRIO (Componente Global)
  // Agora está disponível para saltar tanto na Lista como no Perfil
  // ==============================================================================
  const renderFormularioModal = () => {
      if (!mostrarForm) return null;
      return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white p-6 md:p-10 rounded-[40px] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 relative overflow-y-auto max-h-[90vh] custom-scrollbar">
             <div className="flex justify-between items-center mb-8 shrink-0">
                <h3 className="font-black text-2xl text-[#0F214A]">{editandoId ? 'Atualizar Dados' : 'Novo Registro de Paciente'}</h3>
                <button onClick={fecharFormulario} className="text-slate-400 hover:text-red-500 bg-slate-100 hover:bg-red-50 p-2 rounded-full transition-colors"><X/></button>
             </div>
             <form onSubmit={salvarPaciente} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#0F214A] mb-2 flex items-center gap-1"><Building2 size={14}/> Vincular à Clínica</label>
                    <div className="flex gap-4">
                        {CLINICAS.map(c => (
                            <label key={c} className={`flex-1 flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all font-black text-sm ${novoPaciente.clinica === c ? (c === 'Reabtech' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-emerald-500 bg-emerald-50 text-emerald-700') : 'border-slate-200 bg-white text-slate-400'}`}>
                                <input type="radio" name="clinica" value={c} checked={novoPaciente.clinica === c} onChange={(e) => setNovoPaciente({...novoPaciente, clinica: e.target.value})} className="hidden" />
                                {c}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="md:col-span-2">
                  <input required placeholder="Nome Completo" className="w-full border-2 p-4 rounded-xl bg-slate-50 outline-none focus:border-[#00A1FF] font-bold text-slate-700" value={novoPaciente.nome} onChange={e => setNovoPaciente({...novoPaciente, nome: e.target.value})} />
                </div>
                <input required placeholder="CPF" className="border-2 p-4 rounded-xl bg-slate-50 outline-none focus:border-[#00A1FF] font-bold text-slate-700" value={novoPaciente.cpf} onChange={e => setNovoPaciente({...novoPaciente, cpf: e.target.value})} />
                <input required placeholder="WhatsApp" className="border-2 p-4 rounded-xl bg-slate-50 outline-none focus:border-[#00A1FF] font-bold text-slate-700" value={novoPaciente.whatsapp} onChange={e => setNovoPaciente({...novoPaciente, whatsapp: e.target.value})} />
                <input required placeholder="Tel. Emergência" className="border-2 p-4 rounded-xl bg-slate-50 outline-none focus:border-[#00A1FF] font-bold text-slate-700" value={novoPaciente.emergencia} onChange={e => setNovoPaciente({...novoPaciente, emergencia: e.target.value})} />
                
                {hasAccess(['gestor_clinico', 'admin_fin', 'recepcao']) && (
                  <input required type="number" placeholder="Valor da Sessão (R$)" className="border-2 p-4 rounded-xl bg-slate-50 outline-none focus:border-[#00A1FF] font-bold text-green-600" value={novoPaciente.valor} onChange={e => setNovoPaciente({...novoPaciente, valor: e.target.value})} />
                )}
                
                <textarea placeholder="Observações clínicas iniciais..." className="md:col-span-2 border-2 p-4 rounded-xl bg-slate-50 outline-none focus:border-[#00A1FF] h-24 font-medium text-slate-700" value={novoPaciente.observacoes} onChange={e => setNovoPaciente({...novoPaciente, observacoes: e.target.value})} />
                
                <button type="submit" className="md:col-span-2 bg-[#00A1FF] text-white py-5 rounded-[24px] font-black text-lg shadow-xl hover:bg-[#0F214A] transition-all">
                  {editandoId ? 'Salvar Alterações' : 'Concluir Cadastro no Sistema'}
                </button>
             </form>
          </div>
        </div>
      );
  };

  // ==============================================================================
  // TELA 1: DETALHES DO PACIENTE (Ficha completa)
  // ==============================================================================
  if (pacienteSelecionado) {
    const historicoEVAReal = [...evolucoes].filter(e => e.metricaPain !== undefined && e.metricaPain !== null).reverse().slice(-10);

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

    const proximaSessaoModulada = agendamentosFuturos.find(a => a.exerciciosPlanejados && a.exerciciosPlanejados.length > 0);

    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 pb-20">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <button onClick={() => {setPacienteSelecionado(null); setTabAtiva('historico'); setConfirmarExclusao(false);}} className="flex items-center text-slate-500 font-bold hover:text-[#00A1FF] transition-colors w-fit">
            <ChevronLeft className="mr-1"/> Voltar para a Base
          </button>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button onClick={() => abrirFormulario(pacienteSelecionado)} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 shadow-sm" title="Editar Ficha"><Edit3 size={18} className="text-slate-600"/></button>
            <button onClick={() => dispararAnaliseIA()} className="p-3 bg-[#0F214A] text-white rounded-2xl hover:bg-[#00A1FF] transition-colors shadow-lg flex items-center gap-2 flex-1 md:flex-none justify-center">
              {carregandoIA ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18} className="text-[#FFCC00]"/>}
              <span className="text-xs font-bold sm:inline">Analisar com IA</span>
            </button>
            {(hasAccess(['gestor_clinico']) || user?.role === 'gestor_clinico') && (
              <button onClick={() => excluirPaciente(pacienteSelecionado.id)} className={`p-3 rounded-2xl border shadow-sm transition-colors ${confirmarExclusao ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-500 border-slate-200 hover:bg-red-50'}`}>
                {confirmarExclusao ? 'Clique para confirmar' : <Trash2 size={18}/>}
              </button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
            <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl font-black text-xs uppercase tracking-widest ${pacienteSelecionado.clinica === 'Reabtech' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {pacienteSelecionado.clinica || 'Vida'}
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-slate-900 break-words mt-2">{pacienteSelecionado.nome}</h2>
            <div className="flex flex-wrap gap-3 mt-4 text-slate-500 text-xs font-bold uppercase tracking-widest">
              <span className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center"><Smartphone size={12} className="mr-1.5"/> {pacienteSelecionado.whatsapp}</span>
              <span className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center"><CreditCard size={12} className="mr-1.5"/> {pacienteSelecionado.cpf}</span>
              
              {hasAccess(['gestor_clinico', 'admin_fin']) && (
                <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl border border-blue-100">Sessão: R$ {pacienteSelecionado.valor}</span>
              )}
            </div>
          </div>
          
          <div className="bg-[#0F214A] text-white p-6 md:p-8 rounded-[32px] shadow-xl relative overflow-hidden">
             <p className="text-[10px] font-black uppercase tracking-widest text-[#00A1FF] mb-4">Evolução de Dor Real (EVA)</p>
             {historicoEVAReal.length > 0 ? (
                 <div className="flex items-end gap-1 h-12">
                    {historicoEVAReal.map((evo, i) => (
                      <div key={i} title={`Data: ${new Date(evo.data).toLocaleDateString()} - Dor: ${evo.metricaPain}`} className="flex-1 bg-[#00A1FF] rounded-t-md opacity-60 hover:opacity-100 transition-opacity relative group cursor-pointer" style={{height: `${Math.max(evo.metricaPain * 10, 5)}%`}}>
                         <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white text-slate-900 text-[9px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 hidden md:block">{evo.metricaPain}</span>
                      </div>
                    ))}
                 </div>
             ) : (
                 <div className="flex items-center justify-center h-12 border-2 border-dashed border-white/20 rounded-xl">
                    <span className="text-[10px] font-bold text-white/50">Nenhum dado registrado.</span>
                 </div>
             )}
             <p className="mt-4 text-[10px] font-bold text-slate-300 flex items-center"><TrendingDown size={14} className="mr-1"/> Gráfico Cronológico</p>
          </div>
        </div>

        <div className="flex flex-nowrap w-full border-b border-slate-200 overflow-x-auto custom-scrollbar touch-pan-x hide-scrollbar print:hidden">
          {abasDisponiveis.map(tab => {
            if (tab.restritoFin && !hasAccess(['gestor_clinico', 'admin_fin', 'recepcao'])) return null;
            if (tab.restritoClinico && !hasAccess(['gestor_clinico', 'fisio', 'to'])) return null;
            return (
              <button key={tab.id} onClick={() => setTabAtiva(tab.id)} className={`shrink-0 px-6 py-4 flex items-center gap-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${tabAtiva === tab.id ? 'border-[#00A1FF] text-[#00A1FF] bg-[#00A1FF]/5' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                <tab.icon size={16}/> {tab.label}
              </button>
            )
          })}
        </div>

        <div className="mt-6 print:m-0">
          {tabAtiva === 'historico' && (
            <div className="space-y-6 print:hidden">
               <div className={`p-6 md:p-8 rounded-[32px] border transition-colors ${editandoEvolucaoId ? 'bg-amber-50 border-amber-200' : 'bg-blue-50/50 border-blue-100'}`}>
                  
                  {!editandoEvolucaoId && (
                      <div className="mb-6">
                          {proximaSessaoModulada ? (
                              <button onClick={() => puxarCondutaParaEvolucao(proximaSessaoModulada)} className="w-full md:w-auto bg-[#0F214A] text-white px-6 py-3 rounded-xl font-black text-xs shadow-md hover:bg-[#00A1FF] transition-all flex items-center justify-center gap-2">
                                 <CornerDownRight size={14} className="text-[#FFCC00]" /> Puxar Conduta Planejada ({formatarDataAgenda(proximaSessaoModulada.data)})
                              </button>
                          ) : (
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-white/50 p-3 rounded-xl border border-slate-300 border-dashed w-fit">
                                  <Lightbulb size={16} className="text-amber-400 shrink-0"/>
                                  Dica: Module a próxima sessão na aba "Plano" para puxar os exercícios para cá automaticamente.
                              </div>
                          )}
                      </div>
                  )}

                  <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                    <h3 className={`font-bold ${editandoEvolucaoId ? 'text-amber-900' : 'text-[#0F214A]'}`}>
                      {editandoEvolucaoId ? 'Editando Evolução Existente' : 'Nova Evolução Clínica'}
                    </h3>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      {editandoEvolucaoId && <button onClick={() => {setEditandoEvolucaoId(null); setNovoSoap(''); setMetricaPain(0);}} className="text-xs font-black text-amber-600 hover:text-amber-800 underline mr-2">Cancelar Edição</button>}
                      <div className="flex flex-1 md:flex-none items-center justify-between gap-3 bg-white px-4 py-2 rounded-xl border border-blue-200 shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Escala EVA: {metricaPain}</span>
                        <input type="range" min="0" max="10" className="w-full md:w-24 cursor-pointer accent-[#00A1FF]" value={metricaPain} onChange={e => setMetricaPain(parseInt(e.target.value))}/>
                      </div>
                    </div>
                  </div>
                  <textarea className="w-full border-2 border-white rounded-2xl p-4 h-40 mb-4 outline-none focus:border-[#00A1FF] bg-white/80 font-medium text-slate-700 text-sm" placeholder="Descreva o atendimento ou puxe a conduta no botão acima..." value={novoSoap} onChange={e => setNovoSoap(e.target.value)} />
                  <div className="flex gap-3">
                    <button onClick={salvarEvolucao} className={`w-full md:w-auto ${editandoEvolucaoId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#00A1FF] hover:bg-blue-600'} text-white px-8 py-3.5 rounded-xl font-black shadow-lg transition-colors text-sm`}>
                      {editandoEvolucaoId ? 'Guardar Alterações' : 'Assinar Digitalmente'}
                    </button>
                  </div>
               </div>
               
               <div className="space-y-4">
                  {evolucoes.map(evo => {
                    const isOwner = evo.profissionalId === user?.id || (!evo.profissionalId && evo.profissional === nomeProfissionalLogado) || user?.role === 'gestor_clinico';

                    return (
                        <div key={evo.id} className={`bg-white p-5 md:p-6 rounded-[24px] border shadow-sm transition-all ${editandoEvolucaoId === evo.id ? 'border-amber-400 ring-4 ring-amber-50' : 'border-slate-100 hover:border-blue-200'}`}>
                        <div className="flex justify-between mb-4 gap-4">
                            <p className="text-slate-700 text-sm leading-relaxed font-medium whitespace-pre-wrap">{evo.texto}</p>
                            {evo.metricaPain !== undefined && <div className="text-[#0F214A] font-black text-sm md:text-lg bg-blue-50 px-3 py-1 rounded-xl h-fit border border-blue-100 whitespace-nowrap">EVA {evo.metricaPain}</div>}
                        </div>
                        <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center text-[10px] font-bold text-slate-400 border-t border-slate-100 pt-4 mt-2 gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <CalendarClock size={14} className="text-slate-300 shrink-0"/>
                                <span className="uppercase tracking-widest text-slate-500">
                                    Data: <span className="text-slate-700">{new Date(evo.data).toLocaleDateString('pt-BR')}</span> às {new Date(evo.data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                                </span>
                                {evo.dataEdicao && <span className="italic text-slate-300 ml-2">(Editado)</span>}
                            </div>
                            <div className="flex items-center justify-between w-full md:w-auto gap-4">
                                {isOwner ? (
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => iniciarEdicaoEvolucao(evo)} className="text-[#00A1FF] hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg transition-colors"><Edit3 size={12}/> Editar</button>
                                        <button onClick={() => apagarEvolucao(evo.id)} className="text-red-500 hover:text-red-700 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg transition-colors"><Trash2 size={12}/> Apagar</button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 text-slate-300" title="Apenas o profissional que registrou pode alterar."><ShieldAlert size={12}/> Bloqueado</div>
                                )}
                                <span className="text-slate-600 uppercase flex items-center gap-1 truncate max-w-[120px]"><Award size={12} className="shrink-0"/> {evo.profissional?.split(' ')[0]}</span>
                            </div>
                        </div>
                        </div>
                    );
                  })}
               </div>
            </div>
          )}

          {tabAtiva === 'plano' && (
             <div className="space-y-6 animate-in slide-in-from-bottom-4 print:hidden">

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 md:p-8 rounded-[32px] border border-blue-100 shadow-sm">
                   <h3 className="font-black text-[#0F214A] flex items-center gap-2 mb-6 text-lg"><Layers className="text-[#00A1FF]"/> Modulação de Atendimento (Planejar Sessão)</h3>
                   
                   {agendamentosFuturos.length > 0 ? (
                       <>
                           <select 
                               className="w-full max-w-lg p-3 md:p-4 bg-white border border-blue-200 rounded-2xl outline-none focus:border-[#00A1FF] font-black text-[#0F214A] text-sm shadow-sm cursor-pointer truncate"
                               value={sessaoModulacaoId}
                               onChange={(e) => handleSelectModulacao(e.target.value)}
                           >
                               <option value="">Selecione sua sessão futura...</option>
                               {agendamentosFuturos.map(ag => (
                                   <option key={ag.id} value={ag.id}>
                                       {formatarDataAgenda(ag.data)} - {ag.hora} ({ag.local})
                                   </option>
                               ))}
                           </select>
                           
                           {sessaoModulacaoId && (
                               <div className="animate-in fade-in slide-in-from-top-4 mt-6">
                                   <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 border-b border-blue-200/50 pb-2 gap-2">
                                       <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Toque nos cards para designar ao atendimento:</p>
                                       <span className="bg-[#00A1FF] text-white px-3 py-1 rounded-full text-[10px] font-black w-fit">{exerciciosSessao.length} selecionados</span>
                                   </div>
                                   
                                   {planoTratamento.length > 0 ? (
                                       <div className="flex flex-wrap gap-2 md:gap-3 mb-6">
                                           {planoTratamento.map(ex => {
                                               const isSelected = exerciciosSessao.some(e => e.id === ex.id);
                                               return (
                                                   <button 
                                                       key={ex.id} 
                                                       onClick={() => toggleExercicioSessao(ex)} 
                                                       className={`p-3 md:p-4 rounded-2xl border text-left transition-all hover:scale-105 w-full sm:w-auto flex-1 min-w-[150px] ${isSelected ? 'bg-[#0F214A] text-white border-[#0F214A] shadow-lg' : 'bg-white text-slate-700 border-slate-200 shadow-sm hover:border-[#00A1FF]'}`}
                                                   >
                                                       <div className="flex justify-between items-center mb-1">
                                                           <span className="font-black text-sm">{ex.nome}</span>
                                                           {isSelected && <CheckCircle2 size={16} className="text-[#00A1FF] ml-3 shrink-0" />}
                                                       </div>
                                                       <div className={`text-[10px] md:text-xs font-bold ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                                                           {ex.series}x{ex.reps} {ex.carga ? `• ${ex.carga}` : ''}
                                                       </div>
                                                   </button>
                                               )
                                           })}
                                       </div>
                                   ) : (
                                       <p className="text-sm font-bold text-slate-500 mb-6 bg-white/50 p-4 rounded-xl border border-blue-100">
                                           Seu plano local de exercícios está vazio. Adicione prescrições abaixo primeiro.
                                       </p>
                                   )}
                                   <button onClick={salvarModulacaoSessao} className="bg-[#00A1FF] text-white px-6 md:px-8 py-3 md:py-4 rounded-2xl font-black text-sm shadow-lg hover:bg-blue-600 transition-colors w-full md:w-auto">
                                       Salvar Modulação da Sessão
                                   </button>
                               </div>
                           )}
                       </>
                   ) : (
                       <p className="text-sm font-bold text-slate-500 bg-white/50 p-4 md:p-6 rounded-2xl border border-blue-100">
                           Você não possui agendamentos futuros para este paciente no momento.
                       </p>
                   )}
                </div>

                <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm mt-8">
                   <h3 className="font-black text-slate-800 mb-6 flex items-center text-lg"><Target className="text-slate-400 mr-2"/> Adicionar ao Plano (Banco Global Inteligente)</h3>
                   
                   <form onSubmit={adicionarExercicio} className="bg-slate-50 p-5 md:p-6 rounded-2xl border border-slate-200 mb-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                         <div className="sm:col-span-2 md:col-span-1">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Foco / Categoria</label>
                           <select required className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] font-bold text-slate-700 text-sm" value={novoExercicio.musculo} onChange={e => setNovoExercicio({...novoExercicio, musculo: e.target.value})}>
                              <option value="">Selecione...</option>
                              {GRUPOS_MUSCULARES.map(m => <option key={m} value={m}>{m}</option>)}
                           </select>
                         </div>
                         <div className="sm:col-span-2 md:col-span-2 relative">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Exercício (Autocompletar)</label>
                           <input 
                              required 
                              type="text" 
                              list="banco-exercicios-lista"
                              placeholder="Digite para buscar na clínica..." 
                              className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] font-bold text-slate-700 text-sm" 
                              value={novoExercicio.nome} 
                              onChange={e => {
                                  const val = e.target.value;
                                  let nCat = novoExercicio.musculo;
                                  const sugestao = bancoExerciciosGlobais.find(x => x.nome === val);
                                  if (sugestao && !nCat) nCat = sugestao.categoria;
                                  setNovoExercicio({...novoExercicio, nome: val, musculo: nCat});
                              }}
                           />
                           <datalist id="banco-exercicios-lista">
                              {bancoExerciciosGlobais
                                  .filter(ex => !novoExercicio.musculo || ex.categoria === novoExercicio.musculo)
                                  .map(ex => <option key={ex.id} value={ex.nome} />)
                              }
                           </datalist>
                         </div>
                         <div className="sm:col-span-2 md:col-span-1">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Carga (Personalizada)</label>
                           <input type="text" placeholder="Ex: 10kg, Azul" className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] font-bold text-slate-700 text-sm" value={novoExercicio.carga} onChange={e => setNovoExercicio({...novoExercicio, carga: e.target.value})}/>
                         </div>
                      </div>
                      
                      <div className="flex flex-wrap md:flex-nowrap gap-3 md:gap-4 mt-4 items-center">
                         <div className="flex flex-1 items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200">
                           <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Séries:</label>
                           <input type="number" min="1" className="w-12 text-right font-black outline-none bg-transparent text-[#0F214A]" value={novoExercicio.series} onChange={e => setNovoExercicio({...novoExercicio, series: e.target.value})}/>
                         </div>
                         <span className="text-slate-400 font-black hidden md:block">X</span>
                         <div className="flex flex-1 items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200">
                           <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reps:</label>
                           <input type="text" className="w-16 text-right font-black outline-none bg-transparent text-[#0F214A]" value={novoExercicio.reps} onChange={e => setNovoExercicio({...novoExercicio, reps: e.target.value})}/>
                         </div>
                         
                         <button type="submit" className="w-full md:w-auto ml-auto bg-[#0F214A] text-white px-6 py-3 rounded-xl font-black hover:bg-slate-800 transition-colors shadow-sm text-sm mt-2 md:mt-0">Guardar no Plano</button>
                      </div>
                   </form>

                   {Object.keys(planoAgrupado).length > 0 ? (
                       <div className="grid grid-cols-1 gap-6">
                          {Object.entries(planoAgrupado).map(([musculo, exercicios]) => (
                             <div key={musculo} className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                <div className="bg-slate-50 border-b border-slate-100 p-3 flex justify-between items-center">
                                   <h4 className="font-black text-slate-700 text-sm uppercase tracking-wide">{musculo}</h4>
                                   <span className="text-[10px] font-black text-white bg-slate-400 px-2 py-1 rounded-md">{exercicios.length} exer.</span>
                                </div>
                                <ul className="divide-y divide-slate-50">
                                   {exercicios.map(ex => (
                                      <li key={ex.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group gap-4">
                                         <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 leading-tight truncate">{ex.nome}</p>
                                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] font-bold text-slate-500">
                                               {ex.carga && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">Carga: {ex.carga}</span>}
                                               <span>{ex.series} séries de {ex.reps}</span>
                                            </div>
                                         </div>
                                         <button onClick={() => removerExercicio(ex.id)} className="text-slate-300 hover:text-red-500 transition-all p-2 bg-slate-50 hover:bg-red-50 rounded-lg shrink-0"><Trash2 size={16}/></button>
                                      </li>
                                   ))}
                                </ul>
                             </div>
                          ))}
                       </div>
                   ) : (
                       <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                          <Dumbbell size={40} className="mx-auto text-slate-300 mb-3"/>
                          <p className="font-bold text-slate-500 text-sm">O plano de exercícios está vazio.</p>
                       </div>
                   )}
                </div>
             </div>
          )}

          {tabAtiva === 'produtos' && (
             <div className="space-y-6 animate-in slide-in-from-bottom-4">
                <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm">
                   <h3 className="font-black text-[#0F214A] mb-6 flex items-center text-lg"><ShoppingCart className="text-[#00A1FF] mr-2"/> Lançamento de Materiais</h3>
                   
                   <form onSubmit={lancarProduto} className="bg-slate-50 p-5 md:p-6 rounded-2xl border border-slate-200 mb-8">
                      <div className="flex flex-col md:flex-row items-end gap-4">
                         <div className="flex-1 w-full">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Material do Estoque</label>
                           <select required className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] font-bold text-slate-700 text-sm truncate" value={novoConsumo.itemId} onChange={e => setNovoConsumo({...novoConsumo, itemId: e.target.value})}>
                              <option value="">Selecione o item...</option>
                              {estoqueOrdenado.map(item => (
                                 <option key={item.id} value={item.id}>
                                    {item.nome} ({item.quantidade} {item.unidade}) - R$ {Number(item.precoVenda || 0).toFixed(2)}
                                 </option>
                              ))}
                           </select>
                         </div>
                         
                         <div className="w-full md:w-24">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Qtd</label>
                           <input required type="number" min="1" className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] font-black text-[#0F214A] text-center text-sm" value={novoConsumo.quantidade} onChange={e => setNovoConsumo({...novoConsumo, quantidade: parseInt(e.target.value)})} />
                         </div>
                         
                         <button type="submit" className="w-full md:w-auto bg-[#00A1FF] text-white px-8 py-3.5 rounded-xl font-black hover:bg-[#0F214A] transition-colors shadow-md text-sm">Lançar</button>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 mt-3">* O valor de venda será automaticamente somado à fatura mensal deste paciente.</p>
                   </form>

                   <div>
                      <h4 className="font-black text-slate-700 text-xs md:text-sm uppercase tracking-wide mb-4">Histórico de Materiais Utilizados</h4>
                      {consumosPaciente.length > 0 ? (
                         <div className="w-full overflow-x-auto bg-white border border-slate-100 rounded-2xl shadow-sm">
                             <table className="w-full text-left min-w-[500px]">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                   <tr>
                                      <th className="p-3 md:p-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase">Data</th>
                                      <th className="p-3 md:p-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase">Item</th>
                                      <th className="p-3 md:p-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase text-center">Qtd</th>
                                      <th className="p-3 md:p-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase text-right">Total Gerado</th>
                                      <th className="p-3 md:p-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase text-center">Ações</th>
                                   </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                   {consumosPaciente.map(c => (
                                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                         <td className="p-3 md:p-4 text-[10px] md:text-xs font-bold text-slate-500">{new Date(c.data).toLocaleDateString('pt-BR')}</td>
                                         <td className="p-3 md:p-4 text-xs md:text-sm font-black text-[#0F214A]">{c.itemNome} <span className="text-[9px] font-bold text-slate-400 block font-normal">por {c.profissional.split(' ')[0]}</span></td>
                                         <td className="p-3 md:p-4 text-xs md:text-sm font-bold text-slate-600 text-center">{c.quantidade} {c.unidade}</td>
                                         <td className="p-3 md:p-4 text-sm font-black text-green-600 text-right">R$ {Number(c.precoTotal).toFixed(2)}</td>
                                         <td className="p-3 md:p-4 text-center">
                                            <button onClick={() => estornarProduto(c)} className="p-2 text-slate-300 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={14}/></button>
                                         </td>
                                      </tr>
                                   ))}
                                </tbody>
                             </table>
                         </div>
                      ) : (
                         <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <Package size={24} className="mx-auto text-slate-300 mb-2"/>
                            <p className="font-bold text-slate-500 text-xs">Nenhum material extra lançado.</p>
                         </div>
                      )}
                   </div>
                </div>
             </div>
          )}

          {tabAtiva === 'financeiro' && hasAccess(['gestor_clinico', 'admin_fin', 'recepcao']) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2">
               <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm">
                  <h3 className="font-black text-slate-800 mb-6 flex items-center text-lg"><Landmark className="text-green-500 mr-2"/> Faturamento e Cobrança</h3>
                  
                  {hasAccess(['gestor_clinico', 'admin_fin']) && (
                      <div className="space-y-4 mb-6">
                         <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <span className="text-xs md:text-sm font-bold text-slate-600">Valor Base da Sessão</span>
                            <span className="font-black text-slate-900 text-lg">R$ {Number(pacienteSelecionado.valor || 0).toFixed(2)}</span>
                         </div>
                      </div>
                  )}
                  
                  <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                      <p className="text-sm font-black text-blue-900 mb-2">Relatório Individual</p>
                      <p className="text-xs text-blue-800 mb-4 font-medium leading-relaxed">Emita o extrato consolidado de sessões realizadas e insumos consumidos para enviar a cobrança ao paciente.</p>
                      <button onClick={() => window.print()} className="w-full bg-[#00A1FF] text-white py-3.5 rounded-xl font-black text-sm shadow-md hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                          <FileText size={18}/> Gerar PDF de Cobrança
                      </button>
                  </div>
               </div>
            </div>
          )}

          {tabAtiva === 'dados' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
              <div className="bg-white p-6 md:p-10 rounded-[32px] border border-slate-100 shadow-sm">
                <h3 className="font-black text-slate-800 mb-6 flex items-center text-lg"><Search className="mr-2 text-[#00A1FF]"/> Exames Clínicos (TEDE)</h3>
                <div className="bg-slate-50 p-6 md:p-10 rounded-[24px] border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-center hover:bg-slate-100 transition-colors">
                  <input type="file" id="exame" className="hidden" onChange={handleUploadExame} accept="image/*,application/pdf" />
                  <label htmlFor="exame" className="cursor-pointer bg-[#0F214A] text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-black flex items-center gap-3 hover:bg-[#00A1FF] transition-all shadow-lg text-sm w-full md:w-auto justify-center">
                    {exameProcessando ? <Loader2 className="animate-spin"/> : <Plus/>} 
                    {exameProcessando ? 'Analisando Exame...' : 'Anexar Arquivo de Exame'}
                  </label>
                  <p className="text-[10px] md:text-xs text-slate-500 mt-4 font-bold">A IA transcreverá os dados numéricos e gerará um laudo automático.</p>
                </div>
                {laudoExame && (
                  <div className="mt-8 bg-blue-50 p-6 md:p-8 rounded-[32px] border border-blue-100 animate-in zoom-in-95">
                    <h4 className="font-black text-[#0F214A] mb-4 flex items-center gap-2 border-b border-blue-200 pb-3 text-sm md:text-base">
                      <Sparkles className="text-[#00A1FF]"/> Laudo Transcrito e Comparativo
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
            <div className="bg-[#0F214A] text-white p-6 md:p-10 rounded-[40px] shadow-2xl relative overflow-hidden min-h-[400px]">
              <div className="relative z-10">
                <h3 className="text-xl md:text-2xl font-black mb-6 md:mb-8 flex items-center gap-3 md:gap-4"><Sparkles className="text-[#FFCC00]" size={28}/> Análise do Agente IA</h3>
                {carregandoIA ? (
                  <div className="flex flex-col items-center justify-center h-48 md:h-64">
                    <Loader2 className="animate-spin text-[#00A1FF] mb-4" size={40}/>
                    <p className="font-black animate-pulse uppercase tracking-widest text-[10px] md:text-xs text-center">Lendo histórico completo...</p>
                  </div>
                ) : analiseIA ? (
                  <div className="prose prose-invert prose-blue max-w-none text-slate-300 font-medium leading-relaxed text-sm md:text-base">
                    {analiseIA.split('\n').map((linha, i) => <p key={i} className="mb-3">{linha}</p>)}
                  </div>
                ) : (
                  <div className="text-center py-16 md:py-20">
                     <p className="text-slate-400 font-bold mb-6 text-sm">Nenhuma análise gerada para este histórico.</p>
                     <button onClick={dispararAnaliseIA} className="bg-[#00A1FF] text-white px-8 py-3.5 rounded-2xl font-black hover:bg-blue-600 transition-colors shadow-lg text-sm w-full md:w-auto">Iniciar Processamento</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* INJEÇÃO DO MODAL PARA O PERFIL DO PACIENTE (Correção do Bug!) */}
        {renderFormularioModal()}
      </div>
    );
  }

  // ==============================================================================
  // TELA 2: LISTA GERAL DE PACIENTES
  // ==============================================================================
  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-[#0F214A] tracking-tight">Base de Pacientes</h1>
          <p className="text-slate-500 font-medium mt-1 text-sm md:text-base">Gerencie prontuários, materiais e anexos clínicos.</p>
        </div>
        <button onClick={() => abrirFormulario(null)} className="w-full md:w-auto bg-[#00A1FF] text-white px-8 py-3.5 rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-[#0F214A] transition-all flex items-center justify-center gap-2">
          <Plus size={20}/> Novo Registro
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="bg-white p-3 md:p-4 rounded-[24px] border border-slate-200 shadow-sm flex items-center focus-within:border-[#00A1FF] transition-all flex-1">
          <Search className="text-slate-400 mr-2 md:mr-3" size={20}/>
          <input placeholder="Procurar paciente pelo nome..." className="flex-1 outline-none text-slate-700 bg-transparent font-bold text-sm md:text-base" value={termoBusca} onChange={e => setTermoBusca(e.target.value)} />
        </div>
        
        <select 
          className="bg-white p-3 md:p-4 rounded-[24px] border border-slate-200 shadow-sm outline-none focus:border-[#00A1FF] font-bold text-slate-700 text-sm sm:w-48 cursor-pointer"
          value={filtroClinica}
          onChange={(e) => setFiltroClinica(e.target.value)}
        >
           <option value="Todas">Todas as Clínicas</option>
           {CLINICAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtrados.map(p => {
           const linkWhatsApp = `https://wa.me/${(p.whatsapp || '').replace(/\D/g, '')}`;
           const isReabtech = p.clinica === 'Reabtech';
           return (
             <div key={p.id} onClick={() => setPacienteSelecionado(p)} className="bg-white p-5 md:p-6 rounded-[24px] border border-slate-200 shadow-sm hover:border-[#00A1FF] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden">
                <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[9px] font-black uppercase tracking-wider ${isReabtech ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {p.clinica || 'Vida'}
                </div>
                
                <div className="pt-2">
                   <div className="flex justify-between items-start mb-4 gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-[#0F214A] text-base md:text-lg leading-tight group-hover:text-[#00A1FF] transition-colors truncate">{p.nome}</h3>
                        <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">CPF: {p.cpf}</p>
                      </div>
                      <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-[#00A1FF] transition-colors mt-2">
                        <ChevronRight className="text-[#00A1FF] group-hover:text-white" size={18}/>
                      </div>
                   </div>
                </div>
                <div className="pt-4 border-t border-slate-100 mt-2">
                   <a href={linkWhatsApp} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center justify-center gap-2 bg-green-50 text-green-600 px-4 py-2.5 rounded-xl text-[10px] md:text-xs font-black hover:bg-green-100 transition-colors w-full border border-green-100">
                     <MessageCircle size={14}/> Enviar Mensagem
                   </a>
                </div>
             </div>
           );
        })}
      </div>
      
      {filtrados.length === 0 && (
         <div className="text-center py-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <Users size={48} className="mx-auto text-slate-300 mb-4"/>
            <p className="font-bold text-slate-500">Nenhum paciente encontrado com esse filtro.</p>
         </div>
      )}

      {/* RENDERIZAÇÃO DO MODAL NA LISTA GERAL */}
      {renderFormularioModal()}

    </div>
  );
}