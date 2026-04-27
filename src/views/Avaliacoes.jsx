import React, { useState, useEffect } from 'react';
import { 
  Search, Sparkles, Plus, Activity, BookOpen, 
  CheckCircle2, ChevronLeft, Loader2, Save, X, BrainCircuit 
} from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { buscarEscalaIA } from '../services/geminiService';

export default function Avaliacoes({ hasAccess }) {
  const [termoBuscaIA, setTermoBuscaIA] = useState('');
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [resultadoIA, setResultadoIA] = useState(null);
  const [erroIA, setErroIA] = useState('');

  const [escalasSalvas, setEscalasSalvas] = useState([]);
  
  // Controle de Aplicação da Escala
  const [escalaAberta, setEscalaAberta] = useState(null);
  const [respostasAplicacao, setRespostasAplicacao] = useState({});

  // 1. CARREGAR ESCALAS SALVAS DO FIREBASE
  useEffect(() => {
    const q = query(collection(db, "escalas_clinicas"), orderBy("nome", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setEscalasSalvas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // 2. BUSCAR NOVA ESCALA NA IA
  const pesquisarIA = async (e) => {
    e.preventDefault();
    if (!termoBuscaIA) return;
    setCarregandoIA(true);
    setResultadoIA(null);
    setErroIA('');
    
    const dados = await buscarEscalaIA(termoBuscaIA);
    
    if (dados?.erro) {
      setErroIA(dados.erro);
    } else if (dados?.nome) {
      setResultadoIA(dados);
    } else {
      setErroIA("Erro ao estruturar a escala. Tente novamente.");
    }
    setCarregandoIA(false);
  };

  // 3. SALVAR ESCALA NA CLÍNICA
  const guardarEscalaNaBase = async () => {
    if (!resultadoIA) return;
    try {
      await addDoc(collection(db, "escalas_clinicas"), {
        ...resultadoIA,
        dataCriacao: new Date().toISOString()
      });
      alert("Escala adicionada à base da clínica com sucesso!");
      setResultadoIA(null);
      setTermoBuscaIA('');
    } catch (e) {
      alert("Erro ao guardar na base.");
    }
  };

  const apagarEscala = async (id) => {
    if (window.confirm("Deseja remover esta escala da clínica?")) {
      await deleteDoc(doc(db, "escalas_clinicas", id));
    }
  };

  // 4. LÓGICA DE APLICAÇÃO (CÁLCULO DE PONTOS)
  const selecionarOpcao = (perguntaIndex, valor) => {
    setRespostasAplicacao(prev => ({
      ...prev,
      [perguntaIndex]: valor
    }));
  };

  const calcularPontuacaoFinal = () => {
    return Object.values(respostasAplicacao).reduce((acc, curr) => acc + curr, 0);
  };

  const abrirEscala = (escala) => {
    setEscalaAberta(escala);
    setRespostasAplicacao({});
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Activity className="text-blue-600" size={36}/> Avaliações Clínicas
          </h1>
          <p className="text-slate-500 font-medium mt-1">Biblioteca científica de escalas e testes padronizados.</p>
        </div>
      </div>

      {/* MOTOR DE BUSCA DA IA */}
      <div className="bg-slate-900 rounded-[32px] p-8 shadow-xl relative overflow-hidden">
        <Sparkles className="absolute -right-10 -top-10 text-blue-500 opacity-20 w-64 h-64" />
        
        <div className="relative z-10 max-w-3xl">
          <h3 className="text-white font-black text-2xl mb-2 flex items-center gap-2"><BrainCircuit/> Procurar Nova Escala (Agente IA)</h3>
          <p className="text-slate-400 text-sm font-medium mb-6">A Inteligência Artificial buscará testes validados e estruturará um formulário aplicável automaticamente.</p>
          
          <form onSubmit={pesquisarIA} className="flex gap-3">
            <div className="flex-1 bg-white/10 border border-white/20 rounded-2xl flex items-center px-4 focus-within:bg-white/20 transition-all">
              <Search className="text-slate-300 mr-2" size={20}/>
              <input 
                type="text" 
                placeholder="Ex: TUG, Escala de Berg, Fugl-Meyer..." 
                className="w-full bg-transparent border-none outline-none text-white py-4 font-bold placeholder-slate-400"
                value={termoBuscaIA}
                onChange={e => setTermoBuscaIA(e.target.value)}
              />
            </div>
            <button disabled={carregandoIA} type="submit" className="bg-blue-600 text-white px-8 rounded-2xl font-black hover:bg-blue-500 transition-colors flex items-center">
              {carregandoIA ? <Loader2 className="animate-spin" size={20}/> : 'Pesquisar'}
            </button>
          </form>

          {erroIA && <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 text-red-200 rounded-xl font-bold text-sm">{erroIA}</div>}
        </div>
      </div>

      {/* PREVIEW DA ESCALA ENCONTRADA PELA IA */}
      {resultadoIA && (
        <div className="bg-blue-50 border-2 border-blue-600 rounded-[32px] p-8 animate-in slide-in-from-top-4 shadow-lg shadow-blue-100">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="bg-blue-200 text-blue-800 text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest">Descoberta Científica IA</span>
              <h2 className="text-2xl font-black text-slate-900 mt-3">{resultadoIA.nome} ({resultadoIA.sigla})</h2>
              <p className="text-slate-600 mt-2 font-medium">{resultadoIA.objetivo}</p>
            </div>
            <button onClick={() => setResultadoIA(null)} className="p-2 text-slate-400 hover:text-slate-600"><X size={24}/></button>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-blue-100 mb-6">
            <h4 className="text-xs font-black uppercase text-slate-400 mb-2">Amostra do Formulário Gerado</h4>
            <div className="space-y-3 opacity-60 pointer-events-none">
              {resultadoIA.itens?.slice(0, 2).map((item, i) => (
                <div key={i} className="p-4 border rounded-xl">
                  <p className="font-bold text-slate-800 text-sm mb-2">{item.pergunta}</p>
                  <div className="flex gap-2">
                    {item.opcoes?.map((op, j) => (
                      <span key={j} className="bg-slate-50 border px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500">{op.texto}</span>
                    ))}
                  </div>
                </div>
              ))}
              {resultadoIA.itens?.length > 2 && <p className="text-xs font-bold text-blue-600 mt-2">+ {resultadoIA.itens.length - 2} itens ocultos...</p>}
            </div>
          </div>

          <button onClick={guardarEscalaNaBase} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-md flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors">
            <Save size={20}/> Salvar {resultadoIA.sigla} na Base da Clínica
          </button>
        </div>
      )}

      {/* GRID DE ESCALAS SALVAS */}
      <div className="mt-10">
        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center"><BookOpen className="mr-2 text-blue-600"/> Biblioteca da Clínica</h3>
        
        {escalasSalvas.length === 0 ? (
          <div className="text-center p-16 border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400">
            <BookOpen size={48} className="mx-auto mb-4 opacity-50"/>
            <p className="font-bold">A sua biblioteca clínica está vazia.</p>
            <p className="text-sm font-medium mt-1">Utilize o Agente IA acima para importar testes validados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {escalasSalvas.map(escala => (
              <div key={escala.id} className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-blue-50 text-blue-700 font-black px-3 py-1 rounded-lg text-xs">{escala.sigla}</div>
                  {hasAccess(['gestor_clinico']) && (
                    <button onClick={() => apagarEscala(escala.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                  )}
                </div>
                <h4 className="font-black text-lg text-slate-900 mb-2 leading-tight">{escala.nome}</h4>
                <p className="text-xs text-slate-500 font-medium line-clamp-3 flex-1 mb-6">{escala.objetivo}</p>
                <button onClick={() => abrirEscala(escala)} className="w-full py-3 bg-slate-50 group-hover:bg-blue-600 group-hover:text-white text-slate-600 rounded-xl font-bold transition-colors">
                  Aplicar Teste
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE APLICAÇÃO DA ESCALA (FORMULÁRIO INTERATIVO) */}
      {escalaAberta && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[40px] w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
            
            <div className="p-8 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50 rounded-t-[40px]">
              <div>
                <span className="text-blue-600 font-black tracking-widest text-[10px] uppercase">Aplicação Clínica</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">{escalaAberta.nome}</h2>
              </div>
              <button onClick={() => setEscalaAberta(null)} className="p-3 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><X size={20}/></button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="mb-8 p-5 bg-blue-50/50 border border-blue-100 rounded-2xl">
                <h4 className="text-xs font-black text-blue-800 uppercase mb-1">Instruções de Aplicação</h4>
                <p className="text-sm font-medium text-slate-600">{escalaAberta.instrucoes}</p>
              </div>

              <div className="space-y-8">
                {escalaAberta.itens?.map((item, i) => (
                  <div key={i} className="bg-white">
                    <h5 className="font-bold text-slate-800 text-lg mb-4"><span className="text-blue-500 mr-2">{i + 1}.</span>{item.pergunta}</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {item.opcoes?.map((op, j) => {
                        const selecionado = respostasAplicacao[i] === op.valor;
                        return (
                          <button 
                            key={j}
                            onClick={() => selecionarOpcao(i, op.valor)}
                            className={`p-4 rounded-2xl border-2 text-left transition-all ${selecionado ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-slate-200 hover:border-blue-300 text-slate-600'}`}
                          >
                            <div className="flex justify-between items-center">
                              <span className={`font-bold text-sm ${selecionado ? 'text-blue-800' : ''}`}>{op.texto}</span>
                              <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${selecionado ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                {op.valor} pts
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BARRA INFERIOR - RESULTADO DA ESCALA */}
            <div className="p-8 border-t border-slate-100 bg-white rounded-b-[40px] shrink-0">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex items-center justify-center w-24 h-24 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-200 shrink-0">
                  <div className="text-center">
                    <div className="text-[10px] font-black uppercase opacity-80">Score</div>
                    <div className="text-4xl font-black leading-none">{calcularPontuacaoFinal()}</div>
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Interpretação e Laudo</h4>
                  <p className="text-sm font-bold text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">{escalaAberta.interpretacao}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}