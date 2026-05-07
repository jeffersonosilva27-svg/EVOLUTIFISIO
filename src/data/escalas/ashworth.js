// src/data/escalas/ashworth.js
export const escalaMAS = {
    id: 'mas',
    nome: 'Escala de Ashworth Modificada (MAS)',
    descricao: 'Avaliação clínica da espasticidade e resistência ao movimento passivo (Bohannon & Smith).',
    tipoCalculo: 'selecao_unica',
    perguntas: [
      {
        id: 'grupo_muscular',
        texto: 'Grupo Muscular Avaliado',
        tipo: 'texto',
        placeholder: 'Ex: Flexores do Cotovelo, Plantiflexores...'
      },
      {
        id: 'nivel_mas',
        texto: 'Selecione o grau de resistência encontrado:',
        tipo: 'radio',
        opcoes: [
          { valor: "0", label: '0: Sem aumento no tônus muscular.' },
          { valor: "1", label: '1: Discreto aumento (catch e soltura ou resistência no final da ADM).' },
          { valor: "1+", label: '1+: Discreto aumento (catch seguido de resistência mínima em < 50% da ADM).' },
          { valor: "2", label: '2: Aumento mais marcante na maior parte da ADM (movimento ainda fácil).' },
          { valor: "3", label: '3: Aumento considerável (movimento passivo difícil).' },
          { valor: "4", label: '4: Rigidez (parte afetada rígida em flexão ou extensão).' }
        ]
      }
    ],
    interpretarResultado: (respostas) => {
      const valor = respostas['nivel_mas'];
      let interpretacao = '';
      let alerta = '';
      
      switch(valor) {
        case "0": interpretacao = 'Tônus Normal'; break;
        case "1": interpretacao = 'Espasticidade Leve'; break;
        case "1+": interpretacao = 'Espasticidade Leve a Moderada'; break;
        case "2": interpretacao = 'Espasticidade Moderada'; break;
        case "3": interpretacao = 'Espasticidade Grave'; 
          alerta = 'Risco de contraturas e deformidades. Considerar intervenção intensiva.'; break;
        case "4": interpretacao = 'Rigidez Extrema'; 
          alerta = 'Impossibilidade de movimento passivo. Alto risco de anquilose.'; break;
      }
  
      return { 
        risco: `Grau MAS: ${valor}`, 
        detalhes: interpretacao,
        notaClinica: alerta || 'Resultado estável para monitoramento.'
      };
    }
  };