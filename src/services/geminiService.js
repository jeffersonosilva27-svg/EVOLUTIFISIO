import { GoogleGenerativeAI } from "@google/generative-ai";

// Tenta buscar a chave de diferentes formas para evitar erro de 'IA Indisponível'
const API_KEY = import.meta.env.VITE_GEMINI_KEY || import.meta.env.VITE_GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(API_KEY);

// 1. IA PARA O PRONTUÁRIO (SOAP)
export const analisarEvolucao = async (textoSubjetivo) => {
  if (!API_KEY) return "Erro: Chave da IA não configurada no sistema.";
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      Você é um Fisioterapeuta e Terapeuta Ocupacional sênior.
      Transforme o relato informal abaixo em uma evolução clínica técnica (padrão SOAP).
      Use terminologia acadêmica.
      
      RELATO: "${textoSubjetivo}"
    `;
    const result = await model.generateContent(prompt);
    return await result.response.text();
  } catch (error) {
    console.error("Erro no Gemini (SOAP):", error);
    return "Falha ao gerar evolução com IA. Verifique a chave de API.";
  }
};

// 2. IA PARA RESOLUÇÃO DE CONFLITOS DE AGENDA
export const resolverConflitoAgenda = async (dadosConflito) => {
  if (!API_KEY) return "Chave de IA ausente.";

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      Você é um assistente inteligente de agendamento de uma clínica de reabilitação.
      Ocorreu um conflito de agenda:
      - Tentativa: Dia ${dadosConflito.data} às ${dadosConflito.hora}
      - Problema: ${dadosConflito.motivo}.
      
      A clínica funciona de segunda a sexta, das 08:00 às 18:00.
      Sugira 3 horários alternativos de forma direta e curta. 
    `;
    const result = await model.generateContent(prompt);
    return await result.response.text();
  } catch (error) {
    console.error("Erro no Gemini (Agenda):", error);
    return "Sugestão indisponível. Tente mudar o horário ou o profissional.";
  }
};

// 3. IA PARA BUSCA DE ESCALAS E TESTES
export const buscarEscalaIA = async (pergunta) => {
  if (!API_KEY) return "IA Indisponível: Chave de API não encontrada nas variáveis de ambiente.";

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      Você é um pesquisador e professor PhD em Fisioterapia e Terapia Ocupacional.
      O usuário está buscando uma escala de avaliação ou teste especial para a seguinte situação:
      "${pergunta}"
      
      Por favor, encontre a escala/teste mais validada cientificamente para este caso e responda usando Markdown.
      Estrutura: Nome da Escala, Indicação, Como Aplicar e Interpretação.
    `;
    const result = await model.generateContent(prompt);
    return await result.response.text();
  } catch (error) {
    console.error("Erro no Gemini (Escalas):", error);
    return "Erro ao acessar a IA. Verifique se a sua cota de uso ou a chave de API estão corretas.";
  }
};