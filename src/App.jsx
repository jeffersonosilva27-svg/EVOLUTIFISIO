import React, { useState, useEffect } from 'react';
import { 
  HeartPulse, LayoutDashboard, Calendar, Users, 
  Activity, DollarSign, Settings, LogOut, X, Menu, 
  ShieldCheck, Mail, Key, Loader2, Sparkles, Bell, Search 
} from 'lucide-react';

import { db } from './services/firebaseConfig';
import { collection, onSnapshot, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

import Agenda from './views/Agenda'; 
import Pacientes from './views/Pacientes';
import Financeiro from './views/Financeiro';
import Avaliacoes from './views/Avaliacoes';
import Equipe from './views/Equipe';

export default function App() {
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [showTrocaSenha, setShowTrocaSenha] = useState(false);
  const [pacientes, setPacientes] = useState([]);

  const realizarLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const q = query(collection(db, "profissionais"), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        alert("Usuário não encontrado.");
      } else {
        const docData = querySnapshot.docs[0].data();
        const userData = { id: querySnapshot.docs[0].id, ...docData, name: docData.nome || docData.name };
        if (userData.senhaProvisoria === senha || userData.senhaReal === senha) {
          userData.precisaTrocarSenha ? setShowTrocaSenha(true) : setUser(userData);
          if (userData.precisaTrocarSenha) setUser(userData);
        } else alert("Senha incorreta.");
      }
    } catch (error) { alert("Erro de conexão."); }
    setLoading(false);
  };

  const atualizarSenhaDefinitiva = async (e) => {
    e.preventDefault();
    await updateDoc(doc(db, "profissionais", user.id), { senhaReal: novaSenha, precisaTrocarSenha: false, senhaProvisoria: "" });
    setShowTrocaSenha(false);
    alert("Senha definida!");
  };

  useEffect(() => {
    if (user && !showTrocaSenha) {
      const unsubscribe = onSnapshot(query(collection(db, "pacientes")), (snap) => {
        setPacientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsubscribe();
    }
  }, [user, showTrocaSenha]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#fdfbff]">
        <div className="max-w-md w-full m3-card !p-0 overflow-hidden border border-slate-200">
          <div className="bg-[#005ac1] p-10 text-center text-white">
            <HeartPulse size={48} className="mx-auto mb-4" />
            <h1 className="text-3xl font-bold tracking-tight">PhysioFlow</h1>
            <p className="text-blue-100/80 text-sm mt-1">Material 3 Design System</p>
          </div>
          <form onSubmit={realizarLogin} className="p-8 space-y-5">
            <input required type="email" placeholder="E-mail" className="w-full p-4 bg-[#f3eff4] rounded-2xl outline-none focus:ring-2 focus:ring-[#005ac1]" value={email} onChange={e => setEmail(e.target.value)} />
            <input required type="password" placeholder="Senha" className="w-full p-4 bg-[#f3eff4] rounded-2xl outline-none focus:ring-2 focus:ring-[#005ac1]" value={senha} onChange={e => setSenha(e.target.value)} />
            <button className="w-full bg-[#005ac1] text-white py-4 rounded-full font-bold text-lg hover:shadow-lg transition-all">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  const hasAccess = (roles) => user && roles.includes(user.role);

  return (
    <div className="h-screen flex overflow-hidden bg-[#fdfbff]">
      {/* SIDEBAR M3 - Fixed Rail/Drawer Navigation */}
      <aside className={`bg-[#f3eff4] transition-all duration-300 flex flex-col z-50 ${isSidebarOpen ? 'w-72' : 'w-20'} border-r border-slate-200`}>
        <div className="p-6 flex items-center gap-4 text-[#005ac1]">
          <div className="bg-[#d8e2ff] p-2 rounded-xl"><HeartPulse size={24}/></div>
          {isSidebarOpen && <span className="font-black text-xl tracking-tight">PhysioFlow</span>}
        </div>

        <nav className="flex-1 px-3 space-y-2 mt-4 overflow-y-auto">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Início', roles: ['any'] },
            { id: 'agenda', icon: Calendar, label: 'Agenda Global', roles: ['any'] },
            { id: 'pacientes', icon: Users, label: 'Prontuários', roles: ['any'] },
            { id: 'avaliacoes', icon: Activity, label: 'Escalas IA', roles: ['gestor_clinico', 'fisio', 'to'] },
            { id: 'financeiro', icon: DollarSign, label: 'Fluxo de Caixa', roles: ['gestor_clinico', 'admin_fin'] },
            { id: 'equipe', icon: Settings, label: 'Configurações', roles: ['gestor_clinico'] },
          ].map((item) => (
            (item.roles.includes('any') || hasAccess(item.roles)) && (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                  currentView === item.id 
                  ? 'bg-[#d8e2ff] text-[#001a41] font-bold' 
                  : 'text-[#44474f] hover:bg-[#ece7ed]'
                }`}
              >
                <item.icon size={22} className={currentView === item.id ? 'text-[#005ac1]' : ''} />
                {isSidebarOpen && <span className="text-sm">{item.label}</span>}
              </button>
            )
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className={`flex items-center gap-3 ${isSidebarOpen ? 'bg-white/50 p-3 rounded-2xl border border-slate-100' : 'justify-center'}`}>
            <div className="w-10 h-10 rounded-full bg-[#005ac1] text-white flex items-center justify-center font-bold">
              {user.name?.charAt(0)}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold truncate">{user.name}</p>
                <p className="text-[10px] text-[#44474f] uppercase">{user.role}</p>
              </div>
            )}
            {isSidebarOpen && <button onClick={() => setUser(null)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><LogOut size={18}/></button>}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT - Massive Data Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-[#fdfbff] flex items-center justify-between px-8 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-full text-[#44474f]"><Menu size={24}/></button>
            <div className="hidden md:flex items-center bg-[#f3eff4] px-4 py-2.5 rounded-full w-96 border border-transparent focus-within:border-[#005ac1] transition-all">
              <Search size={18} className="text-[#44474f] mr-2"/>
              <input type="text" placeholder="Busca rápida inteligente..." className="bg-transparent outline-none w-full text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-3 text-[#44474f] hover:bg-slate-100 rounded-full relative"><Bell size={22}/><span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto">
            {currentView === 'dashboard' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-4xl font-black text-[#1a1b1e] tracking-tight">Painel de Controle</h1>
                    <p className="text-[#44474f] mt-1 font-medium">Bem-vindo de volta, {user.name.split(' ')[0]}. Aqui está o resumo de hoje.</p>
                  </div>
                  <div className="bg-[#d8e2ff] text-[#001a41] px-5 py-2.5 rounded-2xl font-bold flex items-center text-sm shadow-sm">
                    <Sparkles size={16} className="mr-2 text-[#005ac1]"/> IA Predict Ativa
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Pacientes Ativos', val: pacientes.length, color: 'primary' },
                    { label: 'Sessões Hoje', val: '14', color: 'variant' },
                    { label: 'Aguardando Evolução', val: '3', color: 'error' },
                    { label: 'Ocupação das Salas', val: '85%', color: 'success' },
                  ].map((stat, i) => (
                    <div key={i} className="m3-card shadow-sm border border-slate-100">
                      <p className="text-[#44474f] text-[11px] font-black uppercase tracking-widest">{stat.label}</p>
                      <p className="text-4xl font-black text-[#1a1b1e] mt-2">{stat.val}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 m3-card !bg-[#1a1b1e] text-white p-10 relative overflow-hidden shadow-2xl">
                    <div className="relative z-10">
                      <h3 className="text-2xl font-bold mb-4 flex items-center text-blue-300"><Sparkles className="mr-3"/> Massive Data IA Insight</h3>
                      <p className="text-slate-300 max-w-xl leading-relaxed font-medium">Analise tendências de recuperação e produtividade clínica. Pergunte qualquer coisa sobre seus dados.</p>
                      <div className="mt-8 flex gap-3">
                        <input placeholder="Ex: Qual o tempo médio de alta dos pacientes de Traumato?" className="bg-white/10 border border-white/20 flex-1 p-4 rounded-2xl outline-none focus:border-blue-400 font-medium" />
                        <button className="bg-[#d8e2ff] text-[#001a41] px-8 rounded-2xl font-black hover:scale-105 transition-transform shadow-lg">Analisar</button>
                      </div>
                    </div>
                    <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/30 blur-[100px] rounded-full -mr-20 -mt-20"></div>
                  </div>

                  <div className="m3-card border border-slate-100">
                    <h3 className="font-black text-[#1a1b1e] mb-6 flex items-center border-b pb-4">Avisos Importantes</h3>
                    <div className="space-y-4">
                      {[1, 2, 3].map(item => (
                        <div key={item} className="flex gap-4 p-3 hover:bg-white rounded-xl transition-colors cursor-pointer">
                          <div className="w-1.5 h-full bg-[#005ac1] rounded-full"></div>
                          <div>
                            <p className="text-xs font-bold text-[#1a1b1e]">Renovação de Contrato: Paciente João</p>
                            <p className="text-[10px] text-[#44474f] mt-0.5">Expira em 2 dias</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {currentView === 'agenda' && <Agenda user={user} />}
            {currentView === 'pacientes' && <Pacientes pacientes={pacientes} hasAccess={hasAccess} user={user} />}
            {currentView === 'avaliacoes' && <Avaliacoes hasAccess={hasAccess} />}
            {currentView === 'equipe' && <Equipe user={user} />}
          </div>
        </div>
      </main>
    </div>
  );
}