import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, X, ChevronLeft, Award, Smartphone, CreditCard,
  Trash2, Edit3, DollarSign, Sparkles, Download, Package, 
  TrendingDown, History, Info, Loader2, FileText
} from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { realizarAnaliseIAHistorico, transcreverExameIA } from '../services/geminiService';

export default function Pacientes({ pacientes, hasAccess, user }) {
  const [termoBusca, setTermoBusca] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [tabAtiva, setTabAtiva] = useState('historico'); 
  
  const [evolucoes, setEvolucoes] = useState([]);
  const [novoSoap, setNovoSoap] = useState('');
  const [metricaPain, setMetricaPain] = useState(5); 

  const [editando, setEditando] = useState(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  
  // IA States
  const [analiseIA, setAnaliseIA] = useState('');
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [exameProcessando, setExameProcessando] = useState(false);
  const [laudoExame, setLaudoExame] = useState('');

  const [novoPaciente, setNovoPaciente] = useState({
    nome: '', cpf: '', whatsapp: '', emergencia: '', valor: '', observacoes: ''
  });

  // --- LÓGICA DE BASE DE DADOS ---
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

  // --- LÓGICA DE IA ---
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
    setLaudoExame(''); // Limpa o laudo anterior
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64 = reader.result.split(',')[1];
        const resultado = await transcreverExameIA(base64);
        setLaudoExame(resultado);
        
        // Guarda no Firebase (Opcional, mas recomendado)
        await addDoc(collection(db, "pacientes", pacienteSelecionado.id, "exames"), {
          data: new Date().toISOString(),
          laudo: resultado,
          nomeArquivo: file.name
        });
      } catch (error) {
        alert("Erro ao processar exame. Tente uma imagem mais nítida.");
      }
      setExameProcessando(false);
    };
  };

  useEffect(() => {
    if (pacienteSelecionado) {
      const q = query(collection(db, "pacientes", pacienteSelecionado.id, "evolucoes"), orderBy("data", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setEvolucoes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      // Reseta os estados locais ao trocar de paciente
      setLaudoExame('');
      setAnaliseIA('');
      return () => unsubscribe();
    }
  }, [pacienteSelecionado]);

  const salvarEvolucao = async () => {
    if (!novoSoap) return;
    await addDoc(collection(db, "pacientes", pacienteSelecionado.id, "evolucoes"), {
      texto: novoSoap, data: new Date().toISOString(), profissional: user?.name, registro: user?.registro, metricaPain
    });
    setNovoSoap('');
    alert("Evolução guardada com sucesso!");
  };

  const filtrados = (pacientes || []).filter(p => (p.nome || '').toLowerCase().includes(termoBusca.toLowerCase()));

  // --- CONFIGURAÇÃO DE ABAS ---
  const abasDisponiveis = [
    { id: 'historico', icon: History, label: 'Histórico Clínico', restrito: false },
    { id: 'financeiro', icon: DollarSign, label: 'Financeiro Pessoal', restrito: true },
    { id: 'dados', icon: Info, label: 'Arquivos e Exames', restrito: false },
    { id: 'ia', icon: Sparkles, label: 'Agente IA', restrito: false }
  ];

  // ==========================================
  // TELA DE DETALHES DO PACIENTE
  // ==========================================
  if (pacienteSelecionado) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 pb-20">
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
            {hasAccess(['gestor_clinico']) && (
              <button onClick={() => excluirPaciente(pacienteSelecionado.id)} className={`p-3 rounded-2xl border shadow-sm transition-colors ${confirmarExclusao ? 'bg-red-600 text-white' : 'bg-white text-red-500 hover:bg-red-50'}`}>
                {confirmarExclusao ? 'Clique para confirmar' : <Trash2 size={18}/>}
              </button>
            )}
          </div>
        </header>

        {/* Dashboards Rápidos */}
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
             <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-4">Evolução de Dor (EVA)</p>
             <div className="flex items-end gap-1.5 h-12">
                {[4, 6, 8, 5, 4, 3, 2].map((v, i) => (
                  <div key={i} className="flex-1 bg-blue-500 rounded-t-md opacity-30 hover:opacity-100 transition-opacity" style={{height: `${v*10}%`}}></div>
                ))}
             </div>
             <p className="mt-4 text-xs font-bold text-blue-300 flex items-center"><TrendingDown size={14} className="mr-1"/> Histórico Estável</p>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex border-b border-slate-200 overflow-x-auto custom-scrollbar">
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

        {/* CONTEÚDO DAS ABAS */}
        <div className="mt-6">
          
          {/* ABA 1: HISTÓRICO */}
          {tabAtiva === 'historico' && (
            <div className="space-y-6">
               <div className="bg-blue-50 p-8 rounded-[32px] border border-blue-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-blue-900">Nova Evolução Clínica</h3>
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-blue-200 shadow-sm">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Escala EVA: {metricaPain}</span>
                      <input type="range" min="0" max="10" className="w-24 cursor-pointer accent-blue-600" value={metricaPain} onChange={e => setMetricaPain(e.target.value)}/>
                    </div>
                  </div>
                  <textarea className="w-full border-2 border-blue-100 rounded-2xl p-5 h-32 mb-4 outline-none focus:border-blue-500 bg-white font-medium text-slate-700" placeholder="Descreva o atendimento..." value={novoSoap} onChange={e => setNovoSoap(e.target.value)} />
                  <div className="flex gap-3">
                    <button onClick={salvarEvolucao} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black shadow-lg hover:bg-blue-700 transition-colors">Assinar Registro</button>
                  </div>
               </div>
               
               <div className="space-y-4">
                  {evolucoes.map(evo => (
                    <div key={evo.id} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
                      <div className="flex justify-between mb-4">
                        <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{evo.texto}</p>
                        {evo.metricaPain && <div className="text-red-500 font-black text-lg bg-red-50 px-3 py-1 rounded-xl h-fit">EVA {evo.metricaPain}</div>}
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 border-t border-slate-100 pt-4">
                        <span>{new Date(evo.data).toLocaleString()}</span>
                        <span className="text-blue-600 uppercase flex items-center gap-1"><Award size={12}/> {evo.profissional}</span>
                      </div>
                    </div>
                  ))}
                  {evolucoes.length === 0 && <p className="text-center text-slate-400 font-bold p-10">Nenhum histórico encontrado para este paciente.</p>}
               </div>
            </div>
          )}

          {/* ABA 2: FINANCEIRO */}
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

          {/* ABA 3: DADOS E EXAMES (A Nova Feature) */}
          {tabAtiva === 'dados' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
              <div className="bg-white p-10 rounded-[32px] border border-slate-100 shadow-sm">
                <h3 className="font-black text-slate-800 mb-6 flex items-center"><FileText className="mr-2 text-blue-600"/> Arquivos e Exames Clínicos (TEDE)</h3>
                
                <div className="bg-slate-50 p-10 rounded-[24px] border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-center hover:bg-slate-100 transition-colors">
                  <input type="file" id="exame" className="hidden" onChange={handleUploadExame} accept="image/*,application/pdf" />
                  <label htmlFor="exame" className="cursor-pointer bg-slate-900 text-white px-8 py-4 rounded-xl font-black flex items-center gap-3 hover:scale-105 transition-all shadow-lg">
                    {exameProcessando ? <Loader2 className="animate-spin"/> : <Plus/>} 
                    {exameProcessando ? 'A Analisar Exame...' : 'Anexar Ficheiro de Exame'}
                  </label>
                  <p className="text-xs text-slate-500 mt-4 font-bold">A Inteligência Artificial transcreverá os dados numéricos e gerará um laudo comparativo automático.</p>
                </div>

                {laudoExame && (
                  <div className="mt-8 bg-blue-50 p-8 rounded-[32px] border border-blue-100 animate-in zoom-in-95">
                    <h4 className="font-black text-blue-900 mb-6 flex items-center gap-2 border-b border-blue-200 pb-4">
                      <Sparkles className="text-blue-600"/> Laudo Transcrito e Comparativo (IA)
                    </h4>
                    <div className="prose prose-blue prose-sm max-w-none text-slate-700 font-medium">
                      {laudoExame.split('\n').map((linha, i) => (
                        <p key={i} className="mb-2 leading-relaxed">{linha}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA 4: IA E ESTATÍSTICAS */}
          {tabAtiva === 'ia' && (
            <div className="bg-slate-900 text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden min-h-[500px]">
              <div className="relative z-10">
                <h3 className="text-2xl font-black mb-8 flex items-center gap-4"><Sparkles className="text-blue-400" size={32}/> Análise do Agente IA</h3>
                {carregandoIA ? (
                  <div className="flex flex-col items-center justify-center h-64">
                    <Loader2 className="animate-spin text-blue-400 mb-4" size={48}/>
                    <p className="font-black animate-pulse uppercase tracking-widest text-xs">A ler histórico completo de evoluções...</p>
                  </div>
                ) : analiseIA ? (
                  <div className="prose prose-invert prose-blue max-w-none text-slate-300 font-medium leading-relaxed">
                    {analiseIA.split('\n').map((linha, i) => <p key={i} className="mb-3">{linha}</p>)}
                  </div>
                ) : (
                  <div className="text-center py-20">
                     <p className="text-slate-400 font-bold mb-6">Nenhuma análise gerada para este histórico ainda.</p>
                     <button onClick={dispararAnaliseIA} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black hover:bg-blue-700 transition-colors shadow-lg">Iniciar Processamento Quanti-Qualitativo</button>
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

  // ==========================================
  // TELA DA LISTA DE PACIENTES (TELA INICIAL)
  // ==========================================
  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Base de Pacientes</h1>
          <p className="text-slate-500 font-medium mt-1">Gerencie prontuários, faturamento e anexos clínicos.</p>
        </div>
        <button onClick={() => setMostrarForm(true)} className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg shadow-blue-200 hover:scale-105 transition-all flex items-center gap-2">
          <Plus size={20}/> Novo Registro
        </button>
      </div>

      <div className="bg-white p-4 rounded-[24px] border border-slate-200 shadow-sm flex items-center focus-within:ring-2 focus-within:ring-blue-500 transition-all">
        <Search className="text-slate-400 mr-3" size={24}/>
        <input placeholder="Procurar paciente pelo nome..." className="flex-1 outline-none text-slate-700 bg-transparent font-bold" value={termoBusca} onChange={e => setTermoBusca(e.target.value)} />
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
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
                <td colSpan="3" className="p-10 text-center text-slate-500 font-bold">Nenhum paciente encontrado com este nome.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white p-10 rounded-[40px] w-full max-w-2xl shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-8">
                <h3 className="font-black text-2xl text-slate-900">{editando ? 'Atualizar Dados' : 'Novo Registro de Paciente'}</h3>
                <button onClick={fecharForm} className="text-slate-400 hover:text-red-500 bg-slate-100 hover:bg-red-50 p-2 rounded-full transition-colors"><X/></button>
             </div>
             <form onSubmit={salvarPaciente} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <input required placeholder="Nome Completo" className="w-full border-2 p-4 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-bold text-slate-700" value={novoPaciente.nome} onChange={e => setNovoPaciente({...novoPaciente, nome: e.target.value})} />
                </div>
                <input required placeholder="CPF" className="border-2 p-4 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-bold text-slate-700" value={novoPaciente.cpf} onChange={e => setNovoPaciente({...novoPaciente, cpf: e.target.value})} />
                <input required placeholder="WhatsApp" className="border-2 p-4 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-bold text-slate-700" value={novoPaciente.whatsapp} onChange={e => setNovoPaciente({...novoPaciente, whatsapp: e.target.value})} />
                <input required placeholder="Tel. Emergência" className="border-2 p-4 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-bold text-slate-700" value={novoPaciente.emergencia} onChange={e => setNovoPaciente({...novoPaciente, emergencia: e.target.value})} />
                
                {hasAccess(['gestor_clinico', 'admin_fin']) ? (
                  <input required type="number" placeholder="Valor da Sessão (R$)" className="border-2 p-4 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-bold text-green-600" value={novoPaciente.valor} onChange={e => setNovoPaciente({...novoPaciente, valor: e.target.value})} />
                ) : (
                  <div className="border-2 p-4 rounded-xl bg-slate-100 text-slate-400 font-bold flex items-center justify-center cursor-not-allowed text-xs">Valor (Acesso Restrito)</div>
                )}
                
                <textarea placeholder="Observações clínicas iniciais..." className="md:col-span-2 border-2 p-4 rounded-xl bg-slate-50 outline-none focus:border-blue-500 h-24 font-medium text-slate-700" value={novoPaciente.observacoes} onChange={e => setNovoPaciente({...novoPaciente, observacoes: e.target.value})} />
                
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