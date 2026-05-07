// src/data/escalas/tug.js
export const escalaTUG = {
  id: 'tug',
  nome: 'Teste Timed Up and Go (TUG)',
  descricao: 'Avaliação cronometrada da mobilidade funcional, agilidade, equilíbrio dinâmico e risco de quedas.',
  tipoCalculo: 'tempo', // Indica ao renderer que o score principal é o tempo
  perguntas: [
    {
      id: 'tempo_segundos',
      texto: 'Tempo total de execução',
      descricao: 'Cronometre desde o "Já" até o paciente encostar totalmente as costas novamente na cadeira.',
      tipo: 'numero',
      placeholder: 'Ex: 12.5 (em segundos)'
    },
    {
      id: 'q1',
      texto: '1. Levantar da cadeira',
      descricao: 'O paciente usou os braços para impulso? Houve hesitação ou múltiplas tentativas?',
      tipo: 'radio',
      opcoes: [
        { valor: 'Normal', label: 'Normal (Levantou sem hesitação e sem uso excessivo dos braços)' },
        { valor: 'Alterado', label: 'Alterado (Usou braços, hesitou ou precisou de tentativas)' }
      ]
    },
    {
      id: 'q2',
      texto: '2. Marcha (Ida)',
      descricao: 'O comprimento do passo é simétrico? A velocidade é constante? Há desvios?',
      tipo: 'radio',
      opcoes: [
        { valor: 'Normal', label: 'Normal (Passos simétricos, velocidade constante, trajetória linear)' },
        { valor: 'Alterado', label: 'Alterado (Desvios, passos assimétricos ou velocidade inconstante)' }
      ]
    },
    {
      id: 'q3',
      texto: '3. Giro (180 graus)',
      descricao: 'O giro foi feito em bloco? Houve desequilíbrio ou parada?',
      tipo: 'radio',
      opcoes: [
        { valor: 'Normal', label: 'Normal (Giro seguro, estável e contínuo)' },
        { valor: 'Alterado', label: 'Alterado (Giro em bloco, desequilíbrio transversal ou parada)' }
      ]
    },
    {
      id: 'q4',
      texto: '4. Marcha (Volta)',
      descricao: 'O padrão de caminhada se manteve ou houve fadiga?',
      tipo: 'radio',
      opcoes: [
        { valor: 'Normal', label: 'Normal (Padrão mantido, sem fadiga compensatória)' },
        { valor: 'Alterado', label: 'Alterado (Fadiga, lentidão ou alteração compensatória)' }
      ]
    },
    {
      id: 'q5',
      texto: '5. Sentar na cadeira',
      descricao: 'Controlou a descida ou "desabou"? Tateou os braços da cadeira?',
      tipo: 'radio',
      opcoes: [
        { valor: 'Normal', label: 'Normal (Descida controlada, segura e sem tatear excessivamente)' },
        { valor: 'Alterado', label: 'Alterado ("Desabou" no assento ou tateou muito os braços)' }
      ]
    }
  ],
  interpretarResultado: (respostas) => {
    // O valor do tempo vem do input numérico
    const tempo = parseFloat(respostas['tempo_segundos']) || 0;
    let risco = '';
    let detalhes = '';

    if (tempo <= 10) {
      risco = 'Normal (Baixo risco de quedas)';
      detalhes = 'Paciente totalmente independente e com mobilidade preservada.';
    } else if (tempo > 10 && tempo < 20) {
      risco = 'Mobilidade com leve prejuízo (Risco moderado a baixo)';
      detalhes = 'Independente para transferências básicas. Tempo esperado para idosos frágeis, mas independentes.';
    } else if (tempo >= 20 && tempo < 30) {
      risco = 'Mobilidade prejudicada (Alto risco de quedas)';
      detalhes = 'Dependente para algumas AVDs. Necessidade imediata de intervenção ou dispositivo de marcha.';
    } else {
      risco = 'Mobilidade severamente prejudicada (Risco altíssimo de quedas)';
      detalhes = 'Paciente dependente na maioria das atividades diárias.';
    }

    const notaClinica = tempo >= 12.4 
      ? 'Atenção: Tempo superior ao ponto de corte brasileiro (12,4s). Alerta clínico sistêmico para risco iminente de quedas.' 
      : '';

    return { risco, detalhes, notaClinica, scoreDisplay: `${tempo} segundos` };
  }
};