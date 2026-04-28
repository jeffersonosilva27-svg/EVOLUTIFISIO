import React, { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, Calendar, Users, ChevronLeft, ChevronRight,
  ArrowUpCircle, ArrowDownCircle, PieChart, 
  Download, Filter, Loader2, CheckCircle2, Clock, User, Printer, AlertTriangle, Package, ShoppingCart, Trash2, Edit3, Plus, TrendingDown, Archive, Search, Landmark, X
} from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';

const parseValor = (valor) => {
  if (!valor) return 0;
  if (typeof valor === 'number') return valor;
  const limpo = String(valor).replace(',', '.').replace(/[^0-9.-]+/g, "");
  const num = parseFloat(limpo);
  return isNaN(num) ? 0 : num;
};

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// =========================================================================================
// MÓDULO DE ESTOQUE (Embutido para otimizar espaço no menu principal)
// =========================================================================================
function ModuloEstoque({ hasAccess }) {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const [novoItem, setNovoItem] = useState({
    nome: '', categoria: '', quantidade: 0, quantidadeMinima: 5, unidade: 'unid', observacoes: '', precoCusto: '', precoVenda: ''
  });

  useEffect(() => {
    const q = query(collection(db, "estoque"), orderBy("nome", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setItens(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const salvarItem = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const itemParaSalvar = {
          ...novoItem,
          precoCusto: parseFloat(novoItem.precoCusto) || 0,
          precoVenda: parseFloat(novoItem.precoVenda) || 0
      };

      if (editandoId) {
        await updateDoc(doc(db, "estoque", editandoId), itemParaSalvar);
      } else {
        await addDoc(collection(db, "estoque"), { ...itemParaSalvar, dataCriacao: new Date().toISOString() });
      }
      fecharFormulario();
    } catch (error) { alert("Erro ao salvar no estoque."); }
    setSalvando(false);
  };

  const abrirFormulario = () => {
    setEditandoId(null);
    setNovoItem({ nome: '', categoria: '', quantidade: 0, quantidadeMinima: 5, unidade: 'unid', observacoes: '', precoCusto: '', precoVenda: '' });
    setMostrarForm(true);
  };

  const abrirEdicao = (item) => {
    setEditandoId(item.id);
    setNovoItem({ ...item });
    setMostrarForm(true);
  };

  const fecharFormulario = () => {
    setMostrarForm(false);
    setEditandoId(null);
    setNovoItem({ nome: '', categoria: '', quantidade: 0, quantidadeMinima: 5, unidade: 'unid', observacoes: '', precoCusto: '', precoVenda: '' });
  };

  const excluirItem = async (id) => {
    if (!hasAccess(['gestor_clinico'])) return alert("Acesso restrito ao gestor.");
    if (window.confirm("Remover este item permanentemente do estoque?")) {
      await deleteDoc(doc(db, "estoque", id));
    }
  };

  const ajustarQuantidade = async (item, delta) => {
    const novaQtd = Math.max(0, (item.quantidade || 0) + delta);
    await updateDoc(doc(db, "estoque", item.id), { quantidade: novaQtd });
  };

  const filtrados = itens
    .filter(i => (i.nome||'').toLowerCase().includes(termoBusca.toLowerCase()))
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <Loader2 className="animate-spin text-[#00A1FF]" size={48} />
      <p className="font-black text-slate-400 uppercase text-xs tracking-widest">Carregando Inventário...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#0F214A] tracking-tight flex items-center gap-2">
            <Package className="text-[#00A1FF]"/> Inventário de Materiais
          </h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Gerencie suprimentos e defina a precificação para faturamento.</p>
        </div>
        <button onClick={abrirFormulario} className="bg-[#00A1FF] text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-[#0F214A] transition-all flex items-center gap-2 text-sm w-full md:w-auto justify-center">
          <Plus size={18}/> Novo Item
        </button>
      </div>

      <div className="bg-white p-4 rounded-[24px] border border-slate-200 shadow-sm flex items-center focus-within:border-[#00A1FF] transition-all">
        <Search className="text-slate-400 mr-3" size={24}/>
        <input placeholder="Buscar produto no estoque..." className="flex-1 outline-none text-slate-700 bg-transparent font-bold" value={termoBusca} onChange={e => setTermoBusca(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtrados.map(item => {
           const estoqueBaixo = item.quantidade <= item.quantidadeMinima;
           return (
             <div key={item.id} className={`bg-white p-6 rounded-[24px] border transition-all flex flex-col ${estoqueBaixo ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}>
                <div className="flex justify-between items-start mb-4">
                   <div>
                      <span className="text-[10px] font-black uppercase text-[#00A1FF] bg-blue-50 px-2 py-1 rounded-md mb-2 inline-block">{item.categoria || 'Geral'}</span>
                      <h3 className="font-black text-[#0F214A] text-lg leading-tight">{item.nome}</h3>
                   </div>
                   <button onClick={() => abrirEdicao(item)} className="p-2 text-slate-400 hover:text-[#00A1FF] transition-colors"><Edit3 size={18}/></button>
                </div>

                <div className="flex items-center justify-between mb-4 px-1">
                   <div>
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Custo</span>
                       <span className="text-sm font-bold text-slate-600">R$ {Number(item.precoCusto || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                   </div>
                   <div className="text-right">
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Venda</span>
                       <span className="text-sm font-black text-green-600">R$ {Number(item.precoVenda || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                   </div>
                </div>

                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-4 mt-auto">
                   <button onClick={() => ajustarQuantidade(item, -1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-red-100 text-slate-600 hover:text-red-600 transition-colors"><TrendingDown size={20}/></button>
                   <div className="text-center">
                      <p className="text-2xl font-black text-[#0F214A]">{item.quantidade}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.unidade}</p>
                   </div>
                   <button onClick={() => ajustarQuantidade(item, 1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-green-100 text-slate-600 hover:text-green-600 transition-colors"><TrendingUp size={20}/></button>
                </div>

                <div className="flex justify-between items-center">
                   {estoqueBaixo ? (
                      <div className="flex items-center gap-1 text-red-600 font-black text-[10px] uppercase animate-pulse">
                         <AlertCircle size={14}/> Estoque Baixo
                      </div>
                   ) : (
                      <div className="text-slate-400 font-bold text-[10px] uppercase">Estoque Normal</div>
                   )}
                   <button onClick={() => excluirItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                </div>
             </div>
           );
        })}
        {filtrados.length === 0 && (
           <div className="col-span-full text-center py-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <Package size={48} className="mx-auto text-slate-300 mb-4"/>
              <p className="font-bold text-slate-500">Nenhum item encontrado no estoque.</p>
           </div>
        )}
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white p-10 rounded-[40px] w-full max-w-xl shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[95vh] custom-scrollbar">
             <div className="flex justify-between items-center mb-8 shrink-0">
                <h3 className="font-black text-2xl text-[#0F214A]">{editandoId ? 'Editar Item' : 'Novo Item no Estoque'}</h3>
                {/* O 'X' AGORA ESTÁ IMPORTADO E FUNCIONA! */}
                <button onClick={fecharFormulario} className="text-slate-400 hover:text-red-500 bg-slate-100 hover:bg-red-50 p-2 rounded-full transition-colors"><X size={20}/></button>
             </div>
             
             <form onSubmit={salvarItem} className="space-y-5">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block ml-2">Nome do Material/Produto</label>
                  <input required placeholder="Ex: Rolo de Kinesio, Agulhas..." className="w-full border-2 p-4 rounded-xl bg-slate-50 outline-none focus:border-[#00A1FF] font-bold text-slate-700" value={novoItem.nome} onChange={e => setNovoItem({...novoItem, nome: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block ml-2">Categoria</label>
                     <select required className="w-full border-2 p-4 rounded-xl bg-slate-50 outline-none focus:border-[#00A1FF] font-bold text-slate-700" value={novoItem.categoria} onChange={e => setNovoItem({...novoItem, categoria: e.target.value})}>
                        <option value="">Categoria...</option>
                        <option value="Consumíveis">Consumíveis (Géis/Agulhas)</option>
                        <option value="Equipamentos">Equipamentos</option>
                        <option value="Hospitalar">Hospitalar</option>
                        <option value="Escritório">Papelaria/Escritório</option>
                        <option value="Limpeza">Limpeza/Higiene</option>
                        <option value="Venda Direta">Produtos para Venda</option>
                     </select>
                   </div>
                   <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block ml-2">Unidade de Medida</label>
                     <input placeholder="Ex: unid, caixa, rolo" className="w-full border-2 p-4 rounded-xl bg-slate-50 outline-none focus:border-[#00A1FF] font-bold text-slate-700" value={novoItem.unidade} onChange={e => setNovoItem({...novoItem, unidade: e.target.value})} />
                   </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <p className="text-xs font-black uppercase tracking-widest text-[#0F214A] mb-3 flex items-center gap-1"><DollarSign size={14} className="text-green-500"/> Precificação</p>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Preço de Custo (R$)</label>
                          <input type="number" step="0.01" placeholder="0.00" className="w-full border-2 p-4 rounded-xl bg-white outline-none focus:border-[#00A1FF] font-bold text-slate-700" value={novoItem.precoCusto} onChange={e => setNovoItem({...novoItem, precoCusto: e.target.value})} />
                       </div>
                       <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Preço de Venda (R$)</label>
                          <input type="number" step="0.01" placeholder="0.00" className="w-full border-2 p-4 rounded-xl bg-white outline-none focus:border-green-400 font-black text-green-600" value={novoItem.precoVenda} onChange={e => setNovoItem({...novoItem, precoVenda: e.target.value})} />
                       </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block ml-2">Quantidade Atual</label>
                      <input required type="number" className="w-full border-2 p-4 rounded-xl bg-slate-50 outline-none focus:border-[#00A1FF] font-bold text-slate-700" value={novoItem.quantidade} onChange={e => setNovoItem({...novoItem, quantidade: parseInt(e.target.value)})} />
                   </div>
                   <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block ml-2">Aviso de Falta (Qtd Mínima)</label>
                      <input required type="number" className="w-full border-2 p-4 rounded-xl bg-slate-50 outline-none focus:border-[#00A1FF] font-bold text-slate-700" value={novoItem.quantidadeMinima} onChange={e => setNovoItem({...novoItem, quantidadeMinima: parseInt(e.target.value)})} />
                   </div>
                </div>

                <button type="submit" disabled={salvando} className="w-full bg-[#00A1FF] text-white py-5 rounded-[24px] font-black text-lg shadow-xl hover:bg-[#0F214A] transition-all flex justify-center mt-4">
                  {salvando ? <Loader2 className="animate-spin"/> : (editandoId ? 'Salvar Alterações' : 'Adicionar ao Estoque')}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================================
// MÓDULO PRINCIPAL DE CAIXA E FATURAMENTO
// =========================================================================================
export default function Financeiro({ user, navegarPara, hasAccess }) {
  const [tabAtiva, setTabAtiva] = useState('caixa'); 

  const [agendamentos, setAgendamentos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [consumosGlobais, setConsumosGlobais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth());
  const [pacienteRelatorio, setPacienteRelatorio] = useState('');

  useEffect(() => {
    const unsubA = onSnapshot(collection(db, "agendamentos"), snap => setAgendamentos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubP = onSnapshot(collection(db, "pacientes"), snap => setPacientes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubProf = onSnapshot(collection(db, "profissionais"), snap => setProfissionais(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubConsumos = onSnapshot(collection(db, "consumos"), snap => {
        setConsumosGlobais(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
    });
    return () => { unsubA(); unsubP(); unsubProf(); unsubConsumos(); };
  }, []);

  const avancarMes = () => setMesFiltro(prev => prev === 11 ? 0 : prev + 1);
  const voltarMes = () => setMesFiltro(prev => prev === 0 ? 11 : prev - 1);

  const apagarFantasma = async (id, nome) => {
    if (window.confirm(`Este é um registro órfão de "${nome}" (o paciente foi excluído). Deseja apagar esta sessão permanentemente do banco de dados?`)) {
        try {
            await deleteDoc(doc(db, "agendamentos", id));
            alert("Fantasma exorcizado com sucesso! 👻🔫");
        } catch (e) {
            alert("Erro ao apagar o registro.");
        }
    }
  };

  const calcularMetricas = () => {
    let realizado = 0; let projetado = 0; let sessoesRealizadasCount = 0; const porProfissional = {};
    
    agendamentos.forEach(ag => {
      const dataAg = new Date(ag.data + 'T12:00:00');
      if (dataAg.getMonth() !== mesFiltro) return;
      const paciente = pacientes.find(p => p.id === ag.pacienteId);
      const valorSessao = parseValor(paciente?.valor);
      
      if (ag.status === 'realizado') {
        realizado += valorSessao; sessoesRealizadasCount++;
        const nomeProfissional = (ag.profissionalNome || ag.profissional || 'Equipe').split(' ')[0];
        porProfissional[nomeProfissional] = (porProfissional[nomeProfissional] || 0) + valorSessao;
      }
      if (ag.status !== 'cancelado') projetado += valorSessao;
    });

    consumosGlobais.forEach(c => {
        const dataC = new Date(c.data);
        if (dataC.getMonth() !== mesFiltro) return;
        realizado += parseValor(c.precoTotal);
    });

    return { realizado, projetado, sessoesRealizadasCount, porProfissional };
  };

  const pacienteSelecionadoDados = pacientes.find(p => p.id === pacienteRelatorio);
  const sessoesIndividuais = !pacienteRelatorio ? [] : agendamentos.filter(a => a.pacienteId === pacienteRelatorio && a.status === 'realizado' && new Date(a.data + 'T12:00:00').getMonth() === mesFiltro).sort((a, b) => new Date(a.data) - new Date(b.data));
  const consumosIndividuais = !pacienteRelatorio ? [] : consumosGlobais.filter(c => c.pacienteId === pacienteRelatorio && new Date(c.data).getMonth() === mesFiltro).sort((a,b) => new Date(a.data) - new Date(b.data));

  const stats = calcularMetricas();

  const valorFixoSessao = parseValor(pacienteSelecionadoDados?.valor);
  const totalSessoesR$ = sessoesIndividuais.length * valorFixoSessao;
  const totalConsumosR$ = consumosIndividuais.reduce((acc, c) => acc + parseValor(c.precoTotal), 0);
  const totalGeralFatura = totalSessoesR$ + totalConsumosR$;

  const sessoesPorCategoria = sessoesIndividuais.reduce((acc, ag) => {
      const prof = profissionais.find(p => p.id === ag.profissionalId);
      const categoria = prof?.categoriaBase || 'Atendimento Clínico';
      if (!acc[categoria]) acc[categoria] = [];
      acc[categoria].push(ag);
      return acc;
  }, {});

  const imprimirRelatorio = () => { window.print(); };

  const entradasGerais = [
      ...agendamentos.filter(a => a.status === 'realizado' && new Date(a.data + 'T12:00:00').getMonth() === mesFiltro).map(a => ({...a, tipoDoc: 'sessao', sortDate: new Date(a.data + 'T12:00:00')})),
      ...consumosGlobais.filter(c => new Date(c.data).getMonth() === mesFiltro).map(c => ({...c, tipoDoc: 'produto', sortDate: new Date(c.data)}))
  ].sort((a,b) => b.sortDate - a.sortDate);

  const pacientesOrdenados = [...pacientes].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

  if (loading) return ( <div className="h-full flex flex-col items-center justify-center"><Loader2 className="animate-spin text-[#00A1FF] mb-4" size={48} /><p className="font-black text-slate-400 uppercase text-xs">Sincronizando faturamento...</p></div> );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 print:bg-white print:m-0 print:p-0">
      
      <div className="flex border-b border-slate-200 print:hidden overflow-x-auto custom-scrollbar">
         <button onClick={() => setTabAtiva('caixa')} className={`px-8 py-4 flex items-center gap-2 text-sm font-black transition-all border-b-4 whitespace-nowrap ${tabAtiva === 'caixa' ? 'border-[#00A1FF] text-[#00A1FF] bg-[#00A1FF]/5' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            <Landmark size={18}/> Fluxo de Caixa
         </button>
         <button onClick={() => setTabAtiva('estoque')} className={`px-8 py-4 flex items-center gap-2 text-sm font-black transition-all border-b-4 whitespace-nowrap ${tabAtiva === 'estoque' ? 'border-[#00A1FF] text-[#00A1FF] bg-[#00A1FF]/5' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            <Package size={18}/> Controle de Estoque
         </button>
      </div>

      {tabAtiva === 'estoque' ? (
          <ModuloEstoque hasAccess={hasAccess} />
      ) : (
          <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
              <div className="flex flex-col md:flex-row justify-between items-end gap-4 print:hidden">
                <div>
                  <h1 className="text-3xl font-black text-[#0F214A] tracking-tight flex items-center gap-3"><Landmark className="text-green-500" size={32}/> Visão Financeira</h1>
                  <p className="text-slate-500 font-medium mt-1">Faturamento de sessões e vendas de materiais da clínica.</p>
                </div>
                <div className="flex items-center bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                  <button onClick={voltarMes} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronLeft size={20} className="text-[#0F214A]"/></button>
                  <span className="w-32 text-center font-black text-[#00A1FF] uppercase tracking-widest">{MESES[mesFiltro]}</span>
                  <button onClick={avancarMes} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronRight size={20} className="text-[#0F214A]"/></button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
                <div className="bg-[#0F214A] rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#00A1FF] mb-2">Total Arrecadado</p>
                    <h3 className="text-4xl font-black">R$ {stats.realizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    <div className="flex items-center gap-2 mt-4 text-green-400 font-bold text-xs"><ArrowUpCircle size={16}/> {stats.sessoesRealizadasCount} sessões + Vendas</div>
                  </div>
                </div>
                <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Previsão Mensal (Sessões)</p>
                  <h3 className="text-4xl font-black text-slate-800">R$ {stats.projetado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                  <div className="flex items-center gap-2 mt-4 text-amber-500 font-bold text-xs"><Clock size={16}/> Inclui pendentes na agenda</div>
                </div>
                <div className="bg-[#00A1FF] rounded-[32px] p-8 text-white shadow-xl shadow-blue-200">
                  <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-2">Ticket Médio / Sessão</p>
                  <h3 className="text-4xl font-black">R$ {stats.sessoesRealizadasCount > 0 ? (stats.realizado / stats.sessoesRealizadasCount).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:hidden">
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8">
                  <h3 className="text-xl font-black text-[#0F214A] mb-6 flex items-center gap-2"><PieChart className="text-[#00A1FF]"/> Produção por Profissional (Sessões)</h3>
                  <div className="space-y-6">
                    {Object.entries(stats.porProfissional).length > 0 ? Object.entries(stats.porProfissional).sort((a,b) => b[1] - a[1]).map(([nome, valor]) => (
                        <div key={nome}>
                          <div className="flex justify-between items-end mb-2"><span className="font-black text-slate-700">{nome}</span><span className="font-black text-[#00A1FF]">R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                          <div className="w-full h-3 bg-slate-100 rounded-full"><div className="h-full bg-[#00A1FF] rounded-full" style={{ width: stats.realizado > 0 ? `${(valor / stats.realizado) * 100}%` : '0%' }}></div></div>
                        </div>
                    )) : <p className="text-center py-10 text-slate-400 font-bold text-sm">Sem faturamento.</p>}
                  </div>
                </div>
                
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 flex flex-col">
                  <h3 className="text-xl font-black text-[#0F214A] mb-6 flex items-center gap-2"><CheckCircle2 className="text-green-500"/> Visão Geral de Entradas</h3>
                  <div className="flex-1 overflow-y-auto max-h-[300px] custom-scrollbar space-y-3 pr-2">
                     {entradasGerais.map(item => {
                         if (item.tipoDoc === 'sessao') {
                             const pac = pacientes.find(p => p.id === item.pacienteId); 
                             const valorSessao = parseValor(pac?.valor);
                             const isFantasma = !pac;

                             return (
                               <div key={`sessao-${item.id}`} className={`flex justify-between items-center p-4 bg-slate-50 rounded-2xl border transition-all group ${valorSessao === 0 ? 'border-red-200' : 'border-slate-200 hover:border-[#00A1FF]'}`}>
                                  <div>
                                    <p className="font-black text-slate-800 text-sm group-hover:text-[#00A1FF] transition-colors">
                                        {item.paciente} {isFantasma && <span className="text-[9px] text-red-500 ml-1">(Excluído)</span>}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(item.data).toLocaleDateString('pt-BR')} • {(item.profissional || 'Equipe').split(' ')[0]}</p>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    {valorSessao > 0 ? (
                                        <p className="font-black text-slate-900">R$ {valorSessao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            {!isFantasma ? (
                                                <button onClick={() => navegarPara && navegarPara('pacientes', { pacienteId: item.pacienteId })} className="font-black text-amber-600 flex items-center gap-1 text-[11px] bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded-lg transition-colors shadow-sm" title="Ir para a ficha">
                                                   <AlertTriangle size={14}/> Sem Valor
                                                </button>
                                            ) : null}
                                            
                                            {isFantasma && (
                                                <button onClick={() => apagarFantasma(item.id, item.paciente)} className="font-black text-red-600 flex items-center gap-1 text-[11px] bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1 rounded-lg transition-colors shadow-sm" title="Apagar este registro órfão do sistema">
                                                   <Trash2 size={14}/> Limpar Erro
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <span className="text-[9px] font-black text-green-600 bg-green-100 px-2 py-0.5 rounded uppercase mt-1">Sessão</span>
                                  </div>
                               </div>
                             )
                         } else {
                             return (
                               <div key={`prod-${item.id}`} className="flex justify-between items-center p-4 bg-blue-50/30 rounded-2xl border border-blue-100 hover:border-[#00A1FF] transition-all group">
                                  <div>
                                    <p className="font-black text-slate-800 text-sm group-hover:text-[#00A1FF] transition-colors">{item.pacienteNome}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-1"><Package size={10}/> {item.quantidade}x {item.itemNome}</p>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <p className="font-black text-slate-900">R$ {Number(item.precoTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    <span className="text-[9px] font-black text-purple-600 bg-purple-100 px-2 py-0.5 rounded uppercase mt-1">Produto</span>
                                  </div>
                               </div>
                             )
                         }
                     })}
                     {entradasGerais.length === 0 && (
                       <div className="text-center py-10 opacity-40">
                         <DollarSign size={40} className="mx-auto mb-2 text-slate-400" />
                         <p className="font-black text-xs uppercase text-slate-500">Sem histórico recente</p>
                       </div>
                     )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[40px] border border-slate-200 shadow-lg p-8 mt-8 print:p-0 print:border-none print:shadow-none">
                  <div className="flex justify-between items-center mb-8 print:hidden">
                     <div>
                        <h3 className="text-2xl font-black text-[#0F214A] flex items-center gap-2"><User className="text-[#00A1FF]"/> Extrato do Paciente (PDF)</h3>
                        <p className="text-slate-500 text-sm font-medium mt-1">Gere o documento final com sessões clínicas e consumíveis.</p>
                     </div>
                     <select value={pacienteRelatorio} onChange={(e) => setPacienteRelatorio(e.target.value)} className="w-64 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-[#00A1FF]">
                        <option value="">Selecionar Paciente...</option>
                        {pacientesOrdenados.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                     </select>
                  </div>

                  {pacienteRelatorio ? (
                     <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 print:bg-white print:border-none print:p-0">
                        <div className="flex justify-between items-start border-b-4 border-[#0F214A] pb-6 mb-6">
                           <div>
                              <h4 className="text-3xl font-black text-slate-900 uppercase">{pacienteSelecionadoDados?.nome}</h4>
                              <p className="text-slate-500 font-bold mt-1">Documento: {pacienteSelecionadoDados?.cpf || 'Não registrado'}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Extrato de Serviços • {MESES[mesFiltro]} de {new Date().getFullYear()}</p>
                              <h1 className="text-3xl font-black text-[#00A1FF] tracking-tight mt-1">EVOLUTI CLINIC</h1>
                           </div>
                        </div>

                        {Object.keys(sessoesPorCategoria).length > 0 && Object.entries(sessoesPorCategoria).map(([categoria, sessoes]) => (
                           <div key={categoria} className="mb-6">
                              <h5 className="font-black text-[#0F214A] uppercase tracking-widest mb-3 bg-blue-50 px-4 py-2 rounded-lg inline-block border border-blue-100">{categoria}</h5>
                              <table className="w-full text-left mb-2">
                                 <thead>
                                    <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                       <th className="pb-2 w-1/4">Data</th><th className="pb-2 w-1/4">Profissional</th><th className="pb-2 w-1/4">Local</th><th className="pb-2 text-right">Valor Sessão</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {sessoes.map((sessao) => (
                                       <tr key={sessao.id} className="border-b border-slate-100 text-sm font-bold text-slate-700">
                                          <td className="py-3">{new Date(sessao.data).toLocaleDateString('pt-BR')}</td>
                                          <td className="py-3">{sessao.profissional || 'Equipe'}</td>
                                          <td className="py-3 text-slate-500">{sessao.local}</td>
                                          <td className="py-3 text-right">R$ {valorFixoSessao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                              <div className="text-right text-xs font-black text-slate-400 uppercase">Subtotal {categoria}: <span className="text-slate-700 ml-2">R$ {(sessoes.length * valorFixoSessao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                           </div>
                        ))}

                        {consumosIndividuais.length > 0 && (
                           <div className="mb-8 mt-8 border-t border-dashed border-slate-300 pt-6">
                              <h5 className="font-black text-purple-800 uppercase tracking-widest mb-3 bg-purple-50 px-4 py-2 rounded-lg inline-block border border-purple-100 flex items-center gap-2"><Package size={14}/> Materiais e Produtos</h5>
                              <table className="w-full text-left mb-2">
                                 <thead>
                                    <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                       <th className="pb-2 w-1/4">Data</th><th className="pb-2 w-1/2">Item Consumido</th><th className="pb-2 text-right">Valor Total</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {consumosIndividuais.map((c) => (
                                       <tr key={c.id} className="border-b border-slate-100 text-sm font-bold text-slate-700">
                                          <td className="py-3">{new Date(c.data).toLocaleDateString('pt-BR')}</td>
                                          <td className="py-3">{c.quantidade}x {c.itemNome} <span className="text-slate-400 text-xs font-normal ml-2">({c.profissional.split(' ')[0]})</span></td>
                                          <td className="py-3 text-right">R$ {Number(c.precoTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                              <div className="text-right text-xs font-black text-slate-400 uppercase">Subtotal Materiais: <span className="text-slate-700 ml-2">R$ {totalConsumosR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                           </div>
                        )}

                        {sessoesIndividuais.length === 0 && consumosIndividuais.length === 0 && (
                           <div className="text-center py-10 font-bold text-slate-400">Nenhum registro neste mês para o paciente.</div>
                        )}

                        <div className="flex justify-end items-center gap-6 mt-8 pt-6 border-t-2 border-slate-200 bg-white p-4 rounded-2xl print:bg-transparent print:p-0">
                           <span className="font-black text-slate-400 uppercase tracking-widest text-sm">Valor Total da Fatura:</span>
                           <span className="text-4xl font-black text-[#00A1FF]">R$ {totalGeralFatura.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end print:hidden">
                           <button onClick={imprimirRelatorio} disabled={totalGeralFatura === 0} className="bg-[#00A1FF] text-white px-8 py-4 rounded-xl font-black text-sm flex items-center gap-2 hover:bg-[#0F214A] transition-colors shadow-lg disabled:opacity-50">
                              <Printer size={18}/> Gerar Fatura em PDF
                           </button>
                        </div>
                     </div>
                  ) : <div className="text-center py-10 text-slate-400 font-bold print:hidden">Selecione um paciente para gerar o PDF da Fatura.</div>}
              </div>
          </div>
      )}
    </div>
  );
}