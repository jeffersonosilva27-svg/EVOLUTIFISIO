import React, { useState, useEffect, Component } from 'react';
import { 
  HeartPulse, LayoutDashboard, Calendar, Users, 
  Activity, DollarSign, Settings, LogOut, Menu, 
  ShieldCheck, Loader2, Clock, CheckCircle2, AlertCircle, ArrowRight, Lock, ChevronLeft, Dumbbell, ListChecks, Zap, User, MapPin, Smartphone, Lightbulb
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
  { id: 'money', title: 'Fase 3: Financeiro', color: 'bg-green-500', textColor: 'text-white' },
  { id: 'end', title: 'Tudo Pronto!', color: 'bg-[#00A1FF]', textColor: 'text-white' }
];

const TUTORIAL_STEPS = [
  { chapterId: 'start', titulo: "Olá! Eu sou o Choquito ⚡", texto: "Bem-vindo ao Evoluti Fisio! O seu novo braço direito na gestão clínica. Comigo a energia nunca acaba! Vamos fazer uma tour rápida para você aprender a usar tudo sem esforço.", view: 'dashboard', botao: "Começar Tour Guiada" },
  { chapterId: 'basico', titulo: "O Painel Inicial", texto: "Aqui no Início, você tem uma visão rápida do seu próximo paciente e das evoluções que precisa de assinar hoje. Mantenha os seus olhos sempre aqui!", view: 'dashboard', botao: "Entendi" },
  { chapterId: 'basico', titulo: "A Agenda Inteligente", texto: "Nesta aba, você agenda sessões simples ou em lotes. O nosso algoritmo de conflitos ativará a 'Dupla Janela' se houver sobreposição de horários.", view: 'agenda', botao: "Ir para Clínico" },
  { chapterId: 'fisio', titulo: "Prontuário Completo (SOAP)", texto: "A aba Pacientes é o coração do atendimento. Clique num paciente para abrir o prontuário, escrever evoluções guiadas por IA e monitorizar a dor (Gráfico EVA).", view: 'pacientes', botao: "Ver Planos de Tratamento" },
  { chapterId: 'fisio', titulo: "Prescrição de Exercícios", texto: "Ainda na ficha do paciente, tem o 'Plano de Tratamento'. Você pode prescrever exercícios focados em grupos musculares, com cargas e séries perfeitas.", view: 'pacientes', botao: "Conhecer o Caixa" },
  { chapterId: 'money', titulo: "Controlo Financeiro", texto: "Sempre que uma sessão é marcada como 'Realizada', o valor cai aqui automaticamente. Acompanhe a previsão de recebimentos e o ticket médio da clínica.", view: 'financeiro', botao: "Finalizar Tour" },
  { chapterId: 'end', titulo: "É Tudo Seu! 🚀", texto: "Você concluiu a tour guiada! O sistema está pronto para receber toda a sua energia. Se precisar de mim novamente, basta clicar no ícone do raio azul lá em cima!", view: 'dashboard', botao: "Começar a Usar Agora" }
];

function MainApp() {
  const [user, setUser] = useState(() => {
    try {
      let salvo = sessionStorage.getItem('evoluti_user');
      if (salvo) return JSON.parse(salvo);

      salvo = localStorage.getItem('evoluti_user');
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          localStorage.removeItem('evoluti_user'); 
          return null; 
        }
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

  const navegarPara = (view, params = null) => {
    setNavParams(params);
    setCurrentView(view);
  };

  const iniciarTutorial = () => {
    setTutorialStep(0);
    setCurrentView('dashboard');
  };

  const avancarTutorial = () => {
    const nextStep = tutorialStep + 1;
    if (nextStep < TUTORIAL_STEPS.length) {
       setTutorialStep(nextStep);
       setCurrentView(TUTORIAL_STEPS[nextStep].view);
    } else {
       setTutorialStep(-1);
       localStorage.setItem('evoluti_tutorial_visto', 'sim');
       setCurrentView('dashboard');
    }
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
        
        if (userData.status === 'pendente') {
          alert("O seu cadastro ainda está em análise pelo gestor da clínica.");
        } else if (userData.senhaProvisoria === senha || userData.senhaReal === senha) {
          setUser(userData);
          if (lembrarMe) {
             const expireTime = Date.now() + (30 * 60 * 1000); 
             localStorage.setItem('evoluti_user', JSON.stringify({...userData, expiresAt: expireTime}));
          } else {
             sessionStorage.setItem('evoluti_user', JSON.stringify(userData));
          }

          if (!localStorage.getItem('evoluti_tutorial_visto')) {
             setTimeout(() => setTutorialStep(0), 1000);
          }

        } else { alert("Senha incorreta."); }
      } else { alert("Utilizador não encontrado."); }
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

  const fazerLogout = () => {
    localStorage.removeItem('evoluti_user');
    sessionStorage.removeItem('evoluti_user');
    window.location.reload();
  };

  useEffect(() => {
    if (user) {
      const unsubPac = onSnapshot(query(collection(db, "pacientes"), orderBy("nome", "asc")), (snap) => {
        setPacientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      const unsubAg = onSnapshot(collection(db, "agendamentos"), (snap) => {
        setAgendamentosGlobais(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      const unsubEx = onSnapshot(collectionGroup(db, "plano_tratamento"), (snap) => {
        const exs = snap.docs.map(d => ({ id: d.id, pacienteId: d.ref.parent.parent.id, ...d.data() }));
        exs.sort((a,b) => new Date(b.dataInclusao || 0) - new Date(a.dataInclusao || 0));
        setExerciciosGlobais(exs);
      });
      return () => { unsubPac(); unsubAg(); unsubEx(); };
    }
  }, [user]);

  const isRecepcao = user?.role === 'recepcao' || user?.role === 'recepcionista' || user?.categoriaBase === 'recepcao';
  const isGestor = user?.role === 'gestor_clinico';

  const hasAccess = (roles) => {
    if (!user) return false;
    if (roles.includes('any')) return true;
    if (roles.includes(user.role)) return true;
    if (isRecepcao && roles.includes('recepcao')) return true;
    return false;
  };

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Início', roles: ['any'] },
    { id: 'agenda', icon: Calendar, label: 'Agenda', roles: ['any'] },
    { id: 'pacientes', icon: Users, label: 'Pacientes', roles: ['any'] },
    { id: 'avaliacoes', icon: Activity, label: 'Escalas', roles: ['gestor_clinico', 'fisio', 'to'] },
    { id: 'financeiro', icon: DollarSign, label: 'Caixa', roles: ['gestor_clinico', 'admin_fin', 'recepcao'] },
    { id: 'equipe', icon: Settings, label: 'Equipe', roles: ['gestor_clinico'] },
  ];

  const renderDashboard = () => {
    const hojeIso = obterDataLocalISO(new Date());
    const agora = new Date();
    const minutosAtuais = agora.getHours() * 60 + agora.getMinutes();

    const agendaGeralHoje = agendamentosGlobais
        .filter(a => a.data === hojeIso)
        .sort((a, b) => getMinutos(a.hora) - getMinutos(b.hora));
        
    const primeiroNomeUsuario = (user?.name || user?.nome || 'Equipe').split(' ')[0];

    if (isRecepcao && !isGestor) {
        const sessoesValidas = agendaGeralHoje.filter(a => a.status !== 'cancelado');
        const sessoesPendentesGeral = sessoesValidas.filter(a => !a.status || a.status === 'pendente').length;
        const sessoesRealizadasGeral = sessoesValidas.filter(a => a.status === 'realizado').length;
        const sessoesCanceladas = agendaGeralHoje.filter(a => a.status === 'cancelado').length;

        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">Painel da Recepção</h1>
                  <p className="text-slate-500 font-medium">Bom dia, {primeiroNomeUsuario}! Controle o fluxo master da clínica em tempo real.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[#00A1FF] text-white rounded-[24px] p-6 shadow-lg relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-100 mb-1">Agendados Hoje</p>
                            <h3 className="text-4xl font-black">{sessoesValidas.length}</h3>
                        </div>
                        <Calendar className="absolute -right-4 -bottom-4 text-white/20 w-24 h-24" />
                    </div>
                    
                    <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Aguardando / Atrasos</p>
                        <h3 className="text-3xl font-black text-[#0F214A]">{sessoesPendentesGeral}</h3>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Finalizados</p>
                        <h3 className="text-3xl font-black text-green-600">{sessoesRealizadasGeral}</h3>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Cancelados / Faltas</p>
                        <h3 className="text-3xl font-black text-red-500">{sessoesCanceladas}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm mt-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-black text-[#0F214A] flex items-center gap-2">
                            <Users className="text-[#00A1FF]"/> Agenda Master Diária
                        </h3>
                    </div>

                    {agendaGeralHoje.length > 0 ? (
                        <div className="overflow-x-auto custom-scrollbar pb-4">
                            <table className="w-full text-left min-w-[800px] border-collapse">
                                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 rounded-tl-xl">Horário</th>
                                        <th className="p-4">Paciente</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Profissional</th>
                                        <th className="p-4">Sala/Local</th>
                                        <th className="p-4 text-right rounded-tr-xl">Ação Rápida</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {agendaGeralHoje.map(ag => {
                                        const isAtrasado = (!ag.status || ag.status === 'pendente') && getMinutos(ag.hora) < minutosAtuais && ag.status !== 'cancelado';
                                        const isCancelado = ag.status === 'cancelado';
                                        const isRealizado = ag.status === 'realizado';
                                        const pac = pacientes.find(p => p.id === ag.pacienteId);
                                        
                                        return (
                                            <tr key={ag.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="p-4 align-middle">
                                                    <span className={`px-3 py-1.5 rounded-xl font-black text-sm ${
                                                        isRealizado ? 'bg-green-50 text-green-700' 
                                                        : isCancelado ? 'bg-slate-100 text-slate-400 line-through'
                                                        : isAtrasado ? 'bg-red-50 text-red-600' 
                                                        : 'bg-blue-50 text-[#00A1FF]'
                                                    }`}>
                                                        {ag.hora}
                                                    </span>
                                                </td>
                                                <td className="p-4 align-middle">
                                                    <div className={`font-black ${isCancelado ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{ag.paciente}</div>
                                                </td>
                                                <td className="p-4 align-middle">
                                                    {isCancelado ? (
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-2 py-1 rounded-md">Cancelado</span>
                                                    ) : isRealizado ? (
                                                        <span className="text-[10px] font-bold text-green-700 uppercase bg-green-50 px-2 py-1 rounded-md">Concluído</span>
                                                    ) : isAtrasado ? (
                                                        <span className="text-[10px] font-bold text-red-600 uppercase bg-red-50 px-2 py-1 rounded-md animate-pulse">Atrasado</span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded-md">Aguardando</span>
                                                    )}
                                                </td>
                                                <td className="p-4 align-middle">
                                                    <div className={`text-xs font-bold flex items-center gap-1.5 ${isCancelado ? 'text-slate-400' : 'text-slate-600'}`}>
                                                        <User size={14} className={isCancelado ? 'text-slate-300' : 'text-[#00A1FF]'}/> {ag.profissional}
                                                    </div>
                                                </td>
                                                <td className="p-4 align-middle">
                                                    <div className={`text-xs font-bold flex items-center gap-1.5 ${isCancelado ? 'text-slate-400' : 'text-slate-600'}`}>
                                                        <MapPin size={14} className={isCancelado ? 'text-slate-300' : 'text-slate-400'}/> {ag.local}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right align-middle">
                                                    {pac?.whatsapp && !isCancelado ? (
                                                        <a href={`https://wa.me/55${pac.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-white hover:bg-green-50 text-slate-600 hover:text-green-600 border border-slate-200 px-3 py-1.5 rounded-xl text-[11px] font-black transition-colors shadow-sm">
                                                            <Smartphone size={14}/> Contatar
                                                        </a>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-slate-300">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <Calendar size={32} className="mx-auto text-slate-300 mb-3"/>
                            <p className="font-bold text-slate-500 text-sm">Não há nenhum agendamento registado para o dia de hoje.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const agendaClinicaHoje = agendaGeralHoje.filter(a => a.status !== 'cancelado');
    const minhaAgendaHoje = agendaClinicaHoje.filter(a => a.profissionalId === user.id);

    const proximosPendentesMeus = minhaAgendaHoje.filter(a => !a.status || a.status === 'pendente');
    const proximoAtendimento = proximosPendentesMeus.length > 0 ? proximosPendentesMeus[0] : null;
    let proximoEstaAtrasado = false;
    if (proximoAtendimento) proximoEstaAtrasado = getMinutos(proximoAtendimento.hora) < minutosAtuais;

    const agendaMetricas = user.role === 'gestor_clinico' ? agendaClinicaHoje : minhaAgendaHoje;
    const totalMetricas = agendaMetricas.length;
    const realizadasMetricas = agendaMetricas.filter(a => a.status === 'realizado').length;
    const atrasadasMetricas = agendaMetricas.filter(a => {
        if (a.status === 'realizado') return false;
        return getMinutos(a.hora) < minutosAtuais;
    }).length;

    const rotuloMetricas = user.role === 'gestor_clinico' ? 'Sessões da Clínica Hoje' : 'Suas Sessões Hoje';
    
    const meusExercicios = user.role === 'gestor_clinico' ? exerciciosGlobais : exerciciosGlobais.filter(e => e.profissional === user.name);
    const ultimosExercicios = meusExercicios.slice(0, 6);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Painel Clínico</h1>
              <p className="text-slate-500 font-medium">Bem-vindo(a) à sua rotina clínica, {primeiroNomeUsuario}.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-[#0F214A] rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden">
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#00A1FF] flex items-center gap-2 mb-4">
                                <Clock size={14}/> Seu Próximo Paciente
                            </p>
                            {proximoAtendimento ? (
                                <>
                                    <h2 className="text-4xl md:text-5xl font-black mb-2">{proximoAtendimento.paciente}</h2>
                                    <p className="text-lg text-slate-300 font-medium flex flex-wrap items-center gap-3">
                                        <span className={`px-3 py-1 rounded-xl font-black text-sm ${proximoEstaAtrasado ? 'bg-red-500 text-white animate-pulse' : 'bg-[#00A1FF] text-white'}`}>
                                            {proximoAtendimento.hora} {proximoEstaAtrasado && '(Atrasado)'}
                                        </span>
                                        <span className="bg-white/10 px-3 py-1 rounded-xl font-bold text-sm text-slate-300">{proximoAtendimento.local}</span>
                                    </p>
                                </>
                            ) : (
                                <div>
                                    <h2 className="text-3xl font-black mb-2 text-slate-400">Nenhum paciente na fila.</h2>
                                    <p className="text-slate-500 font-medium">Você concluiu todos os seus atendimentos de hoje!</p>
                                </div>
                            )}
                        </div>
                        {proximoAtendimento && (
                            <div className="mt-8">
                                <button 
                                    onClick={() => navegarPara('pacientes', { pacienteId: proximoAtendimento.pacienteId, atualizarStatusAgendamento: proximoAtendimento.id })} 
                                    className="bg-[#FFCC00] text-[#0F214A] px-6 py-3 rounded-2xl font-black text-sm hover:scale-105 transition-all flex items-center gap-2 shadow-lg w-fit"
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
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2"><Users size={14}/> {rotuloMetricas}</p>
                        <h3 className="text-4xl font-black text-[#0F214A]">{totalMetricas}</h3>
                        <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
                            <div className="bg-[#00A1FF] h-full rounded-full transition-all" style={{ width: `${totalMetricas > 0 ? (realizadasMetricas / totalMetricas) * 100 : 0}%` }}></div>
                        </div>
                        <p className="text-xs font-bold text-slate-400 mt-2">{realizadasMetricas} concluídos de {totalMetricas}</p>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100 shadow-sm flex-1 flex flex-col justify-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#00A1FF] mb-2 flex items-center gap-2"><CheckCircle2 size={14}/> Evoluções Pendentes</p>
                        <h3 className="text-4xl font-black text-[#00A1FF]">{atrasadasMetricas}</h3>
                        <p className="text-xs font-bold text-blue-600/70 mt-2">Sessões atrasadas sem assinatura</p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm mt-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-[#0F214A] flex items-center gap-2">
                        <Dumbbell className="text-[#00A1FF]"/> Recentes no Plano de Tratamento
                    </h3>
                </div>

                {ultimosExercicios.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ultimosExercicios.map(ex => {
                            const pac = pacientes.find(p => p.id === ex.pacienteId);
                            return (
                                <div key={ex.id} onClick={() => navegarPara('pacientes', { pacienteId: ex.pacienteId })} className="bg-slate-50 p-5 rounded-[24px] border border-slate-200 flex flex-col group hover:border-[#00A1FF] transition-colors cursor-pointer shadow-sm hover:shadow-md">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#00A1FF] bg-blue-100 px-2 py-1 rounded-lg">{ex.musculo}</span>
                                        <span className="text-[10px] font-bold text-slate-400">{new Date(ex.dataInclusao).toLocaleDateString()}</span>
                                    </div>
                                    <h4 className="font-black text-[#0F214A] text-sm mb-1 leading-tight">{ex.nome}</h4>
                                    <p className="text-xs font-bold text-slate-500 mb-4">
                                        {ex.series}x {ex.reps} {ex.carga ? <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded ml-1">• {ex.carga}</span> : ''}
                                    </p>
                                    <div className="mt-auto pt-3 border-t border-slate-200 flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                                        <span className="truncate max-w-[130px]" title={pac?.nome}>{pac?.nome || 'Paciente não encontrado'}</span>
                                        <span className="text-[#00A1FF]">{ex.profissional?.split(' ')[0]}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <Dumbbell size={32} className="mx-auto text-slate-300 mb-3"/>
                        <p className="font-bold text-slate-500 text-sm">Você ainda não prescreveu exercícios nos planos de tratamento.</p>
                    </div>
                )}
            </div>
        </div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex bg-slate-50">
        <div className="hidden lg:flex flex-col justify-center w-1/2 bg-[#0F214A] p-16 text-white relative overflow-hidden">
           <div className="relative z-10 max-w-lg">
              <div className="flex items-center gap-3 mb-8">
                <HeartPulse size={48} className="text-[#00A1FF]" />
                <span className="text-3xl font-black tracking-tight">EVOLUTI</span>
              </div>
              <h1 className="text-5xl font-black leading-tight mb-6">Gestão Clínica Inteligente.</h1>
              <p className="text-lg text-blue-200 font-medium leading-relaxed">
                Organize a sua agenda, escreva evoluções guiadas por IA e controle o fluxo de caixa com a energia do Choquito ⚡!
              </p>
           </div>
           <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#00A1FF] rounded-full blur-[150px] opacity-30"></div>
        </div>

        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
           <div className="absolute top-8 left-8 lg:hidden flex items-center gap-2 text-[#0F214A]">
              <HeartPulse size={28} className="text-[#00A1FF]" />
              <span className="text-xl font-black tracking-tight">EVOLUTI</span>
           </div>

           <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
             {authMode === 'login' ? (
                 <>
                   <div className="mb-10 text-center lg:text-left mt-10 lg:mt-0">
                     <h2 className="text-3xl font-black text-slate-900">Bem-vindo de volta!</h2>
                     <p className="text-slate-500 font-medium mt-2">Insira as suas credenciais para aceder ao sistema.</p>
                   </div>
                   <form onSubmit={realizarLogin} className="space-y-5">
                     <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-2">E-mail Profissional</label>
                       <input name="email" required type="email" placeholder="nome@clinica.com" className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-[#00A1FF] focus:ring-4 focus:ring-blue-50 font-bold text-slate-800 transition-all shadow-sm" />
                     </div>
                     <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-2">Palavra-passe</label>
                       <input name="senha" required type="password" placeholder="••••••••" className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-[#00A1FF] focus:ring-4 focus:ring-blue-50 font-bold text-slate-800 transition-all shadow-sm" />
                     </div>
                     <div className="flex items-center justify-between pt-2">
                       <label className="flex items-center gap-2 cursor-pointer group">
                         <div className="relative flex items-center justify-center w-5 h-5 rounded border-2 border-slate-300 group-hover:border-[#00A1FF] transition-colors">
                           <input type="checkbox" className="opacity-0 absolute w-full h-full cursor-pointer" checked={lembrarMe} onChange={e => setLembrarMe(e.target.checked)} />
                           {lembrarMe && <CheckCircle2 size={14} className="text-[#00A1FF] absolute pointer-events-none" />}
                         </div>
                         <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">Lembrar-me (30 min)</span>
                       </label>
                       <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Lock size={10}/> Ambiente Seguro</span>
                     </div>
                     <button disabled={loading} className="w-full bg-[#00A1FF] text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-600 transition-all shadow-lg hover:shadow-blue-200 mt-4 flex items-center justify-center">
                       {loading ? <Loader2 className="animate-spin" /> : 'Acessar Plataforma'}
                     </button>
                   </form>
                   <div className="mt-10 text-center border-t border-slate-200 pt-6">
                      <p className="text-sm text-slate-500 font-medium">Novo na equipa clínica?</p>
                      <button onClick={() => setAuthMode('cadastro')} className="mt-2 text-[#00A1FF] font-black hover:text-blue-800 transition-colors">Solicitar Acesso ao Gestor</button>
                   </div>
                 </>
             ) : (
                 <>
                   <div className="mb-8 text-center lg:text-left mt-10 lg:mt-0">
                     <button onClick={() => setAuthMode('login')} className="mb-4 text-sm font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1 lg:justify-start justify-center mx-auto lg:mx-0"><ChevronLeft size={16}/> Voltar ao Login</button>
                     <h2 className="text-3xl font-black text-slate-900">Solicitar Acesso</h2>
                     <p className="text-slate-500 font-medium mt-2 text-sm">O seu pedido será revisto pelo Gestor Clínico.</p>
                   </div>
                   <form onSubmit={solicitarCadastro} className="space-y-4">
                     <input required type="text" placeholder="Nome Completo" className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] font-bold text-slate-800 text-sm shadow-sm" value={cadNome} onChange={e => setCadNome(e.target.value)} />
                     <div className="grid grid-cols-2 gap-3">
                       <select required className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] font-bold text-slate-800 text-sm shadow-sm" value={cadProfissao} onChange={e => setCadProfissao(e.target.value)}>
                         <option value="">Profissão...</option>
                         <option value="fisio">Fisioterapeuta</option>
                         <option value="to">Ter. Ocupacional</option>
                         <option value="recepcao">Recepção</option>
                       </select>
                       <input required type="text" placeholder="Nº de Registro" className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] font-bold text-slate-800 text-sm shadow-sm" value={cadRegistro} onChange={e => setCadRegistro(e.target.value)} />
                     </div>
                     <input required type="email" placeholder="E-mail Profissional" className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] font-bold text-slate-800 text-sm shadow-sm" value={cadEmail} onChange={e => setCadEmail(e.target.value)} />
                     <input required type="password" placeholder="Defina uma Senha" className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#00A1FF] font-bold text-slate-800 text-sm shadow-sm" value={cadSenha} onChange={e => setCadSenha(e.target.value)} />
                     
                     <button disabled={loading} className="w-full bg-[#0F214A] text-white py-4 rounded-xl font-black mt-2 hover:bg-[#00A1FF] transition-all flex justify-center shadow-lg">
                       {loading ? <Loader2 className="animate-spin" /> : 'Enviar Solicitação Segura'}
                     </button>
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
    <div className="fixed inset-0 flex flex-col md:flex-row overflow-hidden bg-[#fdfbff]">
      
      {tutorialStep >= 0 && currentTutorialStep && currentChapter && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className="bg-white max-w-sm w-full rounded-[32px] p-8 shadow-2xl relative animate-in zoom-in-95 duration-300 mt-16">
             <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 flex items-center justify-center animate-bounce z-50">
                <img src="/choquito.jpg" alt="Choquito" className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,161,255,0.6)]" />
             </div>
             <div className="mt-16 text-center">
                <div className="flex items-center justify-center gap-2 mb-4 bg-slate-50 p-2 rounded-full border border-slate-100 shadow-inner w-fit mx-auto">
                   <div className={`p-2 rounded-full ${currentChapter.color} ${currentChapter.textColor}`}><ListChecks size={14}/></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 px-2">{currentChapter.title}</span>
                </div>
                <h3 className="text-2xl font-black text-[#0F214A] mb-4 leading-tight">{currentTutorialStep.titulo}</h3>
                <p className="text-slate-600 font-medium leading-relaxed text-sm mb-8">{currentTutorialStep.texto}</p>
                <div className="flex gap-3 pt-2 border-t border-slate-100">
                  {tutorialStep > 0 && (
                    <button onClick={() => setTutorialStep(-1)} className="flex-1 py-3 text-slate-400 font-bold hover:bg-slate-50 rounded-xl transition-colors text-sm">Sair</button>
                  )}
                  <button onClick={avancarTutorial} className={`flex-[2] ${currentChapter.color} ${currentChapter.textColor} py-3 rounded-xl font-black hover:scale-105 transition-all shadow-lg text-sm`}>{currentTutorialStep.botao}</button>
                </div>
             </div>
          </div>
        </div>
      )}

      <aside onMouseEnter={() => setIsSidebarOpen(true)} onMouseLeave={() => setIsSidebarOpen(false)} className={`hidden md:flex bg-[#f3eff4] transition-all duration-500 flex-col z-50 border-r border-slate-200 ${isSidebarOpen ? 'w-48' : 'w-24'}`}>
        <div className="p-6 flex justify-center text-[#00A1FF] shrink-0">
          <HeartPulse size={32} className="animate-pulse" />
        </div>
        <nav className="flex-1 px-2 space-y-4 mt-4 overflow-y-auto custom-scrollbar">
          {menuItems.filter(item => hasAccess(item.roles)).map((item) => (
            <button key={item.id} onClick={() => navegarPara(item.id)} className={`w-full flex flex-col items-center justify-center p-3 rounded-2xl transition-all gap-1 ${currentView === item.id ? 'bg-[#e5f5ff] text-[#00A1FF]' : 'text-slate-500 hover:bg-[#ece7ed]'}`}>
              <item.icon size={currentView === item.id ? 28 : 24} className={currentView === item.id ? 'text-[#00A1FF]' : ''} />
              <span className={`text-[10px] font-black uppercase tracking-tighter transition-opacity duration-300 ${!isSidebarOpen ? 'opacity-0 h-0' : 'opacity-100'}`}>{item.label}</span>
            </button>
          ))}
        </nav>
        <button onClick={fazerLogout} className="p-6 text-red-400 hover:text-red-600 flex flex-col items-center gap-1">
          <LogOut size={20}/>
          {isSidebarOpen && <span className="text-[9px] font-black uppercase">Sair</span>}
        </button>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full">
        <header className="h-16 bg-[#fdfbff]/80 backdrop-blur-md flex items-center justify-between px-6 border-b border-slate-100 shrink-0 z-40">
           <span className="font-black text-[#00A1FF] uppercase tracking-tighter md:hidden">EVOLUTI</span>
           <div className="flex items-center gap-3">
              
              {/* BOTÃO DE SUGESTÃO PARA O DEV */}
              <a href="mailto:jeffersonosilva27@gmail.com?subject=Sugestão de Melhoria - Evoluti Fisio" target="_blank" rel="noopener noreferrer" className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#0F214A] hover:bg-[#00A1FF] text-white rounded-xl transition-colors shadow-sm border border-[#0F214A]" title="Enviar sugestão">
                 <Lightbulb size={14} className="text-yellow-400" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Sugestão</span>
              </a>

              <button onClick={iniciarTutorial} className="p-2 text-[#FFCC00] hover:bg-yellow-50 rounded-full transition-colors mr-2 hidden sm:flex items-center gap-2 bg-slate-50 px-3 shadow-sm border border-slate-100" title="Como funciona?">
                 <Zap size={18} className="fill-[#FFCC00]" />
                 <span className="text-[10px] font-black text-slate-700 uppercase">Guia</span>
              </button>
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black leading-none text-[#0F214A]">{user?.name || user?.nome || 'Equipe'}</p>
                <p className="text-[9px] text-[#00A1FF] font-bold uppercase mt-1">{user?.role?.replace('_', ' ')}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#0F214A] text-white flex items-center justify-center font-black text-xs capitalize">{(user?.name || user?.nome || 'U').charAt(0)}</div>
              <button onClick={fazerLogout} className="md:hidden p-2 text-red-500 hover:text-red-600 bg-red-50 rounded-full ml-1" title="Sair da Conta">
                 <LogOut size={18}/>
              </button>
           </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 pb-32 custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
           <div className="max-w-[1600px] mx-auto min-h-full">
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
            <button key={item.id} onClick={() => navegarPara(item.id)} className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all ${currentView === item.id ? 'text-[#00A1FF] scale-110' : 'text-slate-400'}`}>
              <div className={`p-2 rounded-xl transition-all ${currentView === item.id ? 'bg-[#e5f5ff]' : ''}`}><item.icon size={22} strokeWidth={currentView === item.id ? 2.5 : 2} /></div>
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
         ))}
      </nav>
    </div>
  );
}

export default function App() { return <ErrorBoundary><MainApp /></ErrorBoundary>; }