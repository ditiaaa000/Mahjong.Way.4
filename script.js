 $(document).ready(function() {

    // ==========================================
    // SETTINGS & CONFIG - SESUAI MAHJONG WAYS 2
    // ==========================================
    const GAME_MODE = "NORMAL";

    const RTP_CONFIG = {
    // Mode Santai/Gampang Menang
    "GACOR":  { 
        scatterChance: 0.05, 
        goldChance: 0.60, 
        baseWinChance: 0.85, 
        maxCascades: 30, 
        weights: { high: 50, mid: 30, low: 20 } 
    },
    
    // Mode Standar PG Soft
    "NORMAL": { 
        scatterChance: 0.03, 
        goldChance: 0.30, 
        baseWinChance: 0.50, 
        maxCascades: 10, 
        weights: { high: 20, mid: 35, low: 45 } 
    },
    
    // Mode Susah/Lose
    "BAD":    { 
        scatterChance: 0.01, 
        goldChance: 0.12, 
        baseWinChance: 0.25, 
        maxCascades: 4, 
        weights: { high: 8, mid: 20, low: 72 } 
    }
};
    let cfg = RTP_CONFIG[GAME_MODE];

    // ==========================================
    // PAYTABLE - SESUAI PG SOFT
    // ==========================================
    const PAYTABLE = {
        'naga_hijau': [1.0, 2.0, 5.0],
        'naga_merah': [1.0, 2.0, 5.0],
        'naga_putih': [1.0, 2.0, 5.0],
        'karakter':   [0.5, 1.0, 2.5],
        'karakter_dua':[0.5, 1.0, 2.5],
        'bambu':      [0.2, 0.4, 1.0],
        'lingkaran':  [0.2, 0.4, 1.0],
        'bambu_dua':  [0.2, 0.4, 1.0],
        'lingkaran_dua':[0.2, 0.4, 1.0]
    };

    // ==========================================
    // AUDIO ENGINE
    // ==========================================
    let audioCtx = null;
    let masterGain = null;
    const bgmPlayer = new Audio('suara/suara_latar_belakang.mp3');
    bgmPlayer.loop = true;
    bgmPlayer.volume = 0.35; 

    function initAudio() {
        if (audioCtx) return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.7;
        masterGain.connect(audioCtx.destination);
        bgmPlayer.play().catch(e => console.log("BGM blocked"));
    }

    const SFX = {
        drop: function() {
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(700, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(350, audioCtx.currentTime + 0.04);
            gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.06);
        },
        spin: function() {
            if (!audioCtx) return;
            const noise = audioCtx.createBufferSource();
            const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.4, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < buffer.length; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / buffer.length) * 0.35;
            }
            noise.buffer = buffer;
            noise.connect(masterGain);
            noise.start();
        },
        scatter: function() {
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 1500;
            gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.18);
        },
        scatterTrigger: function() {
            if (!audioCtx) return;
            [523, 659, 784, 1046, 1318].forEach((freq, i) => {
                setTimeout(() => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
                    osc.connect(gain);
                    gain.connect(masterGain);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 0.4);
                }, i * 100);
            });
        },
        breakTile: function() {
            if (!audioCtx) return;
            const dur = 0.07;
            const noise = audioCtx.createBufferSource();
            const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < buffer.length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / buffer.length, 2) * 0.5;
            }
            noise.buffer = buffer;
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 2200;
            noise.connect(filter);
            filter.connect(masterGain);
            noise.start();
        },
        breakGold: function() {
            if (!audioCtx) return;
            SFX.breakTile();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(2200, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(3500, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
        },
        win: function() {
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 920;
            gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
        },
        bigWin: function() {
            if (!audioCtx) return;
            [523, 659, 784, 1046, 1318, 1568].forEach((freq, i) => {
                setTimeout(() => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
                    osc.connect(gain);
                    gain.connect(masterGain);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 0.3);
                }, i * 70);
            });
        },
        retrigger: function() {
            if (!audioCtx) return;
            [800, 1000, 1200, 1600].forEach((freq, i) => {
                setTimeout(() => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0.22, audioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
                    osc.connect(gain);
                    gain.connect(masterGain);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 0.18);
                }, i * 70);
            });
        }
    };

    $(document).one('click', function() { initAudio(); });

    // ==========================================
    // ASET GAMBAR
    // ==========================================
    const IMG_PATH = 'img/';

    const tileAssets = [
        { id: 'bambu', normal: 'bambu.png', gold: 'bambu_emas.png', tier: 1 },
        { id: 'lingkaran', normal: 'lingkaran.png', gold: 'lingkaran_emas.png', tier: 1 },
        { id: 'bambu_dua', normal: 'bambu_dua.png', gold: 'bambu_dua_emas.png', tier: 1 },
        { id: 'lingkaran_dua', normal: 'lingkaran_dua.png', gold: 'lingkaran_dua_emas.png', tier: 1 },
        { id: 'karakter', normal: 'karakter.png', gold: 'karakter_emas.png', tier: 2 },
        { id: 'karakter_dua', normal: 'karakter_dua.png', gold: 'karakter_dua_emas.png', tier: 2 },
        { id: 'naga_hijau', normal: 'naga_hijau.png', gold: 'naga_hijau_emas.png', tier: 3 },
        { id: 'naga_merah', normal: 'naga_merah.png', gold: 'naga_merah_emas.png', tier: 3 },
        { id: 'naga_putih', normal: 'naga_putih.png', gold: 'naga_putih_emas.png', tier: 3 }
    ];

    const wildImg = IMG_PATH + 'wild.png';
    const scatterImg = IMG_PATH + 'scatter.png';

    const betSteps = [400, 800, 1200, 2400, 4800, 10000, 20000, 50000];
    const multNormal = [1, 2, 3, 5];
    const multFS = [2, 4, 6, 10];

    let balance = 50000;
    let betIdx = 1;
    let isSpinning = false;
    let autoRemaining = 0;
    let freeSpinsLeft = 0;
    let isTurbo = false;
    let currentMultIdx = 0;
    let winThisTurn = 0;
    let cascadeCount = 0;
    let totalBonusWin = 0;
    
    // ==========================================
    // LOCKED BET SAAT FREE SPINS (FIX UTAMA)
    // ==========================================
    let lockedBetIdx = 0;        // Bet saat FS dimulai
    let lockedBetAmount = 0;     // Nominal bet saat FS

    // ==========================================
    // CANVAS ENGINE - PARTIKEL
    // ==========================================
    const cvs = document.getElementById('fx-canvas');
    const ctx = cvs.getContext('2d');
    let particles = [];
    let lastFrameTime = 0;

    function resizeCanvas() {
        cvs.width = window.innerWidth;
        cvs.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function spawnParticles(x, y, type, tier) {
        tier = tier || 1;
        let count = 10;
        
        if (type === 'explode') {
            count = tier === 'gold' ? 16 : 12;
            for (let i = 0; i < count; i++) {
                particles.push(new Particle(x, y, 'shard', tier));
            }
        } else if (type === 'coin_rain') {
            count = tier * 8;
            for (let i = 0; i < count; i++) {
                particles.push(new Particle(Math.random() * cvs.width, -30, 'coin'));
            }
        } else if (type === 'sparkle') {
            for (let i = 0; i < 30; i++) {
                particles.push(new Particle(Math.random() * cvs.width, Math.random() * cvs.height, 'sparkle'));
            }
        } else if (type === 'center_burst') {
            for (let i = 0; i < 50; i++) {
                particles.push(new Particle(cvs.width/2, cvs.height/2, 'centerBurst', tier));
            }
        }
    }

    class Particle {
        constructor(x, y, type, tier) {
            this.x = x;
            this.y = y;
            this.type = type;
            this.tier = tier || 1;
            this.life = 1;
            this.opacity = 1;

            if (type === 'shard') {
                this.size = Math.random() * 10 + 4;
                this.vx = (Math.random() - 0.5) * 20;
                this.vy = (Math.random() - 0.6) * 22;
                this.rotation = Math.random() * 360;
                this.rotSpeed = (Math.random() - 0.5) * 30;
                this.color = tier === 'gold' ? '#ffd700' : '#ffffff';
            } else if (type === 'coin') {
                this.size = Math.random() * 32 + 22;
                this.vx = (Math.random() - 0.5) * 6;
                this.vy = Math.random() * 12 + 5;
                this.angle = Math.random() * 360;
                this.spinSpeed = (Math.random() - 0.5) * 25;
            } else if (type === 'sparkle') {
                this.size = Math.random() * 7 + 3;
                this.vx = (Math.random() - 0.5) * 12;
                this.vy = (Math.random() - 0.5) * 12;
                this.life = Math.random() * 0.6 + 0.4;
            } else if (type === 'centerBurst') {
                this.size = Math.random() * 8 + 4;
                let angle = Math.random() * Math.PI * 2;
                let speed = Math.random() * 25 + 15;
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed;
                this.color = tier === 'sensational' ? '#ff0055' : tier === 'mega' ? '#cc00ff' : '#00bbff';
                this.life = 1.2;
            }
        }

        update(dt) {
            const speed = dt / 16;
            
            if (this.type === 'shard') {
                this.vy += 0.7 * speed;
                this.x += this.vx * speed;
                this.y += this.vy * speed;
                this.life -= 0.055 * speed;
                this.rotation += this.rotSpeed * speed;
            } else if (this.type === 'coin') {
                this.y += this.vy * speed;
                this.angle += this.spinSpeed * speed;
                if (this.y > cvs.height + 25) this.life = 0;
            } else if (this.type === 'sparkle') {
                this.x += this.vx * speed;
                this.y += this.vy * speed;
                this.life -= 0.028 * speed;
            } else if (this.type === 'centerBurst') {
                this.x += this.vx * speed;
                this.y += this.vy * speed;
                this.vx *= 0.96;
                this.vy *= 0.96;
                this.life -= 0.015 * speed;
            }
            this.opacity = Math.max(0, this.life);
        }

        draw() {
            ctx.save();
            ctx.globalAlpha = this.opacity;

            if (this.type === 'shard') {
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation * Math.PI / 180);
                ctx.fillStyle = this.color;
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 10;
                ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
            } else if (this.type === 'coin') {
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle * Math.PI / 180);
                let scaleX = Math.abs(Math.sin(this.angle * Math.PI / 180));
                ctx.scale(Math.max(0.25, scaleX), 1);
                
                let gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size/2);
                gradient.addColorStop(0, '#fff7cc');
                gradient.addColorStop(0.5, '#ffd700');
                gradient.addColorStop(1, '#b8860b');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, this.size/2, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.type === 'sparkle') {
                ctx.fillStyle = '#fff';
                ctx.shadowColor = '#fff';
                ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.type === 'centerBurst') {
                ctx.fillStyle = this.color;
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    function renderFX(timestamp) {
        const dt = Math.min(timestamp - lastFrameTime, 32);
        lastFrameTime = timestamp;
        
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update(dt);
            particles[i].draw();
            if (particles[i].life <= 0) particles.splice(i, 1);
        }
        
        requestAnimationFrame(renderFX);
    }
    requestAnimationFrame(renderFX);

    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================
    function formatRupiah(num) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(num);
    }

    function formatRupiahSimple(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            let current = Math.floor(progress * (end - start) + start);
            obj.text(formatRupiah(current));
            if (progress < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    }

    // ==========================================
    // CUSTOM ALERT
    // ==========================================
    function showAlert(title, message) {
        $("#alert-title").text(title);
        $("#alert-message").text(message);
        $("#alert-modal").css("display", "flex");
    }

    // ==========================================
    // UI UPDATE - DENGAN BET LOCK SAAT FS
    // ==========================================
    function updateUIOnly() {
        let actMults = freeSpinsLeft > 0 ? multFS : multNormal;
        $(".mult").each((i, el) => {
            $(el).text("x" + actMults[i]);
            $(el).toggleClass("active", i === currentMultIdx);
        });

        if (freeSpinsLeft > 0) {
            $("#spin-icon").hide();
            $("#auto-count").text(freeSpinsLeft).show();
            $("#fs-indicator").text(`FREE SPINS: ${freeSpinsLeft}`).addClass('win-glow-anim');
            
            // DISABLE +/- BET SAAT FREE SPINS (FIX)
            $("#plus-bet, #minus-bet").addClass('btn-disabled');
            $("#auto-btn").addClass('btn-disabled');
        } else if (autoRemaining > 0) {
            $("#spin-icon").hide();
            $("#auto-count").text(autoRemaining).show();
            $("#auto-btn").addClass("active");
            $("#fs-indicator").text("2000 WAYS").removeClass('win-glow-anim');
            
            // ENABLE BET
            $("#plus-bet, #minus-bet").removeClass('btn-disabled');
            $("#auto-btn").removeClass('btn-disabled');
        } else {
            $("#spin-icon").show().text("MULAI");
            $("#auto-count").hide();
            $("#auto-btn").removeClass("active");
            $("#fs-indicator").text("2000 WAYS").removeClass('win-glow-anim');
            
            // ENABLE BET
            $("#plus-bet, #minus-bet").removeClass('btn-disabled');
            $("#auto-btn").removeClass('btn-disabled');
        }
    }

    function updateUIData() {
        $("#balance").text(formatRupiah(balance));
        
        // Gunakan locked bet saat FS, normal bet saat tidak
        if (freeSpinsLeft > 0) {
            $("#bet-amount").text(formatRupiah(lockedBetAmount)).addClass('bet-locked');
        } else {
            $("#bet-amount").text(formatRupiah(betSteps[betIdx])).removeClass('bet-locked');
        }
        
        updateUIOnly();
    }

    // ==========================================
    // GRID FUNCTIONS
    // ==========================================
    function getReelHeight(reelIdx) {
        return (reelIdx === 0 || reelIdx === 4) ? 4 : 5;
    }

    function createTileHtml(asset, isGold, isScatter, delay) {
        let imgSrc = isGold ? IMG_PATH + asset.gold : IMG_PATH + asset.normal;
        let classes = "tile drop-anim";
        let dataType = asset.id;
        
        if (isGold) classes += " gold";
        if (isScatter) {
            classes = "tile scatter drop-anim";
            dataType = "S";
            imgSrc = scatterImg;
        }
        
        return `<div class="${classes}" style="animation-delay: ${delay}ms" data-type="${dataType}"><img src="${imgSrc}" onerror="this.style.display='none'"></div>`;
    }

    function fillGrid(forceLoss) {
        forceLoss = forceLoss || false;
        
        let r0Symbols = [];
        $('#reel0 .tile').each(function() {
            r0Symbols.push($(this).attr('data-type'));
        });

        let activeScatterChance = freeSpinsLeft > 0 ? (cfg.scatterChance * 0.1) : cfg.scatterChance;
        let maxDelay = 0;
        let scatterCount = $(".tile.scatter").length;

        for (let reelIdx = 0; reelIdx < 5; reelIdx++) {
            let limit = getReelHeight(reelIdx);
            let reel = $(`#reel${reelIdx}`);
            let currentCount = reel.children().length;
            let missingCount = limit - currentCount;

            for (let i = 0; i < missingCount; i++) {
                let r = Math.random();
                let asset;

                let high = tileAssets.filter(a => a.tier === 3);
                let mid = tileAssets.filter(a => a.tier === 2);
                let low = tileAssets.filter(a => a.tier === 1);
                let roll = Math.random() * 100;

                if (roll < cfg.weights.high) {
                    asset = high[Math.floor(Math.random() * high.length)];
                } else if (roll < cfg.weights.high + cfg.weights.mid) {
                    asset = mid[Math.floor(Math.random() * mid.length)];
                } else {
                    asset = low[Math.floor(Math.random() * low.length)];
                }

                if (forceLoss && reelIdx === 2) {
                    let attempts = 0;
                    while (r0Symbols.includes(asset.id) && attempts < 10) {
                        asset = tileAssets[Math.floor(Math.random() * tileAssets.length)];
                        attempts++;
                    }
                }

                if (reelIdx === 0) {
                    r0Symbols.push(asset.id);
                }

                let delay = isTurbo ? 0 : (reelIdx * 70) + (i * 50);
                if (delay > maxDelay) maxDelay = delay;

                let maxScatter = forceLoss ? 2 : 3;
                let tileHtml = "";

                if (r < activeScatterChance && scatterCount < maxScatter) {
                    scatterCount++;
                    tileHtml = createTileHtml(asset, false, true, delay);
                    setTimeout(() => SFX.scatter(), delay + 120);
                } else if (r < cfg.goldChance && reelIdx > 0 && reelIdx < 4) {
                    tileHtml = createTileHtml(asset, true, false, delay);
                } else {
                    tileHtml = createTileHtml(asset, false, false, delay);
                }

                reel.prepend(tileHtml);
            }
        }

        setTimeout(() => {
            for (let k = 0; k < 3; k++) {
                setTimeout(() => SFX.drop(), k * 50);
            }
        }, maxDelay + 120);

        setTimeout(() => {
            $(".tile").removeClass("drop-anim").css("animation-delay", "0s");
        }, isTurbo ? 200 : maxDelay + 350);
    }

    // ==========================================
    // WIN CALCULATION - PAKAI LOCKED BET SAAT FS
    // ==========================================
    function calculateWaysWin() {
        let payout = 0;
        let winningTiles = [];

        // Gunakan locked bet saat FS
        let currentBet = freeSpinsLeft > 0 ? lockedBetAmount : betSteps[betIdx];

        let reels = [];
        for (let r = 0; r < 5; r++) {
            let reelSymbols = [];
            $(`#reel${r} .tile`).each(function() {
                reelSymbols.push({
                    type: $(this).attr('data-type'),
                    element: this,
                    isGold: $(this).hasClass('gold')
                });
            });
            reels.push(reelSymbols);
        }

        let symbolTypes = [...new Set(tileAssets.map(a => a.id))];

        for (let symType of symbolTypes) {
            let countsPerReel = [];
            let tilesPerReel = [];

            for (let r = 0; r < 5; r++) {
                let matches = reels[r].filter(s => s.type === symType || s.type === 'W');
                countsPerReel.push(matches.length);
                tilesPerReel.push(matches);
            }

            if (countsPerReel[0] > 0 && countsPerReel[1] > 0 && countsPerReel[2] > 0) {
                let ways = countsPerReel[0] * countsPerReel[1] * countsPerReel[2];
                if (countsPerReel[3] > 0) ways *= countsPerReel[3];
                if (countsPerReel[4] > 0 && countsPerReel[3] > 0) ways *= countsPerReel[4];

                let winningReels = 3;
                if (countsPerReel[3] > 0) winningReels = 4;
                if (countsPerReel[4] > 0 && countsPerReel[3] > 0) winningReels = 5;

                let payRates = PAYTABLE[symType] || [0.1, 0.2, 0.5];
                let rateIdx = Math.min(winningReels - 3, payRates.length - 1);
                rateIdx = Math.max(0, rateIdx);

                let winAmount = ways * payRates[rateIdx] * currentBet;
                payout += winAmount;

                for (let r = 0; r < winningReels; r++) {
                    tilesPerReel[r].forEach(t => {
                        if (!winningTiles.includes(t.element)) {
                            winningTiles.push(t.element);
                        }
                    });
                }
            }
        }

        return { payout: payout, tiles: winningTiles };
    }

    // ==========================================
    // FALL ANIMATION
    // ==========================================
    async function animateFallDown() {
        for (let reelIdx = 0; reelIdx < 5; reelIdx++) {
            let reel = $(`#reel${reelIdx}`);
            let tiles = reel.children('.tile').not('.exploding');
            
            let targetIndex = 0;
            
            tiles.each(function() {
                let tile = $(this);
                let rect = tile[0].getBoundingClientRect();
                let parentRect = reel[0].getBoundingClientRect();
                
                let currentBottom = parentRect.bottom - rect.bottom;
                let tileHeight = rect.height;
                let targetBottom = targetIndex * tileHeight;
                let fallDistance = currentBottom - targetBottom;
                
                if (fallDistance > 3) {
                    tile.css({
                        'transform': `translateY(${-fallDistance}px)`,
                        'transition': 'none'
                    });
                    
                    setTimeout(() => {
                        tile.css({
                            'transform': 'translateY(0)',
                            'transition': `transform ${isTurbo ? 0.15 : 0.22}s cubic-bezier(0.22, 1, 0.36, 1)`
                        });
                    }, 15);
                }
                
                targetIndex++;
            });
        }

        await new Promise(r => setTimeout(r, isTurbo ? 180 : 280));
    }

    // ==========================================
    // CASCADE LOGIC
    // ==========================================
    async function cascadeLogic() {
        let result = calculateWaysWin();

        if (result.payout > 0) {
            cascadeCount++;

            result.tiles.forEach((el) => $(el).addClass("winning-glow"));

            await new Promise(r => setTimeout(r, isTurbo ? 120 : 200));

            result.tiles.forEach((el) => {
                let rect = el.getBoundingClientRect();
                let centerX = rect.left + rect.width / 2;
                let centerY = rect.top + rect.height / 2;

                let isGold = $(el).hasClass("gold");
                let tileType = $(el).attr('data-type');
                let asset = tileAssets.find(a => a.id === tileType);
                let tier = asset ? asset.tier : 1;

                if (isGold) {
                    SFX.breakGold();
                    spawnParticles(centerX, centerY, 'explode', 'gold');
                    
                    $(el).removeClass('gold winning-glow')
                         .addClass('wild wild-transform')
                         .attr('data-type', 'W');
                    $(el).find('img').attr('src', wildImg);
                } else {
                    SFX.breakTile();
                    spawnParticles(centerX, centerY, 'explode', tier);
                    $(el).removeClass("winning-glow").addClass("exploding");
                }
            });

            await new Promise(r => setTimeout(r, isTurbo ? 120 : 200));

            $(".tile.exploding").remove();

            await animateFallDown();

            if (cascadeCount > 0 && cascadeCount <= 4) {
                currentMultIdx = Math.min(cascadeCount - 1, 3);
            }

            let actMults = freeSpinsLeft > 0 ? multFS : multNormal;
            let multValue = actMults[currentMultIdx];
            let actualWin = result.payout * multValue;
            winThisTurn += actualWin;

            SFX.win();
            $("#win-amount").text(formatRupiah(winThisTurn)).addClass("win-glow-anim");
            updateUIOnly();

            fillGrid(false);

            await new Promise(r => setTimeout(r, isTurbo ? 220 : 400));

            if (cascadeCount < cfg.maxCascades) {
                await cascadeLogic();
            }
        }
    }

    // ==========================================
    // SCATTER CHECK - DENGAN BET LOCK
    // ==========================================
    async function checkScatter() {
        let scatterCount = $(".tile.scatter").length;

        if (scatterCount >= 3) {
            SFX.scatterTrigger();

            $("#scatter-count-text").text(`${scatterCount} SCATTERS`);
            $("#scatter-total-win").text(formatRupiah(winThisTurn));
            
            $("#scatter-win-overlay").css("display", "flex");
            spawnParticles(cvs.width/2, cvs.height/2, 'center_burst', 'mega');

            await new Promise(r => setTimeout(r, 2200));
            $("#scatter-win-overlay").css("display", "none");

            if (freeSpinsLeft > 0) {
                // RETRIGGER - Tambah win ke total bonus
                totalBonusWin += winThisTurn;
                freeSpinsLeft += 10;
                
                $("#retrigger-popup").css("display", "block");
                SFX.retrigger();
                spawnParticles(0, 0, 'coin_rain', 3);

                await new Promise(r => setTimeout(r, 1300));
                $("#retrigger-popup").css("display", "none");
            } else {
                // TRIGGER BARU - LOCK BET!
                freeSpinsLeft = 10;
                lockedBetIdx = betIdx;
                lockedBetAmount = betSteps[betIdx];
                
                // Win scatter masuk total bonus
                totalBonusWin = winThisTurn;

                $("#fs-total-win").text(formatRupiah(winThisTurn));
                $("#fs-overlay").css("display", "flex");
                spawnParticles(0, 0, 'coin_rain', 3);

                await new Promise(r => setTimeout(r, 2200));
                $("#fs-overlay").css("display", "none");
            }
            updateUIData();
        }
    }

    // ==========================================
    // WIN TIERS
    // ==========================================
    async function handleWinTiers(winAmount, betAmount) {
        if (winAmount <= 0) return;

        let ratio = winAmount / betAmount;
        let tier = "";
        let title = "";

        if (ratio >= 20) { tier = "tier-sensational"; title = "SENSATIONAL WIN!"; }
        else if (ratio >= 10) { tier = "tier-mega"; title = "MEGA WIN!"; }
        else if (ratio >= 5) { tier = "tier-big"; title = "BIG WIN!"; }

        let oldBalance = balance;
        balance += winAmount;

        if (tier) {
            SFX.bigWin();
            $("#win-overlay").removeClass("tier-big tier-mega tier-sensational").addClass(tier);
            $("#win-title-text").text(title);
            $("#win-overlay-number").text(formatRupiah(winAmount));
            $("#win-overlay").css("display", "flex");

            spawnParticles(0, 0, 'coin_rain', ratio >= 10 ? 5 : 3);
            spawnParticles(cvs.width/2, cvs.height/2, 'center_burst', tier === 'tier-sensational' ? 'sensational' : tier === 'tier-mega' ? 'mega' : 'big');
            spawnParticles(0, 0, 'sparkle');

            animateValue($("#balance"), oldBalance, balance, 1400);
            await new Promise(r => setTimeout(r, 3500));
            $("#win-overlay").css("display", "none");
        } else {
            animateValue($("#balance"), oldBalance, balance, 450);
        }
        
        updateUIOnly();
    }

    // ==========================================
    // BONUS SUMMARY - AKHIR FS
    // ==========================================
    async function showBonusSummary() {
        if (totalBonusWin <= 0) return;

        SFX.bigWin();

        let oldBalance = balance;
        balance += totalBonusWin;

        $("#bonus-total-number").text(formatRupiah(totalBonusWin));
        $("#bonus-summary-overlay").css("display", "flex");

        spawnParticles(0, 0, 'coin_rain', 5);
        spawnParticles(cvs.width/2, cvs.height/2, 'center_burst', 'sensational');

        // Reset
        totalBonusWin = 0;
        lockedBetIdx = 0;
        lockedBetAmount = 0;

        animateValue($("#balance"), oldBalance, balance, 1400);

        await new Promise(resolve => {
            $("#close-summary-btn").one('click', resolve);
        });

        $("#bonus-summary-overlay").css("display", "none");
        updateUIData();
    }

    // ==========================================
    // PROCESS SPIN - MAIN LOGIC
    // ==========================================
    async function processSpin() {
        if (isSpinning) return;

        let oldBalance = balance;
        let currentBet = freeSpinsLeft > 0 ? lockedBetAmount : betSteps[betIdx];

        if (freeSpinsLeft > 0) {
            freeSpinsLeft--;
        } else {
            if (balance < currentBet) {
                showAlert("SALDO HABIS", "Saldo Anda tidak mencukupi untuk taruhan.");
                autoRemaining = 0;
                updateUIData();
                return;
            }
            balance -= currentBet;
        }

        isSpinning = true;
        winThisTurn = 0;
        currentMultIdx = 0;
        cascadeCount = 0;

        SFX.spin();

        $("#main-spin-btn").addClass('spinning');
        $(".spin-aura").css('opacity', 1);

        if (freeSpinsLeft === 0) {
            animateValue($("#balance"), oldBalance, balance, 250);
        }
        updateUIData();
        
        $("#win-amount").text("Rp 0").removeClass("win-glow-anim");

        $(".tile").css({ "transition": "opacity 0.15s", "opacity": "0" });
        await new Promise(r => setTimeout(r, isTurbo ? 50 : 150));
        $(".reel").empty();

        let winChance = cfg.baseWinChance;

        // Kurangi win chance jika bet tinggi (kecuali mode GACOR)
        if (GAME_MODE !== "GACOR") {
            if (currentBet > 1200) winChance *= 0.7;
            if (currentBet >= 10000) winChance *= 0.5;
        }

        let forceLoss = Math.random() > winChance;
        fillGrid(forceLoss);

        await new Promise(r => setTimeout(r, isTurbo ? 300 : 900));
        $("#main-spin-btn").removeClass('spinning');

        await cascadeLogic();
        await checkScatter();
        
        // Logic saldo
        if (freeSpinsLeft > 0) {
            // Masih dalam FS, akumulasi ke total bonus
            totalBonusWin += winThisTurn;
        } else {
            // Spin normal atau FS baru saja selesai
            await handleWinTiers(winThisTurn, currentBet);
        }

        $(".spin-aura").css('opacity', 0);
        isSpinning = false;

        // Jika FS selesai, tampilkan summary
        if (freeSpinsLeft === 0 && totalBonusWin > 0) {
            await showBonusSummary();
        }

        // Loop spin
        if (freeSpinsLeft > 0 || autoRemaining > 0) {
            if (freeSpinsLeft === 0 && autoRemaining > 0) autoRemaining--;
            updateUIData();
            setTimeout(processSpin, isTurbo ? 350 : 900);
        } else {
            updateUIData();
        }
    }

    // ==========================================
    // EVENT HANDLERS
    // ==========================================
    
    // Stop / Spin
    $("#main-spin-btn").on('click', function() {
        // Stop Auto atau FS
        if ((autoRemaining > 0 || freeSpinsLeft > 0) && !isSpinning) {
            autoRemaining = 0;
            
            // Jika ada bonus, tampilkan summary dulu
            if (totalBonusWin > 0) {
                showBonusSummary();
            } else {
                freeSpinsLeft = 0;
                lockedBetIdx = 0;
                lockedBetAmount = 0;
                updateUIData();
            }
            
            $("#auto-btn").removeClass("active");
            return;
        }
        
        if (!isSpinning) processSpin();
    });

    // Hover Stop
    $("#main-spin-btn").on('mouseenter touchstart', function() {
        if (autoRemaining > 0 || freeSpinsLeft > 0) {
            $(this).addClass('stop-mode');
            $("#spin-icon").text("STOP").show();
            $("#auto-count").hide();
        }
    });

    $("#main-spin-btn").on('mouseleave touchend', function() {
        $(this).removeClass('stop-mode');
        updateUIOnly();
    });

    // Turbo
    $("#turbo-btn").on('click', function() {
        isTurbo = !isTurbo;
        $(this).toggleClass("active", isTurbo);
    });

    // PLUS BET - DISABLE SAAT FREE SPINS
    $("#plus-bet").on('click', function() {
        if (isSpinning) return;
        
        // FIX: Tidak bisa ubah bet saat Free Spins
        if (freeSpinsLeft > 0) {
            showAlert("LOCKED", "Tidak dapat mengubah taruhan\nselama Free Spins!");
            return;
        }
        
        if (betIdx < betSteps.length - 1) { 
            betIdx++; 
            updateUIData(); 
        }
    });

    // MINUS BET - DISABLE SAAT FREE SPINS
    $("#minus-bet").on('click', function() {
        if (isSpinning) return;
        
        // FIX: Tidak bisa ubah bet saat Free Spins
        if (freeSpinsLeft > 0) {
            showAlert("LOCKED", "Tidak dapat mengubah taruhan\nselama Free Spins!");
            return;
        }
        
        if (betIdx > 0) { 
            betIdx--; 
            updateUIData(); 
        }
    });

    // AUTO - DISABLE SAAT FREE SPINS
    $("#auto-btn").on('click', function() {
        if (isSpinning) return;
        
        // FIX: Tidak bisa auto saat Free Spins
        if (freeSpinsLeft > 0) {
            showAlert("LOCKED", "Tidak dapat menggunakan Auto\nselama Free Spins!");
            return;
        }
        
        $("#auto-modal").css("display", "flex");
    });

    $(".opt").on('click', function() {
        let val = $(this).data('val');
        autoRemaining = val === 1000 ? 999999 : val;
        $("#auto-modal").css("display", "none");
        updateUIData();
        processSpin();
    });

    $("#close-auto").on('click', function() { $("#auto-modal").css("display", "none"); });
    $("#close-alert").on('click', function() { $("#alert-modal").css("display", "none"); });

    $("#win-overlay, #fs-overlay, #scatter-win-overlay").on('click', function() { $(this).css("display", "none"); });

    // ==========================================
    // INITIALIZE
    // ==========================================
    updateUIData();
    animateValue($("#balance"), 0, balance, 450);
    fillGrid(false);

    // ==========================================
    // QR CODE GENERATOR
    // ==========================================
    function generateQRCode(text, canvasId) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        const size = 160;
        canvas.width = size; canvas.height = size;
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size);
        const cellSize = 4;
        const gridSize = Math.floor(size / cellSize);
        ctx.fillStyle = '#000000';
        function drawPositionPattern(x, y) {
            ctx.fillRect(x * cellSize, y * cellSize, 7 * cellSize, 7 * cellSize);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect((x + 1) * cellSize, (y + 1) * cellSize, 5 * cellSize, 5 * cellSize);
            ctx.fillStyle = '#000000';
            ctx.fillRect((x + 2) * cellSize, (y + 2) * cellSize, 3 * cellSize, 3 * cellSize);
        }
        drawPositionPattern(0, 0); drawPositionPattern(gridSize - 7, 0); drawPositionPattern(0, gridSize - 7);
        let hash = 0;
        for (let i = 0; i < text.length; i++) { hash = ((hash << 5) - hash) + text.charCodeAt(i); hash = hash & hash; }
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                if ((x < 8 && y < 8) || (x >= gridSize - 8 && y < 8) || (x < 8 && y >= gridSize - 8)) continue;
                const seed = hash + x * gridSize + y;
                if (Math.sin(seed * 12.9898 + 78.233) * 43758.5453 % 1 > 0.5) ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
    }

    // ==========================================
    // MENU & TOPUP/WITHDRAW
    // ==========================================
    let selectedTopupAmount = 0;
    
    $("#menu-toggle-btn").on('click', function(e) { e.stopPropagation(); $("#menu-popup").toggle(); });
    
    $(document).on('click', function(e) { 
        if (!$(e.target).closest('#menu-toggle-btn, #menu-popup').length) $("#menu-popup").hide(); 
    });
    
    // TOPUP
    $("#menu-topup").on('click', function() {
        $("#menu-popup").hide(); 
        selectedTopupAmount = 0; 
        $(".topup-amt").removeClass("selected"); 
        $("#topup-amount-input").val(""); 
        $("#custom-amount-section").hide();
        generateQRCode("TOPUP" + Date.now().toString(36).toUpperCase(), "qr-canvas");
        const expireTime = new Date(Date.now() + 15 * 60 * 1000);
        $("#qr-expire-time").text(expireTime.toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'}));
        $("#topup-modal").css("display", "flex");
    });
    
    $(".topup-amt").on('click', function() {
        const val = $(this).data('val');
        $(".topup-amt").removeClass("selected"); 
        $(this).addClass("selected");
        
        if (val === "custom") { 
            $("#custom-amount-section").show(); 
            $("#topup-amount-input").val(""); 
            $("#custom-amount-input").val("").focus(); 
            selectedTopupAmount = 0; 
        } else { 
            $("#custom-amount-section").hide(); 
            selectedTopupAmount = parseInt(val); 
            $("#topup-amount-input").val(formatRupiahSimple(selectedTopupAmount)); 
            generateQRCode("T" + selectedTopupAmount + "_" + Date.now().toString(36), "qr-canvas"); 
        }
    });
    
    $("#custom-amount-input").on('input', function() {
        let val = parseInt($(this).val()) || 0; 
        selectedTopupAmount = val; 
        $("#topup-amount-input").val(val > 0 ? formatRupiahSimple(val) : "");
        if (val > 0) generateQRCode("T" + val + "_" + Date.now().toString(36), "qr-canvas");
    });
    
    $("#close-topup, #btn-cancel-topup").on('click', function() { $("#topup-modal").css("display", "none"); });
    
    $("#btn-confirm-topup").on('click', function() {
        if (selectedTopupAmount <= 0) { showAlert("GAGAL", "Pilih nominal topup terlebih dahulu!"); return; }
        if (selectedTopupAmount < 10000) { showAlert("GAGAL", "Minimal topup Rp 10.000!"); return; }
        
        let old = balance; 
        balance += selectedTopupAmount;
        animateValue($("#balance"), old, balance, 800); 
        updateUIData();
        SFX.bigWin(); 
        spawnParticles(0, 0, 'coin_rain', 4);
        $("#topup-modal").css("display", "none");
        $("#topup-success-amount").text(formatRupiah(selectedTopupAmount)); 
        $("#topup-success-balance").text(formatRupiah(balance));
        $("#topup-success-time").text(new Date().toLocaleString('id-ID'));
        $("#topup-success-modal").css("display", "flex"); 
        selectedTopupAmount = 0;
    });
    
    $("#close-topup-success").on('click', function() { $("#topup-success-modal").css("display", "none"); });

    // WITHDRAW
    $("#menu-withdraw").on('click', function() {
        $("#menu-popup").hide();
        $("#withdraw-balance-val").text(formatRupiah(balance));
        $("#withdraw-amount").val(""); 
        $("#withdraw-method").val(""); 
        $("#withdraw-account").val(""); 
        $("#withdraw-name").val("");
        $("#name-field").hide(); 
        $("#account-label").text("Nomor Tujuan");
        $("#withdraw-modal").css("display", "flex");
    });
    
    $("#withdraw-method").on('change', function() {
        const m = $(this).val();
        if (['BCA','MANDIRI','BNI','BRI'].includes(m)) { 
            $("#name-field").slideDown(200); 
            $("#account-label").text("No. Rekening"); 
        } else if (['DANA','OVO','GOPAY','SHOPEEPAY'].includes(m)) { 
            $("#name-field").slideUp(200); 
            $("#account-label").text("Nomor HP"); 
        } else { 
            $("#name-field").slideUp(200); 
            $("#account-label").text("Nomor Tujuan"); 
        }
    });
    
    $("#close-withdraw, #btn-cancel-withdraw").on('click', function() { $("#withdraw-modal").css("display", "none"); });
    
    $("#btn-confirm-withdraw").on('click', function() {
        let amt = parseInt($("#withdraw-amount").val())||0; 
        let met = $("#withdraw-method").val(); 
        let acc = $("#withdraw-account").val().trim(); 
        let nm = $("#withdraw-name").val().trim();
        
        if (amt <= 0) { showAlert("GAGAL", "Masukkan jumlah withdraw yang valid!"); return; }
        if (amt < 10000) { showAlert("GAGAL", "Minimal withdraw Rp 10.000!"); return; }
        if (amt > balance) { showAlert("GAGAL", "Saldo tidak mencukupi!"); return; }
        if (!met) { showAlert("GAGAL", "Pilih metode pembayaran!"); return; }
        if (!acc) { showAlert("GAGAL", "Masukkan nomor tujuan!"); return; }
        if (['BCA','MANDIRI','BNI','BRI'].includes(met) && !nm) { showAlert("GAGAL", "Masukkan nama pemilik rekening!"); return; }
        
        let old = balance; 
        balance -= amt;
        animateValue($("#balance"), old, balance, 500); 
        updateUIData();
        $("#success-amount").text(formatRupiah(amt)); 
        $("#success-method").text(met); 
        $("#success-account").text(['BCA','MANDIRI','BNI','BRI'].includes(met) ? acc+" ("+nm+")" : acc);
        $("#withdraw-modal").css("display", "none"); 
        $("#withdraw-success-modal").css("display", "flex"); 
        SFX.win();
    });
    
    $("#close-withdraw-success").on('click', function() { $("#withdraw-success-modal").css("display", "none"); });

});