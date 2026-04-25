import React, { useState } from 'react';
import { Sparkles, Search, Activity, Loader2, BookOpen, BrainCircuit } from 'lucide-react';
import { buscarEscalaIA } from '../services/geminiService';

export default function Avaliacoes({ hasAccess }) {
  const [busca, setBusca] = useState('');
  const [resultado, setResultado] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Sugestões rápidas para facilitar o uso
  const sugestoesRapidas = [
    "Escala para avaliar equilíbrio em idosos com risco de queda",
    "Teste de força para pós-operatório de LCA",
    "Escala de independência funcional para AVC",
    "Teste cognitivo rápido para Terapia Ocupacional"
  ];

  const realizarBusca = async (e, termoPronto = null) => {
    if (e) e.preventDefault();
    const termoQuery = termoPronto || busca;
    if (!termoQuery) return;

    setBusca(termoQuery);
    setCarregando(true);
    setResultado('');

    const resposta = await buscarEscalaIA(termoQuery);
    setResultado(resposta);
    setCarregando(false);
  };

  if (!hasAccess(['gestor_clinico', 'fisio', 'to'])) {
    return <div className="p-8 text-center text-red-500 font-bold">Acesso restrito à equipe clínica.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center">
            <Activity className="mr-2 text-blue-600"/> Banco de Escalas e Testes
          </h1>
          <p className="text-sm text-slate-500">Consulte diretrizes clínicas com Inteligência Artificial.</p>
        </div>
      </div>

      {/* MOTOR DE BUSCA PRINCIPAL */}
      <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold mb-6 flex items-center justify-center">
            <BrainCircuit className="mr-2 text-blue-400"/> IA de Avaliação Funcional
          </h2>
          
          <form onSubmit={realizarBusca} className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-4 text-slate-400" size={20}/>
              <input 
                type="text" 
                placeholder="Ex: Escala motora para Parkinson..." 
                className="w-full bg-white/10 border-2 border-white/20 pl-12 pr-4 py-4 rounded-xl outline-none focus:border-blue-400 placeholder:text-white/40 font-medium text-lg transition-all"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <button 
              type="submit" 
              disabled={carregando || !busca}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[160px] shadow-lg"
            >
              {carregando ? <Loader2 className="animate-spin" size={24}/> : <><Sparkles size={20} className="mr-2"/> Pesquisar</>}
            </button>
          </form>

          {/* CHIPS DE SUGESTÃO */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <span className="text-xs font-bold text-slate-400 mt-1 mr-2 uppercase tracking-widest">Sugestões:</span>
            {sugestoesRapidas.map((sugestao, index) => (
              <button 
                key={index}
                onClick={() => realizarBusca(null, sugestao)}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs py-1.5 px-3 rounded-full transition-colors text-left"
              >
                {sugestao}
              </button>
            ))}
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-3xl -mr-32 -mt-32 rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/20 blur-3xl -ml-20 -mb-20 rounded-full pointer-events-none"></div>
      </div>

      {/* ÁREA DE RESULTADOS DA IA */}
      {resultado && (
        <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-lg animate-in slide-in-from-bottom-4">
          <h3 className="font-black text-blue-900 text-xl border-b border-blue-100 pb-4 mb-6 flex items-center">
            <BookOpen className="mr-3 text-blue-600"/> Resultado Científico
          </h3>
          
          <div className="prose prose-slate max-w-none">
            {/* Como o Gemini devolve Markdown, renderizamos de forma elegante (Simulação rápida de markdown) */}
            {resultado.split('\n').map((linha, i) => {
              if (linha.startsWith('###')) return <h4 key={i} className="text-xl font-black text-slate-800 mt-6 mb-2">{linha.replace('###', '')}</h4>;
              if (linha.startsWith('**') && linha.includes('**')) {
                const parts = linha.split('**');
                return <p key={i} className="text-slate-700 leading-relaxed mt-3"><strong>{parts[1]}</strong>{parts[2]}</p>;
              }
              return <p key={i} className="text-slate-600 leading-relaxed mb-2">{linha}</p>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}