import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // Configuração de CORS para comunicação fluida com o Frontend
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Libera a verificação de segurança inicial do navegador
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido. Utilize POST.' });
  }

  try {
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ erro: 'Chave de API não configurada na Vercel.' });
    }

    // Blindagem de Parsing: Garante que a Vercel consegue ler o body
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { prompt } = body;

    if (!prompt) {
      return res.status(400).json({ erro: 'Prompt não recebido do frontend.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // PATCH V1.10.1: Usar 'gemini-pro' que é 100% suportado por todas as versões do SDK antigo
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Chamada limpa e nativa, compatível com todas as versões do SDK do Google
    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const respostaTexto = result.response.text();

    return res.status(200).json({ resultado: respostaTexto });

  } catch (error) {
    console.error('Erro na API Gemini:', error);
    // Expondo a MENSAGEM REAL DO ERRO para o frontend (facilita o nosso debug)
    return res.status(500).json({ erro: `Erro no Servidor: ${error.message}` });
  }
}