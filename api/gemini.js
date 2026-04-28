// api/gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // Apenas aceita requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Puxa a chave segura guardada na Vercel (Repare que NÃO tem VITE_)
  const API_KEY = process.env.GEMINI_API_KEY;
  
  if (!API_KEY) {
    return res.status(500).json({ error: "Chave da API não configurada no servidor Vercel." });
  }

  const genAI = new GoogleGenerativeAI(API_KEY);

  try {
    const { action, payload } = req.body;
    let prompt = "";
    let isJson = false;
    let imagePart = null;

    // Transfere toda a inteligência dos Prompts para o Servidor (Oculto do utilizador)
    switch (action) {
      case 'analisarEvolucao':
        prompt = `Transforme o relato informal: "${payload.textoSubjetivo}" em uma evolução técnica padrão SOAP. Use terminologia acadêmica.`;
        break;
      
      case 'realizarAnaliseIAHistorico':
        prompt = `Analise o histórico de ${payload.pacienteNome}: ${JSON.stringify(payload.historico)}. Realize: 1. Análise Qualitativa (Tendências). 2. Análise Quantitativa. 3. Insights Estratégicos. Retorne em Markdown elegante.`;
        break;
      
      case 'resolverConflitoAgenda':
        prompt = `Houve um conflito na agenda: ${payload.dadosConflito?.motivo}. Dê uma sugestão curta e educada de realocação para o paciente.`;
        break;
      
      case 'buscarEscalaIA':
        isJson = true;
        prompt = `
          ATENÇÃO: Você é um sistema de banco de dados (API). A sua única função é retornar um objeto JSON estruturado.
          O utilizador buscou pelo teste clínico: "${payload.nomeEscala}".

          REGRAS CRÍTICAS:
          1. NÃO escreva texto de introdução ou conclusão. Retorne EXCLUSIVAMENTE o código JSON.
          2. NÃO utilize quebras de linha reais (Enters) dentro dos textos das variáveis.
          
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
        break;
      
      case 'analisarCapacidadePaciente':
        prompt = `Analise estas 3 últimas evoluções: ${JSON.stringify(payload.historico)}. Liste os exercícios realizados e defina a capacidade funcional atual do paciente em uma frase curta e técnica.`;
        break;
      
      case 'transcreverExameIA':
        prompt = `Analise este exame/documento clínico. Extraia os dados numéricos principais para uma tabela e crie um laudo comparativo baseado na literatura acadêmica fisioterapêutica/médica atual. Retorne em Markdown estruturado separando Dados Obtidos, Comparativo e Laudo Clínico.`;
        imagePart = { inlineData: { data: payload.base64Image, mimeType: "image/jpeg" } };
        break;

      default:
        return res.status(400).json({ error: "Ação de IA desconhecida." });
    }

    // Configura o modelo
    const modelConfig = { model: "gemini-1.5-flash-latest" };
    if (isJson) {
      modelConfig.generationConfig = { responseMimeType: "application/json" };
    }
    
    const model = genAI.getGenerativeModel(modelConfig);
    
    let result;
    if (imagePart) {
      result = await model.generateContent([prompt, imagePart]);
    } else {
      result = await model.generateContent(prompt);
    }

    const texto = await result.response.text();
    return res.status(200).json({ result: texto });

  } catch (error) {
    console.error("Erro no Servidor Gemini:", error);
    return res.status(500).json({ error: error.message });
  }
}