import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // Configuração de CORS para permitir a comunicação com o Frontend
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Ignorar requisições de verificação prévia (Preflight) do navegador
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

    // Recebe o prompt e o formato exigido pelo nosso Frontend
    const { prompt, formato } = req.body;

    if (!prompt) {
      return res.status(400).json({ erro: 'Prompt não recebido.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Se a requisição vier da aba "Avaliações", forçamos a IA a devolver um JSON puro
    const generationConfig = formato === 'json' ? { responseMimeType: "application/json" } : {};

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
    });

    const respostaTexto = result.response.text();

    return res.status(200).json({ resultado: respostaTexto });

  } catch (error) {
    console.error('Erro na API Gemini:', error);
    return res.status(500).json({ erro: 'Erro interno no servidor da Vercel.' });
  }
}