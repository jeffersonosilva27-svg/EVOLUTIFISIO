import React, { useState } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, Package, Minus, Plus, 
  Download, PieChart, Wallet, CreditCard, ArrowUpRight, ArrowDownRight, 
  Activity, Receipt
} from 'lucide-react';

export default function Financeiro({ user }) {
  // Identifica a hierarquia do utilizador
  const isGestor = user?.role === 'gestor_clinico';

  // Estado para a cobrança de insumos (Operacional)
  const [insumos, setInsumos] = useState({ kinesio: 0, agulhas: 0 });
  const handleInsumoChange = (item, delta) => setInsumos(p => ({ ...p, [item]: Math.max(0, p[item] + delta) }));
  const totalExtra = (insumos.kinesio * 25) + (insumos.agulhas * 4);

  // Mock de transações recentes
  const transacoes = [
    { id: 1, data: 'Hoje', desc: 'Sessão Fisioterapia - João Silva', tipo: 'receita', valor: 150.00, status: 'pago' },
    { id: 2, data: 'Hoje', desc: 'Compra Insumos (Kinesio)', tipo: 'despesa', valor: 350.00, status: 'pago' },
    { id: 3, data: 'Ontem', desc: 'Sessão Terapia Ocupacional - Maria', tipo: 'receita', valor: 180.00, status: 'pendente' },
    { id: 4, data: 'Ontem', desc: 'Conta de Luz', tipo: 'despesa', valor: 420.00, status: 'agendado' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
      
      {/* CABEÇALHO DINÂMICO */}
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center">
            <DollarSign className="mr-2 text-green-600" size={32} /> 
            {isGestor ? 'Inteligência Financeira' : 'Fluxo de Caixa'}
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            {isGestor 
              ? 'Visão estratégica e saúde financeira da clínica.' 
              : 'Gestão operacional de entradas, saídas e insumos.'}
          </p>
        </div>
        <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center shadow-lg hover:bg-slate-800 transition-colors">
          <Download size={18} className="mr-2"/> Exportar Relatório
        </button>
      </div>

      {/* ========================================== */}
      {/* DASHBOARD 1: VISÃO DO GESTOR CLÍNICO       */}
      {/* ========================================== */}
      {isGestor && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          {/* KPIs Estratégicos */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-sm font-bold text-slate-500 uppercase flex items-center mb-2"><TrendingUp size={16} className="mr-1 text-green-500"/> Faturamento (Mês)</p>
                <p className="text-3xl font-black text-slate-900">R$ 45.200</p>
                <p className="text-xs text-green-600 font-bold mt-2 flex items-center"><ArrowUpRight size={14}/> +12% vs mês anterior</p>
              </div>
              <div className="absolute top-0 right-0 p-4 opacity-5"><PieChart size={100}/></div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-sm font-bold text-slate-500 uppercase flex items-center mb-2"><Activity size={16} className="mr-1 text-blue-500"/> Lucro Líquido</p>
              <p className="text-3xl font-black text-slate-900">R$ 32.800</p>
              <p className="text-xs text-slate-400 font-bold mt-2">Margem de 72%</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-sm font-bold text-slate-500 uppercase flex items-center mb-2"><TrendingDown size={16} className="mr-1 text-red-500"/> Custos Operacionais</p>
              <p className="text-3xl font-black text-slate-900">R$ 12.400</p>
              <p className="text-xs text-red-500 font-bold mt-2 flex items-center"><ArrowUpRight size={14}/> +3% vs mês anterior</p>
            </div>

            <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 shadow-sm">
              <p className="text-sm font-bold text-amber-800 uppercase flex items-center mb-2"><Wallet size={16} className="mr-1"/> Taxa de Inadimplência</p>
              <p className="text-3xl font-black text-amber-900">4.2%</p>
              <p className="text-xs text-amber-700 font-bold mt-2">R$ 1.890 pendentes</p>
            </div>
          </div>

          {/* Gráfico de Crescimento (Simulado com CSS) */}
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="font-black text-slate-800 mb-6 text-lg">Projeção de Crescimento Anual</h3>
            <div className="flex items-end gap-3 h-48 mt-4 border-b-2 border-slate-100 pb-2">
              {[40, 55, 45, 70, 65, 85, 100].map((h, i) => (
                <div key={i} className="flex-1 bg-blue-50 rounded-t-xl relative group cursor-pointer hover:bg-blue-100 transition-colors">
                  <div className="absolute bottom-0 w-full bg-[#005ac1] rounded-t-xl transition-all duration-700" style={{ height: `${h}%` }}></div>
                  {/* Tooltip Hover */}
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-md transition-opacity">
                    Mês {i+1}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-400 mt-2">
              <span>Jan</span><span>Fev</span><span>Mar</span><span>Abr</span><span>Mai</span><span>Jun</span><span>Jul (Atual)</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* DASHBOARD 2: VISÃO ADMINISTRADOR FIN.      */}
      {/* ========================================== */}
      {!isGestor && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          {/* KPIs Operacionais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-green-50 p-6 rounded-3xl border border-green-100 shadow-sm">
              <p className="text-sm font-bold text-green-800 uppercase flex items-center mb-1"><ArrowDownRight size={16} className="mr-1"/> Contas a Receber (Hoje)</p>
              <p className="text-3xl font-black text-green-900">R$ 1.250</p>
            </div>
            <div className="bg-red-50 p-6 rounded-3xl border border-red-100 shadow-sm">
              <p className="text-sm font-bold text-red-800 uppercase flex items-center mb-1"><ArrowUpRight size={16} className="mr-1"/> Contas a Pagar (Hoje)</p>
              <p className="text-3xl font-black text-red-900">R$ 800</p>
            </div>
            <div className="bg-[#f3eff4] p-6 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-sm font-bold text-[#001a41] uppercase flex items-center mb-1"><Wallet size={16} className="mr-1"/> Saldo em Caixa</p>
              <p className="text-3xl font-black text-[#005ac1]">R$ 4.500</p>
            </div>
          </div>

          {/* Painel de Insumos (Foco Operacional) */}
          <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100 shadow-sm">
            <h4 className="font-black text-blue-900 flex items-center mb-6 text-lg">
              <Package size={20} className="mr-2"/> Gestão de Cobrança de Insumos Extras
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-800 block">Kinesio Tape</span>
                  <span className="text-xs text-slate-500 font-medium">R$ 25,00 / Aplicação</span>
                </div>
                <div className="flex items-center space-x-4 bg-slate-50 p-2 rounded-xl">
                  <button onClick={() => handleInsumoChange('kinesio', -1)} className="bg-white p-2 rounded-lg shadow-sm hover:text-red-500"><Minus size={16}/></button>
                  <span className="font-black text-lg w-4 text-center">{insumos.kinesio}</span>
                  <button onClick={() => handleInsumoChange('kinesio', 1)} className="bg-[#005ac1] p-2 rounded-lg shadow-sm text-white"><Plus size={16}/></button>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-800 block">Agulhamento Seco</span>
                  <span className="text-xs text-slate-500 font-medium">R$ 4,00 / Agulha</span>
                </div>
                <div className="flex items-center space-x-4 bg-slate-50 p-2 rounded-xl">
                  <button onClick={() => handleInsumoChange('agulhas', -1)} className="bg-white p-2 rounded-lg shadow-sm hover:text-red-500"><Minus size={16}/></button>
                  <span className="font-black text-lg w-4 text-center">{insumos.agulhas}</span>
                  <button onClick={() => handleInsumoChange('agulhas', 1)} className="bg-[#005ac1] p-2 rounded-lg shadow-sm text-white"><Plus size={16}/></button>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <div className="bg-[#005ac1] text-white px-6 py-3 rounded-2xl font-black text-lg shadow-lg flex items-center">
                Adicionar Fatura: R$ {totalExtra.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ÁREA PARTILHADA: HISTÓRICO DE TRANSAÇÕES   */}
      {/* ========================================== */}
      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-black text-slate-800 flex items-center"><Receipt size={18} className="mr-2"/> Histórico Recente</h3>
          <button className="text-sm font-bold text-blue-600 hover:underline">Ver tudo</button>
        </div>
        <table className="w-full text-left">
          <thead className="bg-white text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
            <tr>
              <th className="p-5">Descrição</th>
              <th className="p-5 hidden md:table-cell">Data</th>
              <th className="p-5">Status</th>
              <th className="p-5 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transacoes.map(t => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-5 font-bold text-slate-700 text-sm">{t.desc}</td>
                <td className="p-5 text-slate-500 text-sm font-medium hidden md:table-cell">{t.data}</td>
                <td className="p-5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    t.status === 'pago' ? 'bg-green-100 text-green-700' :
                    t.status === 'pendente' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {t.status}
                  </span>
                </td>
                <td className={`p-5 text-right font-black ${t.tipo === 'receita' ? 'text-green-600' : 'text-red-500'}`}>
                  {t.tipo === 'receita' ? '+' : '-'} R$ {t.valor.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}