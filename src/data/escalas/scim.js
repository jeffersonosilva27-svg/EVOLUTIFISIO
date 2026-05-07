// src/data/escalas/scim.js
export const escalaSCIM = {
    id: 'scim',
    nome: 'Spinal Cord Independence Measure (SCIM III)',
    descricao: 'Avaliação funcional específica para pacientes com lesão medular.',
    tipoCalculo: 'soma',
    perguntas: [
      // --- AUTOCUIDADO (0-20 pts) ---
      { id: 'scim_1', texto: '1. Alimentação', tipo: 'radio', opcoes: [
        { valor: 0, label: 'Necessita de alimentação parenteral/enteral ou ajuda total' },
        { valor: 1, label: 'Necessita de ajuda para cortar, abrir recipientes ou levar à boca' },
        { valor: 2, label: 'Come sozinho, mas requer dispositivos adaptativos' },
        { valor: 3, label: 'Independente (usa talheres padrão)' }
      ]},
      { id: 'scim_2', texto: '2. Banho (Superior e Inferior)', tipo: 'radio', opcoes: [
        { valor: 0, label: 'Dependente total' },
        { valor: 1, label: 'Necessita de ajuda parcial' },
        { valor: 2, label: 'Independente com dispositivos' },
        { valor: 3, label: 'Totalmente independente' }
      ]},
  
      // --- RESPIRAÇÃO E ESFÍNCTERES (0-40 pts) ---
      { id: 'scim_3', texto: '3. Respiração', tipo: 'radio', opcoes: [
        { valor: 0, label: 'Ventilação mecânica permanente' },
        { valor: 2, label: 'Ventilação mecânica parcial' },
        { valor: 4, label: 'Respira sozinho com oxigênio ou ajuda para tosse' },
        { valor: 10, label: 'Respiração independente e sem auxílio' }
      ]},
      { id: 'scim_4', texto: '4. Gestão do Esfíncter Vesical (Bexiga)', tipo: 'radio', opcoes: [
        { valor: 0, label: 'Sonda permanente ou incontinência total' },
        { valor: 3, label: 'Sonda intermitente com ajuda' },
        { valor: 6, label: 'Sonda intermitente independente' },
        { valor: 9, label: 'Continente com dispositivos externos' },
        { valor: 15, label: 'Totalmente independente e continente' }
      ]},
  
      // --- MOBILIDADE (0-40 pts) ---
      { id: 'scim_5', texto: '5. Mobilidade no Leito e Transferências', tipo: 'radio', opcoes: [
        { valor: 0, label: 'Dependente total' },
        { valor: 2, label: 'Realiza apenas viradas no leito com ajuda' },
        { valor: 4, label: 'Independente no leito, mas precisa de ajuda para transferir' },
        { valor: 6, label: 'Totalmente independente em todas as transferências' }
      ]},
      { id: 'scim_6', texto: '6. Mobilidade (Quarto e Banheiro)', tipo: 'radio', opcoes: [
        { valor: 0, label: 'Dependente total' },
        { valor: 1, label: 'Usa cadeira de rodas manual com ajuda' },
        { valor: 2, label: 'Usa cadeira de rodas elétrica de forma independente' },
        { valor: 8, label: 'Caminha com auxílio de dispositivos e ajuda de terceiros' },
        { valor: 15, label: 'Caminha de forma totalmente independente' }
      ]}
    ],
    interpretarResultado: (scoreTotal) => {
      let conclusao = '';
      if (scoreTotal <= 30) conclusao = 'Independência Muito Limitada';
      else if (scoreTotal <= 65) conclusao = 'Independência Moderada';
      else conclusao = 'Alto nível de Independência Funcional';
  
      return { 
        risco: conclusao, 
        detalhes: `Pontuação Total: ${scoreTotal}/100.`,
        notaClinica: 'Nota: A SCIM III foca na habilidade real do paciente realizar a tarefa, independente do uso de órteses ou adaptações.'
      };
    }
  };