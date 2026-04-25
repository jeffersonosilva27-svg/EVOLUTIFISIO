import React, { useState, useEffect } from 'react';
import { Plus, Search, X, Save, FileText, ChevronLeft, Award, Smartphone, CreditCard } from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

export default function Pacientes({ pacientes, hasAccess, user }) {
  // A busca agora mora aqui dentro de forma segura
  const [termoBusca, setTermoBusca] = useState('');
  
  const [mostrarForm, setMostrarForm] = useState(false);
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [evolucoes, setEvolucoes] = useState([]);
  const [novoSoap, setNovoSoap] = useState('');

  const [novoPaciente, setNovoPaciente] = useState({
    nome: '', cpf: '', whatsapp: '', emergencia: '', valor: ''
  });

  const salvarPaciente = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "pacientes"), {
        ...novoPaciente,
        dataCadastro: new Date().toISOString(),
        status: 'ativo'
      });
      alert("Paciente cadastrado com sucesso!");
      setNovoPaciente({ nome: '', cpf: '', whatsapp: '', emergencia: '', valor: '' });
      setMostrarForm(false);
    } catch (error) {
      alert("Erro ao salvar no banco de dados.");
    }
  };

  useEffect(() => {
    if (pacienteSelecionado) {
      const q = query(collection(db, "pacientes", pacienteSelecionado.id, "evolucoes"), orderBy("data", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setEvolucoes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [pacienteSelecionado]);

  const salvarEvolucao = async () => {
    if (!novoSoap) return;
    await addDoc(collection(db, "pacientes", pacienteSelecionado.id, "evolucoes"), {
      texto: novoSoap, 
      data: new Date().toISOString(), 
      profissional: user?.name || 'Profissional', 
      registro: user?.registro || 'Não informado', 
      papel: user?.role || ''
    });
    setNovoSoap('');
    alert("Evolução assinada e salva!");
  };

  // 🛡️ BLINDAGEM CONTRA TELA BRANCA: 
  // Garante que o sistema não quebre se o nome do paciente ou a busca estiverem vazios
  const filtrados = (pacientes || []).filter(p => 
    (p.nome || '').toLowerCase().includes((termoBusca || '').toLowerCase())
  );

  // --- TELA DO PRONTUÁRIO INTERNO (SOAP) ---
  if (pacienteSelecionado) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
        <button onClick={() => setPacienteSelecionado(null)} className="flex items-center text-slate-500 font-bold hover:text-blue-600 transition-colors">
          <ChevronLeft className="mr-1"/> Voltar para a Lista
        </button>
        
        <div className="bg-white p-8 rounded-3xl border shadow-sm">
          <h2 className="text-3xl font-black text-slate-900">{pacienteSelecionado.nome || 'Paciente sem nome'}</h2>
          <div className="flex gap-4 mt-2 text-slate-500 text-sm">
            <span className="flex items-center"><CreditCard size={14} className="mr-1"/> {pacienteSelecionado.cpf || 'Não informado'}</span>
            <span className="flex items-center"><Smartphone size={14} className="mr-1"/> {pacienteSelecionado.whatsapp || 'Não informado'}</span>
          </div>
        </div>

        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
          <h3 className="font-bold text-blue-800 mb-4 flex items-center"><FileText size={18} className="mr-2"/> Novo Registro Clínico</h3>
          <textarea 
            className="w-full border-2 border-blue-100 rounded-2xl p-4 h-32 mb-4 outline-none focus:border-blue-500 bg-white" 
            placeholder="Digite a evolução SOAP da sessão..." 
            value={novoSoap} 
            onChange={e => setNovoSoap(e.target.value)} 
          />
          <button onClick={salvarEvolucao} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-colors">
            Assinar Evolução
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-slate-700">Histórico de Atendimentos</h3>
          {evolucoes.length === 0 ? (
            <p className="text-slate-400 italic">Nenhum registro clínico encontrado para este paciente.</p>
          ) : (
            evolucoes.map(evo => (
              <div key={evo.id} className="bg-white p-6 rounded-2xl border shadow-sm">
                <p className="text-slate-800 whitespace-pre-wrap mb-4">{evo.texto}</p>
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t pt-4">
                  <span>{new Date(evo.data).toLocaleString('pt-BR')}</span>
                  <span className="text-blue-600 flex items-center"><Award size={12} className="mr-1"/> {evo.profissional} ({evo.registro})</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // --- TELA DA LISTA DE PACIENTES ---
  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-900">Base de Pacientes</h1>
        <button onClick={() => setMostrarForm(true)} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-colors">
          + Novo Paciente
        </button>
      </div>

      {mostrarForm && (
        <div className="bg-white p-8 rounded-3xl border-2 border-blue-100 shadow-xl">
           <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-blue-800 text-lg">Cadastro LGPD</h3>
             <button onClick={() => setMostrarForm(false)} className="text-slate-400 hover:text-red-500 bg-slate-100 p-2 rounded-full"><X size={16}/></button>
           </div>
           
           <form onSubmit={salvarPaciente} className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <input required placeholder="Nome Completo" className="border-2 p-3 rounded-xl bg-slate-50 outline-none focus:border-blue-500" value={novoPaciente.nome} onChange={e => setNovoPaciente({...novoPaciente, nome: e.target.value})} />
             <input required placeholder="CPF (000.000.000-00)" className="border-2 p-3 rounded-xl bg-slate-50 outline-none focus:border-blue-500" value={novoPaciente.cpf} onChange={e => setNovoPaciente({...novoPaciente, cpf: e.target.value})} />
             <input required placeholder="WhatsApp / Telefone" className="border-2 p-3 rounded-xl bg-slate-50 outline-none focus:border-blue-500" value={novoPaciente.whatsapp} onChange={e => setNovoPaciente({...novoPaciente, whatsapp: e.target.value})} />
             <input required type="number" placeholder="Valor da Sessão (R$)" className="border-2 p-3 rounded-xl bg-slate-50 outline-none focus:border-blue-500" value={novoPaciente.valor} onChange={e => setNovoPaciente({...novoPaciente, valor: e.target.value})} />
             <button type="submit" className="md:col-span-2 bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 shadow-md mt-2 transition-all">
               Salvar no Banco de Dados
             </button>
           </form>
        </div>
      )}

      {/* BARRA DE BUSCA SEGURA */}
      <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center focus-within:ring-2 focus-within:ring-blue-500 transition-all">
        <Search className="text-slate-400 mr-3" size={20}/>
        <input 
          placeholder="Buscar por nome do paciente..." 
          className="flex-1 outline-none text-slate-700 bg-transparent font-medium" 
          value={termoBusca} 
          onChange={e => setTermoBusca(e.target.value)} 
        />
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
            <tr>
              <th className="p-4">Paciente</th>
              <th className="p-4">Contato</th>
              <th className="p-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtrados.length === 0 ? (
              <tr><td colSpan="3" className="p-8 text-center text-slate-400 font-medium">Nenhum paciente cadastrado ou encontrado.</td></tr>
            ) : (
              filtrados.map(p => (
                <tr key={p.id} className="hover:bg-blue-50 cursor-pointer transition-colors" onClick={() => setPacienteSelecionado(p)}>
                  <td className="p-4 font-bold text-slate-900">{p.nome || 'Sem Nome'}</td>
                  <td className="p-4 text-sm text-slate-500">{p.whatsapp || '--'}</td>
                  <td className="p-4 text-right text-blue-600 font-bold text-sm">Abrir Prontuário &rarr;</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}