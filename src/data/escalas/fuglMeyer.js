// src/data/escalas/fuglMeyer.js
export const escalaFMA = {
    id: 'fma',
    nome: 'Escala de Fugl-Meyer (FMA)',
    descricao: 'Avaliação da recuperação sensoriomotora pós-AVC (Domínio Motor).',
    referencia: 'Maki et al. (2006) - Padrão-ouro para AVC.',
    perguntas: [
      // --- MEMBRO SUPERIOR (66 pts) ---
      { id: 'ms_refl', texto: 'MS: Atividade Reflexa (Bíceps/Tríceps)', tipo: 'radio', opcoes: [
        { valor: 0, label: 'Ausente' }, { valor: 2, label: 'Presente' }
      ]},
      { id: 'ms_sin_flex', texto: 'MS: Sinergia Flexora (Ombro/Cotovelo)', tipo: 'radio', opcoes: [
        { valor: 0, label: 'Não realiza' }, { valor: 1, label: 'Parcial' }, { valor: 2, label: 'Completa' }
      ]},
      { id: 'ms_sin_ext', texto: 'MS: Sinergia Extensora', tipo: 'radio', opcoes: [
        { valor: 0, label: 'Não realiza' }, { valor: 1, label: 'Parcial' }, { valor: 2, label: 'Completa' }
      ]},
      { id: 'ms_mist_1', texto: 'MS: Mão na coluna lombar', tipo: 'radio', opcoes: [
        { valor: 0, label: 'Não realiza' }, { valor: 1, label: 'Parcial' }, { valor: 2, label: 'Completa' }
      ]},
      { id: 'ms_mist_2', texto: 'MS: Flexão Ombro 90° (cotovelo estendido)', tipo: 'radio', opcoes: [
        { valor: 0, label: 'Não realiza' }, { valor: 1, label: 'Parcial' }, { valor: 2, label: 'Completa' }
      ]},
      { id: 'ms_punho', texto: 'MS: Estabilidade e Movimento do Punho', tipo: 'radio', opcoes: [
        { valor: 0, label: 'Nula' }, { valor: 1, label: 'Fraca' }, { valor: 2, label: 'Normal' }
      ]},
      { id: 'ms_mao', texto: 'MS: Funções de Preensão (Mão)', tipo: 'radio', opcoes: [
        { valor: 0, label: 'Incapaz' }, { valor: 1, label: 'Parcial' }, { valor: 2, label: 'Completa' }
      ]},
      { id: 'ms_coord', texto: 'MS: Coordenação e Velocidade', tipo: 'radio', opcoes: [
        { valor: 0, label: 'Marcada' }, { valor: 1, label: 'Leve' }, { valor: 2, label: 'Normal' }
      ]},
      
      // --- MEMBRO INFERIOR (34 pts) ---
      { id: 'mi_refl', texto: 'MI: Atividade Reflexa (Patelar/Aquileu)', tipo: 'radio', opcoes: [
        { valor: 0, label: 'Ausente' }, { valor: 2, label: 'Presente' }
      ]},
      { id: 'mi_sin_flex', texto: 'MI: Sinergia Flexora (Quadril/Joelho/Tornozelo)', tipo: 'radio', opcoes: [
        { valor: 0, label: 'Não realiza' }, { valor: 1, label: 'Parcial' }, { valor: 2, label: 'Completa' }
      ]},
      { id: 'mi_sin_ext', texto: 'MI: Sinergia Extensora', tipo: 'radio', opcoes: [
        { valor: 0, label: 'Não realiza' }, { valor: 1, label: 'Parcial' }, { valor: 2, label: 'Completa' }
      ]},
      { id: 'mi_mist', texto: 'MI: Flexão Joelho > 90° (sentado)', tipo: 'radio', opcoes: [
        { valor: 0, label: 'Não realiza' }, { valor: 1, label: 'Parcial' }, { valor: 2, label: 'Completa' }
      ]},
      { id: 'mi_sem_sin', texto: 'MI: Dorsiflexão em pé (joelho estendido)', tipo: 'radio', opcoes: [
        { valor: 0, label: 'Não realiza' }, { valor: 1, label: 'Parcial' }, { valor: 2, label: 'Completa' }
      ]},
      { id: 'mi_coord', texto: 'MI: Coordenação (Calcanhar-Tíbia)', tipo: 'radio', opcoes: [
        { valor: 0, label: 'Marcada' }, { valor: 1, label: 'Leve' }, { valor: 2, label: 'Normal' }
      ]}
    ],
    interpretarResultado: (scoreTotal) => {
      let nivel = '';
      let detalhes = '';
      
      if (scoreTotal < 50) {
        nivel = 'Comprometimento Severo';
        detalhes = 'Indica perdas motoras graves. Foco em estabilização e prevenção de complicações.';
      } else if (scoreTotal >= 50 && scoreTotal <= 84) {
        nivel = 'Comprometimento Marcante / Moderado';
        detalhes = 'Presença de sinergias marcantes com dificuldade de movimentos isolados.';
      } else if (scoreTotal >= 85 && scoreTotal <= 95) {
        nivel = 'Comprometimento Moderado / Leve';
        detalhes = 'Boa recuperação, mas com déficits em coordenação ou movimentos finos.';
      } else if (scoreTotal >= 96 && scoreTotal <= 99) {
        nivel = 'Comprometimento Leve';
        detalhes = 'Recuperação quase completa da função motora.';
      } else {
        nivel = 'Normal';
        detalhes = 'Função motora sem alterações detectáveis pela escala.';
      }
  
      return { 
        risco: nivel, 
        detalhes: detalhes,
        notaClinica: `Score Motor Total: ${scoreTotal}/100. Sempre avalie o lado não afetado primeiro para controle.`
      };
    }
  };