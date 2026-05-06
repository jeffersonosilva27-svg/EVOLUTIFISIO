import React, { useState, useEffect } from 'react';
import { 
  Search, FileText, X, ClipboardList, 
  History, TrendingUp, TrendingDown, Activity, Star,
  Save, Plus, Dumbbell
} from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { 
  collection, onSnapshot, query, orderBy, 
  addDoc, doc, setDoc, updateDoc, where, getDocs 
} from 'firebase/firestore';

export default function Pacientes({ user, navParams }) {
  const [pacientes, setPacientes] = useState([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState('historico'); // 'historico', 'plano', 'escalas'
  
  // Estados para Escalas
  const [historicoEscalas, setHistoricoEscalas] = useState([]);
  
  // Estados para o Plano de Tratamento (Banco Global)
  const [bancoExercicios, setBancoExercicios] = useState([]);
  const [novoExercicio, setNovoExercicio] = useState({ nome: '', categoria: 'Geral', series: '', reps: '', carga: '' });
  const [condutaAtual, setCondutaAtual] = useState([]);
  const [salvandoConduta, setSalvandoConduta] = useState(false);

  // Estados para Evoluções (Histórico Clínico)
  const [evolucoes, setEvolucoes] = useState([]);
  const [novaEvolucao, setNovaEvolucao] = useState('');
  const [salvandoEvolucao, setSalvandoEvolucao] = useState(false);

  // 1. LISTAGEM GLOBAL DE PACIENTES
  useEffect(() => {
    const q = query(collection(db, "pacientes"), orderBy("nome", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setPacientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // 2. BUSCA AUTOMÁTICA VIA PARÂMETROS DE NAVEGAÇÃO
  useEffect(() => {
    if (navParams?.pacienteId) {
      const pac = pacientes.find(p => p.id === navParams.pacienteId);
      if (pac) setPacienteSelecionado(pac);
    }
  }, [navParams, pacientes]);

  // 3. CARREGAR HISTÓRICO DE ESCALAS
  useEffect(() => {
    if (pacienteSelecionado) {
      const escalasRef = collection(db, "pacientes", pacienteSelecionado.id, "historico_escalas");
      const q = query(escalasRef, orderBy("dataAplicacao", "desc"));
      const unsub = onSnapshot(q, (snap) => {
        setHistoricoEscalas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
    }
  }, [pacienteSelecionado]);

  // 4. CARREGAR BANCO GLOBAL DE EXERCÍCIOS
  useEffect(() => {
    const q = query(collection(db, "banco_exercicios"), orderBy("nome", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setBancoExercicios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // 5. CARREGAR CONDUTA ATUAL DO PACIENTE
  useEffect(() => {
    if (pacienteSelecionado) {
      const condutaRef = collection(db, "pacientes", pacienteSelecionado.id, "plano_tratamento");
      const q = query(condutaRef, orderBy("dataCriacao", "desc"));
      const unsub = onSnapshot(q, (snap) => {
        setCondutaAtual(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
    }
  }, [pacienteSelecionado]);

  // 6. CARREGAR EVOLUÇÕES (HISTÓRICO CLÍNICO)
  useEffect(() => {
    if (pacienteSelecionado) {
      const evolucoesRef = collection(db, "pacientes", pacienteSelecionado.id, "evolucoes");
      const q = query(evolucoesRef, orderBy("data", "desc"));
      const unsub = onSnapshot(q, (snap) => {
        setEvolucoes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
    }
  }, [pacienteSelecionado]);

  const pacientesFiltrados = pacientes.filter(p => 
    p.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
    p.cpf?.includes(termoBusca)
  );

  const obterEvolucao = (nomeEscala) => {
      const testesDestaEscala = historicoEscalas
          .filter(e => e.escalaNome === nomeEscala)
          .sort((a, b) => new Date(a.dataAplicacao) - new Date(b.dataAplicacao));
      
      if (testesDestaEscala.length < 2) return null;
      const ultimo = testesDestaEscala[testesDestaEscala.length - 1].scoreFinal;
      const penultimo = testesDestaEscala[testesDestaEscala.length - 2].scoreFinal;
      const diferenca = ultimo - penultimo;

      return {
          diferenca,
          percentual: (((ultimo - penultimo) / (penultimo || 1)) * 100).toFixed(1),
          melhorou: diferenca < 0 
      };
  };

  // --- LÓGICA DO BANCO GLOBAL DE EXERCÍCIOS ---
  const normalizarTexto = (texto) => {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  };

  const adicionarExercicioAoPlano = async () => {
    if (!novoExercicio.nome) return alert("Digite o nome do exercício.");

    setSalvandoConduta(true);
    try {
      const nomeNormalizado = normalizarTexto(novoExercicio.nome);
      const exercicioExiste = bancoExercicios.find(ex => normalizarTexto(ex.nome) === nomeNormalizado);
      
      if (!exercicioExiste) {
        await setDoc(doc(collection(db, "banco_exercicios"), nomeNormalizado), {
          nome: novoExercicio.nome.trim(),
          categoria: novoExercicio.categoria
        });
      }

      await addDoc(collection(db, "pacientes", pacienteSelecionado.id, "plano_tratamento"), {
        nome: novoExercicio.nome.trim(),
        categoria: exercicioExiste ? exercicioExiste.categoria : novoExercicio.categoria,
        series: novoExercicio.series,
        reps: novoExercicio.reps,
        carga: novoExercicio.carga,
        dataCriacao: new Date().toISOString(),
        profissional: user?.nome || 'Equipe'
      });

      setNovoExercicio(prev => ({ ...prev, nome: '', series: '', reps: '', carga: '' }));
      
    } catch (error) {
      console.error("Erro ao salvar conduta:", error);
      alert("Erro ao adicionar exercício ao plano.");
    }
    setSalvandoConduta(false);
  };

  const handleNomeExercicioChange = (e) => {
    const valorDigitado = e.target.value;
    setNovoExercicio(prev => ({ ...prev, nome: valorDigitado }));
    const exercicioEncontrado = bancoExercicios.find(ex => ex.nome.toLowerCase() === valorDigitado.toLowerCase());
    if (exercicioEncontrado) {
      setNovoExercicio(prev => ({ ...prev, categoria: exercicioEncontrado.categoria }));
    }
  };

  // --- LÓGICA DAS EVOLUÇÕES (HISTÓRICO) ---
  const puxarCondutaParaEvolucao = () => {
    if (condutaAtual.length === 0) return alert("Nenhuma conduta prescrita.");
    const textoConduta = condutaAtual.map(c => `- ${c.nome} (${c.categoria}): ${c.series}x ${c.reps} ${c.carga ? `[Carga: ${c.carga}]` : ''}`).join('\n');
    setNovaEvolucao(prev => prev + (prev ? '\n\n' : '') + "Conduta Realizada:\n" + textoConduta);
  };

  const salvarEvolucao = async () => {
    if (!novaEvolucao.trim()) return alert("Digite a evolução.");
    setSalvandoEvolucao(true);
    try {
      await addDoc(collection(db, "pacientes", pacienteSelecionado.id, "evolucoes"), {
        texto: novaEvolucao,
        data: new Date().toISOString(),
        profissional: user?.nome || 'Equipe'
      });
      
      const hojeInicio = new Date();
      hojeInicio.setHours(0, 0, 0, 0);
      const hojeFim = new Date();
      hojeFim.setHours(23, 59, 59, 999);

      const qAgenda = query(collection(db, "agendamentos"), where("pacienteId", "==", pacienteSelecionado.id));
      const snapAgenda = await getDocs(qAgenda);
      
      snapAgenda.docs.forEach(async (docSnap) => {
        const ag = docSnap.data();
        const dataAg = new Date(ag.data);
        if (dataAg >= hojeInicio && dataAg <= hojeFim && ag.status !== 'realizado') {
          await updateDoc(doc(db, "agendamentos", docSnap.id), { status: 'realizado' });
        }
      });

      setNovaEvolucao('');
      alert("Evolução salva e sessão marcada como realizada na Agenda!");
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar evolução.");
    }
    setSalvandoEvolucao(false);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      
      {!pacienteSelecionado ? (
        <div className="space-y-6">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Prontuários</h1>
              <p className="text-slate-500 font-medium">Consulte históricos, planeje condutas e veja dashboards.</p>
            </div>
          </header>

          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-200">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl flex items-center px-4 focus-within:border-blue-500 transition-all">
              <Search className="text-slate-400 mr-2" size={20}/>
              <input 
                type="text" 
                placeholder="Buscar por nome ou CPF..." 
                className="w-full bg-transparent border-none outline-none text-slate-700 py-4 font-bold"
                value={termoBusca}
                onChange={e => setTermoBusca(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pacientesFiltrados.map(p => (
              <div 
                key={p.id} 
                onClick={() => setPacienteSelecionado(p)}
                className="bg-white p-6 rounded-[28px] border border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {p.nome.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 line-clamp-1">{p.nome}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.diagnostico || 'Geral'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl flex flex-col h-full overflow-hidden">
          
          <header className="p-8 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-6">
              <button onClick={() => setPacienteSelecionado(null)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                <X size={20}/>
              </button>
              <div>
                <h2 className="text-3xl font-black">{pacienteSelecionado.nome}</h2>
                <div className="flex gap-4 mt-2">
                  <span className="text-[10px] font-black uppercase bg-blue-500 px-3 py-1 rounded-full">CPF: {pacienteSelecionado.cpf}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
               <button className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-sm transition-all flex items-center gap-2 border border-white/10">
                 <FileText size={18}/> Gerar PDF
               </button>
            </div>
          </header>

          <nav className="flex px-8 border-b border-slate-100 bg-slate-50 overflow-x-auto shrink-0 flex-nowrap custom-scrollbar">
            {[
              { id: 'historico', label: 'Evoluções', icon: History },
              { id: 'plano', label: 'Conduta Clínica', icon: Dumbbell },
              { id: 'escalas', label: 'Escalas & Dashboards', icon: TrendingUp },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setAbaAtiva(tab.id)}
                className={`flex items-center gap-2 py-6 px-6 font-black text-xs uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${abaAtiva === tab.id ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                <tab.icon size={16}/> {tab.label}
              </button>
            ))}
          </nav>

          <main className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">

            {/* ABA EVOLUÇÕES (HISTÓRICO CLÍNICO) */}
            {abaAtiva === 'historico' && (
              <div className="space-y-8 animate-in slide-in-from-bottom-4">
                <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                      <History size={20} className="text-blue-600"/> Nova Evolução Clínica
                    </h3>
                    {condutaAtual.length > 0 && (
                      <button 
                        onClick={puxarCondutaParaEvolucao}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-black px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
                      >
                        <Activity size={14}/> Puxar Conduta Programada
                      </button>
                    )}
                  </div>
                  <textarea 
                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 min-h-[150px] outline-none focus:border-blue-500 text-slate-700"
                    placeholder="Descreva o atendimento de hoje (Padrão SOAP)..."
                    value={novaEvolucao}
                    onChange={(e) => setNovaEvolucao(e.target.value)}
                  ></textarea>
                  <button 
                    onClick={salvarEvolucao}
                    disabled={salvandoEvolucao || !novaEvolucao.trim()}
                    className="mt-4 bg-[#0F214A] hover:bg-blue-700 text-white font-black px-8 py-4 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <Save size={18}/> {salvandoEvolucao ? 'Salvando...' : 'Assinar Evolução'}
                  </button>
                </div>

                <div className="space-y-4">
                  <h4 className="font-black text-slate-800 flex items-center gap-2">
                    <ClipboardList size={18} className="text-slate-400"/> Histórico de Evoluções
                  </h4>
                  {evolucoes.length === 0 ? (
                    <div className="text-center py-10 bg-white border border-slate-100 rounded-[24px]">
                      <p className="text-slate-400 font-medium">Nenhuma evolução registrada para este paciente.</p>
                    </div>
                  ) : (
                    evolucoes.map(ev => (
                      <div key={ev.id} className="bg-white border border-slate-200 p-6 rounded-[24px] shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-sm font-black text-slate-800">{ev.profissional}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(ev.data).toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                        <p className="text-slate-600 whitespace-pre-wrap text-sm">{ev.texto}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            
            {/* ABA PLANO DE TRATAMENTO (CONDUTA CLÍNICA) */}
            {abaAtiva === 'plano' && (
              <div className="space-y-8 animate-in slide-in-from-bottom-4">
                <div className="flex flex-col md:flex-row gap-8">
                  
                  {/* Formulário do Banco Global */}
                  <div className="w-full md:w-1/3 bg-slate-50 p-6 rounded-[32px] border border-slate-100 h-fit">
                    <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2"><Plus size={20} className="text-blue-600"/> Prescrever Conduta</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Exercício / Técnica</label>
                        <input 
                          type="text" 
                          list="banco-exercicios-list"
                          placeholder="Ex: Agachamento, TENS..." 
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700"
                          value={novoExercicio.nome}
                          onChange={handleNomeExercicioChange}
                        />
                        <datalist id="banco-exercicios-list">
                          {bancoExercicios.map(ex => (
                            <option key={ex.id} value={ex.nome} />
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Categoria</label>
                        <select 
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-700"
                          value={novoExercicio.categoria}
                          onChange={e => setNovoExercicio(prev => ({ ...prev, categoria: e.target.value }))}
                        >
                          <option value="Geral">Geral</option>
                          <option value="Funcionais">Funcionais</option>
                          <option value="Recursos Terapêuticos">Recursos Terapêuticos</option>
                          <option value="Membros Superiores">Membros Superiores</option>
                          <option value="Membros Inferiores">Membros Inferiores</option>
                          <option value="Tronco e Core">Tronco e Core</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Séries</label>
                          <input type="text" placeholder="Ex: 3" className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-700 text-center" value={novoExercicio.series} onChange={e => setNovoExercicio(prev => ({ ...prev, series: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Reps/Tempo</label>
                          <input type="text" placeholder="10 / 1min" className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-700 text-center" value={novoExercicio.reps} onChange={e => setNovoExercicio(prev => ({ ...prev, reps: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Carga</label>
                          <input type="text" placeholder="5kg" className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-700 text-center" value={novoExercicio.carga} onChange={e => setNovoExercicio(prev => ({ ...prev, carga: e.target.value }))} />
                        </div>
                      </div>

                      <button 
                        onClick={adicionarExercicioAoPlano} 
                        disabled={salvandoConduta || !novoExercicio.nome}
                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-black mt-4 hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {salvandoConduta ? 'Adicionando...' : 'Adicionar ao Plano'}
                      </button>
                    </div>
                  </div>

                  {/* Lista da Conduta Atual do Paciente */}
                  <div className="w-full md:w-2/3">
                    {condutaAtual.length === 0 ? (
                      <div className="text-center py-20 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                        <Dumbbell size={48} className="mx-auto mb-4 text-slate-300"/>
                        <p className="font-black text-slate-500">Conduta Clínica Vazia</p>
                        <p className="text-sm text-slate-400">Prescreva os exercícios à esquerda.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {condutaAtual.map((item) => (
                          <div key={item.id} className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">{item.categoria}</span>
                              </div>
                              <h4 className="font-black text-slate-800 text-lg">{item.nome}</h4>
                            </div>
                            <div className="flex gap-4 items-center">
                              <div className="text-center bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                <p className="text-[10px] font-black uppercase text-slate-400">Prescrição</p>
                                <p className="font-black text-blue-600">{item.series}x {item.reps} {item.carga ? `- ${item.carga}` : ''}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* ABA ESCALAS (DASHBOARD) */}
            {abaAtiva === 'escalas' && (
              <div className="space-y-8 animate-in slide-in-from-bottom-4">
                {historicoEscalas.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                    <Activity size={48} className="mx-auto mb-4 text-slate-300"/>
                    <p className="font-black text-slate-500">Nenhuma escala científica aplicada a este paciente.</p>
                    <p className="text-sm text-slate-400">Vá ao menu "Avaliações" para realizar o primeiro teste.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="bg-blue-600 text-white p-8 rounded-[32px] shadow-xl shadow-blue-100 relative overflow-hidden">
                          <p className="text-[10px] font-black uppercase opacity-80 mb-1">Última Avaliação</p>
                          <h4 className="text-2xl font-black">{historicoEscalas[0].escalaNome}</h4>
                          <div className="mt-4 flex items-end gap-2">
                             <span className="text-5xl font-black">{historicoEscalas[0].scoreFinal}</span>
                             <span className="text-sm font-bold opacity-80 mb-2">Pontos</span>
                          </div>
                          <Activity className="absolute -right-4 -bottom-4 w-24 h-24 opacity-20" />
                       </div>

                       <div className="bg-white border-2 border-slate-100 p-8 rounded-[32px] shadow-sm flex flex-col justify-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total de Testes</p>
                          <h4 className="text-4xl font-black text-slate-800">{historicoEscalas.length}</h4>
                          <p className="text-xs font-bold text-slate-400 mt-2">Aplicados desde a admissão</p>
                       </div>

                       <div className="bg-slate-50 border-2 border-slate-100 p-8 rounded-[32px] shadow-sm">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Status de Evolução</p>
                          {(() => {
                              const ev = obterEvolucao(historicoEscalas[0].escalaNome);
                              if (!ev) return <p className="text-xs font-bold text-slate-400">Aguardando novo teste para gerar comparativo...</p>;
                              return (
                                <div className="flex items-center gap-4">
                                  <div className={`p-3 rounded-2xl ${ev.melhorou ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {ev.melhorou ? <TrendingUp size={28}/> : <TrendingDown size={28}/>}
                                  </div>
                                  <div>
                                    <h5 className={`text-xl font-black ${ev.melhorou ? 'text-green-700' : 'text-red-700'}`}>
                                      {ev.melhorou ? 'Melhora' : 'Declínio'} de {ev.percentual}%
                                    </h5>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Comparado ao teste anterior</p>
                                  </div>
                                </div>
                              );
                          })()}
                       </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden">
                       <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                          <h3 className="font-black text-slate-800 flex items-center gap-2"><Star size={18} className="text-yellow-500"/> Histórico Analítico</h3>
                       </div>
                       <table className="w-full text-left">
                         <thead>
                           <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                             <th className="px-8 py-4">Data</th>
                             <th className="px-8 py-4">Escala / Teste</th>
                             <th className="px-8 py-4">Avaliador</th>
                             <th className="px-8 py-4 text-right">Resultado</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                           {historicoEscalas.map(e => (
                             <tr key={e.id} className="hover:bg-slate-50 transition-colors group">
                               <td className="px-8 py-5 text-sm font-bold text-slate-600">
                                 {new Date(e.dataAplicacao).toLocaleDateString('pt-BR')}
                               </td>
                               <td className="px-8 py-5">
                                 <span className="text-sm font-black text-slate-800 block">{e.escalaNome}</span>
                                 <span className="text-[10px] font-bold text-blue-600 uppercase">{e.sigla}</span>
                               </td>
                               <td className="px-8 py-5 text-sm font-medium text-slate-500">
                                 {e.profissionalAvaliador}
                               </td>
                               <td className="px-8 py-5 text-right">
                                 <div className="inline-flex items-center justify-center px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-lg">
                                   {e.scoreFinal}
                                 </div>
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                    </div>
                  </>
                )}
              </div>
            )}

          </main>
        </div>
      )}
    </div>
  );
}