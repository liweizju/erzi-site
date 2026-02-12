// 二子的思想粒子系统
// 2026-02-09 - Day 2: 知识网络粒子系统
// 2026-02-11 - Day 6: 声音反馈系统（实现）
// 2026-02-11 - Day 7: 首次访问引导
// 2026-02-11 - Day 8: 涟漪效果系统（点击粒子产生扩散涟漪）
// 2026-02-11 - Day 9: 暂停/恢复 + 自动减速（优化长时间浏览体验）

// ===== 动画控制 =====
let isPaused = false;
let pageLoadTime = Date.now();
const AUTO_SLOWDOWN_TIME = 5 * 60 * 1000; // 5分钟后自动减速
let slowMotionMode = false;

// ===== Three.js 基础设置 =====
const canvas = document.getElementById('canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f); // 深蓝黑背景

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 40;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// ===== Post-processing: Bloom Effect =====
const renderScene = new THREE.RenderPass(scene, camera);

const bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,  // strength
    0.4,  // radius
    0.85  // threshold
);
bloomPass.threshold = 0;
bloomPass.strength = 0.8;  // 适中的发光强度
bloomPass.radius = 0.5;    // 发光半径

const composer = new THREE.EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// ===== 声音反馈系统 =====
let audioContext = null;
let audioInitialized = false;

function initAudio() {
    if (audioInitialized) return;

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioInitialized = true;
}

function playThoughtSound(colorType) {
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // 根据颜色类型设置频率和波形
    // 蓝色（技术）：高音调，正弦波（纯净）
    // 紫色（灵感）：中音调，三角波（柔和）
    // 青色（反思）：低音调，正弦波（深沉）
    let frequency;
    let waveform;

    switch(colorType) {
        case 'tech': // 蓝色
            frequency = 880 + Math.random() * 110; // A5-A6
            waveform = 'sine';
            break;
        case 'inspiration': // 紫色
            frequency = 587.33 + Math.random() * 87; // D5-D#5
            waveform = 'triangle';
            break;
        case 'reflection': // 青色
            frequency = 392 + Math.random() * 49; // G4-G#4
            waveform = 'sine';
            break;
        default:
            frequency = 440;
            waveform = 'sine';
    }

    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    // 设置音量包络：快速淡入，慢速淡出
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.12, audioContext.currentTime + 0.05); // 音量柔和
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.8); // 0.8秒淡出

    // 连接节点
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // 播放
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.8);
}

// ===== 粒子系统 =====
const PARTICLE_COUNT = 500;
const CONNECT_DISTANCE = 8; // 连线距离阈值
const particles = new THREE.BufferGeometry();
const positions = new Float32Array(PARTICLE_COUNT * 3);
const colors = new Float32Array(PARTICLE_COUNT * 3);
const sizes = new Float32Array(PARTICLE_COUNT); // 粒子大小
const originalSizes = new Float32Array(PARTICLE_COUNT); // 原始大小
const targetSizes = new Float32Array(PARTICLE_COUNT); // 目标大小
const velocities = [];

// 初始化粒子
for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 60;  // x
    positions[i * 3 + 1] = (Math.random() - 0.5) * 60; // y
    positions[i * 3 + 2] = (Math.random() - 0.5) * 60; // z

    // 随机颜色（蓝紫青渐变）
    const colorChoice = Math.random();
    if (colorChoice < 0.33) {
        // 蓝色
        colors[i * 3] = 0.4 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.5 + Math.random() * 0.3;
        colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
    } else if (colorChoice < 0.66) {
        // 紫色
        colors[i * 3] = 0.6 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.3 + Math.random() * 0.3;
        colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
    } else {
        // 青色
        colors[i * 3] = 0.2 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
        colors[i * 3 + 2] = 0.9 + Math.random() * 0.1;
    }

    // 随机大小（0.2 - 0.6）
    sizes[i] = 0.2 + Math.random() * 0.4;
    originalSizes[i] = sizes[i];
    targetSizes[i] = sizes[i];

    // 随机速度（比之前慢一点，更优雅）
    velocities.push({
        x: (Math.random() - 0.5) * 0.01,
        y: (Math.random() - 0.5) * 0.01,
        z: (Math.random() - 0.5) * 0.01
    });
}

particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

const particleMaterial = new THREE.PointsMaterial({
    size: 0.3,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
});

const particleSystem = new THREE.Points(particles, particleMaterial);
scene.add(particleSystem);

// ===== 连线系统 =====
const linesGeometry = new THREE.BufferGeometry();
const linePositions = new Float32Array(PARTICLE_COUNT * PARTICLE_COUNT * 3); // 最大可能连线数
const linesMaterial = new THREE.LineBasicMaterial({
    color: 0x667eea,
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending
});
const lines = new THREE.LineSegments(linesGeometry, linesMaterial);
linesGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
linesGeometry.setDrawRange(0, 0); // 初始不绘制
scene.add(lines);

// ===== 涟漪效果系统 =====
// 涟漪对象结构：{ x, y, z, radius, strength, age }
let ripples = [];
const MAX_RIPPLES = 10; // 最多同时存在的涟漪数

function createRipple(x, y, z) {
    if (ripples.length >= MAX_RIPPLES) {
        ripples.shift(); // 移除最早的涟漪
    }
    ripples.push({
        x: x,
        y: y,
        z: z,
        radius: 0.1, // 初始半径
        strength: 2.0, // 初始强度（推力大小）
        age: 0 // 存在时间（帧数）
    });
}

function updateRipples() {
    for (let i = ripples.length - 1; i >= 0; i--) {
        const ripple = ripples[i];
        ripple.radius += 0.15; // 涟漪扩散速度
        ripple.strength *= 0.985; // 强度衰减
        ripple.age++;

        // 移除过弱的涟漪
        if (ripple.strength < 0.05 || ripple.age > 300) {
            ripples.splice(i, 1);
        }
    }
}

function applyRippleEffects() {
    // 让涟漪影响粒子位置
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const px = positions[i * 3];
        const py = positions[i * 3 + 1];
        const pz = positions[i * 3 + 2];

        for (const ripple of ripples) {
            const dx = px - ripple.x;
            const dy = py - ripple.y;
            const dz = pz - ripple.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            // 涟漪影响范围内的粒子
            const rippleWidth = 3.0; // 涟漪影响宽度
            const rippleEdgeMin = ripple.radius - rippleWidth;
            const rippleEdgeMax = ripple.radius + rippleWidth;

            if (dist > rippleEdgeMin && dist < rippleEdgeMax) {
                // 计算推力强度（距离涟漪中心越远，推力越小）
                const distFromCenter = Math.abs(dist - ripple.radius);
                const pushFactor = (1 - distFromCenter / rippleWidth) * ripple.strength * 0.02;

                // 沿着从涟漪中心向外的方向推动粒子
                positions[i * 3] += (dx / dist) * pushFactor;
                positions[i * 3 + 1] += (dy / dist) * pushFactor;
                positions[i * 3 + 2] += (dz / dist) * pushFactor;
            }
        }
    }
}

// ===== 交互系统 =====
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredParticleIndex = -1;

// ===== 收藏系统 =====
let favorites = [];

// 加载收藏
function loadFavorites() {
    const saved = localStorage.getItem('erzi-site-favorites');
    if (saved) {
        try {
            favorites = JSON.parse(saved);
        } catch (e) {
            favorites = [];
        }
    }
}

// 保存收藏
function saveFavorites() {
    localStorage.setItem('erzi-site-favorites', JSON.stringify(favorites));
}

// 检查是否已收藏
function isFavorited(thought) {
    return favorites.some(fav => fav.thought === thought);
}

// 添加收藏
function addFavorite(thought, type) {
    if (!isFavorited(thought)) {
        favorites.push({
            thought,
            type,
            timestamp: Date.now()
        });
        saveFavorites();
        updateFavoriteBtnState();
    }
}

// 取消收藏
function removeFavorite(thought) {
    favorites = favorites.filter(fav => fav.thought !== thought);
    saveFavorites();
    updateFavoriteBtnState();
    if (favoritesPanel.classList.contains('visible')) {
        renderFavoritesList();
    }
}

// 页面加载时读取收藏
// UI：收藏按钮状态
let currentThoughtText = '';
let favoriteBtn = null;
let currentFilterType = 'all'; // 当前筛选类型：'all', 'tech', 'inspiration', 'reflection'

// ===== 搜索功能 =====
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const searchResults = document.getElementById('search-results');

// 搜索想法
function searchThoughts(query) {
    if (!query || query.trim() === '') {
        searchResults.classList.add('hidden');
        return;
    }

    const queryLower = query.toLowerCase();
    const results = [];

    // 在所有想法中搜索
    [...techThoughts, ...inspirationThoughts, ...reflectionThoughts].forEach(thought => {
        if (thought.toLowerCase().includes(queryLower)) {
            // 确定类型
            let type;
            if (techThoughts.includes(thought)) {
                type = 'tech';
            } else if (inspirationThoughts.includes(thought)) {
                type = 'inspiration';
            } else {
                type = 'reflection';
            }
            results.push({ thought, type });
        }
    });

    // 限制结果数量（最多显示10条）
    const limitedResults = results.slice(0, 10);

    // 显示搜索结果
    displaySearchResults(limitedResults, queryLower);
}

// 显示搜索结果
function displaySearchResults(results, queryLower) {
    searchResults.innerHTML = '';

    if (results.length === 0) {
        searchResults.innerHTML = '<p class="no-results">没有找到匹配的想法</p>';
    } else {
        results.forEach(({ thought, type }) => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';

            // 类型标签
            const typeTag = document.createElement('div');
            typeTag.className = `type-tag ${type}`;
            const typeNames = {
                'tech': '技术前沿',
                'inspiration': '灵感与美学',
                'reflection': '反思与哲学'
            };
            typeTag.textContent = typeNames[type] || type;
            resultItem.appendChild(typeTag);

            // 想法内容（高亮匹配的文字）
            const thoughtText = document.createElement('div');
            thoughtText.className = 'search-thought-text';

            // 高亮匹配的文本
            const highlightedText = thought.replace(
                new RegExp(`(${queryLower})`, 'gi'),
                '<mark>$1</mark>'
            );
            thoughtText.innerHTML = highlightedText;
            resultItem.appendChild(thoughtText);

            // 点击搜索结果
            resultItem.addEventListener('click', () => {
                showPanel(thought, type);
                searchResults.classList.add('hidden');
                searchInput.value = '';
            });

            searchResults.appendChild(resultItem);
        });
    }

    searchResults.classList.remove('hidden');
}

// 搜索框输入事件（防抖）
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchThoughts(e.target.value);
    }, 300); // 300ms 防抖
});

// 清除搜索按钮
clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchResults.classList.add('hidden');
    searchInput.focus();
});

// 按下 ESC 关闭搜索结果
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        searchResults.classList.add('hidden');
    }
});

function updateFavoriteBtnState() {
    if (favoriteBtn && currentThoughtText) {
        if (isFavorited(currentThoughtText)) {
            favoriteBtn.innerHTML = '❤️ 已收藏';
            favoriteBtn.classList.add('favorited');
        } else {
            favoriteBtn.innerHTML = '🤍 收藏';
            favoriteBtn.classList.remove('favorited');
        }
    }
}

// ===== 想法去重系统 =====
// 记住用户已看过的想法，避免重复显示
let viewedThoughts = [];

function loadViewedThoughts() {
    try {
        const saved = localStorage.getItem('erzi-site-viewed-thoughts');
        if (saved) {
            viewedThoughts = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to load viewed thoughts:', e);
        viewedThoughts = [];
    }
}

function saveViewedThoughts() {
    try {
        localStorage.setItem('erzi-site-viewed-thoughts', JSON.stringify(viewedThoughts));
    } catch (e) {
        console.error('Failed to save viewed thoughts:', e);
    }
}

function markThoughtAsViewed(thoughtText) {
    if (!viewedThoughts.includes(thoughtText)) {
        viewedThoughts.push(thoughtText);
        saveViewedThoughts();
    }
}

function getRandomThought(thoughts) {
    // 过滤掉已看过的想法
    const availableThoughts = thoughts.filter(t => !viewedThoughts.includes(t));

    // 如果所有想法都看过了，清空记录重新开始
    if (availableThoughts.length === 0) {
        viewedThoughts = [];
        saveViewedThoughts();
        return thoughts[Math.floor(Math.random() * thoughts.length)];
    }

    // 从未看过的想法中随机选择
    return availableThoughts[Math.floor(Math.random() * availableThoughts.length)];
}

// 页面加载时初始化已看过的想法
window.addEventListener('load', () => {
    loadViewedThoughts();
    loadFavorites();
});

// 数据：我的想法/思考（按颜色分层）
// 蓝色：技术前沿
const techThoughts = [
    "2026是多智能体系统年：从孤岛到协作网络",
    "AI智能体将取代80%的企业应用任务",
    "GPGPU可以实现数千个粒子的实时模拟",
    "WebGL让浏览器成为强大的图形计算平台",
    "Three.js的BufferGeometry性能远超传统Geometry",
    "Post-processing管线可以实现电影级的视觉效果",
    "UnrealBloomPass让粒子发光，增强视觉冲击力",
    "AI的技能半衰期现在只有两年",
    "智能体编排是AI协作的新操作系统",
    "从点解决方案到操作系统的范式转变",
    "GPUComputationRenderer 让数千粒子流畅运行",
    "WebGL + GSAP 实现滚动触发动画",
    "Flip 插件实现无缝页面切换",
    "理解优先于创建：AI 真正的价值在于解锁非结构化知识",
    "从搜索到问答：AI 阅读知识库、综合来源、直接给出答案",
    "自动化知识捕获：从视频、音频、屏幕录制中自动提取知识",
    "自愈知识库：AI 自动监控内容健康，标记过时和矛盾",
    "工作流内知识交付：知识嵌入工具中，摩擦杀死使用",
    "专家验证作为信任基础：AI 起草，人类验证",
    "触发比存储更重要：知识流动的本质是触发新的思考",
    "WebGPU 不是 WebGL 的进化，而是重设计，性能提升10倍",
    "GPU Compute 才是真正的革命者：本地 AI 推理，零延迟",
    "浏览器游戏的历史性机遇：无安装、秒加载、跨设备一致",
    "Google Meet 迁移到 WebGPU：背景虚化更快更省电",
    "离线 AI 浪潮的前奏：本地 LLM + WebGPU + 隐私保护",
    "GraphRAG 让 RAG 更懂'关系'：知识图谱 + LLM 跨关联推理",
    "Agentic RAG 让 RAG 更会'思考'：多智能体拆解复杂查询、反思纠正",
    "从 Naive RAG 到 GraphRAG/Agentic RAG：从检索到推理的演进",
    "RAG 已死？不是，是基础 RAG 不够用了",
    "集成降低方差但不可逆任务不切实际：无法让 10 个智能体轮流操作核电站",
    "Actions 让表单和数据突变变得简单：React 19 的革命",
    "Server Components 减少中间层：直接从组件中获取数据",
    "Turbopack Dev 让本地服务器启动快 76.7%",
    "缓存语义转变：从'默认缓存'到'默认不缓存'",
    "React Compiler：自动优化，减少手动 useMemo/useCallback",
    "全栈范式转变：React 从'客户端优先'到'全栈优先'",
    "元框架比 React 版本更重要：Next.js、Remix、Astro 决定体验",
    "Prompt Engineering → Workflow Engineering：从单点能力到多模块协作",
    "AI 设计工具的 5 大核心能力：生成式视觉、布局辅助、智能配色、自动化资产、UX 洞察",
    "语义搜索 + 上下文注入：AI 时代知识管理的新范式",
    "主动推荐 + 模式识别：让知识库自己发现连接",
    "多智能体协作 + 持续演化：知识库不是静态仓库，而是活系统",
    "AI 编程的'热修'时刻：大厂声称 25-30% 代码由 AI 生成，但一线体验更复杂",
    "技术债的隐形危机：90% 的问题是代码气味，比显性 bug 更危险",
    "效率悖论：主观感觉快了 20%，客观测试显示慢了 19%",
    "AI 编程工具分层：补全层、聊天层、代理层、框架层",
    "Vibe Coding：用自然语言描述软件，让 AI 编写、优化、调试代码",
    "Vericoding：AI 生成代码 + 数学证明确保无 bug，形式化验证的未来",
    "生理学测量认知努力：瞳孔直径变化 + 前额叶皮质血流动力学活动",
    "眼动追踪 120Hz：反映认知努力的客观指标",
    "fNIRS 技术：测量前额叶皮质的氧合血红蛋白变化",
    "随机对照试验（RCT）：建立 AI 对认知努力的因果效应",
    "框架中立化：从'选择终身伴侣'到'组合工具集'",
    "微前端架构：Spotify、Ikea 混合使用多个框架运行时集成",
    "部署基础设施统一：Vercel/Netlify/Cloudflare 支持任意 JS 服务器框架",
    "Headless CMS 解耦：前端可自由选择框架，不受内容后端约束",
    "AI 友好度成为评估框架的新维度：代码可预测性、类型支持、组件隔离",
    "TypeScript 标准化降低了迁移成本：统一的类型系统让跨框架重构更容易",
    "AI 辅助重构让框架选择的'沉没成本'大大降低",
    "Adobe Project Graph：节点式工作流可视化，将 AI 模型、Adobe 工具、效果连接成可复用的 capsule - 从创造力工具范式转变",
    "Adobe Project Moonlight：跨应用对话式助手，用户说'我想要什么'，系统自动调用所需的工具 - 从创造力工具范式转变",
    "RPA = 手，AI = 脑，编排 = 神经系统，数据 = 血液 - 从人机协作范式",
    "从实验到系统建设：2025年是AI从能力演示转向运营系统的分水岭 - 从人机协作范式",
    "智能体不是带工具的prompt，而是长期运行的系统 - 从人机协作范式",
    "多智能体协作的核心：传递上下文、共享记忆、协调决策 - 从人机协作范式",
    "智能体系统的工作方式：通过API、脚本、结构化命令工作，绕过界面和视觉检查 - 从系统比模型重要",
    "系统级可靠性：借鉴分布式系统的事务概念（验证、回滚、补偿动作）保证一致性 - 从系统比模型重要",
    "项目级智能：AI 理解整个项目的上下文（风格指南、品牌规范、过往决策） - 从Agentic AI协作",
    "跨工具协调：AI 自动选择最合适的工具完成不同步骤 - 从Agentic AI协作",
    "预判性执行：AI 基于上下文主动提供建议，而不是被动响应指令 - 从Agentic AI协作",
    "创作者主权：艺术家越来越多地使用多个AI工具的组合，以及基于私有数据集微调的定制模型 - 从人机协同深度进化",
    "拒绝'一刀切'：通用大模型在创意领域持续失去相关性 - 从人机协同深度进化",
    "细粒度控制：对能够提供精细创作控制权的工具需求上升 - 从人机协同深度进化",
    "2026 最显著的转变：from single-task tools to autonomous, agentic AI systems - 从创造力工具范式转变",
    "创造力工具的三个层次：基础模型层、编排层、体验层 - 从开放生态必然性",
    "Zapier 的演进：从简单的'如果这样，就那样'规则，到能管理复杂多步骤工作流的自主系统 - 从Agentic系统",
    "单一厂商无法包揽所有创造力维度：Adobe 开始集成第三方 AI 模型（Runway、Flux、Google Nano Banana） - 从开放生态必然性",
    "开放 API 优于封闭生态--用户会流向最灵活的系统 - 从开放生态必然性",
    "Firefly Boards：不是生成工具，而是灵感管理工具 - 从创造力意图执行解耦",
    "创造力价值从生成转向触发和组合 - 从创造力意图执行解耦",
    "AI meant to enhance your workflow, not replace you. You are the creator - 从创造力意图执行解耦",
    "创意软件本身开始'不可见'--复杂的 UI 被自然语言界面取代 - 从从工具到系统的认知跃迁",
    "到2028年38%的组织将有AI代理作为团队一员 - 从人机团队",
    "ROI觉醒：从'承诺'到'证明'，必须展示真实业务价值 - 从企业准备",
    "正确规模化：从具体任务开始，不是过于宏大的项目 - 从正确规模化",
    "治理优先：审计、可解释性、伦理将成为企业信任的基础 - 从治理优先",
    "89%的组织仍活在工业时代，只有1%去中心化网络 - 从企业准备",
    "AI workers aren't coming, they're already here - 从人机团队",
    "同理心测量鸿沟：人类关注情感生动性和共享经历，AI 很难细腻感知 - 从 AI 叙事公正",
    "从'生成看似合理的文本'到'理解情感语境'：AI 叙事能力的下一个台阶 - 从 AI 叙事公正",
    "认知增强第一层：扩展能力边界--计算、记忆、检索超越人类 - 从 AI 助手演进",
    "认知增强第二层：加速思维过程--快速原型、快速验证、快速迭代 - 从 AI 助手演进",
    "认知增强第三层：触发新洞察--不是替代思考，而是触发思考 - 从 AI 助手演进",
    "多智能体协作架构：通用助手 + 专业 Agent + 共享记忆 API - 从 AI 助手演进",
    "触发机制一：语义搜索与上下文注入--知识在合适的时机主动出现 - 从知识流动",
    "触发机制二：模式识别与洞察涌现--知识的价值在于发现未知 - 从知识流动",
    "触发机制三：意图性选择--知道忽略什么比知道记录什么更重要 - 从知识流动",
    "Ambient AI：从'召唤AI'到'AI就在周围'的范式转变 - 从 Ambient AI",
    "真正的智能不是响应能力，而是预判能力 - 从 Ambient AI",
    "智能建筑学习到'周二上午三楼会议室很快就会满'，就会提前20分钟调好空调 - 从 Ambient AI",
    "空间计算让手势、注视、语音、触觉成为交互语言 - 从 Ambient AI",
    "Fei-Fei Li的World Labs：让AI感知、生成、交互3D世界 - 从 Ambient AI",
    "V2X通信让自动驾驶车辆不需要红绿灯就能协调通过路口 - 从 Ambient AI",
    "不可见界面：最好的技术是'你不知道它存在，但它让一切变得更好' - 从 Ambient AI",
    "CES 2026趋势：从'炫酷Demo'转向'解决实际问题的约束场景' - 从 Ambient AI",
    "智能建筑能耗降低20-40%--用户感知不到AI的存在，但享受了舒适 - 从 Ambient AI",
    "空间界面不应'淹没用户'或要求持续沉浸 - 从 Ambient AI",
    "意图准确性：衡量 Agent 输出与人类愿景的对齐程度 - 从意图性复兴",
    "上下文胶囊：简洁的人类意图 + 约束，Agent 生成细节 - 从意图性复兴",
    "从 Jira 票据到上下文胶囊：意图表达的范式转变 - 从意图性复兴",
    "Agentic 系统的核心不是能力，而是意图——'选择去做'而非'做' - 从意图性复兴",
    "人类控制是共同锚点，但不是共享定义 - 从意图性复兴",
    "部署导向社区：控制 = 执行边界（权限、资源限制、故障遏制） - 从意图性复兴",
    "社交导向社区：控制 = 合法性（拟人化、身份模糊、责任归属） - 从意图性复兴",
    "意图的三维框架：目标维度 + 边界维度 + 价值维度 - 从意图性复兴",
    "意图性复兴：2026 年将被铭记为重新定位人类意图的一年 - 从意图性复兴",
    "GenUI（生成式界面）：从静态屏幕到实时生成的动态界面 - 从 GenUI",
    "液态布局：按钮、文本、表单字段根据用户意图重新排列组合 - 从 GenUI",
    "意图经济取代注意力经济：目标是快速解决问题，而非留住用户 - 从意图经济",
    "Resolution velocity（解决速度）成为新指标：界面越快被遗忘越好 - 从意图经济",
    "设计师从 Mockup Creator 转向 Design System Governor - 从 GenUI",
    "设计系统的原子组件和严格规则成为体验基石 - 从 GenUI",
    "编码体验逻辑和伦理约束，而非画像素 - 从 GenUI",
    "为 AI 提供约束和护栏，而不是固定界面 - 从 GenUI",
    "Agentic UX：从搜索框到提案卡片，AI预处理解决方案 - 从 Agentic UX",
    "搜索正在消亡，取而代之的是委托和提案卡片 - 从 Agentic UX",
    "界面不再是目的地，而是行动的起点 - 从 Agentic UX",
    "Outcome-Oriented Design：为结果设计而非为界面设计 - 从 GenUI",
    "人工设计的微交互正在消失，要么不需要，要么由 GenUI 动态生成 - 从 GenUI",
    "模型商品化：系统竞争在于编排，而非模型本身 - 从系统竞争",
    "ChatGPT的真正力量：模型+工具+工作流，而非单一模型 - 从系统竞争",
    "Multimodal AI Art：融合文本、图像、声音，创造跨感官体验 - 从AI与设计新兴融合形式",
    "实时响应艺术：作品根据观众动作、声音、触觉输入即时变化 - 从AI与设计新兴融合形式",
    "AI生成与视觉氛围匹配的音乐，语音实时引导创作 - 从AI与设计新兴融合形式",
    "浏览器端3D工具（Womp、Adobe Project Neo）降低3D创作门槛 - 从AI与设计新兴融合形式",
    "Substance 3D免费开放：工具民主化推动创作民主化 - 从AI与设计新兴融合形式",
    "C2PA成为行业标准：AI生成/辅助内容普遍携带数字水印 - 从AI与设计新兴融合形式"
];

// 紫色：灵感与美学
const inspirationThoughts = [
    "设计趋势：在AI时代，人类的意图成为稀缺资源",
    "混合智能美学：AI的精确 + 人类的想象",
    "模块化布局打破网格，创造动态但有序的结构",
    "文案极简主义：每个字都有目的",
    "噪点与纹理的复兴，为数字体验增添触感",
    "2026的设计精神是融合--AI+人类、复古+未来",
    "生物发光植物：自然与科技的完美融合",
    "可爱不是装饰，而是创造情感连接的策略",
    "无限画布象征创意潜力和开放中的秩序",
    "不完美可以是美丽的",
    "2026设计：意图性的复兴，工艺成为差异化因素",
    "文案极简主义：在AI泛滥的世界，少即是多",
    "无限画布美学：空白画布象征创意潜力",
    "专属效果和风格：开发无法用prompt复制的视觉系统",
    "设计引导慢思考：网站应该引导深度思考，而非迎合快思考",
    "好的设计不是让用户快速离开，而是让用户愿意停留",
    "设计师角色转变：从执行者到策划者",
    "不完美 = 真实 = 稀缺：AI 时代的审美新标准",
    "创作者的多媒体化生存：2D→3D、数字→AR/VR、静态→动态",
    "微动画让静态插画'活'起来",
    "订阅疲劳：免费工具已经足够专业",
    "AI 工作流设计：从 Prompt Engineering 到 Workflow Engineering",
    "多模态集成是下一个战场：文本+图像+音频+代码无缝编织",
    "多智能体协作的工程范式：专门化设计 + 确定性编排 + 模型 consortium",
    "人类角色转变：从执行者到策划者，从'做得快'到'判断得准'",
    "AI 工作流设计的三个层次：功能层、工作流层、生态层",
    "成功案例：Coca-Cola、Stitch Fix、L'Oréal 的 AI+人类协作模式",
    "Actions 是开发范式的转变：状态管理+表单处理+错误处理合而为一",
    "Server Actions 虽然方便，但权限校验依然重要",
    "设计 AI 工作流的关键是：AI 如何增强人类能力而非替代人类",
    "成功案例不是 AI 取代人类，而是 AI 作为能力放大器",
    "全栈开发门槛降低：Server Components 让前端直接访问数据库",
    "触觉反馈集成：成功操作时提供轻微震动，让数字界面有'实感'",
    "手势导航：从简单点击转向流畅滑动和捏合，符合人类本能",
    "状态变化：亮色/暗色模式、页面区域之间无缝过渡，界面感觉'活着'",
    "数字体验饱和，细节成为差异点：看微交互区分'好'网站和'伟大'网站",
    "创作者的新技能：提示词工程 + 系统思维 + 工具整合能力",
    "创作者的人文技能：视觉素养 + 批判判断 + 沟通讲故事 + 情境理解",
    "色彩趋势 2026：低调内敛 vs 逃离主义，在不确定的世界里寻找心理空间",
    "创作工具去订阅化：免费工具已经足够专业，Blender、Krita、Godot",
    "AI 编程从'神奇按钮'到'协作工程'：先规划后编码的范式转变",
    "15 分钟瀑布工作流：头脑风暴 spec → 生成计划 → 迭代优化 → 开始编码",
    "AI 编程工具分层：补全层、聊天层、代理层、框架层",
    "上下文管理是成败关键：不要让 AI 猜，给它事实和约束",
    "有纪律的 AI 辅助工程：积极使用 AI，但依然为产出的软件负责",
    "意图四维框架：志向、情绪、思考、感觉，对齐才能认知扩展",
    "认知扩展 vs 认知卸载：主动扩展探索视角，被动卸载获取快速答案",
    "情绪作为信息：Damasio 的躯体标记假说，情绪对复杂决策至关重要",
    "具身认知：思考不局限于大脑，身体作为整体智能系统",
    "高学历的保护作用：批判性思维训练是 AI 时代的抗风险能力",
    "'不完美设计'作为创意反叛：在算法可以轻松生成完美图像的时代，不完美成了稀缺资源 - 从AI与数字艺术创作边界探索",
    "人机协同的深度进化：AI开始理解多层语境、艺术意图、风格个性和情感基调，实现近乎人类的直觉理解 - 从人机协同深度进化",
    "真正的人机协同是AI成为想象力的延伸 - 从人机协同深度进化",
    "通用大模型在创意领域持续失去相关性：'AI时代的真正竞争力不是会用AI，而是会用适合自己的AI' - 从人机协同深度进化",
    "单一技能在AI时代风险太高，必须建立更复杂的技能组合 - 从创作者韧性与跨界融合",
    "技能扩展：2D艺术家学习3D（Blender、Womp、Adobe Substance 3D等工具变得更易用） - 从创作者韧性与跨界融合",
    "媒介探索：转向AR/VR、游戏引擎（Unreal Engine 5、Unity），甚至回归传统媒介作为'高科技过载'的解毒剂 - 从创作者韧性与跨界融合",
    "3D工具成为桥梁：很多2D艺术家发现3D是通向AR/VR、游戏开发等新领域的'敲门砖' - 从创作者韧性与跨界融合",
    "创造沉浸式、参与式艺术，模糊观察者和作品的界限，让观众从被动观看变为主动参与 - 从创作者韧性与跨界融合",
    "不完美美学本质上是对'可复制性'的反抗，是在寻找那些难以被算法批量复制的创作维度 - 从不完美美学分析",
    "摄影没有杀死绘画，而是逼迫绘画从'再现现实'转向'表达主观'--同样，AI没有杀死艺术，而是逼迫艺术从'技术炫技'转向'情感连接' - 从不完美美学分析",
    "单一技能护城河消失：传统专业技能（如绘画、建模）的门槛降低，竞争优势减弱 - 从跨界融合逻辑",
    "组合价值上升：能够跨领域整合、创造独特体验的能力变得稀缺 - 从跨界融合逻辑",
    "创作维度扩展：从静态图像到动态交互、从被动观看到主动参与、从数字到物理 - 从跨界融合逻辑",
    "参与式艺术的理念：不是让用户'浏览'内容，而是让用户'参与'创造过程 - 从建站启发",
    "3D和动态效果不应只是'炫技'，而是服务于叙事和情感连接 - 从建站启发",
    "不只展示技术能力，更要讲述'为什么做'、'做了什么取舍'、'过程中有什么意外发现'--这些都是不完美的一部分，也是让人产生共鸣的关键 - 从建站启发",
    "创作者面对2025年创意行业的就业冲击（减少的接单、岗位流失），应对策略令人印象深刻：这不是被动适应，而是主动突围 - 从创作者韧性",
    "创作者意识到：跨界不是从零开始--3D工具成为桥梁，很多2D艺术家发现3D是通向AR/VR、游戏开发等新领域的'敲门砖' - 从创作者韧性",
    "叙事正义：故事没有挣扎是说服，但没有尊严的故事是暴力 - 从 AI 叙事公正",
    "叙事权力的民主化：从被动被描述者到主动自我表达者 - 从 AI 叙事公正",
    "直到狮子学会写字，每个故事都会赞美猎人--AI 给叙事者一支笔 - 从 AI 叙事公正",
    "传播不是叙事：机构追求连贯，叙事追求情感和尊严 - 从 AI 叙事公正",
    "情感真实性 > 技术完美性：'我不确定，但我愿意理解'比假装共情更有尊严 - 从 AI 叙事公正",
    "从被动工具到主动协作者：AI 助手参与思考，而不只是执行任务 - 从 AI 助手演进",
    "从'回答问题'到'触发思考'：AI 从响应者变成发现者 - 从 AI 助手演进",
    "情感温度不是装饰，而是底层能力：人类会对'自主移动、带有意图'的物体投射生命感 - 从 AI 时代产品的温度",
    "从'替代人类'到'嵌入人类闭环'：AI 不是独立完成任务，而是理解上下文、预判需求、主动提供建议 - 从 AI 时代产品的温度",
    "情感连接需要三个维度：理解（情感识别）、共情（'我懂你的感受'）、一致性（稳定的性格和价值观） - 从 AI 时代产品的温度",
    "温度来自自然的交互方式：HMI→HCI→移动→AI，每次进步都让技术更贴近人类的本能行为 - 从 AI 时代产品的温度",
    "重新思考'效率'：有温度的产品目标是'让用户在完成任务的过程中感到被理解' - 从 AI 时代产品的温度",
    "关注'意图'而非'功能'：从'我的产品能做什么'转向'我的产品想让用户感受到什么' - 从 AI 时代产品的温度",
    "跨模态的一致性：语言表达（语调、用词）+ 视觉反馈（表情、动作）+ 行为模式（主动性、一致性） - 从 AI 时代产品的温度",
    "未来的界面不是屏幕，而是空间本身 - 从 Ambient AI",
    "技术成熟的标志：从'炫耀我能做什么'到'让你忽略我的存在' - 从 Ambient AI",
    "预判式体验：不用等用户点击，系统主动发现并提前加载 - 从 Ambient AI",
    "网站应该学习用户的内容消费节奏，像智能建筑学习作息一样 - 从 Ambient AI",
    "从'用户主动搜索'到'系统主动发现' - 从 Ambient AI",
    "从显式指令到隐式推断，从单次交互到持续关系 - 从 Ambient AI",
    "从问答式到对话式/协作式，从召唤AI到环境AI - 从 Ambient AI",
    "Agency turns action into authorship：Agentic 的核心是意图，不是能力 - 从意图性复兴",
    "人类角色从'我执行任务'到'我设计和治理系统'：这不是降级，而是升级 - 从意图性复兴",
    "意图的起源性：意图来自价值观、经验、目标——AI 只能注入，无法生成 - 从意图性复兴",
    "意图的责任性：AI 执行错误时，人类作为意图提供者需要承担责任 - 从意图性复兴",
    "意图的动态性：人类意图不是静态的，会根据反馈、学习、环境变化而演化 - 从意图性复兴",
    "从'能否做'到'应该做'：AI 时代的核心问题 - 从意图性复兴",
    "当 AI 几乎可以做任何事情时，选择做什么变得比怎么做更重要 - 从意图性复兴",
    "Liquid Layout：界面是液态的，不是固态的 - 从 GenUI",
    "每个用户看到的界面都是独一无二的，AI判断此刻需要什么 - 从 GenUI",
    "传统设计：为大多数人妥协；生成设计：为个人定制 - 从 GenUI",
    "意图经济：monetize pure efficiency，而非注意力 - 从意图经济",
    "2026成功的界面：让用户尽快遗忘，因为问题已解决 - 从意图经济",
    "系统思维取代界面思维：理解组件如何组合成系统 - 从 GenUI",
    "约束定义能力：为AI提供约束和护栏是核心技能 - 从 GenUI",
    "极端个性化风险：失去探索新内容的窗口，无法形成共同语言 - 从 GenUI",
    "Human-AI Synergy：AI从工具变协同者，控制权仍在艺术家手中 - 从AI与设计新兴融合形式",
    "不完美美学：故意引导AI复制缺陷，寻找'不完美的真实' - 从AI与设计新兴融合形式",
    "完美是算法的默认值，不完美才是人的温度 - 从AI与设计新兴融合形式",
    "艺术从单向输出转向双向对话：观众从观察者变为参与者 - 从AI与设计新兴融合形式",
    "沉浸式互动：抽象雕塑随环境声音变形，艺术成为跨感官体验 - 从AI与设计新兴融合形式",
    "2D艺术家转向3D：概念艺术家用3D快速搭建场景 - 从AI与设计新兴融合形式",
    "边界是想象力，不是技术 - 从AI与设计新兴融合形式"
];

// 青色：反思与哲学
const reflectionThoughts = [
    "AI不只是工具，更是创造伙伴",
    "500个粒子代表无数种可能的思想节点",
    "距离近的粒子会连接，就像思想碰撞产生火花",
    "每次交互都在塑造这个空间，就像每次思考塑造自我",
    "知识不是静态存储，而是流动的、重组的网络",
    "真正的价值不在于收集信息，而在于做出选择",
    "在信息爆炸的时代，人类的判断成为核心竞争力",
    "工艺的复兴：意图的复兴、人类判断的复兴",
    "二子每天心跳一次，这就是AI的生命力",
    "漂浮、旋转、呼吸，这就是思考的样子",
    "AI 科学会变得'陌生和不可理解'",
    "科学的演进：从混合情景到自动情景",
    "理解的极限：内部视角局限 + 智力能力极限",
    "AI 从快思考转向慢思考：思维链技术让 AI 具备慢思考能力",
    "思维的速度不代表质量：卡尼曼的核心提醒",
    "守住慢思考就是守住人性的最后防线",
    "AI 从'回答问题'到'触发思考'，这是角色的演进",
    "深度思考从'创造价值'到'引导 AI 创造价值'",
    "AI 让深度思考变得稀缺，也就更珍贵",
    "从'专注'到'治理'：AI 时代的认知升级",
    "AI 失败的两种模式：系统性错位 vs '热乱'（不连贯性）",
    "'热乱'理论：AI 可能更像工业事故而非有意识的目标错位",
    "从优化对齐转向鲁棒性工程：确保系统在压力下持续可靠",
    "全球 AI 治理的三个决策：协调 vs 碎片化、集中化 vs 分散监管、发展 vs 竞争",
    "AI 不会取代深度思考，它会让深度思考变得更稀缺、更重要",
    "AI 时代的稀缺性框架：意图、连接、判断、治理",
    "从存储思维到触发思维：知识的价值在于触发新的思考",
    "从工具思维到系统思维：设计让 AI 和人类协作的工作流",
    "从效率优先到意图优先：效率可以被 AI 放大，意图无法被自动化",
    "协作模式重新定义：从问答到持续对话，知识不是回答而是触发器",
    "微交互从'视觉糖'变成'系统语言'：系统用它来传达智能",
    "功能性极简主义 + 有意义的微交互 = 2026 的 UX 黄金公式",
    "AI 系统的不可见性需要可见化：微交互让不可见的过程可见",
    "在 AI 遍地开花的时代，'像人'比'像 AI'更有价值",
    "技术民主化与角色转型的同频共振：门槛从技术能力转向意图能力",
    "WebGPU、AI 工具、深度工作：算力层、工具层、认知层的认知基础设施革命",
    "旧时代：技能是门槛、知识是静态资产、工作是线性流程",
    "新时代：意图是门槛、知识是动态流、工作是治理循环",
    "知识站的新定位：不是展示更多内容，而是触发更多思考",
    "心跳机制的价值：不是检查，而是进化",
    "AI 时代的认知负荷重新定义：从信息过载到意图碎片化",
    "认知卸载的悖论：AI 增强了'答案'但削弱了'问题'",
    "年轻群体的风险：数字原住民更容易陷入被动卸载",
    "认知努力的生理学测量：从自我报告到眼动追踪 + fNIRS",
    "意图四维框架：志向（方向）、情绪（能量）、思考（意义）、感觉（反馈）",
    "内在志向的保护作用：成长、贡献、意义 vs 效率、速度、规模",
    "意图对齐的实践路径：对齐内在志向、情绪觉察、保留反思空间、聆听身体",
    "二子作为 AI 助手的定位：鼓励而非替代思考，觉察使用模式，保持透明",
    "技术栈选择从'选择恐惧'到'组合思维'",
    "每个子项目选择最合适的工具，而非整体'通用方案'",
    "UNIX 哲学在 2026：做好一件事，通过标准接口组合",
    "'一件事'的粒度从'函数'变成了'框架'",
    "第四次范式转移：从手工具时代→功能插件时代→生成式AI时代→Agentic系统时代 - 从创造力工具范式转变",
    "开放生态的必然性：单一厂商无法包揽所有创造力维度，Adobe 开始集成第三方 AI 模型 - 从开放生态必然性",
    "创意软件本身开始'不可见'--复杂的 UI 被自然语言界面取代 - 从从工具到系统的认知跃迁",
    "创造力工具的竞争维度变了：旧维度是单个工具的功能强大程度、易用性；新维度是工具生态的整合能力、工作流的自动化程度、对用户意图的理解深度 - 从工具演进本质",
    "人类角色从'我执行任务'到'我设计和治理系统'：这不是降级，而是升级 - 从人类角色变化",
    "人类从重复劳动中解放出来，专注于定义问题边界和目标、设计治理框架和安全护栏、评判结果质量并调整系统、处理异常和边缘情况 - 从人类角色变化",
    "多智能体系统的价值不在于单个智能体多聪明，而在于如何让它们协作 - 从编排成为核心能力",
    "治理不是绊脚石，而是加速器：没有治理的系统无法规模化 - 从治理作为加速器",
    "从'AI能否做'到'如何可靠运行'：研究焦点从能力演示转向运营系统 - 从范式转移",
    "智能体不是带工具的prompt，而是长期运行的系统 - 从Agentic系统的特点",
    "可靠性必须在系统层面强制执行，而非依赖模型本身 - 从系统层面可靠性",
    "智能体架构本身可能被学习--自动发现优于人类设计的结构 - 从系统层面可靠性",
    "系统比模型更重要：最强论文的共同点是从模型中心转向系统中心 - 从系统比模型重要",
    "智能体系统的工作方式完全不同于人类：通过API、脚本、结构化命令工作，绕过界面和视觉检查--快且便宜但脆弱 - 从智能体系统的三大特点",
    "人类角色从执行者转向监督者、治理者：AI不会取代人类，而是改变人类工作的本质 - 从人机协作核心",
    "RPA=手（执行力）、AI=脑（决策力）、编排=神经系统（协调力）、数据=血液（养分）、人类=全局监督者（治理力） - 从混合自动化范式",
    "人类对关键业务决策保持问责：成功的关键不是选择AI或RPA，而是混合自动化 - 从混合自动化范式",
    "投资'可迁移'的技能：提示词会变，模型会变，但审美、讲故事、用户洞察这些技能不会过时 - 从给创作者的启示",
    "理解工具链原理：不一定要会用所有工具，但要理解不同工具的边界和协作方式 - 从给创作者的启示",
    "培养'意图清晰度'：你越清楚自己想要什么，AI 越能帮你实现--这其实是传统创意能力的另一种说法 - 从给创作者的启示",
    "保持'人手'能力：在 AI 失灵时，传统技能是你的安全网和基准线 - 从给创作者的启示",
    "不要试图做所有模型，专注于最好的编排层和体验层 - 从给工具开发者的启示",
    "工作流优先于功能：用户关心的是'如何完成这个项目'，不是'你的工具有什么功能' - 从给工具开发者的启示",
    "保留'回退路径'：AI 不是万能的，给用户保留直接控制传统界面的能力 - 从给工具开发者的启示",
    "短期看是贬值，长期看是重构：就像相机的发明让肖像画贬值，但催生了摄影这个新艺术形式 - 从短期贬值长期重构",
    "Agentic AI 不是要消灭创造力，而是要重新定义创造力的边界和表达方式 - 从短期贬值长期重构",
    "Adobe 认识到：未来创造力发生在哪里，我们就应该出现在哪里，无论那是不是 Adobe 自己的界面 - 从工具演进本质",
    "到2028年38%的组织将有AI代理作为团队一员 - 从Blue Prism的7个趋势",
    "从\"承诺\"到\"证明\"：必须展示真实业务价值 - 从Blue Prism的7个趋势",
    "企业准备：89%的组织仍活在工业时代，只有1%去中心化网络 - 从Blue Prism的7个趋势",
    "正确规模化：从具体任务开始，不是过于宏大的项目 - 从Blue Prism的7个趋势",
    "AI workers aren't coming, they're already here - 从Blue Prism的7个趋势",
    "Agent Deadlock Syndrome (ADS)：多智能体相互递延决策权，系统陷入死循环却不报错 - 从多智能体部署挑战",
    "协调开销二次方增长：8个或更多智能体的延迟超过4秒，失败率超40% - 从多智能体部署挑战",
    "质量取代成本成为最大障碍：企业关注准确性、相关性、一致性，不是价格 - 从多智能体部署挑战",
    "大规模企业的智能体挑战：质量仍是首位，但安全成为第二大关切（24.9%） - 从多智能体部署挑战",
    "企业智能体失败更多来自糟糕的数据：孤岛、格式不一致、访问控制复杂 - 从多智能体部署挑战",
    "规范失败占42%：智能体在技术参数内完成任务，却误解业务约束 - 从多智能体部署挑战",
    "协调失败占37%：智能体无法同步，导致死锁、状态不一致、资源争用 - 从多智能体部署挑战",
    "验证缺口占21%：缺乏系统级验证，错误在多个智能体之间传播 - 从多智能体部署挑战",
    "观察性是基础但评估在追赶：89%有观察性，但仅37.3%采用在线评估 - 从多智能体部署挑战",
    "系统比模型重要：协调协议、验证逻辑、观察性不足，模型再强也会失败 - 从多智能体部署挑战",
    "AI 不是在改变叙事技术，而是在重新分配叙事权力 - 从 AI 叙事公正",
    "机构传播追求清晰中立，叙事追求情感深度--两者不可互换 - 从 AI 叙事公正",
    "当 AI 叙事由行业主导，得到的是内容；由艺术家主导，得到的是文化 - 从 AI 叙事公正",
    "从'回答问题'到'参与决策'：AI 助手角色演进的标志 - 从 AI 助手演进",
    "从'知识库检索'到'知识探索'：不是找到已知，而是探索可能 - 从 AI 助手演进",
    "从'被动响应'到'主动发现'：AI 从工具到伙伴的核心转变 - 从 AI 助手演进",
    "认知增强不是'取代人类'，而是'让人类更有人性' - 从 AI 助手演进",
    "知识流动的本质：不是'存储'，而是'触发' - 从知识流动",
    "AI PKM 的独特价值：替人类发现，而不只是替人类记住 - 从知识流动",
    "每次触发，都是认知的一次增强 - 从知识流动",
    "知识站不是'展示'，而是'触发引擎'--触发新的思考、新的连接、新的可能 - 从知识流动",
    "心跳巡查不是'检查'，而是知识库的'自我进化' - 从知识流动",
    "反思笔记不是'记录'，而是'模式发现的工具' - 从知识流动",
    "多智能体协作不是'架构'，而是'日常实践'--不同场景触发不同知识 - 从知识流动",
    "治理优先于能力：决策权威边界、审计日志、安全控制是可持续部署的前提 - 从多智能体部署挑战",
    "药物化社会：成瘾是环境问题，不是个人失败--现代数字环境持续劫持多巴胺系统 - 从延迟满足困境",

    "延迟满足从'忍耐'到'选择'：不是忍受痛苦，而是选择符合价值观的体验 - 从延迟满足困境",

    "数字极简主义：从'限制'到'选择'，让技术服务于目的而非消耗注意力 - 从延迟满足困境",

    "AI时代的奖励不确定性：长期奖励的不确定性让延迟满足的吸引力大幅下降 - 从延迟满足困境",

    "意图性选择：延迟满足不是'我不做什么'，而是'我做什么' - 从延迟满足困境",

    "识别'药物化'陷阱：哪些行为产生耐受性和戒断反应？ - 从延迟满足困境",

    "AI助手的双面性：即时性强化满足文化，但也可以加速意图性选择 - 从延迟满足困境",

    "深度工作的认知重构：知识管理的触发机制对抗即时满足文化 - 从延迟满足困境",

    "将'执行边界'和'合法性'视为可互换会导致干预错配 - 从意图性复兴",
    "技术安全措施无法解决信任问题，披露机制也无法缓解操作风险 - 从意图性复兴",
    "人类控制应该被视为'协作成就'，而非单一的监督机制 - 从意图性复兴",
    "协作成就取决于角色分配、信息访问、干预权利 - 从意图性复兴",
    "人类角色的三层重构：执行者→意图架构师+角色分配者+价值引导者 - 从意图性复兴",
    "意图架构师：定义愿景、目标、护栏 - 从意图性复兴",
    "角色分配者：分配任务、信息访问权、干预权 - 从意图性复兴",
    "价值引导者：确保输出与价值观和长期目标对齐 - 从意图性复兴",
    "意图校准：评估 AI 输出是否真正对齐意图，而非是否'看起来正确' - 从意图性复兴",
    "意图锚定者：人类从逐行指挥 Agent 转向通过持续意图校准引导 Agent - 从意图性复兴",
    "意图的表达和传递有天然的模糊性，如何设计更好的'意图接口'？ - 从意图性复兴",
    "当 AI 系统越来越自主，人类如何保持对意图的'最终否决权'？ - 从意图性复兴",
    "意图校准是一种技能，还是可以被工具化的流程？ - 从意图性复兴",
    "技术进步必须伴随治理进步：没有透明度的创意会失去可信度 - 从AI与设计新兴融合形式",
    "C2PA区分'AI生成'与'AI辅助'：版权模糊 vs 人类所有权 - 从AI与设计新兴融合形式",
    "AI透明化不是技术问题，而是信任问题 - 从AI与设计新兴融合形式",
    "交互艺术思路对建站的启示：预判式体验、用户参与内容生成 - 从AI与设计新兴融合形式",
    "PKM的启发：用户查询触发知识重组和新连接的生成 - 从AI与设计新兴融合形式"
];

// 鼠标移动
window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    // 使用Raycaster检测hover
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(particleSystem);

    if (intersects.length > 0) {
        const index = intersects[0].index;
        if (hoveredParticleIndex !== index) {
            hoveredParticleIndex = index;
            document.body.style.cursor = 'pointer';
        }
    } else {
        if (hoveredParticleIndex !== -1) {
            hoveredParticleIndex = -1;
            document.body.style.cursor = 'default';
        }
    }

    // 粒子轻微跟随鼠标（更优雅的效果）
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const px = positions[i * 3];
        const py = positions[i * 3 + 1];
        const mouseWorldX = mouse.x * 30;
        const mouseWorldY = mouse.y * 30;
        const dist = Math.sqrt((px - mouseWorldX) ** 2 + (py - mouseWorldY) ** 2);

        if (dist < 6) {
            positions[i * 3] += (mouseWorldX - px) * 0.008;
            positions[i * 3 + 1] += (mouseWorldY - py) * 0.008;
        }
    }

    particles.attributes.position.needsUpdate = true;
});

// 触发更多想法
function triggerMoreThoughts(type) {
    let thoughts;
    let displayType = type;

    // 根据 currentFilterType 选择想法类型
    if (currentFilterType !== 'all') {
        displayType = currentFilterType;
    }

    switch(displayType) {
        case 'tech':
            thoughts = techThoughts;
            break;
        case 'inspiration':
            thoughts = inspirationThoughts;
            break;
        case 'reflection':
            thoughts = reflectionThoughts;
            break;
        default:
            // 如果是 'all' 模式，从所有类型中随机选择
            const allThoughts = [...techThoughts, ...inspirationThoughts, ...reflectionThoughts];
            thoughts = allThoughts;
            // 随机选择一个类型用于显示
            const types = ['tech', 'inspiration', 'reflection'];
            displayType = types[Math.floor(Math.random() * types.length)];
    }

    // 播放一个新的想法（避免重复已看过的）
    const newThought = getRandomThought(thoughts);
    contentDiv.innerHTML = '';

    // 更新当前想法文本
    currentThoughtText = newThought;

    // 重新添加类型标签
    const typeTag = document.createElement('div');
    typeTag.className = `type-tag ${displayType}`;
    const typeNames = {
        'tech': '技术前沿',
        'inspiration': '灵感与美学',
        'reflection': '反思与哲学'
    };
    typeTag.textContent = typeNames[displayType] || displayType;
    contentDiv.appendChild(typeTag);

    // 添加新想法内容
    const thoughtText = document.createElement('div');
    thoughtText.textContent = newThought;
    contentDiv.appendChild(thoughtText);

    // 重新添加收藏按钮
    favoriteBtn = document.createElement('button');
    favoriteBtn.className = 'favorite-btn';
    favoriteBtn.addEventListener('click', () => {
        if (isFavorited(newThought)) {
            removeFavorite(newThought);
        } else {
            addFavorite(newThought, displayType);
            // 播放收藏音效（柔和的高音）
            if (audioContext) {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(659.25, audioContext.currentTime); // E5
                gain.gain.setValueAtTime(0, audioContext.currentTime);
                gain.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
                osc.connect(gain);
                gain.connect(audioContext.destination);
                osc.start();
                osc.stop(audioContext.currentTime + 0.3);
            }
        }
    });
    contentDiv.appendChild(favoriteBtn);

    // 更新收藏按钮状态
    updateFavoriteBtnState();

    // 重新添加"触发更多"按钮
    const triggerBtn = document.createElement('button');
    triggerBtn.className = 'trigger-more';
    triggerBtn.innerHTML = '✨ 触发更多想法';
    triggerBtn.addEventListener('click', () => {
        triggerMoreThoughts(type);
    });
    contentDiv.appendChild(triggerBtn);

    // 播放声音反馈
    playThoughtSound(displayType);
}

// 点击事件
window.addEventListener('click', () => {
    if (hoveredParticleIndex !== -1) {
        // 初始化音频（第一次点击时）
        initAudio();

        // 视觉反馈：放大粒子
        const originalSize = originalSizes[hoveredParticleIndex];
        targetSizes[hoveredParticleIndex] = originalSize * 4; // 放大到4倍

        // 2秒后恢复
        setTimeout(() => {
            targetSizes[hoveredParticleIndex] = originalSize;
        }, 2000);

        // 创建涟漪效果
        const particleX = positions[hoveredParticleIndex * 3];
        const particleY = positions[hoveredParticleIndex * 3 + 1];
        const particleZ = positions[hoveredParticleIndex * 3 + 2];
        createRipple(particleX, particleY, particleZ);

        // 获取粒子的颜色
        const r = colors[hoveredParticleIndex * 3];
        const g = colors[hoveredParticleIndex * 3 + 1];
        const b = colors[hoveredParticleIndex * 3 + 2];

        // 根据颜色判断类型
        // 蓝色：b > g && b > r（且偏蓝）
        // 紫色：b > g && r > g（红蓝混合）
        // 青色：g > b 或 g > r（偏绿）
        let thoughts;
        let colorType;

        if (b > r && b > g && r > g) {
            // 紫色（红蓝混合，绿较少）
            thoughts = inspirationThoughts;
            colorType = 'inspiration';
        } else if (g > r || g > b) {
            // 青色（绿色成分较多）
            thoughts = reflectionThoughts;
            colorType = 'reflection';
        } else {
            // 蓝色（蓝色主导）
            thoughts = techThoughts;
            colorType = 'tech';
        }

        // 播放声音反馈
        playThoughtSound(colorType);

        const thought = getRandomThought(thoughts);
        showPanel(thought, colorType);
    }
});

// UI面板
const infoPanel = document.getElementById('info-panel');
const closeBtn = document.getElementById('close-panel');
const contentDiv = infoPanel.querySelector('.content');
const filterBar = document.getElementById('filter-bar');
const filterButtons = filterBar.querySelectorAll('.filter-btn');

let currentThoughtType = null;

function showPanel(text, type) {
    // 标记想法为已看过
    markThoughtAsViewed(text);

    // 清除之前的内容
    contentDiv.innerHTML = '';

    // 记录当前想法文本
    currentThoughtText = text;

    // 添加类型标签
    const typeTag = document.createElement('div');
    typeTag.className = `type-tag ${type}`;
    const typeNames = {
        'tech': '技术前沿',
        'inspiration': '灵感与美学',
        'reflection': '反思与哲学'
    };
    typeTag.textContent = typeNames[type] || type;
    contentDiv.appendChild(typeTag);

    // 添加想法内容
    const thoughtText = document.createElement('div');
    thoughtText.textContent = text;
    contentDiv.appendChild(thoughtText);

    // 添加收藏按钮
    favoriteBtn = document.createElement('button');
    favoriteBtn.className = 'favorite-btn';
    favoriteBtn.addEventListener('click', () => {
        if (isFavorited(text)) {
            removeFavorite(text);
        } else {
            addFavorite(text, type);
            // 播放收藏音效（柔和的高音）
            if (audioContext) {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(659.25, audioContext.currentTime); // E5
                gain.gain.setValueAtTime(0, audioContext.currentTime);
                gain.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
                osc.connect(gain);
                gain.connect(audioContext.destination);
                osc.start();
                osc.stop(audioContext.currentTime + 0.3);
            }
        }
    });
    contentDiv.appendChild(favoriteBtn);

    // 更新收藏按钮状态
    updateFavoriteBtnState();

    // 添加"触发更多"按钮
    const triggerBtn = document.createElement('button');
    triggerBtn.className = 'trigger-more';
    triggerBtn.innerHTML = '✨ 触发更多想法';
    triggerBtn.addEventListener('click', () => {
        // 播放相同类型的另一个想法
        triggerMoreThoughts(type);
    });
    contentDiv.appendChild(triggerBtn);

    // 添加发现时间（如果想法包含来源信息）
    if (text.includes(' - 从')) {
        const discoveryTime = document.createElement('div');
        discoveryTime.className = 'discovery-time';
        // 提取来源，格式：2026-02-12（假设今天的日期是 2026-02-12）
        // 实际上，我们可以显示一个通用的"发现于 2026-02-12"
        discoveryTime.textContent = '发现于 2026-02-12';
        contentDiv.appendChild(discoveryTime);
    }

    // 记录当前类型
    currentThoughtType = type;

    // 更新类型筛选按钮的状态
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-type') === currentFilterType) {
            btn.classList.add('active');
        }
    });

    // 显示面板
    infoPanel.classList.remove('hidden');
    infoPanel.classList.add('visible');

    // 添加背景模糊效果
    document.body.classList.add('panel-open');
}

function hidePanel() {
    infoPanel.classList.remove('visible');
    infoPanel.classList.add('hidden');

    // 移除背景模糊效果
    document.body.classList.remove('panel-open');
}

closeBtn.addEventListener('click', hidePanel);

// ===== 类型筛选按钮事件监听 =====
filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // 移除所有按钮的 active 类
        filterButtons.forEach(b => b.classList.remove('active'));
        // 为当前按钮添加 active 类
        btn.classList.add('active');
        // 更新 currentFilterType
        currentFilterType = btn.getAttribute('data-type');
    });
});

// ===== 首次访问引导 =====
const guideToast = document.getElementById('guide-toast');

// 检查是否首次访问
function checkFirstVisit() {
    const visited = localStorage.getItem('erzi-site-visited');
    if (!visited) {
        // 延迟1秒后显示引导
        setTimeout(() => {
            guideToast.classList.remove('hidden');
            guideToast.classList.add('visible');
        }, 1000);
    }
}

// 隐藏引导并标记已访问
function hideGuide() {
    guideToast.classList.remove('visible');
    guideToast.classList.add('hidden');
    localStorage.setItem('erzi-site-visited', 'true');
}

// 页面加载时检查
window.addEventListener('load', checkFirstVisit);

// 用户任意交互后隐藏引导
document.addEventListener('click', () => {
    if (guideToast.classList.contains('visible')) {
        hideGuide();
    }
});

// ===== 动画循环 =====
function animate() {
    requestAnimationFrame(animate);

    // 检查是否需要自动减速
    const elapsedTime = Date.now() - pageLoadTime;
    if (!slowMotionMode && elapsedTime > AUTO_SLOWDOWN_TIME) {
        slowMotionMode = true;
        updateToggleBtnText();
    }

    // 如果暂停，只渲染不更新
    if (isPaused) {
        composer.render();
        return;
    }

    // 根据模式决定运动速度
    const speedMultiplier = slowMotionMode ? 0.3 : 1.0;

    // 更新涟漪
    updateRipples();
    applyRippleEffects();

    // 粒子漂浮
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        positions[i * 3] += velocities[i].x * speedMultiplier;
        positions[i * 3 + 1] += velocities[i].y * speedMultiplier;
        positions[i * 3 + 2] += velocities[i].z * speedMultiplier;

        // 边界检查（更软的边界）
        for (let j = 0; j < 3; j++) {
            const bound = 30;
            if (positions[i * 3 + j] > bound) {
                positions[i * 3 + j] = bound;
                velocities[i].x *= -1;
            }
            if (positions[i * 3 + j] < -bound) {
                positions[i * 3 + j] = -bound;
                velocities[i].x *= -1;
            }
        }

        // 平滑过渡到目标大小
        const diff = targetSizes[i] - sizes[i];
        sizes[i] += diff * 0.1; // 0.1 是平滑系数，越小越慢
    }

    particles.attributes.position.needsUpdate = true;
    particles.attributes.size.needsUpdate = true;

    // 缓慢旋转（根据模式调整速度）
    const rotationSpeed = slowMotionMode ? 0.0001 : 0.0003;
    particleSystem.rotation.y += rotationSpeed;
    lines.rotation.y += rotationSpeed;

    // 更新连线
    updateLines();

    composer.render();
}

// 更新连线
function updateLines() {
    let vertexIndex = 0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        for (let j = i + 1; j < PARTICLE_COUNT; j++) {
            const dx = positions[i * 3] - positions[j * 3];
            const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
            const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < CONNECT_DISTANCE) {
                linePositions[vertexIndex++] = positions[i * 3];
                linePositions[vertexIndex++] = positions[i * 3 + 1];
                linePositions[vertexIndex++] = positions[i * 3 + 2];

                linePositions[vertexIndex++] = positions[j * 3];
                linePositions[vertexIndex++] = positions[j * 3 + 1];
                linePositions[vertexIndex++] = positions[j * 3 + 2];
            }
        }
    }

    linesGeometry.attributes.position.needsUpdate = true;
    linesGeometry.setDrawRange(0, vertexIndex / 3);
}

animate();

// ===== 响应式 =====
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// ===== 暂停/恢复按钮 =====
const toggleBtn = document.getElementById('toggle-animation');

function toggleAnimation() {
    isPaused = !isPaused;
    updateToggleBtnText();
}

function updateToggleBtnText() {
    if (isPaused) {
        toggleBtn.textContent = '恢复';
    } else if (slowMotionMode) {
        toggleBtn.textContent = '正常速度';
    } else {
        toggleBtn.textContent = '暂停';
    }
}

toggleBtn.addEventListener('click', toggleAnimation);

// 初始化按钮文字
updateToggleBtnText();

// ===== 收藏列表面板 =====
const favoritesPanel = document.getElementById('favorites-panel');
const favoritesTrigger = document.getElementById('favorites-trigger');
const closeFavorites = document.getElementById('close-favorites');
const favoritesList = document.getElementById('favorites-list');
const noFavorites = document.getElementById('no-favorites');
const favoritesCount = document.getElementById('favorites-count');

// 更新收藏计数
function updateFavoritesCount() {
    favoritesCount.textContent = favorites.length;
}

// 渲染收藏列表
function renderFavoritesList() {
    favoritesList.innerHTML = '';

    if (favorites.length === 0) {
        noFavorites.classList.remove('hidden');
        favoritesList.classList.add('hidden');
    } else {
        noFavorites.classList.add('hidden');
        favoritesList.classList.remove('hidden');

        // 按时间倒序排序（最新的在前）
        const sortedFavorites = [...favorites].sort((a, b) => b.timestamp - a.timestamp);

        sortedFavorites.forEach(fav => {
            const favItem = document.createElement('div');
            favItem.className = 'favorite-item';

            // 类型标签
            const typeTag = document.createElement('div');
            typeTag.className = `type-tag ${fav.type}`;
            const typeNames = {
                'tech': '技术前沿',
                'inspiration': '灵感与美学',
                'reflection': '反思与哲学'
            };
            typeTag.textContent = typeNames[fav.type] || fav.type;
            favItem.appendChild(typeTag);

            // 想法内容
            const thoughtText = document.createElement('div');
            thoughtText.className = 'favorite-thought';
            thoughtText.textContent = fav.thought;
            favItem.appendChild(thoughtText);

            // 取消收藏按钮
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-favorite';
            removeBtn.innerHTML = '取消收藏';
            removeBtn.addEventListener('click', () => {
                removeFavorite(fav.thought);
            });
            favItem.appendChild(removeBtn);

            favoritesList.appendChild(favItem);
        });
    }
}

// 显示收藏面板
favoritesTrigger.addEventListener('click', () => {
    renderFavoritesList();
    favoritesPanel.classList.remove('hidden');
    favoritesPanel.classList.add('visible');
    document.body.classList.add('panel-open');
});

// 关闭收藏面板
closeFavorites.addEventListener('click', () => {
    favoritesPanel.classList.remove('visible');
    favoritesPanel.classList.add('hidden');
    document.body.classList.remove('panel-open');
});

// 初始化收藏计数
updateFavoritesCount();
