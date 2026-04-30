import React, { useState, useEffect, useRef, Component } from 'react';
import { 
  HeartPulse, LayoutDashboard, Calendar, Users, 
  DollarSign, LogOut, ShieldCheck, Loader2, Clock, 
  CheckCircle2, ArrowRight, Lock, ChevronLeft, 
  Zap, MessageSquareShare, Award, Target, Dumbbell, Package, Plus, ShoppingCart, ChevronRight, Bot, X, FileText, AlertTriangle, ClipboardList, Building2, History, ShieldAlert, UserCog
} from 'lucide-react';

import { db } from './services/firebaseConfig';
import { collection, onSnapshot, query, where, getDocs, updateDoc, doc, addDoc, orderBy, collectionGroup, limit } from 'firebase/firestore';

import Agenda from './views/Agenda'; 
import Pacientes from './views/Pacientes';
import Financeiro from './views/Financeiro';
import Avaliacoes from './views/Avaliacoes';
import Equipe from './views/Equipe';

// CONSTANTES GLOBAIS DE CONFIGURAÇÃO (Single Source of Truth)
const SUPER_GESTOR_REGISTRO = "329099-F";
const APP_VERSION = "v1.4.8";

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

// SERVIÇO DE LOGGING PERMANENTE
export const registrarLog = async (usuario, acao, detalhes) => {
  if (!usuario) return;
  try {
    await addDoc(collection(db, "logs"), {
      usuarioNome: usuario.nome || usuario.name || 'Usuário',
      usuarioId: usuario.id,
      registro: usuario.registro || 'N/A',
      acao,
      detalhes,
      timestamp: new Date().toISOString()
    });
  } catch (e) { console.error("Erro ao gravar log:", e); }
};

const obterDataLocalISO = (data) => {
  const d = data instanceof Date ? data : new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const getMinutos = (horaStr) => {
  if (!horaStr) return 0;
  const p = horaStr.split(':');
  return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
};

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

  const isSuperGestor = user?.registro === SUPER_GESTOR_REGISTRO;

  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [navParams, setNavParams] = useState(null);
  
  const [pacientes, setPacientes] = useState([]);
  const [agendamentosGlobais, setAgendamentosGlobais] = useState([]);
  const [exerciciosGlobais, setExerciciosGlobais] = useState([]);
  const [logsSistema, setLogsSistema] = useState([]);
  const [equipeCompleta, setEquipeCompleta] = useState([]);

  const [isModalActive, setIsModalActive] = useState(false);
  const [showFaltasModal, setShowFaltasModal] = useState(false);
  const [showPerfilModal, setShowPerfilModal] = useState(false); 
  const [carouselIdx, setCarouselIdx] = useState(0);

  const [perfilEdit, setPerfilEdit] = useState({ nome: '', email: '', registro: '' });

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Início', roles: ['any'] },
    { id: 'agenda', icon: Calendar, label: 'Agenda', roles: ['any'] },
    { id: 'pacientes', icon: Users, label: 'Pacientes', roles: ['any'] },
    { id: 'avaliacoes', icon: Award, label: 'Escalas', roles: ['gestor_clinico', 'fisio', 'to'] },
    { id: 'financeiro', icon: DollarSign, label: user?.role === 'recepcao' ? 'Estoque' : 'Caixa & Estoque', roles: ['gestor_clinico', 'admin_fin', 'recepcao'] },
    { id: 'equipe', icon: ShieldCheck, label: 'Equipe', roles: ['gestor_clinico'] },
  ];

  const navegarPara = (view, params = null) => { 
    if (params?.pacienteId && user) {
        registrarLog(user, "Acesso a Prontuário", `Visualizou ficha do paciente ID: ${params.pacienteId}`);
    }
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
        const docData = snap.docs[0].data();
        const userData = { id: snap.docs[0].id, name: docData.nome || 'Equipe', ...docData };
        if (userData.senhaProvisoria === senha || userData.senhaReal === senha) {
          setUser(userData);
          sessionStorage.setItem('evoluti_user', JSON.stringify(userData));
          registrarLog(userData, "Login", "Acessou a plataforma");
        } else { alert("Senha incorreta."); }
      } else { alert("Usuário não encontrado."); }
    } catch (error) { alert("Erro de conexão."); }
    setLoading(false);
  };

  const salvarPerfilProprio = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
          const userRef = doc(db, "profissionais", user.id);
          await updateDoc(userRef, perfilEdit);
          const novoUser = { ...user, ...perfilEdit };
          setUser(novoUser);
          sessionStorage.setItem('evoluti_user', JSON.stringify(novoUser));
          registrarLog(user, "Edição de Perfil", "Atualizou seus próprios dados cadastrais");
          alert("Perfil atualizado com sucesso!");
          setShowPerfilModal(false);
      } catch (e) { alert("Erro ao atualizar perfil."); }
      setLoading(false);
  };

  const fazerLogout = () => { 
    if(user) registrarLog(user, "Logout", "Saiu do sistema");
    localStorage.clear(); sessionStorage.clear(); window.location.reload(); 
  };

  const alterarStatusGestor = async (profId, novoStatus) => {
      if (!isSuperGestor) return;
      try {
          const profRef = doc(db, "profissionais", profId);
          await updateDoc(profRef, { role: novoStatus });
          registrarLog(user, "Alteração de Privilégio", `Mudou papel do profissional ${profId} para ${novoStatus}`);
          alert("Permissão atualizada!");
      } catch (e) { alert("Erro ao atualizar."); }
  };

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

      if (isSuperGestor) {
        onSnapshot(query(collection(db, "logs"), orderBy("timestamp", "desc"), limit(50)), (snap) => {
            setLogsSistema(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        onSnapshot(collection(db, "profissionais"), (snap) => {
            setEquipeCompleta(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
      }
    }
  }, [user, isSuperGestor]);

  const hasAccess = (roles) => user && (roles.includes('any') || roles.includes(user.role));

  const renderDashboard = () => {
    const hojeIso = obterDataLocalISO(new Date());
    const minutosAtuais = new Date().getHours() * 60 + new Date().getMinutes();
    
    const minhaAgenda7Dias = agendamentosGlobais
      .filter(a => a.profissionalId === user.id && a.status !== 'cancelado' && a.status !== 'realizado')
      .sort((a, b) => a.data.localeCompare(b.data) || getMinutos(a.hora) - getMinutos(b.hora));

    const proximosPendentesMeus = minhaAgenda7Dias.filter(a => a.data > hojeIso || (a.data === hojeIso && getMinutos(a.hora) >= minutosAtuais - 30));
    const proximoAtendimento = proximosPendentesMeus[carouselIdx] || null;

    const exerciciosDaSessao = proximoAtendimento?.exerciciosPlanejados || [];
    const planoGeralPaciente = proximoAtendimento ? exerciciosGlobais.filter(e => e.pacienteId === proximoAtendimento.pacienteId).slice(0, 3) : [];
    const listaExibicao = exerciciosDaSessao.length > 0 ? exerciciosDaSessao : planoGeralPaciente;
    
    const mesAtual = hojeIso.substring(0, 7);
    const agendaMes = agendamentosGlobais.filter(a => a.data && a.data.startsWith(mesAtual));
    const faltasCriticasMes = agendaMes.filter(a => a.status === 'cancelado' && ['Cancelamento < 24h', 'Falta sem justificativa'].includes(a.motivoCancelamento));
    const taxaCritica = agendaMes.length > 0 ? ((faltasCriticasMes.length / agendaMes.length) * 100).toFixed(1) : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Painel de {user.role === 'gestor_clinico' ? 'Gestão' : 'Atendimento'}</h1>
                <p className="text-slate-500 font-medium">Bom dia, {user.nome.split(' ')[0]}. {isSuperGestor && "Super Usuário Ativo."}</p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-[#0F214A] rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden min-h-[350px] flex flex-col justify-between">
                    {proximosPendentesMeus.length > 1 && (
                        <div className="absolute right-8 top-8 flex gap-2 z-20">
                            <button onClick={() => setCarouselIdx(prev => Math.max(0, prev - 1))} className="p-2 bg-white/10 rounded-full border border-white/10 hover:bg-white/20 transition-colors"><ChevronLeft/></button>
                            <button onClick={() => setCarouselIdx(prev => Math.min(proximosPendentesMeus.length - 1, prev + 1))} className="p-2 bg-white/10 rounded-full border border-white/10 hover:bg-white/20 transition-colors"><ChevronRight/></button>
                        </div>
                    )}
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase text-[#00A1FF] mb-4 flex items-center gap-2"><Clock size={14}/> Fila Pessoal ({carouselIdx + 1}/{proximosPendentesMeus.length})</p>
                        {proximoAtendimento ? (
                            <>
                                <h2 className="text-4xl md:text-5xl font-black mb-3">{proximoAtendimento.paciente}</h2>
                                <div className="flex flex-wrap gap-3 mb-6">
                                    <span className="bg-[#00A1FF] text-white px-3 py-1.5 rounded-xl font-black text-sm">{proximoAtendimento.hora}</span>
                                    <span className="bg-white/10 px-3 py-1.5 rounded-xl font-bold text-sm border border-white/10">{proximoAtendimento.local}</span>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-[24px] p-5 backdrop-blur-sm max-w-xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                                        {exerciciosDaSessao.length > 0 ? <><Target size={14} className="text-[#FFCC00]"/> Conduta Programada</> : <><Dumbbell size={14}/> Plano de Tratamento</>}
                                    </p>
                                    <div className="space-y-2">
                                        {listaExibicao.map((ex, i) => (
                                            <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0">
                                                <span className="font-bold text-slate-200">{ex.nome}</span>
                                                <span className="text-[10px] font-black bg-white/10 px-2 py-0.5 rounded text-[#00A1FF]">{ex.series}x{ex.reps} {ex.carga}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : <h2 className="text-3xl font-black text-slate-400">Sem sessões pendentes.</h2>}
                    </div>
                    {proximoAtendimento && <button onClick={() => navegarPara('pacientes', { pacienteId: proximoAtendimento.pacienteId, atualizarStatusAgendamento: proximoAtendimento.id })} className="relative z-10 mt-8 bg-[#FFCC00] text-[#0F214A] px-10 py-4 rounded-2xl font-black text-sm w-fit flex items-center gap-3">Preparar Atendimento <ArrowRight/></button>}
                    <HeartPulse className="absolute -right-10 -bottom-10 text-white/5 w-64 h-64" />
                </div>

                <div className="flex flex-col gap-4">
                    <div onClick={() => navegarPara('agenda')} className="bg-white p-6 rounded-[32px] border shadow-sm cursor-pointer hover:border-[#00A1FF] transition-colors"><p className="text-[10px] font-black uppercase text-slate-400 mb-2">Suas Sessões Hoje</p><h3 className="text-4xl font-black text-[#0F214A]">{agendamentosGlobais.filter(a => a.profissionalId === user.id && a.data === hojeIso && a.status !== 'cancelado').length}</h3></div>
                    <div onClick={() => navegarPara('pacientes')} className="bg-blue-50 p-6 rounded-[32px] border border-blue-100 shadow-sm cursor-pointer hover:bg-blue-100 transition-colors"><p className="text-[10px] font-black uppercase text-[#00A1FF] mb-2">Pendências SOAP</p><h3 className="text-4xl font-black text-[#00A1FF]">{agendamentosGlobais.filter(a => a.profissionalId === user.id && a.data <= hojeIso && a.status === 'pendente').length}</h3></div>
                </div>
            </div>

            {hasAccess(['gestor_clinico']) && (
                <div className="pt-8 border-t space-y-6">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><LayoutDashboard className="text-blue-600"/> Visão de Gestão</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="bg-slate-900 text-white rounded-[24px] p-6"><p className="text-[10px] font-black uppercase text-slate-400">Total Clínica Hoje</p><h3 className="text-3xl font-black">{agendamentosGlobais.filter(a => a.data === hojeIso && a.status !== 'cancelado').length}</h3></div>
                        <div onClick={() => setShowFaltasModal(true)} className="cursor-pointer bg-red-50 text-red-600 rounded-[24px] p-6 border border-red-200"><p className="text-[10px] font-black uppercase">Faltas Críticas (Mês)</p><h3 className="text-3xl font-black">{taxaCritica}%</h3></div>
                        <div onClick={() => navegarPara('financeiro')} className="cursor-pointer bg-green-50 text-green-700 rounded-[24px] p-6 border border-green-200"><p className="text-[10px] font-black uppercase">Receitas Hoje</p><h3 className="text-3xl font-black">{agendamentosGlobais.filter(a => a.data === hojeIso && a.status === 'realizado').length}</h3></div>
                    </div>
                </div>
            )}

            {isSuperGestor && (
                <div className="pt-8 border-t grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-10">
                    <div className="bg-white border-2 border-blue-100 rounded-[32px] p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-black text-slate-800 flex items-center gap-2"><ShieldAlert className="text-[#00A1FF]"/> Controle de Privilégios</h3>
                            <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-2 py-1 rounded">MASTER</span>
                        </div>
                        <div className="space-y-3 overflow-y-auto max-h-60 custom-scrollbar pr-2">
                            {equipeCompleta.filter(p => p.registro !== SUPER_GESTOR_REGISTRO).map(prof => (
                                <div key={prof.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div><p className="text-xs font-black text-slate-800">{prof.nome}</p><p className="text-[9px] font-bold text-slate-400 uppercase">{prof.role}</p></div>
                                    <select className="text-[10px] font-black bg-white border border-slate-200 p-1.5 rounded-lg outline-none" value={prof.role} onChange={(e) => alterarStatusGestor(prof.id, e.target.value)}>
                                        <option value="fisio">Fisioterapeuta</option><option value="to">Ter. Ocupacional</option><option value="recepcao">Recepção</option><option value="gestor_clinico">Gestor Clínico</option>
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#0F214A] text-white rounded-[32px] p-8 shadow-2xl">
                        <div className="flex items-center justify-between mb-6"><h3 className="font-black flex items-center gap-2"><History className="text-[#00A1FF]"/> Logs de Auditoria</h3></div>
                        <div className="space-y-4 overflow-y-auto max-h-60 custom-scrollbar pr-2">
                            {logsSistema.map(log => (
                                <div key={log.id} className="text-[10px] border-b border-white/5 pb-2">
                                    <div className="flex justify-between font-black text-[#00A1FF] mb-1"><span>{log.usuarioNome?.toUpperCase()}</span><span className="text-white/30">{new Date(log.timestamp).toLocaleString('pt-BR')}</span></div>
                                    <p className="font-bold text-slate-300">{log.acao}: <span className="text-slate-400 font-medium">{log.detalhes}</span></p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  };

  if (!user) return (
    <div className="min-h-screen flex bg-white font-sans animate-in fade-in duration-500">
      <div className="hidden lg:flex flex-col justify-center w-1/2 bg-[#0F214A] p-16 text-white relative overflow-hidden">
         <div className="relative z-10 max-w-lg animate-in slide-in-from-left duration-700">
            <div className="flex items-center gap-3 mb-8">
               <HeartPulse size={48} className="text-[#00A1FF] animate-pulse" />
               <span className="text-3xl font-black tracking-tight">EVOLUTI</span>
            </div>
            <h1 className="text-5xl font-black leading-tight mb-6">Gestão Clínica Inteligente.</h1>
            <p className="text-lg text-blue-200 font-medium leading-relaxed">
               Acesse o sistema para coordenar seus atendimentos e gerenciar o fluxo da clínica com precisão e segurança de dados.
            </p>
         </div>
         <div className="absolute top-1/4 right-10 w-48 h-48 opacity-90 hover:scale-105 transition-all duration-700 z-20 flex items-center justify-center bg-[#00A1FF] rounded-full shadow-[0_0_40px_rgba(0,161,255,0.4)] border-4 border-white animate-bounce"><Bot size={80} className="text-white"/></div>
         <div className="absolute bottom-0 left-10 w-[300px] h-[300px] bg-[#00A1FF] rounded-full blur-[150px] opacity-20"></div>
      </div>
      
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-20 relative bg-white">
         <div className="absolute top-8 left-8 lg:hidden flex items-center gap-2 text-[#0F214A]">
            <HeartPulse size={28} className="text-[#00A1FF]" />
            <span className="text-xl font-black tracking-tight">EVOLUTI</span>
         </div>
         
         <div className="w-full max-w-md animate-in slide-in-from-bottom-8 duration-700 fade-in delay-150">
           <div className="mb-10 text-center lg:text-left">
              <h2 className="text-3xl font-black text-slate-900">Bem-vindo de volta!</h2>
              <p className="text-slate-500 font-medium mt-2">Insira suas credenciais para acessar o ambiente restrito.</p>
           </div>
           
           <form onSubmit={realizarLogin} className="space-y-5">
             <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-2">E-mail Profissional</label>
                <input name="email" required type="email" placeholder="nome@clinica.com" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00A1FF] focus:bg-white font-bold text-slate-700 transition-all shadow-sm" />
             </div>
             <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-2">Senha</label>
                <input name="senha" required type="password" placeholder="••••••••" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00A1FF] focus:bg-white font-bold text-slate-700 transition-all shadow-sm" />
             </div>
             <button disabled={loading} className="w-full bg-[#0F214A] text-white py-4 rounded-2xl font-black text-lg hover:bg-[#00A1FF] transition-all shadow-lg hover:shadow-blue-200 mt-4 flex items-center justify-center gap-2 group">
                {loading ? <Loader2 className="animate-spin" /> : <>Acessar Plataforma <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/></>}
             </button>
           </form>

           <div className="mt-8 text-center lg:text-left text-[10px] font-black text-slate-300 uppercase tracking-widest">
               Evoluti Fisio {APP_VERSION}
           </div>
         </div>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row overflow-hidden bg-[#fdfbff]">
      <aside className={`hidden md:flex bg-[#f3eff4] transition-all duration-500 flex-col z-50 border-r border-slate-200 ${isSidebarOpen ? 'w-48' : 'w-24'}`} onMouseEnter={() => setIsSidebarOpen(true)} onMouseLeave={() => setIsSidebarOpen(false)}>
        <div className="p-6 flex justify-center text-[#00A1FF]"><HeartPulse size={32} /></div>
        <nav className="flex-1 px-2 space-y-4 mt-4">
          {menuItems.filter(item => hasAccess(item.roles)).map((item) => (
            <button key={item.id} onClick={() => navegarPara(item.id)} className={`w-full flex flex-col items-center p-3 rounded-2xl transition-all gap-1 ${currentView === item.id ? 'bg-[#e5f5ff] text-[#00A1FF]' : 'text-slate-500 hover:bg-[#ece7ed]'}`}>
              <item.icon size={24} /><span className={`text-[10px] font-black uppercase transition-opacity ${!isSidebarOpen ? 'opacity-0 h-0' : 'opacity-100'}`}>{item.label}</span>
            </button>
          ))}
        </nav>
        
        {/* BOTÃO DE EDIÇÃO DE PERFIL PRÓPRIO REPOSICIONADO PARA PREENCHER ESPAÇO */}
        <button onClick={() => { setPerfilEdit({ nome: user.nome, email: user.email, registro: user.registro }); setShowPerfilModal(true); }} className="p-4 flex flex-col items-center gap-1 text-slate-500 hover:text-[#00A1FF] transition-colors mt-auto">
            <UserCog size={22}/>
            <span className={`text-[8px] font-black uppercase ${!isSidebarOpen ? 'hidden' : 'block'}`}>Meu Perfil</span>
        </button>

        <div className="pb-4 pt-2 text-center text-[9px] font-black text-slate-300 tracking-widest whitespace-nowrap overflow-hidden">
            <span className={!isSidebarOpen ? 'hidden' : 'inline'}>EVOLUTI </span>{APP_VERSION}
        </div>
      </aside>
      
      <main className="flex-1 h-full overflow-y-auto relative">
        <header className="h-16 bg-[#fdfbff]/80 backdrop-blur-md flex items-center justify-between px-6 border-b border-slate-100 sticky top-0 z-40">
           <span className="font-black text-[#00A1FF] md:hidden tracking-tighter">EVOLUTI</span>
           <div className="flex items-center gap-3 ml-auto">
              <div className="text-right hidden sm:block">
                  <p className="text-xs font-black text-[#0F214A] leading-none">{user.nome}</p>
                  <p className="text-[9px] text-[#00A1FF] font-bold uppercase mt-1">{isSuperGestor ? 'Super Gestor' : user.role.replace('_', ' ')}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#0F214A] text-white flex items-center justify-center font-black text-xs uppercase cursor-pointer hover:scale-105 transition-transform" onClick={() => { setPerfilEdit({ nome: user.nome, email: user.email, registro: user.registro }); setShowPerfilModal(true); }} title="Editar Meu Perfil">
                  {user.nome.charAt(0)}
              </div>
              
              {/* NOVO POSICIONAMENTO DO BOTÃO LOGOUT */}
              <button 
                onClick={fazerLogout} 
                className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-white hover:bg-red-500 rounded-full transition-colors ml-1" 
                title="Sair do Sistema"
              >
                  <LogOut size={16}/>
              </button>
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

      {showPerfilModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
              <div className="bg-white p-8 rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-black text-xl text-[#0F214A] flex items-center gap-2"><UserCog className="text-[#00A1FF]"/> Meus Dados</h3>
                      <button onClick={() => setShowPerfilModal(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X/></button>
                  </div>
                  <form onSubmit={salvarPerfilProprio} className="space-y-4">
                      <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome de Exibição</label><input required className="w-full p-3 bg-slate-50 border rounded-xl outline-none font-bold" value={perfilEdit.nome} onChange={e => setPerfilEdit({...perfilEdit, nome: e.target.value})} /></div>
                      <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1">E-mail Profissional</label><input required type="email" className="w-full p-3 bg-slate-50 border rounded-xl outline-none font-bold" value={perfilEdit.email} onChange={e => setPerfilEdit({...perfilEdit, email: e.target.value})} /></div>
                      <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Registro Profissional (CREFITO)</label><input required className="w-full p-3 bg-slate-50 border rounded-xl outline-none font-bold" value={perfilEdit.registro} onChange={e => setPerfilEdit({...perfilEdit, registro: e.target.value})} /></div>
                      
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4"><p className="text-[10px] font-bold text-blue-600 flex items-center gap-1"><ShieldCheck size={12}/> Suas permissões são geridas pelo Sistema Evoluti.</p></div>
                      
                      <button type="submit" disabled={loading} className="w-full bg-[#0F214A] text-white py-4 rounded-2xl font-black hover:bg-[#00A1FF] transition-all flex justify-center shadow-lg">
                          {loading ? <Loader2 className="animate-spin"/> : 'Salvar Alterações'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      <nav className={`md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-16 z-[50] ${isModalActive ? 'translate-y-full' : ''}`}>
         {menuItems.filter(item => hasAccess(item.roles)).map((item) => (
            <button key={item.id} onClick={() => navegarPara(item.id)} className={`flex flex-col items-center gap-1 flex-1 ${currentView === item.id ? 'text-[#00A1FF]' : 'text-slate-400'}`}><item.icon size={20} /><span className="text-[9px] font-bold">{item.label}</span></button>
         ))}
      </nav>
    </div>
  );
}

export default function App() { return <ErrorBoundary><MainApp /></ErrorBoundary>; }