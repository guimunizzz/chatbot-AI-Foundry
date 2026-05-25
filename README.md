# Chatbot com Azure AI Foundry

## Sobre o projeto

Este projeto foi desenvolvido como uma atividade do curso de programação com Inteligência Artificial, com foco no uso dos recursos da Azure para criação de aplicações conectadas a modelos de IA.

A proposta é apresentar, de forma prática, um chatbot web capaz de se comunicar diretamente com uma IA disponibilizada no Azure AI Foundry, utilizando um deployment configurado no Azure OpenAI.

## Objetivo da atividade

O objetivo deste trabalho é demonstrar como integrar uma interface web simples com um serviço de IA na nuvem, permitindo:

- enviar perguntas para um modelo de IA hospedado na Azure
- receber respostas em tempo real
- configurar instruções de comportamento do assistente
- entender na prática o fluxo entre frontend e serviço de IA

Além da parte técnica, esta atividade também ajuda a compreender conceitos importantes de IA aplicada, como uso de prompts, configuração de comportamento do modelo e consumo de APIs em aplicações web.

## Tecnologias utilizadas

- `HTML5`
- `CSS3`
- `JavaScript`
- `Azure AI Foundry`
- `Azure OpenAI`

## Como o chatbot funciona

O sistema possui uma interface web estática onde o usuário informa:

- o `Azure Endpoint`
- o nome do `Deployment`
- a `API Key`
- instruções adicionais para o comportamento da IA

Após o preenchimento desses dados, o chatbot envia a mensagem digitada pelo usuário diretamente para a API `chat/completions` do Azure OpenAI e exibe a resposta na tela.

Também é possível ajustar o perfil de resposta do assistente, como:

- instruções do sistema
- tom de resposta
- objetivo principal
- restrições de comportamento
- contexto adicional

Essas configurações permitem simular diferentes perfis de assistente, tornando a atividade mais rica do ponto de vista de experimentação com IA.

## Estrutura do projeto

```text
chatbot/
|-- index.html
|-- style.css
|-- script.js
`-- README.md
```

## Arquivos principais

### `index.html`

Contém a estrutura da página, incluindo:

- painel de configuração da conexão
- campos de personalização do agente
- área de conversa
- campo de envio de mensagens

### `style.css`

Responsável pela aparência visual do chatbot, organização dos painéis e experiência de uso da interface.

### `script.js`

Contém a lógica da aplicação, como:

- leitura dos campos da interface
- validação dos dados
- montagem do payload enviado ao Azure
- envio da requisição para a IA
- tratamento da resposta
- renderização da conversa na tela

## Requisitos para execução

Para utilizar o projeto, é necessário ter acesso a um recurso configurado na Azure.

Você precisa de:

1. Um recurso Azure OpenAI ativo.
2. Um modelo implantado no Azure AI Foundry.
3. O nome do deployment.
4. O endpoint do recurso.
5. Uma chave de API válida.

## Como executar

1. Abra o projeto no navegador.
2. Preencha o campo `Azure Endpoint`.
3. Informe o nome do `Deployment`.
4. Digite a `API Key`.
5. Ajuste as instruções do agente, se desejar.
6. Envie uma pergunta no campo de mensagem.

## Exemplo de uso

Exemplo de configuração:

- `Azure Endpoint`: `https://seu-recurso.cognitiveservices.azure.com/`
- `Deployment`: `gpt-4.1-mini`

Exemplo de pergunta:

```text
Explique de forma simples o que é inteligência artificial.
```

## Aprendizados envolvidos

Com esta atividade, é possível praticar:

- integração entre frontend e serviços de IA
- consumo de API REST
- manipulação de eventos com JavaScript
- organização de interface com HTML e CSS
- construção de prompts para orientar respostas da IA
- uso de recursos da plataforma Microsoft Azure

## Importante

Esta versão do projeto realiza a conexão diretamente pelo frontend. Por isso, a `API Key` é informada na própria interface.

Esse formato é adequado para fins educacionais e testes controlados, mas não é o mais indicado para ambientes de produção.

## Relação com o curso

Este projeto se encaixa na proposta do curso por unir programação web com recursos de Inteligência Artificial em nuvem. Ele permite que o aluno compreenda, na prática, como aplicações podem utilizar modelos de linguagem para responder perguntas, adaptar comportamento e oferecer interações inteligentes.

Mais do que criar uma interface de chat, a atividade demonstra como a IA pode ser incorporada em soluções reais usando serviços modernos da Azure.

## Conclusão

Este chatbot representa uma aplicação prática dos conteúdos estudados em programação com IA. A atividade mostra como conectar um sistema web a uma IA do Azure AI Foundry, explorando conceitos de integração, configuração de modelos e construção de experiências interativas com Inteligência Artificial.
