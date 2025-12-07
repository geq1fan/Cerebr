/**
 * NetworkMonitor Component
 * Displays network requests captured from DevTools in the Cerebr sidebar
 */

export class NetworkMonitor {
  constructor() {
    this.container = null;
    this.onSendToChat = null;
    this.requests = [];
    this.expandedRequestIds = new Set();
  }

  /**
   * Initialize the component
   * @param {HTMLElement} containerElement - The container to render into
   * @param {Function} onSendToChat - Callback when user wants to send data to chat
   */
  init(containerElement, onSendToChat) {
    this.container = containerElement;
    this.onSendToChat = onSendToChat;
    this.setupMessageListener();
    console.log('[NetworkMonitor] Initialized');
  }

  /**
   * Setup listener for messages from DevTools
   */
  setupMessageListener() {
    window.addEventListener('message', (event) => {
      // 只接受来自相同域的消息
      if (event.source !== window) return;

      const message = event.data;

      if (message.type === 'NETWORK_DATA_FROM_DEVTOOLS') {
        console.log('[NetworkMonitor] Received', message.requests?.length, 'requests');
        this.requests = message.requests || [];
        this.container.style.display = 'block';
        this.render();
      }
    });
  }

  /**
   * Render the component
   */
  render() {
    if (this.requests.length === 0) {
      this.container.innerHTML = `
        <div class="network-monitor-empty">
          <p>没有网络请求数据</p>
          <p class="hint">在 DevTools → Cerebr Network 面板中选择请求并发送</p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = `
      <div class="network-monitor">
        <div class="network-monitor-header">
          <h3>📡 网络请求 (${this.requests.length})</h3>
          <div class="network-monitor-actions">
            <button class="nm-btn nm-btn-primary" data-action="send-all">
              发送全部到对话
            </button>
            <button class="nm-btn nm-btn-secondary" data-action="clear">
              清除
            </button>
          </div>
        </div>
        <div class="network-monitor-list">
          ${this.requests.map(req => this.renderRequest(req)).join('')}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  /**
   * Render a single request item
   */
  renderRequest(request) {
    const isExpanded = this.expandedRequestIds.has(request.id);
    const statusClass = this.getStatusClass(request.status);

    return `
      <div class="nm-request-item" data-id="${request.id}">
        <div class="nm-request-summary" data-action="toggle-expand" data-id="${request.id}">
          <span class="nm-expand-icon">${isExpanded ? '▼' : '▶'}</span>
          <span class="nm-method nm-method-${request.method}">${request.method}</span>
          <span class="nm-status ${statusClass}">${request.status}</span>
          <span class="nm-url" title="${request.url}">${this.truncateURL(request.url)}</span>
          <button class="nm-btn-icon" data-action="send-single" data-id="${request.id}" title="发送此请求到对话">
            ✨
          </button>
        </div>
        ${isExpanded ? this.renderRequestDetails(request) : ''}
      </div>
    `;
  }

  /**
   * Render detailed view of a request
   */
  renderRequestDetails(request) {
    const requestBody = this.formatBody(request.requestBody);
    const responseBody = this.formatResponseBody(request.responseBody);

    return `
      <div class="nm-request-details">
        <!-- Request Headers -->
        <div class="nm-section">
          <h4>请求头</h4>
          <div class="nm-headers">
            ${request.requestHeaders.map(h => `
              <div class="nm-header-row">
                <span class="nm-header-name">${h.name}:</span>
                <span class="nm-header-value">${h.value}</span>
              </div>
            `).join('')}
          </div>
        </div>

        ${requestBody ? `
        <div class="nm-section">
          <h4>请求体</h4>
          <pre class="nm-code">${requestBody}</pre>
        </div>
        ` : ''}

        <!-- Response Headers -->
        <div class="nm-section">
          <h4>响应头</h4>
          <div class="nm-headers">
            ${request.responseHeaders.map(h => `
              <div class="nm-header-row">
                <span class="nm-header-name">${h.name}:</span>
                <span class="nm-header-value">${h.value}</span>
              </div>
            `).join('')}
          </div>
        </div>

        ${responseBody ? `
        <div class="nm-section">
          <h4>响应体 ${request.responseBody?.truncated ? `<span class="nm-truncated">(已截断: ${this.formatBytes(request.responseBody.originalSize)})</span>` : ''}</h4>
          <pre class="nm-code">${responseBody}</pre>
        </div>
        ` : '<div class="nm-section"><h4>响应体</h4><p class="nm-no-body">无响应体</p></div>'}

        <!-- Timing -->
        <div class="nm-section">
          <h4>时间</h4>
          <div class="nm-timing">
            <div>开始: ${new Date(request.timing.startTime).toLocaleString()}</div>
            <div>耗时: ${request.timing.duration.toFixed(2)} ms</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    this.container.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = el.dataset.action;
        const id = el.dataset.id;

        switch (action) {
          case 'toggle-expand':
            this.toggleExpand(id);
            break;
          case 'send-single':
            this.sendSingleRequest(id);
            break;
          case 'send-all':
            this.sendAllRequests();
            break;
          case 'clear':
            this.clear();
            break;
        }
      });
    });
  }

  /**
   * Toggle request details expansion
   */
  toggleExpand(requestId) {
    if (this.expandedRequestIds.has(requestId)) {
      this.expandedRequestIds.delete(requestId);
    } else {
      this.expandedRequestIds.add(requestId);
    }
    this.render();
  }

  /**
   * Send a single request to chat
   */
  sendSingleRequest(requestId) {
    const request = this.requests.find(r => r.id === requestId);
    if (request && this.onSendToChat) {
      const formatted = this.formatRequestForChat(request);
      this.onSendToChat(formatted);
    }
  }

  /**
   * Send all requests to chat
   */
  sendAllRequests() {
    if (this.requests.length > 0 && this.onSendToChat) {
      const formatted = this.requests.map(r => this.formatRequestForChat(r)).join('\n\n---\n\n');
      this.onSendToChat(formatted);
    }
  }

  /**
   * Clear all requests
   */
  clear() {
    this.requests = [];
    this.expandedRequestIds.clear();
    this.container.style.display = 'none';
  }

  /**
   * Format a request for chat input
   */
  formatRequestForChat(request) {
    const parts = [
      `## ${request.method} ${request.url}`,
      `**状态**: ${request.status} ${request.statusText}`,
      `**类型**: ${request.resourceType}`,
      `**时间**: ${request.timing.duration.toFixed(2)} ms`,
      ''
    ];

    // Request headers
    if (request.requestHeaders.length > 0) {
      parts.push('### 请求头');
      parts.push('```');
      request.requestHeaders.forEach(h => {
        parts.push(`${h.name}: ${h.value}`);
      });
      parts.push('```');
      parts.push('');
    }

    // Request body
    if (request.requestBody) {
      parts.push('### 请求体');
      parts.push('```json');
      parts.push(this.formatBody(request.requestBody));
      parts.push('```');
      parts.push('');
    }

    // Response headers
    if (request.responseHeaders.length > 0) {
      parts.push('### 响应头');
      parts.push('```');
      request.responseHeaders.forEach(h => {
        parts.push(`${h.name}: ${h.value}`);
      });
      parts.push('```');
      parts.push('');
    }

    // Response body
    if (request.responseBody) {
      parts.push('### 响应体');
      if (request.responseBody.truncated) {
        parts.push(`*(已截断: 原始大小 ${this.formatBytes(request.responseBody.originalSize)})*`);
      }
      parts.push('```json');
      parts.push(this.formatResponseBody(request.responseBody));
      parts.push('```');
    }

    return parts.join('\n');
  }

  /**
   * Format request body for display
   */
  formatBody(body) {
    if (!body) return '';
    if (typeof body === 'string') return body;
    if (typeof body === 'object') {
      try {
        return JSON.stringify(body, null, 2);
      } catch {
        return String(body);
      }
    }
    return String(body);
  }

  /**
   * Format response body for display
   */
  formatResponseBody(body) {
    if (!body || !body.content) return '';

    if (body.encoding === 'json') {
      try {
        return JSON.stringify(body.content, null, 2);
      } catch {
        return String(body.content);
      }
    } else if (body.encoding === 'base64') {
      return `[Binary data: ${body.content.length} characters]`;
    } else {
      return String(body.content);
    }
  }

  /**
   * Get CSS class for status code
   */
  getStatusClass(status) {
    if (status >= 200 && status < 300) return 'nm-status-2xx';
    if (status >= 300 && status < 400) return 'nm-status-3xx';
    if (status >= 400 && status < 500) return 'nm-status-4xx';
    if (status >= 500) return 'nm-status-5xx';
    return '';
  }

  /**
   * Truncate URL for display
   */
  truncateURL(url) {
    const MAX_LENGTH = 60;
    if (url.length <= MAX_LENGTH) return url;
    return url.substring(0, MAX_LENGTH - 3) + '...';
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
}
