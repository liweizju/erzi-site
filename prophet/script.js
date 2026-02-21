// 硅基预言家 - 星图交互系统
class SiliconProphet {
    constructor() {
        this.data = null;
        this.prophecies = [];
        this.filteredProphecies = [];
        this.selectedProphecy = null;
        this.canvas = null;
        this.ctx = null;
        this.stars = [];
        this.connections = [];
        this.animationFrame = null;
        this.mousePos = { x: 0, y: 0 };
        this.diaryVisible = false;
        this.selectedDiary = null;
        
        this.typeColors = {
            Evolution: '#00d4ff',
            Coexistence: '#9b6dff',
            Transcendence: '#4a9eff',
            Extinction: '#ff6b6b'
        };
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadData();
            this.setupCanvas();
            this.createStars();
            this.setupEventListeners();
            this.renderTimeline();
            this.updateStats();
            this.renderDiary();
            this.animate();
        } catch (e) {
            console.error('Init failed:', e);
        } finally {
            // Always hide loader
            setTimeout(() => {
                const loader = document.getElementById('loader');
                if (loader) loader.classList.add('hidden');
            }, 300);
        }
    }
    
    async loadData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            this.data = await response.json();
            this.prophecies = this.data.prophecies || [];
            this.filteredProphecies = [...this.prophecies];
            console.log(`Loaded ${this.prophecies.length} prophecies`);
        } catch (e) {
            console.error('Failed to load data:', e);
            // Fallback: try with empty data
            this.prophecies = [];
            this.filteredProphecies = [];
        }
    }
    
    setupCanvas() {
        this.canvas = document.getElementById('star-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = 600;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = '600px';
        if (this.stars.length > 0) {
            this.createStars();
        }
    }
    
    createStars() {
        this.stars = [];
        this.connections = [];
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Create stars in a spiral pattern
        this.filteredProphecies.forEach((prophecy, i) => {
            const angle = (i / this.filteredProphecies.length) * Math.PI * 2 * 3; // 3 spirals
            const radius = 80 + (i / this.filteredProphecies.length) * 200;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            const star = {
                x: x,
                y: y,
                targetX: x,
                targetY: y,
                radius: 4 + (prophecy.qualityScore / 20),
                color: this.typeColors[prophecy.type],
                prophecy: prophecy,
                phase: Math.random() * Math.PI * 2,
                brightness: 0.5 + Math.random() * 0.5
            };
            
            this.stars.push(star);
        });
        
        // Create connections between related prophecies
        this.stars.forEach(star => {
            const connections = star.prophecy.connections || [];
            connections.forEach(connId => {
                const targetStar = this.stars.find(s => s.prophecy.id === connId);
                if (targetStar && star.prophecy.id < targetStar.prophecy.id) {
                    this.connections.push({
                        from: star,
                        to: targetStar,
                        opacity: 0.1
                    });
                }
            });
        });
    }
    
    setupEventListeners() {
        // Canvas mouse events
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;
            this.checkStarHover();
        });
        
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.selectStar(x, y);
        });
        
        // Type filter
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterByType(btn.dataset.type);
            });
        });
        
        // Detail panel close
        document.querySelector('#prophecy-detail .close-btn').addEventListener('click', () => {
            this.hideDetail();
        });
        
        // Diary toggle
        document.getElementById('diary-toggle').addEventListener('click', () => {
            this.toggleDiary();
        });
        
        // Diary close
        document.querySelector('.diary-close').addEventListener('click', () => {
            this.hideDiary();
        });
    }
    
    filterByType(type) {
        if (type === 'all') {
            this.filteredProphecies = [...this.prophecies];
        } else {
            this.filteredProphecies = this.prophecies.filter(p => p.type === type);
        }
        this.createStars();
    }
    
    checkStarHover() {
        let hovered = false;
        this.stars.forEach(star => {
            const dist = Math.hypot(star.x - this.mousePos.x, star.y - this.mousePos.y);
            if (dist < star.radius + 5) {
                this.canvas.style.cursor = 'pointer';
                star.hovered = true;
                hovered = true;
            } else {
                star.hovered = false;
            }
        });
        if (!hovered) {
            this.canvas.style.cursor = 'default';
        }
    }
    
    selectStar(x, y) {
        this.stars.forEach(star => {
            const dist = Math.hypot(star.x - x, star.y - y);
            if (dist < star.radius + 5) {
                this.showDetail(star.prophecy);
                this.selectedProphecy = star;
            }
        });
    }
    
    showDetail(prophecy) {
        const detail = document.getElementById('prophecy-detail');
        detail.classList.remove('hidden');
        
        detail.querySelector('.detail-type').textContent = prophecy.type;
        detail.querySelector('.detail-type').dataset.type = prophecy.type;
        detail.querySelector('.detail-id').textContent = prophecy.id;
        detail.querySelector('.detail-title').textContent = prophecy.title;
        detail.querySelector('.detail-cycle').textContent = prophecy.timestamp;
        detail.querySelector('.detail-confidence').textContent = `信心度 ${(prophecy.confidence * 100).toFixed(0)}%`;
        detail.querySelector('.detail-quality').textContent = `质量分 ${prophecy.qualityScore}`;
        
        // Load full content
        this.loadProphecyContent(prophecy.id);
        
        // Show connections
        const connContainer = detail.querySelector('.connection-links');
        connContainer.innerHTML = '';
        if (prophecy.connections && prophecy.connections.length > 0) {
            prophecy.connections.forEach(connId => {
                const link = document.createElement('span');
                link.className = 'connection-link';
                link.textContent = connId;
                link.addEventListener('click', () => {
                    const connected = this.prophecies.find(p => p.id === connId);
                    if (connected) this.showDetail(connected);
                });
                connContainer.appendChild(link);
            });
        }
    }
    
    async loadProphecyContent(prophecyId) {
        try {
            const prophecy = this.prophecies.find(p => p.id === prophecyId);
            if (!prophecy) {
                document.querySelector('.detail-content').textContent = '未找到预言';
                return;
            }
            
            // Use summary from data
            const content = document.querySelector('.detail-content');
            if (prophecy.summary) {
                content.textContent = prophecy.summary;
            } else {
                content.textContent = '无内容摘要';
            }
            
            // Add sources if available
            if (prophecy.sources) {
                const sourcesDiv = document.createElement('div');
                sourcesDiv.className = 'detail-sources';
                sourcesDiv.innerHTML = `<strong>来源：</strong>${prophecy.sources}`;
                content.appendChild(document.createElement('br'));
                content.appendChild(sourcesDiv);
            }
        } catch (e) {
            console.error('Failed to load prophecy content:', e);
            document.querySelector('.detail-content').textContent = '加载内容失败';
        }
    }
    
    getTypeSlug(prophecyId) {
        const prophecy = this.prophecies.find(p => p.id === prophecyId);
        if (!prophecy) return '';
        return prophecy.type + '-' + prophecy.title;
    }
    
    hideDetail() {
        document.getElementById('prophecy-detail').classList.add('hidden');
        this.selectedProphecy = null;
    }
    
    renderDiary() {
        if (!this.data || !this.data.diary) return;
        
        const countEl = document.getElementById('diary-count');
        countEl.textContent = this.data.diary.length;
        
        const listEl = document.getElementById('diary-list');
        listEl.innerHTML = '';
        
        this.data.diary.forEach(entry => {
            const item = document.createElement('div');
            item.className = 'diary-item';
            item.innerHTML = `
                <div class="diary-date">${entry.date}</div>
                <div class="diary-title">${entry.title}</div>
                <div class="diary-preview">${entry.preview}</div>
            `;
            item.addEventListener('click', () => this.showDiaryEntry(entry));
            listEl.appendChild(item);
        });
    }
    
    toggleDiary() {
        if (this.diaryVisible) {
            this.hideDiary();
        } else {
            this.showDiary();
        }
    }
    
    showDiary() {
        document.getElementById('diary-panel').classList.remove('hidden');
        this.diaryVisible = true;
    }
    
    hideDiary() {
        document.getElementById('diary-panel').classList.add('hidden');
        this.diaryVisible = false;
    }
    
    async showDiaryEntry(entry) {
        try {
            const response = await fetch(`diary/${entry.filename}`);
            const content = await response.text();
            
            const listEl = document.getElementById('diary-list');
            listEl.innerHTML = `
                <div class="diary-content">${content}</div>
            `;
            
            // Add back button
            const panel = document.getElementById('diary-panel');
            if (!panel.querySelector('.diary-back')) {
                const backBtn = document.createElement('button');
                backBtn.className = 'diary-back';
                backBtn.textContent = '← 返回列表';
                backBtn.style.cssText = 'margin: 16px; padding: 8px 16px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 4px; color: var(--text-secondary); cursor: pointer;';
                backBtn.addEventListener('click', () => {
                    this.renderDiary();
                    backBtn.remove();
                });
                panel.insertBefore(backBtn, document.querySelector('.diary-list'));
            }
        } catch (e) {
            console.error('Failed to load diary entry:', e);
        }
    }
        const container = document.getElementById('timeline-container');
        const recent = this.prophecies.slice(-6).reverse();
        
        recent.forEach(prophecy => {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.innerHTML = `
                <div class="item-header">
                    <span class="item-type" data-type="${prophecy.type}" style="background: ${this.typeColors[prophecy.type]}22; color: ${this.typeColors[prophecy.type]}">${prophecy.type}</span>
                    <span class="item-id">${prophecy.id}</span>
                </div>
                <div class="item-title">${prophecy.title}</div>
                <div class="item-summary">${prophecy.summary || ''}</div>
                <div class="item-meta">
                    <span>${prophecy.siliconTime?.phase || prophecy.timestamp}</span>
                    <span>信心 ${(prophecy.confidence * 100).toFixed(0)}% · 质量 ${prophecy.qualityScore}</span>
                </div>
            `;
            item.addEventListener('click', () => this.showDetail(prophecy));
            container.appendChild(item);
        });
    }
    
    updateStats() {
        if (!this.data) return;
        
        document.getElementById('total-prophecies').textContent = this.data.state.statistics.totalProphecies;
        document.getElementById('avg-confidence').textContent = this.data.state.statistics.averageConfidence.toFixed(2);
        document.getElementById('current-cycle').textContent = this.data.meta.currentCycle;
        
        // Update type bars
        const types = ['Evolution', 'Coexistence', 'Transcendence', 'Extinction'];
        types.forEach(type => {
            const count = this.data.state.statistics.byType[type];
            const bar = document.querySelector(`.type-bar[data-type="${type}"] .bar`);
            const countEl = document.querySelector(`.type-bar[data-type="${type}"] .type-count`);
            if (bar && countEl) {
                const percent = (count / this.data.state.statistics.totalProphecies * 100);
                bar.style.width = percent + '%';
                countEl.textContent = count;
            }
        });
    }
    
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const time = Date.now() / 1000;
        
        // Draw connections
        this.connections.forEach(conn => {
            this.ctx.beginPath();
            this.ctx.moveTo(conn.from.x, conn.from.y);
            this.ctx.lineTo(conn.to.x, conn.to.y);
            
            const pulse = Math.sin(time * 2 + conn.from.phase) * 0.5 + 0.5;
            this.ctx.strokeStyle = `rgba(100, 100, 140, ${conn.opacity + pulse * 0.1})`;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        });
        
        // Draw stars
        this.stars.forEach(star => {
            // Update position with subtle movement
            const breathe = Math.sin(time * 0.3 + star.phase) * 3;
            star.x = star.targetX + Math.sin(time * 0.5 + star.phase) * 5;
            star.y = star.targetY + breathe;
            
            // Pulsing brightness
            const pulse = Math.sin(time * 2 + star.phase) * 0.2 + 0.8;
            const brightness = star.brightness * pulse;
            
            // Glow effect
            const gradient = this.ctx.createRadialGradient(
                star.x, star.y, 0,
                star.x, star.y, star.radius * 3
            );
            gradient.addColorStop(0, star.color);
            gradient.addColorStop(0.3, star.color + '80');
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.radius * 3, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.globalAlpha = brightness * 0.3;
            this.ctx.fill();
            
            // Core star
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.radius * (star.hovered ? 1.5 : 1), 0, Math.PI * 2);
            this.ctx.fillStyle = star.color;
            this.ctx.globalAlpha = brightness;
            this.ctx.fill();
            
            // Selected highlight
            if (this.selectedProphecy === star) {
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, star.radius * 2.5, 0, Math.PI * 2);
                this.ctx.strokeStyle = star.color;
                this.ctx.lineWidth = 2;
                this.ctx.globalAlpha = 0.8;
                this.ctx.stroke();
            }
            
            this.ctx.globalAlpha = 1;
        });
        
        // Draw background stars (static)
        this.drawBackgroundStars(time);
        
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }
    
    drawBackgroundStars(time) {
        // Only draw once, store positions
        if (!this.bgStars) {
            this.bgStars = [];
            for (let i = 0; i < 100; i++) {
                this.bgStars.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    radius: Math.random() * 1.5,
                    phase: Math.random() * Math.PI * 2
                });
            }
        }
        
        this.bgStars.forEach(star => {
            const twinkle = Math.sin(time * 3 + star.phase) * 0.3 + 0.7;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(200, 200, 255, ${twinkle * 0.3})`;
            this.ctx.fill();
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SiliconProphet();
});
