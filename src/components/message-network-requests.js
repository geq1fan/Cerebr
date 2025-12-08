/**
 * MessageNetworkRequests Component
 * 在消息中显示网络请求（可折叠）
 * Displays network requests within messages with collapsible details
 */

export class MessageNetworkRequests {
  constructor(requests) {
    this.requests = requests || [];
    this.expandedRequestIds = new Set();
  }

  /**
   * 渲染为 HTML 字符串
   */
  render() {
    if (this.requests.length === 0) {
      return '';
    }

    return `
      <div class="message-network-requests">
        <div class="mnr-header">
          <span class="mnr-title">📡 网络请求上下文</span>
          <span class="mnr-count">共 ${this.requests.length} 个请求</span>
        </div>
        <div class="mnr-list">
          ${this.requests.map((req, index) => this.renderRequest(req, index)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * 渲染单个请求
   */
  renderRequest(request, index) {
    const isExpanded = this.expandedRequestIds.has(request.id);
    const statusClass = this.getStatusClass(request.status);
    const methodClass = `method-${request.method.toLowerCase()}`;

    return `
      <div class="mnr-request" data-request-id="${request.id}" data-index="${index}">
        <div class="mnr-request-header" data-action="toggle-mnr-detail" data-id="${request.id}">
          <span class="mnr-expand-icon">${isExpanded ? '▼' : '▶'}</span>
          <span class="mnr-method ${methodClass}">${request.method}</span>
          <span class="mnr-status ${statusClass}">${request.status}</span>
          <span class="mnr-url" title="${request.url}">${this.truncateURL(request.url, 80)}</span>
        </div>
        ${isExpanded ? this.renderRequestDetails(request) : ''}
      </div>
    `;
  }

  /**
   * 渲染请求详情
   */
  renderRequestDetails(request) {
    const requestBody = this.formatBody(request.requestBody);
    const responseBody = this.formatResponseBody(request.responseBody);

    return `
      <div class="mnr-details">
        <!-- 请求头 -->
        <div class="mnr-section">
          <h4>请求头</h4>
          <div class="mnr-headers">
            ${request.requestHeaders.map(h => `
              <div class="mnr-header-row">
                <span class="mnr-header-name">${h.name}:</span>
                <span class="mnr-header-value">${h.value}</span>
              </div>
            `).join('')}
          </div>
        </div>

        ${requestBody ? `
        <div class="mnr-section">
          <h4>请求体</h4>
          <pre class="mnr-code">${requestBody}</pre>
        </div>
        ` : ''}

        <!-- 响应头 -->
        <div class="mnr-section">
          <h4>响应头</h4>
          <div class="mnr-headers">
            ${request.responseHeaders.map(h => `
              <div class="mnr-header-row">
                <span class="mnr-header-name">${h.name}:</span>
                <span class="mnr-header-value">${h.value}</span>
              </div>
            `).join('')}
          </div>
        </div>

        ${responseBody ? `
        <div class="mnr-section">
          <h4>响应体 ${request.responseBody?.truncated ? `<span class="mnr-truncated">(已截断: ${this.formatBytes(request.responseBody.originalSize)})</span>` : ''}</h4>
          <pre class="mnr-code">${responseBody}</pre>
        </div>
        ` : '<div class="mnr-section"><h4>响应体</h4><p class="mnr-no-body">无响应体</p></div>'}

        <!-- 时间信息 -->
        <div class="mnr-section">
          <h4>时间</h4>
          <div class="mnr-timing">
            <div>开始: ${new Date(request.timing.startTime).toLocaleString()}</div>
            <div>耗时: ${request.timing.duration.toFixed(2)} ms</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 绑定事件（在 DOM 插入后调用）
   */
  bindEvents(container) {
    const detailToggles = container.querySelectorAll('[data-action="toggle-mnr-detail"]');
    detailToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        const id = toggle.dataset.id;
        this.toggleDetail(id, container);
      });
    });
  }

  /**
   * 切换详情展开/收起
   */
  toggleDetail(requestId, container) {
    if (this.expandedRequestIds.has(requestId)) {
      this.expandedRequestIds.delete(requestId);
    } else {
      this.expandedRequestIds.add(requestId);
    }

    // 重新渲染该请求
    const requestElement = container.querySelector(`[data-request-id="${requestId}"]`);
    if (requestElement) {
      const index = parseInt(requestElement.dataset.index);
      const request = this.requests[index];
      requestElement.outerHTML = this.renderRequest(request, index);

      // 重新绑定事件
      this.bindEvents(container);
    }
  }

  /**
   * 获取状态码对应的CSS类
   */
  getStatusClass(status) {
    if (status >= 200 && status < 300) return 'status-success';
    if (status >= 300 && status < 400) return 'status-redirect';
    if (status >= 400 && status < 500) return 'status-client-error';
    if (status >= 500) return 'status-server-error';
    return '';
  }

  /**
   * 截断URL显示
   */
  truncateURL(url, maxLength = 80) {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
  }

  /**
   * 格式化请求体
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
   * 格式化响应体
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
   * 格式化字节大小
   */
  formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
}
