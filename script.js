const DEFAULT_AGENT_CONFIG = {
  systemInstructions: "Você é um assistente profissional, claro e confiável.",
  responseTone: "profissional e objetivo",
  mainGoal: "Responder perguntas do usuário com clareza e contexto suficiente.",
  behaviorRestrictions: "Não invente informações. Se faltar contexto, peça detalhes.",
  additionalContext: "",
  temperature: 1,
  topP: 1,
  maxCompletionTokens: 1024
};

const SECURITY_LIMITS = {
  maxMessageLength: 4000,
  maxInstructionsLength: 12000,
  maxHistoryMessages: 20,
  maxHistoryCharacters: 24000,
  maxErrorLength: 500,
  requestTimeoutMs: 30000,
  minTemperature: 0,
  maxTemperature: 2,
  minTopP: 0,
  maxTopP: 1,
  minCompletionTokens: 1,
  maxCompletionTokens: 4096
};

const state = {
  messages: [],
  isLoading: false
};

function getElement(id) {
  return document.getElementById(id);
}

function getRequiredElement(id) {
  const element = getElement(id);
  if (!element) {
    throw new Error(`Elemento obrigatório não encontrado: ${id}`);
  }

  return element;
}

const elements = {
  chatForm: getRequiredElement("chatForm"),
  userMessage: getRequiredElement("userMessage"),
  chatHistory: getRequiredElement("chatHistory"),
  loadingIndicator: getRequiredElement("loadingIndicator"),
  errorBanner: getRequiredElement("errorBanner"),
  sendButton: getRequiredElement("sendButton"),
  newConversation: getRequiredElement("newConversation"),
  exportConversation: getRequiredElement("exportConversation"),
  connectionStatus: getRequiredElement("connectionStatus"),
  azureEndpoint: getRequiredElement("azureEndpoint"),
  deploymentName: getRequiredElement("deploymentName"),
  apiKey: getRequiredElement("apiKey"),
  directModeWarning: getRequiredElement("directModeWarning"),
  resetAgentConfig: getRequiredElement("resetAgentConfig"),
  systemInstructions: getRequiredElement("systemInstructions"),
  responseTone: getRequiredElement("responseTone"),
  mainGoal: getRequiredElement("mainGoal"),
  behaviorRestrictions: getRequiredElement("behaviorRestrictions"),
  additionalContext: getRequiredElement("additionalContext"),
  temperature: getRequiredElement("temperature"),
  topP: getRequiredElement("topP"),
  maxCompletionTokens: getRequiredElement("maxCompletionTokens"),
  messageTemplate: getRequiredElement("messageTemplate")
};

try {
  initializeApp();
} catch (error) {
  const message = error instanceof Error ? error.message : "Falha ao iniciar a interface.";
  document.body.innerHTML = `
    <main style="font-family: sans-serif; padding: 24px; max-width: 720px; margin: 0 auto;">
      <h1>Falha ao carregar o chatbot</h1>
      <p>${message}</p>
      <p>Atualize a página com Ctrl+F5 para recarregar os arquivos mais recentes.</p>
    </main>
  `;
}

function initializeApp() {
  hydrateDefaultAgentConfig();
  clearSensitiveFields();
  attachEventListeners();
  updateConnectionStatus();
}

function attachEventListeners() {
  elements.chatForm.addEventListener("submit", handleChatSubmit);
  elements.userMessage.addEventListener("keydown", handleComposerKeydown);
  elements.newConversation.addEventListener("click", resetConversation);
  elements.exportConversation.addEventListener("click", exportConversation);
  elements.azureEndpoint.addEventListener("input", updateConnectionStatus);
  elements.deploymentName.addEventListener("input", updateConnectionStatus);
  elements.apiKey.addEventListener("input", updateConnectionStatus);
  elements.resetAgentConfig.addEventListener("click", hydrateDefaultAgentConfig);
  window.addEventListener("beforeunload", clearSensitiveFields);
}

function hydrateDefaultAgentConfig() {
  elements.systemInstructions.value = DEFAULT_AGENT_CONFIG.systemInstructions;
  elements.responseTone.value = DEFAULT_AGENT_CONFIG.responseTone;
  elements.mainGoal.value = DEFAULT_AGENT_CONFIG.mainGoal;
  elements.behaviorRestrictions.value = DEFAULT_AGENT_CONFIG.behaviorRestrictions;
  elements.additionalContext.value = DEFAULT_AGENT_CONFIG.additionalContext;
  elements.temperature.value = DEFAULT_AGENT_CONFIG.temperature;
  elements.topP.value = DEFAULT_AGENT_CONFIG.topP;
  elements.maxCompletionTokens.value = DEFAULT_AGENT_CONFIG.maxCompletionTokens;
}

function clearSensitiveFields() {
  elements.apiKey.value = "";
}

function handleComposerKeydown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    elements.chatForm.requestSubmit();
  }
}

async function handleChatSubmit(event) {
  event.preventDefault();
  if (state.isLoading) {
    return;
  }

  const message = sanitizeText(elements.userMessage.value, SECURITY_LIMITS.maxMessageLength);
  if (!message) {
    return;
  }

  try {
    clearError();
    validateConfiguration();
    appendMessage("user", message);
    elements.userMessage.value = "";
    setLoading(true);

    const payload = buildRequestPayload(message);
    const response = await sendChatRequest(payload);
    const agentReply = extractAssistantReply(response);

    if (!agentReply) {
      throw new Error("A API respondeu, mas nenhuma mensagem do assistente foi encontrada.");
    }

    appendMessage("assistant", agentReply);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Erro desconhecido.";
    showError(messageText);
  } finally {
    setLoading(false);
  }
}

function validateConfiguration() {
  sanitizeDeploymentName(elements.deploymentName.value);

  if (!elements.azureEndpoint.value.trim()) {
    throw new Error("Informe o Azure Endpoint para o modo direto.");
  }

  if (!elements.apiKey.value.trim()) {
    throw new Error("Informe a API Key para o modo direto.");
  }

  validateAzureEndpoint(elements.azureEndpoint.value);
}

function buildRequestPayload(message) {
  const agentConfig = collectAgentConfig();

  return {
    message,
    deploymentName: sanitizeDeploymentName(elements.deploymentName.value),
    azureEndpoint: elements.azureEndpoint.value.trim(),
    apiKey: elements.apiKey.value.trim(),
    history: buildSafeHistory(),
    agentConfig,
    composedInstructions: composeInstructions(agentConfig)
  };
}

function collectAgentConfig() {
  return {
    systemInstructions: sanitizeText(elements.systemInstructions.value, 4000),
    responseTone: sanitizeText(elements.responseTone.value, 200),
    mainGoal: sanitizeText(elements.mainGoal.value, 2000),
    behaviorRestrictions: sanitizeText(elements.behaviorRestrictions.value, 2000),
    additionalContext: sanitizeText(elements.additionalContext.value, 4000),
    temperature: clampNumber(
      Number(elements.temperature.value || DEFAULT_AGENT_CONFIG.temperature),
      SECURITY_LIMITS.minTemperature,
      SECURITY_LIMITS.maxTemperature,
      DEFAULT_AGENT_CONFIG.temperature
    ),
    topP: clampNumber(
      Number(elements.topP.value || DEFAULT_AGENT_CONFIG.topP),
      SECURITY_LIMITS.minTopP,
      SECURITY_LIMITS.maxTopP,
      DEFAULT_AGENT_CONFIG.topP
    ),
    maxCompletionTokens: clampInteger(
      elements.maxCompletionTokens.value || DEFAULT_AGENT_CONFIG.maxCompletionTokens,
      SECURITY_LIMITS.minCompletionTokens,
      SECURITY_LIMITS.maxCompletionTokens,
      DEFAULT_AGENT_CONFIG.maxCompletionTokens
    )
  };
}

function composeInstructions(config) {
  const sections = [
    ["Instruções do sistema", config.systemInstructions],
    ["Tom de resposta", config.responseTone],
    ["Objetivo principal", config.mainGoal],
    ["Restrições de comportamento", config.behaviorRestrictions],
    ["Contexto adicional", config.additionalContext]
  ].filter(([, value]) => Boolean(value));

  return sanitizeText(
    sections.map(([title, value]) => `${title}: ${value}`).join("\n"),
    SECURITY_LIMITS.maxInstructionsLength
  );
}

async function sendChatRequest(payload) {
  return sendDirectToAzureOpenAI(payload);
}

async function sendDirectToAzureOpenAI(payload) {
  const endpoint = sanitizeEndpoint(payload.azureEndpoint);
  const response = await fetchWithTimeout(
    `${endpoint}/openai/deployments/${encodeURIComponent(payload.deploymentName)}/chat/completions?api-version=2024-12-01-preview`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": payload.apiKey
      },
      body: JSON.stringify({
        messages: buildChatCompletionMessages(payload),
        max_completion_tokens: payload.agentConfig.maxCompletionTokens,
        temperature: payload.agentConfig.temperature,
        top_p: payload.agentConfig.topP,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    }
  );

  const data = await parseJsonResponse(response);
  return {
    assistantReply: data.choices?.[0]?.message?.content || "",
    raw: data
  };
}

function buildChatCompletionMessages(payload) {
  const messages = [];
  if (payload.composedInstructions) {
    messages.push({
      role: "system",
      content: payload.composedInstructions
    });
  }

  for (const item of payload.history) {
    messages.push({
      role: item.role,
      content: sanitizeText(item.content, SECURITY_LIMITS.maxMessageLength)
    });
  }

  messages.push({
    role: "user",
    content: payload.message
  });

  return messages;
}

function extractAssistantReply(response) {
  if (typeof response.assistantReply === "string" && response.assistantReply.trim()) {
    return sanitizeText(response.assistantReply, SECURITY_LIMITS.maxHistoryCharacters);
  }

  if (Array.isArray(response.messages)) {
    const lastAssistant = [...response.messages].reverse().find((item) => item.role === "assistant");
    return sanitizeText(lastAssistant?.content || "", SECURITY_LIMITS.maxHistoryCharacters);
  }

  if (typeof response.reply === "string") {
    return sanitizeText(response.reply, SECURITY_LIMITS.maxHistoryCharacters);
  }

  return "";
}

async function parseJsonResponse(response) {
  const text = await response.text();
  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const errorMessage =
      data.error?.message ||
      data.message ||
      `Falha na requisição (${response.status} ${response.statusText}).`;
    throw new Error(sanitizeText(errorMessage, SECURITY_LIMITS.maxErrorLength));
  }

  return data;
}

function appendMessage(role, content) {
  const safeContent = sanitizeText(content, SECURITY_LIMITS.maxMessageLength);
  const entry = {
    role,
    content: safeContent,
    createdAt: new Date().toISOString()
  };

  state.messages.push(entry);
  trimConversationState();

  const fragment = elements.messageTemplate.content.cloneNode(true);
  const article = fragment.querySelector(".message");
  const roleElement = fragment.querySelector(".message-role");
  const bubble = fragment.querySelector(".message-bubble");

  article.classList.add(role);
  roleElement.textContent = role === "user" ? "Você" : "Assistente";
  bubble.textContent = safeContent;

  elements.chatHistory.appendChild(fragment);
  elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
}

function resetConversation() {
  state.messages = [];
  elements.chatHistory.replaceChildren();
  clearError();
  appendMessage("assistant", "Nova conversa iniciada. Envie sua próxima pergunta.");
}

function exportConversation() {
  const payload = {
    exportedAt: new Date().toISOString(),
    messages: state.messages,
    agentConfig: collectAgentConfig()
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "conversation-export.json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function setLoading(isLoading) {
  state.isLoading = isLoading;
  elements.loadingIndicator.classList.toggle("hidden", !isLoading);
  elements.sendButton.disabled = isLoading;
  elements.userMessage.disabled = isLoading;
}

function showError(message) {
  elements.errorBanner.textContent = sanitizeText(message, SECURITY_LIMITS.maxErrorLength);
  elements.errorBanner.classList.remove("hidden");
}

function clearError() {
  elements.errorBanner.textContent = "";
  elements.errorBanner.classList.add("hidden");
}

function updateConnectionStatus() {
  let isConfigured = false;

  try {
    isConfigured = Boolean(
      elements.azureEndpoint.value.trim() &&
      sanitizeDeploymentName(elements.deploymentName.value) &&
      elements.apiKey.value.trim()
    );
  } catch {
    isConfigured = false;
  }

  elements.connectionStatus.textContent = isConfigured ? "Pronto" : "Não configurado";
  elements.connectionStatus.classList.toggle("connected", isConfigured);
  elements.apiKey.disabled = false;
  elements.azureEndpoint.disabled = false;
  toggleDirectWarning(true);
}

function buildSafeHistory() {
  const recentMessages = state.messages
    .filter((item) => item.role === "user" || item.role === "assistant")
    .slice(-SECURITY_LIMITS.maxHistoryMessages);

  const safeHistory = [];
  let totalCharacters = 0;

  for (let index = recentMessages.length - 1; index >= 0; index -= 1) {
    const item = recentMessages[index];
    const content = sanitizeText(item.content, SECURITY_LIMITS.maxMessageLength);
    if (totalCharacters + content.length > SECURITY_LIMITS.maxHistoryCharacters) {
      break;
    }

    totalCharacters += content.length;
    safeHistory.unshift({
      role: item.role,
      content
    });
  }

  return safeHistory;
}

function trimConversationState() {
  if (state.messages.length > SECURITY_LIMITS.maxHistoryMessages + 1) {
    state.messages = state.messages.slice(-(SECURITY_LIMITS.maxHistoryMessages + 1));
  }
}

function sanitizeText(value, maxLength) {
  const normalized = String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();

  if (normalized.length > maxLength) {
    return normalized.slice(0, maxLength);
  }

  return normalized;
}

function sanitizeDeploymentName(value) {
  const sanitized = sanitizeText(value, 120);
  if (!sanitized) {
    throw new Error("Preencha o nome do deployment antes de enviar mensagens.");
  }

  if (!/^[A-Za-z0-9._-]+$/.test(sanitized)) {
    throw new Error("Deployment inválido. Use apenas letras, números, ponto, hífen e underscore.");
  }

  return sanitized;
}

function validateAzureEndpoint(value) {
  const url = parseUrl(value, "Azure Endpoint inválido.");

  if (!isHttpsOrLocal(url)) {
    throw new Error("O Azure Endpoint deve usar HTTPS.");
  }

  if (!isAllowedAzureHost(url.hostname)) {
    throw new Error("Azure Endpoint fora do padrão esperado do Azure OpenAI.");
  }
}

function parseUrl(value, errorMessage) {
  try {
    return new URL(String(value).trim());
  } catch {
    throw new Error(errorMessage);
  }
}

function isAllowedAzureHost(hostname) {
  return (
    hostname.endsWith(".cognitiveservices.azure.com") ||
    hostname.endsWith(".openai.azure.com") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  );
}

function isHttpsOrLocal(url) {
  return url.protocol === "https:" || isLocalOrigin(url);
}

function isLocalOrigin(target) {
  return (
    target.protocol === "file:" ||
    target.hostname === "localhost" ||
    target.hostname === "127.0.0.1"
  );
}

function toggleDirectWarning(visible) {
  elements.directModeWarning.classList.toggle("hidden", !visible);
}

function sanitizeEndpoint(endpoint) {
  return endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
}

function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), SECURITY_LIMITS.requestTimeoutMs);

  return fetch(url, {
    ...options,
    cache: "no-store",
    credentials: "omit",
    mode: "cors",
    referrerPolicy: "no-referrer",
    signal: controller.signal
  }).finally(() => {
    globalThis.clearTimeout(timeoutId);
  });
}

function clampNumber(value, min, max, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

function clampInteger(value, min, max, fallback) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numeric));
}
