import React, { useState, useEffect, Component } from 'react';
import { 
  HeartPulse, LayoutDashboard, Calendar, Users, 
  DollarSign, LogOut, ShieldCheck, Loader2, Clock, 
  CheckCircle2, ArrowRight, Lock, ChevronLeft, 
  ListChecks, Zap, MessageSquareShare, Award, Target, Dumbbell
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

const TUTORIAL_CHAPTERS = [
  { id: 'start', title: 'Boas-vindas', color: 'bg-[#FFCC00]', textColor: 'text-[#0F214A]' },
  { id: 'basico', title: 'Fase 1: O Básico', color: 'bg-[#00A1FF]', textColor: 'text-white' },
  { id: 'fisio', title: 'Fase 2: Ferramentas do Fisio', color: 'bg-[#0F214A]', textColor: 'text-white' },
  { id: 'money', title: 'Fase 3: Financeiro e Estoque', color: 'bg-green-500', textColor: 'text-white' },
  { id: 'end', title: 'Tudo Pronto!', color: 'bg-[#00A1FF]', textColor: 'text-white' }
];

const TUTORIAL_STEPS = [
  { chapterId: 'start', titulo: "Olá! Eu sou o Choquito ⚡", texto: "Bem-vindo ao Evoluti Fisio! O seu novo braço direito na gestão clínica.", view: 'dashboard', botao: "Começar Tour Guiada" },
  { chapterId: 'basico', titulo: "O Painel Inicial", texto: "Aqui no Início, você tem uma visão rápida do seu próximo paciente e das evoluções pendentes.", view: 'dashboard', botao: "Entendi" },
  { chapterId: 'basico', titulo: "A Agenda Inteligente", texto: "Nesta aba, você agenda sessões simples ou em lotes com proteção de janela dupla.", view: 'agenda', botao: "Ir para Clínico" },
  { chapterId: 'fisio', titulo: "Prontuário (SOAP)", texto: "A aba Pacientes é o coração do atendimento. Clique em um paciente para abrir o prontuário e monitorar a dor (EVA).", view: 'pacientes', botao: "Ver Planos" },
  { chapterId: 'fisio', titulo: "Prescrição de Exercícios", texto: "Ainda na ficha do paciente, tem o 'Plano de Tratamento' com exercícios e TMI.", view: 'pacientes', botao: "Conhecer o Caixa" },
  { chapterId: 'money', titulo: "Caixa e Estoque", texto: "Na guia de Caixa & Estoque você fatura as sessões e controla os materiais em abas separadas!", view: 'financeiro', botao: "Finalizar Tour" },
  { chapterId: 'end', titulo: "É Tudo Seu! 🚀", texto: "O sistema está pronto para receber toda a sua energia.", view: 'dashboard', botao: "Começar a Usar Agora" }
];

function MainApp() {
  const [user, setUser] = useState(() => {
    try {
      let salvo = sessionStorage.getItem('evoluti_user');
      if (salvo) return JSON.parse(salvo);
      salvo = localStorage.getItem('evoluti_user');
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) { localStorage.removeItem('evoluti_user'); return null; }
        return parsed; 
      }
      return null;
    } catch (e) { return null; }
  }); 

  const [authMode, setAuthMode] = useState('login'); 
  const [lembrarMe, setLembrarMe] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [cadNome, setCadNome] = useState('');
  const [cadProfissao, setCadProfissao] = useState('');
  const [cadRegistro, setCadRegistro] = useState('');
  const [cadEmail, setCadEmail] = useState('');
  const [cadSenha, setCadSenha] = useState('');

  const [currentView, setCurrentView] = useState('dashboard'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [navParams, setNavParams] = useState(null);
  
  const [pacientes, setPacientes] = useState([]);
  const [agendamentosGlobais, setAgendamentosGlobais] = useState([]);
  const [exerciciosGlobais, setExerciciosGlobais] = useState([]);

  const [tutorialStep, setTutorialStep] = useState(-1);

  const navegarPara = (view, params = null) => { setNavParams(params); setCurrentView(view); };
  const iniciarTutorial = () => { setTutorialStep(0); setCurrentView('dashboard'); };
  const avancarTutorial = () => {
    const nextStep = tutorialStep + 1;
    if (nextStep < TUTORIAL_STEPS.length) { setTutorialStep(nextStep); setCurrentView(TUTORIAL_STEPS[nextStep].view); } 
    else { setTutorialStep(-1); localStorage.setItem('evoluti_tutorial_visto', 'sim'); setCurrentView('dashboard'); }
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
        const userData = { id: snap.docs[0].id, name: docData.nome || docData.name || 'Equipe', ...docData };
        if (userData.status === 'pendente') { alert("Cadastro em análise pelo gestor."); } 
        else if (userData.senhaProvisoria === senha || userData.senhaReal === senha) {
          setUser(userData);
          if (lembrarMe) { const expireTime = Date.now() + (30 * 60 * 1000); localStorage.setItem('evoluti_user', JSON.stringify({...userData, expiresAt: expireTime})); } 
          else { sessionStorage.setItem('evoluti_user', JSON.stringify(userData)); }
          if (!localStorage.getItem('evoluti_tutorial_visto')) { setTimeout(() => setTutorialStep(0), 1000); }
        } else { alert("Senha incorreta."); }
      } else { alert("Usuário não encontrado."); }
    } catch (error) { alert("Erro de conexão."); }
    setLoading(false);
  };

  const solicitarCadastro = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const q = query(collection(db, "profissionais"), where("email", "==", cadEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        alert("Este e-mail já possui um pedido de acesso ativo.");
        setLoading(false); return;
      }
      await addDoc(collection(db, "profissionais"), {
        nome: cadNome, categoriaBase: cadProfissao, registro: cadRegistro, email: cadEmail,
        senhaProvisoria: cadSenha, precisaTrocarSenha: true, status: 'pendente', role: 'pendente', dataCadastro: new Date().toISOString()
      });
      alert("Sucesso! O seu pedido de acesso foi enviado ao Gestor Clínico.");
      setAuthMode('login');
      setCadNome(''); setCadProfissao(''); setCadRegistro(''); setCadEmail(''); setCadSenha('');
    } catch (error) { alert("Erro ao enviar pedido."); }
    setLoading(false);
  };

  const fazerLogout = () => { localStorage.removeItem('evoluti_user'); sessionStorage.removeItem('evoluti_user'); window.location.reload(); };

  useEffect(() => {
    if (user) {
      const unsubPac = onSnapshot(query(collection(db, "pacientes"), orderBy("nome", "asc")), (snap) => setPacientes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubAg = onSnapshot(collection(db, "agendamentos"), (snap) => setAgendamentosGlobais(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubEx = onSnapshot(collectionGroup(db, "plano_tratamento"), (snap) => {
        const exs = snap.docs.map(d => ({ id: d.id, pacienteId: d.ref.parent.parent.id, ...d.data() }));
        exs.sort((a,b) => new Date(b.dataInclusao || 0) - new Date(a.dataInclusao || 0));
        setExerciciosGlobais(exs);
      });
      return () => { unsubPac(); unsubAg(); unsubEx(); };
    }
  }, [user]);

  const hasAccess = (roles) => user && (roles.includes('any') || roles.includes(user.role));

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Início', roles: ['any'] },
    { id: 'agenda', icon: Calendar, label: 'Agenda', roles: ['any'] },
    { id: 'pacientes', icon: Users, label: 'Pacientes', roles: ['any'] },
    { id: 'avaliacoes', icon: Award, label: 'Escalas', roles: ['gestor_clinico', 'fisio', 'to'] },
    { id: 'financeiro', icon: DollarSign, label: 'Caixa & Estoque', roles: ['gestor_clinico', 'admin_fin'] },
    { id: 'equipe', icon: ShieldCheck, label: 'Equipe', roles: ['gestor_clinico'] },
  ];

  const renderDashboard = () => {
    const hojeIso = obterDataLocalISO(new Date());
    const minutosAtuais = new Date().getHours() * 60 + new Date().getMinutes();
    const agendaGeralHoje = agendamentosGlobais.filter(a => a.data === hojeIso && a.status !== 'cancelado').sort((a, b) => getMinutos(a.hora) - getMinutos(b.hora));
    const minhaAgendaHoje = agendaGeralHoje.filter(a => a.profissionalId === user.id);
    const proximosPendentesMeus = minhaAgendaHoje.filter(a => !a.status || a.status === 'pendente' || a.status === 'confirmado');
    const proximoAtendimento = proximosPendentesMeus.length > 0 ? proximosPendentesMeus[0] : null;
    const proximoEstaAtrasado = proximoAtendimento ? getMinutos(proximoAtendimento.hora) < minutosAtuais : false;
    const minhasRealizadas = minhaAgendaHoje.filter(a => a.status === 'realizado' || a.status === 'confirmado').length;
    const minhasAtrasadas = minhaAgendaHoje.filter(a => (!a.status || a.status === 'pendente') && getMinutos(a.hora) < minutosAtuais).length;
    const geralRealizadas = agendaGeralHoje.filter(a => a.status === 'realizado' || a.status === 'confirmado').length;
    const geralPendentes = agendaGeralHoje.filter(a => !a.status || a.status === 'pendente').length;
    
    const exerciciosDaSessao = proximoAtendimento?.exerciciosPlanejados || [];
    const planoProximoPaciente = proximoAtendimento ? exerciciosGlobais.filter(e => e.pacienteId === proximoAtendimento.pacienteId).slice(0, 3) : [];
    
    const listaExibicao = exerciciosDaSessao.length > 0 ? exerciciosDaSessao : planoProximoPaciente;
    const isSessaoModulada = exerciciosDaSessao.length > 0;
    
    const primeiroNome = (user?.name || user?.nome || 'Equipe').split(' ')[0];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Painel Clínico</h1>
              <p className="text-slate-500 font-medium">Bom dia, {primeiroNome}. Resumo das suas atividades hoje.</p>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-[#0F214A] rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[300px]">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#00A1FF] flex items-center gap-2 mb-4"><Clock size={14}/> Seu Próximo Paciente</p>
                        {proximoAtendimento ? (
                            <>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-4xl md:text-5xl font-black">{proximoAtendimento.paciente}</h2>
                                    {proximoAtendimento.status === 'confirmado' && <span className="bg-[#00A1FF]/20 text-[#00A1FF] px-2 py-1 rounded border border-[#00A1FF]/30 text-[10px] font-black uppercase">Presença Confirmada</span>}
                                </div>
                                <p className="text-lg text-slate-300 font-medium flex flex-wrap items-center gap-3">
                                    <span className={`px-3 py-1 rounded-xl font-black text-sm ${proximoEstaAtrasado ? 'bg-red-500 text-white animate-pulse' : 'bg-[#00A1FF] text-white'}`}>{proximoAtendimento.hora} {proximoEstaAtrasado && '(Atrasado)'}</span>
                                    <span className="bg-white/10 px-3 py-1 rounded-xl font-bold text-sm text-slate-300">{proximoAtendimento.local}</span>
                                </p>
                                
                                {listaExibicao.length > 0 && (
                                    <div className={`mt-6 border rounded-2xl p-4 backdrop-blur-md max-w-lg mb-2 ${isSessaoModulada ? 'bg-[#FFCC00]/10 border-[#FFCC00]/20' : 'bg-white/5 border-white/10'}`}>
                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-1 ${isSessaoModulada ? 'text-[#FFCC00]' : 'text-slate-400'}`}>
                                            {isSessaoModulada ? <><Target size={12}/> Modulação de Atendimento (Planejado)</> : <><Dumbbell size={12}/> Exercícios do Plano Geral</>}
                                        </p>
                                        <div className="space-y-2">
                                            {listaExibicao.map((ex, i) => (
                                                <div key={ex.id || i} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0">
                                                    <span className="font-bold text-white">{ex.nome}</span>
                                                    <span className="text-slate-300 text-xs text-right ml-4 shrink-0 bg-white/10 px-2 py-1 rounded-lg">
                                                        {ex.series}x{ex.reps} {ex.carga ? `• ${ex.carga}` : ''}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div><h2 className="text-3xl font-black mb-2 text-slate-400">Nenhum paciente na fila.</h2><p className="text-slate-500 font-medium">Você concluiu todos os seus atendimentos de hoje!</p></div>
                        )}
                    </div>
                    {proximoAtendimento && (
                        <div className="relative z-10 mt-8 flex flex-wrap gap-3">
                            <button onClick={() => navegarPara('pacientes', { pacienteId: proximoAtendimento.pacienteId, atualizarStatusAgendamento: proximoAtendimento.id })} className="bg-[#FFCC00] text-[#0F214A] px-6 py-3 rounded-2xl font-black text-sm hover:scale-105 transition-all flex items-center gap-2 shadow-lg w-fit">Iniciar Prontuário <ArrowRight size={16}/></button>
                        </div>
                    )}
                    <HeartPulse className="absolute -right-10 -bottom-10 text-white/5 w-64 h-64" />
                </div>
                <div className="flex flex-col gap-6">
                    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex-1 flex flex-col justify-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2"><Users size={14}/> Suas Sessões Hoje</p>
                        <h3 className="text-4xl font-black text-[#0F214A]">{minhaAgendaHoje.length}</h3>
                        <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden"><div className="bg-[#00A1FF] h-full rounded-full transition-all" style={{ width: `${minhaAgendaHoje.length > 0 ? (minhasRealizadas / minhaAgendaHoje.length) * 100 : 0}%` }}></div></div>
                        <p className="text-xs font-bold text-slate-400 mt-2">{minhasRealizadas} concluídos de {minhaAgendaHoje.length}</p>
                    </div>
                    <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100 shadow-sm flex-1 flex flex-col justify-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#00A1FF] mb-2 flex items-center gap-2"><CheckCircle2 size={14}/> Suas Evoluções Pendentes</p>
                        <h3 className="text-4xl font-black text-[#00A1FF]">{minhasAtrasadas}</h3>
                        <p className="text-xs font-bold text-blue-600/70 mt-2">Sessões atrasadas sem assinatura</p>
                    </div>
                </div>
            </div>
            {user.role === 'gestor_clinico' && (
                <div className="mt-8 pt-8 border-t border-slate-200">
                    <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><LayoutDashboard className="text-blue-600"/> Visão Geral da Clínica (Gestor)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-slate-900 text-white rounded-[24px] p-6 shadow-md"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Clínica Hoje</p><h3 className="text-3xl font-black">{agendaGeralHoje.length}</h3></div>
                        <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Aguardando (Clínica)</p><h3 className="text-3xl font-black text-slate-800">{geralPendentes}</h3></div>
                        <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Finalizados (Clínica)</p><h3 className="text-3xl font-black text-slate-800">{geralRealizadas}</h3></div>
                    </div>
                </div>
            )}
        </div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex bg-white font-sans">
        <div className="hidden lg:flex flex-col justify-center w-1/2 bg-[#0F214A] p-16 text-white relative overflow-hidden">
           <div className="relative z-10 max-w-lg">
              <div className="flex items-center gap-3 mb-8"><HeartPulse size={48} className="text-[#00A1FF]" /><span className="text-3xl font-black tracking-tight">EVOLUTI</span></div>
              <h1 className="text-5xl font-black leading-tight mb-6">Gestão Clínica Inteligente.</h1>
              <p className="text-lg text-blue-200 font-medium leading-relaxed">Organize a sua agenda, escreva evoluções guiadas por IA e controle o fluxo de caixa com a energia do Choquito ⚡!</p>
           </div>
           <div className="absolute top-1/4 right-10 w-48 h-48 opacity-90 hover:opacity-100 hover:scale-105 transition-all duration-500 z-20"><img src="/choquito.jpg" alt="Choquito" className="w-full h-full object-contain rounded-full shadow-[0_0_40px_rgba(0,161,255,0.4)] border-4 border-[#00A1FF]" /></div>
           <div className="absolute bottom-0 left-10 w-[300px] h-[300px] bg-[#00A1FF] rounded-full blur-[150px] opacity-20"></div>
           <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FFCC00] rounded-full blur-[200px] opacity-10"></div>
        </div>
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-20 relative bg-white">
           <div className="absolute top-8 left-8 lg:hidden flex items-center gap-2 text-[#0F214A]"><HeartPulse size={28} className="text-[#00A1FF]" /><span className="text-xl font-black tracking-tight">EVOLUTI</span></div>
           <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700 mt-12 lg:mt-0">
             {authMode === 'login' ? (
                 <>
                   <div className="mb-10 text-center lg:text-left"><h2 className="text-3xl font-black text-slate-900">Bem-vindo de volta!</h2><p className="text-slate-500 font-medium mt-2">Insira as suas credenciais para acessar o sistema.</p></div>
                   <form onSubmit={realizarLogin} className="space-y-5">
                     <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-2">E-mail Profissional</label><input name="email" required type="email" placeholder="nome@clinica.com" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00A1FF] focus:bg-white font-bold text-slate-800 transition-all shadow-sm" /></div>
                     <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-2">Senha</label><input name="senha" required type="password" placeholder="••••••••" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00A1FF] focus:bg-white font-bold text-slate-800 transition-all shadow-sm" /></div>
                     <div className="flex items-center justify-between pt-2">
                       <label className="flex items-center gap-2 cursor-pointer group"><div className="relative flex items-center justify-center w-5 h-5 rounded border-2 border-slate-300 group-hover:border-[#00A1FF] transition-colors"><input type="checkbox" className="opacity-0 absolute w-full h-full cursor-pointer" checked={lembrarMe} onChange={e => setLembrarMe(e.target.checked)} />{lembrarMe && <CheckCircle2 size={14} className="text-[#00A1FF] absolute pointer-events-none" />}</div><span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">Lembrar-me (30 min)</span></label>
                       <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Lock size={10}/> Ambiente Seguro</span>
                     </div>
                     <button disabled={loading} className="w-full bg-[#0F214A] text-white py-4 rounded-2xl font-black text-lg hover:bg-[#00A1FF] transition-all shadow-lg hover:shadow-blue-200 mt-4 flex items-center justify-center">{loading ? <Loader2 className="animate-spin" /> : 'Acessar Plataforma'}</button>
                   </form>
                   <div className="mt-10 text-center border-t border-slate-100 pt-6"><p className="text-sm text-slate-500 font-medium">Novo na equipe clínica?</p><button onClick={() => setAuthMode('cadastro')} className="mt-2 text-[#00A1FF] font-black hover:text-blue-800 transition-colors">Solicitar Acesso ao Gestor</button></div>
                 </>
             ) : (
                 <>
                   <div className="mb-8 text-center lg:text-left"><button onClick={() => setAuthMode('login')} className="mb-4 text-sm font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1 lg:justify-start justify-center mx-auto lg:mx-0 transition-colors"><ChevronLeft size={16}/> Voltar ao Login</button><h2 className="text-3xl font-black text-slate-900">Solicitar Acesso</h2><p className="text-slate-500 font-medium mt-2 text-sm">O seu pedido será revisado pelo Gestor Clínico.</p></div>
                   <form onSubmit={solicitarCadastro} className="space-y-4">
                     <input required type="text" placeholder="Nome Completo" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] focus:bg-white font-bold text-slate-800 text-sm shadow-sm transition-all" value={cadNome} onChange={e => setCadNome(e.target.value)} />
                     <div className="grid grid-cols-2 gap-3">
                       <select required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] focus:bg-white font-bold text-slate-800 text-sm shadow-sm transition-all" value={cadProfissao} onChange={e => setCadProfissao(e.target.value)}><option value="">Profissão...</option><option value="fisio">Fisioterapeuta</option><option value="to">Ter. Ocupacional</option><option value="recepcao">Recepção</option></select>
                       <input required type="text" placeholder="Nº de Registro" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] focus:bg-white font-bold text-slate-800 text-sm shadow-sm transition-all" value={cadRegistro} onChange={e => setCadRegistro(e.target.value)} />
                     </div>
                     <input required type="email" placeholder="E-mail Profissional" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] focus:bg-white font-bold text-slate-800 text-sm shadow-sm transition-all" value={cadEmail} onChange={e => setCadEmail(e.target.value)} /><input required type="password" placeholder="Defina uma Senha" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] focus:bg-white font-bold text-slate-800 text-sm shadow-sm transition-all" value={cadSenha} onChange={e => setCadSenha(e.target.value)} />
                     <button disabled={loading} className="w-full bg-[#0F214A] text-white py-4 rounded-xl font-black mt-4 hover:bg-[#00A1FF] transition-all flex justify-center shadow-lg">{loading ? <Loader2 className="animate-spin" /> : 'Enviar Solicitação Segura'}</button>
                   </form>
                 </>
             )}
           </div>
        </div>
      </div>
    );
  }

  const currentTutorialStep = tutorialStep >= 0 ? TUTORIAL_STEPS[tutorialStep] : null;
  const currentChapter = currentTutorialStep ? TUTORIAL_CHAPTERS.find(c => c.id === currentTutorialStep.chapterId) : null;

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-[#fdfbff] relative">
      {tutorialStep >= 0 && currentTutorialStep && currentChapter && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className="bg-white max-w-sm w-full rounded-[32px] p-8 shadow-2xl relative mt-16 animate-in zoom-in-95 duration-300">
             <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-32 h-32 flex items-center justify-center animate-bounce z-50"><img src="/choquito.jpg" alt="Choquito" className="w-full h-full object-contain drop-shadow-xl rounded-full border-4 border-white" /></div>
             <div className="mt-12 text-center">
                <div className="flex items-center justify-center gap-2 mb-4 bg-slate-50 p-2 rounded-full border border-slate-100 shadow-inner w-fit mx-auto"><div className={`p-2 rounded-full ${currentChapter.color} ${currentChapter.textColor}`}><ListChecks size={14}/></div><span className="text-[10px] font-black uppercase tracking-widest text-slate-700 px-2">{currentChapter.title}</span></div>
                <h3 className="text-2xl font-black text-[#0F214A] mb-4 leading-tight">{currentTutorialStep.titulo}</h3><p className="text-slate-600 font-medium leading-relaxed text-sm mb-8">{currentTutorialStep.texto}</p>
                <div className="flex gap-3 pt-2 border-t border-slate-100">{tutorialStep > 0 && <button onClick={() => setTutorialStep(-1)} className="flex-1 py-3 text-slate-400 font-bold hover:bg-slate-50 rounded-xl transition-colors text-sm">Sair</button>}<button onClick={avancarTutorial} className={`flex-[2] ${currentChapter.color} ${currentChapter.textColor} py-3 rounded-xl font-black hover:scale-105 transition-all shadow-lg text-sm`}>{currentTutorialStep.botao}</button></div>
             </div>
          </div>
        </div>
      )}
      <aside onMouseEnter={() => setIsSidebarOpen(true)} onMouseLeave={() => setIsSidebarOpen(false)} className={`hidden md:flex bg-[#f3eff4] transition-all duration-500 flex-col z-50 border-r border-slate-200 ${isSidebarOpen ? 'w-48' : 'w-24'} print:hidden`}>
        <div className="p-6 flex justify-center text-[#00A1FF] shrink-0"><HeartPulse size={32} className="animate-pulse" /></div>
        <nav className="flex-1 px-2 space-y-4 mt-4 overflow-y-auto custom-scrollbar">
          {menuItems.filter(item => hasAccess(item.roles)).map((item) => (
            <button key={item.id} onClick={() => navegarPara(item.id)} className={`w-full flex flex-col items-center justify-center p-3 rounded-2xl transition-all gap-1 ${currentView === item.id ? 'bg-[#e5f5ff] text-[#00A1FF]' : 'text-slate-500 hover:bg-[#ece7ed]'}`}>
              <item.icon size={currentView === item.id ? 28 : 24} className={currentView === item.id ? 'text-[#00A1FF]' : ''} />
              <span className={`text-[10px] font-black uppercase tracking-tighter transition-opacity duration-300 ${!isSidebarOpen ? 'opacity-0 h-0' : 'opacity-100'}`}>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 flex flex-col items-center gap-4 mt-auto">
           <button onClick={fazerLogout} className="p-2 text-red-400 hover:text-red-600 transition-colors"><LogOut size={20}/></button>
           <div className={`text-center font-black text-slate-300 transition-opacity duration-300 ${!isSidebarOpen ? 'opacity-0 h-0 text-[0px]' : 'opacity-100 text-[10px]'}`}>
              v1.0.0
           </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0 h-full overflow-y-auto print:overflow-visible">
        <header className="h-16 bg-[#fdfbff]/80 backdrop-blur-md flex items-center justify-between px-6 border-b border-slate-100 shrink-0 sticky top-0 z-40 print:hidden">
           <span className="font-black text-[#00A1FF] uppercase tracking-tighter md:hidden">EVOLUTI</span>
           <div className="flex items-center gap-3 ml-auto">
              <a href="mailto:jefferson.osilva27@gmail.com?subject=Sugestão de Melhoria - Evoluti Fisio" className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors hidden sm:flex items-center gap-2 bg-slate-50 px-3 shadow-sm border border-slate-100" title="Sugerir Melhoria"><MessageSquareShare size={18} /><span className="text-[10px] font-black text-slate-700 uppercase">Sugerir Melhoria</span></a>
              <button onClick={iniciarTutorial} className="p-2 text-[#FFCC00] hover:bg-yellow-50 rounded-full transition-colors hidden sm:flex items-center gap-2 bg-slate-50 px-3 shadow-sm border border-slate-100" title="Como funciona?"><Zap size={18} className="fill-[#FFCC00]" /><span className="text-[10px] font-black text-slate-700 uppercase">Guia</span></button>
              <div className="text-right hidden sm:block"><p className="text-xs font-black leading-none text-[#0F214A]">{user?.name || user?.nome || 'Equipe'}</p><p className="text-[9px] text-[#00A1FF] font-bold uppercase mt-1">{user?.role?.replace('_', ' ')}</p></div>
              <div className="w-8 h-8 rounded-full bg-[#0F214A] text-white flex items-center justify-center font-black text-xs capitalize">{(user?.name || user?.nome || 'U').charAt(0)}</div>
           </div>
        </header>
        <div className="p-4 md:p-8 h-full print:p-0">
           <div className="max-w-[1600px] mx-auto">
              {currentView === 'dashboard' && renderDashboard()}
              {currentView === 'agenda' && <Agenda user={user} hasAccess={hasAccess} navegarPara={navegarPara} />}
              {currentView === 'pacientes' && <Pacientes pacientes={pacientes} hasAccess={hasAccess} user={user} navParams={navParams} />}
              {currentView === 'avaliacoes' && <Avaliacoes hasAccess={hasAccess} />}
              {currentView === 'financeiro' && <Financeiro user={user} hasAccess={hasAccess} navegarPara={navegarPara} />}
              {currentView === 'equipe' && <Equipe user={user} />}
           </div>
        </div>
      </main>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 flex justify-around items-center h-20 px-2 z-[60] print:hidden">
         {menuItems.filter(item => hasAccess(item.roles)).map((item) => (
            <button key={item.id} onClick={() => navegarPara(item.id)} className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all ${currentView === item.id ? 'text-[#00A1FF] scale-110' : 'text-slate-400'}`}><div className={`p-2 rounded-xl transition-all ${currentView === item.id ? 'bg-[#e5f5ff]' : ''}`}><item.icon size={22} strokeWidth={currentView === item.id ? 2.5 : 2} /></div><span className="text-[10px] font-bold">{item.label}</span></button>
         ))}
      </nav>
    </div>
  );
}

export default function App() { return <ErrorBoundary><MainApp /></ErrorBoundary>; }