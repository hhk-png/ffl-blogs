/* JSON-RPC types */
export type JSONRPCMessage =
  | JSONRPCRequest
  | JSONRPCNotification
  | JSONRPCResponse
  | JSONRPCError;

export const LATEST_PROTOCOL_VERSION = "2024-11-05";
export const JSONRPC_VERSION = "2.0";

/**
 * 进度token，用于将进度通知与原始请求联系起来。
 * A progress token, used to associate progress notifications with the original request.
 */
export type ProgressToken = string | number;

/**
 * 不透明token，用于表示分页的游标。
 */
export type Cursor = string;

export interface Request {
  method: string;
  params?: {
    _meta?: {
      /**
       * 如果指定该参数，表示调用方请求对此请求进行带外进度通知，
       * 表示发起的请求的进度（由 notifications/progress 表示）。
       * 该参数的值是一个不透明token，会附加到后续的所有通知中。
       * 接收方没有义务提供这些通知。
       */
      progressToken?: ProgressToken;
    };
    [key: string]: unknown;
  };
}

export interface Notification {
  method: string;
  params?: {
    /**
     * 该参数名称由 MCP 保留，以允许客户端和服务器将额外的元数据附加到他们的通知中。
     *  MCP 预留了这个参数名称，供特定用途使用。
     */
    _meta?: { [key: string]: unknown };
    [key: string]: unknown;
  };
}

export interface Result {
  /**
   * 协议保留此结果属性，以允许客户端和服务器将额外的元数据附加到他们的响应中。
   */
  _meta?: { [key: string]: unknown };
  [key: string]: unknown;
}

/**
 * JSON-RPC 中请求的唯一标识 ID。
 */
export type RequestId = string | number;

/**
 * 期望接收到响应的请求。
 */
export interface JSONRPCRequest extends Request {
  jsonrpc: typeof JSONRPC_VERSION;
  id: RequestId;
}

/**
 * 不期望接收到响应的通知。
 */
export interface JSONRPCNotification extends Notification {
  jsonrpc: typeof JSONRPC_VERSION;
}

/**
 * 对请求的成功（没有错误）响应。
 */
export interface JSONRPCResponse {
  jsonrpc: typeof JSONRPC_VERSION;
  id: RequestId;
  result: Result;
}

// JSON-RPC 错误代码
export const PARSE_ERROR = -32700;
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;
export const INTERNAL_ERROR = -32603;

/**
 * 对请求的响应，表明发生了错误。
 */
export interface JSONRPCError {
  jsonrpc: typeof JSONRPC_VERSION;
  id: RequestId;
  error: {
    /**
     * 错误类型
     */
    code: number;
    /**
     * 关于错误的简短描述。消息应限制为简洁精确的一个句子。
     * A short description of the error. The message SHOULD be limited to a concise single sentence.
     */
    message: string;
    /**
     * 关于错误的附加信息，该字段的值由发送者指定（例如，详细的错误信息、嵌套错误等）
     */
    data?: unknown;
  };
}

/* Empty Result 空响应 */
/**
 * 表示成功但不包含数据的响应
 */
export type EmptyResult = Result;

/* Cancellation */
/**
 * 任何一方都可以发送此通知，表明正在取消先前发出的请求。
 * 该请求应仍在进行中，但由于通信延迟，该通知可能在请求完成后才到达。
 * 此通知表明该结果将不会被使用，因此任何相关处理都应停止。
 * 客户端一定不可以尝试取消其“初始化”请求。
 */
export interface CancelledNotification extends Notification {
  method: "notifications/cancelled";
  params: {
    /**
     * 想要取消的请求ID，其必须与之前在同一方向发出的请求的 ID 相对应。
     */
    requestId: RequestId;

    /**
     * 描述取消原因的可选字符串。此信息可能会被记录或呈现给用户。
     */
    reason?: string;
  };
}

/* Initialization */
/**
 * 客户端首次连接时向服务器发送此请求，要求服务器开始初始化。
 */
export interface InitializeRequest extends Request {
  method: "initialize";
  params: {
    /**
     * 客户端支持的MCP的最新版本。客户端也可以决定使用旧版本。
     */
    protocolVersion: string;
    capabilities: ClientCapabilities;
    clientInfo: Implementation;
  };
}

/**
 * 在收到客户端的初始化请求后，服务器发送此响应
 */
export interface InitializeResult extends Result {
  /**
   * 服务器想要使用的模型上下文协议的版本。这可能与客户端请求的版本不匹配。
   * 如果客户端无法支持此版本，则必须断开连接。
   */
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: Implementation;
  /**
   * 描述如何使用服务器及其功能的说明。
   * 
   * 客户可利用这些信息来提高 LLM 对可用工具、资源等的理解。
   * 可被视为对模型的“提示”。例如，指定 "这些信息可添加到系统提示中"
   */
  instructions?: string;
}

/**
 * 初始化完成后，此通知从客户端发送到服务器。
 */
export interface InitializedNotification extends Notification {
  method: "notifications/initialized";
}

/**
 * 客户端支持的功能。已知的功能已经在此文档（该文件）中定义，
 * 但该文档并不是封闭的集合，任何客户端都可以定义自己的附加功能。
 */
export interface ClientCapabilities {
  /**
   * 客户端支持的实验性的、非标准的功能。
   */
  experimental?: { [key: string]: object };
  /**
   * 如果客户端支持列出根目录，则携带。
   */
  roots?: {
    /**
     * 客户端是否支持根目录列表更改的通知。
     */
    listChanged?: boolean;
  };
  /**
   * 如果客户支持从 LLM 中抽样，则存在。
   */
  sampling?: object;
}

/**
 * 服务器可能支持的功能。已知的功能已经在此文档（该文件）中定义，
 * 但该文档并不是封闭的集合，任何客户端都可以定义自己的附加功能。
 */
export interface ServerCapabilities {
  /**
   * 服务器支持的实验性的、非标准的功能。
   */
  experimental?: { [key: string]: object };
  /**
   * 如果服务器支持向客户端发送日志消息，则存在此字段。
   */
  logging?: object;
  /**
   * 如果服务器提供了prompt模板，则携带该值
   */
  prompts?: {
    /**
     * 服务器是否支持prompt列表变更的通知。
     */
    listChanged?: boolean;
  };
  /**
   * 如果服务器提供任何可供读取的资源，则显示。
   */
  resources?: {
    /**
     * 该服务器是否支持订阅资源更新。
     */
    subscribe?: boolean;
    /**
     * 该服务器是否支持资源列表变更的通知。
     */
    listChanged?: boolean;
  };
  /**
   * 如果服务器提供任何可调用的工具，则显示。
   */
  tools?: {
    /**
     * 该服务器是否支持工具列表变更的通知。
     */
    listChanged?: boolean;
  };
}

/**
 * 实现的 MCP 的名称和版本。
 */
export interface Implementation {
  name: string;
  version: string;
}

/* Ping */
/**
 * 由服务器或客户端发出的 ping 命令，用于检查对方是否仍然处于活动状态。
 * 接收方必须立即响应，否则可能会断开连接。
 */
export interface PingRequest extends Request {
  method: "ping";
}

/* Progress notifications */
/**
 * 一个带外通知，用于通知接收方关于持续传输请求的进度更新。
 */
export interface ProgressNotification extends Notification {
  method: "notifications/progress";
  params: {
    /**
     * 初始化请求时给出的进度token，用于将此通知与正在进行的请求关联起来。
     */
    progressToken: ProgressToken;
    /**
     * 当前的进度。每次取得进展时，该数字都会增加，即使总数未知。
     */
    progress: number;
    /**
     * 需要处理的项目总数（或所需的总进度），如果已知的话
     * Total number of items to process (or total progress required), if known.
     */
    total?: number;
  };
}

/* Pagination */
export interface PaginatedRequest extends Request {
  params?: {
    /**
     * 表示当前分页位置的不透明标记。如果提供，服务器应返回从此光标之后开始的结果。
     */
    cursor?: Cursor;
  };
}

export interface PaginatedResult extends Result {
  /**
   * 一个不透明的标记，表示最后一个返回结果后的分页位置。
   * 如果存在，则可能会有更多结果可用。
   */
  nextCursor?: Cursor;
}

/* Resources */
/**
 * 从客户端发送的请求，以获取服务器拥有的资源列表。
 */
export interface ListResourcesRequest extends PaginatedRequest {
  method: "resources/list";
}

/**
 * 服务器对 ListResourcesRequest 的响应。
 */
export interface ListResourcesResult extends PaginatedResult {
  resources: Resource[];
}

/**
 * 从客户端发送的请求，以获取服务器拥有的资源模板列表。
 */
export interface ListResourceTemplatesRequest extends PaginatedRequest {
  method: "resources/templates/list";
}

/**
 * 服务器对 ListResourceTemplatesRequest 的响应
 */
export interface ListResourceTemplatesResult extends PaginatedResult {
  resourceTemplates: ResourceTemplate[];
}

/**
 * 从客户端发送到服务器，以读取特定的资源 URI。
 */
export interface ReadResourceRequest extends Request {
  method: "resources/read";
  params: {
    /**
     * 要读取的资源的 URI。URI 可以使用任何协议；由服务器决定如何解析。
     *
     * @format uri
     */
    uri: string;
  };
}

/**
 * 对 ReadResourceRequest 的响应
 */
export interface ReadResourceResult extends Result {
  contents: (TextResourceContents | BlobResourceContents)[];
}

/**
 * 服务器向客户端发送的可选通知，告知客户端可以读取的资源列表已发生更改。
 * 服务器可以在没有客户端先前订阅的情况下发出此通知。
 */
export interface ResourceListChangedNotification extends Notification {
  method: "notifications/resources/list_changed";
}

/**
 * 每当特定资源发生变化时，该请求从客户端发送，以从服务器请求 resources/updated 通知。
 */
export interface SubscribeRequest extends Request {
  method: "resources/subscribe";
  params: {
    /**
     * 要订阅的资源的 URI。URI 可以使用任何协议；如何解析它取决于服务器。
     *
     * @format uri
     */
    uri: string;
  };
}

/**
 * 由客户端发送，用于取消来自服务器的 resources/updated 通知。
 * 此请求应遵循先前的 resources/subscribe 请求。
 */
export interface UnsubscribeRequest extends Request {
  method: "resources/unsubscribe";
  params: {
    /**
     * The URI of the resource to unsubscribe from.
     *
     * @format uri
     */
    uri: string;
  };
}

/**
 * 服务器向客户端发送通知，告知其资源已更改，可能需要重新读取。
 * 仅当客户端之前发送了 resources/subscribe 请求时才应发送此通知。
 */
export interface ResourceUpdatedNotification extends Notification {
  method: "notifications/resources/updated";
  params: {
    /**
     * 已更新资源的 URI。这可能是客户端实际订阅资源的子资源。
     *
     * @format uri
     */
    uri: string;
  };
}

/**
 * 服务器能够读取的已知资源。
 */
export interface Resource extends Annotated {
  /**
   * 资源的 URI
   *
   * @format uri
   */
  uri: string;

  /**
   * 资源的名称，供人读取。客户端可以使用它来填充 UI 元素。
   */
  name: string;

  /**
   * 对此资源所代表内容的描述。
   * 客户端可利用这一点来提高 LLM 对可用资源的理解。这可视为模型的"提示"。
   */
  description?: string;

  /**
   * 资源的MIME type
   */
  mimeType?: string;

  /**
   * 原始资源内容的大小（以字节为单位）（即在 base64 编码或任何标记化之前）。
   *
   * 可以使用它来显示文件大小并估计上下文窗口的使用情况。
   */
  size?: number;
}

/**
 * 服务器上可用资源的模板描述。
 */
export interface ResourceTemplate extends Annotated {
  /**
   * 用于构建资源 URI 的 URI 模板（依据 RFC 6570(https://www.rfc-editor.org/rfc/rfc6570.html)）。
   *
   * @format uri-template
   */
  uriTemplate: string;

  /**
   * 模板引用的资源类型名称。客户端可以使用它来填充 UI 元素。
   */
  name: string;

  /**
   * 此模板用途的描述。客户可利用这一点来提高 LLM 对可用资源的理解。
   * 这可视为对模型的"提示"。
   */
  description?: string;

  /**
   * 与此模板匹配的所有资源的 MIME 类型。仅当与此模板匹配的所有资源
   * 都具有相同类型时才应包含此项。
   */
  mimeType?: string;
}

/**
 * 特定资源或子资源的内容。
 */
export interface ResourceContents {
  /**
   * 资源的 URI。
   *
   * @format uri
   */
  uri: string;
  /**
   * 此资源的 MIME 类型，如果已知。
   */
  mimeType?: string;
}

export interface TextResourceContents extends ResourceContents {
  /**
   * 资源文本。仅当该项实际上可以表示为文本（而非二进制数据）时才必须设置此项。
   */
  text: string;
}

export interface BlobResourceContents extends ResourceContents {
  /**
   * 表示二进制数据的 base64 编码字符串。
   *
   * @format byte
   */
  blob: string;
}

/* Prompts */
/**
 * 从客户端发送以请求服务器具有的 prompt 和 prompt 模板列表。
 */
export interface ListPromptsRequest extends PaginatedRequest {
  method: "prompts/list";
}

/**
 * 服务器对来自客户端的 prompts/list 请求的响应。
 */
export interface ListPromptsResult extends PaginatedResult {
  prompts: Prompt[];
}

/**
 * 客户端用来获取服务器提供的 prompt。
 */
export interface GetPromptRequest extends Request {
  method: "prompts/get";
  params: {
    /**
     * prompt 或 prompt 模板的名称。
     */
    name: string;
    /**
     * 用于传入prompt模板的参数。
     */
    arguments?: { [key: string]: string };
  };
}

/**
 * 服务器对客户端的 prompts/get 请求的响应。
 */
export interface GetPromptResult extends Result {
  /**
   * prompt 的可选描述。
   */
  description?: string;
  messages: PromptMessage[];
}

/**
 * 服务器提供的 prompt 或 prompt 模板。
 */
export interface Prompt {
  /**
   * prompt 或 prompt 模板的名称。
   */
  name: string;
  /**
   * 此 prompt 提供的内容的描述
   */
  description?: string;
  /**
   * 用于模板化 prompt 的参数列表。
   */
  arguments?: PromptArgument[];
}

/**
 * 描述 Prompt 可以接受的参数。
 */
export interface PromptArgument {
  /**
   * 参数的名称。
   */
  name: string;
  /**
   * 参数的描述
   */
  description?: string;
  /**
   * 是否必须提供此参数。
   */
  required?: boolean;
}

/**
 * 对话中消息和数据的发送者或接收者。
 */
export type Role = "user" | "assistant";

/**
 * 描述作为 prompt 的一部分返回的消息。这类似于`SamplingMessage`，
 * 但也支持嵌入来自 MCP 服务器的资源。
 */
export interface PromptMessage {
  role: Role;
  content: TextContent | ImageContent | EmbeddedResource;
}

/**
 * 资源的内容，嵌入到 prompt 或工具调用结果中。
 * 如何最好地呈现嵌入式资源以帮助 LLM 和用户取决于客户端。
 */
export interface EmbeddedResource extends Annotated {
  type: "resource";
  resource: TextResourceContents | BlobResourceContents;
}

/**
 * 服务器向客户端发送的可选通知，告知其提供的 prompt 列表已发生更改。
 * 服务器可以在没有客户端先前订阅的情况下发出此通知。
 */
export interface PromptListChangedNotification extends Notification {
  method: "notifications/prompts/list_changed";
}

/* Tools */
/**
 * 从客户端发送以请求服务器拥有的工具列表。
 */
export interface ListToolsRequest extends PaginatedRequest {
  method: "tools/list";
}

/**
 * 服务器对来自客户端的 tools/list 请求的响应。
 */
export interface ListToolsResult extends PaginatedResult {
  tools: Tool[];
}

/**
 * 服务器对工具调用的响应。
 *
 * 任何源自工具的错误都应在结果对象内报告中，并将“isError”设置为 true，
 * 而不是作为 MCP 协议级错误响应。否则，LLM 将无法看到发生了错误并自行纠正。
 *
 * 但是，任何在查找工具时发生的错误、表明服务器不支持工具调用的错误或
 * 任何其他异常情况都应被判为 MCP 错误响应。
 */
export interface CallToolResult extends Result {
  content: (TextContent | ImageContent | EmbeddedResource)[];

  /**
   * 工具调用是否发生错误。如果未设置，则设置为false，表示调用成功
   */
  isError?: boolean;
}

/**
 * 由客户端用来调用服务器提供的工具。
 */
export interface CallToolRequest extends Request {
  method: "tools/call";
  params: {
    name: string;
    arguments?: { [key: string]: unknown };
  };
}

/**
 * 服务器向客户端发送的通知，告知其提供的工具列表已发生更改。
 * 服务器可以在没有客户端先前订阅的情况下发出此通知。
 */
export interface ToolListChangedNotification extends Notification {
  method: "notifications/tools/list_changed";
}

/**
 * 客户端可以调用的工具的定义。
 */
export interface Tool {
  /**
   * 工具名称
   */
  name: string;
  /**
   * 人可读的工具的描述
   */
  description?: string;
  /**
   * 定义工具预期参数的 JSON Schema 对象。
   */
  inputSchema: {
    type: "object";
    properties?: { [key: string]: object };
    required?: string[];
  };
}

/* Logging */
/**
 * 客户端向服务器发出的启用或调整日志记录的请求。
 */
export interface SetLevelRequest extends Request {
  method: "logging/setLevel";
  params: {
    /**
     * 客户端希望从服务器接收的日志级别。服务器应将此级别及更高级别
     * （即更严重）的所有日志作为 通知/消息 发送给客户端。
     */
    level: LoggingLevel;
  };
}

/**
 * 从服务器传递到客户端的日志消息通知。如果客户端未发送任何
 *  logging/setLevel 请求，则服务器可以决定自动发送哪些消息。
 */
export interface LoggingMessageNotification extends Notification {
  method: "notifications/message";
  params: {
    /**
     * 此日志消息的等级（严重性）。
     */
    level: LoggingLevel;
    /**
     * 发出此消息的 logger 的可选名称。
     */
    logger?: string;
    /**
     * 用于日志记录的数据，例如字符串消息或对象。此处允许任何 JSON 可序列化类型。
     */
    data: unknown;
  };
}

/**
 * 日志消息的严重级别。
 *
 * 这些映射到系统日志消息严重性，如 RFC-5424 中指定：
 * https://datatracker.ietf.org/doc/html/rfc5424#section-6.2.1
 */
export type LoggingLevel =
  | "debug"
  | "info"
  | "notice"
  | "warning"
  | "error"
  | "critical"
  | "alert"
  | "emergency";

/* Sampling */
/**
 * 服务器向客户端发出请求，以对 LLM 进行采样。客户端可完全自主选择使用哪个模型。
 * 客户端还应在开始采样之前通知用户，以便用户检查请求（人为介入）并决定是否批准。
 */
export interface CreateMessageRequest extends Request {
  method: "sampling/createMessage";
  params: {
    messages: SamplingMessage[];
    /**
     * 服务器对于选择哪个模型的偏好。客户端可以忽略这些偏好。
     */
    modelPreferences?: ModelPreferences;
    /**
     * 服务器希望用于采样的系统提示。客户端可以修改或省略此提示。
     */
    systemPrompt?: string;
    /**
     * 请求包含来自一个或多个 MCP 服务器（包括调用方）的上下文，
     * 将其附加到 prompt 中。客户端可以忽略此请求
     */
    includeContext?: "none" | "thisServer" | "allServers";
    /**
     * @TJS-type number
     */
    temperature?: number;
    /**
     * 服务器请求的最大采样 token 数。
     * 采样时，客户端可以选择比服务器要求的更少的 Token。
     */
    maxTokens: number;
    stopSequences?: string[];
    /**
     * 传递给 LLM 厂商的元数据。此元数据的格式特定于 LLM 提供方。
     */
    metadata?: object;
  };
}

/**
 * 客户端对服务器的 sampling/createMessage 请求的响应。
 * 客户端应在返回采样消息之前通知用户，以允许用户检查响应（人为参与）
 * 并决定是否允许服务器查看它。
 */
export interface CreateMessageResult extends Result, SamplingMessage {
  /**
   * 与用户交互的模型的名称。
   */
  model: string;
  /**
   * 停止采样的原因
   */
  stopReason?: "endTurn" | "stopSequence" | "maxTokens" | string;
}

/**
 * 描述向 LLM API 发出或从 LLM API 接收的消息。
 */
export interface SamplingMessage {
  role: Role;
  content: TextContent | ImageContent;
}

/**
 * 用于包含注释的对象。客户端可以使用这些注释来指示对象的使用方式或显示方式。
 */
export interface Annotated {
  annotations?: {
    /**
     * 描述此对象或数据的预期客户是谁。
     * 
     * 它可以包含多个条目来指示对多个受众有用的内容（例如，`[“用户”，“助手”]`）。
     */
    audience?: Role[];

    /**
     * 描述这些数据对于操作服务器的重要性。
     * 
     * 值 1 表示“最重要”，表明数据实际上是必需的，
     * 而 0 表示“最不重要”，表明数据完全是可选的。
     *
     * @TJS-type number
     * @minimum 0
     * @maximum 1
     */
    priority?: number;
  }
}

/**
 * 提供给LLM的或者从LLM获取的文本信息
 */
export interface TextContent extends Annotated {
  type: "text";
  /**
   * 消息的文本内容。
   */
  text: string;
}

/**
 * 提供给 LLM 或由 LLM 提供的图像。
 */
export interface ImageContent extends Annotated {
  type: "image";
  /**
   * 采用 base64 编码的图像数据。
   *
   * @format byte
   */
  data: string;
  /**
   * 图片的 MIME 类型。不同的提供商可能支持不同的图片类型。
   */
  mimeType: string;
}

/**
 * 服务器对于模型选择的偏好，在采样期间向客户端请求。
 *
 * 由于 LLM 可以在多个维度上变化，因此选择“最佳”模型并非易事。
 * 不同的模型在不同领域表现出色 - 有些模型速度更快但性能较差，
 * 有些模型性能更强大但价格更昂贵，等等。
 * 此界面允许服务器在多个维度上表达其优先级，以帮助客户根据其用例做出适当的选择。
 *
 * 这些偏好始终是建议性的。客户可以忽略它们。此外，
 * 如何解释这些偏好，以及如何平衡它们和其他会考虑到的因素也由客户决定。
 */
export interface ModelPreferences {
  /**
   * 用于模型选择的可选指示(hint)。
   *
   * 如果指定了多个指示，客户端必须按顺序评估它们（以便采用第一个匹配）。
   *
   * 客户端应该优先考虑这些提示而不是数字优先级，
   * 但仍可以使用优先级从模糊匹配中进行选择。
   */
  hints?: ModelHint[];

  /**
   * 选择模型时对成本的优先考虑程度。
   * 值为 0 表示成本不重要，值为 1 表示成本是最重要的因素。
   *
   * @TJS-type number
   * @minimum 0
   * @maximum 1
   */
  costPriority?: number;

  /**
   * 选择模型时，采样速度（延迟）的优先程度。
   * 值为 0 表示速度不重要，值为 1 表示速度是最重要的因素。
   *
   * @TJS-type number
   * @minimum 0
   * @maximum 1
   */
  speedPriority?: number;

  /**
   * 在选择模型时，智能和能力(模型性能)的优先程度。
   * 值为 0 表示智能不重要，值为 1 表示智能是最重要的因素。
   * 
   * @TJS-type number
   * @minimum 0
   * @maximum 1
   */
  intelligencePriority?: number;
}

/**
 * 用于模型选择的提示。
 *
 * 未在此处声明的键目前未被规范指定，并且由客户端来解释。
 */
export interface ModelHint {
  /**
   * 模型名称的提示。
   *
   * 客户端应将其视为模型名称的子字符串；例如：
   *  - `claude-3-5-sonnet` 应与 `claude-3-5-sonnet-20241022` 匹配
   *  - `sonnet` 应与 `claude-3-5-sonnet-20241022`、`claude-3-sonnet-20240229` 等匹配。
   *  - `claude` 应与任何 Claude 模型匹配
   *
   * 客户端还可以将字符串映射到不同提供商的型号名称或不同的型号系列，
   * 只要它满足类似的要求即可；例如：
   *  - `gemini-1.5-flash` 可以匹配 `claude-3-haiku-20240307`
   */
  name?: string;
}

/* 自动补全 */
/**
 * 客户端向服务器发出的请求，询问完成选项。
 */
export interface CompleteRequest extends Request {
  method: "completion/complete";
  params: {
    ref: PromptReference | ResourceReference;
    /**
     * 参数信息
     */
    argument: {
      /**
       * 参数名
       */
      name: string;
      /**
       * 用于完成匹配的参数值。
       */
      value: string;
    };
  };
}

/**
 * 服务器对 completion/complete 请求的响应
 */
export interface CompleteResult extends Result {
  completion: {
    /**
     * 返回的补全信息列表，数组长度不得超过100
     */
    values: string[];
    /**
     * 可用的补全选项总数。这可能超过响应中实际发送的值的数量。
     */
    total?: number;
    /**
     * 表明除了当前响应中提供的选项之外，是否还有其他补全选项，
     * 即使真正的的总数未知。
     */
    hasMore?: boolean;
  };
}

/**
 * 对资源或资源模板定义的引用。
 */
export interface ResourceReference {
  type: "ref/resource";
  /**
   * 资源的 URI 或 URI 模板。
   *
   * @format uri-template
   */
  uri: string;
}

/**
 * prompt 的标识
 */
export interface PromptReference {
  type: "ref/prompt";
  /**
   * 提示或提示模板的名称
   */
  name: string;
}

/* Roots */
/**
 * 由服务器发送，用于向客户端请求根 URI 列表。根允许服务器请求要操作的特定目录或文件。
 * 根的一个常见示例是提供一组服务器应操作的存储库或目录。
 *
 * 当服务器需要了解文件系统结构或访问客户端有权读取的特定位置时，通常使用此请求。
 */
export interface ListRootsRequest extends Request {
  method: "roots/list";
}

/**
 * 客户端对服务器的 roots/list 请求的响应。此结果包含一个 Root 对象数组，
 * 每个对象代表服务器可以操作的一个根目录或文件。
 */
export interface ListRootsResult extends Result {
  roots: Root[];
}

/**
 * 表示服务器可以操作的根目录或文件。
 */
export interface Root {
  /**
   * 标识根的 URI。目前，它必须以 file:// 开头。在协议的未来版本中，
   * 可能会放宽此限制以允许其他 URI 方案。
   *
   * @format uri
   */
  uri: string;
  /**
   * 根的可选名称。这可用于为根提供人性化可读的标识符，
   * 这可能有助于显示或在应用程序的其他部分引用根。
   */
  name?: string;
}

/**
 * 客户端向服务器发送通知，告知其根列表已更改。每当客户端添加、删除或修改任何根时，
 * 都应发送此通知。然后，服务器应使用 ListRootsRequest 请求更新的根列表。
 */
export interface RootsListChangedNotification extends Notification {
  method: "notifications/roots/list_changed";
}

/* Client messages */
export type ClientRequest =
  | PingRequest
  | InitializeRequest
  | CompleteRequest
  | SetLevelRequest
  | GetPromptRequest
  | ListPromptsRequest
  | ListResourcesRequest
  | ListResourceTemplatesRequest
  | ReadResourceRequest
  | SubscribeRequest
  | UnsubscribeRequest
  | CallToolRequest
  | ListToolsRequest;

export type ClientNotification =
  | CancelledNotification
  | ProgressNotification
  | InitializedNotification
  | RootsListChangedNotification;

export type ClientResult = EmptyResult | CreateMessageResult | ListRootsResult;

/* Server messages */
export type ServerRequest =
  | PingRequest
  | CreateMessageRequest
  | ListRootsRequest;

export type ServerNotification =
  | CancelledNotification
  | ProgressNotification
  | LoggingMessageNotification
  | ResourceUpdatedNotification
  | ResourceListChangedNotification
  | ToolListChangedNotification
  | PromptListChangedNotification;

export type ServerResult =
  | EmptyResult
  | InitializeResult
  | CompleteResult
  | GetPromptResult
  | ListPromptsResult
  | ListResourcesResult
  | ListResourceTemplatesResult
  | ReadResourceResult
  | CallToolResult
  | ListToolsResult;