import React, { useState, useEffect } from 'react';

export default function EscalaRenderer({ escalaData, pacienteId, onSalvar }) {
  const [respostas, setRespostas] = useState({});
  const [scoreTotal, setScoreTotal] = useState(0);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    setRespostas({});
    setScoreTotal(0);
    setResultado(null);
  }, [escalaData]);

  useEffect(() => {
    if (!escalaData?.perguntas) return;

    const totalRespondidas = Object.keys(respostas).length;
    const todasRespondidas = totalRespondidas === escalaData.perguntas.length;

    if (escalaData.tipoCalculo === 'tempo' || escalaData.tipoCalculo === 'selecao_unica') {
      if (todasRespondidas) {
        setResultado(escalaData.interpretarResultado(respostas));
      } else {
        setResultado(null);
      }
    } else {
      const totalSoma = Object.values(respostas).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
      setScoreTotal(totalSoma);
      
      if (todasRespondidas && totalRespondidas > 0) {
        setResultado(escalaData.interpretarResultado(totalSoma));
      } else {
        setResultado(null);
      }
    }
  }, [respostas, escalaData]);

  const handleOpcaoChange = (perguntaId, valor) => {
    setRespostas(prev => ({ ...prev, [perguntaId]: valor }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
      <div className="mb-8 border-b border-slate-200 dark:border-slate-700 pb-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{escalaData?.nome}</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">{escalaData?.descricao}</p>
      </div>

      <div className="space-y-8">
        {escalaData?.perguntas?.map((pergunta) => (
          <div key={pergunta.id} className="bg-slate-50 dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">{pergunta.texto}</h3>
            
            {/* Campo de Texto (Novo para MAS) */}
            {pergunta.tipo === 'texto' && (
              <input
                type="text"
                placeholder={pergunta.placeholder}
                value={respostas[pergunta.id] || ''}
                onChange={(e) => handleOpcaoChange(pergunta.id, e.target.value)}
                className="mt-4 w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              />
            )}

            {/* Campo Numérico (TUG) */}
            {pergunta.tipo === 'numero' && (
              <div className="mt-4 relative w-full md:w-1/2">
                <input
                  type="number"
                  step="0.1"
                  value={respostas[pergunta.id] || ''}
                  onChange={(e) => handleOpcaoChange(pergunta.id, e.target.value)}
                  className="w-full p-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-lg font-semibold"
                />
                <span className="absolute right-4 top-4 text-slate-400">segundos</span>
              </div>
            )}

            {/* Campo Radio (Berg, Barthel, MAS, FMA) */}
            {pergunta.tipo === 'radio' && (
              <div className="space-y-3 mt-4">
                {pergunta.opcoes?.map((opcao, index) => (
                  <label key={index} className={`flex items-start p-3 rounded-lg border cursor-pointer transition-all ${respostas[pergunta.id] === opcao.valor ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                    <input
                      type="radio"
                      name={pergunta.id}
                      checked={respostas[pergunta.id] === opcao.valor}
                      onChange={() => handleOpcaoChange(pergunta.id, opcao.valor)}
                      className="mt-1 w-4 h-4 text-indigo-600"
                    />
                    <div className="ml-3 flex-1 flex justify-between items-center">
                      <span className="text-slate-700 dark:text-slate-300">{opcao.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {resultado && (
        <div className="mt-10 p-6 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-xl">
          <h4 className="text-xl font-bold text-indigo-900 dark:text-indigo-100 mb-2">Resultado: {resultado.risco}</h4>
          <p className="text-lg font-medium text-indigo-800 dark:text-indigo-200">{resultado.detalhes}</p>
          <div className="mt-6 flex justify-end">
            <button onClick={handleFinalizar} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg">Salvar Avaliação</button>
          </div>
        </div>
      )}
    </div>
  );
}