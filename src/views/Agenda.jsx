import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Plus, CheckCircle2, Trash2, Clock, X, 
  Save, Search, AlertTriangle, FileText, MapPin, User, Stethoscope,
  ChevronLeft, ChevronRight, LayoutGrid, List, CalendarDays
} from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { resolverConflitoAgenda } from '../services/geminiService';

const LOCAIS = ['Sala 701 (Preferência Fisio)', 'Sala 703 (Preferência Fisio)', 'Sala 704 (Preferência TO)', 'Sala 705 (Preferência TO)', 'Ginásio', 'Esteira', 'Prancha Ortostática', 'Domiciliar'];
const TIPOS = ['Avaliação', 'Atendimento', 'Reavaliação'];
const DIAS_NOMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function Agenda({ user }) {
  // --- ESTADOS ---
  const [agendamentos, setAgendamentos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  
  const [view, setView] = useState('semana'); 
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [mostrarForm, setMostrarForm] = useState(false);
  const [conflitoIA, setConflitoIA] = useState('');
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [modalSoap, setModalSoap] = useState(null);
  const [textoSoap, setTextoSoap] = useState('');

  const [novoAgendamento, setNovoAgendamento] = useState({
    pacienteId: '', pacienteNome: '', tipo: 'Atendimento',
    isLote: false, quantidadeLote: 10,
    data: new Date().toISOString().split('T')[0], hora: '08:00', 
    profissionalId: '', profissionalNome: '', registroProf: '', local: '',
    padraoSemana: [{ dia: '1', hora: '08:00', profId: '', profNome: '', regProf: '', local: '' }]
  });

  // --- CARREGAMENTO FIREBASE ---
  useEffect(() => {
    const unsubAgenda = onSnapshot(query(collection(db, "agendamentos"), orderBy("hora", "asc")), snap => {
      setAgendamentos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubPac = onSnapshot(query(collection(db, "pacientes"), orderBy("nome", "asc")), snap => {
      setPacientes(snap.docs.map(doc => ({ id: doc.id, nome: doc.data().nome })));
    });
    const unsubProf = onSnapshot(query(collection(db, "profissionais"), orderBy("nome", "asc")), snap => {
      setProfissionais(snap.docs.map(doc => ({ id: doc.id, nome: doc.data().nome, registro: doc.data().registro })));
    });
    return () => { unsubAgenda(); unsubPac(); unsubProf(); };
  }, []);

  // --- NAVEGAÇÃO DE DATAS ---
  const mudarData = (dias) => {
    const nova = new Date(dataSelecionada);
    if (view === 'mes') nova.setMonth(nova.getMonth() + dias);
    else if (view === 'semana') nova.setDate(nova.getDate() + (dias * 7));
    else nova.setDate(nova.getDate() + dias);
    setDataSelecionada(nova);
  };

  const getDiasSemana = () => {
    const dias = [];
    const inicio = new Date(dataSelecionada);
    inicio.setDate(inicio.getDate() - inicio.getDay()); 
    for (let i = 0; i < 7; i++) {
      dias.push(new Date(inicio));
      inicio.setDate(inicio.getDate() + 1);
    }
    return dias;
  };

  // --- LÓGICA CORE ---
  const verificarConflito = (dataCheck, horaCheck, profIdCheck, localCheck) => {
    return agendamentos.find(a => 
      a.data === dataCheck && a.hora === horaCheck && a.status !== 'cancelado' &&
      (a.profissionalId === profIdCheck || (a.local === localCheck && localCheck !== 'Domiciliar'))
    );
  };

  const salvarAgendamento = async (e) => {
    e.preventDefault();
    setConflitoIA('');
    if (!novoAgendamento.pacienteId) return alert("Selecione um paciente.");

    if (!novoAgendamento.isLote) {
      const conflito = verificarConflito(novoAgendamento.data, novoAgendamento.hora, novoAgendamento.profissionalId, novoAgendamento.local);
      if (conflito) {
        setCarregandoIA(true);
        const motivo = conflito.profissionalId === novoAgendamento.profissionalId ? `Profissional ${conflito.profissional || 'ocupado'} já em atendimento` : `Local ${conflito.local || 'ocupado'} já reservado`;
        const sugestao = await resolverConflitoAgenda({ data: novoAgendamento.data, hora: novoAgendamento.hora, motivo });
        setConflitoIA(`⚠️ CONFLITO: ${motivo}. \n🤖 IA Sugere: ${sugestao}`);
        setCarregandoIA(false);
        return;
      }
      await addDoc(collection(db, "agendamentos"), {
        ...novoAgendamento, status: 'pendente', dataCriacao: new Date().toISOString()
      });
      alert("Agendamento concluído!");
    } else {
      alert("Lote em desenvolvimento. Para testar o protótipo rápido, agende sessões unitárias.");
    }
    setMostrarForm(false);
  };

  const atualizarStatus = async (id, novoStatus) => await updateDoc(doc(db, "agendamentos", id), { status: novoStatus });

  const salvarEvolucaoAgenda = async () => {
    if (!textoSoap || !modalSoap) return;
    await addDoc(collection(db, "pacientes", modalSoap.pacienteId, "evolucoes"), {
      texto: textoSoap, 
      data: new Date().toISOString(), 
      profissional: user?.name || 'Profissional', 
      registro: user?.registro || '', 
      papel: user?.role || ''
    });
    await atualizarStatus(modalSoap.id, 'realizado');
    setModalSoap(null); setTextoSoap('');
    alert("Evolução salva no prontuário!");
  };

  // --- RENDERIZADORES BLINDADOS CONTRA DADOS ANTIGOS ---

  const CardAgendamento = ({ item }) => (
    <div className="p-4 flex items-center justify-between hover:bg-gray-50 border-b last:border-b-0">
      <div className="flex items-center space-x-4">
        <div className="text-xl font-black text-blue-600 w-16 text-center">{item.hora || '--:--'}</div>
        <div>
          <p className="font-bold text-gray-900">{item.paciente || 'Paciente Não Identificado'}</p>
          <p className="text-xs text-gray-500 flex items-center mt-1">
            <MapPin size={12} className="mr-1"/> {item.local || 'Sem local'} | 
            <User size={12} className="mx-1"/> {item.profissional || 'Sem profissional'}
          </p>
        </div>
      </div>
      <div className="flex space-x-2">
        {(user?.role === 'gestor_clinico' || user?.registro === item.registroProf) && (
          <button onClick={() => setModalSoap(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg border flex items-center text-xs font-bold">
            <FileText size={16} className="mr-1"/> Evoluir
          </button>
        )}
        <button onClick={() => atualizarStatus(item.id, 'realizado')} className={`p-2 rounded-lg border ${item.status === 'realizado' ? 'bg-green-100 text-green-700' : 'text-green-600'}`}><CheckCircle2 size={18}/></button>
        <button onClick={() => atualizarStatus(item.id, 'cancelado')} className={`p-2 rounded-lg border ${item.status === 'cancelado' ? 'bg-red-100 text-red-700' : 'text-red-600'}`}><Trash2 size={18}/></button>
      </div>
    </div>
  );

  const RenderDia = () => {
    const dataIso = dataSelecionada.toISOString().split('T')[0];
    const itens = agendamentos.filter(a => a.data === dataIso);
    return (
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-4 bg-slate-50 font-bold text-slate-700 border-b">Atendimentos do Dia</div>
        {itens.length === 0 ? <div className="p-8 text-center text-slate-400">Sem compromissos.</div> : 
          itens.map(item => <CardAgendamento key={item.id} item={item} />)
        }
      </div>
    );
  };

  const RenderSemana = () => {
    const dias = getDiasSemana();
    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {dias.map(dia => {
          const iso = dia.toISOString().split('T')[0];
          const itens = agendamentos.filter(a => a.data === iso);
          const eHoje = iso === new Date().toISOString().split('T')[0];
          return (
            <div key={iso} className={`flex flex-col min-h-[400px] rounded-xl border ${eHoje ? 'border-blue-500 ring-2 ring-blue-500 shadow-md' : 'bg-white shadow-sm'}`}>
              <div className={`p-3 text-center border-b rounded-t-xl ${eHoje ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600'}`}>
                <div className="text-[10px] uppercase font-bold tracking-widest">{DIAS_NOMES[dia.getDay()]}</div>
                <div className="text-2xl font-black">{dia.getDate()}</div>
              </div>
              <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                {itens.map(item => (
                  <div key={item.id} onClick={() => setModalSoap(item)} className={`p-2 border rounded-lg text-xs cursor-pointer transition-colors ${item.status === 'realizado' ? 'bg-green-50 border-green-200 opacity-70' : item.status === 'cancelado' ? 'bg-red-50 border-red-200 opacity-50' : 'bg-blue-50 border-blue-100 hover:bg-blue-100'}`}>
                    <div className="font-black text-blue-900">{item.hora || '--:--'}</div>
                    <div className="font-bold text-slate-800 truncate">{item.paciente || 'Sem Nome'}</div>
                    <div className="text-slate-500 italic mt-1 text-[10px] truncate">
                      {item.profissional ? String(item.profissional).split(' ')[0] : 'Indefinido'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const RenderMes = () => (
    <div className="bg-white p-12 rounded-xl border text-center text-slate-400 italic">Visualização Mensal em desenvolvimento...</div>
  );

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center">
            <CalendarIcon className="mr-2 text-blue-600"/> Agenda Clínica
          </h1>
          <p className="text-sm text-slate-500 capitalize">
            {dataSelecionada.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', day: view !== 'mes' ? '2-digit' : undefined })}
          </p>
        </div>

        <div className="flex items-center bg-white border rounded-lg p-1 shadow-sm">
          <button onClick={() => setView('dia')} className={`px-4 py-2 rounded-md text-xs font-bold flex items-center ${view === 'dia' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><List size={14} className="mr-2"/> Dia</button>
          <button onClick={() => setView('semana')} className={`px-4 py-2 rounded-md text-xs font-bold flex items-center ${view === 'semana' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><CalendarDays size={14} className="mr-2"/> Semana</button>
          <button onClick={() => setView('mes')} className={`px-4 py-2 rounded-md text-xs font-bold flex items-center ${view === 'mes' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutGrid size={14} className="mr-2"/> Mês</button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex border rounded-lg overflow-hidden bg-white shadow-sm">
            <button onClick={() => mudarData(-1)} className="p-2 hover:bg-slate-50 border-r text-slate-600"><ChevronLeft size={20}/></button>
            <button onClick={() => setDataSelecionada(new Date())} className="px-4 py-2 text-xs font-bold hover:bg-slate-50 text-slate-700">Hoje</button>
            <button onClick={() => mudarData(1)} className="p-2 hover:bg-slate-50 border-l text-slate-600"><ChevronRight size={20}/></button>
          </div>
          <button onClick={() => setMostrarForm(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold flex items-center shadow-lg hover:bg-blue-700 transition-colors">
            <Plus size={18} className="mr-2"/> Agendar
          </button>
        </div>
      </div>

      <div>
        {view === 'dia' && <RenderDia />}
        {view === 'semana' && <RenderSemana />}
        {view === 'mes' && <RenderMes />}
      </div>

      {/* MODAL DE AGENDAMENTO */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-xl text-slate-800">Nova Sessão</h3>
                <button onClick={() => setMostrarForm(false)} className="text-slate-400 hover:text-red-500 bg-slate-100 p-2 rounded-full"><X size={20}/></button>
             </div>
             <form onSubmit={salvarAgendamento} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <select required className="border-2 p-3 rounded-xl bg-slate-50 outline-none focus:border-blue-500" value={novoAgendamento.pacienteId} onChange={e => setNovoAgendamento({...novoAgendamento, pacienteId: e.target.value, pacienteNome: pacientes.find(p=>p.id===e.target.value)?.nome})}>
                    <option value="">Paciente...</option>
                    {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                  <select className="border-2 p-3 rounded-xl bg-slate-50 outline-none focus:border-blue-500" value={novoAgendamento.tipo} onChange={e => setNovoAgendamento({...novoAgendamento, tipo: e.target.value})}>
                    {TIPOS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <input type="date" required className="border-2 p-3 rounded-xl bg-slate-50 outline-none focus:border-blue-500 text-sm" value={novoAgendamento.data} onChange={e => setNovoAgendamento({...novoAgendamento, data: e.target.value})} />
                  <input type="time" required className="border-2 p-3 rounded-xl bg-slate-50 outline-none focus:border-blue-500 text-sm" value={novoAgendamento.hora} onChange={e => setNovoAgendamento({...novoAgendamento, hora: e.target.value})} />
                  <select required className="border-2 p-3 rounded-xl bg-slate-50 outline-none focus:border-blue-500 text-xs" value={novoAgendamento.profissionalId} onChange={e => { const prof = profissionais.find(p=>p.id===e.target.value); setNovoAgendamento({...novoAgendamento, profissionalId: prof?.id, profissionalNome: prof?.nome, registroProf: prof?.registro}); }}>
                    <option value="">Equipe...</option>
                    {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                  <select required className="border-2 p-3 rounded-xl bg-slate-50 outline-none focus:border-blue-500 text-xs" value={novoAgendamento.local} onChange={e => setNovoAgendamento({...novoAgendamento, local: e.target.value})}>
                    <option value="">Local...</option>
                    {LOCAIS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                
                {conflitoIA && (
                  <div className="p-4 bg-amber-50 border-2 border-amber-200 text-amber-800 text-sm rounded-xl font-medium flex items-start whitespace-pre-wrap">
                    <AlertTriangle className="mr-3 shrink-0" size={20}/> {conflitoIA}
                  </div>
                )}
                
                <button type="submit" disabled={carregandoIA} className="w-full bg-blue-600 text-white py-4 mt-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center">
                  {carregandoIA ? 'Consultando IA...' : 'Agendar Horário'}
                </button>
             </form>
          </div>
        </div>
      )}

      {/* MODAL SOAP */}
      {modalSoap && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-xl animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-2xl text-blue-900">Evolução Clínica</h3>
              <button onClick={() => setModalSoap(null)} className="text-slate-400 hover:text-red-500 bg-slate-100 p-2 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
              <p className="text-sm font-bold text-slate-800">Paciente: <span className="font-normal">{modalSoap.paciente || 'Não identificado'}</span></p>
              <p className="text-xs text-slate-500">Agendamento: {modalSoap.data} às {modalSoap.hora}</p>
            </div>
            
            <textarea 
              className="w-full border-2 rounded-2xl p-4 h-40 mb-6 outline-none focus:border-blue-500 bg-white resize-none" 
              placeholder="Digite o SOAP ou notas da sessão..." 
              value={textoSoap} 
              onChange={e => setTextoSoap(e.target.value)}
            />
            
            <div className="flex gap-4">
              <button onClick={() => setModalSoap(null)} className="flex-1 border-2 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={salvarEvolucaoAgenda} className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700">Assinar e Finalizar Atendimento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}