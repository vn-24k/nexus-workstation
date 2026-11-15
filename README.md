# VN TTS — Estúdio Vocal & Transmissão Autoral

Central proprietária de síntese de voz de alta fidelidade, análise acústica emocional em tempo real e transmissão direta de notas de voz nativas no WhatsApp.

Desenvolvido e mantido por **Studio VN (`vn-24k`)**.

🌐 **URL Oficial:** [https://vn-tts.vercel.app](https://vn-tts.vercel.app)  
📦 **Repositório:** [https://github.com/vn-24k/vn-tts](https://github.com/vn-24k/vn-tts)

---

## ⚡ Módulos do Sistema

O **VN TTS** unifica os seguintes recursos em uma interface refinada no padrão Apple Glass:

1. **🎙️ Disparo Vocal:** Síntese de fala ultrarrealista com a voz autoral `minha-voz`, equalização acústica de estúdio e disparo direto no WhatsApp (`+55 11 99568-5756`) como áudio nativo gravado na hora (PTT com forma de onda e microfone verde).
2. **🧬 Laboratório Vocal (Voz Real):** Captura ao vivo pelo microfone do navegador, telemetria acústica e diagnóstico automático de tom emocional (*Bravo / Firme*, *Calmo / Afeto*, *Engraçado / Resenha*, *Empolgado / Correria*) para calibrar âncoras vocais.
3. **🤖 Assistente Conversacional:** Interface conversacional com raciocínio contextual e reprodução vocal instantânea de respostas na voz do titular.
4. **💾 Acervo & Repositório Sonoro:** Biblioteca de áudios salvos com persistência local, player de reprodução integrado, download em `.mp3` e atalho de reenvio direto no WhatsApp sem necessidade de reprocessamento.

---

## 🛠️ Tecnologias

- **Framework:** Next.js (App Router)
- **Linguagem:** TypeScript
- **Interface & Estilo:** Tailwind CSS & Lucide Icons
- **Síntese Vocal:** Motor Acústico Fish Audio (`s2.1-pro-free`, `minha-voz`)
- **Ponte WhatsApp:** WhatsApp Bridge PTT (`libopus`, `audio/ogg`, Baileys)
- **Deploy:** Vercel Edge Global & Cloudflare QUIC Tunnel

---

© 2026 Studio VN (`vn-24k`). Todos os direitos reservados.
