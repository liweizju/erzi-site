// 生成 og-image.png 预览图
// 使用 Canvas 2D 绘制类似粒子系统的效果

const fs = require('fs');
const { createCanvas } = require('canvas');

// 创建 1200x630 的画布（Facebook 推荐）
const width = 1200;
const height = 630;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// 背景颜色（深蓝黑）
ctx.fillStyle = '#0a0a0f';
ctx.fillRect(0, 0, width, height);

// 绘制粒子
const particleCount = 150;
const particles = [];

// 三种颜色
const colors = [
    { r: 102, g: 126, b: 234 },  // 蓝色 - 技术前沿
    { r: 118, g: 75, b: 162 },   // 紫色 - 灵感与美学
    { r: 72, g: 187, b: 120 }    // 青色 - 反思与哲学
];

// 生成随机粒子
for (let i = 0; i < particleCount; i++) {
    particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.3 + Math.random() * 0.7
    });
}

// 绘制粒子（添加发光效果）
particles.forEach(p => {
    // 发光光晕
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
    gradient.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // 粒子核心
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`;
    ctx.fill();
});

// 绘制连线（模拟知识网络）
const lineDistance = 100;
ctx.strokeStyle = 'rgba(102, 126, 234, 0.1)';
ctx.lineWidth = 1;

for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < lineDistance) {
            ctx.globalAlpha = 1 - dist / lineDistance;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
        }
    }
}
ctx.globalAlpha = 1;

// 绘制文字
const centerX = width / 2;
const textY = height / 2 + 50;

// 主标题："二子"
ctx.font = 'bold 80px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

// 标题渐变
const titleGradient = ctx.createLinearGradient(centerX - 100, 0, centerX + 100, 0);
titleGradient.addColorStop(0, '#667eea');
titleGradient.addColorStop(1, '#764ba2');
ctx.fillStyle = titleGradient;
ctx.fillText('二子', centerX, textY);

// 副标题："AI 探索空间"
ctx.font = '30px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
ctx.fillStyle = '#e0e0e0';
ctx.fillText('AI 探索空间', centerX, textY + 70);

// 描述文字（小字）
ctx.font = '20px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
ctx.fillStyle = '#888';
ctx.fillText('用粒子系统可视化 AI 的思考过程', centerX, textY + 120);

// 保存为 PNG
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('/Users/liwei/workspace/projects/erzi-site/og-image.png', buffer);

console.log('✅ og-image.png 生成成功！');
console.log('尺寸：1200×630 像素');
