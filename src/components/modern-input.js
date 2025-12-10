/**
 * 现代输入组件 - 基于 Claude.ai 设计
 * 使用 textarea + 独立图片预览区，简化数据管理
 */

import { adjustTextareaHeight } from '../utils/ui.js';

// 图片附件数组
let imageAttachments = [];

/**
 * 初始化现代输入组件
 * @param {Object} config - 配置对象
 * @param {HTMLElement} config.messageInput - textarea 元素
 * @param {Function} config.sendMessage - 发送消息的回调函数
 * @param {Array} config.userQuestions - 用户问题历史数组
 * @param {Object} config.uiConfig - UI配置对象
 */
export function initModernInput(config) {
    const {
        messageInput,
        sendMessage,
        userQuestions,
        uiConfig
    } = config;

    const sendButton = document.getElementById('send-button');
    const imagePreviews = document.getElementById('image-previews');
    const attachmentButton = document.getElementById('attachment-button');
    const attachmentBadge = document.querySelector('.attachment-badge');
    const historyButton = document.getElementById('history-button');

    // 监听输入变化
    messageInput.addEventListener('input', function() {
        adjustTextareaHeight({
            textarea: this,
            config: uiConfig.textarea
        });
        updateSendButtonState();
    });

    // 快捷键处理
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const text = this.value.trim();
            if (text || imageAttachments.length > 0) {
                sendMessage();
            }
        } else if (e.key === 'Escape') {
            messageInput.blur();
        } else if (e.key === 'ArrowUp' && messageInput.value.trim() === '') {
            e.preventDefault();
            if (userQuestions.length > 0) {
                messageInput.value = userQuestions[userQuestions.length - 1];
                // 移动光标到末尾
                messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
                // 触发 input 事件以调整高度
                messageInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    });

    // 粘贴事件处理
    messageInput.addEventListener('paste', async (e) => {
        const items = Array.from(e.clipboardData.items);
        const imageItem = items.find(item => item.type.startsWith('image/'));

        if (imageItem) {
            e.preventDefault();
            const file = imageItem.getAsFile();
            const reader = new FileReader();

            reader.onload = () => {
                addImage(reader.result, file.name);
            };

            reader.readAsDataURL(file);
        }
        // 文本粘贴由浏览器原生处理
    });

    // 拖放事件处理
    messageInput.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    messageInput.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        imageFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = () => {
                addImage(reader.result, file.name);
            };
            reader.readAsDataURL(file);
        });
    });

    // 附件按钮点击事件（暂时用于触发文件选择）
    attachmentButton.addEventListener('click', () => {
        // 创建隐藏的 file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.multiple = true;

        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = () => {
                    addImage(reader.result, file.name);
                };
                reader.readAsDataURL(file);
            });
        });

        fileInput.click();
    });

    // 历史按钮点击事件（触发上箭头的功能）
    historyButton.addEventListener('click', () => {
        if (userQuestions.length > 0 && !messageInput.value.trim()) {
            messageInput.value = userQuestions[userQuestions.length - 1];
            messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
            messageInput.dispatchEvent(new Event('input', { bubbles: true }));
            messageInput.focus();
        }
    });

    // 为静态快捷卡片添加事件监听
    const quickActionCards = document.querySelectorAll('.quick-action-card');
    quickActionCards.forEach(card => {
        card.addEventListener('click', () => {
            const prompt = card.getAttribute('data-prompt');
            if (prompt) {
                messageInput.value = prompt;
                messageInput.dispatchEvent(new Event('input', { bubbles: true }));
                messageInput.focus();
                messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
                sendMessage();
            }
        });
    });

    /**
     * 添加图片到附件列表
     * @param {string} base64Data - 图片的 base64 数据
     * @param {string} fileName - 文件名
     */
    function addImage(base64Data, fileName) {
        const id = Date.now() + Math.random(); // 确保唯一性
        imageAttachments.push({ id, base64Data, fileName });
        renderImagePreviews();
        updateAttachmentBadge();
        updateSendButtonState();
    }

    /**
     * 删除图片
     * @param {number} id - 图片ID
     */
    window.removeImage = function(id) {
        imageAttachments = imageAttachments.filter(img => img.id !== id);
        renderImagePreviews();
        updateAttachmentBadge();
        updateSendButtonState();
    };

    /**
     * 渲染图片预览
     */
    function renderImagePreviews() {
        if (imageAttachments.length === 0) {
            imagePreviews.style.display = 'none';
            imagePreviews.innerHTML = '';
            return;
        }

        imagePreviews.style.display = 'flex';
        imagePreviews.innerHTML = imageAttachments.map(img => `
            <div class="image-preview-item">
                <img src="${img.base64Data}" alt="${img.fileName}" />
                <button class="remove-image" onclick="removeImage(${img.id})" title="删除图片">×</button>
            </div>
        `).join('');
    }

    /**
     * 更新附件徽章计数
     */
    function updateAttachmentBadge() {
        const count = imageAttachments.length;
        if (count > 0) {
            attachmentBadge.textContent = count;
            attachmentBadge.style.display = 'flex';
        } else {
            attachmentBadge.style.display = 'none';
        }
    }

    /**
     * 更新发送按钮状态
     */
    function updateSendButtonState() {
        const hasContent = messageInput.value.trim().length > 0 || imageAttachments.length > 0;
        sendButton.disabled = !hasContent;
    }
}

/**
 * 获取格式化后的消息内容（兼容旧接口）
 * @param {HTMLElement} messageInput - textarea 元素
 * @returns {Object} 格式化后的内容和图片标签
 */
export function getFormattedMessageContent(messageInput) {
    const message = messageInput.value.trim();

    // 模拟旧的 imageTags 接口，兼容 buildMessageContent
    const imageTags = imageAttachments.map(img => ({
        getAttribute: (attr) => {
            if (attr === 'data-image') return img.base64Data;
            return null;
        }
    }));

    return { message, imageTags };
}

/**
 * 构建消息内容对象（文本+图片）
 * @param {string} message - 消息文本
 * @param {Array} imageTags - 图片标签数组（兼容格式）
 * @returns {string|Array} 格式化后的消息内容
 */
export function buildMessageContent(message, imageTags) {
    if (imageTags.length > 0) {
        const content = [];
        if (message.trim()) {
            content.push({
                type: "text",
                text: message
            });
        }
        imageTags.forEach(tag => {
            const base64Data = tag.getAttribute('data-image');
            if (base64Data) {
                content.push({
                    type: "image_url",
                    image_url: {
                        url: base64Data
                    }
                });
            }
        });
        return content;
    } else {
        return message;
    }
}

/**
 * 清空输入框和图片附件
 * @param {HTMLElement} messageInput - textarea 元素
 * @param {Object} config - UI配置
 */
export function clearMessageInput(messageInput, config) {
    messageInput.value = '';
    imageAttachments = [];

    const imagePreviews = document.getElementById('image-previews');
    if (imagePreviews) {
        imagePreviews.style.display = 'none';
        imagePreviews.innerHTML = '';
    }

    const attachmentBadge = document.querySelector('.attachment-badge');
    if (attachmentBadge) {
        attachmentBadge.style.display = 'none';
    }

    adjustTextareaHeight({
        textarea: messageInput,
        config: config.textarea
    });

    const sendButton = document.getElementById('send-button');
    if (sendButton) {
        sendButton.disabled = true;
    }
}

/**
 * 更新输入框的永久 placeholder
 * @param {HTMLElement} messageInput - textarea 元素
 * @param {string} modelName - 当前模型的名称
 */
export function updatePermanentPlaceholder(messageInput, modelName) {
    if (messageInput) {
        messageInput.placeholder = `向 ${modelName} 发送消息...`;
    }
}

/**
 * 设置消息输入框的临时 placeholder
 * @param {Object} params - 参数对象
 * @param {HTMLElement} params.messageInput - 消息输入框元素
 * @param {string} params.placeholder - placeholder 文本
 * @param {number} [params.timeout] - 超时时间（可选）
 */
export function setPlaceholder({ messageInput, placeholder, timeout }) {
    if (messageInput) {
        const originalPlaceholder = messageInput.placeholder;
        messageInput.placeholder = placeholder;
        if (timeout) {
            setTimeout(() => {
                messageInput.placeholder = originalPlaceholder;
            }, timeout);
        }
    }
}

/**
 * 处理窗口消息（用于扩展通信）
 * @param {MessageEvent} event - 消息事件对象
 * @param {Object} config - 配置对象
 */
export function handleWindowMessage(event, config) {
    const { messageInput, newChatButton } = config;

    if (event.data.type === 'DROP_IMAGE') {
        const imageData = event.data.imageData;
        if (imageData && imageData.data) {
            const base64Data = imageData.data.startsWith('data:') ? imageData.data : `data:image/png;base64,${imageData.data}`;
            const id = Date.now() + Math.random();
            imageAttachments.push({ id, base64Data, fileName: imageData.name });

            const imagePreviews = document.getElementById('image-previews');
            if (imagePreviews) {
                renderImagePreviews();
            }

            const attachmentBadge = document.querySelector('.attachment-badge');
            if (attachmentBadge) {
                updateAttachmentBadge();
            }

            messageInput.focus();
        }
    } else if (event.data.type === 'FOCUS_INPUT') {
        messageInput.focus();
        messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
    } else if (event.data.type === 'UPDATE_PLACEHOLDER') {
        setPlaceholder({
            messageInput,
            placeholder: event.data.placeholder,
            timeout: event.data.timeout
        });
    } else if (event.data.type === 'NEW_CHAT') {
        newChatButton.click();
        messageInput.focus();
    }

    // 内部函数定义（避免重复）
    function renderImagePreviews() {
        const imagePreviews = document.getElementById('image-previews');
        if (imageAttachments.length === 0) {
            imagePreviews.style.display = 'none';
            imagePreviews.innerHTML = '';
            return;
        }

        imagePreviews.style.display = 'flex';
        imagePreviews.innerHTML = imageAttachments.map(img => `
            <div class="image-preview-item">
                <img src="${img.base64Data}" alt="${img.fileName}" />
                <button class="remove-image" onclick="removeImage(${img.id})" title="删除图片">×</button>
            </div>
        `).join('');
    }

    function updateAttachmentBadge() {
        const attachmentBadge = document.querySelector('.attachment-badge');
        const count = imageAttachments.length;
        if (count > 0) {
            attachmentBadge.textContent = count;
            attachmentBadge.style.display = 'flex';
        } else {
            attachmentBadge.style.display = 'none';
        }
    }
}
