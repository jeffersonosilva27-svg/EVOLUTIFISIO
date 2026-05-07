// src/data/escalas/berg.js
export const escalaBerg = {
  id: 'berg_balance_scale',
  nome: "Escala de Equilíbrio de Berg",
  sigla: "BBS",
  objetivo: "Avaliar o equilíbrio funcional e predizer o risco de quedas.",
  instrucoes: "Instrua o paciente a realizar as 14 tarefas abaixo. Pontue de 0 a 4.",
  itens: [
    { pergunta: "1. Sentado para em pé", opcoes: [{texto: "Ajuda máxima", valor: 0}, {texto: "Ajuda moderada", valor: 1}, {texto: "Usa mãos", valor: 2}, {texto: "Usa mãos/Indep", valor: 3}, {texto: "Sem mãos/Seguro", valor: 4}] },
    { pergunta: "2. Permanecer em pé sem apoio", opcoes: [{texto: "Incapaz <30s", valor: 0}, {texto: "Várias tentat.", valor: 1}, {texto: "30s sem apoio", valor: 2}, {texto: "2 min supervisão", valor: 3}, {texto: "2 min seguro", valor: 4}] },
    { pergunta: "3. Sentado sem apoio (pés no chão)", opcoes: [{texto: "Incapaz 10s", valor: 0}, {texto: "10s", valor: 1}, {texto: "30s", valor: 2}, {texto: "2 min supervisão", valor: 3}, {texto: "2 min seguro", valor: 4}] },
    { pergunta: "4. Em pé para sentado", opcoes: [{texto: "Ajuda", valor: 0}, {texto: "Sem controlo", valor: 1}, {texto: "Usa pernas", valor: 2}, {texto: "Usa mãos", valor: 3}, {texto: "Seguro", valor: 4}] },
    { pergunta: "5. Transferências", opcoes: [{texto: "2 pessoas", valor: 0}, {texto: "1 pessoa", valor: 1}, {texto: "Supervisão", valor: 2}, {texto: "Usa mãos", valor: 3}, {texto: "Seguro", valor: 4}] },
    { pergunta: "6. Olhos fechados (10s)", opcoes: [{texto: "Incapaz", valor: 0}, {texto: "3 segundos", valor: 1}, {texto: "10s supervisão", valor: 2}, {texto: "10s seguro", valor: 3}, {texto: "10s absoluto", valor: 4}] },
    { pergunta: "7. Pés juntos (1 min)", opcoes: [{texto: "Incapaz", valor: 0}, {texto: "15s ajuda", valor: 1}, {texto: "30s supervisão", valor: 2}, {texto: "1 min supervisão", valor: 3}, {texto: "1 min seguro", valor: 4}] },
    { pergunta: "8. Alcançar à frente", opcoes: [{texto: "Ajuda", valor: 0}, {texto: "Supervisão", valor: 1}, {texto: "> 5 cm", valor: 2}, {texto: "> 12 cm", valor: 3}, {texto: "> 25 cm seguro", valor: 4}] },
    { pergunta: "9. Pegar objeto do chão", opcoes: [{texto: "Ajuda", valor: 0}, {texto: "Ajuda p/ pegar", valor: 1}, {texto: "Supervisão", valor: 2}, {texto: "Fácil supervisão", valor: 3}, {texto: "Fácil seguro", valor: 4}] },
    { pergunta: "10. Olhar p/ trás", opcoes: [{texto: "Ajuda", valor: 0}, {texto: "Supervisão", valor: 1}, {texto: "Menor rotação", valor: 2}, {texto: "Um lado", valor: 3}, {texto: "Ambos lados", valor: 4}] },
    { pergunta: "11. Girar 360 graus", opcoes: [{texto: "Ajuda", valor: 0}, {texto: "Supervisão", valor: 1}, {texto: "Seguro lento", valor: 2}, {texto: "Um lado <=4s", valor: 3}, {texto: "Ambos <=4s", valor: 4}] },
    { pergunta: "12. Tocar degrau", opcoes: [{texto: "Incapaz", valor: 0}, {texto: ">2 mov ajuda", valor: 1}, {texto: "4 mov indep", valor: 2}, {texto: "8 mov >20s", valor: 3}, {texto: "8 mov 20s", valor: 4}] },
    { pergunta: "13. Tandem (30s)", opcoes: [{texto: "Perde equilíbrio", valor: 0}, {texto: "15s ajuda", valor: 1}, {texto: "30s pequeno", valor: 2}, {texto: "30s indep", valor: 3}, {texto: "30s seguro", valor: 4}] },
    { pergunta: "14. Uma perna (>10s)", opcoes: [{texto: "Incapaz", valor: 0}, {texto: "Tenta <3s", valor: 1}, {texto: "3 segundos", valor: 2}, {texto: "5 a 10s", valor: 3}, {texto: ">10s", valor: 4}] }
  ],
  interpretar: (score) => {
    if (score <= 20) return { texto: "Risco de Queda Altíssimo", cor: "text-red-600", bg: "bg-red-50" };
    if (score <= 40) return { texto: "Risco de Queda Elevado", cor: "text-orange-600", bg: "bg-orange-50" };
    if (score <= 45) return { texto: "Risco de Queda Moderado", cor: "text-yellow-600", bg: "bg-yellow-50" };
    return { texto: "Equilíbrio Seguro / Baixo Risco", cor: "text-green-600", bg: "bg-green-50" };
  }
};