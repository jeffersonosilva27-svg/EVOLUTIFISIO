import React, { useState, useEffect } from 'react';
import { Landmark, Calendar as CalendarIcon, TrendingUp, Users, Package, ChevronDown } from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

const formatarMoeda = (valor) => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const gerarUltimosMeses = (qtd = 12) => {
    const meses = [];
    const hoje = new Date();
    for (let i = 0; i < qtd; i++) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        meses.push({ iso, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return meses;
};

export default function Financeiro({ user, hasAccess }) {
    const [mesSelecionado, setMesSelecionado] = useState(gerarUltimosMeses(1)[0].iso);
    const listaMeses = gerarUltimosMeses(12);

    const [agendamentos, setAgendamentos] = useState([]);
    const [consumos, setConsumos] = useState([]);
    const [pacientes, setPacientes] = useState([]);

    useEffect(() => {
        const unsubAg = onSnapshot(collection(db, "agendamentos"), snap => setAgendamentos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubCons = onSnapshot(collection(db, "consumos"), snap => setConsumos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubPac = onSnapshot(collection(db, "pacientes"), snap => setPacientes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => { unsubAg(); unsubCons(); unsubPac(); };
    }, []);

    // Motor de Agregação Financeira
    const sessoesRealizadasMes = agendamentos.filter(a => a.status === 'realizado' && a.data.startsWith(mesSelecionado));
    const consumosMes = consumos.filter(c => c.data && c.data.startsWith(mesSelecionado));

    let faturamentoSessoes = 0;
    const statsProfissionais = {};

    sessoesRealizadasMes.forEach(ag => {
        const pac = pacientes.find(p => p.id === ag.pacienteId);
        const valorSessao = Number(pac?.valor || 0);
        faturamentoSessoes += valorSessao;

        if (!statsProfissionais[ag.profissionalId]) {
            statsProfissionais[ag.profissionalId] = { nome: ag.profissional, sessoes: 0, valorGerado: 0 };
        }
        statsProfissionais[ag.profissionalId].sessoes += 1;
        statsProfissionais[ag.profissionalId].valorGerado += valorSessao;
    });

    const faturamentoInsumos = consumosMes.reduce((acc, c) => acc + Number(c.precoTotal || 0), 0);
    const faturamentoBruto = faturamentoSessoes + faturamentoInsumos;

    const listaPerformance = Object.values(statsProfissionais).sort((a, b) => b.valorGerado - a.valorGerado);

    if (!hasAccess(['gestor_clinico', 'admin_fin'])) {
        return (
            <div className="p-10 text-center bg-white rounded-3xl border border-slate-200">
                <Landmark size={48} className="mx-auto text-slate-300 mb-4"/>
                <h2 className="text-xl font-black text-slate-700">Acesso Restrito</h2>
                <p className="text-slate-500">Seu perfil de recepção ou equipe clínica não possui privilégios para visualizar faturamentos.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black text-[#0F214A] tracking-tight flex items-center gap-3">
                        <Landmark className="text-green-500" size={32}/> Consolidado Financeiro
                    </h1>
                    <p className="text-slate-500 font-medium mt-1 text-sm">Analise a performance de faturamento, custos e produtividade da equipe.</p>
                </div>
                
                {/* Filtro Dinâmico de Mês */}
                <div className="relative w-full md:w-64">
                    <select 
                        className="w-full appearance-none bg-white border-2 border-slate-200 text-slate-700 py-3 px-4 pr-10 rounded-2xl font-black text-sm outline-none focus:border-green-500 transition-colors shadow-sm"
                        value={mesSelecionado}
                        onChange={(e) => setMesSelecionado(e.target.value)}
                    >
                        {listaMeses.map(m => (
                            <option key={m.iso} value={m.iso}>{m.label}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18}/>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 text-white p-8 rounded-[32px] shadow-xl flex flex-col justify-center">
                    <p className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 mb-2"><TrendingUp size={14}/> Faturamento Bruto (Mês)</p>
                    <h2 className="text-4xl md:text-5xl font-black text-green-400">{formatarMoeda(faturamentoBruto)}</h2>
                </div>
                
                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-2"><Users size={14}/> Clínico (Sessões Realizadas)</p>
                    <h3 className="text-3xl font-black text-[#0F214A]">{formatarMoeda(faturamentoSessoes)}</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1">{sessoesRealizadasMes.length} atendimentos validados</p>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-2"><Package size={14}/> Receita de Insumos Extras</p>
                    <h3 className="text-3xl font-black text-[#0F214A]">{formatarMoeda(faturamentoInsumos)}</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1">{consumosMes.length} lançamentos de estoque</p>
                </div>
            </div>

            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden mt-8">
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-black text-[#0F214A] flex items-center gap-2 text-lg">Performance da Equipe Clínica</h3>
                </div>
                <div className="w-full overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-white border-b border-slate-100">
                            <tr>
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase">Profissional Responsável</th>
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase text-center">Volume de Atendimentos</th>
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase text-right">Valor Gerado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {listaPerformance.length > 0 ? listaPerformance.map((prof, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-5 font-black text-[#0F214A] text-sm">{prof.nome}</td>
                                    <td className="p-5 text-sm font-bold text-slate-600 text-center">
                                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg">{prof.sessoes} sessões</span>
                                    </td>
                                    <td className="p-5 text-sm font-black text-green-600 text-right">{formatarMoeda(prof.valorGerado)}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="3" className="p-8 text-center text-slate-500 font-bold text-sm">
                                        Nenhum atendimento finalizado neste período.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}