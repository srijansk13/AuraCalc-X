/**
 * AuraCalc X - Ultra-Premium OS Platform
 * Focus: High Performance, Reliability, and Snappy UX
 */

class MathEngine {
    static sanitize(expr) {
        let s = expr.toLowerCase()
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/−/g, '-')
            .replace(/π/g, 'Math.PI')
            .replace(/e/g, 'Math.E')
            .replace(/%/g, '/100');

        // Implicit multiplication: 4x, 4(
        s = s.replace(/(\d+)([a-zπe\(])/g, '$1*$2');
        s = s.replace(/([a-zπe\)])(\d+)/g, '$1*$2');
        s = s.replace(/([a-zπe\)])([a-zπe\(])/g, '$1*$2');

        const funcs = {
            sin: 'Math.sin', cos: 'Math.cos', tan: 'Math.tan',
            sqrt: 'Math.sqrt', log: 'Math.log10', ln: 'Math.log',
            abs: 'Math.abs', exp: 'Math.exp'
        };

        for (const [key, val] of Object.entries(funcs)) {
            s = s.replace(new RegExp(`\\b${key}\\b(?=\\()`, 'g'), val);
        }

        // Factorial: n! -> MathEngine.factorial(n)
        s = s.replace(/(\d+)!/g, 'MathEngine.factorial($1)');
        
        s = s.replace(/\^/g, '**');
        return s;
    }

    static evaluate(expr) {
        try {
            let s = this.sanitize(expr);
            const openP = (s.match(/\(/g) || []).length;
            const closeP = (s.match(/\)/g) || []).length;
            for(let i=0; i < openP - closeP; i++) s += ')';

            const res = new Function(`return ${s}`)();
            if (isNaN(res) || !isFinite(res)) return null;
            return parseFloat(res.toPrecision(12));
        } catch { return null; }
    }

    static factorial(n) {
        if (n < 0) return NaN;
        if (n === 0 || n === 1) return 1;
        let res = 1;
        for (let i = 2; i <= n; i++) res *= i;
        return res;
    }
}

class AuraX {
    constructor() {
        this.expr = '';
        this.memory = parseFloat(localStorage.getItem('ax_mem')) || 0;
        this.history = JSON.parse(localStorage.getItem('ax_hist')) || [];
        this.themeIdx = parseInt(localStorage.getItem('ax_theme')) || 0;
        this.themes = ['theme-noir', 'theme-apple', 'theme-cyber'];
        
        this.dom = {
            res: document.getElementById('result-line'),
            prev: document.getElementById('expr-preview'),
            time: document.getElementById('live-time'),
            mFlag: document.getElementById('mem-flag'),
            histHub: document.getElementById('history-hub'),
            histList: document.getElementById('history-list')
        };

        this.init();
    }

    init() {
        this.setupEvents();
        this.applyTheme();
        this.updateMemoryFlag();
        this.renderHistory();
        
        // Clock loop
        const tick = () => {
            const now = new Date();
            this.dom.time.innerText = now.toLocaleTimeString('en-US', { hour12: false });
        };
        setInterval(tick, 1000);
        tick();

        // Boot sequence
        setTimeout(() => document.getElementById('startup-x').classList.add('hidden'), 800);
    }

    setupEvents() {
        // Main keypad
        document.querySelectorAll('.key').forEach(k => {
            k.addEventListener('click', () => {
                const val = k.getAttribute('data-val');
                const action = k.getAttribute('data-action');
                this.handleInput(val, action);
            });
        });

        // Memory keys
        document.querySelectorAll('.m-key').forEach(k => {
            k.addEventListener('click', () => {
                this.handleMemory(k.getAttribute('data-action'));
            });
        });

        // Nav actions
        document.getElementById('btn-history').addEventListener('click', () => this.toggleHistory(true));
        document.getElementById('close-history').addEventListener('click', () => this.toggleHistory(false));
        document.getElementById('btn-theme').addEventListener('click', () => this.nextTheme());
        document.getElementById('clear-history').addEventListener('click', () => this.wipeHistory());

        // Keyboard support
        window.addEventListener('keydown', (e) => {
            if (e.key >= '0' && e.key <= '9') this.handleInput(e.key);
            else if (e.key === '+') this.handleInput('+');
            else if (e.key === '-') this.handleInput('-');
            else if (e.key === '*') this.handleInput('*');
            else if (e.key === '/') this.handleInput('/');
            else if (e.key === '.') this.handleInput('.');
            else if (e.key === '(') this.handleInput('(');
            else if (e.key === ')') this.handleInput(')');
            else if (e.key === 'Enter') this.handleInput(null, 'calc');
            else if (e.key === 'Backspace') this.handleInput(null, 'delete');
            else if (e.key === 'Escape') this.handleInput(null, 'clear');
        });
    }

    handleInput(val, action) {
        if (action === 'clear') {
            this.expr = '';
        } else if (action === 'delete') {
            this.expr = this.expr.slice(0, -1);
        } else if (action === 'calc') {
            if (!this.expr) return;
            const res = MathEngine.evaluate(this.expr);
            if (res !== null) {
                this.addHistory(this.expr, res);
                this.expr = String(res);
            } else {
                this.dom.res.innerText = 'Error';
                this.expr = '';
                return;
            }
        } else if (val) {
            this.expr += val;
        }
        this.updateDisplay();
    }

    handleMemory(action) {
        const currentVal = parseFloat(this.dom.res.innerText) || 0;
        switch(action) {
            case 'mc': this.memory = 0; break;
            case 'mr': this.expr = String(this.memory); break;
            case 'm-plus': this.memory += currentVal; break;
            case 'm-minus': this.memory -= currentVal; break;
            case 'ms': this.memory = currentVal; break;
        }
        localStorage.setItem('ax_mem', this.memory);
        this.updateMemoryFlag();
        this.updateDisplay();
    }

    updateDisplay() {
        let displayVal = this.expr || '0';
        
        // Handle extreme numbers
        if (displayVal.length > 12 && !isNaN(displayVal)) {
            const num = parseFloat(displayVal);
            if (Math.abs(num) > 1e12 || (Math.abs(num) < 1e-7 && num !== 0)) {
                displayVal = num.toExponential(6);
            } else {
                displayVal = displayVal.slice(0, 12);
            }
        }

        this.dom.res.innerText = displayVal;
        this.dom.prev.innerText = this.expr;
        
        // Font scaling for long numbers (simplified)
        if (displayVal.length > 8) {
            this.dom.res.style.fontSize = 'clamp(1.5rem, 8vw, 3rem)';
        } else {
            this.dom.res.style.fontSize = '';
        }
    }

    updateMemoryFlag() {
        if (this.memory !== 0) this.dom.mFlag.classList.add('active');
        else this.dom.mFlag.classList.remove('active');
    }

    // --- History Hub ---
    addHistory(expr, res) {
        this.history.unshift({ expr, res });
        if (this.history.length > 50) this.history.pop();
        localStorage.setItem('ax_hist', JSON.stringify(this.history));
        this.renderHistory();
    }

    renderHistory() {
        if (this.history.length === 0) {
            this.dom.histList.innerHTML = '<div class="empty-state">No calculations found.</div>';
            return;
        }
        this.dom.histList.innerHTML = this.history.map(item => `
            <div class="history-item" onclick="window.aura.reuseHistory('${item.expr}')">
                <div class="hist-expr">${item.expr}</div>
                <div class="hist-res">${item.res}</div>
            </div>
        `).join('');
    }

    reuseHistory(expr) {
        this.expr = expr;
        this.updateDisplay();
        this.toggleHistory(false);
    }

    toggleHistory(show) {
        if (show) this.dom.histHub.classList.add('active');
        else this.dom.histHub.classList.remove('active');
    }

    wipeHistory() {
        this.history = [];
        localStorage.removeItem('ax_hist');
        this.renderHistory();
    }

    // --- Theme System ---
    nextTheme() {
        document.body.classList.remove(this.themes[this.themeIdx]);
        this.themeIdx = (this.themeIdx + 1) % this.themes.length;
        this.applyTheme();
        localStorage.setItem('ax_theme', this.themeIdx);
    }

    applyTheme() {
        document.body.classList.add(this.themes[this.themeIdx]);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.aura = new AuraX();
});
