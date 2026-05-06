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

    // Blindagem de Parsing: Garante que a Vercel consegue ler o body independentemente da formatação
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { prompt } = body;

    if (!prompt) {
      return res.status(400).json({ erro: 'Prompt não recebido do frontend.' });
    }

    // PATCH v1.10.4: ADEQUAÇÃO PARA CHAVES NOVAS
    // Mudando do gemini-2.0-flash (bloqueado para contas novas) 
    // para o gemini-1.5-pro (modelo Premium, estável e universalmente aceito).
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;

    const googleRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    const data = await googleRes.json();

    // Se o Google devolver algum erro na requisição nativa (como erro de chave), capturamos aqui
    if (!googleRes.ok) {
      throw new Error(data.error?.message || 'Erro desconhecido na API REST do Google.');
    }

    // Navega diretamente no JSON de resposta do Google para extrair o texto gerado
    const respostaTexto = data.candidates[0].content.parts[0].text;

    return res.status(200).json({ resultado: respostaTexto });

  } catch (error) {
    console.error('Erro na API Gemini:', error);
    // Expondo a MENSAGEM REAL DO ERRO para o frontend para facilitar a nossa depuração
    return res.status(500).json({ erro: `Erro no Servidor: ${error.message}` });
  }
}