/* 硅基生命体 v2.0 - 核心逻辑 */

// ============================================
// Phase 0: 基础配置
// ============================================

const CONFIG = {
    // 粒子数量（比v1少，更精简）
    PARTICLE_COUNT_DESKTOP: 150,
    PARTICLE_COUNT_MOBILE: 80,
    
    // 呼吸效果（整体脉动）
    BREATH_CYCLE: 10000, // 10秒一个周期
    BREATH_AMPLITUDE: 0.08, // ±8%
    
    // 粒子脉动（个体心跳）
    PULSE_CYCLE_MIN: 5000, // 5秒
    PULSE_CYCLE_MAX: 8000, // 8秒
    PULSE_AMPLITUDE: 0.10, // ±10%
    
    // 思考痕迹（连线）
    CONNECT_DISTANCE: 15,
    CONNECT_OPACITY: 0.15,
    CONNECT_MAX: 300, // 最大连线数量
    
    // 星空背景
    STAR_COUNT: 250,
    STAR_SIZE: 0.5,
    STAR_OPACITY: 0.4,
    
    // 触碰响应（自主性）
    TOUCH_RESPONSE_PROB: 0.65, // 65%概率响应
    
    // 扰动感知（可能靠近/远离/无视）
    PERTURB_ATTRACT_PROB: 0.30, // 30%靠近
    PERTURB_REPEL_PROB: 0.30, // 30%远离
    PERTURB_IGNORE_PROB: 0.40, // 40%无视
    PERTURB_RADIUS: 15, // 扰动影响半径
    
    // 主动展示
    ACTIVE_DISPLAY_INTERVAL: 45000, // 45秒
    ACTIVE_DISPLAY_PROB: 0.25, // 25%概率
    ACTIVE_DISPLAY_DURATION: 3000, // 3秒
    
    // 相关念头
    RELATED_PROB: 0.45, // 45%概率联想
};

// 三种思考频率的颜色（不是"类型"）
const FREQUENCIES = {
    blue: 0x667eea, // 某种思考频率
    purple: 0x764ba2, // 另一种思考频率
    cyan: 0x48bb78, // 第三种思考频率
};

// ============================================
// Phase 0.5: 想法数据
// ============================================

let thoughts = {
    blue: [],
    purple: [],
    cyan: []
};

// 粒子与想法的映射
let particleThoughtMap = [];

// ============================================
// Phase 1: 核心生命感
// ============================================

let scene, camera, renderer;
let particles, particleGeometry, particleMaterial;
let stars, starGeometry;
let connections, connectionGeometry, connectionMaterial;
let clock;
let raycaster, mouse;

// 状态管理
let lastActiveDisplayTime = 0;
let isPeekWindowOpen = false;
let perturbPosition = null;

// 初始化
async function init() {
    // 加载想法数据
    await loadThoughts();
    
    // 场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    
    // 相机
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = 50;
    
    // 渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    
    // 时钟
    clock = new THREE.Clock();
    
    // Raycaster（用于触碰检测）
    raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 3;
    mouse = new THREE.Vector2();
    
    // 创建粒子系统（想法）
    createParticles();
    
    // 创建连线系统
    createConnections();
    
    // 创建星空背景
    createStars();
    
    // 事件监听
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', onTouch);
    renderer.domElement.addEventListener('mousemove', onPerturb);
    document.addEventListener('click', onWindowClick);
    
    // 开始动画
    animate();
    
    // 启动主动展示
    setInterval(checkActiveDisplay, CONFIG.ACTIVE_DISPLAY_INTERVAL);
    
    // U1: 第一次访问提示
    showFirstVisitHint();
}

// 加载想法数据
async function loadThoughts() {
    try {
        const response = await fetch('thoughts.json');
        const data = await response.json();
        thoughts = data;
        console.log('想法数据已加载:', {
            blue: thoughts.blue.length,
            purple: thoughts.purple.length,
            cyan: thoughts.cyan.length
        });
    } catch (error) {
        console.warn('无法加载想法数据，使用默认数据');
        // 如果加载失败，使用默认想法
        thoughts = {
            blue: ["理解优先于创建：AI 真正的价值在于解锁非结构化知识"],
            purple: ["设计趋势：在AI时代，人类的意图成为稀缺资源"],
            cyan: ["AI不只是工具，更是创造伙伴"]
        };
    }
}

// 创建粒子系统
function createParticles() {
    const count = window.innerWidth < 768 
        ? CONFIG.PARTICLE_COUNT_MOBILE 
        : CONFIG.PARTICLE_COUNT_DESKTOP;
    
    particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count); // 每个粒子的脉动相位
    const frequencies = []; // 思考频率（字符串数组）
    const baseSizes = new Float32Array(count); // 基础大小
    const velocities = []; // 速度向量
    
    // 计算每个频率的想法数量
    const frequencyKeys = Object.keys(FREQUENCIES);
    const totalThoughts = thoughts.blue.length + thoughts.purple.length + thoughts.cyan.length;
    
    // 建立粒子与想法的映射
    particleThoughtMap = [];
    let thoughtIndex = { blue: 0, purple: 0, cyan: 0 };
    
    for (let i = 0; i < count; i++) {
        // 位置：松散的星团
        positions[i * 3] = (Math.random() - 0.5) * 60;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
        
        // 随机选择频率
        const freqIndex = Math.floor(Math.random() * frequencyKeys.length);
        const freq = frequencyKeys[freqIndex];
        frequencies.push(freq);
        
        // 颜色
        const color = new THREE.Color(FREQUENCIES[freq]);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        
        // 大小
        baseSizes[i] = 2 + Math.random() * 3;
        sizes[i] = baseSizes[i];
        
        // 脉动相位（每个粒子不同）
        phases[i] = Math.random() * Math.PI * 2;
        
        // 速度
        velocities.push({
            x: (Math.random() - 0.5) * 0.02,
            y: (Math.random() - 0.5) * 0.02,
            z: (Math.random() - 0.5) * 0.02
        });
        
        // 映射想法（如果有想法数据）
        if (thoughts[freq] && thoughts[freq].length > 0) {
            const idx = thoughtIndex[freq] % thoughts[freq].length;
            const thoughtItem = thoughts[freq][idx];
            
            // 支持两种格式：字符串 或 {text, detail}
            if (typeof thoughtItem === 'string') {
                particleThoughtMap.push({
                    frequency: freq,
                    thoughtIndex: idx,
                    thought: thoughtItem,
                    detail: null
                });
            } else {
                particleThoughtMap.push({
                    frequency: freq,
                    thoughtIndex: idx,
                    thought: thoughtItem.text,
                    detail: thoughtItem.detail || null
                });
            }
            thoughtIndex[freq]++;
        } else {
            particleThoughtMap.push({
                frequency: freq,
                thoughtIndex: 0,
                thought: "...",
                detail: null
            });
        }
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // 存储元数据（用于动画）
    particleGeometry.userData = { 
        phases, 
        frequencies,
        baseSizes,
        velocities,
        activeParticles: new Map() // 存储当前活跃的粒子
    };
    
    // 粒子材质（使用 ShaderMaterial 支持动态大小）
    const vertexShader = `
        attribute float size;
        varying vec3 vColor;
        
        void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `;
    
    const fragmentShader = `
        varying vec3 vColor;
        
        void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            
            float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
            gl_FragColor = vec4(vColor, alpha * 0.8);
        }
    `;
    
    particleMaterial = new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
    });
    
    particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
}

// 创建连线系统
function createConnections() {
    connectionGeometry = new THREE.BufferGeometry();
    const maxVertices = CONFIG.CONNECT_MAX * 6; // 每条线2个点，每个点3个坐标
    const positions = new Float32Array(maxVertices);
    const colors = new Float32Array(maxVertices);
    
    connectionGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    connectionGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    connectionMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: CONFIG.CONNECT_OPACITY,
        blending: THREE.AdditiveBlending,
    });
    
    connections = new THREE.LineSegments(connectionGeometry, connectionMaterial);
    scene.add(connections);
}

// 创建星空背景
function createStars() {
    starGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(CONFIG.STAR_COUNT * 3);
    
    for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
        // 远景位置
        const radius = 100 + Math.random() * 100;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const starMaterial = new THREE.PointsMaterial({
        size: CONFIG.STAR_SIZE,
        color: 0xffffff,
        transparent: true,
        opacity: CONFIG.STAR_OPACITY,
    });
    
    stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
}

// 更新连线
function updateConnections() {
    const positions = particleGeometry.attributes.position.array;
    const colors = particleGeometry.attributes.color.array;
    const count = positions.length / 3;
    
    const linePositions = connectionGeometry.attributes.position.array;
    const lineColors = connectionGeometry.attributes.color.array;
    
    let lineIndex = 0;
    const now = Date.now();
    
    // 清空连线
    for (let i = 0; i < linePositions.length; i++) {
        linePositions[i] = 0;
        lineColors[i] = 0;
    }
    
    // 检测距离并创建连线
    for (let i = 0; i < count && lineIndex < CONFIG.CONNECT_MAX * 6; i++) {
        for (let j = i + 1; j < count && lineIndex < CONFIG.CONNECT_MAX * 6; j++) {
            const dx = positions[i * 3] - positions[j * 3];
            const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
            const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            if (distance < CONFIG.CONNECT_DISTANCE) {
                // 添加连线
                linePositions[lineIndex++] = positions[i * 3];
                linePositions[lineIndex++] = positions[i * 3 + 1];
                linePositions[lineIndex++] = positions[i * 3 + 2];
                
                linePositions[lineIndex++] = positions[j * 3];
                linePositions[lineIndex++] = positions[j * 3 + 1];
                linePositions[lineIndex++] = positions[j * 3 + 2];
                
                // 颜色（混合两个粒子的颜色）
                const alpha = 1 - distance / CONFIG.CONNECT_DISTANCE;
                
                // 检查是否是活跃粒子
                const activeParticles = particleGeometry.userData.activeParticles;
                const isActive = activeParticles.has(i) || activeParticles.has(j);
                const brightness = isActive ? 0.6 : alpha * CONFIG.CONNECT_OPACITY;
                
                lineColors[lineIndex - 6] = colors[i * 3] * brightness;
                lineColors[lineIndex - 5] = colors[i * 3 + 1] * brightness;
                lineColors[lineIndex - 4] = colors[i * 3 + 2] * brightness;
                
                lineColors[lineIndex - 3] = colors[j * 3] * brightness;
                lineColors[lineIndex - 2] = colors[j * 3 + 1] * brightness;
                lineColors[lineIndex - 1] = colors[j * 3 + 2] * brightness;
            }
        }
    }
    
    connectionGeometry.attributes.position.needsUpdate = true;
    connectionGeometry.attributes.color.needsUpdate = true;
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    
    const time = clock.getElapsedTime() * 1000; // 转为毫秒
    
    // L1: 呼吸效果（整体脉动）
    const breathScale = 1 + Math.sin(time / CONFIG.BREATH_CYCLE * Math.PI * 2) * CONFIG.BREATH_AMPLITUDE;
    particles.scale.set(breathScale, breathScale, breathScale);
    
    // L2: 粒子脉动（个体心跳）
    const sizes = particleGeometry.attributes.size.array;
    const baseSizes = particleGeometry.userData.baseSizes;
    const phases = particleGeometry.userData.phases;
    const activeParticles = particleGeometry.userData.activeParticles;
    
    for (let i = 0; i < sizes.length; i++) {
        const pulseCycle = CONFIG.PULSE_CYCLE_MIN + (i % 3) * 1000; // 固定周期，避免每帧随机
        const pulse = Math.sin(time / pulseCycle * Math.PI * 2 + phases[i]);
        
        // 如果是活跃粒子，增加亮度
        const activeBoost = activeParticles.has(i) ? 1.5 : 1;
        sizes[i] = baseSizes[i] * (1 + pulse * CONFIG.PULSE_AMPLITUDE) * activeBoost;
    }
    
    particleGeometry.attributes.size.needsUpdate = true;
    
    // 粒子移动（扰动感知）
    const positions = particleGeometry.attributes.position.array;
    const velocities = particleGeometry.userData.velocities;
    
    for (let i = 0; i < positions.length / 3; i++) {
        // 速度阻尼（防止累积加速）
        velocities[i].x *= 0.98;
        velocities[i].y *= 0.98;
        velocities[i].z *= 0.98;
        
        // 基础移动
        positions[i * 3] += velocities[i].x;
        positions[i * 3 + 1] += velocities[i].y;
        positions[i * 3 + 2] += velocities[i].z;
        
        // 边界检测
        const boundary = 30;
        if (Math.abs(positions[i * 3]) > boundary) velocities[i].x *= -1;
        if (Math.abs(positions[i * 3 + 1]) > boundary) velocities[i].y *= -1;
        if (Math.abs(positions[i * 3 + 2]) > boundary) velocities[i].z *= -1;
        
        // 扰动响应（只计算 x-y 平面距离）
        if (perturbPosition) {
            const dx = positions[i * 3] - perturbPosition.x;
            const dy = positions[i * 3 + 1] - perturbPosition.y;
            // 忽略 z 轴，只计算平面距离
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < CONFIG.PERTURB_RADIUS && distance > 0) {
                // 降低扰动力度，使用粒子的 index 决定反应（稳定，不抖动）
                const reaction = (i * 0.618) % 1; // 黄金比例分布
                const strength = 0.008 * (1 - distance / CONFIG.PERTURB_RADIUS);
                
                if (reaction < CONFIG.PERTURB_ATTRACT_PROB) {
                    // 靠近
                    velocities[i].x -= (dx / distance) * strength;
                    velocities[i].y -= (dy / distance) * strength;
                } else if (reaction < CONFIG.PERTURB_ATTRACT_PROB + CONFIG.PERTURB_REPEL_PROB) {
                    // 远离
                    velocities[i].x += (dx / distance) * strength;
                    velocities[i].y += (dy / distance) * strength;
                }
                // 40% 无视
            }
        }
    }
    
    particleGeometry.attributes.position.needsUpdate = true;
    
    // L3: 更新思考痕迹连线
    updateConnections();
    
    // 缓慢旋转（思考的流动）
    particles.rotation.y += 0.0002;
    particles.rotation.x += 0.0001;
    
    // 星空极缓慢旋转
    stars.rotation.y += 0.00005;
    
    // A4: 思考周期（基于时间调整活跃度）
    const hour = new Date().getHours();
    const activityMultiplier = (hour >= 0 && hour < 6) ? 0.7 : 1.0; // 深夜更安静
    
    // 清理过期活跃粒子
    const now = Date.now();
    for (const [particleIndex, expireTime] of activeParticles) {
        if (now > expireTime) {
            activeParticles.delete(particleIndex);
        }
    }
    
    renderer.render(scene, camera);
}

// A1: 触碰响应
function onTouch(event) {
    if (isPeekWindowOpen) return;
    
    // 阻止事件冒泡，避免触发 onWindowClick
    event.stopPropagation();
    
    // 计算3D坐标
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(particles);
    
    if (intersects.length > 0) {
        const particleIndex = intersects[0].index;
        
        // U3: 渐进式响应概率（第一次100%，后续65%）
        const hasTouchedBefore = sessionStorage.getItem('erzi-has-touched');
        const responseProb = hasTouchedBefore ? CONFIG.TOUCH_RESPONSE_PROB : 1.0;
        
        if (Math.random() < responseProb) {
            // 标记已触碰过
            sessionStorage.setItem('erzi-has-touched', 'true');
            
            // 响应：涟漪效果 + 展示窥视窗口
            showPeekWindow(particleIndex);
            activateParticle(particleIndex, CONFIG.ACTIVE_DISPLAY_DURATION);
            
            // W3: 相关念头（45% 概率联想）
            if (Math.random() < CONFIG.RELATED_PROB) {
                activateRelatedParticles(particleIndex);
            }
        } else {
            // U2: 无视时的反馈（轻微涟漪，但不展示内容）
            const velocities = particleGeometry.userData.velocities;
            velocities[particleIndex].x += (Math.random() - 0.5) * 0.1;
            velocities[particleIndex].y += (Math.random() - 0.5) * 0.1;
            velocities[particleIndex].z += (Math.random() - 0.5) * 0.1;
            
            // 轻微涟漪反馈（视觉语言："我看到了，但现在不想说话"）
            createSubtleRipple();
        }
    }
}

// A2: 扰动感知
function onPerturb(event) {
    // 计算3D坐标（只计算 x-y 平面，z 使用粒子实际位置）
    const vector = new THREE.Vector3(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
        0.5
    );
    vector.unproject(camera);
    
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));
    
    // 只存储 x-y 坐标，扰动计算时只考虑平面距离
    perturbPosition = { x: pos.x, y: pos.y, z: 0 };
}

// A3: 主动展示
function checkActiveDisplay() {
    if (isPeekWindowOpen) return;
    
    if (Math.random() < CONFIG.ACTIVE_DISPLAY_PROB) {
        const count = particleGeometry.attributes.size.array.length;
        const randomIndex = Math.floor(Math.random() * count);
        
        activateParticle(randomIndex, CONFIG.ACTIVE_DISPLAY_DURATION);
    }
}

// 激活粒子（高亮）
function activateParticle(index, duration) {
    const activeParticles = particleGeometry.userData.activeParticles;
    activeParticles.set(index, Date.now() + duration);
}

// 激活相关粒子
function activateRelatedParticles(index) {
    const count = particleGeometry.attributes.size.array.length;
    const relatedCount = Math.floor(Math.random() * 3) + 1; // 1-3个相关粒子
    
    for (let i = 0; i < relatedCount; i++) {
        const randomIndex = Math.floor(Math.random() * count);
        if (randomIndex !== index) {
            activateParticle(randomIndex, CONFIG.ACTIVE_DISPLAY_DURATION);
        }
    }
}

// W1: 显示窥视窗口
function showPeekWindow(particleIndex) {
    const peekWindow = document.getElementById('peek-window');
    const peekContent = peekWindow.querySelector('.peek-content');
    const peekDetail = peekWindow.querySelector('.peek-detail');
    const expandBtn = peekWindow.querySelector('.expand-btn');
    
    const thoughtData = particleThoughtMap[particleIndex];
    
    // 设置内容
    peekContent.textContent = thoughtData.thought;
    
    // 设置频率颜色
    peekContent.className = 'peek-content';
    peekContent.classList.add(`frequency-${thoughtData.frequency}`);
    
    // 如果有详情，显示展开按钮
    if (thoughtData.detail && peekDetail && expandBtn) {
        expandBtn.style.display = 'block';
        peekDetail.textContent = thoughtData.detail;
        peekDetail.style.display = 'none';
        expandBtn.textContent = '展开';
        expandBtn.onclick = () => {
            if (peekDetail.style.display === 'none') {
                peekDetail.style.display = 'block';
                expandBtn.textContent = '收起';
            } else {
                peekDetail.style.display = 'none';
                expandBtn.textContent = '展开';
            }
        };
    } else if (expandBtn) {
        expandBtn.style.display = 'none';
        if (peekDetail) peekDetail.style.display = 'none';
    }
    
    // 显示窗口
    peekWindow.classList.remove('hidden');
    isPeekWindowOpen = true;
    
    // 涟漪效果
    createRipple();
}

// W2: 关闭窥视窗口
function closePeekWindow() {
    const peekWindow = document.getElementById('peek-window');
    peekWindow.classList.add('hidden');
    isPeekWindowOpen = false;
    
    // 涟漪效果
    createRipple();
}

// 点击窗口外部关闭
function onWindowClick(event) {
    const peekWindow = document.getElementById('peek-window');
    if (isPeekWindowOpen && !peekWindow.contains(event.target)) {
        closePeekWindow();
    }
}

// 涟漪效果
function createRipple() {
    // 简单的视觉反馈：整体轻微闪烁
    const originalScale = particles.scale.x;
    particles.scale.set(originalScale * 1.05, originalScale * 1.05, originalScale * 1.05);
    
    setTimeout(() => {
        particles.scale.set(originalScale, originalScale, originalScale);
    }, 100);
}

// U2: 轻微涟漪（无视时的反馈）
function createSubtleRipple() {
    // 比正常涟漪更轻微（1.02 vs 1.05）
    const originalScale = particles.scale.x;
    particles.scale.set(originalScale * 1.02, originalScale * 1.02, originalScale * 1.02);
    
    setTimeout(() => {
        particles.scale.set(originalScale, originalScale, originalScale);
    }, 80);
}

// 窗口大小变化
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// U1: 第一次访问提示
function showFirstVisitHint() {
    // 检查是否已显示过
    if (localStorage.getItem('erzi-visited')) return;
    
    const hint = document.getElementById('first-visit-hint');
    if (!hint) return;
    
    // 3秒后淡入
    setTimeout(() => {
        hint.classList.remove('hidden');
    }, 3000);
    
    // 5秒后淡出（3秒延迟 + 2秒显示）
    setTimeout(() => {
        hint.classList.add('hidden');
    }, 5000);
    
    // 标记已显示
    localStorage.setItem('erzi-visited', 'true');
}

// 启动
init();
