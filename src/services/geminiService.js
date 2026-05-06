// A rota oculta que criamos na Vercel
const API_URL = '/api/gemini';

export const buscarEscalaIA = async (nomeEscala) => {
  try {
    // Prompt altamente estruturado (Engenharia de Prompt)
    const prompt = `Atue como um fisioterapeuta pesquisador de nível sênior. Forneça a estrutura clínica completa da escala ou teste "${nomeEscala}".
    Retorne EXATAMENTE no formato JSON abaixo, garantindo que as propriedades e chaves sejam mantidas. 
    {
      "nome": "Nome Completo da Escala",
      "sigla": "SIGLA",
      "objetivo": "Para que serve de forma resumida",
      "instrucoes": "Como o profissional deve aplicar",
      "interpretacao": "Como interpretar o resultado final (pontuação de corte)",
      "itens": [
        {
          "pergunta": "Texto da Pergunta/Ação avaliada",
          "opcoes": [
            { "texto": "Opção A", "valor": 0 },
            { "texto": "Opção B", "valor": 1 }
          ]
        }
      ]
    }`;

    // Enviando o pedido para o nosso servidor na Vercel
    const resposta = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, formato: 'json' }) // A flag 'json' ativa a nova lógica na Vercel
    });

    const dados = await resposta.json();

    if (dados.erro) {
      return { erro: dados.erro };
    }

    // Transformamos a resposta de texto da IA num Objeto Javascript perfeitamente interativo
    let jsonEscala;
    try {
      jsonEscala = JSON.parse(dados.resultado);
    } catch (parseError) {
       // Tratamento de fallback caso a IA envie o texto com crases de markdown (```json ... ```)
       const textoLimpo = dados.resultado.replace(/```json/g, '').replace(/```/g, '').trim();
       jsonEscala = JSON.parse(textoLimpo);
    }

    return jsonEscala;

  } catch (error) {
    console.error("Erro de comunicação com o servidor:", error);
    return { erro: "O servidor da Vercel falhou ao processar a escala." };
  }
};