import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_KEY || import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// 1. IA PARA O PRONTUÁRIO (SOAP)
export const analisarEvolucao = async (textoSubjetivo) => {
  if (!API_KEY) return "Erro: Chave da IA não configurada.";
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Transforme o relato informal: "${textoSubjetivo}" em uma evolução técnica padrão SOAP. Use terminologia acadêmica.`;
    const result = await model.generateContent(prompt);
    return await result.response.text();
  } catch (error) { return "Falha ao gerar evolução."; }
};

// 2. AGENTE DE ANÁLISE QUALITATIVA E QUANTITATIVA DE HISTÓRICO
export const realizarAnaliseIAHistorico = async (pacienteNome, historico) => {
  if (!API_KEY) return "IA Indisponível.";
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Analise o histórico de ${pacienteNome}: ${JSON.stringify(historico)}. Realize: 1. Análise Qualitativa (Tendências). 2. Análise Quantitativa. 3. Insights Estratégicos.`;
    const result = await model.generateContent(prompt);
    return await result.response.text();
  } catch (error) { return "Erro ao analisar histórico."; }
};

// 3. RESOLVER CONFLITOS DE AGENDA
export const resolverConflitoAgenda = async (dadosConflito) => {
  if (!API_KEY) return "Sugestão: Tente realocar para o próximo dia útil.";
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Houve um conflito na agenda: ${dadosConflito.motivo}. Dê uma sugestão curta e educada de realocação.`;
    const result = await model.generateContent(prompt);
    return await result.response.text();
  } catch (error) { return "Erro ao sugerir realocação."; }
};

// 4. BUSCA DE ESCALAS (Avaliações)
export const buscarEscalaIA = async (pergunta) => {
  if (!API_KEY) return "Erro de Chave IA.";
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`Responda como especialista sobre a escala/teste: ${pergunta}`);
    return await result.response.text();
  } catch (error) { return "Erro ao buscar dados."; }
};

// 5. ANÁLISE DE CAPACIDADE FUNCIONAL (A nova função da Agenda!)
export const analisarCapacidadePaciente = async (historico) => {
  if (!API_KEY || !historico || historico.length === 0) return "Paciente sem histórico suficiente na base de dados.";
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Analise estas 3 últimas evoluções: ${JSON.stringify(historico)}. Liste os exercícios realizados e defina a capacidade funcional atual do paciente em uma frase curta e técnica.`;
    const result = await model.generateContent(prompt);
    return await result.response.text();
  } catch (e) { return "Erro na análise de capacidade."; }
};

// 6. TRANSCRIÇÃO E LAUDO DE EXAMES (TEDE/Imagens)
export const transcreverExameIA = async (base64Image) => {
  if (!API_KEY) return "IA não configurada.";
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Analise este exame. Extraia os dados numéricos para uma tabela e crie um laudo comparativo baseado na literatura acadêmica fisioterapêutica/médica atual. Retorne em Markdown separando Dados, Comparativo e Laudo Clínico.`;
    const result = await model.generateContent([prompt, { inlineData: { data: base64Image, mimeType: "image/jpeg" } }]);
    return await result.response.text();
  } catch (e) { return "Erro ao transcrever exame. Verifique a qualidade da imagem."; }
};