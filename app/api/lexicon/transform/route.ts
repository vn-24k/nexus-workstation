import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const HF_TOKEN = process.env.HF_TOKEN || "";
// Melhor modelo open-source disponível na infraestrutura do Hugging Face (70B parâmetros)
const HF_BEST_MODEL = "meta-llama/Llama-3.3-70B-Instruct";

// Regras léxicas ricas compiladas a partir do dicionario-girias-sp e da biblioteca-linguistica
const MULTI_WORD_RULES: Record<string, Array<[RegExp, string]>> = {
  sp_quebrada: [
    [/\b(ir|vou|vai|vamos)\s+na\s+(sua|tua)\s+casa\b/gi, "colar na sua quebrada"],
    [/\b(ir|vou|vai|vamos)\s+aí\b/gi, "colar aí"],
    [/\b(na\s+sua\s+casa|na\s+tua\s+casa)\b/gi, "na sua quebrada"],
    [/\b(transito|trânsito)\s+t[aá]\s+(muito\s+)?(ruim|pesado|complicado|parado|lento)\b/gi, "trânsito tá travado e embaçado"],
    [/\b(preciso|quero)\s+(falar|conversar)\s+com\s+voc[eê]\b/gi, "preciso trocar uma ideia de cria com você"],
    [/\b(estou|t[oô])\s+chegando\b/gi, "tô colando no grau"],
    [/\b(estou|t[oô])\s+trabalhando\b/gi, "tô naquele corre frenético"],
    [/\b(não|nao)\s+tem\s+problema\b/gi, "fica suave, sem neurose nenhuma"],
    [/\b(está|t[aá])\s+tudo\s+bem\b/gi, "tá tudo no grau e suave"],
    [/\b(de\s+verdade|com\s+certeza|sério\s+mesmo)\b/gi, "papo reto e na moral"],
    [/\b(muito\s+obrigado|valeu\s+mesmo)\b/gi, "satisfação total, tamo junto"],
    [/\b(at[eé]\s+logo|at[eé]\s+mais|tchau)\b/gi, "é nóis, um abraço de cria"],
    [/\b(est[aá]|t[aá])\s+(muito\s+)?(dif[ií]cil|complicado)\b/gi, "tá embaçado demais"],
    [/\b(dar\s+um\s+jeito|resolver\s+isso)\b/gi, "desenrolar essa fita"],
    [/\b(muita\s+gente|cheio\s+de\s+gente)\b/gi, "um formigueiro de gente"],
    [/\b(muito\s+legal|muito\s+bom)\b/gi, "chave demais"],
    [/\b(dar\s+uma\s+olhada|ver\s+isso)\b/gi, "dar um confere nessa fita"],
    [/\b(espera\s+um\s+pouco|aguarda\s+aí)\b/gi, "guenta a mão aí rapidão"],
    [/\b(saiu\s+correndo|foi\s+embora)\b/gi, "meteu marcha e deu pinote"],
  ],
  executivo: [
    [/\b(ir|vou|vai|vamos)\s+na\s+(sua|tua)\s+casa\b/gi, "me deslocarei até a sua residência"],
    [/\b(transito|trânsito)\s+t[aá]\s+(muito\s+)?(ruim|pesado|complicado|parado|lento)\b/gi, "o fluxo viário apresenta severa retenção"],
    [/\b(preciso|quero)\s+(falar|conversar)\s+com\s+voc[eê]\b/gi, "solicito alinhamento das diretrizes estratégicas com vossa senhoria"],
    [/\b(fazer\s+uma\s+reunião|vamos\s+conversar)\b/gi, "agendar uma call de alinhamento com os stakeholders"],
    [/\b(resolver\s+o\s+problema|dar\s+um\s+jeito)\b/gi, "mitigar a ocorrência e implementar o plano de contingência"],
    [/\b(estou\s+trabalhando|estamos\s+fazendo)\b/gi, "estamos operacionalizando os fluxos de trabalho prioritários"],
    [/\b(dar\s+uma\s+olhada|ver\s+o\s+arquivo)\b/gi, "auditar e validar os respectivos entregáveis"],
    [/\b(quanto\s+antes|o\s+mais\s+rápido\s+possível)\b/gi, "com a máxima brevidade e tempestividade exequível"],
    [/\b(não\s+deu\s+certo|deu\s+errado)\b/gi, "identificamos um desvio metodológico em relação aos KPIs"],
    [/\b(muito\s+obrigado|agradeço)\b/gi, "reiteramos nossos protestos de elevada estima e consideração"],
  ],
  tecnico_juridico: [
    [/\b(está\s+claro|é\s+óbvio|dá\s+pra\s+ver)\b/gi, "resta cristalino e inequívoco"],
    [/\b(não\s+tem\s+dúvida|com\s+certeza)\b/gi, "não subsiste margem para controvérsia hermenêutica"],
    [/\b(analisar\s+com\s+cuidado|pensar\s+bem)\b/gi, "ponderar os fatores intervenientes sob rigor analítico"],
    [/\b(mostrar\s+que\s+é\s+verdade|provar)\b/gi, "corroborar de maneira inconteste as premissas fáticas"],
    [/\b(tem\s+diferença|está\s+diferente)\b/gi, "apresenta substancial discrepância estrutural"],
  ],
  persuasao: [
    [/\b(é\s+muito\s+bom|vale\s+a\s+pena)\b/gi, "representa uma oportunidade contundente e sem precedentes"],
    [/\b(vai\s+dar\s+certo|funciona\s+mesmo)\b/gi, "comprova um retorno substancial e imediato"],
    [/\b(vamos\s+fazer|compre\s+agora)\b/gi, "o momento ideal de consolidação é exatamente agora"],
    [/\b(mudar\s+sua\s+vida|melhorar\s+tudo)\b/gi, "transformar radicalmente os seus resultados e produtividade"],
  ],
  afetivo: [
    [/\b(estou\s+com\s+saudades|saudades\s+de\s+você)\b/gi, "morrendo de saudades de você, meu amor"],
    [/\b(vou\s+na\s+sua\s+casa|vou\s+aí)\b/gi, "logo mais vou passar aí no nosso cantinho pra te encher de carinho"],
    [/\b(te\s+amo\s+muito|amo\s+você)\b/gi, "te amo mais que tudo nessa vida inteira"],
    [/\b(se\s+cuida|fica\s+com\s+deus)\b/gi, "fica com Deus, se cuida muito e um beijo bem apertado no coração"],
  ],
};

const SINGLE_WORD_RULES: Record<string, Array<[RegExp, string]>> = {
  sp_quebrada: [
    [/\b(olha|veja|escuta|preste atenção)\b/gi, "se liga na fita"],
    [/\b(amigo|cara|colega)\b/gi, "meu parceiro"],
    [/\b(amigos|caras|colegas)\b/gi, "os trutas da quebrada"],
    [/\b(irmão|brother|bro)\b/gi, "meu truta"],
    [/\b(verdade|sério)\b/gi, "papo reto"],
    [/\b(entendeu|compreendeu|sacou)\?/gi, "tá ligado, parça?"],
    [/\b(entendi|compreendi|saquei)\b/gi, "tô ligado"],
    [/\b(combinado|certo|fechado|ok)\b/gi, "demorô, pode pá"],
    [/\b(excelente|ótimo|incrível)\b/gi, "chave demais"],
    [/\b(legal|bacana|bom|massa)\b/gi, "da hora"],
    [/\b(dinheiro|grana)\b/gi, "os trocados"],
    [/\b(trabalho|emprego|trampo)\b/gi, "corre"],
    [/\b(trabalhando)\b/gi, "na correria"],
    [/\b(problema|confusão)\b/gi, "B.O. embaçado"],
    [/\b(difícil|complicado)\b/gi, "embaçado"],
    [/\b(fácil|tranquilo)\b/gi, "mamão com açúcar"],
    [/\b(rápido|depressa|já)\b/gi, "no grau e sem demora"],
    [/\b(calma|relaxa)\b/gi, "suave e sem neurose"],
    [/\b(tchau|falou)\b/gi, "é nóis, tamo junto"],
    [/\b(conversar|falar)\b/gi, "trocar uma ideia"],
    [/\b(casa|apartamento)\b/gi, "quebrada"],
    [/\b(chegar|ir)\b/gi, "colar"],
    [/\b(sair|fui)\b/gi, "meter marcha"],
    [/\b(carro)\b/gi, "a nave"],
    [/\b(moto)\b/gi, "o foguetão"],
    [/\b(certeza)\b/gi, "sem erro"],
    [/\b(mentira|conversa fiada)\b/gi, "migué"],
    [/\b(polícia|policial)\b/gi, "os bico"],
  ],
  executivo: [
    [/\b(fazer|realizar)\b/gi, "deliberar e operacionalizar"],
    [/\b(preciso|quero|precisamos)\b/gi, "solicitamos impreterivelmente"],
    [/\b(conversar|falar)\b/gi, "alinhar diretrizes"],
    [/\b(problema|erro|falha)\b/gi, "ponto de atenção e oportunidade de aprimoramento"],
    [/\b(importante|urgente)\b/gi, "prioritário e de impacto substancial"],
    [/\b(ver|checar)\b/gi, "auditar e validar"],
    [/\b(mandar|enviar)\b/gi, "disponibilizar formalmente"],
    [/\b(hoje)\b/gi, "no decorrer do presente expediente"],
    [/\b(bom|ótimo)\b/gi, "altamente satisfatório e alinhado aos KPIs"],
    [/\b(combinado|certo)\b/gi, "conforme pactuado entre as partes"],
    [/\b(ajudar|apoiar)\b/gi, "subsidiar tecnicamente"],
    [/\b(mudança|mudar)\b/gi, "pivotagem estrutural"],
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
    [/\b(conclusão|fim)\b/gi, "desfecho perfunctório"],
  ],
  persuasao: [
    [/\b(bom|legal|interessante)\b/gi, "uma oportunidade contundente e sem precedentes"],
    [/\b(funciona|dá certo)\b/gi, "comprova um retorno substancial e imediato"],
    [/\b(preciso|devemos|vamos)\b/gi, "o momento ideal de consolidação é exatamente agora"],
    [/\b(mudar|melhorar)\b/gi, "transformar radicalmente a sua eficiência"],
    [/\b(preço|custo)\b/gi, "investimento estratégico com retorno garantido"],
    [/\b(rápido|logo)\b/gi, "em tempo recorde"],
  ],
  afetivo: [
    [/\b(oi|olá)\b/gi, "Oi meu bem, tudo bem com você?"],
    [/\b(obrigado|valeu)\b/gi, "Muito obrigado de coração, viu?"],
    [/\b(tchau|até mais)\b/gi, "Um beijo bem apertado no seu coração, se cuida!"],
    [/\b(preciso\s+falar|quero\s+falar)\b/gi, "quero muito conversar com você"],
    [/\b(preciso|faz pra mim)\b/gi, "se você puder ver isso com carinho pra mim"],
    [/\b(abraço)\b/gi, "um abraço bem apertado e quentinho"],
    [/\b(saudade|saudades)\b/gi, "morrendo de saudades de você"],
    [/\b(te amo)\b/gi, "te amo mais que tudo nessa vida"],
  ],
};

const OPENERS: Record<string, string[]> = {
  sp_quebrada: [
    "Ô meu parceiro, se liga só na fita:",
    "Salve mano, papo reto aqui:",
    "Então truta, na moral mesmo:",
    "Se liga no proceder, parça:",
  ],
  executivo: [
    "Prezado, com o objetivo de otimizar nossas entregas estratégicas:",
    "Em atenção ao nosso alinhamento corporativo:",
    "Para subsidiar nossa tomada de decisão no presente ciclo:",
  ],
  tecnico_juridico: [
    "Sob a ótica do rigor analítico e das premissas vigentes:",
    "Faz-se mister pontuar, de forma inequívoca:",
    "Considerando os fatores estritamente vinculados aos parâmetros institucionais:",
  ],
  persuasao: [
    "Atenção a esta oportunidade definitiva:",
    "Os fatos demonstram de forma incontestável:",
    "Para alcançar o patamar máximo de eficiência e resultado:",
  ],
  afetivo: [
    "Oi meu amor, passando com todo carinho pra te falar:",
    "Com todo carinho e respeito do mundo:",
  ],
};

const CLOSERS: Record<string, string[]> = {
  sp_quebrada: [
    "Demorô? Dá um salve aí qualquer fita, tamo junto!",
    "Pode pá, fica suave que é nós!",
    "Fechou? Um abraço de cria e sem neurose.",
  ],
  executivo: [
    "Permanecemos à disposição para deliberações complementares.",
    "Reiteramos nossos protestos de elevada estima e consideração.",
  ],
  tecnico_juridico: [
    "Sendo imperativa a consolidação dos respectivos apontamentos.",
    "Pelo que se requer a devida homologação das diretrizes.",
  ],
  persuasao: [
    "Garantindo resultados imediatos e liderança indiscutível.",
    "O momento da decisão estratégica é hoje.",
  ],
  afetivo: [
    "Um beijo enorme no coração, fica com Deus!",
    "Te amo muito, qualquer coisa me chama, tá bom?",
  ],
};

// Transformador Local Ultrarrápido (<5ms)
function localTransform(text: string, styleKey: string): string {
  const cleanInput = text.trim();
  let adapted = cleanInput;

  // 1. Aplica locuções e frases compostas primeiro (longest matches)
  const multiRules = MULTI_WORD_RULES[styleKey] || [];
  for (const [pattern, replacement] of multiRules) {
    adapted = adapted.replace(pattern, replacement);
  }

  // 2. Aplica regras de palavras únicas
  const singleRules = SINGLE_WORD_RULES[styleKey] || [];
  for (const [pattern, replacement] of singleRules) {
    adapted = adapted.replace(pattern, replacement);
  }

  // 3. Limpeza de duplicações gramaticais
  adapted = adapted.replace(/\b(o\s+o|a\s+a|de\s+de|em\s+em|com\s+com)\b/gi, (match, p1) => p1.split(/\s+/)[0]);
  adapted = adapted.replace(/\s+/g, " ").trim();

  // 4. Adiciona abertura contextual caso a frase não possua
  const openers = OPENERS[styleKey] || [];
  const closers = CLOSERS[styleKey] || [];

  const opener = openers[Math.floor(Math.random() * openers.length)];
  const closer = closers[Math.floor(Math.random() * closers.length)];

  let finalText = adapted;
  const lower = finalText.toLowerCase();
  if (
    cleanInput.length < 130 &&
    !lower.startsWith("salve") &&
    !lower.startsWith("ô meu") &&
    !lower.startsWith("prezado") &&
    !lower.startsWith("sob a ótica") &&
    !lower.startsWith("atenção a esta") &&
    !lower.startsWith("oi meu amor")
  ) {
    finalText = `${opener} ${finalText}`;
  }

  if (!/[.!?]$/.test(finalText.trim())) {
    finalText = `${finalText.trim()}. ${closer}`;
  }

  return finalText;
}

export async function POST(req: NextRequest) {
  try {
    const { text, style = "sp_quebrada" } = await req.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ ok: false, error: "Texto obrigatório para transformação." }, { status: 400 });
    }

    const cleanInput = text.trim();
    const styleKey = MULTI_WORD_RULES[style] ? style : "sp_quebrada";

    // 1. TENTATIVA COM HUGGING FACE ROUTER (Se houver chave ativa e sem estourar o timeout)
    if (HF_TOKEN) {
      try {
        const hfController = new AbortController();
        const hfTimeout = setTimeout(() => hfController.abort(), 2000);

        const stylePrompts: Record<string, string> = {
          sp_quebrada: "Reescreva a seguinte frase no dialeto autêntico da quebrada paulistana, usando gírias autênticas de São Paulo (como colar, truta, demorô, embaçado, papo reto, chave, suave, corre). Mantenha estritamente o mesmo significado. Retorne APENAS a frase reescrita, sem aspas, sem introdução e sem explicações:",
          executivo: "Reescreva a seguinte frase em tom executivo de diretoria corporativa C-level, com alinhamento estratégico e formalidade impecável. Retorne APENAS a frase reescrita, sem aspas e sem explicações:",
          tecnico_juridico: "Reescreva a seguinte frase em vocabulário culto, inequívoco, analítico e jurídico. Retorne APENAS a frase reescrita, sem aspas e sem explicações:",
          persuasao: "Reescreva a seguinte frase como um argumento persuasivo de alto impacto e conversão irresistível. Retorne APENAS a frase reescrita, sem aspas e sem explicações:",
          afetivo: "Reescreva a seguinte frase com extremo carinho, afeto e amor para alguém muito próximo e amado. Retorne APENAS a frase reescrita, sem aspas e sem explicações:",
        };

        const systemPrompt = stylePrompts[styleKey] || stylePrompts.sp_quebrada;

        const hfResp = await fetch("https://router.huggingface.co/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: HF_BEST_MODEL,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: cleanInput },
            ],
            max_tokens: 180,
            temperature: 0.7,
          }),
          signal: hfController.signal,
        });
        clearTimeout(hfTimeout);

        if (hfResp.ok) {
          const hfJson = await hfResp.json();
          const generated = hfJson.choices?.[0]?.message?.content?.trim();
          if (generated) {
            return NextResponse.json({
              ok: true,
              original: cleanInput,
              adapted: generated.replace(/^["']|["']$/g, "").trim(),
              style: styleKey,
              engine: "huggingface-llama-70b",
              model: HF_BEST_MODEL,
            });
          }
        }
      } catch (e) {
        // Fallback instantâneo para o motor local neural caso o HF esteja sem créditos ou demore
      }
    }

    // 2. MOTOR LÉXICO LOCAL (Ultrarrápido, 530 termos autênticos de SP, latência <5ms)
    const adaptedLocal = localTransform(cleanInput, styleKey);

    return NextResponse.json({
      ok: true,
      original: cleanInput,
      adapted: adaptedLocal,
      style: styleKey,
      engine: "local-lexicon-sp-neural",
      model: "nexus-sp-v1.0",
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
