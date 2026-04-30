import React, { useState, useEffect } from 'react';
import { 
  Users, ShieldCheck, CheckCircle2, XCircle, 
  ChevronDown, ChevronUp, Loader2, Lock, ShieldAlert, Edit3, X, Building2
} from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, onSnapshot, query, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';

// CONSTANTE DE SEGURANÇA MESTRA
const SUPER_GESTOR_REGISTRO = "329099-F";

export default function Equipe({ user }) {
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarOcultos, setMostrarOcultos] = useState(false);
  
  const [profEdit, setProfEdit] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const isSuperGestor = user?.registro === SUPER_GESTOR_REGISTRO;

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(query(collection(db, "profissionais"), orderBy("nome", "asc")), (snap) => {
      setProfissionais(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const atualizarProfissional = async (id, dadosAtualizados) => {
    if (dadosAtualizados.role && !isSuperGestor) {
        alert("Acesso Negado: Apenas o Super Gestor pode alterar cargos hierárquicos.");
        return;
    }
    try {
      await updateDoc(doc(db, "profissionais", id), dadosAtualizados);
      if(!profEdit) alert("Status atualizado com sucesso!");
    } catch (error) {
      alert("Erro ao atualizar profissional.");
    }
  };

  const removerProfissional = async (id) => {
    if (!isSuperGestor) {
        alert("Apenas o Super Gestor pode excluir cadastros da base de dados.");
        return;
    }
    if (window.confirm("Atenção: Tem certeza que deseja excluir permanentemente este profissional?")) {
      try {
        await deleteDoc(doc(db, "profissionais", id));
        alert("Profissional removido.");
      } catch (error) {
        alert("Erro ao remover profissional.");
      }
    }
  };

  const salvarEdicaoCompleta = async (e) => {
      e.preventDefault();
      setSalvando(true);
      
      if (!profEdit.clinicasAcesso || profEdit.clinicasAcesso.length === 0) {
          alert("O profissional deve ter acesso a pelo menos uma clínica.");
          setSalvando(false);
          return;
      }

      try {
          const payload = {
              nome: profEdit.nome,
              email: profEdit.email,
              registro: profEdit.registro,
              clinicasAcesso: profEdit.clinicasAcesso
          };
          
          if (isSuperGestor) {
              payload.role = profEdit.role;
              payload.categoriaBase = profEdit.categoriaBase;
          }

          await updateDoc(doc(db, "profissionais", profEdit.id), payload);
          alert("Dados do profissional atualizados com sucesso!");
          setProfEdit(null);
      } catch (error) {
          alert("Erro ao salvar edições.");
      }
      setSalvando(false);
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#00A1FF]" size={40}/></div>;

  const pendentes = profissionais.filter(p => p.status === 'pendente');
  const ativos = profissionais.filter(p => p.status === 'ativo');
  const ocultos = profissionais.filter(p => p.status === 'oculto');

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-black text-[#0F214A] tracking-tight flex items-center gap-3">
          <ShieldCheck className="text-[#00A1FF]" size={32}/> Gestão de Equipe
        </h1>
        <p className="text-slate-500 font-medium mt-1 text-sm">
          Administre acessos, clínicas designadas e visualize as métricas da sua equipe.
        </p>
      </div>

      {!isSuperGestor && (
         <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3">
             <ShieldAlert className="text-amber-500 shrink-0"/>
             <p className="text-xs font-bold text-amber-800">
                Acesso de Gestão Comum. Apenas o Super Gestor pode alterar cargos e excluir usuários permanentemente.
             </p>
         </div>
      )}

      {/* BLOCO DE PENDENTES */}
      {pendentes.length > 0 && (
        <div className="bg-white rounded-[32px] border border-orange-200 shadow-sm overflow-hidden relative animate-pulse">
           <div className="bg-orange-50 p-6 border-b border-orange-100 flex items-center justify-between">
              <h3 className="font-black text-orange-800 flex items-center gap-2">
                 <Users size={20}/> Solicitações de Acesso Pendentes
              </h3>
              <span className="bg-orange-600 text-white font-black text-xs px-3 py-1 rounded-full">{pendentes.length}</span>
           </div>
           <div className="p-6 space-y-4">
              {pendentes.map(prof => (
                 <div key={prof.id} className="flex flex-col md:flex-row justify-between md:items-center bg-white border border-slate-200 p-4 rounded-2xl shadow-sm gap-4">
                    <div>
                       <h4 className="font-black text-[#0F214A] text-lg">{prof.nome}</h4>
                       <p className="text-xs font-bold text-slate-500">CREFITO: {prof.registro} | E-mail: {prof.email}</p>
                       <p className="text-[10px] font-black text-blue-600 uppercase mt-1">Cargo Solicitado: {prof.categoriaBase}</p>
                       
                       {/* Exibição de clínicas solicitadas visível para avaliação */}
                       <div className="flex gap-2 mt-2">
                           {prof.clinicasAcesso?.includes('vida') && <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded text-[9px] font-black uppercase">Clínica Vida</span>}
                           {prof.clinicasAcesso?.includes('reabtech') && <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded text-[9px] font-black uppercase">Relief/Reabtech</span>}
                       </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                       <button onClick={() => atualizarProfissional(prof.id, { status: 'ativo', role: prof.categoriaBase })} className="flex-1 bg-green-50 text-green-700 hover:bg-green-600 hover:text-white border border-green-200 px-4 py-2.5 rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-2">
                          <CheckCircle2 size={16}/> Aprovar
                       </button>
                       <button onClick={() => removerProfissional(prof.id)} className="flex-1 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white border border-red-200 px-4 py-2.5 rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-2">
                          <XCircle size={16}/> Recusar
                       </button>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}

      {/* BLOCO DE ATIVOS */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-slate-100 bg-slate-50">
            <h3 className="font-black text-[#0F214A] flex items-center gap-2 text-lg"><ShieldCheck className="text-[#00A1FF]"/> Profissionais Ativos</h3>
         </div>
         <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[800px]">
                <thead className="bg-white border-b border-slate-100">
                   <tr>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase">Profissional / E-mail</th>
                      {/* CONDICIONAL: Apenas Super Gestor vê esta coluna */}
                      {isSuperGestor && <th className="p-5 text-[10px] font-black text-slate-400 uppercase">Acessos Clínicos</th>}
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase">Hierarquia / Cargo</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase text-right">Ações de Gestão</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {ativos.map(prof => (
                       <tr key={prof.id} className="hover:bg-slate-50 transition-colors">
                           <td className="p-5">
                               <p className="font-black text-[#0F214A] text-sm flex items-center gap-2">
                                   {prof.nome} {prof.registro === SUPER_GESTOR_REGISTRO && <ShieldAlert size={14} className="text-[#00A1FF]" title="Super Gestor"/>}
                               </p>
                               <p className="text-[10px] font-bold text-slate-400">{prof.email} | Doc: {prof.registro}</p>
                           </td>
                           
                           {/* CONDICIONAL: Apenas Super Gestor vê estes dados */}
                           {isSuperGestor && (
                               <td className="p-5">
                                   <div className="flex flex-wrap gap-1">
                                       {prof.clinicasAcesso?.includes('vida') && <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded-md text-[9px] font-black uppercase">Vida</span>}
                                       {prof.clinicasAcesso?.includes('reabtech') && <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded-md text-[9px] font-black uppercase">Reabtech</span>}
                                   </div>
                               </td>
                           )}

                           <td className="p-5">
                               {isSuperGestor ? (
                                   <select 
                                       className="w-full p-2 bg-white border border-slate-200 rounded-xl font-black text-xs text-slate-700 outline-none focus:border-[#00A1FF]"
                                       value={prof.role} 
                                       onChange={(e) => atualizarProfissional(prof.id, { role: e.target.value })}
                                       disabled={prof.registro === SUPER_GESTOR_REGISTRO} 
                                   >
                                       <option value="fisio">Fisioterapeuta</option>
                                       <option value="to">Ter. Ocupacional</option>
                                       <option value="recepcao">Recepção</option>
                                       <option value="gestor_clinico">Gestor Clínico</option>
                                   </select>
                               ) : (
                                   <div className="flex items-center gap-2 bg-slate-100 text-slate-500 px-3 py-2 rounded-xl text-xs font-black w-fit">
                                       <Lock size={12}/> {prof.role.replace('_', ' ').toUpperCase()}
                                   </div>
                               )}
                           </td>
                           <td className="p-5">
                               <div className="flex items-center justify-end gap-2">
                                   {/* A edição também pode ser restrita se desejar, mas mantive aberta para Super Gestor ou Gestor dependendo do fluxo */}
                                   <button 
                                       onClick={() => setProfEdit({ ...prof, clinicasAcesso: prof.clinicasAcesso || [] })}
                                       className="flex items-center gap-1 text-xs font-bold text-[#00A1FF] hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                   >
                                       <Edit3 size={14}/> Editar
                                   </button>
                                   <button 
                                       onClick={() => atualizarProfissional(prof.id, { status: 'oculto' })}
                                       className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                   >
                                       Ocultar
                                   </button>
                               </div>
                           </td>
                       </tr>
                   ))}
                </tbody>
            </table>
         </div>
      </div>

      {/* BLOCO DE OCULTOS */}
      {ocultos.length > 0 && (
          <div className="bg-slate-50 rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
             <button onClick={() => setMostrarOcultos(!mostrarOcultos)} className="w-full p-6 flex justify-between items-center bg-slate-100/50 hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                   <Lock className="text-slate-400" size={20}/>
                   <h3 className="font-black text-slate-600 text-lg">Usuários Inativos / Desligados</h3>
                   <span className="bg-slate-200 text-slate-500 font-black text-xs px-2 py-0.5 rounded-full">{ocultos.length}</span>
                </div>
                {mostrarOcultos ? <ChevronUp className="text-slate-400"/> : <ChevronDown className="text-slate-400"/>}
             </button>
             
             {mostrarOcultos && (
                <div className="p-6 space-y-4">
                   {ocultos.map(prof => (
                       <div key={prof.id} className="flex justify-between items-center bg-white border border-slate-200 p-4 rounded-2xl opacity-60 hover:opacity-100 transition-opacity">
                          <div>
                             <h4 className="font-black text-slate-700 text-sm line-through">{prof.nome}</h4>
                             <p className="text-[10px] font-bold text-slate-400">{prof.email}</p>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => setProfEdit({ ...prof, clinicasAcesso: prof.clinicasAcesso || [] })} className="text-slate-400 hover:text-[#00A1FF] p-2 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors">
                                <Edit3 size={16}/>
                             </button>
                             <button onClick={() => atualizarProfissional(prof.id, { status: 'ativo' })} className="bg-slate-100 text-slate-600 hover:bg-[#0F214A] hover:text-white px-4 py-2 rounded-xl font-black text-xs transition-colors">
                                Restaurar Acesso
                             </button>
                          </div>
                       </div>
                   ))}
                </div>
             )}
          </div>
      )}

      {/* MODAL DE EDIÇÃO COMPLETA */}
      {profEdit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in">
          <div className="bg-white p-8 rounded-[32px] w-full max-w-lg shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-xl text-[#0F214A] flex items-center gap-2">
                    <Edit3 className="text-[#00A1FF]"/> Gerir Profissional
                </h3>
                <button onClick={() => setProfEdit(null)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"><X/></button>
             </div>
             
             <form onSubmit={salvarEdicaoCompleta} className="space-y-5">
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Nome Completo</label>
                    <input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] font-bold text-slate-700" value={profEdit.nome} onChange={e => setProfEdit({...profEdit, nome: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">E-mail de Login</label>
                        <input required type="email" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] font-bold text-slate-700" value={profEdit.email} onChange={e => setProfEdit({...profEdit, email: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Documento (CREFITO)</label>
                        <input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] font-bold text-slate-700" value={profEdit.registro} onChange={e => setProfEdit({...profEdit, registro: e.target.value})} />
                    </div>
                </div>

                {isSuperGestor && profEdit.registro !== SUPER_GESTOR_REGISTRO && (
                    <div className="grid grid-cols-2 gap-4 bg-amber-50 p-4 rounded-xl border border-amber-100">
                        <div>
                            <label className="text-[10px] font-black uppercase text-amber-800 mb-1 block">Categoria Base</label>
                            <select className="w-full p-3 bg-white border border-amber-200 rounded-xl font-bold text-slate-700 outline-none focus:border-amber-400" value={profEdit.categoriaBase} onChange={e => setProfEdit({...profEdit, categoriaBase: e.target.value})}>
                                <option value="fisio">Fisioterapeuta</option>
                                <option value="to">Ter. Ocupacional</option>
                                <option value="recepcao">Recepção</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-amber-800 mb-1 block flex items-center gap-1"><ShieldAlert size={10}/> Privilégio Atual</label>
                            <select className="w-full p-3 bg-white border border-amber-200 rounded-xl font-black text-slate-700 outline-none focus:border-amber-400" value={profEdit.role} onChange={e => setProfEdit({...profEdit, role: e.target.value})}>
                                <option value="fisio">Fisioterapeuta</option>
                                <option value="to">Ter. Ocupacional</option>
                                <option value="recepcao">Recepção</option>
                                <option value="gestor_clinico">Gestor Clínico</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Apenas Super Gestor pode designar clínicas no modal de edição de equipe */}
                {isSuperGestor ? (
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <label className="text-[10px] font-black uppercase text-[#0F214A] mb-2 flex items-center gap-1"><Building2 size={14}/> Designação de Clínicas</label>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 accent-[#00A1FF]" checked={profEdit.clinicasAcesso?.includes('vida')} onChange={(e) => {
                                    const atuais = profEdit.clinicasAcesso || [];
                                    setProfEdit({...profEdit, clinicasAcesso: e.target.checked ? [...atuais, 'vida'] : atuais.filter(c => c !== 'vida')});
                                }}/> Clínica Vida
                            </label>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 accent-[#00A1FF]" checked={profEdit.clinicasAcesso?.includes('reabtech')} onChange={(e) => {
                                    const atuais = profEdit.clinicasAcesso || [];
                                    setProfEdit({...profEdit, clinicasAcesso: e.target.checked ? [...atuais, 'reabtech'] : atuais.filter(c => c !== 'reabtech')});
                                }}/> Clínica Relief/Reabtech
                            </label>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Lock size={12}/> Acesso de clínicas gerenciado pelo Super Gestor.</p>
                    </div>
                )}
                
                <button type="submit" disabled={salvando} className="w-full bg-[#0F214A] text-white py-4 rounded-2xl font-black text-sm shadow-xl hover:bg-[#00A1FF] transition-all flex items-center justify-center gap-2 mt-4">
                  {salvando ? <Loader2 className="animate-spin" size={20}/> : 'Salvar Alterações do Profissional'}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}