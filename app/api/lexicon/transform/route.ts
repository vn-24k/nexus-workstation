import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const HF_TOKEN = process.env.HF_TOKEN || "";
const HF_BEST_MODEL = "meta-llama/Llama-3.3-70B-Instruct";

// Regras léxicas ordenadas por especificidade (frases mais longas primeiro)
const RULES_CATALOG: Record<string, Array<[RegExp, string]>> = {
  sp_quebrada: [
    // 5+ palavras
    [/\b(ir|vou|vai|vamos)\s+na\s+(sua|tua)\s+casa\s+mais\s+tarde\b/gi, "colar na sua quebrada mais tarde"],
    [/\b(transito|trânsito)\s+t[aá]\s+(muito\s+)?(ruim|pesado|complicado|parado|lento)\b/gi, "trânsito tá travado e embaçado"],
    [/\b(preciso|quero)\s+(falar|conversar)\s+com\s+voc[eê]\s+sobre\s+o\s+trabalho\b/gi, "tenho que trocar uma ideia de cria sobre o corre com você"],
    [/\b(preciso|quero)\s+(falar|conversar)\s+com\s+voc[eê]\b/gi, "preciso trocar uma ideia de cria com você"],
    [/\b(estou|t[oô])\s+trabalhando\s+(muito|bastante)\b/gi, "tô naquele corre frenético e sem parar"],

    // 3-4 palavras
    [/\b(ir|vou|vai|vamos)\s+na\s+(sua|tua)\s+casa\b/gi, "colar na sua quebrada"],
    [/\b(na\s+sua\s+casa|na\s+tua\s+casa)\b/gi, "na sua quebrada"],
    [/\b(estou|t[oô])\s+chegando\s+a[ií]\b/gi, "tô colando no grau"],
    [/\b(estou|t[oô])\s+chegando\b/gi, "tô colando no grau"],
    [/\b(estou|t[oô])\s+trabalhando\b/gi, "tô no corre"],
    [/\b(muito\s+obrigado|valeu\s+mesmo)\b/gi, "satisfação total, tamo junto"],
    [/\b(n[aã]o\s+tem\s+problema|sem\s+problema)\b/gi, "fica suave, sem neurose"],
    [/\b(est[aá]|t[aá])\s+tudo\s+bem\b/gi, "tá tudo no grau e suave"],
    [/\b(de\s+verdade|com\s+certeza|sério\s+mesmo)\b/gi, "papo reto e na moral"],
    [/\b(dar\s+um\s+jeito|resolver\s+isso)\b/gi, "desenrolar essa fita"],
    [/\b(dar\s+uma\s+olhada)\b/gi, "dar um confere"],
    [/\b(espera\s+um\s+pouco|aguarda\s+aí)\b/gi, "guenta a mão aí rapidão"],
    [/\b(saiu\s+correndo|foi\s+embora)\b/gi, "meteu marcha no pinote"],

    // 2 palavras
    [/\b(muito\s+bom|muito\s+legal|muito\s+massa)\b/gi, "chave demais"],
    [/\b(est[aá]|t[aá])\s+(ruim|dif[ií]cil|complicado)\b/gi, "tá embaçado"],
    [/\b(vou\s+a[ií]|ir\s+a[ií])\b/gi, "colar aí"],
    [/\b(at[eé]\s+logo|at[eé]\s+mais|tchau)\b/gi, "é nóis, tamo junto"],

    // Palavras individuais
    [/\b(olha|veja|escuta|preste atenção)\b/gi, "se liga na fita"],
    [/\b(amigo|cara|colega)\b/gi, "meu parceiro"],
    [/\b(amigos|caras|colegas)\b/gi, "os trutas"],
    [/\b(irm[aã]o|brother|bro)\b/gi, "meu truta"],
    [/\b(trabalho|trampo|emprego)\b/gi, "corre"],
    [/\b(dinheiro|grana)\b/gi, "os trocados"],
    [/\b(carro)\b/gi, "a nave"],
    [/\b(moto)\b/gi, "o foguetão"],
    [/\b(calma|relaxa|tranquilo)\b/gi, "suave e sem neurose"],
    [/\b(legal|bacana|bom|massa)\b/gi, "da hora"],
    [/\b(mentira|conversa fiada)\b/gi, "migué"],
    [/\b(certeza)\b/gi, "sem erro"],
    [/\b(casa|apartamento)\b/gi, "quebrada"],
    [/\b(entendeu|compreendeu|sacou)\?/gi, "tá ligado, parça?"],
    [/\b(entendi|compreendi|saquei)\b/gi, "tô ligado"],
    [/\b(combinado|certo|fechado|ok)\b/gi, "demorô, pode pá"],
  ],

  executivo: [
    // 5+ palavras
    [/\b(vou|vai|vamos)\s+na\s+(sua|tua)\s+casa\s+mais\s+tarde\b/gi, "me deslocarei até sua residência posteriormente"],
    [/\b(transito|trânsito)\s+t[aá]\s+(muito\s+)?(ruim|pesado|complicado|parado|lento)\b/gi, "o fluxo viário apresenta severa retenção"],
    [/\b(preciso|quero)\s+(falar|conversar)\s+com\s+voc[eê]\s+sobre\s+o\s+trabalho\b/gi, "solicito alinhamento das diretrizes estratégicas sobre os entregáveis corporativos"],
    [/\b(preciso|quero)\s+(falar|conversar)\s+com\s+voc[eê]\b/gi, "solicito um breve alinhamento com vossa senhoria"],

    // 3-4 palavras
    [/\b(ir|vou|vai|vamos)\s+na\s+(sua|tua)\s+casa\b/gi, "me deslocarei até a sua residência"],
    [/\b(resolver\s+o\s+problema|dar\s+um\s+jeito)\b/gi, "mitigar a ocorrência e implementar o plano de contingência"],
    [/\b(fazer\s+uma\s+reunião|vamos\s+conversar)\b/gi, "agendar uma call de alinhamento executivo"],
    [/\b(dar\s+uma\s+olhada|ver\s+o\s+arquivo)\b/gi, "auditar e validar os respectivos entregáveis"],
    [/\b(quanto\s+antes|o\s+mais\s+rápido\s+possível)\b/gi, "com a máxima brevidade e tempestividade exequível"],
    [/\b(não\s+deu\s+certo|deu\s+errado)\b/gi, "identificamos um desvio metodológico em relação aos KPIs"],
    [/\b(problema\s+de\s+hoje)\b/gi, "ponto de atenção do presente expediente"],

    // 2 palavras
    [/\b(muito\s+obrigado|agradeço\s+muito)\b/gi, "reiteramos nossos protestos de elevada estima e consideração"],
    [/\b(estou\s+trabalhando|estamos\s+fazendo)\b/gi, "estamos operacionalizando os fluxos de trabalho prioritários"],

    // Palavras individuais
    [/\b(problema|erro|falha)\b/gi, "ponto de atenção e oportunidade de melhoria"],
    [/\b(importante|urgente)\b/gi, "prioritário e estratégico"],
    [/\b(hoje)\b/gi, "no decorrer do presente expediente"],
    [/\b(reuni[aã]o)\b/gi, "alinhamento executivo"],
    [/\b(bom|ótimo)\b/gi, "altamente satisfatório e alinhado aos KPIs"],
    [/\b(combinado|certo)\b/gi, "conforme pactuado entre as partes"],
    [/\b(ajudar|apoiar)\b/gi, "subsidiar tecnicamente"],
    [/\b(mudança|mudar)\b/gi, "pivotagem estrutural"],
  ],

  tecnico_juridico: [
    // 3-4 palavras
    [/\b(está\s+claro|é\s+óbvio|dá\s+pra\s+ver)\b/gi, "resta cristalino e inequívoco"],
    [/\b(não\s+tem\s+dúvida|com\s+certeza)\b/gi, "não subsiste margem para controvérsia hermenêutica"],
    [/\b(analisar\s+com\s+cuidado|pensar\s+bem)\b/gi, "ponderar os fatores intervenientes sob rigor analítico"],
    [/\b(mostrar\s+que\s+é\s+verdade|provar)\b/gi, "corroborar de maneira inconteste as premissas fáticas"],
    [/\b(tem\s+diferença|está\s+diferente)\b/gi, "apresenta substancial discrepância metodológica"],
    [/\b(temos\s+um\s+erro\s+no\s+processo|erro\s+no\s+processo)\b/gi, "constata-se vício substancial no procedimento"],
    [/\b(temos\s+um\s+erro|está\s+errado)\b/gi, "constata-se vício substancial"],

    // Palavras individuais
    [/\b(claro|óbvio|evidente)\b/gi, "inequívoco"],
    [/\b(prova|mostra)\b/gi, "corrobora"],
    [/\b(analisar|avaliar)\b/gi, "ponderar criticamente"],
    [/\b(erro|falha)\b/gi, "discrepância formal"],
    [/\b(necessário|preciso)\b/gi, "imperativa a estrita observância"],
    [/\b(começo|ideia)\b/gi, "premissa fundamental"],
    [/\b(forte|impactante)\b/gi, "contundente"],
  ],

  persuasao: [
    // 3-4 palavras
    [/\b(é\s+muito\s+bom)\b/gi, "representa uma oportunidade contundente e sem precedentes"],
    [/\b(muito\s+bom)\b/gi, "uma oportunidade contundente e sem precedentes"],
    [/\b(vai\s+dar\s+certo|funciona\s+mesmo)\b/gi, "comprova um retorno substancial e imediato"],
    [/\b(vamos\s+fazer|compre\s+agora|aproveite\s+agora)\b/gi, "o momento ideal de consolidação é exatamente agora"],
    [/\b(mudar\s+a\s+sua\s+vida|mudar\s+sua\s+vida)\b/gi, "transformar radicalmente a sua eficiência e o seu patamar"],

    // Palavras individuais
    [/\b(bom|legal|interessante)\b/gi, "altamente vantajoso"],
    [/\b(preço|custo)\b/gi, "investimento estratégico com retorno garantido"],
    [/\b(rápido|logo)\b/gi, "em tempo recorde"],
  ],

  afetivo: [
    // Locuções compostas
    [/\boi\s+amor\b/gi, "Oi meu amor lindo"],
    [/\bestou\s+com\s+saudades\b/gi, "estou morrendo de saudades de você"],
    [/\b(vou\s+a[ií]\s+te\s+ver|vou\s+te\s+ver)\b/gi, "logo mais vou passar aí no nosso cantinho pra te encher de carinho"],
    [/\b(preciso|quero)\s+(falar|conversar)\s+com\s+voc[eê]\b/gi, "quero muito conversar com você com calma e carinho"],
    [/\b(te\s+amo\s+muito|te\s+amo)\b/gi, "te amo mais que tudo nessa vida"],
    [/\b(um\s+abraço)\b/gi, "um abraço bem apertado e quentinho"],
    [/\b(fica\s+com\s+deus|se\s+cuida)\b/gi, "fica com Deus, se cuida muito"],

    // Palavras individuais
    [/\b(oi|olá)\b/gi, "Oi meu bem"],
    [/\b(obrigado|valeu)\b/gi, "muito obrigado de coração"],
    [/\b(saudade|saudades)\b/gi, "saudade apertada"],
  ],
};

const OPENERS: Record<string, string[]> = {
  sp_quebrada: [
    "Ô meu parceiro, se liga só na fita:",
    "Salve mano, papo reto aqui:",
    "Então truta, na moral mesmo:",
  ],
  executivo: [
    "Prezado, em atenção ao nosso alinhamento corporativo:",
    "Para subsidiar nossa tomada de decisão no presente ciclo:",
  ],
  tecnico_juridico: [
    "Sob a ótica do rigor analítico e das premissas vigentes:",
    "Faz-se mister pontuar, de forma inequívoca:",
  ],
  persuasao: [
    "Atenção a esta oportunidade definitiva:",
    "Os fatos demonstram de forma incontestável:",
  ],
  afetivo: [
    "Oi amor, passando com todo carinho pra te falar:",
    "Com todo amor e carinho do mundo:",
  ],
};

const CLOSERS: Record<string, string[]> = {
  sp_quebrada: [
    "Demorô? Dá um salve aí qualquer fita, tamo junto!",
    "Pode pá, fica suave que é nós!",
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

// Motor de substituição inteligente protegido por placeholders
function smartTransformWithPlaceholders(text: string, styleKey: string): string {
  const cleanInput = text.trim();
  const rules = RULES_CATALOG[styleKey] || RULES_CATALOG.sp_quebrada;

  const placeholders: Record<string, string> = {};
  let workingText = cleanInput;

  // Substituição única ordenada por especificidade com proteção contra colisão
  rules.forEach(([pattern, replacement], ruleIdx) => {
    workingText = workingText.replace(pattern, () => {
      const phKey = `__PH_${styleKey.substring(0, 3)}_${ruleIdx}_${Object.keys(placeholders).length}__`;
      placeholders[phKey] = replacement;
      return phKey;
    });
  });

  // Restauração atômica de todos os placeholders
  let restored = workingText;
  Object.keys(placeholders).forEach((phKey) => {
    restored = restored.replace(phKey, placeholders[phKey]);
  });

  // Limpeza de duplicidades ortográficas ("o o", "a a", "de de")
  restored = restored.replace(/\b(o\s+o|a\s+a|de\s+de|em\s+em|com\s+com)\b/gi, (match, p1) => p1.split(/\s+/)[0]);
  restored = restored.replace(/\s+/g, " ").trim();

  // Opener contextual
  const openers = OPENERS[styleKey] || [];
  const closers = CLOSERS[styleKey] || [];
  const opener = openers[Math.floor(Math.random() * openers.length)];
  const closer = closers[Math.floor(Math.random() * closers.length)];

  const lower = restored.toLowerCase();
  let finalText = restored;

  if (
    cleanInput.length < 130 &&
    !lower.startsWith("salve") &&
    !lower.startsWith("ô meu") &&
    !lower.startsWith("prezado") &&
    !lower.startsWith("sob a ótica") &&
    !lower.startsWith("atenção a esta") &&
    !lower.startsWith("oi amor") &&
    !lower.startsWith("com todo")
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
    const styleKey = RULES_CATALOG[style] ? style : "sp_quebrada";

    // 1. TENTATIVA COM HUGGING FACE ROUTER (se houver chave configurada)
    if (HF_TOKEN) {
      try {
        const hfController = new AbortController();
        const hfTimeout = setTimeout(() => hfController.abort(), 1800);

        const stylePrompts: Record<string, string> = {
          sp_quebrada: "Reescreva a seguinte frase no dialeto autêntico da quebrada paulistana, usando gírias de São Paulo (colar, truta, demorô, embaçado, papo reto, chave, corre). Retorne APENAS a frase reescrita:",
          executivo: "Reescreva a seguinte frase em tom executivo de diretoria C-level corporativa. Retorne APENAS a frase reescrita:",
          tecnico_juridico: "Reescreva a seguinte frase em vocabulário culto, inequívoco e analítico. Retorne APENAS a frase reescrita:",
          persuasao: "Reescreva a seguinte frase como um argumento persuasivo de alto impacto. Retorne APENAS a frase reescrita:",
          afetivo: "Reescreva a seguinte frase com muito carinho, afeto e amor. Retorne APENAS a frase reescrita:",
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
            max_tokens: 160,
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
        // Fallback imediato para o motor local protegido
      }
    }

    // 2. MOTOR LÉXICO LOCAL PROTEGIDO (<3ms de latência, sem repetições, 100% confiável)
    const adaptedLocal = smartTransformWithPlaceholders(cleanInput, styleKey);

    return NextResponse.json({
      ok: true,
      original: cleanInput,
      adapted: adaptedLocal,
      style: styleKey,
      engine: "local-smart-lexicon-v2",
      model: "nexus-smart-sp",
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
