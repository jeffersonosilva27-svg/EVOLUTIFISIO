import React, { useState, useEffect, Component } from 'react';
import { 
  HeartPulse, LayoutDashboard, Calendar, Users, 
  Activity, DollarSign, Settings, LogOut, X, Menu, 
  ShieldCheck, Key, Loader2, Sparkles, Bell, Search 
} from 'lucide-react';

import { db } from './services/firebaseConfig';
import { collection, onSnapshot, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';

// IMPORTAÇÕES DAS VIEWS 
import Agenda from './views/Agenda'; 
import Pacientes from './views/Pacientes';
import Financeiro from './views/Financeiro';
import Avaliacoes from './views/Avaliacoes';
import Equipe from './views/Equipe';

// ========================================================
// 🛡️ ESCUDO ANTI-TELA BRANCA (ERROR BOUNDARY)
// ========================================================
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { 
    return { hasError: true, error }; 
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-6 text-center">
          <h1 className="text-3xl font-black text-red-600 mb-2">Ops! Ocorreu um erro técnico.</h1>
          <p className="text-slate-600 mb-6 font-medium">O escudo capturou o seguinte erro no sistema:</p>
          <pre className="bg-white p-6 rounded-2xl shadow-sm border border-red-200 text-red-800 text-sm max-w-3xl overflow-auto whitespace-pre-wrap font-mono text-left">
            {this.state.error?.toString()}
          </pre>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="mt-8 bg-red-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-red-700 transition-colors">
            Limpar Memória e Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainApp() {
  // 💾 INICIA O USER LENDO A MEMÓRIA DO NAVEGADOR (Evita deslogar no F5)
  const [user, setUser] = useState(() => {
    const salvo = localStorage.getItem('evoluti_user');
    return salvo ? JSON.parse(salvo) : null;
  }); 

  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Estados de Login
  const [authMode, setAuthMode] = useState('login'); 
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [showTrocaSenha, setShowTrocaSenha] = useState(false);
  
  // Estados de Cadastro
  const [cadNome, setCadNome] = useState('');
  const [cadProfissao, setCadProfissao] = useState('');
  const [cadRegistro, setCadRegistro] = useState('');
  const [cadEmail, setCadEmail] = useState('');
  const [cadSenha, setCadSenha] = useState('');

  const [pacientes, setPacientes] = useState([]);

  // --- LÓGICA DE AUTENTICAÇÃO BLINDADA ---
  const realizarLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const q = query(collection(db, "profissionais"), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        alert("Usuário não encontrado na base de dados.");
      } else {
        const docData = querySnapshot.docs[0].data();
        const userData = { id: querySnapshot.docs[0].id, ...docData, name: docData.nome || docData.name || 'Sem Nome' };
        
        if (userData.status === 'pendente') {
          alert("Seu cadastro está em análise. Aguarde a aprovação do gestor.");
        } else if (userData.senhaProvisoria === senha || userData.senhaReal === senha) {
          if (userData.precisaTrocarSenha) {
            setUser(userData);
            setShowTrocaSenha(true);
          } else {
            setUser(userData);
            localStorage.setItem('evoluti_user', JSON.stringify(userData)); // Salva na memória
          }
        } else {
          alert("Senha incorreta.");
        }
      }
    } catch (error) { alert("Erro de conexão com o banco de dados."); }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('evoluti_user');
    setUser(null);
  };

  const solicitarCadastro = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const q = query(collection(db, "profissionais"), where("email", "==", cadEmail));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        alert("Este e-mail já possui uma solicitação ativa.");
        setLoading(false); return;
      }
      await addDoc(collection(db, "profissionais"), {
        nome: cadNome, categoriaBase: cadProfissao, registro: cadRegistro, email: cadEmail,
        senhaProvisoria: cadSenha, precisaTrocarSenha: true, status: 'pendente', role: 'pendente', dataCadastro: new Date().toISOString()
      });
      alert("Cadastro solicitado com sucesso!");
      setAuthMode('login');
      setCadNome(''); setCadProfissao(''); setCadRegistro(''); setCadEmail(''); setCadSenha('');
    } catch (error) { alert("Erro ao enviar solicitação."); }
    setLoading(false);
  };

  const atualizarSenhaDefinitiva = async (e) => {
    e.preventDefault();
    await updateDoc(doc(db, "profissionais", user.id), { senhaReal: novaSenha, precisaTrocarSenha: false, senhaProvisoria: "" });
    setShowTrocaSenha(false);
    const updatedUser = { ...user, precisaTrocarSenha: false, senhaReal: novaSenha };
    setUser(updatedUser);
    localStorage.setItem('evoluti_user', JSON.stringify(updatedUser)); // Salva na memória
    alert("Senha ativada com sucesso!");
  };

  useEffect(() => {
    if (user && !showTrocaSenha) {
      const unsubscribe = onSnapshot(query(collection(db, "pacientes")), (snap) => {
        setPacientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsubscribe();
    }
  }, [user, showTrocaSenha]);

  // Função de segurança centralizada
  const hasAccess = (roles) => user && roles.includes(user.role);

  // ==========================================
  // RENDERIZAÇÃO DAS TELAS DE ACESSO (O LOGIN NATIVO ESTÁ AQUI)
  // ==========================================
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#fdfbff] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
           <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-400 blur-[120px] animate-pulse"></div>
           <div className="absolute bottom-[10%] -right-[10%] w-[40%] h-[60%] rounded-full bg-indigo-300 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="max-w-md w-full m3-card !p-0 border border-slate-200 z-10 shadow-2xl relative overflow-hidden">
          <div className="bg-[#005ac1] p-10 text-center text-white relative">
            <HeartPulse size={48} className="mx-auto mb-4 animate-bounce" style={{ animationDuration: '3s' }} />
            <h1 className="text-3xl font-black tracking-tight uppercase">EVOLUTI FISIO</h1>
            <p className="text-blue-100/80 text-sm mt-1">Gestão Clínica Inteligente</p>
          </div>

          <div className="p-8 bg-white">
            {authMode === 'login' && (
              <form onSubmit={realizarLogin} className="space-y-5 animate-in fade-in">
                <input required type="email" placeholder="E-mail" className="w-full p-4 bg-[#f3eff4] rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 font-bold text-slate-700" value={email} onChange={e => setEmail(e.target.value)} />
                <input required type="password" placeholder="Senha" className="w-full p-4 bg-[#f3eff4] rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 font-bold text-slate-700" value={senha} onChange={e => setSenha(e.target.value)} />
                <button disabled={loading} className="w-full bg-[#005ac1] text-white py-4 rounded-full font-black text-lg hover:bg-blue-800 transition-all flex justify-center items-center">
                  {loading ? <Loader2 className="animate-spin" /> : 'Acessar Plataforma'}
                </button>
                <div className="flex flex-col gap-3 pt-4 text-center text-sm font-medium border-t border-slate-100">
                  <button type="button" onClick={() => setAuthMode('cadastro')} className="text-slate-500 hover:text-blue-600">Primeiro acesso? Solicitar cadastro</button>
                </div>
              </form>
            )}

            {authMode === 'cadastro' && (
              <form onSubmit={solicitarCadastro} className="space-y-4 animate-in fade-in">
                <h2 className="text-xl font-black text-[#001a41] mb-2 text-center">Solicitação de Acesso</h2>
                <input required type="text" placeholder="Nome Completo" className="w-full p-3 bg-[#f3eff4] rounded-xl outline-none font-bold text-sm" value={cadNome} onChange={e => setCadNome(e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <select required className="w-full p-3 bg-[#f3eff4] rounded-xl outline-none font-bold text-sm" value={cadProfissao} onChange={e => setCadProfissao(e.target.value)}>
                    <option value="">Profissão...</option>
                    <option value="fisio">Fisioterapeuta</option>
                    <option value="to">TO</option>
                    <option value="recepcao">Recepção</option>
                  </select>
                  <input required type="text" placeholder="Registro Prof." className="w-full p-3 bg-[#f3eff4] rounded-xl outline-none font-bold text-sm" value={cadRegistro} onChange={e => setCadRegistro(e.target.value)} />
                </div>
                <input required type="email" placeholder="E-mail" className="w-full p-3 bg-[#f3eff4] rounded-xl outline-none font-bold text-sm" value={cadEmail} onChange={e => setCadEmail(e.target.value)} />
                <input required type="password" placeholder="Senha" className="w-full p-3 bg-[#f3eff4] rounded-xl outline-none font-bold text-sm" value={cadSenha} onChange={e => setCadSenha(e.target.value)} />
                <button disabled={loading} className="w-full bg-[#005ac1] text-white py-3.5 rounded-xl font-black hover:bg-blue-800 flex justify-center items-center">
                  {loading ? <Loader2 className="animate-spin" /> : 'Enviar Solicitação'}
                </button>
                <button type="button" onClick={() => setAuthMode('login')} className="w-full text-sm text-slate-500 font-bold pt-2">Voltar ao Login</button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (showTrocaSenha) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
         <div className="bg-white p-10 rounded-3xl max-w-md w-full shadow-2xl text-center">
           <ShieldCheck size={48} className="text-green-500 mx-auto mb-6" />
           <h2 className="text-2xl font-black text-slate-800 mb-2">Segurança de Acesso</h2>
           <p className="text-slate-500 mb-6 text-sm font-medium">Defina sua senha definitiva para acessar a plataforma.</p>
           <form onSubmit={atualizarSenhaDefinitiva} className="space-y-4">
             <input required type="password" placeholder="Nova Senha" className="w-full p-4 border-2 rounded-xl outline-none focus:border-green-500 font-bold" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} />
             <button className="w-full bg-green-600 text-white py-4 rounded-xl font-black hover:bg-green-700">Salvar e Acessar</button>
           </form>
         </div>
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO DA PLATAFORMA (LOGADO)
  // ==========================================
  return (
    <div className="h-screen flex overflow-hidden bg-[#fdfbff]">
      <aside className={`bg-[#f3eff4] transition-all duration-300 flex flex-col z-50 ${isSidebarOpen ? 'w-72' : 'w-20'} border-r border-slate-200`}>
        <div className="p-6 flex items-center gap-4 text-[#005ac1] shrink-0">
          <div className="bg-[#d8e2ff] p-2 rounded-xl shrink-0"><HeartPulse size={24}/></div>
          {isSidebarOpen && <span className="font-black text-xl tracking-tight uppercase">EVOLUTI FISIO</span>}
        </div>

        <nav className="flex-1 px-3 space-y-2 mt-4 overflow-y-auto">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Início', roles: ['any'] },
            { id: 'agenda', icon: Calendar, label: 'Agenda Global', roles: ['any'] },
            { id: 'pacientes', icon: Users, label: 'Prontuários', roles: ['any'] },
            { id: 'avaliacoes', icon: Activity, label: 'Escalas IA', roles: ['gestor_clinico', 'fisio', 'to'] },
            { id: 'financeiro', icon: DollarSign, label: 'Fluxo de Caixa', roles: ['gestor_clinico', 'admin_fin'] },
            { id: 'equipe', icon: Settings, label: 'Equipe e Acessos', roles: ['gestor_clinico'] },
          ].map((item) => (
            (item.roles.includes('any') || hasAccess(item.roles)) && (
              <button key={item.id} onClick={() => setCurrentView(item.id)} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${currentView === item.id ? 'bg-[#d8e2ff] text-[#001a41] font-black' : 'text-[#44474f] font-bold hover:bg-[#ece7ed]'}`}>
                <item.icon size={22} className={currentView === item.id ? 'text-[#005ac1]' : ''} />
                {isSidebarOpen && <span className="text-sm">{item.label}</span>}
              </button>
            )
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 shrink-0">
          <div className={`flex items-center gap-3 ${isSidebarOpen ? 'bg-white/50 p-3 rounded-2xl border border-slate-100' : 'justify-center'}`}>
            <div className="w-10 h-10 rounded-full bg-[#005ac1] text-white flex items-center justify-center font-black shrink-0">{user?.name?.charAt(0) || 'U'}</div>
            {isSidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-black truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-500 uppercase truncate font-bold mt-0.5">{user?.role?.replace('_', ' ')}</p>
              </div>
            )}
            {isSidebarOpen && <button onClick={handleLogout} title="Sair do Sistema" className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors"><LogOut size={18}/></button>}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-[#fdfbff] flex items-center justify-between px-8 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl"><Menu size={24}/></button>
            <div className="hidden md:flex items-center bg-[#f3eff4] px-4 py-2.5 rounded-full w-96">
              <Search size={18} className="text-slate-400 mr-2"/>
              <input type="text" placeholder="Busca rápida..." className="bg-transparent outline-none w-full text-sm font-medium" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto h-full">
            {currentView === 'dashboard' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <h1 className="text-4xl font-black text-[#1a1b1e]">Painel de Controle</h1>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Pacientes Base', val: pacientes.length },
                    { label: 'Sessões Hoje', val: '14' },
                    { label: 'Pendentes', val: '3' },
                    { label: 'Ocupação', val: '85%' },
                  ].map((stat, i) => (
                    <div key={i} className="m3-card shadow-sm border border-slate-100">
                      <p className="text-slate-500 text-[11px] font-black uppercase tracking-widest">{stat.label}</p>
                      <p className="text-4xl font-black text-slate-900 mt-2">{stat.val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {currentView === 'agenda' && <Agenda user={user} hasAccess={hasAccess} />}
            {currentView === 'pacientes' && <Pacientes pacientes={pacientes} hasAccess={hasAccess} user={user} />}
            {currentView === 'avaliacoes' && <Avaliacoes hasAccess={hasAccess} />}
            {currentView === 'financeiro' && <Financeiro user={user} />}
            {currentView === 'equipe' && <Equipe user={user} />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}