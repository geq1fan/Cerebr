/**
 * DevTools Panel Logic - Network Request Capture
 * Cerebr Network Monitor Implementation
 */

// ===== State Management =====
const state = {
  requests: [],
  selectedRequests: new Set(),
  selectedRequestId: null,  // 当前查看详情的请求ID
  autoCapture: true,
  filterXHROnly: false,
  filterStatus: 'all',
  filterURL: '',
  isMonitoring: false,
  requestCounter: 0
};

// ===== DOM Elements =====
const elements = {
  requestsList: document.getElementById('requests-list'),
  detailPanel: document.getElementById('request-detail-panel'),
  requestCount: document.getElementById('request-count'),
  selectedCount: document.getElementById('selected-count'),
  clearBtn: document.getElementById('clear-btn'),
  refreshBtn: document.getElementById('refresh-btn'),
  selectAllToggle: document.getElementById('select-all-toggle'),
  autoCaptureToggle: document.getElementById('auto-capture-toggle'),
  xhrOnlyToggle: document.getElementById('xhr-only-toggle'),
  statusFilter: document.getElementById('status-filter'),
  urlFilter: document.getElementById('url-filter'),
  sendToAIBtn: document.getElementById('send-to-ai-btn'),
  copySelectedBtn: document.getElementById('copy-selected-btn'),
  exportHARBtn: document.getElementById('export-har-btn')
};

// ===== Network Monitoring =====
function startMonitoring() {
  if (state.isMonitoring) return;

  console.log('[Cerebr DevTools Panel] Starting network monitoring...');
  state.isMonitoring = true;

  chrome.devtools.network.onRequestFinished.addListener(handleRequestFinished);
}

async function handleRequestFinished(request) {
  if (!state.autoCapture) return;

  try {
    // Get response body with timeout
    const body = await getResponseBody(request);

    // Extract resource type
    const resourceType = request._resourceType || 'other';
    const isXHR = resourceType === 'xhr' || resourceType === 'fetch';

    // Build request object
    const requestData = {
      id: `req_${Date.now()}_${state.requestCounter++}`,
      timestamp: Date.now(),
      method: request.request.method,
      url: request.request.url,
      resourceType: resourceType,
      requestHeaders: request.request.headers || [],
      requestBody: request.request.postData,
      status: request.response.status,
      statusText: request.response.statusText,
      responseHeaders: request.response.headers || [],
      responseBody: body,
      timing: {
        startTime: new Date(request.startedDateTime).getTime(),
        endTime: new Date(request.startedDateTime).getTime() + request.time,
        duration: request.time
      },
      hasResponseBody: body !== null,
      isXHR: isXHR
    };

    // Apply filters before adding
    if (state.filterXHROnly && !requestData.isXHR) return;

    // Add to list
    state.requests.push(requestData);
    updateUI();

  } catch (error) {
    console.error('[Cerebr DevTools Panel] Failed to process request:', error);
  }
}

async function getResponseBody(request) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn('[Cerebr DevTools Panel] Response body timeout');
      resolve(null);
    }, 5000);

    try {
      request.getContent((content, encoding) => {
        clearTimeout(timeout);

        if (!content) {
          resolve(null);
          return;
        }

        // Handle encoding and truncation
        const MAX_SIZE = 500000; // 500KB
        let finalContent = content;
        let truncated = false;
        let originalSize = content.length;

        if (content.length > MAX_SIZE) {
          finalContent = content.substring(0, MAX_SIZE);
          truncated = true;
        }

        // Handle encoding
        if (encoding === 'base64') {
          resolve({
            content: finalContent,
            encoding: 'base64',
            truncated,
            originalSize: truncated ? originalSize : undefined
          });
        } else {
          try {
            const parsed = JSON.parse(finalContent);
            resolve({
              content: parsed,
              encoding: 'json',
              truncated,
              originalSize: truncated ? originalSize : undefined
            });
          } catch {
            resolve({
              content: finalContent,
              encoding: 'text',
              truncated,
              originalSize: truncated ? originalSize : undefined
            });
          }
        }
      });
    } catch (error) {
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

// ===== Filtering =====
function applyFilters(requests) {
  return requests.filter(req => {
    // XHR/Fetch filter
    if (state.filterXHROnly && !req.isXHR) return false;

    // Status filter
    if (state.filterStatus === 'success' && (req.status < 200 || req.status >= 300)) return false;
    if (state.filterStatus === 'errors' && req.status < 400) return false;

    // URL filter (regex)
    if (state.filterURL) {
      try {
        const regex = new RegExp(state.filterURL, 'i');
        if (!regex.test(req.url)) return false;
      } catch (e) {
        // Invalid regex, skip filter
      }
    }

    return true;
  });
}

// ===== UI Updates =====
function updateUI() {
  const filteredRequests = applyFilters(state.requests);
  elements.requestCount.textContent = filteredRequests.length;
  elements.selectedCount.textContent = state.selectedRequests.size;

  // 更新全选复选框状态
  const allSelected = filteredRequests.length > 0 &&
    filteredRequests.every(req => state.selectedRequests.has(req.id));
  elements.selectAllToggle.checked = allSelected;

  renderRequestList(filteredRequests);
  renderDetailPanel();
}

function renderRequestList(requests = null) {
  const displayRequests = requests || applyFilters(state.requests);

  if (displayRequests.length === 0) {
    elements.requestsList.innerHTML = `
      <div class="empty-state">
        ${state.requests.length === 0 ? '等待网络请求...' : '没有符合筛选条件的请求'}
      </div>
    `;
    return;
  }

  elements.requestsList.innerHTML = displayRequests.map(req => {
    const selected = state.selectedRequests.has(req.id);
    const statusClass = `status-${Math.floor(req.status / 100)}xx`;
    const isDetailSelected = state.selectedRequestId === req.id;

    return `
      <div class="request-item ${isDetailSelected ? 'selected' : ''}" data-id="${req.id}">
        <input type="checkbox" class="request-checkbox" ${selected ? 'checked' : ''} data-id="${req.id}">
        <span class="method method-${req.method}">${req.method}</span>
        <span class="status ${statusClass}">${req.status}</span>
        <span class="url" title="${req.url}">${truncateURL(req.url)}</span>
      </div>
    `;
  }).join('');

  // Bind checkbox events
  elements.requestsList.querySelectorAll('.request-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      if (e.target.checked) {
        state.selectedRequests.add(id);
      } else {
        state.selectedRequests.delete(id);
      }
      updateUI();
    });
  });

  // 点击请求项查看详情
  elements.requestsList.querySelectorAll('.request-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // 点击复选框不触发详情查看
      if (e.target.classList.contains('request-checkbox')) return;

      const id = item.dataset.id;
      state.selectedRequestId = id;
      updateUI();
    });
  });
}

function truncateURL(url, maxLength = 80) {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength - 3) + '...';
}

// ===== Detail Panel Rendering =====
function renderDetailPanel() {
  if (!state.selectedRequestId) {
    elements.detailPanel.innerHTML = `
      <div class="detail-empty">
        <p>点击请求查看详情</p>
      </div>
    `;
    return;
  }

  const request = state.requests.find(r => r.id === state.selectedRequestId);
  if (!request) {
    elements.detailPanel.innerHTML = `
      <div class="detail-empty">
        <p>请求未找到</p>
      </div>
    `;
    return;
  }

  elements.detailPanel.innerHTML = renderRequestDetails(request);
}

function renderRequestDetails(request) {
  const requestBody = formatBody(request.requestBody);
  const responseBody = formatResponseBody(request.responseBody);
  const statusClass = `status-${Math.floor(request.status / 100)}xx`;

  return `
    <div class="request-details">
      <div class="detail-header">
        <div class="detail-title">${request.method} ${truncateURL(request.url, 100)}</div>
        <div class="detail-meta">
          <span class="status ${statusClass}">${request.status} ${request.statusText}</span>
          <span>${request.resourceType}</span>
          <span>${request.timing.duration.toFixed(2)} ms</span>
        </div>
      </div>

      <!-- 请求头 -->
      <div class="detail-section">
        <h4>请求头</h4>
        <div class="detail-headers">
          ${request.requestHeaders.map(h => `
            <div class="detail-header-row">
              <span class="detail-header-name">${h.name}:</span>
              <span class="detail-header-value">${h.value}</span>
            </div>
          `).join('')}
        </div>
      </div>

      ${requestBody ? `
      <div class="detail-section">
        <h4>请求体</h4>
        <pre class="detail-code">${requestBody}</pre>
      </div>
      ` : ''}

      <!-- 响应头 -->
      <div class="detail-section">
        <h4>响应头</h4>
        <div class="detail-headers">
          ${request.responseHeaders.map(h => `
            <div class="detail-header-row">
              <span class="detail-header-name">${h.name}:</span>
              <span class="detail-header-value">${h.value}</span>
            </div>
          `).join('')}
        </div>
      </div>

      ${responseBody ? `
      <div class="detail-section">
        <h4>响应体 ${request.responseBody?.truncated ? `<span class="detail-truncated">(已截断: ${formatBytes(request.responseBody.originalSize)})</span>` : ''}</h4>
        <pre class="detail-code">${responseBody}</pre>
      </div>
      ` : '<div class="detail-section"><h4>响应体</h4><p class="detail-no-body">无响应体</p></div>'}

      <!-- 时间信息 -->
      <div class="detail-section">
        <h4>时间</h4>
        <div class="detail-timing">
          <div>开始: ${new Date(request.timing.startTime).toLocaleString()}</div>
          <div>结束: ${new Date(request.timing.endTime).toLocaleString()}</div>
          <div>耗时: ${request.timing.duration.toFixed(2)} ms</div>
        </div>
      </div>
    </div>
  `;
}

// 辅助方法
function formatBody(body) {
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

function formatResponseBody(body) {
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

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// ===== Actions =====
async function sendToAI() {
  const selected = state.requests.filter(req => state.selectedRequests.has(req.id));

  if (selected.length === 0) {
    showToast('请先选择要分析的请求');
    return;
  }

  try {
    const inspectedTabId = chrome.devtools.inspectedWindow.tabId;

    console.log('[Cerebr DevTools Panel] Sending', selected.length, 'requests to tab', inspectedTabId);

    const response = await chrome.runtime.sendMessage({
      type: 'SEND_NETWORK_TO_AI',
      tabId: inspectedTabId,
      requests: selected,
      timestamp: Date.now()
    });

    if (response?.success) {
      showToast('✅ 已发送到 Cerebr AI');
      if (response.autoOpened) {
        showToast('✅ 已自动打开侧边栏并发送请求');
      }
    } else {
      showToast('❌ 发送失败: ' + (response?.message || '未知错误'));
    }
  } catch (error) {
    console.error('[Cerebr DevTools Panel] Send failed:', error);
    showToast('❌ 发送失败: ' + error.message);
  }
}

async function copySelected() {
  const selected = state.requests.filter(req => state.selectedRequests.has(req.id));

  if (selected.length === 0) {
    showToast('请先选择要复制的请求');
    return;
  }

  const json = JSON.stringify(selected, null, 2);

  // 方法1：尝试现代 Clipboard API
  try {
    await navigator.clipboard.writeText(json);
    showToast('✅ 已复制到剪贴板');
    return;
  } catch (error) {
    console.warn('[Cerebr DevTools Panel] Clipboard API failed, trying fallback:', error);
  }

  // 方法2：Fallback 到 execCommand
  try {
    const textarea = document.createElement('textarea');
    textarea.value = json;
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();

    const success = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (success) {
      showToast('✅ 已复制到剪贴板');
    } else {
      throw new Error('execCommand returned false');
    }
  } catch (error) {
    console.error('[Cerebr DevTools Panel] All copy methods failed:', error);
    showToast('❌ 复制失败，请手动选择文本复制');
  }
}

async function exportHAR() {
  try {
    chrome.devtools.network.getHAR((harLog) => {
      const harData = JSON.stringify(harLog, null, 2);
      const blob = new Blob([harData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `cerebr-network-${Date.now()}.har`;
      a.click();

      URL.revokeObjectURL(url);
      showToast('✅ HAR 文件已导出');
    });
  } catch (error) {
    console.error('[Cerebr DevTools Panel] Export failed:', error);
    showToast('❌ 导出失败');
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ===== Event Listeners =====
elements.clearBtn.addEventListener('click', () => {
  state.requests = [];
  state.selectedRequests.clear();
  state.selectedRequestId = null;
  state.requestCounter = 0;
  updateUI();
  showToast('✅ 已清空请求列表');
});

elements.refreshBtn.addEventListener('click', () => {
  chrome.devtools.inspectedWindow.reload();
  state.requests = [];
  state.selectedRequests.clear();
  state.selectedRequestId = null;
  state.requestCounter = 0;
  updateUI();
});

elements.selectAllToggle.addEventListener('change', (e) => {
  const filteredRequests = applyFilters(state.requests);
  if (e.target.checked) {
    // 全选当前筛选后的所有请求
    filteredRequests.forEach(req => state.selectedRequests.add(req.id));
    showToast(`✅ 已选中 ${filteredRequests.length} 个请求`);
  } else {
    // 取消全选
    state.selectedRequests.clear();
    showToast('⬜ 已取消全选');
  }
  updateUI();
});

elements.autoCaptureToggle.addEventListener('change', (e) => {
  state.autoCapture = e.target.checked;
  showToast(state.autoCapture ? '✅ 已启用自动捕获' : '⏸️ 已暂停自动捕获');
});

elements.xhrOnlyToggle.addEventListener('change', (e) => {
  state.filterXHROnly = e.target.checked;
  updateUI();
});

elements.statusFilter.addEventListener('change', (e) => {
  state.filterStatus = e.target.value;
  updateUI();
});

elements.urlFilter.addEventListener('input', (e) => {
  state.filterURL = e.target.value;
  updateUI();
});

elements.sendToAIBtn.addEventListener('click', sendToAI);
elements.copySelectedBtn.addEventListener('click', copySelected);
elements.exportHARBtn.addEventListener('click', exportHAR);

// ===== Initialize =====
window.startMonitoring = startMonitoring;
console.log('[Cerebr DevTools Panel] Ready');
