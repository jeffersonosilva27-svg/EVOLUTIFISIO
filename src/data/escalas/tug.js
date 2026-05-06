export const tug = {
    id: "escala-tug-002",
    nome: "Timed Up and Go (TUG) - Teste Completo",
    sigla: "TUG",
    objetivo: "Avaliar a mobilidade funcional, equilíbrio dinâmico e risco de quedas em idosos e pacientes neurológicos/ortopédicos.",
    instrucoes: "O paciente deve estar sentado em uma cadeira padrão com braços. Ao comando 'Vá', ele deve levantar-se, caminhar 3 metros em uma linha reta, virar 180 graus, retornar à cadeira e sentar-se. Avalie o tempo e a qualidade do movimento.",
    interpretacao: "0-1 pts: Normal/Independente (Até 10s) | 2-3 pts: Risco Baixo (11-19s) | 4-5 pts: Risco Moderado (20-29s) | 6+ pts: Alto Risco de Queda/Dependência (30s+)",
    itens: [
      {
        pergunta: "1. Tempo Total de Execução (Cronometrado)",
        opcoes: [
          { texto: "10 segundos ou menos (Independente)", valor: 0 },
          { texto: "11 a 19 segundos (Independência Básica / Risco Baixo)", valor: 1 },
          { texto: "20 a 29 segundos (Mobilidade Prejudicada / Risco Moderado)", valor: 3 },
          { texto: "30 segundos ou mais (Dependência / Alto Risco)", valor: 5 }
        ]
      },
      {
        pergunta: "2. Necessidade de Dispositivo de Auxílio",
        opcoes: [
          { texto: "Nenhum dispositivo (Marcha livre)", valor: 0 },
          { texto: "Usa bengala simples ou canadense", valor: 1 },
          { texto: "Usa andador articulado ou fixo", valor: 2 },
          { texto: "Necessita de assistência humana para realizar o teste", valor: 3 }
        ]
      },
      {
        pergunta: "3. Qualidade da Marcha e Equilíbrio (Observacional)",
        opcoes: [
          { texto: "Firme, passos simétricos, sem desequilíbrio aparente", valor: 0 },
          { texto: "Leve hesitação ao levantar, virar ou sentar", valor: 1 },
          { texto: "Desequilíbrio visível, passos curtos, usa os braços excessivamente", valor: 2 }
        ]
      }
    ]
  };