import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Loader2, CheckCircle2, UserX, AlertTriangle, UserCheck, Palmtree, Edit3, X, CalendarRange, ArrowRight, Star
} from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, onSnapshot, doc, updateDoc, query, getDocs, where } from 'firebase/firestore';

export default function Equipe({ user }) {
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [editandoProf, setEditandoProf] = useState(null);
  const [feriasSetup, setFeriasSetup] = useState({ open: false, prof: null, dataInicio: '', dataFim: '', preview: null, msgErro: '' });

  useEffect(() => {
    if (user?.role !== 'gestor_clinico') return;
    const unsub = onSnapshot(collection(db, "profissionais"), (snap) => {
      setProfissionais(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // CORREÇÃO: A ativação agora preserva a "role" (Nível de Acesso) e não esmaga o Gestor!
  const alterarStatus = async (prof, novoStatus) => {
    try { 
      let updateData = { status: novoStatus };
      if (novoStatus === 'ativo' && prof.role === 'pendente') {
          // Se for novo, herda a categoria, mas se for gestor, mantém!
          updateData.role = prof.categoriaBase;
      }
      await updateDoc(doc(db, "profissionais", prof.id), updateData); 
    } 
    catch (e) { alert("Erro ao atualizar."); }
  };

  const salvarEdicaoProfissional = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const { id, nome, categoriaBase, registro, email, role } = editandoProf;
      // Salva os dados e o Nível de Acesso (role) escolhido
      await updateDoc(doc(db, "profissionais", id), { nome, categoriaBase, registro, email, role: role || categoriaBase });
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

          alert("Férias registadas e agenda redistribuída com sucesso!");
          setFeriasSetup({ open: false, prof: null, dataInicio: '', dataFim: '', preview: null, msgErro: '' });

      } catch (e) { alert("Erro ao confirmar férias."); }
      setSalvando(false);
  };

  if (user?.role !== 'gestor_clinico') return <div className="p-10 font-black text-slate-400">Acesso restrito.</div>;
  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#00A1FF]"/></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-black text-[#0F214A] tracking-tight flex items-center gap-3">
          <ShieldCheck className="text-[#00A1FF]" size={32}/> Gestão de Equipa
        </h1>
        <p className="text-slate-500 font-medium mt-1">Aprove acessos, defina Gestores e planeie férias com redistribuição inteligente.</p>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr><th className="p-6 text-[10px] font-black text-slate-400 uppercase">Profissional & Cargos</th><th className="p-6 text-[10px] font-black text-slate-400 uppercase">Status / Contacto</th><th className="p-6 text-[10px] font-black text-slate-400 uppercase text-right">Ações</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {profissionais.map(p => (
              <tr key={p.id} className={p.status === 'oculto' ? 'opacity-50 bg-slate-50' : 'hover:bg-blue-50/30'}>
                <td className="p-6">
                  <div className="font-black text-slate-900 text-lg flex items-center flex-wrap gap-2">
                      {p.nome} 
                      {p.id === user.id && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded uppercase">Você</span>}
                      
                      {/* AS DENOMINAÇÕES VOLTARAM: DESTAQUES VISUAIS DOS CARGOS */}
                      {p.role === 'gestor_clinico' && <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded uppercase flex items-center gap-1"><Star size={10}/> Gestor</span>}
                      {p.role === 'admin_fin' && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded uppercase">Financeiro</span>}
                  </div>
                  <div className="text-xs text-slate-500 font-bold uppercase mt-1">{p.categoriaBase} • Reg: {p.registro || 'N/D'}</div>
                </td>
                <td className="p-6">
                   <div className="mb-2 text-xs font-bold text-slate-500">{p.email}</div>
                   {p.status === 'pendente' && <span className="text-amber-600 bg-amber-50 px-3 py-1 rounded-lg font-black text-xs uppercase flex w-fit items-center"><AlertTriangle size={14} className="mr-1"/> Pendente</span>}
                   {p.status === 'ativo' && <span className="text-green-600 bg-green-50 px-3 py-1 rounded-lg font-black text-xs uppercase flex w-fit items-center"><CheckCircle2 size={14} className="mr-1"/> Ativo</span>}
                   {p.status === 'ferias' && <span className="text-blue-600 bg-blue-50 px-3 py-1 rounded-lg font-black text-xs uppercase flex w-fit items-center"><Palmtree size={14} className="mr-1"/> Em Férias</span>}
                   {p.status === 'oculto' && <span className="text-slate-500 bg-slate-200 px-3 py-1 rounded-lg font-black text-xs uppercase">Desativado</span>}
                </td>
                <td className="p-6 text-right">
                   {p.id !== user.id && (
                     <div className="flex items-center justify-end gap-2">
                        {p.status === 'pendente' && <button onClick={() => alterarStatus(p, 'ativo')} className="p-2 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors" title="Aprovar"><UserCheck size={18}/></button>}
                        
                        {p.status !== 'oculto' && (
                            <button onClick={() => setEditandoProf({...p})} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors" title="Editar Dados"><Edit3 size={18}/></button>
                        )}

                        {p.status === 'ativo' && <button onClick={() => setFeriasSetup({open: true, prof: p, dataInicio: '', dataFim: '', preview: null, msgErro: ''})} className="p-2 bg-[#e5f5ff] text-[#00A1FF] rounded-xl hover:bg-blue-100 transition-colors" title="Planear Férias"><Palmtree size={18}/></button>}
                        {p.status === 'ferias' && <button onClick={() => alterarStatus(p, 'ativo')} className="p-2 bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200 transition-colors font-bold text-xs" title="Retornar">Regressar</button>}
                        
                        {p.status !== 'oculto' ? (
                            <button onClick={() => {if(window.confirm("Desativar e ocultar profissional?")) alterarStatus(p, 'oculto')}} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors" title="Desativar"><UserX size={18}/></button>
                        ) : (
                            <button onClick={() => alterarStatus(p, 'ativo')} className="p-2 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 font-bold text-xs">Reativar</button>
                        )}
                     </div>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL: EDITAR PROFISSIONAL (AGORA COM NÍVEL DE ACESSO) */}
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

                {/* CAMPO NOVO: NÍVEL DE ACESSO */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <label className="text-[10px] font-black uppercase text-[#0F214A] mb-1 block flex items-center gap-1"><ShieldCheck size={12}/> Permissões no Sistema (Role)</label>
                    <select required className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:border-[#00A1FF] font-bold text-[#0F214A] text-sm" value={editandoProf.role || editandoProf.categoriaBase} onChange={e => setEditandoProf({...editandoProf, role: e.target.value})}>
                        <option value="gestor_clinico">Gestor Clínico (Acesso Total)</option>
                        <option value="admin_fin">Administrativo / Financeiro</option>
                        <option value="fisio">Profissional de Saúde</option>
                        <option value="recepcao">Receção</option>
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

      {/* MODAL: PLANEJAR FÉRIAS COM REDISTRIBUIÇÃO */}
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
                         <p className="text-xs text-blue-800 leading-relaxed font-medium">O sistema encontrará todos os agendamentos deste profissional nas datas informadas e irá transferi-los automaticamente para outros membros da equipa (da mesma categoria). Para manter a continuidade clínica, o mesmo paciente será sempre direcionado para o mesmo fisioterapeuta substituto.</p>
                     </div>

                     <button onClick={gerarPreviewFerias} disabled={salvando} className="w-full bg-[#0F214A] text-white py-4 rounded-2xl font-black text-lg hover:bg-[#00A1FF] transition-all flex justify-center shadow-lg">
                        {salvando ? <Loader2 className="animate-spin"/> : 'Gerar Previsão de Substituições'}
                     </button>
                 </div>
             ) : (
                 <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                     <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-100 flex items-center gap-2 text-sm font-bold mb-6 shrink-0">
                         <CheckCircle2 size={18}/> Previsão gerada com sucesso. Reveja as alterações abaixo.
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