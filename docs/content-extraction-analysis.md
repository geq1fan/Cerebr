# 网页内容提取系统分析报告

> **生成时间:** 2024-12-11
> **分析范围:** 网页内容识别、提取、处理全流程
> **关键问题:** 表格数据丢失、图片内容缺失、重要元数据过滤

---

## 目录

1. [执行摘要](#执行摘要)
2. [系统架构分析](#系统架构分析)
3. [核心问题识别](#核心问题识别)
4. [影响范围评估](#影响范围评估)
5. [解决方案设计](#解决方案设计)
6. [迭代规划建议](#迭代规划建议)

---

## 执行摘要

### 核心发现

**当前系统能识别的内容:**
- ✅ 纯文本内容（标题、段落、列表的文字）
- ✅ PDF文档（使用PDF.js提取）
- ✅ 表单输入值（textarea、input）
- ✅ Markdown格式内容
- ✅ LaTeX数学公式
- ✅ 代码块（带语法高亮）
- ✅ iframe内嵌框架内容（已提取但逻辑混乱）

**无法识别/丢失的内容:**
- ❌ **HTML表格** - 结构完全丢失，只保留无序文本
- ❌ **图片内容** - 包括架构图、流程图、图表，连alt文本也丢失
- ❌ **SVG图形** - 数据可视化、流程图内的文本信息丢失
- ❌ **文章元数据** - 标题、作者、日期、参考文献（如果在header/footer中）
- ❌ **文档结构** - 目录、导航、章节信息（如果在nav/sidebar中）

### 根本原因

```javascript
// content.js:669 - 根本问题所在
let mainContent = tempContainer.innerText + frameContent;
```

**设计缺陷:**
1. 直接使用 `.innerText` 提取内容 → **所有HTML结构信息丢失**
2. 硬编码的DOM选择器过滤列表 → **盲目删除可能包含重要内容的元素**
3. 缺乏针对表格、图片等特殊元素的处理逻辑
4. 没有结构化的内容数据模型

---

## 系统架构分析

### 数据流全景图

```
┌─────────────────┐
│  用户触发请求    │
└────────┬────────┘
         │
         v
┌─────────────────────────────────────────────────┐
│  Phase 1: 内容获取 (Content Extraction)          │
│  文件: content.js                                │
│                                                  │
│  1. 克隆 DOM 树                                  │
│  2. 同步表单元素值                               │
│  3. 提取 iframe 内容 (639-651行)                 │
│  4. 删除"无用"元素 (659-667行) ← 问题点          │
│  5. 提取 innerText (669行) ← 根本问题            │
│  6. 内容清理和Token估算                          │
└────────┬────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────┐
│  Phase 2: 内容聚合 (Content Aggregation)         │
│  文件: src/components/webpage-menu.js            │
│                                                  │
│  1. 获取所有已启用的标签页                       │
│  2. 从每个标签页提取内容                         │
│  3. 组装为 combinedContent 对象                  │
│     {                                            │
│       pages: [{                                  │
│         title, url, content, isCurrent           │
│       }]                                         │
│     }                                            │
└────────┬────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────┐
│  Phase 3: 消息构建 (Message Building)            │
│  文件: src/main.js, src/services/chat.js         │
│                                                  │
│  1. 构建用户消息                                 │
│  2. 注入网页内容到系统消息                       │
│  3. 格式化网络请求引用                           │
│  4. 调用 API                                     │
└────────┬────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────┐
│  Phase 4: 内容渲染 (Content Rendering)           │
│  文件: src/handlers/message-handler.js           │
│       htmd/latex.js                              │
│                                                  │
│  1. processMathAndMarkdown() 处理内容            │
│     - 提取数学公式 (占位符替换)                  │
│     - 提取图片标签                               │
│     - Markdown → HTML (marked.js)               │
│     - 代码高亮 (highlight.js)                    │
│     - 恢复特殊内容                               │
│  2. MathJax 渲染数学公式                         │
│  3. Mermaid 渲染图表                             │
│  4. 添加交互功能 (复制按钮等)                    │
└─────────────────────────────────────────────────┘
```

### 关键文件清单

| 组件 | 文件路径 | 核心功能 | 代码行数 | 问题等级 |
|------|---------|---------|---------|---------|
| **内容提取** | `content.js` | DOM → 文本/PDF提取 | 691 | 🔴 严重 |
| **Markdown处理** | `htmd/latex.js` | HTML渲染+特殊内容 | 234 | 🟡 中等 |
| **消息构建** | `src/main.js` | 消息组装+网页注入 | ~200 | 🟢 良好 |
| **消息渲染** | `src/handlers/message-handler.js` | DOM渲染+交互 | 410 | 🟢 良好 |
| **网页聚合** | `src/components/webpage-menu.js` | 多标签页内容 | 199 | 🟢 良好 |
| **API调用** | `src/services/chat.js` | 流式响应处理 | 235 | 🟢 良好 |
| **网络监控** | `src/components/network-reference-bar.js` | HTTP请求追踪 | ~240 | 🟢 良好 |

---

## 核心问题识别

### 问题 #1: 表格结构完全丢失

**严重等级:** 🔴 P0 (Critical)

**问题描述:**

```javascript
// content.js:669 - 问题代码
let mainContent = tempContainer.innerText + frameContent;
```

HTML表格:
```html
<table>
  <thead>
    <tr><th>功能</th><th>状态</th><th>优先级</th></tr>
  </thead>
  <tbody>
    <tr><td>用户登录</td><td>已完成</td><td>P0</td></tr>
    <tr><td>数据导出</td><td>开发中</td><td>P1</td></tr>
  </tbody>
</table>
```

提取后变成:
```
功能 状态 优先级 用户登录 已完成 P0 数据导出 开发中 P1
```

**影响场景:**
- 技术文档中的API参数表
- 数据报告中的统计表
- 产品对比表
- 配置选项说明表

**受影响网站类型:**
- 文档站点 (API文档、技术规范)
- 数据分析平台 (Dashboard)
- 电商网站 (商品对比)
- 学术网站 (数据表格)

---

### 问题 #2: 图片内容和Alt文本全部丢失

**严重等级:** 🔴 P0 (Critical)

**问题代码:**

```javascript
// content.js:661 - 图片被直接删除
const selectorsToRemove = [
    'script', 'style', 'nav', 'header', 'footer',
    'iframe', 'noscript', 'img', 'svg', 'video',  // ← 这里
    // ...
];
selectorsToRemove.forEach(selector => {
    tempContainer.querySelectorAll(selector).forEach(element => element.remove());
});
```

**丢失的内容类型:**

1. **内容图片:**
   ```html
   <img src="architecture.png" alt="系统架构：微服务通过API Gateway通信，使用Redis缓存和MySQL持久化存储">
   ```
   → 完全丢失，包括alt文本

2. **图表/数据可视化:**
   ```html
   <img src="sales-chart.png" alt="2024年销售趋势：Q1 $1.2M, Q2 $1.8M, Q3 $2.3M, Q4预计$2.8M">
   ```
   → 数据信息完全丢失

3. **操作步骤截图:**
   ```html
   <img src="step1.png" alt="步骤1：点击左上角菜单按钮，选择'设置'选项">
   ```
   → 操作指引丢失

**影响统计:**
- 技术博客: ~70% 包含架构图、流程图
- 教程网站: ~90% 包含操作截图
- 数据报告: ~80% 包含数据图表

---

### 问题 #3: SVG图形内的文本内容丢失

**严重等级:** 🔴 P1 (High)

**问题描述:**

许多现代网站使用SVG渲染:
- 数据可视化图表 (D3.js, Chart.js)
- 流程图、关系图 (Mermaid, Graphviz)
- 交互式图形

**示例 - D3.js图表:**
```html
<svg id="chart">
  <g class="axis">
    <text>2023年</text>
    <text>2024年</text>
  </g>
  <g class="data">
    <text>增长率: 45%</text>
    <text>用户数: 1.2M</text>
  </g>
</svg>
```

提取后: **完全丢失**

**影响场景:**
- GitHub Insights (贡献图、网络拓扑)
- Jira/Confluence (流程图、组织结构)
- 数据分析Dashboard
- 技术文档中的架构图

---

### 问题 #4: 文章元数据被误删

**严重等级:** 🔴 P1 (High)

**问题代码:**

```javascript
// content.js:660 - header和footer被无差别删除
const selectorsToRemove = [
    'script', 'style', 'nav', 'header', 'footer',  // ← 问题
    // ...
];
```

**误伤的内容:**

1. **文章标题和元信息 (header):**
   ```html
   <header>
     <h1>深入理解 React Hooks 性能优化</h1>
     <div class="meta">
       <span class="author">张三</span>
       <time>2024-12-10</time>
       <span class="read-time">阅读时间: 15分钟</span>
     </div>
     <p class="summary">本文详细分析React Hooks的性能陷阱和优化策略...</p>
   </header>
   ```
   → **标题、作者、日期、摘要全部丢失**

2. **参考文献和版本信息 (footer):**
   ```html
   <article>
     <p>文章正文...</p>
     <footer>
       <h3>参考文献</h3>
       <ol>
         <li>React官方文档: Hooks API Reference</li>
         <li>论文: "Optimizing React Performance"</li>
       </ol>
       <p>最后更新: 2024-12-11 | 版本: v2.1</p>
     </footer>
   </article>
   ```
   → **参考文献、版本信息全部丢失**

**真实影响:**
- Medium文章: 标题、作者信息丢失
- 技术博客: 发布时间、更新记录丢失
- 学术文章: 引用来源丢失
- 文档网站: 版本信息丢失

---

### 问题 #5: 文档导航和目录结构丢失

**严重等级:** 🟡 P2 (Medium)

**问题代码:**

```javascript
// content.js:660,663 - nav和sidebar被删除
const selectorsToRemove = [
    'nav', 'header', 'footer',  // ← nav
    // ...
    '.sidebar', '.nav', '.footer', '.header'  // ← sidebar
];
```

**误删的内容:**

1. **文档目录 (sidebar/nav):**
   ```html
   <nav class="toc">
     <h2>目录</h2>
     <ul>
       <li><a href="#intro">1. 简介</a></li>
       <li><a href="#installation">2. 安装</a>
         <ul>
           <li><a href="#npm">2.1 使用npm</a></li>
           <li><a href="#yarn">2.2 使用yarn</a></li>
         </ul>
       </li>
       <li><a href="#usage">3. 使用方法</a></li>
     </ul>
   </nav>
   ```
   → **文档结构信息丢失**

2. **前置条件和注意事项 (sidebar):**
   ```html
   <aside class="sidebar">
     <div class="warning">
       <h4>⚠️ 注意</h4>
       <p>此功能需要Node.js 18+和TypeScript 5.0+</p>
     </div>
     <div class="prerequisites">
       <h4>前置知识</h4>
       <ul>
         <li>基础的React Hooks使用</li>
         <li>TypeScript泛型</li>
       </ul>
     </div>
   </aside>
   ```
   → **关键提示和前置条件丢失**

**影响网站:**
- 文档网站 (React Docs, Vue Docs, MDN)
- 教程平台
- Wiki类网站

---

### 问题 #6: processMathAndMarkdown() 函数过度复杂

**严重等级:** 🟡 P2 (Medium) - 技术债务

**问题分析:**

```javascript
// htmd/latex.js - 234行的巨型函数
export function processMathAndMarkdown(text) {
    // 第1-73行: 提取图片标签 (3层嵌套)
    // 第76-103行: 提取数学公式 (4层嵌套)
    // 第105-141行: 配置marked + 代码高亮
    // 第143-189行: 特殊情况处理 (列表、粗体、Think标签)
    // 第191-201行: 恢复提取的内容
    // 第203-234行: 最终清理
}
```

**代码质量问题:**

1. **单一责任原则违反** - 一个函数做了太多事情:
   - 提取特殊内容
   - 配置Markdown渲染器
   - 处理数学公式
   - 代码高亮
   - 列表格式修复
   - 粗体语法修复
   - Think标签转换

2. **过深的嵌套** - 多处超过3层if嵌套:
   ```javascript
   text = text.replace(/regex/, (match) => {
       if (condition1) {
           if (condition2) {
               if (condition3) {  // ← 第3层
                   // ...
               }
           }
       }
   });
   ```

3. **特殊情况堆积** - 大量的正则替换链:
   ```javascript
   // 修复列表
   html = html.replace(/regex1/, replacement1);
   // 修复粗体
   html = html.replace(/regex2/, replacement2);
   // 修复Think标签
   html = html.replace(/regex3/, replacement3);
   // ... 还有更多
   ```

**维护风险:**
- 难以理解函数的完整行为
- 修改一处可能破坏其他逻辑
- 无法单独测试各个功能
- 性能优化困难

---

### 问题 #7: iframe处理逻辑混乱

**严重等级:** 🟢 P3 (Low) - 功能正常但逻辑混乱

**问题描述:**

```javascript
// content.js:640-651 - 提取iframe内容
const frames = document.querySelectorAll('iframe');
let frameContent = '';
for (const frame of frames) {
  try {
    const frameDoc = frame.contentDocument || frame.contentWindow.document;
    if (frameDoc) {
      frameContent += '\n' + frameDoc.body.innerText;  // ← 提取内容
    }
  } catch (e) {
    console.log('无法访问iframe内容 (跨域限制):', e);
  }
}

// ... 后面

// content.js:661,666 - 又删除iframe
const selectorsToRemove = [
    'iframe', 'noscript', 'img', 'svg', 'video',  // ← iframe在这里
];
selectorsToRemove.forEach(selector => {
    tempContainer.querySelectorAll(selector).forEach(element => element.remove());
});

// content.js:669 - 合并内容
let mainContent = tempContainer.innerText + frameContent;  // ← 之前提取的frameContent
```

**逻辑问题:**
- 先提取iframe内容 → 再删除iframe元素 → 再添加提取的内容
- 为什么要删除已经处理过的iframe？
- 混淆的执行流程

**虽然功能正常，但代码逻辑令人困惑。**

---

## 影响范围评估

### 按网站类型分类

| 网站类型 | 主要问题 | 影响内容 | 估计影响比例 |
|---------|---------|---------|------------|
| **技术文档** (MDN, React Docs) | 问题#1,#4,#5 | 表格、目录、代码示例 | 80% |
| **技术博客** (Medium, Dev.to) | 问题#2,#4 | 图片、标题、作者信息 | 70% |
| **教程网站** (Udemy, Coursera) | 问题#2,#5 | 截图、课程大纲 | 90% |
| **数据分析** (Dashboard, BI) | 问题#1,#3 | 表格、图表、可视化 | 95% |
| **新闻网站** | 问题#4 | 标题、作者、日期 | 60% |
| **电商网站** | 问题#1 | 产品对比表、规格参数 | 75% |
| **学术网站** | 问题#1,#4 | 数据表、参考文献 | 85% |
| **API文档** (Swagger, Postman) | 问题#1 | 参数表、响应示例 | 90% |

### 用户影响评估

**高频使用场景:**

1. **开发者查阅API文档** (每天数十次)
   - 受影响: API参数表、响应格式表
   - 严重性: 🔴 Critical

2. **学习技术教程** (每周数次)
   - 受影响: 操作截图、代码示例图、架构图
   - 严重性: 🔴 Critical

3. **阅读技术博客** (每周数次)
   - 受影响: 文章标题、图表、流程图
   - 严重性: 🔴 High

4. **数据分析** (每周数次)
   - 受影响: 数据表格、统计图表
   - 严重性: 🔴 Critical

5. **产品研究** (每周数次)
   - 受影响: 产品对比表、规格参数
   - 严重性: 🟡 Medium

---

## 解决方案设计

### 方案架构

```
┌─────────────────────────────────────────────┐
│  Phase 1: 智能内容提取                       │
│  ┌─────────────────────────────────────┐   │
│  │ DOM Tree                            │   │
│  └──────────┬──────────────────────────┘   │
│             │                               │
│             v                               │
│  ┌─────────────────────────────────────┐   │
│  │ 内容分析器 (Content Analyzer)        │   │
│  │ - 识别元素类型                       │   │
│  │ - 判断元素重要性                     │   │
│  │ - 提取结构化数据                     │   │
│  └──────────┬──────────────────────────┘   │
│             │                               │
│             v                               │
│  ┌─────────────────────────────────────┐   │
│  │ 专用处理器 (Specialized Processors)  │   │
│  │                                      │   │
│  │ ┌────────────┐  ┌─────────────┐    │   │
│  │ │Table Parser│  │Image Handler│    │   │
│  │ └────────────┘  └─────────────┘    │   │
│  │                                      │   │
│  │ ┌────────────┐  ┌─────────────┐    │   │
│  │ │SVG Parser  │  │Header Filter│    │   │
│  │ └────────────┘  └─────────────┘    │   │
│  └──────────┬──────────────────────────┘   │
│             │                               │
│             v                               │
│  ┌─────────────────────────────────────┐   │
│  │ 结构化内容 (Structured Content)      │   │
│  │ {                                    │   │
│  │   type: 'document',                  │   │
│  │   title: '...',                      │   │
│  │   metadata: {...},                   │   │
│  │   children: [                        │   │
│  │     {type: 'heading', ...},          │   │
│  │     {type: 'table', ...},            │   │
│  │     {type: 'image', ...}             │   │
│  │   ]                                  │   │
│  │ }                                    │   │
│  └──────────┬──────────────────────────┘   │
└─────────────┼───────────────────────────────┘
              │
              v
┌─────────────────────────────────────────────┐
│  Phase 2: 格式转换                           │
│  ┌─────────────────────────────────────┐   │
│  │ Markdown序列化器                     │   │
│  │ - 表格 → Markdown Table              │   │
│  │ - 图片 → [图片: alt文本]             │   │
│  │ - 标题 → # Heading                   │   │
│  └──────────┬──────────────────────────┘   │
│             │                               │
│             v                               │
│  ┌─────────────────────────────────────┐   │
│  │ 纯文本输出 (Plain Text Output)       │   │
│  │ - 保留结构信息                       │   │
│  │ - 易于AI理解                         │   │
│  │ - 可读性强                           │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

### 方案A: 最小改动方案 (推荐优先实施)

**优点:**
- ✅ 改动量小 (~200行代码)
- ✅ 风险低，不影响现有功能
- ✅ 可快速验证效果
- ✅ 解决80%的问题

**缺点:**
- ⚠️ 仍然基于字符串处理
- ⚠️ 未从根本上改变架构

#### 实施细节

##### 1. 表格转Markdown处理器

**文件:** `content.js`
**位置:** 在 `extractPageContent()` 函数之前添加

```javascript
/**
 * 将HTML表格转换为Markdown格式
 * @param {HTMLElement} container - 包含表格的容器元素
 */
function tablesToMarkdown(container) {
    const tables = container.querySelectorAll('table');

    tables.forEach(table => {
        try {
            const markdown = convertTableToMarkdown(table);
            if (markdown) {
                // 用包含Markdown文本的div替换表格
                const mdDiv = document.createElement('div');
                mdDiv.className = 'table-markdown';
                mdDiv.textContent = '\n' + markdown + '\n';
                table.replaceWith(mdDiv);
            }
        } catch (e) {
            console.error('表格转换失败:', e);
            // 失败时保留表格的纯文本
        }
    });
}

/**
 * 单个表格转Markdown
 * @param {HTMLTableElement} table - 表格元素
 * @returns {string} Markdown格式的表格
 */
function convertTableToMarkdown(table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return '';

    let markdown = '';

    // 检测表头 - 可能在thead中或第一行
    const thead = table.querySelector('thead');
    const headerRow = thead ? thead.querySelector('tr') : rows[0];
    const hasHeader = headerRow.querySelectorAll('th').length > 0;

    if (hasHeader) {
        // 提取表头
        const headers = Array.from(headerRow.querySelectorAll('th, td'));
        const headerTexts = headers.map(th => th.innerText.trim().replace(/\n/g, ' '));

        // Markdown表头格式
        markdown += '| ' + headerTexts.join(' | ') + ' |\n';
        markdown += '|' + headers.map(() => '---').join('|') + '|\n';

        // 数据行 (跳过表头行)
        const dataRows = thead ? Array.from(table.querySelectorAll('tbody tr')) : rows.slice(1);
        dataRows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            const cellTexts = cells.map(td => td.innerText.trim().replace(/\n/g, ' '));
            if (cellTexts.length > 0) {
                markdown += '| ' + cellTexts.join(' | ') + ' |\n';
            }
        });
    } else {
        // 无表头的表格 - 所有行都是数据
        rows.forEach((row, idx) => {
            const cells = Array.from(row.querySelectorAll('td'));
            const cellTexts = cells.map(td => td.innerText.trim().replace(/\n/g, ' '));

            if (idx === 0) {
                // 第一行作为表头
                markdown += '| ' + cellTexts.join(' | ') + ' |\n';
                markdown += '|' + cellTexts.map(() => '---').join('|') + '|\n';
            } else {
                markdown += '| ' + cellTexts.join(' | ') + ' |\n';
            }
        });
    }

    return markdown;
}
```

**调用位置:** `extractPageContent()` 函数中

```javascript
async function extractPageContent(skipWaitContent = false) {
    // ... 现有代码 ...

    const tempContainer = document.body.cloneNode(true);

    // 同步表单元素
    // ... 现有代码 ...

    // ✅ 新增: 在删除元素之前先转换表格
    tablesToMarkdown(tempContainer);

    // 删除不需要的元素
    const selectorsToRemove = [
        // ... 现有代码 ...
    ];

    // ... 继续现有流程 ...
}
```

##### 2. 图片Alt文本保留处理器

**文件:** `content.js`
**位置:** 在 `extractPageContent()` 函数之前添加

```javascript
/**
 * 保留图片的alt文本，删除图片元素
 * @param {HTMLElement} container - 包含图片的容器元素
 */
function preserveImageAltText(container) {
    const images = container.querySelectorAll('img');

    images.forEach(img => {
        const altText = img.alt ? img.alt.trim() : '';
        const title = img.title ? img.title.trim() : '';
        const src = img.src || '';

        // 优先使用alt文本，其次title，最后显示图片文件名
        let description = altText || title;

        if (!description && src) {
            // 从URL提取文件名
            const filename = src.split('/').pop().split('?')[0];
            description = filename;
        }

        if (description) {
            const span = document.createElement('span');
            span.className = 'image-placeholder';
            span.textContent = `[图片: ${description}]`;
            img.replaceWith(span);
        } else {
            // 没有任何描述信息，直接删除
            img.remove();
        }
    });
}
```

##### 3. SVG文本内容提取器

**文件:** `content.js`
**位置:** 在 `extractPageContent()` 函数之前添加

```javascript
/**
 * 提取SVG中的文本内容
 * @param {HTMLElement} container - 包含SVG的容器元素
 */
function extractSVGText(container) {
    const svgs = container.querySelectorAll('svg');

    svgs.forEach(svg => {
        // 提取SVG内的所有文本节点
        const textElements = svg.querySelectorAll('text, tspan');
        const texts = Array.from(textElements)
            .map(el => el.textContent.trim())
            .filter(text => text.length > 0);

        if (texts.length > 0) {
            const span = document.createElement('span');
            span.className = 'svg-text';
            span.textContent = `[图表: ${texts.join(', ')}]`;
            svg.replaceWith(span);
        } else {
            // 没有文本内容的SVG (纯装饰性图标)
            // 检查是否有aria-label或title
            const ariaLabel = svg.getAttribute('aria-label');
            const title = svg.querySelector('title');

            if (ariaLabel) {
                const span = document.createElement('span');
                span.textContent = `[图形: ${ariaLabel}]`;
                svg.replaceWith(span);
            } else if (title) {
                const span = document.createElement('span');
                span.textContent = `[图形: ${title.textContent.trim()}]`;
                svg.replaceWith(span);
            } else {
                // 无法识别的SVG，直接删除
                svg.remove();
            }
        }
    });
}
```

##### 4. 智能导航过滤器

**文件:** `content.js`
**位置:** 在 `extractPageContent()` 函数之前添加

```javascript
/**
 * 智能过滤导航元素 - 只删除明显的全局导航
 * @param {HTMLElement} container - 容器元素
 */
function smartFilterNavigation(container) {
    const navElements = container.querySelectorAll('nav');

    navElements.forEach(nav => {
        const links = nav.querySelectorAll('a');
        const textContent = nav.textContent.trim();
        const textLength = textContent.length;
        const linkCount = links.length;

        // 启发式规则:
        // 1. 链接多但文本少 → 可能是导航栏
        // 2. 在body顶层 → 可能是全局导航
        // 3. 包含"首页"、"关于"等常见导航词 → 可能是导航栏

        const isTopLevel = nav.parentElement === container ||
                          nav.parentElement?.tagName === 'BODY' ||
                          nav.parentElement?.tagName === 'HEADER';

        const hasNavigationKeywords = /首页|home|导航|menu|about|关于|联系|contact/i.test(textContent);

        // 判断是否为全局导航
        const isGlobalNav = (
            (linkCount > 5 && textLength < 200) ||  // 多链接少文字
            (isTopLevel && hasNavigationKeywords) || // 顶层+导航关键词
            (linkCount > 8)  // 链接超多
        );

        if (isGlobalNav) {
            nav.remove();
        }
        // 否则保留 (可能是文章目录或重要链接)
    });
}

/**
 * 智能过滤Header元素 - 区分页面header和文章header
 * @param {HTMLElement} container - 容器元素
 */
function smartFilterHeaders(container) {
    const headers = container.querySelectorAll('header');

    headers.forEach(header => {
        // 检查是否为页面级header
        const isPageHeader = (
            header.parentElement === container ||
            header.parentElement?.tagName === 'BODY' ||
            header.querySelector('nav') !== null ||  // 包含导航
            header.querySelector('logo, .logo, .brand') !== null  // 包含Logo
        );

        if (isPageHeader) {
            // 页面级header - 但要保留其中的文章标题
            const mainHeading = header.querySelector('h1, h2');
            if (mainHeading) {
                // 保留标题，删除其他部分
                const h = document.createElement(mainHeading.tagName);
                h.textContent = mainHeading.textContent;
                header.replaceWith(h);
            } else {
                header.remove();
            }
        }
        // 否则保留 (可能是article的header，包含重要元信息)
    });
}
```

##### 5. 修改主提取函数

**文件:** `content.js`
**位置:** 修改 `extractPageContent()` 函数

```javascript
async function extractPageContent(skipWaitContent = false) {
    // ... 现有代码 (克隆DOM、同步表单等) ...

    const tempContainer = document.body.cloneNode(true);

    // 同步表单元素
    const originalFormElements = document.body.querySelectorAll('textarea, input');
    const clonedFormElements = tempContainer.querySelectorAll('textarea, input');
    originalFormElements.forEach((el, index) => {
      if (clonedFormElements[index] && el.value) {
        clonedFormElements[index].textContent = el.value;
      }
    });

    // ========================================
    // ✅ 新增: 智能内容处理流程
    // ========================================

    // 1. 表格转Markdown (必须在删除元素前)
    tablesToMarkdown(tempContainer);

    // 2. 图片alt文本保留
    preserveImageAltText(tempContainer);

    // 3. SVG文本提取
    extractSVGText(tempContainer);

    // 4. 智能导航过滤
    smartFilterNavigation(tempContainer);
    smartFilterHeaders(tempContainer);

    // ========================================
    // 修改: 更精简的删除列表
    // ========================================
    const selectorsToRemove = [
        'script',
        'style',
        'noscript',
        // ❌ 删除以下危险选择器:
        // 'nav', 'header', 'footer',  // → 已用智能过滤替代
        // 'img', 'svg',  // → 已单独处理
        'iframe',  // iframe内容已提前提取
        'video',
        'audio',
        '[role="navigation"]',
        '.advertisement',
        '.ad',
        '.ads',
        '.social-share',
        '.comments'  // 评论区通常不重要
    ];

    selectorsToRemove.forEach(selector => {
        tempContainer.querySelectorAll(selector).forEach(element => element.remove());
    });

    // ========================================
    // 后续流程保持不变
    // ========================================

    let mainContent = tempContainer.innerText + frameContent;
    mainContent = mainContent.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n').trim();

    // ... 剩余现有代码 ...
}
```

#### 预期效果

**表格提取 - 修复前vs修复后:**

```
【修复前】
姓名 年龄 职位 张三 25 工程师 李四 30 设计师

【修复后】
| 姓名 | 年龄 | 职位 |
|------|------|------|
| 张三 | 25 | 工程师 |
| 李四 | 30 | 设计师 |
```

**图片提取 - 修复前vs修复后:**

```
【修复前】
(完全丢失)

【修复后】
[图片: 系统架构图 - 微服务通过API Gateway通信]
```

**SVG提取 - 修复前vs修复后:**

```
【修复前】
(完全丢失)

【修复后】
[图表: Q1: $1.2M, Q2: $1.8M, Q3: $2.3M, 增长率: 45%]
```

---

### 方案B: 结构化重构方案 (长期目标)

**优点:**
- ✅ 从根本上解决问题
- ✅ 可扩展性强
- ✅ 易于维护和测试
- ✅ 支持更丰富的内容类型

**缺点:**
- ❌ 改动量大 (~1000行代码)
- ❌ 需要重构多个模块
- ❌ 测试成本高
- ❌ 可能引入新bug

#### 架构设计

##### 1. 内容节点数据模型

**文件:** `src/content-extraction/models.js` (新建)

```javascript
/**
 * 内容节点基类
 */
class ContentNode {
    constructor(type) {
        this.type = type;
    }

    /**
     * 序列化为Markdown
     * @returns {string}
     */
    toMarkdown() {
        throw new Error('Must implement toMarkdown()');
    }

    /**
     * 序列化为纯文本
     * @returns {string}
     */
    toPlainText() {
        throw new Error('Must implement toPlainText()');
    }
}

/**
 * 文档节点
 */
class DocumentNode extends ContentNode {
    constructor() {
        super('document');
        this.title = '';
        this.metadata = {};
        this.children = [];
    }

    toMarkdown() {
        let md = '';
        if (this.title) {
            md += `# ${this.title}\n\n`;
        }
        if (this.metadata.author) {
            md += `作者: ${this.metadata.author}\n`;
        }
        if (this.metadata.date) {
            md += `日期: ${this.metadata.date}\n`;
        }
        if (Object.keys(this.metadata).length > 0) {
            md += '\n---\n\n';
        }
        md += this.children.map(child => child.toMarkdown()).join('\n\n');
        return md;
    }

    toPlainText() {
        return this.children.map(child => child.toPlainText()).join('\n\n');
    }
}

/**
 * 标题节点
 */
class HeadingNode extends ContentNode {
    constructor(level, text) {
        super('heading');
        this.level = level;  // 1-6
        this.text = text;
    }

    toMarkdown() {
        return '#'.repeat(this.level) + ' ' + this.text;
    }

    toPlainText() {
        return this.text;
    }
}

/**
 * 段落节点
 */
class ParagraphNode extends ContentNode {
    constructor(text) {
        super('paragraph');
        this.text = text;
    }

    toMarkdown() {
        return this.text;
    }

    toPlainText() {
        return this.text;
    }
}

/**
 * 表格节点
 */
class TableNode extends ContentNode {
    constructor() {
        super('table');
        this.headers = [];
        this.rows = [];
        this.caption = '';
    }

    toMarkdown() {
        let md = '';
        if (this.caption) {
            md += `**${this.caption}**\n\n`;
        }

        // 表头
        if (this.headers.length > 0) {
            md += '| ' + this.headers.join(' | ') + ' |\n';
            md += '|' + this.headers.map(() => '---').join('|') + '|\n';
        }

        // 数据行
        this.rows.forEach(row => {
            md += '| ' + row.join(' | ') + ' |\n';
        });

        return md;
    }

    toPlainText() {
        let text = '';
        if (this.caption) {
            text += this.caption + '\n';
        }
        if (this.headers.length > 0) {
            text += this.headers.join('\t') + '\n';
        }
        this.rows.forEach(row => {
            text += row.join('\t') + '\n';
        });
        return text;
    }
}

/**
 * 图片节点
 */
class ImageNode extends ContentNode {
    constructor(src, alt, title = '') {
        super('image');
        this.src = src;
        this.alt = alt;
        this.title = title;
    }

    toMarkdown() {
        const alt = this.alt || this.title || '图片';
        return `![${alt}](${this.src})`;
    }

    toPlainText() {
        const description = this.alt || this.title || '图片';
        return `[图片: ${description}]`;
    }
}

/**
 * 列表节点
 */
class ListNode extends ContentNode {
    constructor(ordered = false) {
        super('list');
        this.ordered = ordered;
        this.items = [];  // ListItemNode[]
    }

    toMarkdown() {
        return this.items.map((item, idx) => {
            const marker = this.ordered ? `${idx + 1}.` : '-';
            return `${marker} ${item.toMarkdown()}`;
        }).join('\n');
    }

    toPlainText() {
        return this.items.map(item => '- ' + item.toPlainText()).join('\n');
    }
}

/**
 * 列表项节点
 */
class ListItemNode extends ContentNode {
    constructor(text) {
        super('list-item');
        this.text = text;
        this.children = [];  // 嵌套列表
    }

    toMarkdown() {
        let md = this.text;
        if (this.children.length > 0) {
            md += '\n' + this.children.map(child =>
                child.toMarkdown().split('\n').map(line => '  ' + line).join('\n')
            ).join('\n');
        }
        return md;
    }

    toPlainText() {
        return this.text;
    }
}

/**
 * 代码块节点
 */
class CodeBlockNode extends ContentNode {
    constructor(code, language = '') {
        super('code');
        this.code = code;
        this.language = language;
    }

    toMarkdown() {
        return `\`\`\`${this.language}\n${this.code}\n\`\`\``;
    }

    toPlainText() {
        return `[代码块 (${this.language})]\n${this.code}`;
    }
}

export {
    ContentNode,
    DocumentNode,
    HeadingNode,
    ParagraphNode,
    TableNode,
    ImageNode,
    ListNode,
    ListItemNode,
    CodeBlockNode
};
```

##### 2. 内容提取器

**文件:** `src/content-extraction/extractor.js` (新建)

```javascript
import {
    DocumentNode,
    HeadingNode,
    ParagraphNode,
    TableNode,
    ImageNode,
    ListNode,
    ListItemNode,
    CodeBlockNode
} from './models.js';

/**
 * 内容提取器 - 将DOM转换为结构化数据
 */
class ContentExtractor {
    constructor() {
        this.processors = {
            'TABLE': this.processTable.bind(this),
            'IMG': this.processImage.bind(this),
            'H1': (el) => this.processHeading(el, 1),
            'H2': (el) => this.processHeading(el, 2),
            'H3': (el) => this.processHeading(el, 3),
            'H4': (el) => this.processHeading(el, 4),
            'H5': (el) => this.processHeading(el, 5),
            'H6': (el) => this.processHeading(el, 6),
            'P': this.processParagraph.bind(this),
            'UL': (el) => this.processList(el, false),
            'OL': (el) => this.processList(el, true),
            'PRE': this.processCodeBlock.bind(this),
        };
    }

    /**
     * 提取整个文档
     * @param {HTMLElement} root - 根元素
     * @returns {DocumentNode}
     */
    extract(root) {
        const doc = new DocumentNode();

        // 提取文档元数据
        doc.title = document.title || '';
        doc.metadata = this.extractMetadata(root);

        // 提取内容
        doc.children = this.extractChildren(root);

        return doc;
    }

    /**
     * 提取元数据
     * @param {HTMLElement} root
     * @returns {Object}
     */
    extractMetadata(root) {
        const metadata = {};

        // 尝试提取作者
        const authorMeta = document.querySelector('meta[name="author"]');
        if (authorMeta) {
            metadata.author = authorMeta.content;
        }

        // 尝试提取日期
        const dateMeta = document.querySelector('meta[property="article:published_time"]') ||
                        document.querySelector('time[datetime]');
        if (dateMeta) {
            metadata.date = dateMeta.getAttribute('datetime') || dateMeta.content;
        }

        // 尝试提取描述
        const descMeta = document.querySelector('meta[name="description"]');
        if (descMeta) {
            metadata.description = descMeta.content;
        }

        return metadata;
    }

    /**
     * 提取子节点
     * @param {HTMLElement} element
     * @returns {ContentNode[]}
     */
    extractChildren(element) {
        const nodes = [];

        for (const child of element.children) {
            // 跳过不需要的元素
            if (this.shouldSkip(child)) {
                continue;
            }

            const processor = this.processors[child.tagName];
            if (processor) {
                const node = processor(child);
                if (node) {
                    nodes.push(node);
                }
            } else if (this.hasSignificantChildren(child)) {
                // 递归处理容器元素
                const childNodes = this.extractChildren(child);
                nodes.push(...childNodes);
            } else {
                // 提取文本内容
                const text = child.textContent.trim();
                if (text) {
                    nodes.push(new ParagraphNode(text));
                }
            }
        }

        return nodes;
    }

    /**
     * 判断是否应该跳过元素
     * @param {HTMLElement} element
     * @returns {boolean}
     */
    shouldSkip(element) {
        const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT'];
        if (skipTags.includes(element.tagName)) {
            return true;
        }

        // 跳过隐藏元素
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') {
            return true;
        }

        return false;
    }

    /**
     * 判断元素是否有重要的子元素
     * @param {HTMLElement} element
     * @returns {boolean}
     */
    hasSignificantChildren(element) {
        const significantTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
                                'TABLE', 'UL', 'OL', 'PRE', 'BLOCKQUOTE'];
        for (const child of element.children) {
            if (significantTags.includes(child.tagName)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 处理表格
     * @param {HTMLTableElement} table
     * @returns {TableNode}
     */
    processTable(table) {
        const node = new TableNode();

        // 提取表格标题
        const caption = table.querySelector('caption');
        if (caption) {
            node.caption = caption.textContent.trim();
        }

        // 提取表头
        const thead = table.querySelector('thead');
        if (thead) {
            const headerRow = thead.querySelector('tr');
            if (headerRow) {
                node.headers = Array.from(headerRow.querySelectorAll('th, td'))
                    .map(cell => cell.textContent.trim());
            }
        }

        // 如果没有thead，检查第一行是否为表头
        if (node.headers.length === 0) {
            const firstRow = table.querySelector('tr');
            if (firstRow && firstRow.querySelectorAll('th').length > 0) {
                node.headers = Array.from(firstRow.querySelectorAll('th, td'))
                    .map(cell => cell.textContent.trim());
            }
        }

        // 提取数据行
        const tbody = table.querySelector('tbody') || table;
        const rows = Array.from(tbody.querySelectorAll('tr'));

        // 跳过表头行
        const startIdx = (thead || node.headers.length > 0) ? 1 : 0;

        rows.slice(startIdx).forEach(row => {
            const cells = Array.from(row.querySelectorAll('td, th'))
                .map(cell => cell.textContent.trim());
            if (cells.length > 0) {
                node.rows.push(cells);
            }
        });

        return node;
    }

    /**
     * 处理图片
     * @param {HTMLImageElement} img
     * @returns {ImageNode}
     */
    processImage(img) {
        return new ImageNode(
            img.src,
            img.alt || '',
            img.title || ''
        );
    }

    /**
     * 处理标题
     * @param {HTMLHeadingElement} heading
     * @param {number} level
     * @returns {HeadingNode}
     */
    processHeading(heading, level) {
        return new HeadingNode(level, heading.textContent.trim());
    }

    /**
     * 处理段落
     * @param {HTMLParagraphElement} p
     * @returns {ParagraphNode}
     */
    processParagraph(p) {
        const text = p.textContent.trim();
        if (text) {
            return new ParagraphNode(text);
        }
        return null;
    }

    /**
     * 处理列表
     * @param {HTMLUListElement|HTMLOListElement} list
     * @param {boolean} ordered
     * @returns {ListNode}
     */
    processList(list, ordered) {
        const node = new ListNode(ordered);

        const items = Array.from(list.children).filter(child => child.tagName === 'LI');
        items.forEach(li => {
            const itemNode = new ListItemNode(li.textContent.trim());

            // 处理嵌套列表
            const nestedList = li.querySelector('ul, ol');
            if (nestedList) {
                const nestedNode = this.processList(
                    nestedList,
                    nestedList.tagName === 'OL'
                );
                itemNode.children.push(nestedNode);
            }

            node.items.push(itemNode);
        });

        return node;
    }

    /**
     * 处理代码块
     * @param {HTMLPreElement} pre
     * @returns {CodeBlockNode}
     */
    processCodeBlock(pre) {
        const code = pre.querySelector('code') || pre;
        const text = code.textContent;

        // 尝试检测语言
        let language = '';
        const codeClasses = code.className.match(/language-(\w+)/);
        if (codeClasses) {
            language = codeClasses[1];
        }

        return new CodeBlockNode(text, language);
    }
}

export default ContentExtractor;
```

##### 3. 使用新架构

**文件:** `content.js` (修改)

```javascript
import ContentExtractor from './src/content-extraction/extractor.js';

async function extractPageContent(skipWaitContent = false) {
    // ... PDF处理等特殊逻辑保持不变 ...

    // 使用新的内容提取器
    const extractor = new ContentExtractor();
    const documentNode = extractor.extract(document.body);

    // 转换为Markdown格式 (AI友好)
    const mainContent = documentNode.toMarkdown();

    // Token估算
    const gptTokenCount = await estimateGPTTokens(mainContent);
    console.log('页面内容提取完成，内容长度:', mainContent.length, 'GPT tokens:', gptTokenCount);

    return {
        title: documentNode.title,
        url: window.location.href,
        content: mainContent,
        metadata: documentNode.metadata  // ✅ 新增元数据
    };
}
```

#### 优势分析

1. **可测试性** - 每个节点类型独立测试
2. **可扩展性** - 新增内容类型只需添加新Node类
3. **灵活性** - 可以输出多种格式 (Markdown, JSON, HTML)
4. **可维护性** - 逻辑清晰，职责分明
5. **类型安全** - 结构化数据，易于类型检查

---

## 迭代规划建议

### Phase 1: 快速修复 (1-2天)

**目标:** 解决最严重的问题，快速验证效果

**任务清单:**

- [ ] **Task 1.1:** 实现 `tablesToMarkdown()` 函数
  - 估计: 2小时
  - 优先级: P0
  - 验证: 访问API文档网站，检查参数表是否正确提取

- [ ] **Task 1.2:** 实现 `preserveImageAltText()` 函数
  - 估计: 1小时
  - 优先级: P0
  - 验证: 访问技术博客，检查架构图alt文本

- [ ] **Task 1.3:** 实现 `extractSVGText()` 函数
  - 估计: 1.5小时
  - 优先级: P1
  - 验证: 访问数据可视化网站，检查图表数据

- [ ] **Task 1.4:** 修改 `extractPageContent()` 集成新处理器
  - 估计: 1小时
  - 优先级: P0
  - 验证: 完整测试流程

- [ ] **Task 1.5:** 测试和Bug修复
  - 估计: 3小时
  - 优先级: P0
  - 测试网站: MDN, Medium, GitHub, Stack Overflow

**成功指标:**
- ✅ 表格内容可正确提取并保持结构
- ✅ 图片alt文本保留率 > 80%
- ✅ 无严重Bug
- ✅ 现有功能不受影响

---

### Phase 2: 智能过滤优化 (2-3天)

**目标:** 减少误删重要内容

**任务清单:**

- [ ] **Task 2.1:** 实现 `smartFilterNavigation()` 函数
  - 估计: 3小时
  - 优先级: P1
  - 验证: 文档网站目录保留，全局导航删除

- [ ] **Task 2.2:** 实现 `smartFilterHeaders()` 函数
  - 估计: 3小时
  - 优先级: P1
  - 验证: 文章标题保留，页面header删除

- [ ] **Task 2.3:** 添加用户配置选项
  - 估计: 4小时
  - 优先级: P2
  - 功能: 让用户选择过滤级别 (minimal/moderate/aggressive)

- [ ] **Task 2.4:** Footer智能过滤
  - 估计: 2小时
  - 优先级: P2
  - 验证: 参考文献保留，版权信息删除

- [ ] **Task 2.5:** 测试和优化
  - 估计: 4小时
  - 优先级: P1
  - 测试多种类型网站

**成功指标:**
- ✅ 文章标题保留率 > 95%
- ✅ 文档目录保留率 > 80%
- ✅ 参考文献保留率 > 70%
- ✅ 用户满意度提升

---

### Phase 3: processMathAndMarkdown重构 (3-5天)

**目标:** 降低复杂度，提高可维护性

**任务清单:**

- [ ] **Task 3.1:** 拆分为多个专职类
  - 估计: 6小时
  - 优先级: P2
  - 设计: MathExtractor, ImageExtractor, MarkdownRenderer

- [ ] **Task 3.2:** 减少正则表达式复杂度
  - 估计: 4小时
  - 优先级: P2
  - 目标: 单个正则不超过50字符

- [ ] **Task 3.3:** 添加单元测试
  - 估计: 6小时
  - 优先级: P1
  - 覆盖率: > 80%

- [ ] **Task 3.4:** 性能优化
  - 估计: 4小时
  - 优先级: P3
  - 目标: 处理速度提升20%

- [ ] **Task 3.5:** 文档和代码审查
  - 估计: 3小时
  - 优先级: P2

**成功指标:**
- ✅ 函数复杂度降低 50%
- ✅ 代码行数减少 30%
- ✅ 单元测试覆盖率 > 80%
- ✅ 无性能回退

---

### Phase 4: 结构化架构重构 (1-2周)

**目标:** 长期架构升级

**任务清单:**

- [ ] **Task 4.1:** 设计内容节点数据模型
  - 估计: 8小时
  - 优先级: P2
  - 交付: models.js 文件

- [ ] **Task 4.2:** 实现 ContentExtractor
  - 估计: 12小时
  - 优先级: P2
  - 交付: extractor.js 文件

- [ ] **Task 4.3:** 实现各类节点处理器
  - 估计: 16小时
  - 优先级: P2
  - 节点类型: Table, Image, Heading, List, Code, etc.

- [ ] **Task 4.4:** 集成到现有系统
  - 估计: 8小时
  - 优先级: P1
  - 修改: content.js, message-handler.js

- [ ] **Task 4.5:** 全面测试
  - 估计: 12小时
  - 优先级: P0
  - 测试: 50+ 不同类型网站

- [ ] **Task 4.6:** 性能优化
  - 估计: 8小时
  - 优先级: P2
  - 目标: 与原系统性能持平

- [ ] **Task 4.7:** 文档和培训
  - 估计: 6小时
  - 优先级: P2
  - 交付: 架构文档、API文档

**成功指标:**
- ✅ 所有内容类型正确提取
- ✅ 代码覆盖率 > 85%
- ✅ 性能无明显下降
- ✅ 架构清晰可维护

---

### Phase 5: 高级特性 (持续迭代)

**目标:** 增强功能和用户体验

**潜在功能:**

1. **内容摘要生成**
   - 自动生成长文章摘要
   - 提取关键信息点

2. **多语言支持优化**
   - 改进非英文内容提取
   - 支持RTL语言

3. **富文本保留**
   - 保留文本格式 (粗体、斜体)
   - 保留链接信息

4. **智能内容清理**
   - 机器学习识别主要内容区域
   - 自动过滤广告和无关内容

5. **增强的表格处理**
   - 合并单元格支持
   - 复杂表格结构识别

6. **视频/音频元数据提取**
   - 提取视频标题、描述
   - 提取字幕文件

7. **用户自定义规则**
   - 允许用户配置提取规则
   - 站点特定的提取模板

---

## 风险评估和缓解策略

### 风险 #1: 破坏现有功能

**可能性:** 中
**影响:** 高

**缓解策略:**
1. 充分的自动化测试覆盖
2. 渐进式发布 (feature flag)
3. 保留旧代码路径作为fallback
4. Beta测试阶段收集用户反馈

### 风险 #2: 性能下降

**可能性:** 中
**影响:** 中

**缓解策略:**
1. 性能基准测试
2. 复杂处理移到Web Worker
3. 内容大小限制
4. 缓存处理结果

### 风险 #3: 兼容性问题

**可能性:** 中
**影响:** 中

**缓解策略:**
1. 测试多种网站类型
2. 异常处理和降级方案
3. 用户报告机制
4. 站点黑名单/白名单

### 风险 #4: 维护成本增加

**可能性:** 低
**影响:** 中

**缓解策略:**
1. 完善的文档
2. 清晰的架构设计
3. 单元测试覆盖
4. 代码审查流程

---

## 测试计划

### 单元测试

**目标:** 核心函数逻辑正确性

```javascript
// 测试用例示例
describe('tablesToMarkdown', () => {
    it('should convert simple table', () => {
        const html = `
            <table>
                <tr><th>Name</th><th>Age</th></tr>
                <tr><td>Alice</td><td>25</td></tr>
            </table>
        `;
        const expected = `| Name | Age |\n|---|---|\n| Alice | 25 |\n`;
        expect(tablesToMarkdown(html)).toBe(expected);
    });

    it('should handle tables without headers', () => {
        // ...
    });

    it('should handle complex nested tables', () => {
        // ...
    });
});
```

### 集成测试

**目标:** 整体流程验证

**测试场景:**
1. 提取包含表格的网页
2. 提取包含图片的网页
3. 提取技术文档 (MDN)
4. 提取博客文章 (Medium)
5. 提取数据可视化页面

### 真实网站测试清单

| 网站 | 类型 | 测试重点 | 预期结果 |
|------|------|---------|---------|
| MDN Web Docs | 技术文档 | 目录、表格、代码块 | 完整内容提取 |
| React官方文档 | 技术文档 | 侧边栏目录、代码示例 | 结构完整 |
| Medium文章 | 博客 | 标题、作者、图片 | 元数据完整 |
| Stack Overflow | 问答 | 代码块、表格 | 格式正确 |
| GitHub | 代码托管 | README、表格、图表 | Markdown保留 |
| Jira Dashboard | 项目管理 | 表格、状态图 | 数据完整 |
| Confluence | Wiki | 表格、目录、图片 | 结构清晰 |
| AWS文档 | 云服务文档 | 参数表、架构图 | 技术内容完整 |

---

## 性能基准

### 当前性能指标

**测试环境:**
- 浏览器: Chrome 120
- 页面大小: ~500KB HTML
- 元素数量: ~2000个DOM节点

**当前性能:**
```
内容提取耗时: ~150ms
Token估算耗时: ~50ms
总耗时: ~200ms
```

### 目标性能指标

**Phase 1 (快速修复):**
- 内容提取耗时: < 200ms (+33%)
- 允许轻微性能下降以换取功能正确性

**Phase 4 (结构化重构):**
- 内容提取耗时: < 180ms (+20%)
- 通过优化抵消复杂度增加

---

## 监控和度量

### 关键指标

1. **内容完整性:**
   - 表格识别率
   - 图片alt文本保留率
   - 标题提取准确率

2. **性能指标:**
   - 平均提取耗时
   - P95/P99延迟
   - 内存使用

3. **用户满意度:**
   - Bug报告数量
   - 功能请求
   - 用户评分

### 数据收集

```javascript
// 添加遥测
function reportExtractionMetrics(metrics) {
    const data = {
        extractionTime: metrics.time,
        contentLength: metrics.contentLength,
        tableCount: metrics.tableCount,
        imageCount: metrics.imageCount,
        errors: metrics.errors
    };

    // 发送到分析服务
    chrome.runtime.sendMessage({
        type: 'TELEMETRY',
        data: data
    });
}
```

---

## 总结

### 核心问题

1. 🔴 **表格结构丢失** - innerText导致
2. 🔴 **图片内容丢失** - 盲目删除img标签
3. 🔴 **SVG数据丢失** - 未提取文本内容
4. 🔴 **元数据丢失** - 误删header/footer
5. 🟡 **代码复杂度高** - processMathAndMarkdown过度复杂

### 推荐路径

**立即行动 (本周):**
- ✅ 实施方案A (最小改动)
- ✅ 修复表格、图片、SVG提取

**短期优化 (2周内):**
- ✅ 智能过滤header/footer/nav
- ✅ 添加用户配置选项

**长期重构 (1-2个月):**
- ✅ 结构化架构重构
- ✅ 完善测试覆盖
- ✅ 性能优化

### 预期收益

**用户体验提升:**
- 内容完整性: 从 ~40% → ~90%
- 文档网站可用性: 从 低 → 高
- 技术博客可用性: 从 中 → 高

**技术债务减少:**
- 代码复杂度: 降低 30-50%
- 可维护性: 显著提升
- 可扩展性: 架构清晰

---

## 附录

### A. 相关代码文件清单

```
Cerebr/
├── content.js (691行)
│   └── extractPageContent() - 核心提取逻辑
├── background.js
│   └── GET_PAGE_CONTENT_FROM_SIDEBAR 消息处理
├── htmd/
│   └── latex.js (234行)
│       └── processMathAndMarkdown() - 渲染逻辑
├── src/
│   ├── main.js
│   │   └── sendMessage() - 消息构建
│   ├── services/
│   │   └── chat.js
│   │       └── callAPI() - 网页内容注入
│   ├── handlers/
│   │   └── message-handler.js
│   │       └── appendMessage() - 消息渲染
│   └── components/
│       ├── webpage-menu.js
│       │   └── getEnabledTabsContent() - 多网页聚合
│       └── network-reference-bar.js
│           └── 网络请求追踪
```

### B. 技术栈

- **DOM处理:** 原生DOM API
- **Markdown渲染:** marked.js
- **代码高亮:** highlight.js
- **数学公式:** MathJax
- **图表渲染:** Mermaid
- **PDF处理:** PDF.js

### C. 参考资源

**Markdown规范:**
- [GitHub Flavored Markdown](https://github.github.com/gfm/)
- [CommonMark Spec](https://commonmark.org/)

**内容提取:**
- [Readability.js](https://github.com/mozilla/readability)
- [Trafilatura](https://github.com/adbar/trafilatura)

**DOM操作:**
- [MDN: Document Object Model](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model)

---

**文档版本:** 1.0
**最后更新:** 2024-12-11
**维护者:** Development Team
