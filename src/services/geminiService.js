import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. LÊ A CHAVE DO FICHEIRO .env
const API_KEY = import.meta.env.VITE_GEMINI_KEY || import.meta.env.VITE_GEMINI_API_KEY;

// 2. SISTEMA DE DETEÇÃO DE CHAVE "FANTASMA" (Para o ajudar a descobrir se o Vite está a ler a chave velha)
console.log("🔑 STATUS DA CHAVE IA:", API_KEY ? `Lida com sucesso (Inicia com: ${API_KEY.substring(0, 10)}...)` : "NENHUMA CHAVE ENCONTRADA NO .ENV!");

// 3. INICIALIZA A IA
const genAI = new GoogleGenerativeAI(API_KEY || "chave-invalida");

// =========================================================================
// 1. IA PARA O PRONTUÁRIO (SOAP)
// =========================================================================
export const analisarEvolucao = async (textoSubjetivo) => {
  if (!API_KEY) return "Erro: Chave da IA não configurada.";
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const prompt = `Transforme o relato informal: "${textoSubjetivo}" em uma evolução técnica padrão SOAP. Use terminologia acadêmica.`;
    const result = await model.generateContent(prompt);
    return await result.response.text();
  } catch (error) { 
    return `Falha da IA: ${error.message}`; 
  }
};

// =========================================================================
// 2. AGENTE DE ANÁLISE QUALITATIVA E QUANTITATIVA DE HISTÓRICO
// =========================================================================
export const realizarAnaliseIAHistorico = async (pacienteNome, historico) => {
  if (!API_KEY) return "Erro: Chave da IA não configurada.";
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const prompt = `Analise o histórico de ${pacienteNome}: ${JSON.stringify(historico)}. Realize: 1. Análise Qualitativa (Tendências). 2. Análise Quantitativa. 3. Insights Estratégicos. Retorne em Markdown elegante.`;
    const result = await model.generateContent(prompt);
    return await result.response.text();
  } catch (error) { 
    return `Erro ao analisar: ${error.message}`; 
  }
};

// =========================================================================
// 3. RESOLVER CONFLITOS DE AGENDA
// =========================================================================
export const resolverConflitoAgenda = async (dadosConflito) => {
  if (!API_KEY) return "Sugestão: Tente realocar para o próximo dia útil.";
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const prompt = `Houve um conflito na agenda: ${dadosConflito.motivo}. Dê uma sugestão curta e educada de realocação para o paciente.`;
    const result = await model.generateContent(prompt);
    return await result.response.text();
  } catch (error) { 
    return "Erro ao sugerir realocação."; 
  }
};

// =========================================================================
// 4. BUSCA DE ESCALAS (BLINDAGEM DUPLA + NOME DE SERVIDOR CORRETO)
// =========================================================================
export const buscarEscalaIA = async (nomeEscala) => {
  if (!API_KEY) return { erro: "Chave da IA não configurada no ficheiro .env." };
  
  try {
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash-latest",
        generationConfig: { responseMimeType: "application/json" }
    });
    
    const prompt = `
      ATENÇÃO: Você é um sistema de banco de dados (API). A sua única função é retornar um objeto JSON estruturado.
      O utilizador buscou pelo teste clínico: "${nomeEscala}".

      REGRAS CRÍTICAS:
      1. NÃO escreva texto de introdução ou conclusão. Retorne EXCLUSIVAMENTE o código JSON.
      2. NÃO utilize quebras de linha reais (Enters) dentro dos textos das variáveis.
      3. A estrutura abaixo deve ser seguida rigorosamente.
      
      ESTRUTURA OBRIGATÓRIA:
      {
        "nome": "Nome completo",
        "sigla": "Sigla",
        "objetivo": "Resumo do objetivo",
        "instrucoes": "Como aplicar a escala",
        "itens": [
          {
            "pergunta": "Pergunta ou tarefa a avaliar",
            "opcoes": [
              {"texto": "Resposta A", "valor": 0},
              {"texto": "Resposta B", "valor": 1}
            ]
          }
        ],
        "interpretacao": "Laudo final"
      }

      Se a escala não for encontrada no banco científico, retorne APENAS:
      {"erro": "Escala não encontrada no banco de dados científico."}
    `;
    
    const result = await model.generateContent(prompt);
    const texto = await result.response.text();
    
    return JSON.parse(texto);

  } catch (error) { 
    console.error("ERRO COMPLETO DA IA:", error);
    return { erro: `ERRO DA IA: ${error.message}` }; 
  }
};

// =========================================================================
// 5. ANÁLISE DE CAPACIDADE FUNCIONAL (Mini Insight da Agenda)
// =========================================================================
export const analisarCapacidadePaciente = async (historico) => {
  if (!API_KEY) return "Erro: Chave da IA não configurada.";
  if (!historico || historico.length === 0) return "O paciente ainda não possui evoluções suficientes para gerar o insight.";
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const prompt = `Analise estas 3 últimas evoluções: ${JSON.stringify(historico)}. Liste os exercícios realizados e defina a capacidade funcional atual do paciente em uma frase curta e técnica.`;
    const result = await model.generateContent(prompt);
    return await result.response.text();
  } catch (e) {
    return `Erro na IA do Google: ${e.message}`; 
  }
};

// =========================================================================
// 6. TRANSCRIÇÃO E LAUDO DE EXAMES (TEDE/Imagens/PDFs)
// =========================================================================
export const transcreverExameIA = async (base64Image) => {
  if (!API_KEY) return "Erro: Chave da IA não configurada.";
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const prompt = `Analise este exame/documento clínico. Extraia os dados numéricos principais para uma tabela e crie um laudo comparativo baseado na literatura acadêmica fisioterapêutica/médica atual. Retorne em Markdown estruturado separando Dados Obtidos, Comparativo e Laudo Clínico.`;
    const result = await model.generateContent([prompt, { inlineData: { data: base64Image, mimeType: "image/jpeg" } }]);
    return await result.response.text();
  } catch (e) { 
    return `Erro ao transcrever exame: ${e.message}`; 
  }
};