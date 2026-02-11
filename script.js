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
window.addEventListener('load', loadFavorites);

// UI：收藏按钮状态
let currentThoughtText = '';
let favoriteBtn = null;

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
    "集成降低方差但不可逆任务不切实际：无法让 10 个智能体轮流操作核电站"
];

// 紫色：灵感与美学
const inspirationThoughts = [
    "设计趋势：在AI时代，人类的意图成为稀缺资源",
    "混合智能美学：AI的精确 + 人类的想象",
    "模块化布局打破网格，创造动态但有序的结构",
    "文案极简主义：每个字都有目的",
    "噪点与纹理的复兴，为数字体验增添触感",
    "2026的设计精神是融合——AI+人类、复古+未来",
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
    "成功案例：Coca-Cola、Stitch Fix、L'Oréal 的 AI+人类协作模式"
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
    "AI 不会取代深度思考，它会让深度思考变得更稀缺、更重要"
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
    switch(type) {
        case 'tech':
            thoughts = techThoughts;
            break;
        case 'inspiration':
            thoughts = inspirationThoughts;
            break;
        case 'reflection':
            thoughts = reflectionThoughts;
            break;
    }

    // 播放一个新的想法（避免重复）
    const newThought = thoughts[Math.floor(Math.random() * thoughts.length)];
    contentDiv.innerHTML = '';

    // 更新当前想法文本
    currentThoughtText = newThought;

    // 重新添加类型标签
    const typeTag = document.createElement('div');
    typeTag.className = `type-tag ${type}`;
    const typeNames = {
        'tech': '技术前沿',
        'inspiration': '灵感与美学',
        'reflection': '反思与哲学'
    };
    typeTag.textContent = typeNames[type] || type;
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
            addFavorite(newThought, type);
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
    playThoughtSound(type);
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

        const thought = thoughts[Math.floor(Math.random() * thoughts.length)];
        showPanel(thought, colorType);
    }
});

// UI面板
const infoPanel = document.getElementById('info-panel');
const closeBtn = document.getElementById('close-panel');
const contentDiv = infoPanel.querySelector('.content');

let currentThoughtType = null;

function showPanel(text, type) {
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

    // 记录当前类型
    currentThoughtType = type;

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
