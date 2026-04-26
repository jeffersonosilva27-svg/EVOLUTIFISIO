import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_KEY || import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// 1. IA PARA O PRONTUÁRIO (SOAP)
export const analisarEvolucao = async (textoSubjetivo) => {
  if (!API_KEY) return "Erro: Chave da IA não configurada.";
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Você é um Fisioterapeuta/TO sênior. Transforme o relato informal: "${textoSubjetivo}" em uma evolução técnica padrão SOAP. Use terminologia acadêmica.`;
    const result = await model.generateContent(prompt);
    return await result.response.text();
  } catch (error) { return "Falha ao gerar evolução."; }
};

// 2. NOVO: AGENTE DE ANÁLISE QUALITATIVA E QUANTITATIVA DE HISTÓRICO
export const realizarAnaliseIAHistorico = async (pacienteNome, historico) => {
  if (!API_KEY) return "IA Indisponível.";
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      Você é um especialista em análise de dados clínicos e reabilitação.
      Analise o histórico de atendimentos do paciente ${pacienteNome}:
      
      HISTÓRICO:
      ${JSON.stringify(historico)}
      
      Sua tarefa é realizar:
      1. ANÁLISE QUALITATIVA: Tendências de melhora ou estagnação baseada nos relatos.
      2. ANÁLISE QUANTITATIVA: Frequência de faltas vs atendimentos, e progresso de escalas se houver.
      3. INSIGHTS ESTRATÉGICOS: Sugira ajustes na conduta baseados nas evidências do histórico.
      
      Responda em Markdown elegante, com tópicos claros e uma conclusão executiva.
    `;
    const result = await model.generateContent(prompt);
    return await result.response.text();
  } catch (error) { return "Erro ao analisar histórico."; }
};

export const resolverConflitoAgenda = async (dadosConflito) => { /* ... (mantido igual) */ };
export const buscarEscalaIA = async (pergunta) => { /* ... (mantido igual) */ };