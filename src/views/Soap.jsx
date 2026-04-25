import React, { useState } from 'react';
import { HeartPulse, FileText, Loader2 } from 'lucide-react';
import { analisarEvolucao } from '../services/geminiService'; // Importamos a IA

export default function Soap({ pacientes }) {
  const [relato, setRelato] = useState('');
  const [resultadoIA, setResultadoIA] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleGerarIA = async () => {
    if (!relato) return alert("Digite o relato do paciente primeiro.");
    setCarregando(true);
    try {
      const textoTecnico = await analisarEvolucao(relato);
      setResultadoIA(textoTecnico);
    } catch (error) {
      console.error(error);
      alert("Erro ao consultar a IA.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center"><FileText className="mr-2"/> Evolução Clínica</h1>
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        <textarea 
          className="w-full border rounded-lg p-3 h-32 outline-none focus:ring-2 focus:ring-blue-500" 
          placeholder="Ex: Paciente relata melhora na dor lombar após as sessões, mas sente rigidez ao acordar..."
          value={relato}
          onChange={(e) => setRelato(e.target.value)}
        />
        
        <button 
          onClick={handleGerarIA}
          disabled={carregando}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 rounded-lg font-bold flex items-center justify-center disabled:opacity-50"
        >
          {carregando ? <Loader2 className="animate-spin mr-2"/> : <HeartPulse size={18} className="mr-2"/>}
          <span>Transformar em Linguagem Técnica (Gemini)</span>
        </button>

        {resultadoIA && (
          <div className="mt-6 p-4 bg-gray-50 border-l-4 border-blue-500 rounded">
            <h3 className="font-bold text-blue-800 mb-2">Sugestão de Evolução Técnica:</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{resultadoIA}</p>
            <button className="mt-4 text-xs bg-blue-600 text-white px-3 py-1 rounded">Copiar para Prontuário</button>
          </div>
        )}
      </div>
    </div>
  );
}