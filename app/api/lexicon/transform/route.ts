import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Dicionário léxico contextual baseado no dicionario-girias-sp e na biblioteca-linguistica
const REPLACEMENTS: Record<string, Array<[RegExp, string]>> = {
  sp_quebrada: [
    [/\b(olha|veja|escuta|preste atenção)\b/gi, "se liga na fita"],
    [/\b(amigo|cara|colega)\b/gi, "meu parceiro"],
    [/\b(amigos|caras|colegas)\b/gi, "os trutas"],
    [/\b(verdade|sério|com certeza)\b/gi, "papo reto"],
    [/\b(entendeu|compreendeu|viu)\?/gi, "tá ligado?"],
    [/\b(entendi|compreendi)\b/gi, "tô ligado"],
    [/\b(combinado|certo|fechado)\b/gi, "demorô"],
    [/\b(muito bom|muito legal|ótimo|excelente)\b/gi, "chave demais"],
    [/\b(legal|bom|bacana)\b/gi, "da hora"],
    [/\b(dinheiro|grana)\b/gi, "os trocados"],
    [/\b(trabalho|emprego)\b/gi, "o corre"],
    [/\b(trabalhando|na correria)\b/gi, "naquele corre frenético"],
    [/\b(problema|dificuldade|confusão)\b/gi, "um B.O. embaçado"],
    [/\b(rápido|depressa|agora)\b/gi, "no grau e sem demora"],
    [/\b(calma|tranquilo|sem pressa)\b/gi, "suave e sem neurose"],
    [/\b(tchau|até logo|falou)\b/gi, "é nóis, tamo junto"],
    [/\b(falar|conversar)\b/gi, "trocar uma ideia de cria"],
    [/\b(mandar|enviar)\b/gi, "dar um salve com"],
    [/\b(casa|bairro)\b/gi, "quebrada"],
  ],
  executivo: [
    [/\b(fazer|realizar)\b/gi, "deliberar e operacionalizar"],
    [/\b(preciso|quero|precisamos)\b/gi, "solicitamos impreterivelmente"],
    [/\b(conversar|falar|reunião)\b/gi, "alinhar as diretrizes estratégicas"],
    [/\b(problema|erro|falha)\b/gi, "ponto de atenção e oportunidade de aprimoramento"],
    [/\b(importante|urgente)\b/gi, "prioritário e de impacto substancial"],
    [/\b(dar uma olhada|ver|checar)\b/gi, "auditar e validar as premissas"],
    [/\b(mandar|enviar)\b/gi, "disponibilizar formalmente"],
    [/\b(hoje|rápido)\b/gi, "no decorrer do presente expediente"],
    [/\b(bom|ótimo)\b/gi, "altamente satisfatório e alinhado aos KPIs"],
    [/\b(combinado|certo)\b/gi, "conforme pactuado entre os stakeholders"],
  ],
  tecnico_juridico: [
    [/\b(claro|óbvio|evidente)\b/gi, "inequívoco"],
    [/\b(confirmar|prova|mostra)\b/gi, "corrobora de maneira inconteste"],
    [/\b(avaliar|pensar|analisar)\b/gi, "ponderar os fatores intervenientes"],
    [/\b(diferença|erro)\b/gi, "discrepância metodológica"],
    [/\b(necessário|preciso)\b/gi, "imperativa a estrita observância"],
    [/\b(ideia|começo)\b/gi, "premissa fundamental"],
    [/\b(forte|impactante)\b/gi, "contundente"],
    [/\b(fazer|adotar)\b/gi, "instituir formalmente nos autos"],
  ],
  persuasao: [
    [/\b(bom|legal|interessante)\b/gi, "uma oportunidade contundente e sem precedentes"],
    [/\b(funciona|dá certo)\b/gi, "comprova um retorno substancial e imediato"],
    [/\b(preciso|devemos|vamos)\b/gi, "o momento ideal de consolidação é exatamente agora"],
    [/\b(mudar|melhorar)\b/gi, "transformar radicalmente a sua eficiência"],
    [/\b(preço|custo)\b/gi, "investimento estratégico com retorno garantido"],
  ],
  afetivo: [
    [/\b(oi|olá)\b/gi, "Oi meu bem, tudo bem com você?"],
    [/\b(obrigado|valeu)\b/gi, "Muito obrigado de coração, viu?"],
    [/\b(tchau|até mais)\b/gi, "Um beijo bem apertado no seu coração, se cuida!"],
    [/\b(preciso|faz pra mim)\b/gi, "Se você conseguir fazer com calma pra mim, vou te agradecer demais"],
    [/\b(abraço)\b/gi, "um abraço bem apertado e quentinho"],
  ],
};

const OPENERS: Record<string, string[]> = {
  sp_quebrada: [
    "Ô meu parceiro, se liga só na fita...",
    "Salve mano, papo reto aqui...",
    "Então truta, na moral mesmo...",
    "Se liga no proceder, parça...",
  ],
  executivo: [
    "Prezado, com o objetivo de otimizar nossas entregas estratégicas...",
    "Em atenção ao nosso alinhamento corporativo...",
    "Para subsidiar nossa tomada de decisão no presente ciclo...",
  ],
  tecnico_juridico: [
    "Sob a ótica do rigor analítico e das premissas vigentes...",
    "Faz-se mister pontuar, de forma inequívoca...",
    "Considerando os fatores estritamente vinculados aos parâmetros institucionais...",
  ],
  persuasao: [
    "Atenção a esta oportunidade definitiva:",
    "Os fatos demonstram de forma incontestável:",
    "Para alcançar o patamar máximo de eficiência e resultado:",
  ],
  afetivo: [
    "Oi querido(a), passando com todo carinho pra falar uma coisinha...",
    "Com todo amor e respeito do mundo...",
  ],
};

const CLOSERS: Record<string, string[]> = {
  sp_quebrada: [
    "...demorô? Dá um salve aí qualquer fita, tamo junto!",
    "...pode pá, fica suave que é nós!",
    "...fechou? Um abraço de cria e sem neurose.",
  ],
  executivo: [
    "...permanecemos à disposição para deliberações complementares.",
    "...reiteramos nossos protestos de elevada estima e consideração.",
  ],
  tecnico_juridico: [
    "...sendo imperativa a consolidação dos respectivos apontamentos.",
    "...pelo que se requer a devida homologação das diretrizes.",
  ],
  persuasao: [
    "...garantindo resultados imediatos e liderança indiscutível.",
    "...o momento da decisão estratégica é hoje.",
  ],
  afetivo: [
    "...um beijo enorme no coração, fica com Deus!",
    "...te amo muito, qualquer coisa me chama, tá bom?",
  ],
};

export async function POST(req: NextRequest) {
  try {
    const { text, style = "sp_quebrada" } = await req.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ ok: false, error: "Texto obrigatório para transformação." }, { status: 400 });
    }

    const cleanInput = text.trim();
    const styleKey = REPLACEMENTS[style] ? style : "sp_quebrada";
    const rules = REPLACEMENTS[styleKey] || [];

    let adapted = cleanInput;
    for (const [pattern, replacement] of rules) {
      adapted = adapted.replace(pattern, replacement);
    }

    // Se o texto for curto e não contiver introdução característica, adiciona abertura ou fechamento contextual
    const openers = OPENERS[styleKey] || [];
    const closers = CLOSERS[styleKey] || [];

    const opener = openers[Math.floor(Math.random() * openers.length)];
    const closer = closers[Math.floor(Math.random() * closers.length)];

    let finalText = adapted;
    if (cleanInput.length < 120 && !finalText.toLowerCase().includes("prezado") && !finalText.toLowerCase().includes("se liga")) {
      finalText = `${opener} ${finalText}`;
    }
    if (!finalText.endsWith(".") && !finalText.endsWith("!") && !finalText.endsWith("?")) {
      finalText = `${finalText}${closer}`;
    }

    return NextResponse.json({
      ok: true,
      original: cleanInput,
      adapted: finalText.trim(),
      style: styleKey,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
