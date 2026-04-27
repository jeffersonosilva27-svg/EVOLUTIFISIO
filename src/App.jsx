import React, { useState, useEffect, Component } from 'react';
import { 
  HeartPulse, LayoutDashboard, Calendar, Users, 
  Activity, DollarSign, Settings, LogOut, Menu, 
  ShieldCheck, Loader2, Clock, CheckCircle2, AlertCircle, ArrowRight
} from 'lucide-react';

import { db } from './services/firebaseConfig';
import { collection, onSnapshot, query, where, getDocs, updateDoc, doc, addDoc, orderBy } from 'firebase/firestore';

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
        <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-6 text-center">
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

function MainApp() {
  const [user, setUser] = useState(() => {
    try {
      const salvo = localStorage.getItem('evoluti_user');
      return salvo ? JSON.parse(salvo) : null;
    } catch (e) { return null; }
  }); 

  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [navParams, setNavParams] = useState(null);
  
  const [pacientes, setPacientes] = useState([]);
  const [agendamentosGlobais, setAgendamentosGlobais] = useState([]);

  const navegarPara = (view, params = null) => {
    setNavParams(params);
    setCurrentView(view);
  };

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
        // CORREÇÃO 1: Garante que a propriedade "name" existe sempre no perfil lido!
        const docData = snap.docs[0].data();
        const userData = { id: snap.docs[0].id, name: docData.nome || docData.name || 'Equipe', ...docData };
        
        if (userData.senhaProvisoria === senha || userData.senhaReal === senha) {
          setUser(userData);
          localStorage.setItem('evoluti_user', JSON.stringify(userData));
        } else { alert("Senha incorreta."); }
      } else { alert("Usuário não encontrado."); }
    } catch (error) { alert("Erro de conexão."); }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      const unsubPac = onSnapshot(query(collection(db, "pacientes"), orderBy("nome", "asc")), (snap) => {
        setPacientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      const unsubAg = onSnapshot(collection(db, "agendamentos"), (snap) => {
        setAgendamentosGlobais(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => { unsubPac(); unsubAg(); };
    }
  }, [user]);

  const hasAccess = (roles) => user && (roles.includes('any') || roles.includes(user.role));

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Início', roles: ['any'] },
    { id: 'agenda', icon: Calendar, label: 'Agenda', roles: ['any'] },
    { id: 'pacientes', icon: Users, label: 'Pacientes', roles: ['any'] },
    { id: 'avaliacoes', icon: Activity, label: 'Escalas', roles: ['gestor_clinico', 'fisio', 'to'] },
    { id: 'financeiro', icon: DollarSign, label: 'Caixa', roles: ['gestor_clinico', 'admin_fin'] },
    { id: 'equipe', icon: Settings, label: 'Equipe', roles: ['gestor_clinico'] },
  ];

  const renderDashboard = () => {
    const hojeIso = obterDataLocalISO(new Date());
    const agora = new Date();
    const horaAtualStr = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

    let agendaHoje = agendamentosGlobais.filter(a => a.data === hojeIso && a.status !== 'cancelado');
    
    if (user.role !== 'gestor_clinico' && user.role !== 'recepcao') {
        agendaHoje = agendaHoje.filter(a => a.profissionalId === user.id);
    }

    agendaHoje.sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));

    const sessoesRealizadas = agendaHoje.filter(a => a.status === 'realizado').length;
    const sessoesPendentes = agendaHoje.filter(a => a.status === 'pendente').length;
    const totalHoje = agendaHoje.length;

    const proximos = agendaHoje.filter(a => a.status === 'pendente' && a.hora >= horaAtualStr);
    const proximoAtendimento = proximos.length > 0 ? proximos[0] : null;

    // CORREÇÃO 2: Extrator seguro de primeiro nome
    const primeiroNomeUsuario = (user?.name || user?.nome || 'Equipe').split(' ')[0];

    if (user.role === 'recepcao') {
        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">Painel da Recepção</h1>
                  <p className="text-slate-500 font-medium">Bom dia, {primeiroNomeUsuario}! Aqui está o resumo de hoje.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-600 text-white rounded-[32px] p-8 shadow-xl">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-2">Total de Agendamentos (Hoje)</p>
                        <h3 className="text-5xl font-black">{totalHoje}</h3>
                        <p className="text-xs font-bold text-blue-100 mt-4">Na clínica inteira</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Aguardando Atendimento</p>
                        <h3 className="text-4xl font-black text-slate-800">{sessoesPendentes}</h3>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Sessões Finalizadas</p>
                        <h3 className="text-4xl font-black text-slate-800">{sessoesRealizadas}</h3>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
                    <h3 className="text-lg font-black text-slate-800 mb-4">Ações Rápidas</h3>
                    <div className="flex gap-4">
                        <button onClick={() => navegarPara('agenda')} className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-colors shadow-lg">Abrir Agenda Global</button>
                        <button onClick={() => navegarPara('pacientes')} className="px-6 py-4 bg-blue-50 text-blue-700 rounded-2xl font-black text-sm hover:bg-blue-100 transition-colors">Cadastrar Paciente</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Painel Clínico</h1>
              <p className="text-slate-500 font-medium">Bem-vindo(a) à sua rotina clínica, {primeiroNomeUsuario}.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden">
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2 mb-4">
                                <Clock size={14}/> O Seu Próximo Paciente
                            </p>
                            {proximoAtendimento ? (
                                <>
                                    <h2 className="text-4xl md:text-5xl font-black mb-2">{proximoAtendimento.paciente}</h2>
                                    <p className="text-lg text-slate-300 font-medium flex flex-wrap items-center gap-3">
                                        <span className="bg-blue-600 text-white px-3 py-1 rounded-xl font-black text-sm">{proximoAtendimento.hora}</span>
                                        <span className="bg-white/10 px-3 py-1 rounded-xl font-bold text-sm text-slate-300">{proximoAtendimento.local}</span>
                                        {/* CORREÇÃO 3: Extrator seguro do nome do profissional */}
                                        {user.role === 'gestor_clinico' && <span className="text-sm font-bold text-slate-400 ml-2">com {(proximoAtendimento.profissional || proximoAtendimento.profissionalNome || 'Equipe').split(' ')[0]}</span>}
                                    </p>
                                </>
                            ) : (
                                <div>
                                    <h2 className="text-3xl font-black mb-2 text-slate-400">Nenhum paciente na fila.</h2>
                                    <p className="text-slate-500 font-medium">A sua agenda para o resto do dia está livre.</p>
                                </div>
                            )}
                        </div>
                        {proximoAtendimento && (
                            <div className="mt-8">
                                <button 
                                    onClick={() => navegarPara('pacientes', { pacienteId: proximoAtendimento.pacienteId, atualizarStatusAgendamento: proximoAtendimento.id })} 
                                    className="bg-white text-slate-900 px-6 py-3 rounded-2xl font-black text-sm hover:scale-105 transition-all flex items-center gap-2 shadow-lg w-fit"
                                >
                                    Iniciar Prontuário <ArrowRight size={16}/>
                                </button>
                            </div>
                        )}
                    </div>
                    <Activity className="absolute -right-10 -bottom-10 text-white/5 w-64 h-64" />
                </div>

                <div className="flex flex-col gap-6">
                    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex-1 flex flex-col justify-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2"><Users size={14}/> Pacientes Hoje</p>
                        <h3 className="text-4xl font-black text-slate-800">{totalHoje}</h3>
                        <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
                            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${totalHoje > 0 ? (sessoesRealizadas / totalHoje) * 100 : 0}%` }}></div>
                        </div>
                        <p className="text-xs font-bold text-slate-400 mt-2">{sessoesRealizadas} concluídos de {totalHoje}</p>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100 shadow-sm flex-1 flex flex-col justify-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-800 mb-2 flex items-center gap-2"><CheckCircle2 size={14}/> Evoluções Pendentes</p>
                        <h3 className="text-4xl font-black text-blue-700">{agendaHoje.filter(a => a.status === 'pendente' && a.hora < horaAtualStr).length}</h3>
                        <p className="text-xs font-bold text-blue-600/70 mt-2">Sessões atrasadas sem assinatura</p>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#fdfbff]">
        <div className="max-w-md w-full m3-card border border-slate-200 overflow-hidden !p-0 shadow-2xl">
          <div className="bg-[#005ac1] p-10 text-center text-white">
            <HeartPulse size={48} className="mx-auto mb-4 animate-pulse" />
            <h1 className="text-3xl font-black uppercase">EVOLUTI FISIO</h1>
          </div>
          <form onSubmit={realizarLogin} className="p-8 space-y-5">
            <input name="email" required type="email" placeholder="E-mail" className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-600 outline-none font-bold" />
            <input name="senha" required type="password" placeholder="Senha" className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-600 outline-none font-bold" />
            <button disabled={loading} className="w-full bg-[#005ac1] text-white py-4 rounded-full font-black text-lg shadow-lg">
              {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Acessar Plataforma'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-[#fdfbff]">
      
      <aside 
        onMouseEnter={() => setIsSidebarOpen(true)}
        onMouseLeave={() => setIsSidebarOpen(false)}
        className={`hidden md:flex bg-[#f3eff4] transition-all duration-500 flex-col z-50 border-r border-slate-200 ${isSidebarOpen ? 'w-48' : 'w-24'}`}
      >
        <div className="p-6 flex justify-center text-[#005ac1] shrink-0">
          <HeartPulse size={32} className="animate-pulse" />
        </div>

        <nav className="flex-1 px-2 space-y-4 mt-4 overflow-y-auto custom-scrollbar">
          {menuItems.filter(item => hasAccess(item.roles)).map((item) => (
            <button 
              key={item.id} 
              onClick={() => navegarPara(item.id)} 
              className={`w-full flex flex-col items-center justify-center p-3 rounded-2xl transition-all gap-1 ${currentView === item.id ? 'bg-[#d8e2ff] text-[#001a41]' : 'text-slate-500 hover:bg-[#ece7ed]'}`}
            >
              <item.icon size={currentView === item.id ? 28 : 24} className={currentView === item.id ? 'text-[#005ac1]' : ''} />
              <span className={`text-[10px] font-black uppercase tracking-tighter transition-opacity duration-300 ${!isSidebarOpen ? 'opacity-0 h-0' : 'opacity-100'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="p-6 text-red-400 hover:text-red-600 flex flex-col items-center gap-1">
          <LogOut size={20}/>
          {isSidebarOpen && <span className="text-[9px] font-black uppercase">Sair</span>}
        </button>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        <header className="h-16 bg-[#fdfbff]/80 backdrop-blur-md flex items-center justify-between px-6 border-b border-slate-100 shrink-0 sticky top-0 z-40">
           <span className="font-black text-blue-600 uppercase tracking-tighter md:hidden">EVOLUTI</span>
           <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                {/* CORREÇÃO 4: Mostra nome de forma segura */}
                <p className="text-xs font-black leading-none">{user?.name || user?.nome || 'Equipe'}</p>
                <p className="text-[9px] text-blue-500 font-bold uppercase mt-1">{user?.role?.replace('_', ' ')}</p>
              </div>
              {/* CORREÇÃO 5: Inicial do nome segura */}
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs capitalize">{(user?.name || user?.nome || 'U').charAt(0)}</div>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
           <div className="max-w-[1600px] mx-auto h-full">
              {currentView === 'dashboard' && renderDashboard()}
              {currentView === 'agenda' && <Agenda user={user} hasAccess={hasAccess} navegarPara={navegarPara} />}
              {currentView === 'pacientes' && <Pacientes pacientes={pacientes} hasAccess={hasAccess} user={user} navParams={navParams} />}
              {currentView === 'avaliacoes' && <Avaliacoes hasAccess={hasAccess} />}
              {currentView === 'financeiro' && <Financeiro user={user} />}
              {currentView === 'equipe' && <Equipe user={user} />}
           </div>
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 flex justify-around items-center h-20 px-2 z-[60] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
         {menuItems.filter(item => hasAccess(item.roles)).map((item) => (
            <button 
              key={item.id} 
              onClick={() => navegarPara(item.id)} 
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all ${currentView === item.id ? 'text-blue-600 scale-110' : 'text-slate-400'}`}
            >
              <div className={`p-2 rounded-xl transition-all ${currentView === item.id ? 'bg-blue-50' : ''}`}>
                <item.icon size={22} strokeWidth={currentView === item.id ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
         ))}
      </nav>
    </div>
  );
}

export default function App() { return <ErrorBoundary><MainApp /></ErrorBoundary>; }