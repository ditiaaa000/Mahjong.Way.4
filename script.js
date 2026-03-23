 $(document).ready(function() {

    // ==========================================
    // SETTINGS & CONFIG
    // ==========================================
    const GAME_MODE = "NORMAL";

    const RTP_CONFIG = {
        "GACOR":  { scatterChance: 0.05, goldChance: 0.70, baseWinChance: 0.95, maxCascades: 50, weights: { high: 60, mid: 30, low: 10 } },
        "NORMAL": { scatterChance: 0.04, goldChance: 0.40, baseWinChance: 0.45, maxCascades: 8, weights: { high: 19, mid: 30, low: 50 } },
        "BAD":    { scatterChance: 0.015, goldChance: 0.15, baseWinChance: 0.30, maxCascades: 3, weights: { high: 10, mid: 20, low: 70 } }
    };
    let cfg = RTP_CONFIG[GAME_MODE];

    // ==========================================
    // PAYTABLE
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
    // HISTORY DATA & LOCAL STORAGE
    // ==========================================
    let topupHistory = [];
    let withdrawHistory = [];
    let balance = 500000;
    
    function loadGameData() {
        const savedData = localStorage.getItem('mahjong_ways_4_data');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                balance = data.balance || 500000;
                topupHistory = data.topupHistory || [];
                withdrawHistory = data.withdrawHistory || [];
            } catch (e) { balance = 500000; }
        }
    }
    function saveGameData() {
        const data = { balance: balance, topupHistory: topupHistory, withdrawHistory: withdrawHistory };
        localStorage.setItem('mahjong_ways_4_data', JSON.stringify(data));
    }
    loadGameData();

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
        masterGain.gain.value = 0.9;
        masterGain.connect(audioCtx.destination);
        bgmPlayer.play().catch(e => console.log("BGM blocked"));
        createBgParticles();
    }

    const SFX = {
        drop: function() { if (!audioCtx) return; const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = 'triangle'; osc.frequency.setValueAtTime(700, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(350, audioCtx.currentTime + 0.04); gain.gain.setValueAtTime(0.18, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06); osc.connect(gain); gain.connect(masterGain); osc.start(); osc.stop(audioCtx.currentTime + 0.06); },
        spin: function() { if (!audioCtx) return; const noise = audioCtx.createBufferSource(); const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.6, audioCtx.sampleRate); const data = buffer.getChannelData(0); for (let i = 0; i < buffer.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / buffer.length) * 0.4; noise.buffer = buffer; const filter = audioCtx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 1000; filter.Q.value = 0.5; noise.connect(filter); filter.connect(masterGain); noise.start(); },
        reelStop: function() { if (!audioCtx) return; const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(150, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1); gain.gain.setValueAtTime(0.5, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15); osc.connect(gain); gain.connect(masterGain); osc.start(); osc.stop(audioCtx.currentTime + 0.15); },
        scatter: function() { if (!audioCtx) return; const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = 'sine'; osc.frequency.value = 1500; gain.gain.setValueAtTime(0.18, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18); osc.connect(gain); gain.connect(masterGain); osc.start(); osc.stop(audioCtx.currentTime + 0.18); },
        scatterTrigger: function() { if (!audioCtx) return; [523, 659, 784, 1046, 1318].forEach((freq, i) => { setTimeout(() => { const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = 'triangle'; osc.frequency.value = freq; gain.gain.setValueAtTime(0.3, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4); osc.connect(gain); gain.connect(masterGain); osc.start(); osc.stop(audioCtx.currentTime + 0.4); }, i * 100); }); },
        breakTile: function() { if (!audioCtx) return; const dur = 0.07; const noise = audioCtx.createBufferSource(); const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate); const data = buffer.getChannelData(0); for (let i = 0; i < buffer.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / buffer.length, 2) * 0.5; noise.buffer = buffer; const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 2200; noise.connect(filter); filter.connect(masterGain); noise.start(); },
        breakGold: function() { if (!audioCtx) return; SFX.breakTile(); const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(2200, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(3500, audioCtx.currentTime + 0.1); gain.gain.setValueAtTime(0.15, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1); osc.connect(gain); gain.connect(masterGain); osc.start(); osc.stop(audioCtx.currentTime + 0.1); },
        win: function() { if (!audioCtx) return; const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = 'sine'; osc.frequency.value = 920; gain.gain.setValueAtTime(0.18, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15); osc.connect(gain); gain.connect(masterGain); osc.start(); osc.stop(audioCtx.currentTime + 0.15); },
        bigWin: function() { if (!audioCtx) return; [523, 659, 784, 1046, 1318, 1568].forEach((freq, i) => { setTimeout(() => { const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = 'triangle'; osc.frequency.value = freq; gain.gain.setValueAtTime(0.25, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3); osc.connect(gain); gain.connect(masterGain); osc.start(); osc.stop(audioCtx.currentTime + 0.3); }, i * 70); }); },
        retrigger: function() { if (!audioCtx) return; [800, 1000, 1200, 1600].forEach((freq, i) => { setTimeout(() => { const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = 'sine'; osc.frequency.value = freq; gain.gain.setValueAtTime(0.22, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18); osc.connect(gain); gain.connect(masterGain); osc.start(); osc.stop(audioCtx.currentTime + 0.18); }, i * 70); }); }
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

    const betSteps = [400, 600, 800, 1000, 1200, 1400, 2000, 2400, 4800, 10000, 20000, 50000];
    const multNormal = [1, 2, 3, 5];
    const multFS = [2, 4, 6, 10];

    let betIdx = 1;
    let isSpinning = false;
    let autoRemaining = 0;
    let freeSpinsLeft = 0;
    let isTurbo = false;
    let currentMultIdx = 0;
    let winThisTurn = 0;
    let cascadeCount = 0;
    let totalBonusWin = 0;
    
    let lockedBetIdx = 0;
    let lockedBetAmount = 0;
    
    let stopOnBigWin = true; 

    // ==========================================
    // CANVAS ENGINE
    // ==========================================
    const cvs = document.getElementById('fx-canvas');
    const ctx = cvs.getContext('2d');
    let particles = [];
    let lastFrameTime = 0;

    function resizeCanvas() { cvs.width = window.innerWidth; cvs.height = window.innerHeight; }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function spawnParticles(x, y, type, tier) {
        tier = tier || 1; let count = 10;
        if (type === 'explode') { count = tier === 'gold' ? 16 : 12; for (let i = 0; i < count; i++) particles.push(new Particle(x, y, 'shard', tier)); }
        else if (type === 'coin_rain') { count = tier * 8; for (let i = 0; i < count; i++) particles.push(new Particle(Math.random() * cvs.width, -30, 'coin')); }
        else if (type === 'sparkle') { for (let i = 0; i < 30; i++) particles.push(new Particle(Math.random() * cvs.width, Math.random() * cvs.height, 'sparkle')); }
        else if (type === 'center_burst') { for (let i = 0; i < 50; i++) particles.push(new Particle(cvs.width/2, cvs.height/2, 'centerBurst', tier)); }
    }

    class Particle {
        constructor(x, y, type, tier) {
            this.x=x; this.y=y; this.type=type; this.tier=tier||1; this.life=1; this.opacity=1;
            if(type==='shard'){this.size=Math.random()*10+4;this.vx=(Math.random()-0.5)*20;this.vy=(Math.random()-0.6)*22;this.rotation=Math.random()*360;this.rotSpeed=(Math.random()-0.5)*30;this.color=tier==='gold'?'#ffd700':'#ffffff';}
            else if(type==='coin'){this.size=Math.random()*32+22;this.vx=(Math.random()-0.5)*6;this.vy=Math.random()*12+5;this.angle=Math.random()*360;this.spinSpeed=(Math.random()-0.5)*25;}
            else if(type==='sparkle'){this.size=Math.random()*7+3;this.vx=(Math.random()-0.5)*12;this.vy=(Math.random()-0.5)*12;this.life=Math.random()*0.6+0.4;}
            else if(type==='centerBurst'){this.size=Math.random()*8+4;let a=Math.random()*Math.PI*2,s=Math.random()*25+15;this.vx=Math.cos(a)*s;this.vy=Math.sin(a)*s;this.color=tier==='sensational'?'#ff0055':tier==='mega'?'#cc00ff':'#00bbff';this.life=1.2;}
        }
        update(dt){const s=dt/16;if(this.type==='shard'){this.vy+=0.7*s;this.x+=this.vx*s;this.y+=this.vy*s;this.life-=0.055*s;this.rotation+=this.rotSpeed*s;}
        else if(this.type==='coin'){this.y+=this.vy*s;this.angle+=this.spinSpeed*s;if(this.y>cvs.height+25)this.life=0;}
        else if(this.type==='sparkle'){this.x+=this.vx*s;this.y+=this.vy*s;this.life-=0.028*s;}
        else if(this.type==='centerBurst'){this.x+=this.vx*s;this.y+=this.vy*s;this.vx*=0.96;this.vy*=0.96;this.life-=0.015*s;}
        this.opacity=Math.max(0,this.life);}
        draw(){ctx.save();ctx.globalAlpha=this.opacity;
        if(this.type==='shard'){ctx.translate(this.x,this.y);ctx.rotate(this.rotation*Math.PI/180);ctx.fillStyle=this.color;ctx.shadowColor=this.color;ctx.shadowBlur=10;ctx.fillRect(-this.size/2,-this.size/2,this.size,this.size);}
        else if(this.type==='coin'){ctx.translate(this.x,this.y);ctx.rotate(this.angle*Math.PI/180);let sx=Math.abs(Math.sin(this.angle*Math.PI/180));ctx.scale(Math.max(0.25,sx),1);let g=ctx.createRadialGradient(0,0,0,0,0,this.size/2);g.addColorStop(0,'#fff7cc');g.addColorStop(0.5,'#ffd700');g.addColorStop(1,'#b8860b');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,this.size/2,0,Math.PI*2);ctx.fill();}
        else if(this.type==='sparkle'){ctx.fillStyle='#fff';ctx.shadowColor='#fff';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(this.x,this.y,this.size,0,Math.PI*2);ctx.fill();}
        else if(this.type==='centerBurst'){ctx.fillStyle=this.color;ctx.shadowColor=this.color;ctx.shadowBlur=15;ctx.beginPath();ctx.arc(this.x,this.y,this.size,0,Math.PI*2);ctx.fill();}
        ctx.restore();}
    }
    function renderFX(ts){const dt=Math.min(ts-lastFrameTime,32);lastFrameTime=ts;ctx.clearRect(0,0,cvs.width,cvs.height);for(let i=particles.length-1;i>=0;i--){particles[i].update(dt);particles[i].draw();if(particles[i].life<=0)particles.splice(i,1);}requestAnimationFrame(renderFX);}
    requestAnimationFrame(renderFX);

    // ==========================================
    // HELPER
    // ==========================================
    function formatRupiah(n){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(n);}
    function formatRupiahSimple(n){return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g,".");}
    function animateValue(o,s,e,d){let st=null;const step=(t)=>{if(!st)st=t;const p=Math.min((t-st)/d,1);let c=Math.floor(p*(e-s)+s);o.text(formatRupiah(c));if(p<1)window.requestAnimationFrame(step);};window.requestAnimationFrame(step);}
    function showAlert(t,m){$("#alert-title").text(t);$("#alert-message").text(m);$("#alert-modal").css("display","flex");}

    // ==========================================
    // UI UPDATE
    // ==========================================
    function updateUIOnly() {
        let actMults = freeSpinsLeft > 0 ? multFS : multNormal;
        $(".mult").each((i, el) => { $(el).text("x" + actMults[i]); $(el).toggleClass("active", i === currentMultIdx); });
        
        if (freeSpinsLeft > 0) {
            $("#spin-icon").hide(); $("#auto-count").text(freeSpinsLeft).show();
            $("#fs-indicator").text(`FREE SPINS: ${freeSpinsLeft}`).addClass('win-glow-anim');
            $("#plus-bet, #minus-bet, #auto-btn").addClass('btn-disabled');
            $("#fs-total-bar").slideDown(200);
            $("#fs-accumulated-win").text(formatRupiah(totalBonusWin));
        } else if (autoRemaining > 0) {
            $("#spin-icon").hide(); $("#auto-count").text(autoRemaining).show(); $("#auto-btn").addClass("active");
            $("#fs-indicator").text("2000 WAYS").removeClass('win-glow-anim');
            $("#plus-bet, #minus-bet, #auto-btn").removeClass('btn-disabled');
            $("#fs-total-bar").slideUp(200);
        } else {
            $("#spin-icon").show().text("MULAI"); $("#auto-count").hide(); $("#auto-btn").removeClass("active");
            $("#fs-indicator").text("2000 WAYS").removeClass('win-glow-anim');
            $("#plus-bet, #minus-bet, #auto-btn").removeClass('btn-disabled');
            $("#fs-total-bar").slideUp(200);
        }
    }
    
    function updateUIData() {
        $("#balance").text(formatRupiah(balance));
        if (freeSpinsLeft > 0) $("#bet-amount").text(formatRupiah(lockedBetAmount)).addClass('bet-locked');
        else $("#bet-amount").text(formatRupiah(betSteps[betIdx])).removeClass('bet-locked');
        updateUIOnly();
    }

    // ==========================================
    // GRID FUNCTIONS
    // ==========================================
    function getReelHeight(i){return(i===0||i===4)?4:5;}
    
    function createTileHtml(a,g,s,d,extraStyle){
        let src=g?IMG_PATH+a.gold:IMG_PATH+a.normal;
        let cls="tile drop-anim"+(g?" gold":"")+(s?" scatter":"");
        return`<div class="${cls}" style="animation-delay:${d}ms;${extraStyle}" data-type="${s?'S':a.id}"><img src="${s?scatterImg:src}" onerror="this.style.display='none'"></div>`;
    }
    
    function generateGridData(forceLoss){
        let r0=[]; let reelData = [[],[],[],[],[]];
        let asc=freeSpinsLeft>0?(cfg.scatterChance*0.1):cfg.scatterChance;
        let scCount=0;
        for(let ri=0;ri<5;ri++){
            let lim=getReelHeight(ri);
            for(let i=0;i<lim;i++){
                let r=Math.random(),as; 
                let roll=Math.random()*100;
                if(roll<cfg.weights.high)as=tileAssets.filter(a=>a.tier===3)[Math.floor(Math.random()*3)];
                else if(roll<cfg.weights.high+cfg.weights.mid)as=tileAssets.filter(a=>a.tier===2)[Math.floor(Math.random()*2)];
                else as=tileAssets.filter(a=>a.tier===1)[Math.floor(Math.random()*4)];
                if(forceLoss && ri===2){let att=0;while(r0.includes(as.id)&&att<10){as=tileAssets[Math.floor(Math.random()*tileAssets.length)];att++;}}
                if(ri===0)r0.push(as.id);
                let isGold=false, isScatter=false;
                if(r<asc && scCount<3){ scCount++; isScatter=true; }
                else if(r<cfg.goldChance && ri>0 && ri<4){ isGold=true; }
                reelData[ri].push({asset: as, isGold: isGold, isScatter: isScatter});
            }
        }
        return reelData;
    }

    async function fillGrid(forceLoss){
        let gridData = generateGridData(forceLoss);
        SFX.spin();
        $(".reel").empty();
        for(let ri=0; ri<5; ri++){
            let reelEl = $(`#reel${ri}`);
            let html = "";
            let delay = ri * 70;
            gridData[ri].forEach((tileData) => {
                html += createTileHtml(tileData.asset, tileData.isGold, tileData.isScatter, delay);
            });
            reelEl.html(html);
            setTimeout(() => {
                SFX.reelStop();
                gridData[ri].forEach((tileData, idx) => {
                    if(tileData.isScatter) setTimeout(() => SFX.scatter(), idx*50);
                });
            }, delay + 300);
        }
        await new Promise(r => setTimeout(r, isTurbo ? 400 : 800));
    }

    // ==========================================
    // WIN CALCULATION
    // ==========================================
    function calculateWaysWin(){
        let pay=0,win=[];let reels=[];
        for(let r=0;r<5;r++){let s=[];$(`#reel${r} .tile`).each(function(){s.push({type:$(this).attr('data-type'),el:this});});reels.push(s);}
        let types=[...new Set(tileAssets.map(a=>a.id))];
        for(let t of types){
            let cp=[],tp=[];
            for(let r=0;r<5;r++){let m=reels[r].filter(s=>s.type===t||s.type==='W');cp.push(m.length);tp.push(m);}
            if(cp[0]>0&&cp[1]>0&&cp[2]>0){
                let w=cp[0]*cp[1]*cp[2];
                if(cp[3]>0)w*=cp[3];if(cp[4]>0&&cp[3]>0)w*=cp[4];
                let wr=3;if(cp[3]>0)wr=4;if(cp[4]>0&&cp[3]>0)wr=5;
                let pr=PAYTABLE[t]||[0.1,0.2,0.5],ri=Math.min(wr-3,pr.length-1);ri=Math.max(0,ri);
                let curBet=freeSpinsLeft>0?lockedBetAmount:betSteps[betIdx];
                let wa=w*pr[ri]*curBet;pay+=wa;
                for(let r=0;r<wr;r++)tp[r].forEach(x=>{if(!win.includes(x.el))win.push(x.el);});
            }
        }
        return{payout:pay,tiles:win};
    }

    // ==========================================
    // ANIMATION & CASCADE (UPDATED)
    // ==========================================
    async function animateFallDown(){
        for(let ri=0; ri<5; ri++){
            let rl=$(`#reel${ri}`);
            let ts=rl.children('.tile').not('.exploding');
            let ti=0;
            
            ts.each(function(){
                let t=$(this);
                let rect=t[0].getBoundingClientRect();
                let parentRect=rl[0].getBoundingClientRect();
                
                let currentBottom = parentRect.bottom - rect.bottom;
                let tileHeight = rect.height;
                let targetBottom = ti * tileHeight;
                let fd = currentBottom - targetBottom;

                if(fd > 3){
                    t.css({
                        'transform': `translateY(${-fd}px)`, 
                        'transition': 'none', 
                        'opacity': 0
                    });
                    
                    setTimeout(()=>{
                        t.css({
                            'transform': 'translateY(0)',
                            'transition': `transform ${isTurbo ? 0.15 : 0.22}s cubic-bezier(0.22, 1, 0.36, 1)`,
                            'opacity': 1
                        });
                    }, 15);
                } else {
                    t.css({
                        'transform': 'translateY(0)',
                        'opacity': 1
                    });
                }
                ti++;
            });
        }
        await new Promise(r => setTimeout(r, isTurbo ? 180 : 280));
    }

    async function cascadeLogic(){
        let res=calculateWaysWin();
        if(res.payout>0){
            cascadeCount++;

            // 1. FASE "TANDA EMAS" (VISUAL CUE)
            // Tambahkan class 'winning-glow' untuk memberi tanda emas dulu
            res.tiles.forEach(el => {
                $(el).addClass("winning-glow");
            });
            
            // Mainkan suara 'Ting!' pas tanda emas muncul
            SFX.scatter(); 

            // Jeda sebentar (350ms) agar pemain lihat efeknya
            await new Promise(r => setTimeout(r, isTurbo ? 200 : 350));

            // 2. FASE PENGHANCURAN (BREAKING)
            res.tiles.forEach(el=>{
                $(el).removeClass("winning-glow"); // Hapus tanda emas

                let r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
                let isG=$(el).hasClass("gold"),tt=$(el).attr('data-type'),as=tileAssets.find(a=>a.id===tt),tr=as?as.tier:1;
                
                if(isG){
                    // Jika Gold -> Pecah lalu jadi Wild
                    SFX.breakGold();
                    spawnParticles(cx,cy,'explode','gold');
                    $(el).removeClass('gold').addClass('wild wild-transform').attr('data-type','W').find('img').attr('src',wildImg);
                }
                else{
                    // Jika Biasa -> Pecah dan Hilang
                    SFX.breakTile();
                    spawnParticles(cx,cy,'explode',tr);
                    $(el).addClass("exploding");
                }
            });
            
            await new Promise(r=>setTimeout(r,isTurbo?100:180));
            
            $(".tile.exploding").remove();
            fillGridCascade(); 
            
            await animateFallDown();

            if(cascadeCount>0&&cascadeCount<=4)currentMultIdx=Math.min(cascadeCount-1,3);
            let am=freeSpinsLeft>0?multFS:multNormal,mv=am[currentMultIdx],aw=res.payout*mv;
            winThisTurn+=aw;
            SFX.win();
            $("#win-amount").text(formatRupiah(winThisTurn)).addClass("win-glow-anim");
            
            if(freeSpinsLeft > 0) {
                totalBonusWin += aw;
                $("#fs-accumulated-win").text(formatRupiah(totalBonusWin));
            }
            
            updateUIOnly();
            saveGameData();
            
            await new Promise(r=>setTimeout(r,isTurbo?200:350));
            if(cascadeCount<cfg.maxCascades)await cascadeLogic();
        }
    }
    
    function fillGridCascade(){
        for (let reelIdx = 0; reelIdx < 5; reelIdx++) {
            let limit = getReelHeight(reelIdx);
            let reel = $(`#reel${reelIdx}`);
            let currentCount = reel.children().length;
            let missingCount = limit - currentCount;

            for (let i = 0; i < missingCount; i++) {
                let r = Math.random(), asset;
                let roll = Math.random() * 100;
                if (roll < cfg.weights.high) asset = tileAssets.filter(a=>a.tier===3)[Math.floor(Math.random()*3)];
                else if (roll < cfg.weights.high + cfg.weights.mid) asset = tileAssets.filter(a=>a.tier===2)[Math.floor(Math.random()*2)];
                else asset = tileAssets.filter(a=>a.tier===1)[Math.floor(Math.random()*4)];

                let isGold = Math.random() < cfg.goldChance && reelIdx > 0 && reelIdx < 4;
                let style = 'opacity: 0; transform: translateY(-60px);';
                let tileHtml = createTileHtml(asset, isGold, false, 0, style);
                reel.prepend(tileHtml);
            }
        }
    }

    // ==========================================
    // SCATTER, WINS, SUMMARY
    // ==========================================
    async function checkScatter(){
        let sc=$(".tile.scatter").length;
        if(sc>=3){
            SFX.scatterTrigger();
            $("#scatter-count-text").text(`${sc} SCATTERS`);$("#scatter-total-win").text(formatRupiah(winThisTurn));
            $("#scatter-win-overlay").css("display","flex");spawnParticles(cvs.width/2,cvs.height/2,'center_burst','mega');
            await new Promise(r=>setTimeout(r,2200));$("#scatter-win-overlay").css("display","none");
            if(freeSpinsLeft>0){
                totalBonusWin+=winThisTurn;freeSpinsLeft+=10;
                $("#retrigger-popup").css("display","block");SFX.retrigger();spawnParticles(0,0,'coin_rain',3);
                await new Promise(r=>setTimeout(r,1300));$("#retrigger-popup").css("display","none");
                $("#fs-accumulated-win").text(formatRupiah(totalBonusWin));
            }else{
                freeSpinsLeft=10;lockedBetIdx=betIdx;lockedBetAmount=betSteps[betIdx];totalBonusWin=winThisTurn;
                $("#fs-total-win").text(formatRupiah(winThisTurn));$("#fs-overlay").css("display","flex");spawnParticles(0,0,'coin_rain',3);
                await new Promise(r=>setTimeout(r,2200));$("#fs-overlay").css("display","none");
                $("#fs-total-bar").slideDown(200);
                $("#fs-accumulated-win").text(formatRupiah(totalBonusWin));
            }
            updateUIData();
            saveGameData();
        }
    }
    
    async function handleWinTiers(amt,bet){
        if(amt<=0)return;
        let r=amt/bet,tier="",title="";
        if(r>=20){tier="tier-sensational";title="SENSATIONAL WIN!";}
        else if(r>=10){tier="tier-mega";title="MEGA WIN!";}
        else if(r>=5){tier="tier-big";title="BIG WIN!";}
        
        let old=balance;balance+=amt;
        
        if(tier){
            SFX.bigWin();$("#win-overlay").removeClass("tier-big tier-mega tier-sensational").addClass(tier);
            $("#win-title-text").text(title);$("#win-overlay-number").text(formatRupiah(amt));$("#win-overlay").css("display","flex");
            spawnParticles(0,0,'coin_rain',r>=10?5:3);spawnParticles(cvs.width/2,cvs.height/2,'center_burst',tier==='tier-sensational'?'sensational':tier==='tier-mega'?'mega':'big');spawnParticles(0,0,'sparkle');
            animateValue($("#balance"),old,balance,1400);await new Promise(r=>setTimeout(r,3500));$("#win-overlay").css("display","none");
            
            if(stopOnBigWin && autoRemaining > 0){
                autoRemaining = 0;
                $("#auto-btn").removeClass("active");
            }
        }else{animateValue($("#balance"),old,balance,450);}
        
        updateUIOnly();
        saveGameData();
    }
    
    async function showBonusSummary(){
        if(totalBonusWin<=0)return;
        SFX.bigWin();let old=balance;balance+=totalBonusWin;
        $("#bonus-total-number").text(formatRupiah(totalBonusWin));$("#bonus-summary-overlay").css("display","flex");
        spawnParticles(0,0,'coin_rain',5);spawnParticles(cvs.width/2,cvs.height/2,'center_burst','sensational');
        
        totalBonusWin=0;lockedBetIdx=0;lockedBetAmount=0;
        
        animateValue($("#balance"),old,balance,1400);
        await new Promise(r=>{$("#close-summary-btn").one('click',r);});
        
        $("#bonus-summary-overlay").css("display","none");
        $("#fs-total-bar").slideUp(200);
        updateUIData();
        saveGameData();
    }

    // ==========================================
    // PROCESS SPIN
    // ==========================================
    async function processSpin(){
        if(isSpinning)return;
        let old=balance,curBet=freeSpinsLeft>0?lockedBetAmount:betSteps[betIdx];
        if(freeSpinsLeft>0){freeSpinsLeft--;}else{if(balance<curBet){showAlert("SALDO HABIS","Saldo tidak cukup.");autoRemaining=0;updateUIData();return;}balance-=curBet;}
        isSpinning=true;winThisTurn=0;currentMultIdx=0;cascadeCount=0;
        $("#main-spin-btn").addClass('spinning');$(".spin-aura").css('opacity',1);
        if(freeSpinsLeft===0)animateValue($("#balance"),old,balance,250);
        updateUIData();$("#win-amount").text("Rp 0").removeClass("win-glow-anim");
        
        let wc=cfg.baseWinChance;
        if(GAME_MODE!=="GACOR"){if(curBet>1200)wc*=0.7;if(curBet>=10000)wc*=0.5;}
        await fillGrid(Math.random()>wc);
        
        $("#main-spin-btn").removeClass('spinning');
        await cascadeLogic();await checkScatter();
        if(freeSpinsLeft>0){totalBonusWin+=winThisTurn;}else{await handleWinTiers(winThisTurn,curBet);}
        $(".spin-aura").css('opacity',0);isSpinning=false;
        if(freeSpinsLeft===0&&totalBonusWin>0){await showBonusSummary();}
        if(freeSpinsLeft>0||autoRemaining>0){if(freeSpinsLeft===0&&autoRemaining>0)autoRemaining--;updateUIData();setTimeout(processSpin,isTurbo?350:900);}else{updateUIData();}
    }

    // ==========================================
    // EVENT HANDLERS (FIXED AUTO SPIN BUG)
    // ==========================================
    $("#main-spin-btn").on('click', function() {
        if ($("#scatter-win-overlay").css("display") === "flex") return;
        if ($("#fs-overlay").css("display") === "flex") return;
        if ($("#retrigger-popup").css("display") === "block") return;

        if ((autoRemaining > 0 || freeSpinsLeft > 0) && !isSpinning) {
            autoRemaining = 0;
            if (totalBonusWin > 0) { showBonusSummary(); } else { freeSpinsLeft = 0; lockedBetIdx = 0; lockedBetAmount = 0; updateUIData(); }
            $("#auto-btn").removeClass("active");
            return;
        }
        if (!isSpinning) processSpin();
    });
    $("#main-spin-btn").on('mouseenter touchstart',function(){if(autoRemaining>0||freeSpinsLeft>0){$(this).addClass('stop-mode');$("#spin-icon").text("STOP").show();$("#auto-count").hide();}});
    $("#main-spin-btn").on('mouseleave touchend',function(){$(this).removeClass('stop-mode');updateUIOnly();});
    $("#turbo-btn").on('click',function(){isTurbo=!isTurbo;$(this).toggleClass("active",isTurbo);});
    $("#plus-bet").on('click',function(){if(isSpinning)return;if(freeSpinsLeft>0){showAlert("LOCKED","Tidak dapat mengubah taruhan selama Free Spins!");return;}if(betIdx<betSteps.length-1){betIdx++;updateUIData();saveGameData();}});
    $("#minus-bet").on('click',function(){if(isSpinning)return;if(freeSpinsLeft>0){showAlert("LOCKED","Tidak dapat mengubah taruhan selama Free Spins!");return;}if(betIdx>0){betIdx--;updateUIData();saveGameData();}});
    
    // Auto Spin Events (Fixed)
    let selectedAutoSpins = 10; // Default variable

    $("#auto-btn").on('click', function(){
        if(isSpinning) return;
        if(freeSpinsLeft>0){ showAlert("LOCKED","Tidak dapat menggunakan Auto selama Free Spins!"); return; }
        
        // Reset tampilan
        $(".auto-opt").removeClass("selected");
        // Set default ke 10 saat buka
        $(".auto-opt[data-val='10']").addClass("selected");
        selectedAutoSpins = 10;
        
        $("#auto-modal").css("display", "flex");
    });

    // Klik opsi angka (FIXED: menggunakan .auto-opt)
    $(".auto-opt").on('click', function(){
        $(".auto-opt").removeClass("selected");
        $(this).addClass("selected");
        selectedAutoSpins = $(this).data('val');
    });

    // Klik tombol MULAI
    $("#btn-start-auto").on('click', function(){
        autoRemaining = (selectedAutoSpins === 1000) ? 999999 : selectedAutoSpins;
        $("#auto-modal").css("display", "none");
        updateUIData();
        processSpin();
    });

    $('#auto-stop-win').on('change', function(){ stopOnBigWin = $(this).is(':checked'); });
    
    $("#close-auto").on('click',function(){$("#auto-modal").css("display","none");});
    $("#close-alert").on('click',function(){$("#alert-modal").css("display","none");});
    $("#win-overlay, #fs-overlay, #scatter-win-overlay").on('click',function(){$(this).css("display","none");});

    // ==========================================
    // INITIALIZE
    // ==========================================
    updateUIData();animateValue($("#balance"),0,balance,450);fillGrid(false);

    // ==========================================
    // BACKGROUND ANIMATION
    // ==========================================
    function createBgParticles(){
        const bg = document.getElementById('animated-bg');
        if(!bg) return;
        for(let i=0; i<20; i++){
            let p = document.createElement('div');
            p.className = 'bg-particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.animationDuration = (Math.random() * 10 + 15) + 's';
            p.style.animationDelay = (Math.random() * 5) + 's';
            p.style.width = (Math.random() * 3 + 2) + 'px';
            p.style.height = p.style.width;
            bg.appendChild(p);
        }
    }

    // ==========================================
    // QR & MENU
    // ==========================================
    function generateQRCode(text,canvasId){
        const canvas=document.getElementById(canvasId),ctx=canvas.getContext('2d');
        const size=160;canvas.width=size;canvas.height=size;ctx.fillStyle='#ffffff';ctx.fillRect(0,0,size,size);
        const cs=4,gs=Math.floor(size/cs);ctx.fillStyle='#000000';
        function dpp(x,y){ctx.fillRect(x*cs,y*cs,7*cs,7*cs);ctx.fillStyle='#ffffff';ctx.fillRect((x+1)*cs,(y+1)*cs,5*cs,5*cs);ctx.fillStyle='#000000';ctx.fillRect((x+2)*cs,(y+2)*cs,3*cs,3*cs);}
        dpp(0,0);dpp(gs-7,0);dpp(0,gs-7);
        let h=0;for(let i=0;i<text.length;i++){h=((h<<5)-h)+text.charCodeAt(i);h=h&h;}
        for(let y=0;y<gs;y++){for(let x=0;x<gs;x++){if((x<8&&y<8)||(x>=gs-8&&y<8)||(x<8&&y>=gs-8))continue;const sd=h+x*gs+y;if(Math.sin(sd*12.9898+78.233)*43758.5453%1>0.5)ctx.fillRect(x*cs,y*cs,cs,cs);}}
    }
    
    let selectedTopupAmount = 0;
    
    // Menu Toggle
    $("#menu-toggle-btn").on('click', function(e) { e.stopPropagation(); $("#menu-popup").toggle(); });
    $(document).on('click', function(e) { if (!$(e.target).closest('#menu-toggle-btn, #menu-popup').length) { $("#menu-popup").hide(); } });

    // ==========================================
    // HISTORY FUNCTIONS
    // ==========================================
    function addTopupHistory(amount, newBalance) {
        topupHistory.unshift({ amount: amount, balance: newBalance, time: new Date().toLocaleString('id-ID'), status: 'SUKSES' });
        if (topupHistory.length > 20) topupHistory.pop();
        renderTopupHistory();
        saveGameData();
    }
    function addWithdrawHistory(amount, method, account, name) {
        withdrawHistory.unshift({ amount: amount, method: method, account: account, name: name, time: new Date().toLocaleString('id-ID'), status: 'PROSES' });
        if (withdrawHistory.length > 20) withdrawHistory.pop();
        renderWithdrawHistory();
        saveGameData();
    }
    function renderTopupHistory() {
        let html = '';
        if (topupHistory.length === 0) { html = '<div class="history-empty">Belum ada history topup</div>'; } 
        else {
            topupHistory.forEach(item => {
                html += `<div class="history-item"><div class="history-item-header"><span class="history-item-amount">${formatRupiah(item.amount)}</span><span class="history-status status-success">${item.status}</span></div><div class="history-item-time">${item.time}</div></div>`;
            });
        }
        $("#history-topup-list").html(html);
    }
    function renderWithdrawHistory() {
        let html = '';
        if (withdrawHistory.length === 0) { html = '<div class="history-empty">Belum ada history withdraw</div>'; } 
        else {
            withdrawHistory.forEach(item => {
                html += `<div class="history-item"><div class="history-item-header"><span class="history-item-amount">${formatRupiah(item.amount)}</span><span class="history-status status-process">${item.status}</span></div><div class="history-item-detail">${item.method} - ${item.account}</div><div class="history-item-detail">Nama: ${item.name}</div><div class="history-item-time">${item.time}</div></div>`;
            });
        }
        $("#history-withdraw-list").html(html);
    }

    // History Modal Handlers
    $("#menu-history-topup").on('click', function() { $("#menu-popup").hide(); renderTopupHistory(); $("#history-topup-modal").css("display", "flex"); });
    $("#menu-history-withdraw").on('click', function() { $("#menu-popup").hide(); renderWithdrawHistory(); $("#history-withdraw-modal").css("display", "flex"); });
    $("#close-history-topup").on('click', function() { $("#history-topup-modal").css("display", "none"); });
    $("#close-history-withdraw").on('click', function() { $("#history-withdraw-modal").css("display", "none"); });

    // ==========================================
    // TOPUP
    // ==========================================
    $("#menu-topup").on('click', function() {
        $("#menu-popup").hide(); selectedTopupAmount = 0; $(".topup-amt").removeClass("selected"); $("#topup-amount-input").val(""); $("#custom-amount-section").hide();
        generateQRCode("TOPUP" + Date.now().toString(36).toUpperCase(), "qr-canvas");
        const expireTime = new Date(Date.now() + 15 * 60 * 1000);
        $("#qr-expire-time").text(expireTime.toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'}));
        $("#topup-modal").css("display", "flex");
    });
    
    $(".topup-amt").on('click', function() {
        const val = $(this).data('val');
        $(".topup-amt").removeClass("selected"); $(this).addClass("selected");
        if (val === "custom") { $("#custom-amount-section").show(); $("#topup-amount-input").val(""); $("#custom-amount-input").val("").focus(); selectedTopupAmount = 0; }
        else { $("#custom-amount-section").hide(); selectedTopupAmount = parseInt(val); $("#topup-amount-input").val(formatRupiahSimple(selectedTopupAmount)); generateQRCode("T" + selectedTopupAmount + "_" + Date.now().toString(36), "qr-canvas"); }
    });
    
    $("#custom-amount-input").on('input', function() {
        let val = parseInt($(this).val()) || 0; selectedTopupAmount = val; $("#topup-amount-input").val(val > 0 ? formatRupiahSimple(val) : "");
        if (val > 0) generateQRCode("T" + val + "_" + Date.now().toString(36), "qr-canvas");
    });
    
    $("#close-topup, #btn-cancel-topup").on('click', function() { $("#topup-modal").css("display", "none"); });
    
    $("#btn-confirm-topup").on('click', function() {
        if (selectedTopupAmount <= 0) { showAlert("GAGAL", "Pilih nominal!"); return; }
        if (selectedTopupAmount < 10000) { showAlert("GAGAL", "Minimal 10rb!"); return; }
        
        let old = balance; balance += selectedTopupAmount;
        animateValue($("#balance"), old, balance, 800); updateUIData();
        SFX.bigWin(); spawnParticles(0, 0, 'coin_rain', 4);
        
        addTopupHistory(selectedTopupAmount, balance);
        
        $("#topup-modal").css("display", "none");
        $("#topup-success-amount").text(formatRupiah(selectedTopupAmount)); 
        $("#topup-success-balance").text(formatRupiah(balance));
        $("#topup-success-modal").css("display", "flex"); 
        selectedTopupAmount = 0;
    });
    
    $("#close-topup-success").on('click', function() { $("#topup-success-modal").css("display", "none"); });

    // ==========================================
    // WITHDRAW
    // ==========================================
    $("#menu-withdraw").on('click', function() {
        $("#menu-popup").hide();
        $("#withdraw-balance-val").text(formatRupiah(balance));
        $("#withdraw-amount").val(""); $("#withdraw-method").val(""); $("#withdraw-account").val(""); $("#withdraw-name").val("");
        $("#name-field").hide(); 
        $("#account-label").text("Nomor Tujuan");
        $("#withdraw-modal").css("display", "flex");
    });
    
    $("#withdraw-method").on('change', function() {
        const m = $(this).val();
        if (m) { $("#name-field").slideDown(200); } else { $("#name-field").slideUp(200); }
        if (['BCA','MANDIRI','BNI','BRI'].includes(m)) { $("#account-label").text("Nomor Rekening"); $('#withdraw-account').attr('placeholder','Nomor Rekening'); } 
        else if (['DANA','OVO','GOPAY','SHOPEEPAY'].includes(m)) { $("#account-label").text("Nomor HP"); $('#withdraw-account').attr('placeholder','Nomor HP'); } 
        else { $("#account-label").text("Nomor Tujuan"); $('#withdraw-account').attr('placeholder','Nomor Tujuan'); }
    });
    
    $("#close-withdraw, #btn-cancel-withdraw").on('click', function() { $("#withdraw-modal").css("display", "none"); });
    
    $("#btn-confirm-withdraw").on('click', function() {
        let amt = parseInt($("#withdraw-amount").val())||0; 
        let met = $("#withdraw-method").val(); 
        let acc = $("#withdraw-account").val().trim(); 
        let nm = $("#withdraw-name").val().trim();
        
        if (amt <= 0) { showAlert("GAGAL", "Masukkan jumlah valid!"); return; }
        if (amt < 10000) { showAlert("GAGAL", "Min 10rb!"); return; }
        if (amt > balance) { showAlert("GAGAL", "Saldo kurang!"); return; }
        if (!met) { showAlert("GAGAL", "Pilih metode!"); return; }
        if (!acc) { showAlert("GAGAL", "Isi nomor tujuan!"); return; }
        if (!nm) { showAlert("GAGAL", "Isi nama pemilik!"); return; }
        
        let old = balance; balance -= amt;
        animateValue($("#balance"), old, balance, 500); updateUIData();
        
        addWithdrawHistory(amt, met, acc, nm);
        
        $("#success-amount").text(formatRupiah(amt)); 
        $("#success-method").text(met); 
        $("#success-account").text(acc + " (" + nm + ")");
        $("#withdraw-modal").css("display", "none"); 
        $("#withdraw-success-modal").css("display", "flex"); 
        SFX.win();
    });
    
    $("#close-withdraw-success").on('click', function() { $("#withdraw-success-modal").css("display", "none"); });

    // ==========================================
    // PAYTABLE
    // ==========================================
    $("#menu-paytable").on('click', function(){ $("#menu-popup").hide(); $("#paytable-modal").css("display", "flex"); });
    $("#close-paytable").on('click', function(){ $("#paytable-modal").css("display", "none"); });
});