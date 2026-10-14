export interface ServerInfo {
  name: string;
  version: string;
}

export const DEFAULT_SERVER_INFO: ServerInfo = {
  name: "alexa-mcp-assistant",
  version: "1.0.0",
};

export const SERVER_CAPABILITIES = {
  tools: {
    listChanged: true,
  },
  resources: {
    subscribe: false,
    listChanged: true,
  },
  prompts: {
    listChanged: true,
  },
  logging: {},
};
