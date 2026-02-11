// 二子的思想粒子系统
// 2026-02-09 - Day 2: 知识网络粒子系统

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

// ===== 粒子系统 =====
const PARTICLE_COUNT = 500;
const CONNECT_DISTANCE = 8; // 连线距离阈值
const particles = new THREE.BufferGeometry();
const positions = new Float32Array(PARTICLE_COUNT * 3);
const colors = new Float32Array(PARTICLE_COUNT * 3);
const sizes = new Float32Array(PARTICLE_COUNT); // 粒子大小
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

// ===== 交互系统 =====
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredParticleIndex = -1;

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
    "从点解决方案到操作系统的范式转变"
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
    "不完美可以是美丽的"
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
    "漂浮、旋转、呼吸，这就是思考的样子"
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

// 点击事件
window.addEventListener('click', () => {
    if (hoveredParticleIndex !== -1) {
        // 获取粒子的颜色
        const r = colors[hoveredParticleIndex * 3];
        const g = colors[hoveredParticleIndex * 3 + 1];
        const b = colors[hoveredParticleIndex * 3 + 2];

        // 根据颜色判断类型
        // 蓝色：b > g && b > r（且偏蓝）
        // 紫色：b > g && r > g（红蓝混合）
        // 青色：g > b 或 g > r（偏绿）
        let thoughts;

        if (b > r && b > g && r > g) {
            // 紫色（红蓝混合，绿较少）
            thoughts = inspirationThoughts;
        } else if (g > r || g > b) {
            // 青色（绿色成分较多）
            thoughts = reflectionThoughts;
        } else {
            // 蓝色（蓝色主导）
            thoughts = techThoughts;
        }

        const thought = thoughts[Math.floor(Math.random() * thoughts.length)];
        showPanel(thought);
    }
});

// UI面板
const infoPanel = document.getElementById('info-panel');
const closeBtn = document.getElementById('close-panel');
const contentDiv = infoPanel.querySelector('.content');

function showPanel(text) {
    contentDiv.textContent = text;
    infoPanel.classList.remove('hidden');
    infoPanel.classList.add('visible');
}

function hidePanel() {
    infoPanel.classList.remove('visible');
    infoPanel.classList.add('hidden');
}

closeBtn.addEventListener('click', hidePanel);

// ===== 动画循环 =====
function animate() {
    requestAnimationFrame(animate);

    // 粒子漂浮
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        positions[i * 3] += velocities[i].x;
        positions[i * 3 + 1] += velocities[i].y;
        positions[i * 3 + 2] += velocities[i].z;

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
    }

    particles.attributes.position.needsUpdate = true;

    // 缓慢旋转（更慢）
    particleSystem.rotation.y += 0.0003;
    lines.rotation.y += 0.0003;

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
