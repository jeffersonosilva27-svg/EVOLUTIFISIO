// src/data/escalas/wisci.js
export const escalaWISCI = {
    id: 'wisci',
    nome: 'Walking Index for Spinal Cord Injury (WISCI II)',
    descricao: 'Escala hierárquica de capacidade de marcha para lesão medular (10 metros).',
    tipoCalculo: 'selecao_unica', 
    perguntas: [
      {
        id: 'nivel_wisci',
        texto: 'Selecione o nível de marcha que melhor descreve o paciente:',
        tipo: 'radio',
        opcoes: [
          { valor: 0, label: '0: Incapaz de ficar em pé e/ou caminhar' },
          { valor: 1, label: '1: Deambula com ajuda de 2 pessoas, andador e órteses longas (KAFO)' },
          { valor: 2, label: '2: Deambula com ajuda de 2 pessoas, andador e órtese curta (AFO)' },
          { valor: 3, label: '3: Deambula com ajuda de 2 pessoas, andador e sem órteses' },
          { valor: 4, label: '4: Deambula com ajuda de 1 pessoa, andador e órteses longas (KAFO)' },
          { valor: 5, label: '5: Deambula com ajuda de 1 pessoa e andador (sem órteses)' },
          { valor: 6, label: '6: Deambula com ajuda de 1 pessoa, muletas canadenses e órteses longas' },
          { valor: 7, label: '7: Deambula com ajuda de 1 pessoa e muletas canadenses (sem órteses)' },
          { valor: 8, label: '8: Deambula com ajuda de 1 pessoa e muletas axilares (sem órteses)' },
          { valor: 9, label: '9: Deambula com ajuda de 1 pessoa e uma bengala (sem órteses)' },
          { valor: 10, label: '10: Deambula com andador e sem ajuda de pessoas (sem órteses)' },
          { valor: 11, label: '11: Deambula com muletas canadenses e sem ajuda de pessoas (com órteses)' },
          { valor: 12, label: '12: Deambula com muletas canadenses e sem ajuda de pessoas (sem órteses)' },
          { valor: 13, label: '13: Deambula com muletas axilares e sem ajuda de pessoas (sem órteses)' },
          { valor: 14, label: '14: Deambula com uma bengala e sem ajuda de pessoas (sem órteses)' },
          { valor: 15, label: '15: Deambula com ajuda de 1 pessoa e sem dispositivos/órteses' },
          { valor: 16, label: '16: Deambula com órteses curtas (AFO) e sem dispositivos/ajuda' },
          { valor: 17, label: '17: Deambula com uma muleta canadense e sem ajuda/órteses' },
          { valor: 18, label: '18: Deambula com uma bengala e sem ajuda/órteses' },
          { valor: 19, label: '19: Deambula sem dispositivos/órteses e sem ajuda (marcha alterada)' },
          { valor: 20, label: '20: Deambula sem dispositivos/órteses e sem ajuda (marcha normal)' }
        ]
      }
    ],
    interpretarResultado: (valor) => {
      // Para seleção única, o valor é o próprio nível
      const nivel = Number(valor);
      let categoria = '';
      
      if (nivel <= 8) categoria = 'Marcha com Assistência Severa';
      else if (nivel <= 15) categoria = 'Marcha com Assistência Moderada/Dispositivos';
      else categoria = 'Marcha com Independência Alta';
  
      return { 
        risco: `Nível WISCI II: ${nivel}`, 
        detalhes: categoria,
        notaClinica: 'Este teste avalia a capacidade e não a performance em ambiente comunitário. Considere o uso de órteses conforme descrito no nível.'
      };
    }
  };