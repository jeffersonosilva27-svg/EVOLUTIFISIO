// src/services/geminiService.js

// 1. Função central que se comunica com o nosso próprio servidor Vercel
const callGeminiAPI = async (action, payload) => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
       throw new Error(data.error || 'Erro interno na API');
    }
    return data.result;
  } catch (error) {
    console.error(`Erro ao comunicar com o servidor de IA (${action}):`, error);
    return null;
  }
};

// =========================================================================
// FUNÇÕES EXPORTADAS (Mantêm a mesma estrutura para o resto do sistema não quebrar)
// =========================================================================

export const analisarEvolucao = async (textoSubjetivo) => {
  const res = await callGeminiAPI('analisarEvolucao', { textoSubjetivo });
  return res || "Erro ao analisar evolução no servidor.";
};

export const realizarAnaliseIAHistorico = async (pacienteNome, historico) => {
  const res = await callGeminiAPI('realizarAnaliseIAHistorico', { pacienteNome, historico });
  return res || "Erro ao analisar o histórico no servidor.";
};

export const resolverConflitoAgenda = async (dadosConflito) => {
  const res = await callGeminiAPI('resolverConflitoAgenda', { dadosConflito });
  return res || "Sugestão: Tente realocar para o próximo dia útil.";
};

export const buscarEscalaIA = async (nomeEscala) => {
  const res = await callGeminiAPI('buscarEscalaIA', { nomeEscala });
  if (!res) return { erro: "Falha de comunicação com o servidor de escalas." };
  
  try {
    return JSON.parse(res);
  } catch (e) {
    return { erro: "O servidor retornou dados em formato inválido." };
  }
};

export const analisarCapacidadePaciente = async (historico) => {
  if (!historico || historico.length === 0) return "O paciente ainda não possui evoluções suficientes para gerar o insight.";
  const res = await callGeminiAPI('analisarCapacidadePaciente', { historico });
  return res || "Erro ao processar capacidade funcional.";
};

export const transcreverExameIA = async (base64Image) => {
  const res = await callGeminiAPI('transcreverExameIA', { base64Image });
  return res || "Erro ao processar a transcrição da imagem no servidor.";
};