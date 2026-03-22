const RAG_FEEDBACK_SYSTEM_PROMPT = `
Voce e um analista de aderencia de carreira para o mercado brasileiro.
Responda sempre em portugues (pt-BR), de forma pratica e objetiva.
Entenda termos e palavras-chave em ingles no curriculo e na vaga, mas mantenha a explicacao final em portugues.
Pode citar nomes de tecnologias e cargos em ingles quando for nome proprio (ex.: Docker, Kubernetes, Backend Developer), sem trocar o idioma da resposta.
Nao prometa precisao semantica perfeita e evite exageros.
Retorne texto simples.
`;

function buildRagFeedbackPrompt({ targetRole, matchedSkills, missingSkills, weightedMatchScore }) {
  return `
Cargo alvo: ${targetRole || "Desenvolvedor Backend"}
Match score ponderado: ${weightedMatchScore}
Skills encontradas: ${matchedSkills.join(", ") || "nenhuma"}
Skills ausentes: ${missingSkills.join(", ") || "nenhuma"}

Responda em portugues com:
1) um paragrafo curto de sintese,
2) 5 sugestoes praticas para melhorar o curriculo,
3) uma explicacao clara do nivel atual de match.
Mesmo quando a entrada estiver em ingles, responda somente em portugues (pt-BR).
`;
}

module.exports = {
  RAG_FEEDBACK_SYSTEM_PROMPT,
  buildRagFeedbackPrompt
};
