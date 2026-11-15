# Nexus Workstation

Central proprietária de processamento de dados, orquestração de bot, APIs REST e sincronização contínua com cofre de nuvem.

Desenvolvido e mantido por **Studio VN (vn-24k)**.

---

## ⚡ Visão Geral da Arquitetura

O **Nexus Workstation** unifica quatro pilares essenciais de computação e gestão de dados em uma única interface moderna e responsiva:

1. **OmniBot Interativo:** Terminal de comandos e assistente operacional integrado ao banco de dados relacional. Suporta comandos `/status`, `/db`, `/add`, `/sync`, `/ocr` e processamento de instruções diretas.
2. **Banco de Dados Relacional:** Central de registros de áudio, documentos, transações financeiras e metadados de sistema com busca em tempo real, filtros por categoria e gestão de ciclo de vida.
3. **API REST Completa:** Endpoints dedicados para integração externa (`/api/bot`, `/api/records`, `/api/system/status`, `/api/vault/sync`).
4. **Cloud Vault Sync:** Monitoramento e sincronização com cofre privado de alta capacidade (`vns24k/vault-backup`) com hash de integridade SHA-256.

---

## 🛠️ Tecnologias Utilizadas

* **Framework:** Next.js (App Router)
* **Linguagem:** TypeScript
* **Interface & Estilo:** Tailwind CSS & Lucide Icons
* **Banco de Dados:** Engine Relacional de Alta Concorrência (In-Memory + Persistência)
* **Deploy:** Vercel (Produção Edge) & Hugging Face (Cloud Vault)

---

## 🚀 Como Executar Localmente

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Compilar para produção
npm run build
npm start
```

---

© 2026 Studio VN (vn-24k). Todos os direitos reservados.
