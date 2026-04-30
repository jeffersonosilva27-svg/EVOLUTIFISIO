import React, { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, Calendar, ArrowUpRight, 
  ArrowDownRight, Loader2, Landmark, Package, ShoppingCart, Plus, X, Search, FileText, CheckCircle2, Eye, EyeOff, Trash2, Building2, Users
} from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, orderBy } from 'firebase/firestore';

import { temAcessoClinica } from '../App';

export default function Financeiro({ user, hasAccess }) {
  const isRecepcao = user?.role === 'recepcao';
  
  const [activeTab, setActiveTab] = useState(isRecepcao ? 'estoque' : 'resumo');
  const [censurado, setCensurado] = useState(true);

  const [transacoes, setTransacoes] = useState([]);
  const [estoque, setEstoque] = useState([]);
  const [consumos, setConsumos] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [pacientes, setPacientes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [mostrarModalEstoque, setMostrarModalEstoque] = useState(false);
  
  const [novoItem, setNovoItem] = useState({ 
      nome: '', unidade: 'un', quantidade: '', precoCompra: '', precoVenda: '', 
      clinicaVinculo: user?.clinicasAcesso?.length === 1 ? user.clinicasAcesso[0] : '' 
  });
  
  useEffect(() => {
    if (!user) return;

    const unsubTransacoes = onSnapshot(collection(db, "transacoes"), (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTransacoes(data.filter(t => temAcessoClinica(user.clinicasAcesso, t.clinicaVinculo)));
    });
    
    const unsubEstoque = onSnapshot(collection(db, "estoque"), (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setEstoque(data.filter(e => temAcessoClinica(user.clinicasAcesso, e.clinicaVinculo)));
    });
    
    const unsubConsumos = onSnapshot(query(collection(db, "consumos"), orderBy("data", "desc")), (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setConsumos(data.filter(c => temAcessoClinica(user.clinicasAcesso, c.clinicaVinculo) || true));
    });

    const unsubAgendamentos = onSnapshot(collection(db, "agendamentos"), (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAgendamentos(data.filter(a => temAcessoClinica(user.clinicasAcesso, a.clinicaVinculo)));
    });

    const unsubPacientes = onSnapshot(collection(db, "pacientes"), (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPacientes(data.filter(p => temAcessoClinica(user.clinicasAcesso, p.clinicaVinculo)));
    });
    
    setTimeout(() => setLoading(false), 500);
    return () => { unsubTransacoes(); unsubEstoque(); unsubConsumos(); unsubAgendamentos(); unsubPacientes(); };
  }, [user]);

  const formatarMoeda = (valor) => {
    if (censurado) return "R$ ****";
    return `R$ ${Number(valor).toFixed(2)}`;
  };

  const salvarItemEstoque = async (e) => {
      e.preventDefault();
      if (!novoItem.clinicaVinculo) return alert("Selecione a clínica para vincular este item de estoque.");
      try {
          await addDoc(collection(db, "estoque"), {
              nome: novoItem.nome, 
              unidade: novoItem.unidade,
              quantidade: parseInt(novoItem.quantidade),
              precoCompra: parseFloat(novoItem.precoCompra),
              precoVenda: parseFloat(novoItem.precoVenda),
              clinicaVinculo: novoItem.clinicaVinculo,
              dataCadastro: new Date().toISOString()
          });
          setMostrarModalEstoque(false); 
          setNovoItem({ nome: '', unidade: 'un', quantidade: '', precoCompra: '', precoVenda: '', clinicaVinculo: user?.clinicasAcesso?.length === 1 ? user.clinicasAcesso[0] : '' });
      } catch (err) { alert("Erro ao salvar produto no estoque."); }
  };

  const removerItemEstoque = async (id) => {
      if(window.confirm("Remover este item permanentemente do estoque?")) {
          await deleteDoc(doc(db, "estoque", id));
      }
  };

  // ==============================================================
  // MOTOR DE CÁLCULO FINANCEIRO DINÂMICO
  // ==============================================================
  
  // 1. Receitas de Sessões Realizadas Globais
  const receitasSessoes = agendamentos
    .filter(a => a.status === 'realizado')
    .reduce((acc, curr) => {
        const pacienteDoc = pacientes.find(p => p.id === curr.pacienteId);
        const valorSessao = curr.valorSessao ? parseFloat(curr.valorSessao) : (pacienteDoc ? parseFloat(pacienteDoc.valor) : 0);
        return acc + (isNaN(valorSessao) ? 0 : valorSessao);
    }, 0);

  // 2. Agrupamento de Rendimento por Profissional (Business Intelligence)
  const rendimentoPorProfissional = agendamentos
    .filter(a => a.status === 'realizado')
    .reduce((acc, curr) => {
        const pId = curr.profissionalId;
        const pNome = curr.profissional || 'Equipe';
        const pacienteDoc = pacientes.find(p => p.id === curr.pacienteId);
        const valorSessao = curr.valorSessao ? parseFloat(curr.valorSessao) : (pacienteDoc ? parseFloat(pacienteDoc.valor) : 0);
        const valorValido = isNaN(valorSessao) ? 0 : valorSessao;

        if (!acc[pId]) { acc[pId] = { nome: pNome, sessoes: 0, total: 0 }; }
        acc[pId].sessoes += 1;
        acc[pId].total += valorValido;
        return acc;
    }, {});

  // Converter objeto em array e ordenar pelo maior rendimento
  const rankingProfissionais = Object.values(rendimentoPorProfissional).sort((a, b) => b.total - a.total);

  // 3. Outras Receitas e Fechamento
  const receitasInsumos = consumos.reduce((acc, curr) => acc + (parseFloat(curr.precoTotal) || 0), 0);
  const receitasManuais = transacoes.filter(t => t.tipo === 'receita').reduce((acc, curr) => acc + Number(curr.valor), 0);
  const despesasManuais = transacoes.filter(t => t.tipo === 'despesa').reduce((acc, curr) => acc + Number(curr.valor), 0);

  const receitasTotais = receitasSessoes + receitasInsumos + receitasManuais;
  const despesasTotais = despesasManuais; 
  const saldo = receitasTotais - despesasTotais;

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#00A1FF]" size={40}/></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-black text-[#0F214A] tracking-tight flex items-center gap-3">
              <Landmark className="text-[#00A1FF]" size={32}/> {isRecepcao ? 'Estoque da Clínica' : 'Financeiro e Estoque'}
            </h1>
            <p className="text-slate-500 font-medium mt-1 text-sm">{isRecepcao ? 'Gerencie a entrada e saída de insumos' : 'Acompanhe as receitas, despesas e estoque da clínica.'}</p>
          </div>
          
          {!isRecepcao && (
              <button onClick={() => setCensurado(!censurado)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-black transition-colors flex items-center gap-2 w-fit shadow-sm border border-slate-200">
                  {censurado ? <><Eye size={16}/> Revelar Valores</> : <><EyeOff size={16}/> Ocultar Valores</>}
              </button>
          )}
      </div>

      <div className="flex flex-nowrap w-full border-b border-slate-200 overflow-x-auto custom-scrollbar">
        {!isRecepcao && (
            <button onClick={() => setActiveTab('resumo')} className={`shrink-0 px-6 py-4 flex items-center gap-2 text-sm font-bold border-b-2 whitespace-nowrap ${activeTab === 'resumo' ? 'border-[#00A1FF] text-[#00A1FF]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                <DollarSign size={16}/> Resumo Geral
            </button>
        )}
        <button onClick={() => setActiveTab('estoque')} className={`shrink-0 px-6 py-4 flex items-center gap-2 text-sm font-bold border-b-2 whitespace-nowrap ${activeTab === 'estoque' ? 'border-[#00A1FF] text-[#00A1FF]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            <Package size={16}/> Controle de Estoque
        </button>
        <button onClick={() => setActiveTab('consumos')} className={`shrink-0 px-6 py-4 flex items-center gap-2 text-sm font-bold border-b-2 whitespace-nowrap ${activeTab === 'consumos' ? 'border-[#00A1FF] text-[#00A1FF]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            <ShoppingCart size={16}/> Materiais Lançados
        </button>
      </div>

      {activeTab === 'resumo' && !isRecepcao && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-center transition-all">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-2 flex items-center gap-2">Receitas (Sessões + Insumos)</p>
                  <h3 className="text-3xl font-black text-green-600">{formatarMoeda(receitasTotais)}</h3>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-center transition-all">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-2 flex items-center gap-2">Despesas / Saídas</p>
                  <h3 className="text-3xl font-black text-red-600">{formatarMoeda(despesasTotais)}</h3>
                </div>
                <div className="bg-[#0F214A] p-6 rounded-[32px] shadow-xl flex flex-col justify-center text-white transition-all">
                  <p className="text-[10px] font-black uppercase text-[#00A1FF] mb-2 flex items-center gap-2">Saldo Consolidado em Caixa</p>
                  <h3 className="text-3xl font-black">{formatarMoeda(saldo)}</h3>
                </div>
              </div>
              
              {/* NOVO MÓDULO: BI - Rendimento por Profissional */}
              <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden w-full relative mt-8">
                  <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                     <h3 className="font-black text-[#0F214A] flex items-center gap-2 text-lg"><Users className="text-[#00A1FF]"/> Rendimento por Profissional</h3>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-lg border border-slate-200">Apenas Sessões</span>
                  </div>
                  <div className="w-full overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left min-w-[600px]">
                          <thead className="bg-white border-b border-slate-100">
                             <tr>
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase">Profissional</th>
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase text-center">Sessões Realizadas</th>
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase text-right">Total Gerado (R$)</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                             {rankingProfissionais.length > 0 ? rankingProfissionais.map((prof, idx) => (
                                 <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                     <td className="p-5 font-black text-[#0F214A] text-sm">{prof.nome}</td>
                                     <td className="p-5 text-center">
                                         <span className="px-3 py-1 rounded-lg text-xs font-black bg-blue-50 text-blue-700 border border-blue-100">
                                            {prof.sessoes}
                                         </span>
                                     </td>
                                     <td className="p-5 font-black text-green-600 text-right text-sm">{formatarMoeda(prof.total)}</td>
                                 </tr>
                             )) : (
                                 <tr>
                                     <td colSpan="3" className="p-10 text-center font-bold text-slate-400">
                                        Nenhuma sessão realizada registada no sistema.
                                     </td>
                                 </tr>
                             )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'estoque' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
              <div className="flex justify-end">
                  <button onClick={() => setMostrarModalEstoque(true)} className="bg-[#00A1FF] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-md hover:bg-[#0F214A] transition-colors flex items-center gap-2">
                      <Plus size={16}/> Novo Produto Base
                  </button>
              </div>
              <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden w-full relative">
                  <div className="w-full overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left min-w-[700px]">
                          <thead className="bg-slate-50 border-b border-slate-100">
                             <tr>
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase">Item Base</th>
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase text-center">Qtd Atual</th>
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase">Unidade</th>
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase">Valor de Venda</th>
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase text-right">Ações</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                             {estoque.map(item => (
                                 <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                     <td className="p-5 font-black text-[#0F214A]">{item.nome}</td>
                                     <td className="p-5 text-center">
                                         <span className={`px-3 py-1 rounded-lg text-xs font-black ${item.quantidade < 5 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-green-100 text-green-700'}`}>
                                            {item.quantidade}
                                         </span>
                                     </td>
                                     <td className="p-5 font-bold text-slate-500 uppercase text-xs">{item.unidade}</td>
                                     <td className="p-5 font-black text-green-600">{isRecepcao ? 'R$ ****' : formatarMoeda(item.precoVenda)}</td>
                                     <td className="p-5 text-right">
                                         <button onClick={() => removerItemEstoque(item.id)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg bg-slate-50 hover:bg-red-50 transition-colors">
                                             <Trash2 size={16}/>
                                         </button>
                                     </td>
                                 </tr>
                             ))}
                          </tbody>
                      </table>
                      {estoque.length === 0 && (
                          <div className="p-10 text-center font-bold text-slate-400 flex flex-col items-center">
                              <Package size={32} className="mb-2 text-slate-300"/>
                              Estoque vazio. Adicione novos produtos bases para utilizar nas consultas.
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'consumos' && (
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden w-full relative animate-in slide-in-from-bottom-4">
               <div className="w-full overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left min-w-[700px]">
                      <thead className="bg-slate-50 border-b border-slate-100">
                         <tr>
                            <th className="p-5 text-[10px] font-black text-slate-400 uppercase">Data do Lançamento</th>
                            <th className="p-5 text-[10px] font-black text-slate-400 uppercase">Paciente Origem</th>
                            <th className="p-5 text-[10px] font-black text-slate-400 uppercase">Insumo Utilizado</th>
                            <th className="p-5 text-[10px] font-black text-slate-400 uppercase text-center">Quantidade</th>
                            <th className="p-5 text-[10px] font-black text-slate-400 uppercase">Total Adicionado à Cobrança</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {consumos.map(c => (
                             <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                 <td className="p-5 text-xs font-bold text-slate-500">{new Date(c.data).toLocaleDateString('pt-BR')}</td>
                                 <td className="p-5 text-sm font-black text-[#0F214A]">{c.pacienteNome}</td>
                                 <td className="p-5 text-sm font-bold text-slate-700">{c.itemNome} <span className="text-[10px] text-slate-400 block font-normal">por {c.profissional?.split(' ')[0]}</span></td>
                                 <td className="p-5 text-sm font-black text-slate-600 text-center bg-slate-50 border-x border-slate-100">{c.quantidade} {c.unidade}</td>
                                 <td className="p-5 text-sm font-black text-green-600">{isRecepcao ? 'R$ ****' : formatarMoeda(c.precoTotal)}</td>
                             </tr>
                         ))}
                      </tbody>
                  </table>
                  {consumos.length === 0 && (
                      <div className="p-10 text-center font-bold text-slate-400 flex flex-col items-center">
                          <ShoppingCart size={32} className="mb-2 text-slate-300"/>
                          Nenhum consumo registado ainda nas fichas dos pacientes.
                      </div>
                  )}
              </div>
          </div>
      )}

      {mostrarModalEstoque && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white p-8 rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-xl text-[#0F214A]">Novo Produto</h3>
                <button onClick={() => setMostrarModalEstoque(false)} className="text-slate-400 hover:bg-red-50 hover:text-red-500 p-2 rounded-full transition-colors"><X size={20}/></button>
             </div>
             
             <form onSubmit={salvarItemEstoque} className="space-y-4">
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Nome do Produto</label>
                    <input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] font-bold text-slate-700" value={novoItem.nome} onChange={e => setNovoItem({...novoItem, nome: e.target.value})} />
                </div>
                
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <label className="text-[10px] font-black uppercase text-[#0F214A] mb-1 block flex items-center gap-1"><Building2 size={14}/> Base da Clínica</label>
                    <select required className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] font-bold text-slate-700 text-sm" value={novoItem.clinicaVinculo} onChange={e => setNovoItem({...novoItem, clinicaVinculo: e.target.value})}>
                        <option value="">Selecione o estoque destino...</option>
                        {user.clinicasAcesso?.includes('vida') && <option value="vida">Clínica Vida</option>}
                        {user.clinicasAcesso?.includes('reabtech') && <option value="reabtech">Clínica Relief/Reabtech</option>}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Qtd. Inicial</label>
                       <input required type="number" min="0" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] font-bold text-slate-700" value={novoItem.quantidade} onChange={e => setNovoItem({...novoItem, quantidade: e.target.value})} />
                   </div>
                   <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Unidade</label>
                       <select required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] font-bold text-slate-700" value={novoItem.unidade} onChange={e => setNovoItem({...novoItem, unidade: e.target.value})}>
                           <option value="un">Unidade (un)</option>
                           <option value="cx">Caixa (cx)</option>
                           <option value="ml">Mililitros (ml)</option>
                           <option value="g">Gramas (g)</option>
                       </select>
                   </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                   <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Custo (R$)</label>
                       <input required type="number" step="0.01" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] font-bold text-slate-700" value={novoItem.precoCompra} onChange={e => setNovoItem({...novoItem, precoCompra: e.target.value})} />
                   </div>
                   <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Valor Venda (R$)</label>
                       <input required type="number" step="0.01" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] font-bold text-slate-700" value={novoItem.precoVenda} onChange={e => setNovoItem({...novoItem, precoVenda: e.target.value})} />
                   </div>
                </div>
                <button type="submit" className="w-full bg-[#00A1FF] text-white py-4 rounded-xl font-black mt-2 hover:bg-[#0F214A] transition-all flex justify-center shadow-lg">
                    Adicionar Produto ao Estoque
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}