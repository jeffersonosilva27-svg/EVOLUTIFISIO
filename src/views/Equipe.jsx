import React, { useState, useEffect } from 'react';
import { UserCheck, ShieldAlert, UserPlus, X, Save, Mail, Key, User, Shield, Award, CheckSquare, Edit2 } from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, onSnapshot, query, updateDoc, doc, addDoc, orderBy } from 'firebase/firestore';

export default function Equipe({ user }) {
  const [profissionais, setProfissionais] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [idEditando, setIdEditando] = useState(null); // NOVO: Controla se estamos editando
  
  const estadoInicialForm = {
    nome: '', email: '', senhaProvisoria: '',
    categoriaBase: '', registro: '', isGestor: false 
  };

  const [novoProfissional, setNovoProfissional] = useState(estadoInicialForm);

  useEffect(() => {
    const q = query(collection(db, "profissionais"), orderBy("nome", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProfissionais(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  // NOVO: Função para abrir o formulário em Modo de Edição
  const abrirEdicao = (prof) => {
    setIdEditando(prof.id);
    setNovoProfissional({
      nome: prof.nome || '',
      email: prof.email || '',
      senhaProvisoria: '', // Escondemos a senha real por segurança
      categoriaBase: prof.categoriaBase || '',
      registro: prof.registro === 'Não aplicável' ? '' : (prof.registro || ''),
      isGestor: prof.isGestor || false
    });
    setMostrarForm(true);
  };

  const fecharFormulario = () => {
    setMostrarForm(false);
    setIdEditando(null);
    setNovoProfissional(estadoInicialForm);
  };

  const salvarProfissional = async (e) => {
    e.preventDefault();
    if (!novoProfissional.categoriaBase && !novoProfissional.isGestor) {
      return alert("Selecione uma categoria ou marque como Gestor do Sistema.");
    }

    const roleCalculada = novoProfissional.isGestor ? 'gestor_clinico' : novoProfissional.categoriaBase;
    const registroCalculado = novoProfissional.registro || 'Não aplicável';

    try {
      if (idEditando) {
        // MODO EDIÇÃO (Update)
        const updateData = {
          nome: novoProfissional.nome,
          email: novoProfissional.email,
          role: roleCalculada,
          categoriaBase: novoProfissional.categoriaBase,
          isGestor: novoProfissional.isGestor,
          registro: registroCalculado,
        };
        
        // Só atualiza a senha provisória se o gestor digitou uma nova
        if (novoProfissional.senhaProvisoria) {
          updateData.senhaProvisoria = novoProfissional.senhaProvisoria;
          updateData.precisaTrocarSenha = true; 
        }

        await updateDoc(doc(db, "profissionais", idEditando), updateData);
        alert("Profissional atualizado com sucesso!");

      } else {
        // MODO CRIAÇÃO (Add)
        if (!novoProfissional.senhaProvisoria) return alert("A senha provisória é obrigatória para novos cadastros.");
        
        await addDoc(collection(db, "profissionais"), {
          nome: novoProfissional.nome,
          email: novoProfissional.email,
          role: roleCalculada,
          categoriaBase: novoProfissional.categoriaBase,
          isGestor: novoProfissional.isGestor,
          registro: registroCalculado,
          senhaProvisoria: novoProfissional.senhaProvisoria,
          precisaTrocarSenha: true,
          status: 'ativo',
          dataCadastro: new Date().toISOString()
        });
        alert("Novo profissional cadastrado com sucesso!");
      }
      fecharFormulario();
    } catch (error) {
      alert("Erro ao salvar no banco de dados.");
    }
  };

  const aprovarProfissional = async (id) => await updateDoc(doc(db, "profissionais", id), { status: 'ativo' });

  const nomeCategoria = {
    'fisio': 'Fisioterapeuta', 'to': 'Terapeuta Ocupacional',
    'admin_fin': 'Financeiro', 'recepcao': 'Recepção', 'gestor_clinico': 'Gestor' 
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center">
            <ShieldAlert className="mr-2 text-amber-600"/> Gestão de Acessos
          </h1>
          <p className="text-sm text-slate-500">Controle de equipe, hierarquia e edições.</p>
        </div>
        {!mostrarForm && (
          <button onClick={() => { setIdEditando(null); setNovoProfissional(estadoInicialForm); setMostrarForm(true); }} className="bg-amber-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center shadow-lg hover:bg-amber-700 transition-colors">
            <UserPlus size={18} className="mr-2"/> Novo Colaborador
          </button>
        )}
      </div>

      {mostrarForm && (
        <div className="bg-white p-8 rounded-3xl border-2 border-amber-100 shadow-xl">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <h3 className="font-black text-xl text-amber-900">
              {idEditando ? 'Editar Profissional' : 'Cadastrar Profissional'}
            </h3>
            <button onClick={fecharFormulario} className="text-slate-400 hover:text-red-500 bg-slate-50 p-2 rounded-full"><X size={16}/></button>
          </div>
          
          <form onSubmit={salvarProfissional} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center"><User size={12} className="mr-1"/> Nome Completo</label>
              <input required type="text" className="w-full border-2 p-3 rounded-xl bg-slate-50 outline-none focus:border-amber-500" 
                value={novoProfissional.nome} onChange={e => setNovoProfissional({...novoProfissional, nome: e.target.value})} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center"><Shield size={12} className="mr-1"/> Profissão Base</label>
              <select className="w-full border-2 p-3 rounded-xl bg-slate-50 outline-none focus:border-amber-500 text-slate-700 font-medium"
                value={novoProfissional.categoriaBase} onChange={e => setNovoProfissional({...novoProfissional, categoriaBase: e.target.value})}>
                <option value="">Selecione a profissão / cargo...</option>
                <option value="fisio">Fisioterapeuta</option><option value="to">Terapeuta Ocupacional</option>
                <option value="recepcao">Recepção</option><option value="admin_fin">Administrador Financeiro</option>
              </select>
            </div>

            <div className="md:col-span-2 bg-amber-50 border-2 border-amber-100 p-5 rounded-xl flex items-start space-x-4 transition-all hover:border-amber-200">
              <input type="checkbox" id="isGestor" className="mt-1 w-5 h-5 text-amber-600 rounded border-slate-300 cursor-pointer"
                checked={novoProfissional.isGestor} onChange={e => setNovoProfissional({...novoProfissional, isGestor: e.target.checked})} />
              <div>
                <label htmlFor="isGestor" className="font-black text-amber-900 cursor-pointer flex items-center text-lg">
                  Gestor do Sistema (Hierarquia Total)
                </label>
                <p className="text-xs text-amber-700/80 mt-1 font-medium leading-relaxed">
                  Concede acesso irrestrito a todas as áreas do sistema (Equipe, Faturamento, Agenda Global).
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center"><Award size={12} className="mr-1"/> Registro (Ex: CREFITO)</label>
              <input type="text" placeholder="Deixe em branco se administrativo" className="w-full border-2 p-3 rounded-xl bg-slate-50 outline-none focus:border-amber-500" 
                value={novoProfissional.registro} onChange={e => setNovoProfissional({...novoProfissional, registro: e.target.value})} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center"><Mail size={12} className="mr-1"/> E-mail de Acesso</label>
              <input required type="email" placeholder="email@clinica.com" className="w-full border-2 p-3 rounded-xl bg-slate-50 outline-none focus:border-amber-500" 
                value={novoProfissional.email} onChange={e => setNovoProfissional({...novoProfissional, email: e.target.value})} />
            </div>

            <div className="space-y-1 md:col-span-2 bg-slate-50 p-5 rounded-xl border-2 border-slate-100">
              <label className="text-xs font-bold text-slate-700 uppercase flex items-center mb-2">
                <Key size={12} className="mr-1"/> {idEditando ? 'Redefinir Senha Provisória (Opcional)' : 'Senha Provisória (Obrigatória)'}
              </label>
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <input type="text" placeholder={idEditando ? "Deixe em branco para manter a senha atual" : "Ex: Mudar@123"} 
                  className="w-full md:flex-1 border-2 p-3 rounded-xl bg-white outline-none focus:border-amber-500" 
                  value={novoProfissional.senhaProvisoria} onChange={e => setNovoProfissional({...novoProfissional, senhaProvisoria: e.target.value})} 
                  required={!idEditando} />
                <span className="text-[10px] font-bold text-slate-400 max-w-[200px] leading-tight text-center md:text-left">
                  {idEditando ? "Se preenchido, forçará o usuário a trocar a senha no próximo login." : "O profissional será forçado a trocar no 1º acesso (LGPD)."}
                </span>
              </div>
            </div>

            <div className="md:col-span-2 pt-4">
              <button type="submit" className="w-full bg-amber-600 text-white py-4 rounded-xl font-black shadow-lg hover:bg-amber-700 transition-all flex items-center justify-center text-lg">
                <Save size={20} className="mr-2"/> {idEditando ? 'Salvar Edições' : 'Criar Conta e Liberar Acesso'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TABELA DA EQUIPE COM BOTÃO DE EDITAR */}
      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        {profissionais.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">Nenhum profissional cadastrado.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
              <tr>
                <th className="p-5">Colaborador</th>
                <th className="p-5">Acesso</th>
                <th className="p-5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {profissionais.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-5">
                    <div className="font-black text-slate-900 text-base">{p.nome || 'Sem Nome'}</div>
                    <div className="text-xs text-slate-500 font-medium">{p.email} • {p.registro !== 'Não aplicável' ? p.registro : 'S/ Registro'}</div>
                  </td>
                  <td className="p-5">
                    <div className="flex flex-col items-start gap-1.5">
                      {p.categoriaBase && (
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-bold border border-slate-200">
                          {nomeCategoria[p.categoriaBase] || p.categoriaBase}
                        </span>
                      )}
                      {p.isGestor && (
                        <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md text-[10px] font-black border border-amber-200 flex items-center">
                          <CheckSquare size={10} className="mr-1"/> GESTOR TOTAL
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-5 text-right flex items-center justify-end space-x-2">
                    {p.status === 'pendente' && (
                      <button onClick={() => aprovarProfissional(p.id)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm flex items-center">
                        <UserCheck size={14} className="mr-1"/> Aprovar
                      </button>
                    )}
                    {/* BOTÃO DE EDITAR */}
                    <button onClick={() => abrirEdicao(p)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-200" title="Editar Perfil">
                      <Edit2 size={18}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}