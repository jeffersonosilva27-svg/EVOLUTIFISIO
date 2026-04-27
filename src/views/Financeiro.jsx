import React, { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, Calendar, Users, 
  ArrowUpCircle, ArrowDownCircle, PieChart, 
  Download, Filter, Loader2, CheckCircle2, Clock
} from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export default function Financeiro({ user }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth());

  // 1. BUSCA DADOS REAIS PARA O FINANCEIRO
  useEffect(() => {
    const unsubA = onSnapshot(collection(db, "agendamentos"), (snap) => {
      setAgendamentos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubP = onSnapshot(collection(db, "pacientes"), (snap) => {
      setPacientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => { unsubA(); unsubP(); };
  }, []);

  // 2. LÓGICA DE CÁLCULO CONECTADA
  const calcularMetricas = () => {
    let realizado = 0;
    let projetado = 0;
    let sessoesRealizadasCount = 0;
    const porProfissional = {};

    agendamentos.forEach(ag => {
      const dataAg = new Date(ag.data + 'T12:00:00');
      if (dataAg.getMonth() !== mesFiltro) return;

      // Busca o valor da sessão no cadastro do paciente
      const paciente = pacientes.find(p => p.id === ag.pacienteId);
      const valorSessao = parseFloat(paciente?.valor || 0);

      if (ag.status === 'realizado') {
        realizado += valorSessao;
        sessoesRealizadasCount++;
        
        // Soma faturamento por profissional
        porProfissional[ag.profissionalNome] = (porProfissional[ag.profissionalNome] || 0) + valorSessao;
      }
      
      if (ag.status !== 'cancelado') {
        projetado += valorSessao;
      }
    });

    return { realizado, projetado, sessoesRealizadasCount, porProfissional };
  };

  const stats = calcularMetricas();

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center space-y-4">
      <Loader2 className="animate-spin text-blue-600" size={48} />
      <p className="font-black text-slate-400 uppercase text-xs tracking-widest">Sincronizando faturamento com a agenda...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      
      {/* CABEÇALHO FINANCEIRO */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <DollarSign className="text-green-600" size={36}/> Fluxo de Caixa
          </h1>
          <p className="text-slate-500 font-medium mt-1">Dados extraídos automaticamente dos atendimentos realizados.</p>
        </div>

        <div className="flex bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <select 
            value={mesFiltro} 
            onChange={(e) => setMesFiltro(parseInt(e.target.value))}
            className="bg-transparent border-none outline-none font-black text-sm text-slate-700 px-4"
          >
            {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* CARDS DE PERFORMANCE NOMINAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Arrecadado (Realizado)</p>
            <h3 className="text-4xl font-black">R$ {stats.realizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            <div className="flex items-center gap-2 mt-4 text-green-400 font-bold text-xs">
              <ArrowUpCircle size={16}/> {stats.sessoesRealizadasCount} sessões finalizadas
            </div>
          </div>
          <DollarSign className="absolute -right-4 -bottom-4 text-white/5 w-32 h-32 group-hover:scale-110 transition-transform" />
        </div>

        <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Previsão Mensal (Projetado)</p>
          <h3 className="text-4xl font-black text-slate-800">R$ {stats.projetado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          <div className="flex items-center gap-2 mt-4 text-blue-500 font-bold text-xs">
            <Clock size={16}/> Inclui sessões pendentes
          </div>
        </div>

        <div className="bg-blue-600 rounded-[32px] p-8 text-white shadow-xl shadow-blue-100">
          <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2">Ticket Médio / Sessão</p>
          <h3 className="text-4xl font-black">
            R$ {stats.sessoesRealizadasCount > 0 ? (stats.realizado / stats.sessoesRealizadasCount).toFixed(2) : '0,00'}
          </h3>
          <p className="text-xs font-bold text-blue-100 mt-4 opacity-80">Valor médio por atendimento</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* RANKING POR PROFISSIONAL */}
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8">
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <PieChart className="text-blue-600"/> Produção por Profissional
          </h3>
          <div className="space-y-6">
            {Object.entries(stats.porProfissional).length > 0 ? (
              Object.entries(stats.porProfissional).sort((a,b) => b[1] - a[1]).map(([nome, valor]) => (
                <div key={nome} className="group">
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-black text-slate-700">{nome}</span>
                    <span className="font-black text-blue-600">R$ {valor.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-1000" 
                      style={{ width: `${(valor / stats.realizado) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-10 text-slate-400 font-bold italic">Nenhum faturamento registrado para este mês.</p>
            )}
          </div>
        </div>

        {/* LISTA DE ÚLTIMOS RECEBIMENTOS */}
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 flex flex-col">
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <CheckCircle2 className="text-green-600"/> Últimas Sessões Realizadas
          </h3>
          <div className="flex-1 overflow-y-auto max-h-[400px] custom-scrollbar space-y-3">
             {agendamentos
               .filter(a => a.status === 'realizado' && new Date(a.data + 'T12:00:00').getMonth() === mesFiltro)
               .sort((a,b) => new Date(b.data) - new Date(a.data))
               .map(ag => {
                 const pac = pacientes.find(p => p.id === ag.pacienteId);
                 return (
                   <div key={ag.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:border-blue-200 transition-all group">
                      <div>
                        <p className="font-black text-slate-800 group-hover:text-blue-600 transition-colors">{ag.paciente}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          {new Date(ag.data).toLocaleDateString()} • {ag.profissional}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900">R$ {pac?.valor || '0,00'}</p>
                        <span className="text-[9px] font-black text-green-600 bg-green-100 px-2 py-0.5 rounded-full uppercase">Pago</span>
                      </div>
                   </div>
                 )
               })
             }
             {agendamentos.filter(a => a.status === 'realizado' && new Date(a.data + 'T12:00:00').getMonth() === mesFiltro).length === 0 && (
               <div className="text-center py-20 opacity-30">
                 <DollarSign size={48} className="mx-auto mb-2" />
                 <p className="font-black text-xs uppercase">Sem histórico recente</p>
               </div>
             )}
          </div>
          <button className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl">
            <Download size={20}/> Exportar Relatório de Repasse
          </button>
        </div>

      </div>
    </div>
  );
}