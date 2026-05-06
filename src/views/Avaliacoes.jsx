import React, { useState, useEffect } from 'react';
import { 
  Search, Activity, BookOpen, X, Save, UserCircle, Loader2
} from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, onSnapshot, query, orderBy, addDoc } from 'firebase/firestore';

// ==========================================
// 📚 BIBLIOTECA LOCAL DE ESCALAS (INQUEBRÁVEL)
// ==========================================
const BIBLIOTECA_ESCALAS = [
  {
    id: "escala-berg-001",
    nome: "Escala de Equilíbrio de Berg",
    sigla: "BBS",
    objetivo: "Avaliar o equilíbrio estático e dinâmico.",
    instrucoes: "Peça ao paciente para realizar cada tarefa. Pontue de 0 (incapaz) a 4 (independente).",
    interpretacao: "0-20: Alto risco de queda | 21-40: Médio risco | 41-56: Baixo risco",
    itens: [
      {
        pergunta: "1. Sentado para de pé",
        opcoes: [
          { texto: "Incapaz de levantar sem ajuda", valor: 0 },
          { texto: "Precisa de mínima ajuda", valor: 2 },
          { texto: "Levanta-se independentemente", valor: 4 }
        ]
      },
      {
        pergunta: "2. De pé sem apoio",
        opcoes: [
          { texto: "Incapaz de ficar em pé 30s sem ajuda", valor: 0 },
          { texto: "Fica em pé 30s com supervisão", valor: 2 },
          { texto: "Fica em pé 2 minutos com segurança", valor: 4 }
        ]
      }
    ]
  },
  {
    id: "escala-tug-002",
    nome: "Timed Up and Go",
    sigla: "TUG",
    objetivo: "Avaliar a mobilidade funcional e risco de quedas.",
    instrucoes: "O paciente deve levantar de uma cadeira, andar 3 metros, virar, voltar e sentar. Avalie o tempo total.",
    interpretacao: "< 10s: Risco Normal | 11-20s: Risco Moderado | > 20s: Risco Alto",
    itens: [
      {
        pergunta: "Tempo de Execução (Categorizado)",
        opcoes: [
          { texto: "Mais de 20 segundos (Risco Alto)", valor: 0 },
          { texto: "11 a 20 segundos (Risco Moderado)", valor: 2 },
          { texto: "Menos de 10 segundos (Normal)", valor: 4 }
        ]
      }
    ]
  }
];

export default function Avaliacoes({ hasAccess, user }) {
  const [termoBusca, setTermoBusca] = useState('');
  const [escalaAberta, setEscalaAberta] = useState(null);
  const [respostasAplicacao, setRespostasAplicacao] = useState({});
  
  // Novos Estados para Vinculação de Paciente
  const [pacientesAtivos, setPacientesAtivos] = useState([]);
  const [pacienteSelecionado, setPacienteSelecionado] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Busca a lista de pacientes do Firebase em tempo real
  useEffect(() => {
    const q = query(collection(db, "pacientes"), orderBy("nome", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setPacientesAtivos(snap.docs.map(d => ({ id: d.id, nome: d.data().nome })));
    });
    return () => unsub();
  }, []);

  const escalasFiltradas = BIBLIOTECA_ESCALAS.filter(escala => 
    escala.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
    escala.sigla.toLowerCase().includes(termoBusca.toLowerCase())
  );

  const abrirEscala = (escala) => {
    setEscalaAberta(escala);
    setRespostasAplicacao({});
    setPacienteSelecionado(""); // Reseta a seleção
  };

  const selecionarOpcao = (perguntaIndex, valor) => {
    setRespostasAplicacao(prev => ({ ...prev, [perguntaIndex]: valor }));
  };

  const calcularPontuacaoFinal = () => {
    return Object.values(respostasAplicacao).reduce((acc, curr) => acc + curr, 0);
  };

  // Função para injetar o resultado no Prontuário do Firebase
  const salvarNoProntuario = async () => {
    if (!pacienteSelecionado) {
        return alert("Erro: Você precisa selecionar um paciente para vincular o resultado!");
    }
    
    // Verifica se respondeu a todas as perguntas
    if (Object.keys(respostasAplicacao).length < escalaAberta.itens.length) {
        if(!window.confirm("Atenção: Você não respondeu a todos os itens. Deseja salvar mesmo assim?")) return;
    }

    setSalvando(true);
    try {
        const prontuarioRef = collection(db, "pacientes", pacienteSelecionado, "historico_escalas");
        await addDoc(prontuarioRef, {
            escalaId: escalaAberta.id,
            escalaNome: escalaAberta.nome,
            sigla: escalaAberta.sigla,
            scoreFinal: calcularPontuacaoFinal(),
            respostasBrutas: respostasAplicacao,
            dataAplicacao: new Date().toISOString(),
            profissionalAvaliador: user?.nome || "Equipe"
        });
        
        alert("Avaliação salva e arquivada no prontuário do paciente com sucesso!");
        setEscalaAberta(null);
    } catch (error) {
        alert("Erro ao tentar salvar no banco de dados.");
        console.error(error);
    }
    setSalvando(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Activity className="text-blue-600" size={36}/> Avaliações Clínicas
          </h1>
          <p className="text-slate-500 font-medium mt-1">Biblioteca estática de escalas e testes padronizados.</p>
        </div>
      </div>

      {/* BUSCA INSTANTÂNEA LOCAL */}
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-200">
        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl flex items-center px-4 focus-within:border-blue-500 transition-all">
          <Search className="text-slate-400 mr-2" size={20}/>
          <input 
            type="text" 
            placeholder="Buscar escala por nome ou sigla (Ex: TUG, Berg)..." 
            className="w-full bg-transparent border-none outline-none text-slate-700 py-4 font-bold placeholder-slate-400"
            value={termoBusca}
            onChange={e => setTermoBusca(e.target.value)}
          />
        </div>
      </div>

      {/* GRID DE ESCALAS */}
      <div className="mt-8">
        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center"><BookOpen className="mr-2 text-blue-600"/> Biblioteca de Testes ({escalasFiltradas.length})</h3>
        
        {escalasFiltradas.length === 0 ? (
          <div className="text-center p-16 border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400">
            <BookOpen size={48} className="mx-auto mb-4 opacity-50"/>
            <p className="font-bold">Nenhuma escala encontrada com esse nome.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {escalasFiltradas.map(escala => (
              <div key={escala.id} className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-blue-50 text-blue-700 font-black px-3 py-1 rounded-lg text-xs">{escala.sigla}</div>
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

      {/* MODAL DE APLICAÇÃO DA ESCALA */}
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
              
              {/* SESSÃO DE VINCULAÇÃO AO PACIENTE (OBRIGATÓRIO) */}
              <div className="mb-8 p-5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><UserCircle size={28}/></div>
                  <div className="flex-1 w-full">
                      <label className="text-[10px] font-black uppercase text-amber-800 tracking-widest mb-1 block">Vincular Avaliação Ao Paciente:</label>
                      <select 
                          value={pacienteSelecionado} 
                          onChange={(e) => setPacienteSelecionado(e.target.value)}
                          className="w-full p-3 bg-white border border-amber-200 rounded-xl outline-none font-bold text-slate-700"
                      >
                          <option value="">-- Selecione o Paciente --</option>
                          {pacientesAtivos.map(p => (
                              <option key={p.id} value={p.id}>{p.nome}</option>
                          ))}
                      </select>
                  </div>
              </div>

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

            {/* BARRA INFERIOR - RESULTADO E BOTÃO SALVAR */}
            <div className="p-8 border-t border-slate-100 bg-white rounded-b-[40px] shrink-0">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex items-center justify-center w-24 h-24 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-200 shrink-0">
                  <div className="text-center">
                    <div className="text-[10px] font-black uppercase opacity-80">Score</div>
                    <div className="text-4xl font-black leading-none">{calcularPontuacaoFinal()}</div>
                  </div>
                </div>
                <div className="flex-1 w-full">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Interpretação e Laudo</h4>
                  <p className="text-sm font-bold text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">{escalaAberta.interpretacao}</p>
                  
                  <button 
                    onClick={salvarNoProntuario} 
                    disabled={salvando}
                    className="w-full bg-[#0F214A] text-white py-4 rounded-2xl font-black hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 shadow-lg"
                  >
                    {salvando ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> Salvar no Prontuário do Paciente</>}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}