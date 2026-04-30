import React, { useState, useEffect, useRef, Component } from 'react';
import { 
  HeartPulse, LayoutDashboard, Calendar, Users, 
  DollarSign, LogOut, ShieldCheck, Loader2, Clock, 
  CheckCircle2, ArrowRight, Lock, ChevronLeft, 
  Zap, MessageSquareShare, Award, Target, Dumbbell, Package, Plus, ShoppingCart, ChevronRight, Bot, X, FileText, AlertTriangle, ClipboardList, Building2
} from 'lucide-react';

import { db } from './services/firebaseConfig';
import { collection, onSnapshot, query, where, getDocs, updateDoc, doc, addDoc, orderBy, collectionGroup } from 'firebase/firestore';

import Agenda from './views/Agenda'; 
import Pacientes from './views/Pacientes';
import Financeiro from './views/Financeiro';
import Avaliacoes from './views/Avaliacoes';
import Equipe from './views/Equipe';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <h1 className="text-3xl font-black text-red-600 mb-2">Erro de Interface</h1>
          <pre className="bg-white p-6 rounded-2xl border border-red-200 text-red-800 text-xs mb-4">{this.state.error?.toString()}</pre>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="bg-red-600 text-white px-8 py-3 rounded-xl font-bold">Limpar e Recarregar</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const obterDataLocalISO = (data) => {
  const d = data instanceof Date ? data : new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const getMinutos = (horaStr) => {
  if (!horaStr) return 0;
  const p = horaStr.split(':');
  return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
};

// MOTOR MULTI-TENANT GLOBAL
export const temAcessoClinica = (clinicasDoUsuario, clinicaDoItem) => {
  if (!clinicasDoUsuario || !Array.isArray(clinicasDoUsuario) || clinicasDoUsuario.length === 0) return false;
  if (!clinicaDoItem) return true; 
  if (Array.isArray(clinicaDoItem)) {
      return clinicaDoItem.some(c => clinicasDoUsuario.includes(c));
  }
  return clinicasDoUsuario.includes(clinicaDoItem);
};

function MainApp() {
  const [user, setUser] = useState(() => {
    try {
      let salvo = sessionStorage.getItem('evoluti_user');
      if (salvo) return JSON.parse(salvo);
      salvo = localStorage.getItem('evoluti_user');
      if (salvo) return JSON.parse(salvo);
      return null;
    } catch (e) { return null; }
  }); 

  const [authMode, setAuthMode] = useState('login'); 
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [navParams, setNavParams] = useState(null);
  
  const [pacientes, setPacientes] = useState([]);
  const [agendamentosGlobais, setAgendamentosGlobais] = useState([]);
  const [exerciciosGlobais, setExerciciosGlobais] = useState([]);

  const [isModalActive, setIsModalActive] = useState(false);
  const [showFaltasModal, setShowFaltasModal] = useState(false);
  const [carouselIdx, setCarouselIdx] = useState(0);

  const isFirstLoad = useRef(true);

  const navegarPara = (view, params = null) => { setNavParams(params); setCurrentView(view); };

  const realizarLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.target);
    const email = form.get('email');
    const senha = form.get('senha');
    try {
      const q = query(collection(db, "profissionais"), where("email", "==", email));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docData = snap.docs[0].data();
        const userData = { id: snap.docs[0].id, name: docData.nome || 'Equipe', ...docData };
        if (userData.senhaProvisoria === senha || userData.senhaReal === senha) {
          setUser(userData);
          sessionStorage.setItem('evoluti_user', JSON.stringify(userData));
        } else { alert("Senha incorreta."); }
      } else { alert("Usuário não encontrado."); }
    } catch (error) { alert("Erro de conexão."); }
    setLoading(false);
  };

  const fazerLogout = () => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); };

  useEffect(() => {
    if (user) {
      onSnapshot(query(collection(db, "pacientes"), orderBy("nome", "asc")), (snap) => {
          setPacientes(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => temAcessoClinica(user.clinicasAcesso, p.clinicaVinculo)));
      });
      onSnapshot(collection(db, "agendamentos"), (snap) => {
        setAgendamentosGlobais(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(a => temAcessoClinica(user.clinicasAcesso, a.clinicaVinculo)));
      });
      onSnapshot(collectionGroup(db, "plano_tratamento"), (snap) => {
        setExerciciosGlobais(snap.docs.map(d => ({ id: d.id, pacienteId: d.ref.parent.parent.id, ...d.data() })));
      });
    }
  }, [user]);

  const hasAccess = (roles) => user && (roles.includes('any') || roles.includes(user.role));

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Início', roles: ['any'] },
    { id: 'agenda', icon: Calendar, label: 'Agenda', roles: ['any'] },
    { id: 'pacientes', icon: Users, label: 'Pacientes', roles: ['any'] },
    { id: 'avaliacoes', icon: Award, label: 'Escalas', roles: ['gestor_clinico', 'fisio', 'to'] },
    { id: 'financeiro', icon: DollarSign, label: user?.role === 'recepcao' ? 'Estoque' : 'Caixa & Estoque', roles: ['gestor_clinico', 'admin_fin', 'recepcao'] },
    { id: 'equipe', icon: ShieldCheck, label: 'Equipe', roles: ['gestor_clinico'] },
  ];

  const renderDashboard = () => {
    const hojeIso = obterDataLocalISO(new Date());
    const minutosAtuais = new Date().getHours() * 60 + new Date().getMinutes();
    
    // FILTRO DE ATENDIMENTOS: Remove cancelados e foca nos próximos 7 dias
    const minhaAgenda7Dias = agendamentosGlobais
      .filter(a => a.profissionalId === user.id && a.status !== 'cancelado' && a.status !== 'realizado')
      .sort((a, b) => a.data.localeCompare(b.data) || getMinutos(a.hora) - getMinutos(b.hora));

    const proximosPendentesMeus = minhaAgenda7Dias.filter(a => a.data > hojeIso || (a.data === hojeIso && getMinutos(a.hora) >= minutosAtuais - 30));
    
    const proximoAtendimento = proximosPendentesMeus[carouselIdx] || null;
    const exerciciosDaSessao = proximoAtendimento?.exerciciosPlanejados || [];
    const planoGeralPaciente = proximoAtendimento ? exerciciosGlobais.filter(e => e.pacienteId === proximoAtendimento.pacienteId).slice(0, 3) : [];
    const listaExibicao = exerciciosDaSessao.length > 0 ? exerciciosDaSessao : planoGeralPaciente;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Olá, {user.nome.split(' ')[0]}</h1>
                <p className="text-slate-500 font-medium">Você tem {proximosPendentesMeus.length} atendimentos na fila.</p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* CARD DE ATENDIMENTO PRINCIPAL */}
                <div className="xl:col-span-2 bg-[#0F214A] rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[350px]">
                    
                    {/* NAVEGAÇÃO DO CAROUSEL */}
                    {proximosPendentesMeus.length > 1 && (
                        <div className="absolute right-8 top-8 flex gap-2 z-20">
                            <button onClick={() => setCarouselIdx(prev => Math.max(0, prev - 1))} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors border border-white/10"><ChevronLeft size={20}/></button>
                            <button onClick={() => setCarouselIdx(prev => Math.min(proximosPendentesMeus.length - 1, prev + 1))} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors border border-white/10"><ChevronRight size={20}/></button>
                        </div>
                    )}

                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#00A1FF] mb-4 flex items-center gap-2">
                           <Clock size={14}/> Fila Pessoal ({carouselIdx + 1} de {proximosPendentesMeus.length})
                        </p>
                        
                        {proximoAtendimento ? (
                            <>
                                <h2 className="text-4xl md:text-5xl font-black truncate mb-3">{proximoAtendimento.paciente}</h2>
                                <div className="flex flex-wrap gap-3 mb-6">
                                    <span className="bg-[#00A1FF] text-white px-3 py-1.5 rounded-xl font-black text-sm">{proximoAtendimento.hora}</span>
                                    <span className="bg-white/10 px-3 py-1.5 rounded-xl font-bold text-sm border border-white/10">{proximoAtendimento.local}</span>
                                    <span className="bg-white/5 px-3 py-1.5 rounded-xl font-bold text-xs text-slate-400">{new Date(proximoAtendimento.data).toLocaleDateString('pt-BR')}</span>
                                </div>

                                {/* BLOCO DE PLANEJAMENTO / CONDUTA NO CARD */}
                                <div className="bg-white/5 border border-white/10 rounded-[24px] p-5 backdrop-blur-sm max-w-xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                                        {exerciciosDaSessao.length > 0 ? <><Target size={14} className="text-[#FFCC00]"/> Conduta Modulada</> : <><Dumbbell size={14}/> Plano de Tratamento</>}
                                    </p>
                                    <div className="space-y-2">
                                        {listaExibicao.map((ex, i) => (
                                            <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0">
                                                <span className="font-bold text-slate-200">{ex.nome}</span>
                                                <span className="text-[10px] font-black bg-white/10 px-2 py-0.5 rounded text-[#00A1FF]">{ex.series}x{ex.reps} {ex.carga}</span>
                                            </div>
                                        ))}
                                        {listaExibicao.length === 0 && <p className="text-xs font-bold text-slate-500 italic">Nenhuma prescrição ativa.</p>}
                                    </div>
                                </div>
                            </>
                        ) : <h2 className="text-3xl font-black text-slate-400">Fim da Fila por hoje!</h2>}
                    </div>

                    {proximoAtendimento && (
                        <button 
                            onClick={() => navegarPara('pacientes', { pacienteId: proximoAtendimento.pacienteId, atualizarStatusAgendamento: proximoAtendimento.id })} 
                            className="relative z-10 mt-8 bg-[#FFCC00] text-[#0F214A] px-10 py-4 rounded-2xl font-black text-sm w-fit flex items-center gap-3 hover:scale-105 transition-transform shadow-xl shadow-yellow-500/20"
                        >
                            Preparar Atendimento <ArrowRight size={18}/>
                        </button>
                    )}
                    <HeartPulse className="absolute -right-10 -bottom-10 text-white/5 w-64 h-64" />
                </div>

                {/* INDICADORES LATERAIS */}
                <div className="flex flex-col gap-4">
                    <div onClick={() => navegarPara('agenda')} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm cursor-pointer hover:border-[#00A1FF] transition-all">
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Suas Sessões Hoje</p>
                        <h3 className="text-4xl font-black text-[#0F214A]">{agendamentosGlobais.filter(a => a.profissionalId === user.id && a.data === hojeIso && a.status !== 'cancelado').length}</h3>
                    </div>
                    <div onClick={() => navegarPara('pacientes')} className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-[32px] border border-blue-100 shadow-sm cursor-pointer">
                        <p className="text-[10px] font-black uppercase text-[#00A1FF] mb-2">Evoluções Pendentes</p>
                        <h3 className="text-4xl font-black text-[#00A1FF]">
                            {agendamentosGlobais.filter(a => a.profissionalId === user.id && a.data <= hojeIso && a.status === 'pendente').length}
                        </h3>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F214A] p-6">
        <div className="bg-white p-8 rounded-[40px] w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-2 mb-8"><HeartPulse className="text-[#00A1FF]"/><span className="font-black text-xl tracking-tight">EVOLUTI</span></div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Acesso Restrito</h2>
            <p className="text-slate-500 text-sm mb-6">Identifique-se para gerir a sua clínica.</p>
            <form onSubmit={realizarLogin} className="space-y-4">
                <input name="email" required type="email" placeholder="E-mail" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:border-[#00A1FF] font-bold" />
                <input name="senha" required type="password" placeholder="Senha" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:border-[#00A1FF] font-bold" />
                <button className="w-full bg-[#0F214A] text-white py-4 rounded-2xl font-black hover:bg-[#00A1FF] transition-all">Acessar Sistema</button>
            </form>
        </div>
    </div>
  );

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row overflow-hidden bg-[#fdfbff]">
      <aside className={`hidden md:flex bg-[#f3eff4] transition-all duration-500 flex-col z-50 border-r border-slate-200 ${isSidebarOpen ? 'w-48' : 'w-24'}`} onMouseEnter={() => setIsSidebarOpen(true)} onMouseLeave={() => setIsSidebarOpen(false)}>
        <div className="p-6 flex justify-center text-[#00A1FF]"><HeartPulse size={32} /></div>
        <nav className="flex-1 px-2 space-y-4 mt-4">
          {menuItems.filter(item => hasAccess(item.roles)).map((item) => (
            <button key={item.id} onClick={() => navegarPara(item.id)} className={`w-full flex flex-col items-center p-3 rounded-2xl transition-all gap-1 ${currentView === item.id ? 'bg-[#e5f5ff] text-[#00A1FF]' : 'text-slate-500'}`}>
              <item.icon size={24} /><span className={`text-[10px] font-black uppercase transition-opacity ${!isSidebarOpen ? 'opacity-0' : 'opacity-100'}`}>{item.label}</span>
            </button>
          ))}
        </nav>
        <button onClick={fazerLogout} className="p-6 text-red-400 hover:text-red-600"><LogOut size={20}/></button>
      </aside>
      
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative">
        <header className="h-16 bg-[#fdfbff]/80 backdrop-blur-md flex items-center justify-between px-6 border-b border-slate-100 sticky top-0 z-40">
           <span className="font-black text-[#00A1FF] md:hidden">EVOLUTI</span>
           <div className="flex items-center gap-3 ml-auto">
              <div className="text-right hidden sm:block"><p className="text-xs font-black text-[#0F214A]">{user?.name}</p><p className="text-[9px] text-[#00A1FF] font-bold uppercase">{user?.role?.replace('_', ' ')}</p></div>
              <div className="w-8 h-8 rounded-full bg-[#0F214A] text-white flex items-center justify-center font-black text-xs">{(user?.name || 'U').charAt(0)}</div>
           </div>
        </header>
        <div className="p-4 md:p-8 flex flex-col max-w-[1600px] mx-auto w-full">
           {currentView === 'dashboard' ? renderDashboard() : null}
           {currentView === 'agenda' && <Agenda user={user} hasAccess={hasAccess} navegarPara={navegarPara} setModalActive={setIsModalActive} />}
           {currentView === 'pacientes' && <Pacientes pacientes={pacientes} hasAccess={hasAccess} user={user} navParams={navParams} setModalActive={setIsModalActive} />}
           {currentView === 'avaliacoes' && <Avaliacoes hasAccess={hasAccess} />}
           {currentView === 'financeiro' && <Financeiro user={user} hasAccess={hasAccess} />}
           {currentView === 'equipe' && <Equipe user={user} />}
        </div>
      </main>

      <nav className={`md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-16 z-[50] ${isModalActive ? 'translate-y-full' : ''}`}>
         {menuItems.filter(item => hasAccess(item.roles)).map((item) => (
            <button key={item.id} onClick={() => navegarPara(item.id)} className={`flex flex-col items-center gap-1 flex-1 ${currentView === item.id ? 'text-[#00A1FF]' : 'text-slate-400'}`}><item.icon size={20} /><span className="text-[9px] font-bold">{item.label}</span></button>
         ))}
      </nav>
    </div>
  );
}

export default function App() { return <ErrorBoundary><MainApp /></ErrorBoundary>; }