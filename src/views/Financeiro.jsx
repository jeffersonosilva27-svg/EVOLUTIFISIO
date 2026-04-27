import React, { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, Calendar, Users, ChevronLeft, ChevronRight,
  ArrowUpCircle, ArrowDownCircle, PieChart, 
  Download, Filter, Loader2, CheckCircle2, Clock, User, Printer, AlertTriangle
} from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, onSnapshot } from 'firebase/firestore';

const parseValor = (valor) => {
  if (!valor) return 0;
  if (typeof valor === 'number') return valor;
  const limpo = String(valor).replace(',', '.').replace(/[^0-9.-]+/g, "");
  const num = parseFloat(limpo);
  return isNaN(num) ? 0 : num;
};

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// AGORA RECEBE O "navegarPara" PARA FAZER A VIAGEM ENTRE TELAS
export default function Financeiro({ user, navegarPara }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth());
  const [pacienteRelatorio, setPacienteRelatorio] = useState('');

  useEffect(() => {
    const unsubA = onSnapshot(collection(db, "agendamentos"), snap => setAgendamentos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubP = onSnapshot(collection(db, "pacientes"), snap => setPacientes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubProf = onSnapshot(collection(db, "profissionais"), snap => {
        setProfissionais(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
    });
    return () => { unsubA(); unsubP(); unsubProf(); };
  }, []);

  const avancarMes = () => setMesFiltro(prev => prev === 11 ? 0 : prev + 1);
  const voltarMes = () => setMesFiltro(prev => prev === 0 ? 11 : prev - 1);

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
    return { realizado, projetado, sessoesRealizadasCount, porProfissional };
  };

  const sessoesIndividuais = !pacienteRelatorio ? [] : agendamentos
    .filter(a => a.pacienteId === pacienteRelatorio && a.status === 'realizado' && new Date(a.data + 'T12:00:00').getMonth() === mesFiltro)
    .sort((a, b) => new Date(a.data) - new Date(b.data));

  const pacienteSelecionadoDados = pacientes.find(p => p.id === pacienteRelatorio);
  const stats = calcularMetricas();

  const valorFixoSessao = parseValor(pacienteSelecionadoDados?.valor);
  const sessoesPorCategoria = sessoesIndividuais.reduce((acc, ag) => {
      const prof = profissionais.find(p => p.id === ag.profissionalId);
      const categoria = prof?.categoriaBase || 'Atendimento Clínico';
      if (!acc[categoria]) acc[categoria] = [];
      acc[categoria].push(ag);
      return acc;
  }, {});

  const imprimirRelatorio = () => { window.print(); };

  if (loading) return ( <div className="h-full flex flex-col items-center justify-center"><Loader2 className="animate-spin text-[#00A1FF] mb-4" size={48} /><p className="font-black text-slate-400 uppercase text-xs">Sincronizando faturamento...</p></div> );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 print:bg-white print:m-0 print:p-0">
      
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-[#0F214A] tracking-tight flex items-center gap-3"><DollarSign className="text-green-500" size={32}/> Fluxo de Caixa</h1>
          <p className="text-slate-500 font-medium mt-1">Dados extraídos automaticamente da Agenda e Prontuários.</p>
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
            <div className="flex items-center gap-2 mt-4 text-green-400 font-bold text-xs"><ArrowUpCircle size={16}/> {stats.sessoesRealizadasCount} sessões faturadas</div>
          </div>
        </div>
        <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Previsão Mensal</p>
          <h3 className="text-4xl font-black text-slate-800">R$ {stats.projetado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          <div className="flex items-center gap-2 mt-4 text-amber-500 font-bold text-xs"><Clock size={16}/> Inclui sessões ainda pendentes</div>
        </div>
        <div className="bg-[#00A1FF] rounded-[32px] p-8 text-white shadow-xl shadow-blue-200">
          <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-2">Ticket Médio / Sessão</p>
          <h3 className="text-4xl font-black">R$ {stats.sessoesRealizadasCount > 0 ? (stats.realizado / stats.sessoesRealizadasCount).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:hidden">
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8">
          <h3 className="text-xl font-black text-[#0F214A] mb-6 flex items-center gap-2"><PieChart className="text-[#00A1FF]"/> Produção por Profissional</h3>
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
             {agendamentos.filter(a => a.status === 'realizado' && new Date(a.data + 'T12:00:00').getMonth() === mesFiltro).map(ag => {
                 const pac = pacientes.find(p => p.id === ag.pacienteId); const valorSessao = parseValor(pac?.valor);
                 return (
                   <div key={ag.id} className={`flex justify-between items-center p-4 bg-slate-50 rounded-2xl border transition-all ${valorSessao === 0 ? 'border-red-200' : 'border-slate-200'}`}>
                      <div>
                        <p className="font-black text-slate-800 text-sm">{ag.paciente}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(ag.data).toLocaleDateString('pt-BR')} • {(ag.profissional || 'Equipe').split(' ')[0]}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        {valorSessao > 0 ? (
                            <p className="font-black text-slate-900">R$ {valorSessao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        ) : (
                            // BOTÃO ATIVO PARA CORRIGIR O CADASTRO!
                            <button 
                                onClick={() => navegarPara && navegarPara('pacientes', { pacienteId: ag.pacienteId })} 
                                className="font-black text-red-600 flex items-center gap-1 text-[11px] bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1 rounded-lg transition-colors shadow-sm"
                                title="Ir para a ficha do paciente para colocar o valor da sessão"
                            >
                               <AlertTriangle size={14}/> Corrigir Cadastro
                            </button>
                        )}
                        <span className="text-[9px] font-black text-green-600 bg-green-100 px-2 py-0.5 rounded uppercase mt-1">Pago</span>
                      </div>
                   </div>
                 )
             })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-lg p-8 mt-8 print:p-0 print:border-none print:shadow-none">
          <div className="flex justify-between items-center mb-8 print:hidden">
             <div>
                <h3 className="text-2xl font-black text-[#0F214A] flex items-center gap-2"><User className="text-[#00A1FF]"/> Extrato do Paciente (PDF)</h3>
                <p className="text-slate-500 text-sm font-medium mt-1">Gere o documento final estruturado e agrupado por especialidade.</p>
             </div>
             <select value={pacienteRelatorio} onChange={(e) => setPacienteRelatorio(e.target.value)} className="w-64 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-[#00A1FF]">
                <option value="">Selecionar Paciente...</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
             </select>
          </div>

          {pacienteRelatorio ? (
             <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 print:bg-white print:border-none print:p-0">
                <div className="flex justify-between items-start border-b-4 border-[#0F214A] pb-6 mb-6">
                   <div>
                      <h4 className="text-3xl font-black text-slate-900 uppercase">{pacienteSelecionadoDados?.nome}</h4>
                      <p className="text-slate-500 font-bold mt-1">Documento: {pacienteSelecionadoDados?.cpf || 'Não registado'}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Extrato de Serviços • {MESES[mesFiltro]} de {new Date().getFullYear()}</p>
                      <h1 className="text-3xl font-black text-[#00A1FF] tracking-tight mt-1">EVOLUTI CLINIC</h1>
                   </div>
                </div>

                {Object.keys(sessoesPorCategoria).length > 0 ? Object.entries(sessoesPorCategoria).map(([categoria, sessoes]) => (
                   <div key={categoria} className="mb-8">
                      <h5 className="font-black text-[#0F214A] uppercase tracking-widest mb-3 bg-blue-50 px-4 py-2 rounded-lg inline-block border border-blue-100">{categoria}</h5>
                      <table className="w-full text-left mb-2">
                         <thead>
                            <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                               <th className="pb-2 w-1/4">Data</th><th className="pb-2 w-1/4">Profissional</th><th className="pb-2 w-1/4">Local</th><th className="pb-2 text-right">Valor</th>
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
                )) : <div className="text-center py-10 font-bold text-slate-400">Nenhum registo neste mês.</div>}

                <div className="flex justify-end items-center gap-6 mt-8 pt-6 border-t-2 border-slate-200">
                   <span className="font-black text-slate-400 uppercase tracking-widest text-sm">Valor Total do Mês:</span>
                   <span className="text-4xl font-black text-[#0F214A]">R$ {(sessoesIndividuais.length * valorFixoSessao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end print:hidden">
                   <button onClick={imprimirRelatorio} disabled={sessoesIndividuais.length === 0} className="bg-[#00A1FF] text-white px-8 py-4 rounded-xl font-black text-sm flex items-center gap-2 hover:bg-[#0F214A] transition-colors shadow-lg">
                      <Printer size={18}/> Gerar Documento PDF
                   </button>
                </div>
             </div>
          ) : <div className="text-center py-10 text-slate-400 font-bold print:hidden">Selecione um paciente para gerar o PDF.</div>}
      </div>
    </div>
  );
}