import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Loader2, CheckCircle2, UserX, AlertTriangle, UserCheck, Palmtree, Edit3, X, CalendarRange, ArrowRight, Star, KeyRound, Download, Activity, FileText, ChevronDown, ChevronUp, Building2
} from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, onSnapshot, doc, updateDoc, query, getDocs, where, deleteDoc } from 'firebase/firestore';

const obterDataLocalISO = (data) => {
  const d = data instanceof Date ? data : new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export default function Equipe({ user }) {
  const [profissionais, setProfissionais] = useState([]);
  const [agendamentosGlobais, setAgendamentosGlobais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [editandoProf, setEditandoProf] = useState(null);
  const [detalhesProf, setDetalhesProf] = useState(null);
  const [mostrarOcultos, setMostrarOcultos] = useState(false);
  const [feriasSetup, setFeriasSetup] = useState({ open: false, prof: null, dataInicio: '', dataFim: '', preview: null, msgErro: '' });

  useEffect(() => {
    if (user?.role !== 'gestor_clinico') return;
    const unsub = onSnapshot(collection(db, "profissionais"), (snap) => {
      setProfissionais(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const unsubAg = onSnapshot(collection(db, "agendamentos"), (snap) => {
      setAgendamentosGlobais(snap.docs.map(d => d.data()));
    });
    return () => { unsub(); unsubAg(); };
  }, [user]);

  const alterarStatus = async (prof, novoStatus) => {
    try { 
      let updateData = { status: novoStatus };
      if (novoStatus === 'ativo' && prof.role === 'pendente') {
          updateData.role = prof.categoriaBase;
      }
      await updateDoc(doc(db, "profissionais", prof.id), updateData); 
    } 
    catch (e) { alert("Erro ao atualizar."); }
  };

  const recusarCadastro = async (id) => {
    if(window.confirm("Tem a certeza que deseja recusar e apagar permanentemente esta solicitação?")) {
        try {
            await deleteDoc(doc(db, "profissionais", id));
            alert("Solicitação recusada e removida com sucesso.");
        } catch (e) { alert("Erro ao apagar solicitação."); }
    }
  };

  const resetarSenha = async (prof) => {
    if (window.confirm(`Deseja forçar o reset de senha de ${prof.nome} para a senha padrão 'evoluti123'?`)) {
        try {
            await updateDoc(doc(db, "profissionais", prof.id), {
                senhaProvisoria: 'evoluti123',
                precisaTrocarSenha: true
            });
            alert("Senha resetada com sucesso! Peça ao profissional para acessar com 'evoluti123'.");
        } catch (e) { alert("Erro ao resetar a senha."); }
    }
  };

  const abrirDetalhes = (prof) => {
      const agsProf = agendamentosGlobais.filter(a => a.profissionalId === prof.id);
      
      const hoje = obterDataLocalISO(new Date());
      const minAtual = new Date().getHours() * 60 + new Date().getMinutes();
      
      const agsPassados = agsProf.filter(a => {
          if (a.data < hoje) return true;
          if (a.data === hoje) {
              const [h, m] = a.hora.split(':');
              return (parseInt(h)*60 + parseInt(m)) < minAtual;
          }
          return false;
      });

      const realizados = agsPassados.filter(a => a.status === 'realizado').length;
      // Faltas ou agendamentos passados sem evolução (confirmados/pendentes)
      const confirmadosSemEvolucao = agsPassados.filter(a => a.status === 'confirmado' || a.status === 'pendente').length;
      
      const taxaEvolucoes = agsPassados.length > 0 ? ((realizados / agsPassados.length)*100).toFixed(1) : 0;
      const percAtendimentos = agendamentosGlobais.length > 0 ? ((agsProf.length / agendamentosGlobais.length)*100).toFixed(1) : 0;

      setDetalhesProf({
          ...prof,
          totalAg: agsProf.length,
          agsPassados: agsPassados.length,
          realizados,
          pendentesEvolucao: confirmadosSemEvolucao,
          taxaEvolucoes,
          percAtendimentos
      });
  };

  const fazerBackup = async () => {
    setSalvando(true);
    try {
        // Extrai Pacientes e anexa as subcoleções (Evoluções e Planos)
        const pacSnap = await getDocs(collection(db, "pacientes"));
        const pacData = await Promise.all(pacSnap.docs.map(async d => {
            const id = d.id;
            const p = d.data();
            const evos = (await getDocs(collection(db, `pacientes/${id}/evolucoes`))).docs.map(x=>x.data());
            const plano = (await getDocs(collection(db, `pacientes/${id}/plano_tratamento`))).docs.map(x=>x.data());
            return { id, ...p, evolucoes: evos, plano_tratamento: plano };
        }));
        
        const agSnap = await getDocs(collection(db, "agendamentos"));
        const agData = agSnap.docs.map(d=>d.data());

        const consSnap = await getDocs(collection(db, "consumos"));
        const consData = consSnap.docs.map(d=>d.data());

        const fullBackup = {
            dataBackup: new Date().toISOString(),
            totalPacientes: pacData.length,
            pacientes: pacData, // Já inclui evoluções e planos aninhados
            agendamentosGlobais: agData,
            consumosGlobais: consData,
        };

        const blob = new Blob([JSON.stringify(fullBackup, null, 2)], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_evoluti_v1.3_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    } catch(e) { alert("Erro ao gerar ficheiro de backup."); }
    setSalvando(false);
  };

  const salvarEdicaoProfissional = async (e) => {
    e.preventDefault();
    if (!editandoProf.clinicasAcesso || editandoProf.clinicasAcesso.length === 0) {
        return alert("O profissional deve pertencer a pelo menos uma clínica de atuação.");
    }
    setSalvando(true);
    try {
      const { id, nome, categoriaBase, registro, email, role, clinicasAcesso } = editandoProf;
      await updateDoc(doc(db, "profissionais", id), { 
          nome, categoriaBase, registro, email, role: role || categoriaBase, clinicasAcesso 
      });
      alert("Dados do profissional atualizados com sucesso!");
      setEditandoProf(null);
    } catch (error) { alert("Erro ao salvar alterações."); }
    setSalvando(false);
  };

  const gerarPreviewFerias = async () => {
      if(!feriasSetup.dataInicio || !feriasSetup.dataFim) {
          setFeriasSetup(prev => ({...prev, msgErro: "Preencha as datas de início e fim."})); return;
      }
      if(feriasSetup.dataFim < feriasSetup.dataInicio) {
          setFeriasSetup(prev => ({...prev, msgErro: "A data de fim não pode ser anterior à data de início."})); return;
      }

      setSalvando(true);
      try {
          const prof = feriasSetup.prof;
          const equipeAtiva = profissionais.filter(p => p.id !== prof.id && p.status === 'ativo' && p.categoriaBase === prof.categoriaBase);
          
          if (equipeAtiva.length === 0) {
              setFeriasSetup(prev => ({...prev, msgErro: `Atenção: Não há outros profissionais de "${prof.categoriaBase}" ativos. As sessões neste período ficarão sem profissional atribuído.`}));
              setSalvando(false); return;
          }

          const qAgend = query(collection(db, "agendamentos"), where("profissionalId", "==", prof.id), where("status", "==", "pendente"));
          const snapAgend = await getDocs(qAgend);
          const noPeriodo = snapAgend.docs.map(d => ({id: d.id, ...d.data()})).filter(a => a.data >= feriasSetup.dataInicio && a.data <= feriasSetup.dataFim);

          if(noPeriodo.length === 0) {
              setFeriasSetup(prev => ({...prev, preview: [], msgErro: "Não há pacientes agendados para este profissional neste período. As férias podem ser confirmadas sem redistribuição."}));
              setSalvando(false); return;
          }

          const mapPacientes = {};
          noPeriodo.forEach(ag => {
              if (!mapPacientes[ag.pacienteId]) mapPacientes[ag.pacienteId] = [];
              mapPacientes[ag.pacienteId].push(ag);
          });

          const previewRedistribuicao = [];
          let equipeIndex = 0;

          for (const [pacId, agendamentosDoPac] of Object.entries(mapPacientes)) {
              const substituto = equipeAtiva[equipeIndex];
              previewRedistribuicao.push({
                  pacienteId: pacId,
                  pacienteNome: agendamentosDoPac[0].paciente,
                  substitutoId: substituto.id,
                  substitutoNome: substituto.nome,
                  sessoesAfetadas: agendamentosDoPac
              });
              equipeIndex = (equipeIndex + 1) % equipeAtiva.length;
          }

          setFeriasSetup(prev => ({...prev, preview: previewRedistribuicao, msgErro: ''}));
      } catch (e) {
          setFeriasSetup(prev => ({...prev, msgErro: "Erro ao gerar previsão: " + e.message}));
      }
      setSalvando(false);
  };

  const confirmarFerias = async () => {
      setSalvando(true);
      try {
          if (feriasSetup.preview && feriasSetup.preview.length > 0) {
              const promessas = [];
              for (const redistribuicao of feriasSetup.preview) {
                  for (const ag of redistribuicao.sessoesAfetadas) {
                      promessas.push(updateDoc(doc(db, "agendamentos", ag.id), {
                          profissionalId: redistribuicao.substitutoId,
                          profissionalNome: redistribuicao.substitutoNome,
                          profissional: redistribuicao.substitutoNome
                      }));
                  }
              }
              await Promise.all(promessas);
          }

          await updateDoc(doc(db, "profissionais", feriasSetup.prof.id), { 
              status: 'ferias',
              feriasInicio: feriasSetup.dataInicio,
              feriasFim: feriasSetup.dataFim
          });

          alert("Férias registradas e agenda redistribuída com sucesso!");
          setFeriasSetup({ open: false, prof: null, dataInicio: '', dataFim: '', preview: null, msgErro: '' });

      } catch (e) { alert("Erro ao confirmar férias."); }
      setSalvando(false);
  };

  // Separa os Ocultos para a Sanfona
  const profAtivos = profissionais.filter(p => p.status !== 'oculto').sort((a,b) => {
      if (a.status === 'pendente' && b.status !== 'pendente') return -1;
      if (b.status === 'pendente' && a.status !== 'pendente') return 1;
      return (a.nome||'').localeCompare(b.nome||'');
  });
  
  const profOcultos = profissionais.filter(p => p.status === 'oculto').sort((a,b) => (a.nome||'').localeCompare(b.nome||''));

  if (user?.role !== 'gestor_clinico') return <div className="p-10 font-black text-slate-400">Acesso restrito.</div>;
  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#00A1FF]"/></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-[#0F214A] tracking-tight flex items-center gap-3">
              <ShieldCheck className="text-[#00A1FF]" size={32}/> Gestão de Equipe
            </h1>
            <p className="text-slate-500 font-medium mt-1">Aprove acessos, defina Gestores e planeje férias com redistribuição inteligente.</p>
          </div>
          <button onClick={fazerBackup} disabled={salvando} className="bg-[#0F214A] hover:bg-[#00A1FF] transition-colors text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg flex items-center justify-center gap-2">
              {salvando ? <Loader2 className="animate-spin" size={16}/> : <Download size={16}/>} Backup Completo
          </button>
      </div>

      {/* Tabela de Ativos/Pendentes */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm w-full relative">
        <div className="w-full overflow-x-auto custom-scrollbar rounded-[32px]">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase">Profissional & Cargos</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase">Status / Contato</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profAtivos.map(p => (
                <tr key={p.id} className="hover:bg-blue-50/30">
                  <td className="p-6 cursor-pointer group" onClick={() => abrirDetalhes(p)}>
                    <div className="font-black text-slate-900 text-lg flex items-center flex-wrap gap-2 group-hover:text-[#00A1FF] transition-colors">
                        {p.nome} 
                        {p.id === user.id && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded uppercase">Você</span>}
                        {p.role === 'gestor_clinico' && <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded uppercase flex items-center gap-1"><Star size={10}/> Gestor</span>}
                    </div>
                    <div className="text-xs text-slate-500 font-bold uppercase mt-1">{p.categoriaBase} • Reg: {p.registro || 'N/D'}</div>
                  </td>
                  <td className="p-6">
                     <div className="mb-2 text-xs font-bold text-slate-500">{p.email}</div>
                     {p.status === 'pendente' && <span className="text-amber-600 bg-amber-50 px-3 py-1 rounded-lg font-black text-xs uppercase flex w-fit items-center"><AlertTriangle size={14} className="mr-1"/> Pendente</span>}
                     {p.status === 'ativo' && <span className="text-green-600 bg-green-50 px-3 py-1 rounded-lg font-black text-xs uppercase flex w-fit items-center"><CheckCircle2 size={14} className="mr-1"/> Ativo</span>}
                     {p.status === 'ferias' && <span className="text-blue-600 bg-blue-50 px-3 py-1 rounded-lg font-black text-xs uppercase flex w-fit items-center"><Palmtree size={14} className="mr-1"/> Em Férias</span>}
                  </td>
                  <td className="p-6 text-right">
                     {p.id !== user.id && (
                       <div className="flex items-center justify-end gap-2">
                          {p.status === 'pendente' && (
                              <>
                                  <button onClick={() => alterarStatus(p, 'ativo')} className="p-2 bg-green-100 text-green-700 rounded-xl hover:bg-green-200" title="Aprovar"><UserCheck size={18}/></button>
                                  <button onClick={() => recusarCadastro(p.id)} className="p-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200" title="Recusar e Apagar"><UserX size={18}/></button>
                              </>
                          )}
                          
                          {p.status !== 'pendente' && (
                              <>
                                  <button onClick={() => setEditandoProf({...p})} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200" title="Editar Dados"><Edit3 size={18}/></button>
                                  <button onClick={() => resetarSenha(p)} className="p-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100" title="Forçar Reset de Senha"><KeyRound size={18}/></button>
                                  <button onClick={() => {if(window.confirm("Desativar profissional? Ele desaparecerá das opções da clínica.")) alterarStatus(p, 'oculto')}} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100" title="Desativar (Ocultar)"><UserX size={18}/></button>
                              </>
                          )}

                          {p.status === 'ativo' && <button onClick={() => setFeriasSetup({open: true, prof: p, dataInicio: '', dataFim: '', preview: null, msgErro: ''})} className="p-2 bg-[#e5f5ff] text-[#00A1FF] rounded-xl hover:bg-blue-100" title="Planejar Férias"><Palmtree size={18}/></button>}
                          {p.status === 'ferias' && <button onClick={() => alterarStatus(p, 'ativo')} className="p-2 bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200 font-bold text-xs" title="Retornar">Regressar</button>}
                       </div>
                     )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sanfona de Usuários Ocultos */}
      {profOcultos.length > 0 && (
          <div className="bg-slate-50 rounded-[24px] border border-slate-200 overflow-hidden">
              <button onClick={() => setMostrarOcultos(!mostrarOcultos)} className="w-full p-5 flex items-center justify-between font-black text-slate-500 hover:bg-slate-100 transition-colors">
                  <span className="flex items-center gap-2"><UserX size={18}/> Profissionais Desativados ({profOcultos.length})</span>
                  {mostrarOcultos ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
              </button>
              {mostrarOcultos && (
                  <div className="p-5 border-t border-slate-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {profOcultos.map(p => (
                              <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center opacity-70 hover:opacity-100 transition-opacity">
                                  <div>
                                      <p className="font-bold text-slate-800">{p.nome}</p>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase">{p.categoriaBase}</p>
                                  </div>
                                  <button onClick={() => alterarStatus(p, 'ativo')} className="text-[#00A1FF] hover:underline text-xs font-bold bg-blue-50 px-3 py-1.5 rounded-lg">Reativar</button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* Modal de Detalhes e Métricas */}
      {detalhesProf && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white p-8 rounded-[32px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 relative">
             <div className="flex justify-between items-start mb-6">
                <div>
                   <h3 className="font-black text-2xl text-[#0F214A]">{detalhesProf.nome}</h3>
                   <p className="text-xs font-bold text-slate-400 uppercase mt-1">{detalhesProf.categoriaBase} • {detalhesProf.email}</p>
                </div>
                <button onClick={() => setDetalhesProf(null)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X size={20}/></button>
             </div>
             
             <div className="grid grid-cols-2 gap-4 mb-6">
                 <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center">
                     <p className="text-[10px] font-black uppercase text-blue-500 mb-1 flex justify-center items-center gap-1"><Activity size={12}/> Volume da Clínica</p>
                     <h4 className="text-3xl font-black text-[#0F214A]">{detalhesProf.percAtendimentos}%</h4>
                     <p className="text-xs font-bold text-blue-400 mt-1">{detalhesProf.totalAg} de {agendamentosGlobais.length} sessões</p>
                 </div>
                 <div className="bg-green-50 p-4 rounded-2xl border border-green-100 text-center">
                     <p className="text-[10px] font-black uppercase text-green-600 mb-1 flex justify-center items-center gap-1"><FileText size={12}/> Taxa de Evolução</p>
                     <h4 className="text-3xl font-black text-green-700">{detalhesProf.taxaEvolucoes}%</h4>
                     <p className="text-xs font-bold text-green-500 mt-1">{detalhesProf.realizados} em {detalhesProf.agsPassados} passados</p>
                 </div>
             </div>

             {detalhesProf.pendentesEvolucao > 0 && (
                 <div className="bg-red-50 p-4 rounded-xl border border-red-200 flex items-start gap-3">
                     <AlertTriangle className="text-red-500 shrink-0"/>
                     <div>
                         <p className="text-sm font-black text-red-800">Evoluções Pendentes</p>
                         <p className="text-xs font-medium text-red-700 mt-1">O profissional possui {detalhesProf.pendentesEvolucao} sessão(ões) realizada(s) que ainda não foram evoluídas no prontuário.</p>
                     </div>
                 </div>
             )}
          </div>
        </div>
      )}

      {/* Modal de Edição com Acesso Multi-Tenant */}
      {editandoProf && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white p-8 rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-xl text-[#0F214A]">Editar Profissional</h3>
                <button onClick={() => setEditandoProf(null)} className="text-slate-400 hover:bg-red-50 hover:text-red-500 p-2 rounded-full"><X size={20}/></button>
             </div>
             <form onSubmit={salvarEdicaoProfissional} className="space-y-4">
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Nome Completo</label>
                    <input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] font-bold text-slate-700" value={editandoProf.nome} onChange={e => setEditandoProf({...editandoProf, nome: e.target.value})} />
                </div>
                
                {/* CHECKBOXES MULTI-TENANT */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-3">
                    <label className="text-[10px] font-black uppercase text-[#0F214A] mb-2 flex items-center gap-1"><Building2 size={14}/> Clínicas Vinculadas</label>
                    <div className="flex flex-col gap-2">
                       <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                          <input type="checkbox" className="w-4 h-4 accent-[#00A1FF]" checked={editandoProf.clinicasAcesso?.includes('vida')} onChange={(e) => {
                              const atuais = editandoProf.clinicasAcesso || [];
                              setEditandoProf({...editandoProf, clinicasAcesso: e.target.checked ? [...atuais, 'vida'] : atuais.filter(c => c !== 'vida')});
                          }}/> Clínica Vida
                       </label>
                       <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                          <input type="checkbox" className="w-4 h-4 accent-[#00A1FF]" checked={editandoProf.clinicasAcesso?.includes('reabtech')} onChange={(e) => {
                              const atuais = editandoProf.clinicasAcesso || [];
                              setEditandoProf({...editandoProf, clinicasAcesso: e.target.checked ? [...atuais, 'reabtech'] : atuais.filter(c => c !== 'reabtech')});
                          }}/> Clínica Relief/Reabtech
                       </label>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Formação</label>
                       <select required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] font-bold text-slate-700" value={editandoProf.categoriaBase} onChange={e => setEditandoProf({...editandoProf, categoriaBase: e.target.value})}>
                          <option value="fisio">Fisioterapeuta</option>
                          <option value="to">Ter. Ocupacional</option>
                          <option value="recepcao">Recepção</option>
                       </select>
                   </div>
                   <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Registro</label>
                       <input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] font-bold text-slate-700" value={editandoProf.registro} onChange={e => setEditandoProf({...editandoProf, registro: e.target.value})} />
                   </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="text-[10px] font-black uppercase text-slate-600 mb-1 flex items-center gap-1"><ShieldCheck size={12}/> Permissões no Sistema</label>
                    <select required className="w-full p-3 bg-white border border-slate-300 rounded-xl outline-none focus:border-[#00A1FF] font-bold text-slate-800 text-sm" value={editandoProf.role || editandoProf.categoriaBase} onChange={e => setEditandoProf({...editandoProf, role: e.target.value})}>
                        <option value="gestor_clinico">Gestor Clínico (Acesso Total)</option>
                        <option value="admin_fin">Administrativo / Financeiro</option>
                        <option value="fisio">Profissional de Saúde</option>
                        <option value="recepcao">Recepção</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">E-mail de Acesso</label>
                    <input required type="email" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] font-bold text-slate-700" value={editandoProf.email} onChange={e => setEditandoProf({...editandoProf, email: e.target.value})} />
                </div>
                <button type="submit" disabled={salvando} className="w-full bg-[#00A1FF] text-white py-4 rounded-xl font-black mt-2 hover:bg-[#0F214A] transition-all flex justify-center">
                    {salvando ? <Loader2 className="animate-spin"/> : 'Guardar Alterações'}
                </button>
             </form>
          </div>
        </div>
      )}

      {/* Modal Férias */}
      {feriasSetup.open && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white p-8 rounded-[40px] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
             <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h3 className="font-black text-2xl text-[#0F214A] flex items-center gap-2"><CalendarRange className="text-[#00A1FF]"/> Planejar Férias</h3>
                    <p className="text-slate-500 font-medium text-sm mt-1">Profissional: <span className="font-black text-slate-800">{feriasSetup.prof?.nome}</span></p>
                </div>
                <button onClick={() => setFeriasSetup({open: false, prof: null, dataInicio: '', dataFim: '', preview: null, msgErro: ''})} className="text-slate-400 hover:bg-red-50 hover:text-red-500 p-2 rounded-full"><X size={24}/></button>
             </div>
             
             {!feriasSetup.preview ? (
                 <div className="space-y-6">
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Data de Saída</label>
                             <input type="date" className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-[#00A1FF] font-bold text-slate-700" value={feriasSetup.dataInicio} onChange={e => setFeriasSetup({...feriasSetup, dataInicio: e.target.value, msgErro: ''})} />
                         </div>
                         <div>
                             <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Data de Retorno</label>
                             <input type="date" className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-[#00A1FF] font-bold text-slate-700" value={feriasSetup.dataFim} onChange={e => setFeriasSetup({...feriasSetup, dataFim: e.target.value, msgErro: ''})} />
                         </div>
                     </div>

                     {feriasSetup.msgErro && (
                         <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-start gap-2 text-sm font-bold">
                             <AlertTriangle size={18} className="shrink-0 mt-0.5"/>
                             <p>{feriasSetup.msgErro}</p>
                         </div>
                     )}

                     <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                         <p className="text-sm font-bold text-blue-900 mb-2">Como funciona a redistribuição?</p>
                         <p className="text-xs text-blue-800 leading-relaxed font-medium">O sistema encontrará todos os agendamentos deste profissional nas datas informadas e irá transferi-los automaticamente para outros membros da equipe (da mesma categoria). Para manter a continuidade clínica, o mesmo paciente será sempre direcionado para o mesmo fisioterapeuta substituto.</p>
                     </div>

                     <button onClick={gerarPreviewFerias} disabled={salvando} className="w-full bg-[#0F214A] text-white py-4 rounded-2xl font-black text-lg hover:bg-[#00A1FF] transition-all flex justify-center shadow-lg">
                        {salvando ? <Loader2 className="animate-spin"/> : 'Gerar Previsão de Substituições'}
                     </button>
                 </div>
             ) : (
                 <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                     <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-100 flex items-center gap-2 text-sm font-bold mb-6 shrink-0">
                         <CheckCircle2 size={18}/> Previsão gerada com sucesso. Revise as alterações abaixo.
                     </div>
                     
                     <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-6 border border-slate-100 rounded-2xl">
                         {feriasSetup.preview.length > 0 ? (
                             <ul className="divide-y divide-slate-100">
                                 {feriasSetup.preview.map((redist, i) => (
                                     <li key={i} className="p-4 hover:bg-slate-50">
                                         <div className="flex items-center gap-3">
                                             <div className="flex-1">
                                                <p className="font-black text-[#0F214A] text-sm">{redist.pacienteNome}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{redist.sessoesAfetadas.length} sessões afetadas</p>
                                             </div>
                                             <ArrowRight className="text-slate-300" size={16}/>
                                             <div className="flex-1 text-right">
                                                <p className="text-[10px] font-black uppercase text-slate-400">Transferido para</p>
                                                <p className="font-black text-[#00A1FF] text-sm">{redist.substitutoNome}</p>
                                             </div>
                                         </div>
                                     </li>
                                 ))}
                             </ul>
                         ) : (
                             <div className="p-10 text-center text-slate-500 font-bold">Nenhum paciente será afetado (Agenda vazia no período). As férias podem prosseguir!</div>
                         )}
                     </div>

                     <div className="flex gap-4 shrink-0">
                         <button onClick={() => setFeriasSetup(prev => ({...prev, preview: null}))} disabled={salvando} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-colors text-sm">Voltar</button>
                         <button onClick={confirmarFerias} disabled={salvando} className="flex-[2] bg-green-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-green-700 transition-all flex justify-center shadow-lg">
                            {salvando ? <Loader2 className="animate-spin"/> : 'Confirmar Férias e Transferir'}
                         </button>
                     </div>
                 </div>
             )}
          </div>
        </div>
      )}

    </div>
  );
}