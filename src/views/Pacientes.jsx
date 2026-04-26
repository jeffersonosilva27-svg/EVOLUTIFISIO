import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, X, Save, FileText, ChevronLeft, Award, Smartphone, CreditCard,
  Trash2, Edit3, DollarSign, Activity, Sparkles, Download, Package, 
  TrendingUp, TrendingDown, AlertCircle, History, Info, Loader2
} from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { realizarAnaliseIAHistorico } from '../services/geminiService';

export default function Pacientes({ pacientes, hasAccess, user }) {
  const [termoBusca, setTermoBusca] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [tabAtiva, setTabAtiva] = useState('historico'); // 'historico', 'financeiro', 'dados', 'ia'
  
  const [evolucoes, setEvolucoes] = useState([]);
  const [novoSoap, setNovoSoap] = useState('');
  const [metricaPain, setMetricaPain] = useState(5); // 0-10 para o dashboard

  const [editando, setEditando] = useState(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [analiseIA, setAnaliseIA] = useState('');
  const [carregandoIA, setCarregandoIA] = useState(false);

  const [novoPaciente, setNovoPaciente] = useState({
    nome: '', cpf: '', whatsapp: '', emergencia: '', valor: '', observacoes: ''
  });

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
      fecharForm();
    } catch (error) { alert("Erro ao salvar."); }
  };

  const fecharForm = () => { setMostrarForm(false); setEditando(null); setNovoPaciente({ nome: '', cpf: '', whatsapp: '', emergencia: '', valor: '', observacoes: '' }); };

  const abrirEdicao = (p) => {
    setEditando(p.id);
    setNovoPaciente({ nome: p.nome, cpf: p.cpf, whatsapp: p.whatsapp, emergencia: p.emergencia, valor: p.valor, observacoes: p.observacoes || '' });
    setMostrarForm(true);
  };

  const excluirPaciente = async (id) => {
    if (!hasAccess(['gestor_clinico'])) return alert("Apenas gestores podem apagar registros.");
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

  useEffect(() => {
    if (pacienteSelecionado) {
      const q = query(collection(db, "pacientes", pacienteSelecionado.id, "evolucoes"), orderBy("data", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setEvolucoes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [pacienteSelecionado]);

  const salvarEvolucao = async () => {
    if (!novoSoap) return;
    await addDoc(collection(db, "pacientes", pacienteSelecionado.id, "evolucoes"), {
      texto: novoSoap, data: new Date().toISOString(), profissional: user?.name, registro: user?.registro, metricaPain
    });
    setNovoSoap('');
  };

  const filtrados = (pacientes || []).filter(p => (p.nome || '').toLowerCase().includes(termoBusca.toLowerCase()));

  // --- TELA DE DETALHES (CENTRO DE COMANDO) ---
  if (pacienteSelecionado) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 pb-20">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button onClick={() => {setPacienteSelecionado(null); setAnaliseIA(''); setConfirmarExclusao(false);}} className="flex items-center text-slate-500 font-bold hover:text-blue-600">
            <ChevronLeft className="mr-1"/> Voltar para a Base
          </button>
          <div className="flex gap-2">
            <button onClick={() => abrirEdicao(pacienteSelecionado)} className="p-3 bg-white border rounded-2xl hover:bg-slate-50 transition-colors shadow-sm" title="Editar"><Edit3 size={18}/></button>
            <button onClick={() => dispararAnaliseIA()} className="p-3 bg-[#1a1b1e] text-white rounded-2xl hover:bg-black transition-colors shadow-lg flex items-center gap-2">
              {carregandoIA ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18} className="text-blue-400"/>}
              <span className="text-xs font-bold">Analisar com IA</span>
            </button>
            {hasAccess(['gestor_clinico']) && (
              <button 
                onClick={() => excluirPaciente(pacienteSelecionado.id)} 
                className={`p-3 rounded-2xl transition-all border shadow-sm ${confirmarExclusao ? 'bg-red-600 text-white' : 'bg-white text-red-500'}`}
              >
                {confirmarExclusao ? 'Clique para confirmar' : <Trash2 size={18}/>}
              </button>
            )}
          </div>
        </header>

        {/* CARD PRINCIPAL COM DASHBOARD RÁPIDO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
            <h2 className="text-3xl font-black text-slate-900">{pacienteSelecionado.nome}</h2>
            <div className="flex flex-wrap gap-4 mt-3 text-slate-500 text-xs font-bold uppercase tracking-widest">
              <span className="bg-slate-100 px-3 py-1 rounded-full flex items-center"><Smartphone size={12} className="mr-1"/> {pacienteSelecionado.whatsapp}</span>
              <span className="bg-slate-100 px-3 py-1 rounded-full flex items-center"><CreditCard size={12} className="mr-1"/> {pacienteSelecionado.cpf}</span>
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full">Sessão: R$ {pacienteSelecionado.valor}</span>
            </div>
          </div>
          
          <div className="bg-[#1a1b1e] text-white p-8 rounded-[32px] shadow-xl relative overflow-hidden">
             <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-4">Evolução de Dor (Escala 0-10)</p>
             <div className="flex items-end gap-1 h-12">
                {[4, 6, 8, 5, 4, 3, 2].map((v, i) => (
                  <div key={i} className="flex-1 bg-blue-500 rounded-t-md opacity-20" style={{height: `${v*10}%`}}></div>
                ))}
                <div className="flex-1 bg-blue-400 rounded-t-md animate-pulse" style={{height: '20%'}}></div>
             </div>
             <p className="mt-4 text-xs font-bold text-blue-300 flex items-center"><TrendingDown size={14} className="mr-1"/> Redução de 50% nos sintomas</p>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex border-b border-slate-200">
          {[
            { id: 'historico', icon: History, label: 'Histórico' },
            { id: 'financeiro', icon: DollarSign, label: 'Financeiro' },
            { id: 'dados', icon: Info, label: 'Prontuário/Dados' },
            { id: 'ia', icon: Sparkles, label: 'Análise do Agente IA' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setTabAtiva(tab.id)}
              className={`px-6 py-4 flex items-center gap-2 text-sm font-bold transition-all border-b-2 ${tabAtiva === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              <tab.icon size={16}/> {tab.label}
            </button>
          ))}
        </div>

        {/* CONTEÚDO DAS ABAS */}
        <div className="mt-6">
          {tabAtiva === 'historico' && (
            <div className="space-y-6">
               <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-blue-900">Nova Evolução Clínica</h3>
                    <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-blue-200">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Escala de Dor: {metricaPain}</span>
                      <input type="range" min="0" max="10" className="w-20" value={metricaPain} onChange={e => setMetricaPain(e.target.value)}/>
                    </div>
                  </div>
                  <textarea className="w-full border-2 border-blue-100 rounded-2xl p-4 h-32 mb-4 outline-none focus:border-blue-500 bg-white" placeholder="Descreva o atendimento..." value={novoSoap} onChange={e => setNovoSoap(e.target.value)} />
                  <div className="flex gap-2">
                    <button onClick={salvarEvolucao} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:bg-blue-700">Assinar Registro</button>
                    <button className="bg-white text-slate-600 px-8 py-3 rounded-2xl font-bold border hover:bg-slate-50 flex items-center gap-2"><Download size={18}/> Relatório de Sessão</button>
                  </div>
               </div>
               
               <div className="space-y-4">
                  {evolucoes.map(evo => (
                    <div key={evo.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm group">
                      <div className="flex justify-between mb-4">
                        <p className="text-slate-800 leading-relaxed font-medium">{evo.texto}</p>
                        {evo.metricaPain && <div className="text-red-500 font-black text-xl">EVA {evo.metricaPain}</div>}
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 border-t pt-4">
                        <span>{new Date(evo.data).toLocaleString()}</span>
                        <span className="text-blue-600 uppercase flex items-center gap-1"><Award size={12}/> {evo.profissional}</span>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {tabAtiva === 'financeiro' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2">
               <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                  <h3 className="font-black text-slate-800 mb-6 flex items-center"><DollarSign className="text-green-600 mr-2"/> Extrato de Cobrança Mensal</h3>
                  <div className="space-y-4">
                     <div className="flex justify-between p-4 bg-slate-50 rounded-2xl">
                        <span className="text-sm font-medium">Atendimentos Realizados (8)</span>
                        <span className="font-bold text-slate-900">R$ {(pacienteSelecionado.valor * 8).toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between p-4 bg-slate-50 rounded-2xl">
                        <span className="text-sm font-medium">Insumos (Kinesio + Agulhas)</span>
                        <span className="font-bold text-slate-900">R$ 42,00</span>
                     </div>
                     <div className="flex justify-between p-4 bg-blue-600 text-white rounded-2xl shadow-lg">
                        <span className="text-sm font-black">Total em Aberto</span>
                        <span className="font-black text-xl">R$ {(pacienteSelecionado.valor * 8 + 42).toFixed(2)}</span>
                     </div>
                  </div>
                  <button className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2"><Download size={20}/> Gerar Fatura PDF</button>
               </div>

               <div className="bg-blue-50 p-8 rounded-[32px] border border-blue-100">
                  <h3 className="font-black text-blue-900 mb-6 flex items-center"><Package className="mr-2"/> Adicionar Insumo Extra</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button className="bg-white p-4 rounded-2xl border border-blue-200 hover:border-blue-600 transition-all font-bold text-xs">Kinesio Tape (+ R$ 25)</button>
                    <button className="bg-white p-4 rounded-2xl border border-blue-200 hover:border-blue-600 transition-all font-bold text-xs">Agulhamento (+ R$ 4)</button>
                  </div>
                  <div className="mt-8 p-4 bg-white/50 rounded-2xl">
                     <p className="text-[10px] font-bold text-slate-400 uppercase">Avisos Financeiros</p>
                     <p className="text-xs text-slate-600 mt-1 font-medium">O paciente possui um débito referente ao mês anterior pendente.</p>
                  </div>
               </div>
            </div>
          )}

          {tabAtiva === 'ia' && (
            <div className="bg-slate-900 text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden min-h-[500px]">
              <div className="relative z-10">
                <h3 className="text-2xl font-black mb-8 flex items-center gap-4">
                  <Sparkles className="text-blue-400" size={32}/> 
                  Análise Quali-Quanti do Agente IA
                </h3>
                
                {carregandoIA ? (
                  <div className="flex flex-col items-center justify-center h-64">
                    <Loader2 className="animate-spin text-blue-400 mb-4" size={48}/>
                    <p className="font-black animate-pulse uppercase tracking-widest text-xs">Agente processando histórico massivo...</p>
                  </div>
                ) : analiseIA ? (
                  <div className="prose prose-invert prose-blue max-w-none">
                    {analiseIA.split('\n').map((linha, i) => (
                       <p key={i} className="text-slate-300 leading-relaxed font-medium mb-2">{linha}</p>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20">
                     <p className="text-slate-500 font-bold mb-6">Nenhuma análise gerada para este histórico ainda.</p>
                     <button onClick={dispararAnaliseIA} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all">Iniciar Processamento de Dados</button>
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

  // --- TELA DA LISTA DE PACIENTES ---
  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Base de Pacientes</h1>
          <p className="text-slate-500 font-medium mt-1">Gerencie prontuários, faturamento e análise reabilitativa.</p>
        </div>
        <button onClick={() => setMostrarForm(true)} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2">
          <Plus size={20}/> Novo Registro
        </button>
      </div>

      <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm flex items-center focus-within:ring-2 focus-within:ring-blue-500 transition-all">
        <Search className="text-slate-400 mr-3" size={24}/>
        <input placeholder="Buscar paciente por nome ou CPF..." className="flex-1 outline-none text-slate-700 bg-transparent font-bold" value={termoBusca} onChange={e => setTermoBusca(e.target.value)} />
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
            <tr>
              <th className="p-6">Identificação do Paciente</th>
              <th className="p-6">Status / Contato</th>
              <th className="p-6 text-right">Métricas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map(p => (
              <tr key={p.id} className="hover:bg-blue-50/50 cursor-pointer transition-colors group" onClick={() => setPacienteSelecionado(p)}>
                <td className="p-6">
                  <div className="font-black text-slate-900 text-lg">{p.nome}</div>
                  <div className="text-xs text-slate-500 font-bold uppercase mt-1 tracking-tighter">CPF: {p.cpf}</div>
                </td>
                <td className="p-6">
                   <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      <span className="text-xs font-black uppercase text-slate-700">Ativo</span>
                   </div>
                   <div className="text-sm text-slate-500 font-medium">{p.whatsapp}</div>
                </td>
                <td className="p-6 text-right">
                   <div className="inline-flex items-center gap-4 bg-white px-5 py-2 rounded-2xl border border-slate-100 group-hover:border-blue-200 shadow-sm transition-all">
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Última EVA</p>
                        <p className="text-sm font-black text-red-500">4/10</p>
                      </div>
                      <ChevronLeft className="rotate-180 text-blue-600" size={20}/>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FORMULÁRIO DE CADASTRO/EDIÇÃO */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white p-10 rounded-[40px] w-full max-w-2xl shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-8">
                <h3 className="font-black text-2xl text-slate-900">{editando ? 'Atualizar Dados' : 'Novo Registro de Paciente'}</h3>
                <button onClick={fecharForm} className="text-slate-400 hover:text-red-500 bg-slate-50 p-2 rounded-full"><X/></button>
             </div>
             <form onSubmit={salvarPaciente} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2"><input required placeholder="Nome Completo" className="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none focus:border-blue-500 font-bold" value={novoPaciente.nome} onChange={e => setNovoPaciente({...novoPaciente, nome: e.target.value})} /></div>
                <input required placeholder="CPF" className="border-2 p-4 rounded-2xl bg-slate-50 outline-none focus:border-blue-500 font-bold" value={novoPaciente.cpf} onChange={e => setNovoPaciente({...novoPaciente, cpf: e.target.value})} />
                <input required placeholder="WhatsApp" className="border-2 p-4 rounded-2xl bg-slate-50 outline-none focus:border-blue-500 font-bold" value={novoPaciente.whatsapp} onChange={e => setNovoPaciente({...novoPaciente, whatsapp: e.target.value})} />
                <input required placeholder="Tel. Emergência" className="border-2 p-4 rounded-2xl bg-slate-50 outline-none focus:border-blue-500 font-bold" value={novoPaciente.emergencia} onChange={e => setNovoPaciente({...novoPaciente, emergencia: e.target.value})} />
                <input required type="number" placeholder="Valor da Sessão" className="border-2 p-4 rounded-2xl bg-slate-50 outline-none focus:border-blue-500 font-bold text-green-600" value={novoPaciente.valor} onChange={e => setNovoPaciente({...novoPaciente, valor: e.target.value})} />
                <textarea placeholder="Observações clínicas iniciais..." className="md:col-span-2 border-2 p-4 rounded-2xl bg-slate-50 outline-none focus:border-blue-500 h-24" value={novoPaciente.observacoes} onChange={e => setNovoPaciente({...novoPaciente, observacoes: e.target.value})} />
                <button type="submit" className="md:col-span-2 bg-blue-600 text-white py-5 rounded-[24px] font-black text-lg shadow-xl hover:bg-blue-700 transition-all">
                  {editando ? 'Salvar Alterações' : 'Concluir Cadastro no Sistema'}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}