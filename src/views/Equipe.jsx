import React, { useState, useEffect } from 'react';
import { 
  Users, ShieldAlert, Activity, Mail, Key, Trash2, CheckCircle, AlertCircle, XCircle, ChevronDown, ChevronUp, Download
} from 'lucide-react';
import { db, auth } from '../services/firebaseConfig';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, getDocs } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';

export default function Equipe({ user, registrarLog, hasAccess }) {
  const [equipe, setEquipe] = useState([]);
  const [mostrarInativos, setMostrarInativos] = useState(false);
  
  useEffect(() => {
    // Carrega todos os utilizadores registados na plataforma
    const q = query(collection(db, "usuarios"), orderBy("nome", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setEquipe(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Divisão Inteligente dos Status
  const pendentes = equipe.filter(u => u.role === 'pendente');
  const ativos = equipe.filter(u => u.role !== 'pendente' && u.role !== 'oculto');
  const inativos = equipe.filter(u => u.role === 'oculto');

  // FUNÇÃO 1: Aprovar utilizadores que estão barrados na triagem
  const aprovarUsuario = async (id, nome, novaRole) => {
    try {
      await updateDoc(doc(db, "usuarios", id), { role: novaRole });
      if(registrarLog) registrarLog("Aprovação de Conta", `O usuário ${nome} foi aprovado na triagem como ${novaRole.replace('_', ' ')}.`);
      alert("Acesso liberado com sucesso!");
    } catch (e) {
      console.error(e);
      alert("Erro ao aprovar o acesso do usuário no banco de dados.");
    }
  };

  // FUNÇÃO 2: Alterar as permissões de quem já está dentro
  const alterarRole = async (id, nome, novaRole) => {
    try {
      await updateDoc(doc(db, "usuarios", id), { role: novaRole });
      if(registrarLog) registrarLog("Alteração de Acesso", `O acesso de ${nome} mudou para ${novaRole}.`);
    } catch (e) {
      alert("Erro ao alterar acesso.");
    }
  };

  // FUNÇÃO 3: Reset de Senha (via E-mail oficial do Firebase)
  const resetarSenha = async (email) => {
    if(!window.confirm(`Deseja enviar um link de redefinição de senha para ${email}?`)) return;
    try {
      await sendPasswordResetEmail(auth, email);
      alert(`E-mail de redefinição de senha enviado para ${email}`);
      if(registrarLog) registrarLog("Reset de Senha", `Link de reset enviado para ${email}.`);
    } catch (e) {
      alert("Erro ao enviar e-mail de reset.");
    }
  };

  // FUNÇÃO 4: O Botão Nuclear de Backup
  const backupNuclear = async () => {
     if(!window.confirm("Isso fará o download de TODOS os dados sensíveis da clínica. Deseja prosseguir?")) return;
     try {
        const colecoes = ["usuarios", "pacientes", "agendamentos", "banco_exercicios"];
        let backupData = {};
        for (let col of colecoes) {
           const snap = await getDocs(collection(db, col));
           backupData[col] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `Backup_Evoluti_Nuclear_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        if(registrarLog) registrarLog("Backup Nuclear", "O Gestor Master realizou a extração completa do banco de dados (JSON).");
     } catch(e) {
         alert("Erro ao gerar o backup do sistema.");
     }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="text-blue-600" size={36}/> Gestão da Equipe
          </h1>
          <p className="text-slate-500 font-medium mt-1">Aprove novos cadastros, defina acessos e cargos.</p>
        </div>
        
        {/* Só o Super Gestor deve fazer backups de segurança */}
        {user?.registro === '329099-F' || user?.registro === '329099F' ? (
          <button onClick={backupNuclear} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg">
             <Download size={18}/> Backup Nuclear (.json)
          </button>
        ) : null}
      </header>

      {/* 🔴 FILA DE APROVAÇÃO (NOVOS CADASTROS) */}
      {pendentes.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-[32px] p-6 shadow-sm animate-pulse">
          <h3 className="text-xl font-black text-amber-800 mb-6 flex items-center gap-2">
            <ShieldAlert className="text-amber-600"/> Triagem de Acessos Pendentes ({pendentes.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendentes.map(p => (
              <div key={p.id} className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex flex-col gap-4">
                <div>
                  <h4 className="font-black text-slate-800 text-lg">{p.nome}</h4>
                  <p className="text-xs font-bold text-slate-500 mb-2">{p.email}</p>
                  
                  <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-100 px-2 py-1 rounded-lg">
                    CREFITO: {p.registro || 'Não informado'}
                  </span>
                  <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-100 px-2 py-1 rounded-lg ml-2">
                    Clínicas: {p.clinicasAcesso?.join(', ') || 'Não selecionada'}
                  </span>
                </div>
                
                {/* Botões de Ação para Aprovar o Acesso */}
                <div className="flex gap-2">
                   <button onClick={() => aprovarUsuario(p.id, p.nome, 'saude')} className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 py-3 rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1">
                     <CheckCircle size={14}/> Autorizar: Prof. Saúde
                   </button>
                   <button onClick={() => aprovarUsuario(p.id, p.nome, 'recepcao')} className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 py-3 rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1">
                     <CheckCircle size={14}/> Autorizar: Recepção
                   </button>
                   <button onClick={() => alterarRole(p.id, p.nome, 'oculto')} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-3 rounded-xl transition-colors" title="Recusar Acesso">
                     <XCircle size={18}/>
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🟢 LISTAGEM DE EQUIPE ATIVA */}
      <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
         <div className="p-6 border-b border-slate-100 bg-slate-50">
            <h3 className="font-black text-slate-800 flex items-center gap-2"><Activity size={20} className="text-blue-600"/> Membros Ativos da Clínica</h3>
         </div>
         <div className="overflow-x-auto custom-scrollbar">
           <table className="w-full text-left">
             <thead>
               <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                 <th className="px-6 py-4">Profissional</th>
                 <th className="px-6 py-4">CREFITO</th>
                 <th className="px-6 py-4">Cargo / Acesso</th>
                 <th className="px-6 py-4 text-right">Ações Rápidas</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {ativos.map(p => (
                 <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                   <td className="px-6 py-4">
                     <p className="font-black text-slate-800 text-sm">{p.nome}</p>
                     <p className="text-xs font-bold text-slate-500">{p.email}</p>
                   </td>
                   <td className="px-6 py-4">
                     <span className="text-xs font-black text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">{p.registro || 'N/A'}</span>
                   </td>
                   <td className="px-6 py-4">
                     <select 
                       value={p.role} 
                       onChange={(e) => alterarRole(p.id, p.nome, e.target.value)}
                       // Trava de segurança para impedir que alguém rebaixe o cargo do dono da clínica
                       disabled={p.registro === '329099-F' || p.registro === '329099F'}
                       className="bg-white border border-slate-200 text-sm font-bold text-slate-700 rounded-xl px-3 py-2 outline-none focus:border-blue-500 disabled:opacity-50"
                     >
                       <option value="saude">Prof. Saúde</option>
                       <option value="recepcao">Recepção</option>
                       <option value="gestor_clinico">Gestor Clínico</option>
                     </select>
                   </td>
                   <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                     <button onClick={() => resetarSenha(p.email)} title="Resetar Senha por E-mail" className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"><Key size={16}/></button>
                     <button onClick={() => alterarRole(p.id, p.nome, 'oculto')} disabled={p.registro === '329099-F' || p.registro === '329099F'} title="Desativar Conta" className="p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors disabled:opacity-50"><Trash2 size={16}/></button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
      </div>

      {/* ⚪ USUÁRIOS DESATIVADOS (SANFONA) */}
      <div className="border border-slate-200 rounded-[32px] overflow-hidden bg-white shadow-sm">
         <button onClick={() => setMostrarInativos(!mostrarInativos)} className="w-full p-6 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors">
            <h3 className="font-black text-slate-600 flex items-center gap-2"><Trash2 size={20}/> Usuários Desativados ({inativos.length})</h3>
            {mostrarInativos ? <ChevronUp size={20} className="text-slate-400"/> : <ChevronDown size={20} className="text-slate-400"/>}
         </button>
         
         {mostrarInativos && (
             <div className="p-6">
                {inativos.length === 0 ? (
                    <p className="text-sm font-bold text-slate-400 text-center py-4">Nenhum usuário foi desativado da clínica até ao momento.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       {inativos.map(p => (
                           <div key={p.id} className="border border-slate-200 p-4 rounded-2xl flex justify-between items-center bg-slate-50 opacity-70 hover:opacity-100 transition-opacity">
                              <div>
                                 <p className="font-black text-slate-700 text-sm line-clamp-1">{p.nome}</p>
                                 <p className="text-[10px] font-bold text-slate-500">{p.email}</p>
                              </div>
                              <button onClick={() => alterarRole(p.id, p.nome, 'saude')} className="text-xs font-black bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg transition-colors">
                                Restaurar Acesso
                              </button>
                           </div>
                       ))}
                    </div>
                )}
             </div>
         )}
      </div>

    </div>
  );
}