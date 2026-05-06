import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Calendar as CalendarIcon, FileText, Settings, LogOut, Activity, 
  Search, Plus, TrendingUp, DollarSign, BrainCircuit, CalendarDays, KeyRound,
  ShieldAlert, Clock, CheckCircle2, AlertCircle, Dumbbell, Target, History,
  DatabaseZap, Info, X, UserCog, UserCircle, Edit3, HeartPulse, Stethoscope
} from 'lucide-react';
import { auth, db } from './services/firebaseConfig';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  doc, setDoc, getDoc, collection, onSnapshot, query, orderBy, 
  where, addDoc, updateDoc
} from 'firebase/firestore';

// Componentes (Views)
import Agenda from './views/Agenda';
import Pacientes from './views/Pacientes';
import Financeiro from './views/Financeiro';
import Equipe from './views/Equipe';
import Avaliacoes from './views/Avaliacoes';

const APP_VERSION = "v1.5.0";
const SUPER_GESTOR_REGISTRO = "329099-F"; 

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inicio');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModalActive, setIsModalActive] = useState(false); 

  // Estado para o Tutorial Evo
  const [evoStep, setEvoStep] = useState(0);
  const [showEvo, setShowEvo] = useState(true);

  // Autogestão (Self-Service Profile)
  const [showPerfilModal, setShowPerfilModal] = useState(false);
  const [perfilForm, setPerfilForm] = useState({ nome: '', email: '', registro: '' });
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  // Estados Globais de Dados para o Dashboard
  const [agendamentosGlobais, setAgendamentosGlobais] = useState([]);
  const [pacientesGlobais, setPacientesGlobais] = useState([]);
  const [logsAuditoria, setLogsAuditoria] = useState([]);

  // Estados de Login/Registro
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [registro, setRegistro] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [clinicasSelecionadas, setClinicasSelecionadas] = useState([]);
  const [authError, setAuthError] = useState('');

  const isSuperGestor = user?.registro === SUPER_GESTOR_REGISTRO;

  // MOTOR DE AUDITORIA (LOGS)
  const registrarLog = async (acao, detalhes) => {
    if (!user || !user.uid) return;
    try {
        await addDoc(collection(db, "logs"), {
            usuarioId: user.uid,
            usuarioNome: user.nome,
            usuarioRegistro: user.registro || 'N/A',
            acao,
            detalhes,
            data: new Date().toISOString()
        });
    } catch (e) {
        console.error("Erro ao gravar log:", e);
    }
  };

  const temAcessoClinica = (itemClinicaVinculo) => {
    if (!user || !user.clinicasAcesso || !itemClinicaVinculo) return false;
    const vinculoArray = Array.isArray(itemClinicaVinculo) ? itemClinicaVinculo : [itemClinicaVinculo];
    return vinculoArray.some(c => user.clinicasAcesso.includes(c));
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "usuarios", currentUser.uid));
        if (userDoc.exists()) {
          const userData = { uid: currentUser.uid, ...userDoc.data() };
          setUser(userData);
          setPerfilForm({ nome: userData.nome, email: userData.email, registro: userData.registro || '' });
        } else {
          setUser({ uid: currentUser.uid, email: currentUser.email, role: 'pendente' });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || user.role === 'pendente' || user.role === 'oculto') return;

    const unsubAgendamentos = onSnapshot(query(collection(db, "agendamentos")), (snap) => {
      const todosAgendamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const agendamentosFiltrados = todosAgendamentos.filter(ag => temAcessoClinica(ag.clinicaVinculo));
      setAgendamentosGlobais(agendamentosFiltrados);
    });

    const unsubPacientes = onSnapshot(query(collection(db, "pacientes")), (snap) => {
      const todosPacientes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const pacientesFiltrados = todosPacientes.filter(pac => temAcessoClinica(pac.clinicaVinculo));
      setPacientesGlobais(pacientesFiltrados);
    });

    let unsubLogs = () => {};
    if (isSuperGestor) {
        unsubLogs = onSnapshot(query(collection(db, "logs"), orderBy("data", "desc")), (snap) => {
            setLogsAuditoria(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    }

    return () => {
      unsubAgendamentos();
      unsubPacientes();
      unsubLogs();
    };
  }, [user]);

  // MOTOR DE PUSH NOTIFICATIONS
  useEffect(() => {
    if (!user || user.role === 'pendente') return;
    
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    const qAgenda = query(collection(db, "agendamentos"), where("profissionalId", "==", user.uid));
    
    const unsubNotificacoes = onSnapshot(qAgenda, (snapshot) => {
       snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
             const ag = change.doc.data();
             const agData = new Date(ag.data);
             if (agData >= hoje && change.doc.metadata.hasPendingWrites === false) {
                 if (Notification.permission === 'granted') {
                     new Notification("Novo Agendamento! 📅", {
                         body: `${ag.pacienteNome} foi agendado para si.`,
                         icon: "/favicon.ico" 
                     });
                 }
             }
          }
          if (change.type === 'modified') {
              const agAntes = change.doc.data();
              if (agAntes.status === 'cancelado') {
                  if (Notification.permission === 'granted') {
                     new Notification("Sessão Cancelada ⚠️", {
                         body: `A sessão de ${agAntes.pacienteNome} foi cancelada.`,
                         icon: "/favicon.ico" 
                     });
                 }
              }
          }
       });
    });

    return () => unsubNotificacoes();
  }, [user]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (clinicasSelecionadas.length === 0) {
            return setAuthError("Selecione pelo menos uma clínica de atuação.");
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "usuarios", userCredential.user.uid), {
          nome,
          email,
          registro,
          clinicasAcesso: clinicasSelecionadas,
          role: 'pendente',
          dataCadastro: new Date().toISOString()
        });
      }
    } catch (error) {
      setAuthError('Erro na autenticação. Verifique os seus dados.');
      console.error(error);
    }
  };

  const toggleClinicaSelecionada = (clinica) => {
      setClinicasSelecionadas(prev => 
          prev.includes(clinica) ? prev.filter(c => c !== clinica) : [...prev, clinica]
      );
  };

  const salvarPerfil = async () => {
      if(!perfilForm.nome.trim()) return alert("O nome não pode estar vazio.");
      setSalvandoPerfil(true);
      try {
          await updateDoc(doc(db, "usuarios", user.uid), {
              nome: perfilForm.nome,
              registro: perfilForm.registro
          });
          
          if (auth.currentUser) {
              await updateProfile(auth.currentUser, { displayName: perfilForm.nome });
          }

          setUser(prev => ({ ...prev, nome: perfilForm.nome, registro: perfilForm.registro }));
          registrarLog("Edição de Perfil", "O usuário atualizou os seus próprios dados cadastrais.");
          
          alert("Perfil atualizado com sucesso!");
          setShowPerfilModal(false);
      } catch (e) {
          alert("Erro ao atualizar o perfil.");
          console.error(e);
      }
      setSalvandoPerfil(false);
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // TELA DE LOGIN / REGISTRO COM NOVO DESIGN PACIENTE-LIKE
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 animate-in fade-in duration-700">
        <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
          
          {/* Cabeçalho do Card (Estilo Pacientes) */}
          <div className="p-8 bg-slate-900 text-white flex flex-col items-center justify-center text-center">
             <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl rotate-3">
               <Activity size={40} className="text-white animate-pulse" />
             </div>
             <h1 className="text-4xl font-black tracking-tight">Evoluti Fisio</h1>
             <p className="text-blue-200 mt-2 font-medium text-sm">Gestão Clínica de Alta Performance</p>
          </div>

          {/* Corpo do Formulário */}
          <div className="p-8 flex-1 bg-white">
            <h2 className="text-2xl font-black text-slate-800 mb-6 text-center">
              {isLogin ? 'Iniciar Sessão' : 'Criar Conta'}
            </h2>
            
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block tracking-widest">Nome Completo</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-4 rounded-2xl outline-none focus:border-blue-500 font-bold transition-all"
                      placeholder="Dr. João Silva"
                      value={nome} 
                      onChange={e => setNome(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block tracking-widest">CREFITO / Registro (Opcional)</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-4 rounded-2xl outline-none focus:border-blue-500 font-bold transition-all"
                      placeholder="Ex: 123456-F"
                      value={registro} 
                      onChange={e => setRegistro(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block tracking-widest">Clínica de Atuação (Obrigatório)</label>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => toggleClinicaSelecionada('vida')} className={`flex-1 py-3 rounded-2xl font-bold border-2 transition-all ${clinicasSelecionadas.includes('vida') ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300'}`}>
                            Clínica Vida
                        </button>
                        <button type="button" onClick={() => toggleClinicaSelecionada('reabtech')} className={`flex-1 py-3 rounded-2xl font-bold border-2 transition-all ${clinicasSelecionadas.includes('reabtech') ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300'}`}>
                            Reabtech / Relief
                        </button>
                    </div>
                  </div>
                </>
              )}
              
              <div>
                 <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block tracking-widest">E-mail Profissional</label>
                 <input 
                  type="email" 
                  required 
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-4 rounded-2xl outline-none focus:border-blue-500 font-bold transition-all"
                  placeholder="seu@email.com"
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                />
              </div>
              
              <div>
                 <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block tracking-widest">Palavra-passe</label>
                 <input 
                  type="password" 
                  required 
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-4 rounded-2xl outline-none focus:border-blue-500 font-bold transition-all"
                  placeholder="••••••••"
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                />
              </div>

              {authError && <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-xl border border-red-100">{authError}</p>}
              
              <button 
                type="submit" 
                className="w-full bg-[#0F214A] hover:bg-blue-700 text-white font-black p-4 rounded-2xl mt-4 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {isLogin ? 'Entrar no Sistema' : 'Registar Conta'}
              </button>
            </form>
          </div>
          
          {/* Rodapé do Card */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 text-center flex flex-col items-center justify-center gap-2">
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors"
            >
              {isLogin ? 'Não tem conta? Registe-se' : 'Já tem conta? Iniciar Sessão'}
            </button>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest border border-slate-200 px-3 py-1 rounded-full mt-2">
              {APP_VERSION}
            </span>
          </div>

        </div>
      </div>
    );
  }

  if (user.role === 'pendente') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-[32px] shadow-xl max-w-md text-center border border-slate-200">
          <ShieldAlert className="w-20 h-20 text-amber-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-slate-800 mb-2">Conta em Análise</h2>
          <p className="text-slate-600 font-medium mb-8">A sua conta foi criada com sucesso, mas precisa ser aprovada por um Gestor antes de acessar o sistema.</p>
          <button onClick={handleLogout} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black w-full hover:bg-slate-800 transition-colors">
            Sair e Voltar mais tarde
          </button>
        </div>
      </div>
    );
  }

  if (user.role === 'oculto') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Activity className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Acesso suspenso.</p>
          <button onClick={handleLogout} className="mt-4 text-blue-500 font-bold">Voltar</button>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: 'inicio', label: 'Início', icon: Activity },
    { id: 'agenda', label: 'Agenda', icon: CalendarDays },
    { id: 'pacientes', label: 'Pacientes', icon: Users },
    { id: 'avaliacoes', label: 'Avaliações Clínicas', icon: FileText },
    { id: 'financeiro', label: user.role === 'recepcao' ? 'Estoque' : 'Caixa & Estoque', icon: DollarSign },
    ...(user.role === 'gestor_clinico' ? [{ id: 'equipe', label: 'Equipe', icon: Settings }] : [])
  ];

  // GUIÕES DO TUTORIAL EVO
  const tutoriais = {
      gestor_clinico: [
          { msg: "Olá! Sou o Evo. Como Gestor, você tem visão total. No 'Início', acompanha os totais da clínica, cancelamentos críticos e a sua fila de pacientes (se atender)." },
          { msg: "Em 'Agenda', você controla as marcações de toda a equipe e vê bolinhas piscantes nas sessões pendentes de evolução." },
          { msg: "Em 'Pacientes', o prontuário é completo: Evoluções SOAP, Planejamento de Conduta Global e a nova aba de Dashboards de Escalas." },
          { msg: "Em 'Caixa & Estoque', o fluxo de caixa é gerado dinamicamente pela agenda. Use o botão do Olho para censurar valores perto de clientes." },
          { msg: "E na 'Equipe', você edita acessos e exporta o Backup Global do Firebase. Explore o sistema!" }
      ],
      recepcao: [
          { msg: "Olá! Sou o Evo. No seu painel de 'Início', você acompanha a Fila de Chegada da recepção e os totais operacionais do dia." },
          { msg: "Em 'Agenda', você marca e desmarca pacientes. Para agendar várias sessões de uma vez, use o botão 'Em Lote' no topo do formulário." },
          { msg: "Em 'Pacientes', você atualiza cadastros e pode gerar PDFs de cobrança na aba Financeira do paciente." },
          { msg: "Em 'Estoque', lance os insumos consumidos. Não se preocupe, a visão financeira (valores em R$) está oculta para o seu perfil. Bom trabalho!" }
      ],
      saude: [
          { msg: "Olá! Sou o Evo, seu assistente clínico. Aqui no 'Início', você vê o seu Carrossel de Próximos Pacientes (arraste para os lados)." },
          { msg: "Na 'Agenda', você vê a sua programação. Bolinhas vermelhas piscando significam que você esqueceu de preencher a evolução daquela sessão!" },
          { msg: "Em 'Pacientes', na aba Plano de Tratamento, você busca exercícios do nosso Banco Global e agenda a conduta. Na aba Evolução, clique no botão para puxar essa conduta automaticamente!" },
          { msg: "E nas 'Avaliações Clínicas', escolha testes validados (ex: TUG, Berg) e salve os resultados direto no Dashboard do paciente. Boa sorte!" }
      ]
  };

  const myTutorial = tutoriais[user.role] || tutoriais['saude'];

  const renderDashboard = () => {
    const hojeDate = new Date();
    hojeDate.setHours(0,0,0,0);
    const agendamentosHoje = agendamentosGlobais.filter(ag => {
        const d = new Date(ag.data);
        d.setHours(0,0,0,0);
        return d.getTime() === hojeDate.getTime();
    });

    const faturamentoBruto = agendamentosHoje.reduce((acc, curr) => {
        if(curr.status === 'realizado') {
            const pac = pacientesGlobais.find(p => p.id === curr.pacienteId);
            const valor = curr.valorSessao ? parseFloat(curr.valorSessao) : (pac ? parseFloat(pac.valorBase || 0) : 0);
            return acc + valor;
        }
        return acc;
    }, 0);

    const totalCancelamentos = agendamentosGlobais.filter(ag => ag.status === 'cancelado').length;
    const proximosPendentesMeus = agendamentosGlobais.filter(ag => ag.profissionalId === user.uid && new Date(ag.data) >= hojeDate && ag.status !== 'realizado' && ag.status !== 'cancelado').sort((a,b) => new Date(a.data) - new Date(b.data));

    // Lógica do Carrossel (Fila Pessoal)
    const [indiceFila, setIndiceFila] = useState(0);
    const proximoPaciente = proximosPendentesMeus[indiceFila];
    
    const podeIniciarAtendimento = () => {
        if (!proximoPaciente) return false;
        const horaSessao = new Date(proximoPaciente.data).getTime();
        const agora = new Date().getTime();
        return agora >= horaSessao; 
    };

    const isRecepcao = user.role === 'recepcao';

    return (
      <div className="space-y-10 animate-in fade-in duration-500">
        <header>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Painel de Controle</h1>
          <p className="text-slate-500 font-medium mt-1">Bem-vindo(a) de volta, {user.nome.split(' ')[0]}!</p>
        </header>

        {isRecepcao && (
            <div className="space-y-8">
               <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-4"><Users className="text-blue-600"/> Visão Operacional (Recepção)</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Total de Sessões Hoje</p>
                    <h4 className="text-5xl font-black text-slate-800">{agendamentosHoje.length}</h4>
                    <Activity className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-50 opacity-50" />
                  </div>
                  <div className="bg-slate-900 text-white p-8 rounded-[32px] shadow-xl relative overflow-hidden">
                    <p className="text-[10px] font-black text-blue-300 uppercase mb-2">Concluídos</p>
                    <h4 className="text-5xl font-black">{agendamentosHoje.filter(a => a.status === 'realizado').length}</h4>
                    <CheckCircle2 className="absolute -right-4 -bottom-4 w-24 h-24 text-white opacity-10" />
                  </div>
                  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Insumos Lançados Hoje</p>
                    <h4 className="text-5xl font-black text-slate-800 text-center">-</h4>
                  </div>
               </div>

               <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-200">
                  <h4 className="font-black text-slate-800 mb-6 flex items-center gap-2"><Clock size={20} className="text-amber-500"/> Fila de Chegada (Clínica)</h4>
                  <div className="space-y-4">
                     {agendamentosHoje.filter(a => a.status === 'agendado').slice(0, 5).map(ag => (
                        <div key={ag.id} className="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-100 shadow-sm">
                           <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center font-black text-amber-600">
                                {new Date(ag.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute:'2-digit' })}
                             </div>
                             <div>
                                <h5 className="font-black text-slate-800">{ag.pacienteNome}</h5>
                                <p className="text-xs font-bold text-slate-400">Com: {ag.profissionalNome}</p>
                             </div>
                           </div>
                           <button onClick={() => setActiveTab('agenda')} className="text-blue-600 font-black text-xs bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors">
                              Ir p/ Agenda
                           </button>
                        </div>
                     ))}
                     {agendamentosHoje.filter(a => a.status === 'agendado').length === 0 && (
                         <p className="text-slate-400 text-sm font-bold text-center py-6">Nenhum paciente aguardando no momento.</p>
                     )}
                  </div>
               </div>
            </div>
        )}

        {!isRecepcao && (
            <div className="space-y-8">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-4"><Stethoscope className="text-blue-600"/> Suas Atividades Clínicas Pessoais</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-gradient-to-br from-[#0F214A] to-blue-900 rounded-[32px] p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[300px] text-white">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-1">Seu Próximo Paciente</p>
                                {proximoPaciente ? (
                                    <>
                                        <h3 className="text-4xl font-black mb-1">{proximoPaciente.pacienteNome}</h3>
                                        <p className="text-blue-300 font-medium text-sm">
                                            {new Date(proximoPaciente.data).toLocaleDateString('pt-BR')} às {new Date(proximoPaciente.data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                                        </p>
                                    </>
                                ) : (
                                    <h3 className="text-2xl font-black">Fila Livre!</h3>
                                )}
                            </div>
                            
                            {proximosPendentesMeus.length > 1 && (
                                <div className="flex items-center gap-2 bg-white/10 rounded-full p-1 border border-white/20">
                                   <button onClick={() => setIndiceFila(prev => Math.max(0, prev - 1))} disabled={indiceFila === 0} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 disabled:opacity-30 transition-colors">&larr;</button>
                                   <span className="text-xs font-black px-2">{indiceFila + 1} / {proximosPendentesMeus.length}</span>
                                   <button onClick={() => setIndiceFila(prev => Math.min(proximosPendentesMeus.length - 1, prev + 1))} disabled={indiceFila === proximosPendentesMeus.length - 1} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 disabled:opacity-30 transition-colors">&rarr;</button>
                                </div>
                            )}
                        </div>

                        {proximoPaciente && (
                            <div className="bg-white/10 border border-white/20 p-4 rounded-2xl mb-6 backdrop-blur-sm">
                                <h4 className="text-xs font-black text-blue-200 uppercase mb-3 flex items-center gap-2">
                                    {proximoPaciente.condutaModulada ? <Target size={14} className="text-amber-400"/> : <Dumbbell size={14}/>} 
                                    {proximoPaciente.condutaModulada ? 'Conduta Modulada p/ Sessão' : 'Plano de Tratamento Vigente'}
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {proximoPaciente.condutaModulada ? (
                                        proximoPaciente.condutaModulada.map((c, idx) => (
                                            <span key={idx} className="text-xs font-bold bg-white/20 px-3 py-1.5 rounded-lg border border-white/10">{c.nome}</span>
                                        ))
                                    ) : (
                                        <span className="text-xs font-medium opacity-80 italic">Abra o prontuário para revisar o plano completo.</span>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4 relative z-10">
                            <button 
                                onClick={() => setActiveTab('pacientes')}
                                disabled={!proximoPaciente}
                                className={`flex-1 ${podeIniciarAtendimento() ? 'bg-green-500 hover:bg-green-400 text-white' : 'bg-white hover:bg-slate-50 text-slate-900'} py-4 rounded-2xl font-black flex justify-center items-center gap-2 transition-all disabled:opacity-50`}
                            >
                                <Search size={18}/> {podeIniciarAtendimento() ? 'Iniciar Atendimento' : 'Preparar Atendimento'}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        <button onClick={() => setActiveTab('agenda')} className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex-1 flex flex-col justify-center text-left hover:border-blue-500 transition-colors group">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Suas Sessões Hoje</p>
                            <h4 className="text-4xl font-black text-slate-800">{proximosPendentesMeus.filter(ag => new Date(ag.data).getTime() >= hojeDate.getTime() && new Date(ag.data).getTime() < hojeDate.getTime() + 86400000).length}</h4>
                            <p className="text-xs font-bold text-blue-600 mt-2 flex items-center gap-1 group-hover:translate-x-1 transition-transform">Ver na Agenda &rarr;</p>
                        </button>
                        <button onClick={() => setActiveTab('agenda')} className="bg-amber-50 p-8 rounded-[32px] border border-amber-100 shadow-sm flex-1 flex flex-col justify-center text-left hover:border-amber-300 transition-colors group">
                            <p className="text-[10px] font-black text-amber-600 uppercase mb-2 flex items-center gap-1"><AlertCircle size={14}/> Evoluções Atrasadas</p>
                            <h4 className="text-4xl font-black text-amber-900">
                                {agendamentosGlobais.filter(ag => ag.profissionalId === user.uid && ag.status === 'agendado' && new Date(ag.data).getTime() < new Date().getTime()).length}
                            </h4>
                            <p className="text-xs font-bold text-amber-700 mt-2 flex items-center gap-1 group-hover:translate-x-1 transition-transform">Resolver pendências &rarr;</p>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {user.role === 'gestor_clinico' && (
            <div className="space-y-8 mt-12 pt-8 border-t border-slate-200">
               <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-4"><TrendingUp className="text-blue-600"/> Visão Geral (Gestão)</h3>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Sessões Realizadas Hoje</p>
                    <h4 className="text-4xl font-black text-slate-800">{agendamentosHoje.filter(a => a.status === 'realizado').length}</h4>
                    <Activity className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-50 opacity-50" />
                  </div>
                  
                  <div className="bg-slate-900 text-white p-8 rounded-[32px] shadow-xl relative overflow-hidden">
                    <p className="text-[10px] font-black text-blue-300 uppercase mb-2">Faturamento Hoje</p>
                    <h4 className="text-4xl font-black">R$ ****</h4>
                    <p className="text-xs font-bold text-slate-400 mt-2">Visite o painel financeiro para revelar</p>
                  </div>

                  <div className="bg-red-50 border border-red-100 p-8 rounded-[32px] shadow-sm flex flex-col justify-center">
                      <p className="text-[10px] font-black text-red-500 uppercase mb-2 flex items-center gap-1"><AlertCircle size={14}/> Faltas Críticas (Mês)</p>
                      <h4 className="text-4xl font-black text-red-900">
                         {agendamentosGlobais.filter(ag => ag.status === 'cancelado' && ['Falta sem justificativa', 'Cancelamento <24 Horas'].includes(ag.motivoCancelamento)).length}
                      </h4>
                      <p className="text-xs font-bold text-red-600 mt-2 cursor-pointer hover:underline">Ver Relatório Detalhado</p>
                  </div>
               </div>
            </div>
        )}

        {isSuperGestor && (
            <div className="space-y-8 mt-12 pt-8 border-t border-slate-200">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-4"><KeyRound className="text-blue-600"/> Painel Super Gestor (Master)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900 rounded-[32px] p-8 shadow-xl text-white">
                        <h4 className="font-black flex items-center gap-2 mb-6"><ShieldAlert className="text-amber-400"/> Logs de Auditoria</h4>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {logsAuditoria.length === 0 ? (
                                <p className="text-slate-400 text-sm">Nenhum log registrado ainda.</p>
                            ) : (
                                logsAuditoria.map(log => (
                                    <div key={log.id} className="bg-white/5 border border-white/10 p-4 rounded-xl">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-black text-blue-300">{log.acao}</span>
                                            <span className="text-[10px] font-bold text-slate-400">{new Date(log.data).toLocaleString('pt-BR')}</span>
                                        </div>
                                        <p className="text-sm font-medium text-slate-300">{log.detalhes}</p>
                                        <p className="text-[10px] font-bold text-slate-500 mt-2 block">Por: {log.usuarioNome} (CREFITO: {log.usuarioRegistro})</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                        <DatabaseZap size={48} className="text-slate-300 mb-4"/>
                        <h4 className="font-black text-slate-800 text-xl mb-2">Controle de Privilégios</h4>
                        <p className="text-sm font-medium text-slate-500 mb-6">A gestão de cargos e reset de senhas da equipe está 100% liberada na aba Equipe para o seu usuário (Master).</p>
                        <button onClick={() => setActiveTab('equipe')} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-6 py-3 rounded-xl font-black transition-colors">Gerenciar Equipe</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-[100dvh] bg-slate-50 overflow-hidden text-slate-900 font-sans selection:bg-blue-200">
      
      {/* Menu Lateral (Desktop) */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 text-slate-300 p-6 shadow-2xl relative z-20">
        <div className="flex items-center gap-3 text-white mb-12 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Activity size={24} className="text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight">Evoluti</span>
        </div>
        
        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-bold transition-all duration-300 ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50' 
                  : 'hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-blue-200' : 'text-slate-500'} />
              {item.label}
            </button>
          ))}
        </nav>
        
        <div className="mt-auto border-t border-white/10 pt-6 flex flex-col gap-2">
           <div className="flex items-center justify-between mb-4">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{APP_VERSION}</span>
               <button onClick={() => setShowPerfilModal(true)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><UserCog size={18}/></button>
           </div>
        </div>
      </aside>

      {/* Menu Inferior (Mobile) - Oculta automaticamente se um Modal estiver ativo */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-[100] transition-transform duration-300 h-16 ${isModalActive ? 'translate-y-full' : 'translate-y-0'}`}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center w-full rounded-xl transition-colors ${
              activeTab === item.id ? 'text-blue-600' : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            <item.icon size={20} className="mb-0.5" />
            <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Área Principal */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50 relative">
        <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-3">
             <div className="md:hidden w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <Activity size={18} className="text-white" />
             </div>
             <span className="font-black text-slate-800 hidden md:block uppercase tracking-widest text-xs bg-slate-100 px-3 py-1 rounded-lg">Unidade: {user.clinicasAcesso?.join(' & ').toUpperCase()}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div 
                onClick={() => setShowPerfilModal(true)}
                className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition-colors"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-slate-900">{user.nome}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{user.role.replace('_', ' ')}</p>
              </div>
              <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-black shadow-md border-2 border-white">
                {user.nome.charAt(0)}
              </div>
            </div>
            
            <button 
                onClick={handleLogout} 
                className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold transition-all ml-2 border border-red-100"
                title="Sair do Sistema"
            >
                <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Modal de Self-Service Profile */}
        {showPerfilModal && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
                <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-2xl flex items-center gap-2"><UserCircle className="text-blue-600"/> Meu Perfil</h3>
                        <button onClick={() => setShowPerfilModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Nome Completo</label>
                            <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800" value={perfilForm.nome} onChange={e => setPerfilForm({...perfilForm, nome: e.target.value})}/>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">E-mail (Acesso)</label>
                            <input type="text" disabled className="w-full p-4 bg-slate-100 border border-slate-200 rounded-2xl font-bold text-slate-400 cursor-not-allowed" value={perfilForm.email}/>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Registro / CREFITO</label>
                            <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800" value={perfilForm.registro} onChange={e => setPerfilForm({...perfilForm, registro: e.target.value})}/>
                        </div>

                        <button onClick={salvarPerfil} disabled={salvandoPerfil} className="w-full bg-[#0F214A] text-white font-black py-4 rounded-2xl mt-4 hover:bg-blue-700 transition-colors">
                            {salvandoPerfil ? 'Salvando...' : 'Atualizar Meus Dados'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative">
          <div className="max-w-7xl mx-auto h-full pb-48"> 
            {activeTab === 'inicio' && renderDashboard()}
            {activeTab === 'agenda' && <Agenda user={user} setIsModalActive={setIsModalActive} registrarLog={registrarLog} temAcessoClinica={temAcessoClinica} />}
            {activeTab === 'pacientes' && <Pacientes user={user} setIsModalActive={setIsModalActive} registrarLog={registrarLog} temAcessoClinica={temAcessoClinica} />}
            {activeTab === 'financeiro' && <Financeiro user={user} registrarLog={registrarLog} temAcessoClinica={temAcessoClinica} />}
            {activeTab === 'equipe' && user.role === 'gestor_clinico' && <Equipe user={user} registrarLog={registrarLog} />}
            {activeTab === 'avaliacoes' && <Avaliacoes user={user} />}
          </div>
        </div>

        {showEvo && (
            <div className="fixed bottom-24 md:bottom-10 right-4 md:right-10 z-[150] flex flex-col items-end animate-in slide-in-from-bottom-10 fade-in duration-500">
                <div className="bg-white border-2 border-blue-100 p-6 rounded-[32px] rounded-br-none shadow-2xl max-w-[300px] mb-4 relative">
                   <button onClick={() => setShowEvo(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={16}/></button>
                   <p className="text-sm font-bold text-slate-700 leading-relaxed mb-4 pr-4">{myTutorial[evoStep].msg}</p>
                   <div className="flex justify-between items-center">
                       <div className="flex gap-1">
                          {myTutorial.map((_, i) => (
                             <div key={i} className={`w-2 h-2 rounded-full ${i === evoStep ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                          ))}
                       </div>
                       {evoStep < myTutorial.length - 1 ? (
                           <button onClick={() => setEvoStep(prev => prev + 1)} className="text-xs font-black bg-blue-50 text-blue-600 px-4 py-2 rounded-xl hover:bg-blue-100">Próximo</button>
                       ) : (
                           <button onClick={() => setShowEvo(false)} className="text-xs font-black bg-[#0F214A] text-white px-4 py-2 rounded-xl">Entendi!</button>
                       )}
                   </div>
                </div>
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50 border-4 border-white cursor-pointer hover:scale-110 transition-transform" onClick={() => setShowEvo(!showEvo)}>
                    <BrainCircuit size={32} className="text-white"/>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}