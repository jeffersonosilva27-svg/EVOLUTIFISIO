import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Loader2, CheckCircle2, UserX, AlertTriangle, UserCheck, Palmtree
} from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, onSnapshot, doc, updateDoc, query, getDocs, where } from 'firebase/firestore';

export default function Equipe({ user }) {
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redistribuindo, setRedistribuindo] = useState(false);

  useEffect(() => {
    if (user?.role !== 'gestor_clinico') return;
    const unsub = onSnapshot(collection(db, "profissionais"), (snap) => {
      setProfissionais(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const alterarStatus = async (id, novoStatus) => {
    try { await updateDoc(doc(db, "profissionais", id), { status: novoStatus, role: novoStatus === 'ativo' ? 'fisio' : 'pendente' }); } 
    catch (e) { alert("Erro ao atualizar."); }
  };

  const planejarFerias = async (profissionalId) => {
    if (!window.confirm("Isto colocará o profissional de Férias e tentará redistribuir os seus pacientes futuros. Continuar?")) return;
    setRedistribuindo(true);

    try {
        const profFerias = profissionais.find(p => p.id === profissionalId);
        
        // 1. Achar profissionais da mesma categoria ativos
        const equipeAtiva = profissionais.filter(p => p.id !== profissionalId && p.status === 'ativo' && p.categoriaBase === profFerias.categoriaBase);
        
        if (equipeAtiva.length === 0) {
            alert(`Aviso: Não há outros profissionais da categoria "${profFerias.categoriaBase}" ativos para redistribuir os pacientes. O profissional ficará de férias, mas a agenda ficará órfã.`);
        } else {
            // 2. Achar todos os agendamentos pendentes deste profissional
            const qAgend = query(collection(db, "agendamentos"), where("profissionalId", "==", profissionalId), where("status", "==", "pendente"));
            const snapAgend = await getDocs(qAgend);
            
            // 3. Agrupar por Paciente (Para manter o mesmo paciente sempre com o mesmo profissional substituto)
            const mapPacientes = {};
            snapAgend.docs.forEach(docSnap => {
                const ag = { id: docSnap.id, ...docSnap.data() };
                if (!mapPacientes[ag.pacienteId]) mapPacientes[ag.pacienteId] = [];
                mapPacientes[ag.pacienteId].push(ag);
            });

            // 4. Redistribuir em "Round-Robin" (Equilíbrio de carga)
            let equipeIndex = 0;
            for (const [pacId, agendamentosDoPac] of Object.entries(mapPacientes)) {
                const profissionalSubstituto = equipeAtiva[equipeIndex];
                
                // Atualiza todos os agendamentos deste paciente para o substituto
                await Promise.all(agendamentosDoPac.map(ag => 
                    updateDoc(doc(db, "agendamentos", ag.id), {
                        profissionalId: profissionalSubstituto.id,
                        profissionalNome: profissionalSubstituto.nome,
                        profissional: profissionalSubstituto.nome
                    })
                ));

                // Avança no array de equipa (se chegar ao fim, volta a zero)
                equipeIndex = (equipeIndex + 1) % equipeAtiva.length;
            }
            if(Object.keys(mapPacientes).length > 0) alert("Agenda redistribuída com sucesso para manter o equilíbrio!");
        }

        // 5. Por fim, colocar de férias
        await updateDoc(doc(db, "profissionais", profissionalId), { status: 'ferias' });

    } catch (e) { alert("Erro ao planejar férias: " + e.message); }
    setRedistribuindo(false);
  };

  if (user?.role !== 'gestor_clinico') return <div className="p-10 font-black text-slate-400">Acesso restrito.</div>;
  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#00A1FF]"/></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-[#0F214A] tracking-tight flex items-center gap-3">
          <ShieldCheck className="text-[#00A1FF]" size={32}/> Gestão de Equipa
        </h1>
        <p className="text-slate-500 font-medium mt-1">Aprove acessos, planeie férias e gira a distribuição da clínica.</p>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr><th className="p-6 text-[10px] font-black text-slate-400 uppercase">Profissional</th><th className="p-6 text-[10px] font-black text-slate-400 uppercase">Status</th><th className="p-6 text-[10px] font-black text-slate-400 uppercase text-right">Ações</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {profissionais.map(p => (
              <tr key={p.id} className={p.status === 'oculto' ? 'opacity-50 bg-slate-50' : 'hover:bg-blue-50/30'}>
                <td className="p-6">
                  <div className="font-black text-slate-900 text-lg flex items-center gap-2">{p.nome} {p.id === user.id && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded uppercase">Você</span>}</div>
                  <div className="text-xs text-slate-500 font-bold uppercase">{p.categoriaBase}</div>
                </td>
                <td className="p-6">
                   {p.status === 'pendente' && <span className="text-amber-600 bg-amber-50 px-3 py-1 rounded-lg font-black text-xs uppercase flex w-fit items-center"><AlertTriangle size={14} className="mr-1"/> Pendente</span>}
                   {p.status === 'ativo' && <span className="text-green-600 bg-green-50 px-3 py-1 rounded-lg font-black text-xs uppercase flex w-fit items-center"><CheckCircle2 size={14} className="mr-1"/> Ativo</span>}
                   {p.status === 'ferias' && <span className="text-blue-600 bg-blue-50 px-3 py-1 rounded-lg font-black text-xs uppercase flex w-fit items-center"><Palmtree size={14} className="mr-1"/> Em Férias</span>}
                   {p.status === 'oculto' && <span className="text-slate-500 bg-slate-200 px-3 py-1 rounded-lg font-black text-xs uppercase">Desativado</span>}
                </td>
                <td className="p-6 text-right">
                   {p.id !== user.id && (
                     <div className="flex items-center justify-end gap-2">
                        {p.status === 'pendente' && <button onClick={() => alterarStatus(p.id, 'ativo')} className="p-2 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors" title="Aprovar"><UserCheck size={18}/></button>}
                        {p.status === 'ativo' && <button disabled={redistribuindo} onClick={() => planejarFerias(p.id)} className="p-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors" title="Planejar Férias (Redistribuir agenda)"><Palmtree size={18}/></button>}
                        {p.status === 'ferias' && <button onClick={() => alterarStatus(p.id, 'ativo')} className="p-2 bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200 transition-colors font-bold text-xs" title="Retornar">Voltar</button>}
                        
                        {p.status !== 'oculto' ? (
                            <button onClick={() => {if(window.confirm("Desativar e ocultar?")) alterarStatus(p.id, 'oculto')}} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors" title="Desativar"><UserX size={18}/></button>
                        ) : (
                            <button onClick={() => alterarStatus(p.id, 'ativo')} className="p-2 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 font-bold text-xs">Reativar</button>
                        )}
                     </div>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}