// src/data/escalas/berg.js
export const escalaBerg = {
  id: 'berg',
  nome: 'Escala de Equilíbrio de Berg (EEB)',
  descricao: 'Avaliação quantitativa do equilíbrio funcional e risco de quedas (14 tarefas).',
  perguntas: [
    { id: 'q1', texto: '1. Passando de sentado para em pé', opcoes: [
      { valor: 4, label: 'Capaz de ficar em pé sem usar as mãos e estabilizar-se independente' },
      { valor: 3, label: 'Capaz de ficar em pé independente usando as mãos' },
      { valor: 2, label: 'Capaz de ficar em pé usando as mãos após várias tentativas' },
      { valor: 1, label: 'Precisa de assistência mínima para ficar em pé ou estabilizar-se' },
      { valor: 0, label: 'Precisa de assistência moderada ou máxima para ficar em pé' }
    ]},
    { id: 'q2', texto: '2. Permanecendo em pé sem apoio', opcoes: [
      { valor: 4, label: 'Capaz de permanecer em pé seguro por 2 minutos' },
      { valor: 3, label: 'Capaz de permanecer em pé por 2 minutos com supervisão' },
      { valor: 2, label: 'Capaz de permanecer em pé por 30 segundos sem apoio' },
      { valor: 1, label: 'Precisa de várias tentativas para permanecer em pé por 30 segundos sem apoio' },
      { valor: 0, label: 'Incapaz de permanecer em pé por 30 segundos sem assistência' }
    ]},
    { id: 'q3', texto: '3. Permanecendo sentado sem apoio nas costas', opcoes: [
      { valor: 4, label: 'Capaz de permanecer sentado seguro e firme por 2 minutos' },
      { valor: 3, label: 'Capaz de permanecer sentado por 2 minutos sob supervisão' },
      { valor: 2, label: 'Capaz de permanecer sentado por 30 segundos' },
      { valor: 1, label: 'Capaz de permanecer sentado por 10 segundos' },
      { valor: 0, label: 'Incapaz de permanecer sentado sem apoio por 10 segundos' }
    ]},
    { id: 'q4', texto: '4. Passando de em pé para sentado', opcoes: [
      { valor: 4, label: 'Senta-se seguro com uso mínimo das mãos' },
      { valor: 3, label: 'Controla a descida usando as mãos' },
      { valor: 2, label: 'Usa a parte posterior das pernas contra a cadeira para controlar a descida' },
      { valor: 1, label: 'Senta-se independente, mas tem descida descontrolada' },
      { valor: 0, label: 'Precisa de assistência para sentar-se' }
    ]},
    { id: 'q5', texto: '5. Transferências', opcoes: [
      { valor: 4, label: 'Capaz de transferir-se seguro com uso mínimo das mãos' },
      { valor: 3, label: 'Capaz de transferir-se seguro com uso das mãos' },
      { valor: 2, label: 'Capaz de transferir-se com supervisão verbal e/ou tátil' },
      { valor: 1, label: 'Precisa de uma pessoa para ajudar' },
      { valor: 0, label: 'Precisa de duas pessoas para ajudar ou supervisionar' }
    ]},
    { id: 'q6', texto: '6. Em pé sem apoio com olhos fechados', opcoes: [
      { valor: 4, label: 'Capaz de permanecer em pé por 10 segundos com segurança' },
      { valor: 3, label: 'Capaz de permanecer em pé por 10 segundos com supervisão' },
      { valor: 2, label: 'Capaz de permanecer em pé por 3 segundos' },
      { valor: 1, label: 'Incapaz de manter os olhos fechados por 3 segundos, mas estabiliza-se' },
      { valor: 0, label: 'Precisa de ajuda para não cair' }
    ]},
    { id: 'q7', texto: '7. Em pé sem apoio com os pés juntos', opcoes: [
      { valor: 4, label: 'Capaz de posicionar os pés juntos independente e permanecer por 1 minuto' },
      { valor: 3, label: 'Capaz de posicionar independente e permanecer por 1 minuto sob supervisão' },
      { valor: 2, label: 'Capaz de posicionar independente, mas não mantém por 30 segundos' },
      { valor: 1, label: 'Precisa de ajuda para posicionar, mas mantém por 15 segundos' },
      { valor: 0, label: 'Precisa de ajuda para posicionar e não mantém por 15 segundos' }
    ]},
    { id: 'q8', texto: '8. Alcançando à frente com braço estendido', opcoes: [
      { valor: 4, label: 'Capaz de alcançar à frente > 25 cm com segurança' },
      { valor: 3, label: 'Capaz de alcançar à frente > 12,5 cm com segurança' },
      { valor: 2, label: 'Capaz de alcançar à frente > 5 cm com segurança' },
      { valor: 1, label: 'Alcança à frente, mas precisa de supervisão' },
      { valor: 0, label: 'Perde o equilíbrio ao tentar/precisa de apoio' }
    ]},
    { id: 'q9', texto: '9. Pegando objeto do chão em pé', opcoes: [
      { valor: 4, label: 'Capaz de pegar o objeto com segurança e facilidade' },
      { valor: 3, label: 'Capaz de pegar o objeto, mas precisa de supervisão' },
      { valor: 2, label: 'Incapaz de pegar, mas alcança de 2 a 5 cm do objeto' },
      { valor: 1, label: 'Incapaz de pegar e precisa de supervisão enquanto tenta' },
      { valor: 0, label: 'Incapaz de tentar/precisa de assistência para não cair' }
    ]},
    { id: 'q10', texto: '10. Virando para olhar para trás', opcoes: [
      { valor: 4, label: 'Olha para trás de ambos os lados com boa transferência de peso' },
      { valor: 3, label: 'Olha para trás de um lado apenas, outro lado apresenta menor rotação' },
      { valor: 2, label: 'Vira a cabeça apenas para os lados, mantendo o equilíbrio' },
      { valor: 1, label: 'Precisa de supervisão ao virar' },
      { valor: 0, label: 'Precisa de assistência para não cair' }
    ]},
    { id: 'q11', texto: '11. Girando 360 graus', opcoes: [
      { valor: 4, label: 'Capaz de girar 360 graus com segurança em < 4 segundos para ambos lados' },
      { valor: 3, label: 'Capaz de girar 360 graus com segurança, mas lento (> 4 segundos)' },
      { valor: 2, label: 'Capaz de girar 360 graus com segurança, mas para um lado apenas' },
      { valor: 1, label: 'Precisa de supervisão ou orientação verbal' },
      { valor: 0, label: 'Precisa de assistência enquanto gira' }
    ]},
    { id: 'q12', texto: '12. Pés alternados no degrau', opcoes: [
      { valor: 4, label: 'Fica em pé independente e seguro, completando 8 passos em < 20s' },
      { valor: 3, label: 'Fica em pé independente e completa 8 passos em > 20s' },
      { valor: 2, label: 'Capaz de completar 4 passos sem ajuda sob supervisão' },
      { valor: 1, label: 'Capaz de completar > 2 passos, com mínima assistência' },
      { valor: 0, label: 'Precisa de assistência para não cair/incapaz de tentar' }
    ]},
    { id: 'q13', texto: '13. Em pé sem apoio com um pé à frente', opcoes: [
      { valor: 4, label: 'Capaz de posicionar o pé independente e manter por 30 segundos' },
      { valor: 3, label: 'Capaz de colocar o pé um pouco à frente e manter por 30 segundos' },
      { valor: 2, label: 'Capaz de dar um pequeno passo independente e manter por 30 segundos' },
      { valor: 1, label: 'Precisa de ajuda para posicionar, mas mantém por 15 segundos' },
      { valor: 0, label: 'Perde o equilíbrio ao dar o passo ou ao tentar manter' }
    ]},
    { id: 'q14', texto: '14. Em pé sobre uma perna', opcoes: [
      { valor: 4, label: 'Capaz de levantar uma perna independente e manter por > 10 segundos' },
      { valor: 3, label: 'Capaz de levantar uma perna independente e manter por 5 a 10 segundos' },
      { valor: 2, label: 'Capaz de levantar uma perna independente e manter por > 3 segundos' },
      { valor: 1, label: 'Tenta levantar a perna, incapaz de manter por 3 seg' },
      { valor: 0, label: 'Incapaz de tentar/precisa de assistência para não cair' }
    ]}
  ],
  interpretarResultado: (scoreTotal) => {
    let risco = '';
    let detalhes = '';
    if (scoreTotal >= 41) { risco = 'Baixo risco de queda'; detalhes = 'Marcha geralmente independente.'; }
    else if (scoreTotal >= 21) { risco = 'Médio risco de queda'; detalhes = 'Caminha com auxílio/dispositivos.'; }
    else { risco = 'Alto risco de queda'; detalhes = 'Mobilidade severamente reduzida.'; }

    const notaClinica = scoreTotal < 45 ? 'Atenção: Pontuação abaixo do cut-off (45). Alto risco de quedas recorrentes.' : '';
    return { risco, detalhes, notaClinica };
  }
};