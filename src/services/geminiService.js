// A rota oculta que criamos na Vercel
const API_URL = '/api/gemini';

export const buscarEscalaIA = async (nomeEscala) => {
  try {
    // Prompt de Engenharia Reversa
    const prompt = `Atue como um fisioterapeuta pesquisador de nível sênior. Forneça a estrutura clínica completa da escala ou teste "${nomeEscala}".
    Retorne EXATAMENTE no formato JSON abaixo, sem nenhum texto de introdução ou conclusão.
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

    // Enviando o pedido para a Vercel
    const resposta = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    const dados = await resposta.json();

    if (dados.erro) {
      return { erro: dados.erro }; // Se a Vercel falhar, mostrará o erro real agora!
    }

    // ESTRATÉGIA DE EXTRAÇÃO SEGURA (JSON RECORTADO)
    let textoRaw = dados.resultado;
    let jsonExtraido = "";

    // Procura onde o JSON começa "{" e onde ele termina "}"
    const start = textoRaw.indexOf('{');
    const end = textoRaw.lastIndexOf('}');

    if (start !== -1 && end !== -1) {
        jsonExtraido = textoRaw.slice(start, end + 1);
    } else {
        return { erro: "A IA não conseguiu estruturar a escala em formulário." };
    }

    // Converte o texto fatiado para um Objeto React
    const jsonEscala = JSON.parse(jsonExtraido);
    return jsonEscala;

  } catch (error) {
    console.error("Erro de comunicação com o servidor:", error);
    return { erro: "Falha de rede ao tentar contactar a Vercel." };
  }
};