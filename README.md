# Chatbot estático para Azure OpenAI / Azure AI Foundry

Este projeto é uma página estática pronta para GitHub Pages que conversa com um deployment do Azure OpenAI. Ele também pode ser adaptado para um fluxo com proxy seguro em produção.

O objetivo deste README é mostrar **como fazer o chatbot funcionar de verdade**, não só explicar a interface.

## O que este projeto faz

O frontend:

- mostra a conversa
- mantém histórico na sessão atual
- envia instruções dinâmicas
- chama a API de duas formas:
  - `proxy`: modo recomendado para produção
  - `direct`: modo apenas para teste local

## Arquivos do projeto

```text
chatbot/
├─ index.html
├─ style.css
├─ script.js
└─ README.md
```

## Arquitetura real recomendada

Para produção com GitHub Pages, use esta arquitetura:

```text
Usuário -> GitHub Pages -> Proxy seguro -> Azure OpenAI
```

Fluxo:

1. O usuário digita a mensagem na página.
2. O frontend envia o payload para o seu proxy.
3. O proxy lê a chave do Azure em variável de ambiente.
4. O proxy chama o Azure OpenAI.
5. O proxy devolve só a resposta necessária ao frontend.

## O que você precisa no Azure

Para o fluxo da documentação que você enviou, você precisa de:

1. Um recurso Azure OpenAI.
2. Um modelo implantado.
3. O nome do deployment.
4. O endpoint do recurso.
5. Uma chave de API.

Exemplo:

- `Azure Endpoint`: `https://atividade-chatbot-resource.cognitiveservices.azure.com/`
- `Deployment`: `gpt-4.1-mini`

## Importante: `deployment` x `agent_id`

Este projeto está implementado para o fluxo de:

- `chat/completions`
- `azure_endpoint`
- `api-key`
- `deployment`

Nesse fluxo, **não existe `agent_id`**.

`agent_id` só existe se você estiver usando uma API de Agents/Assistants com conceitos como:

- agent
- thread
- run
- tools

Se o seu “chatbot criado” no Azure for, na prática, um **deployment de modelo**, este projeto já está alinhado.

Se o seu “chatbot criado” for um **agente orquestrado do Foundry com tools**, então o backend precisa usar a API de Agents, não `chat/completions`.

## Como fazer funcionar de verdade

Você tem 2 caminhos.

### Caminho 1: teste local rápido

Use o modo `direct`.

Esse modo:

- funciona só localmente
- foi bloqueado em produção no GitHub Pages
- serve para validar interface e integração inicial

### Caminho 2: produção real

Use o modo `proxy`.

Esse é o caminho certo para colocar online.

## Implementação real: teste local com modo `direct`

### 1. Suba um servidor local

Exemplo com Python:

```bash
python -m http.server 5500
```

Abra:

```text
http://localhost:5500
```

### 2. Preencha a interface

Na seção `Conexão`:

- `Modo de conexão`: `Frontend direto (somente teste)`
- `Azure Endpoint`: URL do seu recurso
- `Deployment`: nome do deployment
- `API Key`: chave do recurso

### 3. Ajuste o comportamento

Na seção `Configuração do Agente`, preencha se quiser:

- instruções do sistema
- tom de resposta
- objetivo principal
- restrições
- contexto adicional

Esses campos viram uma mensagem `system` enviada junto com o histórico.

### 4. Envie a mensagem

O frontend fará:

```text
POST https://SEU-ENDPOINT/openai/deployments/SEU-DEPLOYMENT/chat/completions?api-version=2024-12-01-preview
```

Corpo enviado:

```json
{
  "messages": [
    {
      "role": "system",
      "content": "Instruções do sistema: ..."
    },
    {
      "role": "user",
      "content": "Minha pergunta"
    }
  ],
  "max_completion_tokens": 1024,
  "temperature": 1,
  "top_p": 1,
  "frequency_penalty": 0,
  "presence_penalty": 0
}
```

### 5. Quando esse modo deve ser usado

Use esse modo apenas para:

- validar se o deployment responde
- testar o prompt
- demonstrar localmente

Não publique isso em produção com chave real.

## Implementação real: produção com proxy seguro

### Visão geral

No modo `proxy`, o frontend envia o payload para uma API sua. Essa API faz a chamada para o Azure OpenAI usando segredo no servidor.

### Payload que o frontend envia para o proxy

```json
{
  "message": "Explique este processo",
  "deploymentName": "gpt-4.1-mini",
  "instructions": "Instruções do sistema: ...",
  "agentConfig": {
    "systemInstructions": "Você é um assistente técnico.",
    "responseTone": "profissional",
    "mainGoal": "Ajudar o usuário",
    "behaviorRestrictions": "Não invente dados",
    "additionalContext": "",
    "temperature": 1,
    "topP": 1,
    "maxCompletionTokens": 1024
  },
  "history": [
    {
      "role": "user",
      "content": "Pergunta anterior"
    },
    {
      "role": "assistant",
      "content": "Resposta anterior"
    }
  ]
}
```

### Resposta esperada do proxy

O frontend aceita uma resposta simples como:

```json
{
  "assistantReply": "Aqui está a resposta do modelo."
}
```

Também aceita formatos alternativos com:

- `reply`
- `messages`

Mas o mais simples é retornar `assistantReply`.

## Exemplo real de proxy em Node.js

Você pode implementar um backend simples com Express.

### 1. Estrutura sugerida do backend

```text
proxy/
├─ package.json
├─ .env
└─ server.js
```

### 2. Instale dependências

```bash
npm init -y
npm install express cors dotenv
```

### 3. Variáveis de ambiente

Arquivo `.env`:

```env
AZURE_OPENAI_ENDPOINT=https://atividade-chatbot-resource.cognitiveservices.azure.com
AZURE_OPENAI_API_KEY=SUA_CHAVE
AZURE_OPENAI_API_VERSION=2024-12-01-preview
ALLOWED_ORIGIN=https://seu-usuario.github.io
PORT=3000
```

### 4. Código do proxy

```js
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(express.json({ limit: "200kb" }));

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN
  })
);

app.post("/api/chat", async (req, res) => {
  try {
    const {
      message,
      deploymentName,
      instructions,
      history = [],
      agentConfig = {}
    } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: { message: "Mensagem inválida." } });
    }

    if (!deploymentName || typeof deploymentName !== "string") {
      return res.status(400).json({ error: { message: "Deployment inválido." } });
    }

    const messages = [];

    if (instructions && typeof instructions === "string") {
      messages.push({
        role: "system",
        content: instructions
      });
    }

    for (const item of history) {
      if (
        item &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string"
      ) {
        messages.push({
          role: item.role,
          content: item.content
        });
      }
    }

    messages.push({
      role: "user",
      content: message
    });

    const endpoint = process.env.AZURE_OPENAI_ENDPOINT.replace(/\/$/, "");
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview";

    const azureResponse = await fetch(
      `${endpoint}/openai/deployments/${encodeURIComponent(deploymentName)}/chat/completions?api-version=${apiVersion}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.AZURE_OPENAI_API_KEY
        },
        body: JSON.stringify({
          messages,
          max_completion_tokens: agentConfig.maxCompletionTokens || 1024,
          temperature: agentConfig.temperature ?? 1,
          top_p: agentConfig.topP ?? 1,
          frequency_penalty: 0,
          presence_penalty: 0
        })
      }
    );

    const data = await azureResponse.json();

    if (!azureResponse.ok) {
      return res.status(azureResponse.status).json(data);
    }

    return res.json({
      assistantReply: data.choices?.[0]?.message?.content || ""
    });
  } catch (error) {
    return res.status(500).json({
      error: {
        message: "Erro interno ao chamar o Azure OpenAI."
      }
    });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Proxy online na porta ${process.env.PORT || 3000}`);
});
```

### 5. Rodar o proxy

```bash
node server.js
```

### 6. Configurar o frontend

Na interface:

- `Modo de conexão`: `Proxy seguro / backend`
- `Proxy URL`: `http://localhost:3000/api/chat`
- `Deployment`: `gpt-4.1-mini`

Nesse modo, o frontend não usa a chave.

## Deploy real do proxy

Você pode subir esse backend em:

- Azure Function
- Azure App Service
- Azure Container Apps
- Render
- Railway
- outro serviço HTTP

Depois, configure no frontend:

- `Proxy URL`: URL pública do seu backend

Exemplo:

```text
https://meu-proxy.azurewebsites.net/api/chat
```

## Como publicar no GitHub Pages

### 1. Suba o frontend para o GitHub

Arquivos:

- `index.html`
- `style.css`
- `script.js`
- `README.md`

### 2. Ative o GitHub Pages

No repositório:

1. Abra `Settings`
2. Abra `Pages`
3. Escolha `Deploy from a branch`
4. Selecione `main`
5. Selecione `/ (root)`

### 3. Use o modo `proxy`

No GitHub Pages, use:

- `Proxy seguro / backend`

Não use o modo direto com chave real.

## Como saber se está funcionando

Checklist:

1. Seu deployment responde no Azure OpenAI.
2. O endpoint está correto.
3. O deployment name está correto.
4. A API key está correta.
5. O proxy responde `200 OK`.
6. O proxy retorna `assistantReply`.
7. O CORS do backend permite seu domínio.

## Erros comuns

### 401 Unauthorized

Causa provável:

- chave errada
- endpoint errado
- recurso incorreto

### 404 Resource not found

Causa provável:

- deployment name errado
- endpoint errado
- rota incorreta

### 400 Bad Request

Causa provável:

- payload inválido
- parâmetros fora do esperado
- `messages` mal montadas

### CORS blocked

Causa provável:

- o backend não liberou o domínio do GitHub Pages

### Modo direto não funciona no GitHub Pages

Isso é esperado. O projeto foi endurecido para bloquear esse modo em produção estática.

## Segurança

### O que foi endurecido no frontend

- bloqueio do modo direto fora de ambiente local
- CSP por meta tag
- `no-referrer`
- validação de endpoint
- validação de deployment
- limites de payload
- timeout de requisição
- limpeza da chave ao sair da página
- sem renderização HTML de mensagens

### O que o frontend não resolve sozinho

Mesmo com essas proteções, o frontend não substitui backend seguro.

Você ainda precisa, no proxy:

- guardar segredo no servidor
- aplicar CORS corretamente
- validar payload
- aplicar rate limit
- registrar logs
- proteger contra abuso

## Configuração dinâmica x fine-tuning

O painel `Configuração do Agente`:

- não faz fine-tuning
- não altera o modelo permanentemente
- não cria um agente persistente no Azure

Ele apenas monta instruções de execução para aquela conversa.

## Se o seu chatbot criado for um Agent de verdade

Se o que você criou no Azure AI Foundry for um **Agent Service**, então este frontend ainda pode ser aproveitado, mas o backend precisa mudar.

Nesse caso, o backend deve:

- autenticar no serviço de Agents
- usar `agent_id` ou `assistant_id`
- criar ou reutilizar `threads`
- iniciar `runs`
- buscar mensagens do agente

Ou seja:

- a interface pode continuar parecida
- a integração do backend muda completamente

## Resumo prático

Se você quer colocar no ar rapidamente:

1. Teste local com `direct`
2. Confirme endpoint e deployment
3. Crie um proxy simples
4. Coloque a chave no backend
5. Publique o frontend no GitHub Pages
6. Use o modo `proxy`

## Validação feita neste projeto

Foi validado:

- sintaxe do JavaScript com `node --check script.js`
- revisão manual de segurança do frontend
- endurecimento do fluxo para GitHub Pages

Não foi executado teste real contra sua conta Azure, porque isso depende das suas credenciais e do seu recurso.
