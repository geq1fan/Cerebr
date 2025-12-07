/**
 * NetworkReferenceBar Component
 * 在输入框上方显示网络请求的引用栏
 * Displays a reference bar above the input showing referenced network requests
 */

export class NetworkReferenceBar {
  constructor() {
    this.container = null;
    this.requests = [];
    this.isExpanded = false;
    this.onRemove = null; // 回调函数：当删除引用时调用
  }

  /**
   * 初始化组件
   * @param {HTMLElement} containerElement - 容器元素
   * @param {Function} onRemove - 删除引用时的回调函数
   */
  init(containerElement, onRemove) {
    this.container = containerElement;
    this.onRemove = onRemove;

    // 确保初始状态为隐藏
    if (this.container) {
      this.container.style.display = 'none';
    }

    console.log('[NetworkReferenceBar] Initialized with container:', this.container);
    console.log('[NetworkReferenceBar] Container ID:', this.container?.id);
  }

  /**
   * 设置引用的网络请求
   * @param {Array} requests - 网络请求数组
   */
  setRequests(requests) {
    this.requests = requests || [];
    this.render();
  }

  /**
   * 添加网络请求到引用列表
   * @param {Array} newRequests - 要添加的请求数组
   */
  addRequests(newRequests) {
    try {
      if (!Array.isArray(newRequests) || newRequests.length === 0) {
        console.log('[NetworkReferenceBar] No requests to add');
        return;
      }

      console.log('[NetworkReferenceBar] Adding', newRequests.length, 'requests');
      console.log('[NetworkReferenceBar] First request:', newRequests[0]);

      // 去重：根据request.id去重
      const existingIds = new Set(this.requests.map(r => r.id));
      const uniqueRequests = newRequests.filter(r => !existingIds.has(r.id));

      console.log('[NetworkReferenceBar] Unique requests:', uniqueRequests.length);

      this.requests = [...this.requests, ...uniqueRequests];

      console.log('[NetworkReferenceBar] Total requests now:', this.requests.length);
      console.log('[NetworkReferenceBar] Container element:', this.container);

      console.log('[NetworkReferenceBar] About to render...');
      this.render();

      // 隐藏快捷功能以避免冲突
      this.hideQuickChatOptions();

      console.log('[NetworkReferenceBar] Render completed');
    } catch (error) {
      console.error('[NetworkReferenceBar] Error in addRequests:', error);
      console.error('[NetworkReferenceBar] Error stack:', error.stack);
    }
  }

  /**
   * 获取当前引用的请求
   */
  getRequests() {
    return this.requests;
  }

  /**
   * 清空所有引用
   */
  clear() {
    this.requests = [];
    this.isExpanded = false;
    this.container.style.display = 'none';

    // 清空后，如果没有消息，可以重新显示快捷功能
    this.showQuickChatOptionsIfEmpty();
  }

  /**
   * 隐藏快捷功能卡片
   */
  hideQuickChatOptions() {
    const quickChatOptions = document.getElementById('quick-chat-options');
    if (quickChatOptions) {
      quickChatOptions.style.display = 'none';
    }
  }

  /**
   * 如果没有消息，显示快捷功能
   */
  showQuickChatOptionsIfEmpty() {
    // 这个逻辑会由 main.js 中的 toggleQuickChatOptions 统一管理
    // 这里只是触发检查
    window.postMessage({ type: 'CHECK_CHAT_STATUS' }, '*');
  }

  /**
   * 渲染组件
   */
  render() {
    try {
      console.log('[NetworkReferenceBar] Rendering with', this.requests.length, 'requests');

      if (this.requests.length === 0) {
        console.log('[NetworkReferenceBar] No requests, hiding container');
        this.container.style.display = 'none';
        return;
      }

      console.log('[NetworkReferenceBar] Showing container');
      this.container.style.display = 'block';

      const requestCount = this.requests.length;
      const expandIcon = this.isExpanded ? '▼' : '▶';

      console.log('[NetworkReferenceBar] Building HTML...');
      const html = `
        <div class="network-reference-bar">
          <div class="reference-header" data-action="toggle-expand">
            <span class="expand-icon">${expandIcon}</span>
            <span class="reference-info">📡 已引用 ${requestCount} 个网络请求</span>
            <button class="remove-all-btn" data-action="remove-all" title="清除所有引用">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          ${this.isExpanded ? this.renderRequestList() : ''}
        </div>
      `;

      console.log('[NetworkReferenceBar] Setting innerHTML...');
      this.container.innerHTML = html;

      console.log('[NetworkReferenceBar] Binding events...');
      this.bindEvents();

      console.log('[NetworkReferenceBar] Render complete!');
    } catch (error) {
      console.error('[NetworkReferenceBar] Error in render:', error);
      console.error('[NetworkReferenceBar] Error stack:', error.stack);
    }
  }

  /**
   * 渲染请求列表（展开状态）
   */
  renderRequestList() {
    return `
      <div class="reference-details">
        <div class="reference-list">
          ${this.requests.map((req, index) => this.renderRequestItem(req, index)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * 渲染单个请求项
   */
  renderRequestItem(request, index) {
    const statusClass = this.getStatusClass(request.status);
    const methodClass = `method-${request.method.toLowerCase()}`;

    return `
      <div class="reference-item" data-index="${index}">
        <div class="item-header">
          <span class="item-method ${methodClass}">${request.method}</span>
          <span class="item-status ${statusClass}">${request.status}</span>
          <span class="item-url" title="${request.url}">${this.truncateURL(request.url, 60)}</span>
          <button class="remove-item-btn" data-action="remove-item" data-index="${index}" title="移除此请求">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 展开/收起
    const header = this.container.querySelector('[data-action="toggle-expand"]');
    if (header) {
      header.addEventListener('click', () => this.toggleExpand());
    }

    // 清除所有引用
    const removeAllBtn = this.container.querySelector('[data-action="remove-all"]');
    if (removeAllBtn) {
      removeAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeAll();
      });
    }

    // 移除单个引用
    const removeItemBtns = this.container.querySelectorAll('[data-action="remove-item"]');
    removeItemBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        this.removeItem(index);
      });
    });
  }

  /**
   * 切换展开/收起状态
   */
  toggleExpand() {
    this.isExpanded = !this.isExpanded;
    this.render();
  }

  /**
   * 移除单个请求
   */
  removeItem(index) {
    if (index >= 0 && index < this.requests.length) {
      this.requests.splice(index, 1);

      if (this.requests.length === 0) {
        this.clear();
      } else {
        this.render();
      }

      // 通知外部删除事件
      if (this.onRemove) {
        this.onRemove(this.requests);
      }
    }
  }

  /**
   * 移除所有请求
   */
  removeAll() {
    this.clear();

    // 通知外部删除事件
    if (this.onRemove) {
      this.onRemove([]);
    }

    // 清除后重新检查快捷功能显示状态
    this.showQuickChatOptionsIfEmpty();
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
  truncateURL(url, maxLength = 60) {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
  }

  /**
   * 格式化请求数据为文本（用于发送给AI）
   */
  formatRequestsForAI() {
    if (this.requests.length === 0) return '';

    const parts = [
      '## 网络请求上下文',
      '',
      `共 ${this.requests.length} 个请求:`,
      ''
    ];

    this.requests.forEach((req, index) => {
      parts.push(`### 请求 ${index + 1}: ${req.method} ${req.url}`);
      parts.push(`**状态**: ${req.status} ${req.statusText || ''}`);
      parts.push(`**类型**: ${req.resourceType || 'unknown'}`);

      if (req.timing && req.timing.duration) {
        parts.push(`**耗时**: ${req.timing.duration.toFixed(2)} ms`);
      }

      parts.push('');

      // Request Headers (选择性包含关键headers)
      if (req.requestHeaders && req.requestHeaders.length > 0) {
        parts.push('**请求头**:');
        parts.push('```');
        const importantHeaders = ['content-type', 'authorization', 'accept'];
        req.requestHeaders
          .filter(h => importantHeaders.includes(h.name.toLowerCase()))
          .forEach(h => {
            parts.push(`${h.name}: ${h.value}`);
          });
        parts.push('```');
        parts.push('');
      }

      // Request Body
      if (req.requestBody) {
        parts.push('**请求体**:');
        parts.push('```json');
        parts.push(typeof req.requestBody === 'string' ? req.requestBody : JSON.stringify(req.requestBody, null, 2));
        parts.push('```');
        parts.push('');
      }

      // Response Headers (选择性包含)
      if (req.responseHeaders && req.responseHeaders.length > 0) {
        parts.push('**响应头**:');
        parts.push('```');
        const importantHeaders = ['content-type', 'content-length'];
        req.responseHeaders
          .filter(h => importantHeaders.includes(h.name.toLowerCase()))
          .forEach(h => {
            parts.push(`${h.name}: ${h.value}`);
          });
        parts.push('```');
        parts.push('');
      }

      // Response Body
      if (req.responseBody && req.responseBody.content) {
        parts.push('**响应体**:');
        if (req.responseBody.truncated) {
          parts.push(`*(已截断: 原始大小 ${this.formatBytes(req.responseBody.originalSize)})*`);
        }
        parts.push('```json');
        const content = req.responseBody.encoding === 'json'
          ? JSON.stringify(req.responseBody.content, null, 2)
          : String(req.responseBody.content);
        parts.push(content);
        parts.push('```');
      } else if (req.status >= 400) {
        parts.push('**响应体**: (无响应体或错误)');
      }

      parts.push('');
      parts.push('---');
      parts.push('');
    });

    return parts.join('\n');
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
