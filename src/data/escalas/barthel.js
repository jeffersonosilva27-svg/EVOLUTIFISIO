export const escalaBarthel = {
    id: 'barthel',
    nome: 'Índice de Barthel (IB)',
    descricao: 'Avaliação da independência funcional nas Atividades de Vida Diária (AVDs).',
    perguntas: [
      {
        id: 'b1',
        texto: '1. Alimentação',
        opcoes: [
          { valor: 10, label: 'Independente (capaz de usar os talheres, comer no tempo normal)' },
          { valor: 5, label: 'Precisa de ajuda (para cortar alimentos, usar sal, etc.)' },
          { valor: 0, label: 'Dependente (precisa ser alimentado)' }
        ]
      },
      {
        id: 'b2',
        texto: '2. Banho',
        opcoes: [
          { valor: 5, label: 'Independente (capaz de tomar banho sem supervisão)' },
          { valor: 0, label: 'Dependente' }
        ]
      },
      {
        id: 'b3',
        texto: '3. Vestuário',
        opcoes: [
          { valor: 10, label: 'Independente (capaz de escolher roupas, vestir, abotoar)' },
          { valor: 5, label: 'Precisa de ajuda (faz metade da tarefa sozinho)' },
          { valor: 0, label: 'Dependente' }
        ]
      },
      {
        id: 'b4',
        texto: '4. Higiene Pessoal',
        opcoes: [
          { valor: 5, label: 'Independente (lava rosto, mãos, escova os dentes, barbeia-se)' },
          { valor: 0, label: 'Dependente' }
        ]
      },
      {
        id: 'b5',
        texto: '5. Intestino',
        opcoes: [
          { valor: 10, label: 'Continente (nenhum episódio de incontinência)' },
          { valor: 5, label: 'Acidente ocasional (menos de 1 vez por semana) ou precisa de ajuda com supositório' },
          { valor: 0, label: 'Incontinente (ou dependente de enema)' }
        ]
      },
      {
        id: 'b6',
        texto: '6. Bexiga',
        opcoes: [
          { valor: 10, label: 'Continente (nenhum episódio)' },
          { valor: 5, label: 'Acidente ocasional (máximo 1 vez por 24h) ou ajuda com sonda' },
          { valor: 0, label: 'Incontinente (ou dependente de sonda)' }
        ]
      },
      {
        id: 'b7',
        texto: '7. Uso do Banheiro',
        opcoes: [
          { valor: 10, label: 'Independente (entra, sai, limpa-se e veste-se)' },
          { valor: 5, label: 'Precisa de ajuda (para equilibrar-se, limpar-se ou com as roupas)' },
          { valor: 0, label: 'Dependente' }
        ]
      },
      {
        id: 'b8',
        texto: '8. Transferência (Cama/Cadeira)',
        opcoes: [
          { valor: 15, label: 'Independente (não precisa de ajuda)' },
          { valor: 10, label: 'Pouca ajuda (física ou verbal)' },
          { valor: 5, label: 'Muita ajuda (capaz de sentar-se, mas precisa de muita assistência para transferir)' },
          { valor: 0, label: 'Incapaz (sem equilíbrio sentado, requer 2 pessoas)' }
        ]
      },
      {
        id: 'b9',
        texto: '9. Mobilidade (Superfícies planas)',
        opcoes: [
          { valor: 15, label: 'Independente (caminha > 50 metros)' },
          { valor: 10, label: 'Ajuda de 1 pessoa (física ou verbal para caminhar 50m)' },
          { valor: 5, label: 'Independente na cadeira de rodas (impulsiona > 50 metros)' },
          { valor: 0, label: 'Imóvel' }
        ]
      },
      {
        id: 'b10',
        texto: '10. Escadas',
        opcoes: [
          { valor: 10, label: 'Independente (sobe e desce com segurança)' },
          { valor: 5, label: 'Precisa de ajuda (física ou supervisão)' },
          { valor: 0, label: 'Incapaz' }
        ]
      }
    ],
    interpretarResultado: (scoreTotal) => {
      let risco = '';
      let detalhes = '';
      
      if (scoreTotal === 100) {
        risco = 'Independência Total';
        detalhes = 'O paciente consegue realizar todas as atividades de vida diária sem assistência.';
      } else if (scoreTotal >= 91 && scoreTotal <= 99) {
        risco = 'Dependência Leve';
        detalhes = 'O paciente necessita de assistência mínima pontual.';
      } else if (scoreTotal >= 61 && scoreTotal <= 90) {
        risco = 'Dependência Moderada';
        detalhes = 'O paciente requer supervisão ou ajuda parcial em tarefas específicas.';
      } else if (scoreTotal >= 21 && scoreTotal <= 60) {
        risco = 'Dependência Severa';
        detalhes = 'O paciente necessita de assistência significativa para a maioria das atividades de vida diária.';
      } else {
        risco = 'Dependência Total';
        detalhes = 'O paciente é totalmente dependente de cuidados para todas as atividades.';
      }
  
      const notaClinica = scoreTotal <= 60 
        ? 'Atenção: Paciente com alto grau de dependência, exigindo suporte contínuo de cuidadores ou familiares.' 
        : '';
  
      return { risco, detalhes, notaClinica };
    }
  };