(function(){
"use strict";
var D=window.__SIM__,Q=new URLSearchParams(location.search);
var LANG=Q.get("lang")==="zh"?"zh":"en";
var T={
en:{brand:"Blockwise",nav:"Back to home",
title:"Strategy replay",
lede:"Watch one evolved strategy trade, and watch the search that found it. Everything below is recomputed from the recorded testnet run.",
honest:"<b>This is a replay, not a market.</b> One strategy, found by the colony in a recorded Monad-testnet run, replayed step by step on a frozen <b>synthetic</b> return series (data/series/v1.json). No live market data, no real money, not investment advice. Nothing here is simulated forward: every curve is either recorded or recomputed with the scoring rule of record.",
m1:"Replay the champion's trading",m2:"Replay the search",play:"Play",pause:"Pause",replay:"Replay",scrub:"Playhead",
stepOf:"step {a} / {b}",candOf:"candidate {a} / {b}",
cPrice:"Synthetic series and the champion's trades",cPriceSub:"Cumulative synthetic return (bps). Triangles mark where the position changed.",
cEq:"Equity after costs (bps)",
pos:"position",warm:"warm-up",dev:"dev · searched on",conf:"confirm · held out",seal:"sealed · held out",
long:"long",short:"short",flat:"flat",peak:"running peak",ddm:"max drawdown",
feedT:"Trade feed",feedSub:"Appears as the playhead passes each position change.",
fStep:"Step",fSeg:"Segment",fSide:"Side",fSize:"Size",fRt:"Round trip",fEq:"Equity",fPk:"vs peak",fNone:"No trades yet. Press play.",
BUY:"BUY",SELL:"SELL",peakTag:"peak",
verdictT:"Verdict",verdictPending:"The verdict appears when the replay reaches the end of the sealed segment.",
verdict:"The strategy was chosen because it scored <b>{dev}</b> bps on dev, so dev flatters it. On the segments the search never optimised, it earned <b>{conf}</b> (confirm) and <b>{seal}</b> (sealed). The sealed result is <b>{pct}%</b> of the dev total: it kept {pct}% of dev.",
verdictSub:"Segments differ in length, so per step: dev {a}, confirm {b}, sealed {c} bps. One 32-step window on one synthetic series cannot separate skill from luck.",
sP1:"Search progress",sP1s:"Best dev score per generation, and the best so far across generations.",
gcount:"generation {g} / 10",gcountFull:"final colony · generation 10 of 10",
gBest:"best in generation",gCum:"best so far",gRand:"random-search benchmark",
sP2:"The 100 candidates of this generation",sP2s:"Dev score of each candidate that has landed. Outline: previous generation.",
sP3:"Niche map",sP3s:"Best dev score per niche (style by activity) after the last completed generation.",
act:{low:"low",mid:"mid",high:"high"},sty:{reversion:"reversion",neutral:"neutral",momentum:"momentum"},
sP4:"Which operator produced the candidates",sP4s:"Share of each generation's 100 candidates, as the bandit shifted budget.",
ops:["random","mutate","crossover","sweep"],
sP5:"Running stats",sTr:"trades",sHit:"hit rate (steps in position)",sDD:"max drawdown",sBest:"best step",
sCand:"candidates scored",sBestDev:"best dev so far",sMed:"median of this generation",sPos:"positive dev, this generation",
frozen:"Showing the final colony. Switch to Replay the search to watch it build.",
nocomp:"No generation has completed yet.",
sFeedT:"Candidate feed",sFeedSub:"Each candidate as its transaction lands.",sfCand:"Candidate",sfOp:"Operator",sfDev:"Dev",sfBest:"Best so far",sfNew:"new best",lostN:"{n} candidates were lost in transit and have no score; they are skipped.",
sTop:"Dev equity of the best candidate so far",sTopSub:"Walk-forward equity on the dev segment only (steps 6 to 127), recomputed from its seven integers. Faint lines: earlier record holders.",
sBot:"Dev score of every candidate, in order of landing",
check:"Check passed",checkTxt:"The scoring rule recomputed from the spec reproduces the recorded results: dev {a}, confirm {b}, sealed {c} for the champion, and {n}/{n} candidate dev scores.",
foot:"Source: fixtures/testnet-run-2.jsonl and data/series/v1.json. Costs: 3 bps per unit of position change. Each segment is scored from flat, as the Evaluator does, so equity is the three segment scores laid end to end.",
champ:"Champion: generation {g}, candidate {i}",bps:"bps"},
zh:{brand:"Blockwise",nav:"返回首页",
title:"策略回放",
lede:"看一个进化出来的策略如何交易,也看找到它的搜索过程。下面所有数字都由已记录的测试网运行重新计算得到。",
honest:"<b>这是回放,不是行情。</b>这是种群在一次已记录的 Monad 测试网运行中找到的一个策略,在冻结的<b>合成</b>收益序列(data/series/v1.json)上逐步回放。没有实时行情,没有真金白银,不构成投资建议。这里没有任何向前模拟:每条曲线要么是记录值,要么按规则原文重新计算。",
m1:"回放冠军的交易",m2:"回放搜索过程",play:"播放",pause:"暂停",replay:"重放",scrub:"进度",
stepOf:"第 {a} / {b} 步",candOf:"候选 {a} / {b}",
cPrice:"合成序列与冠军的交易",cPriceSub:"累计合成收益(bps)。三角形表示仓位发生变化的位置。",
cEq:"扣费后权益(bps)",
pos:"仓位",warm:"预热",dev:"dev · 搜索所用",conf:"confirm · 留出",seal:"sealed · 留出",
long:"多",short:"空",flat:"空仓",peak:"滚动峰值",ddm:"最大回撤",
feedT:"成交流水",feedSub:"进度条经过每次仓位变化时出现。",
fStep:"步",fSeg:"区段",fSide:"方向",fSize:"数量",fRt:"整笔盈亏",fEq:"权益",fPk:"距峰值",fNone:"还没有交易,请播放。",
BUY:"买入",SELL:"卖出",peakTag:"峰值",
verdictT:"结论",verdictPending:"回放到 sealed 区段结束时显示结论。",
verdict:"这个策略是因为在 dev 上得了 <b>{dev}</b> bps 才被选中,所以 dev 成绩偏好看。在搜索从未优化过的区段上,它得到 <b>{conf}</b>(confirm)和 <b>{seal}</b>(sealed)。sealed 只有 dev 总量的 <b>{pct}%</b>:只保住了 dev 的 {pct}%。",
verdictSub:"各区段长度不同,按每步计:dev {a}、confirm {b}、sealed {c} bps。一条合成序列上的 32 步窗口,分不清是实力还是运气。",
sP1:"搜索进展",sP1s:"每一代的最佳 dev 分数,以及跨代的历史最佳。",
gcount:"第 {g} / 10 代",gcountFull:"最终种群 · 第 10 代 / 共 10 代",
gBest:"本代最佳",gCum:"历史最佳",gRand:"随机搜索基准",
sP2:"本代 100 个候选",sP2s:"已落链候选的 dev 分数。轮廓线:上一代。",
sP3:"生态位地图",sP3s:"最近一个完成的世代里,每个生态位(风格 × 活跃度)的最佳 dev 分数。",
act:{low:"低",mid:"中",high:"高"},sty:{reversion:"回归",neutral:"中性",momentum:"动量"},
sP4:"候选由哪种算子产生",sP4s:"每代 100 个候选的占比,反映 bandit 如何调整预算。",
ops:["随机","变异","交叉","扫描"],
sP5:"实时统计",sTr:"交易次数",sHit:"命中率(持仓步)",sDD:"最大回撤",sBest:"最佳单步",
sCand:"已评分候选",sBestDev:"当前最佳 dev",sMed:"本代中位数",sPos:"本代 dev 为正的占比",
frozen:"当前显示最终种群。切换到“回放搜索过程”可看它如何形成。",
nocomp:"还没有完成的世代。",
sFeedT:"候选流水",sFeedSub:"每个候选的交易落链时出现。",sfCand:"候选",sfOp:"算子",sfDev:"Dev",sfBest:"历史最佳",sfNew:"新纪录",lostN:"有 {n} 个候选在传输中丢失,没有分数,已跳过。",
sTop:"当前最佳候选的 dev 权益",sTopSub:"仅 dev 区段(第 6 到 127 步)的滚动前向权益,由其七个整数重新计算。淡线:此前的纪录保持者。",
sBot:"每个候选的 dev 分数(按落链顺序)",
check:"校验通过",checkTxt:"按规则原文由参数重新计算,复现了记录结果:冠军 dev {a}、confirm {b}、sealed {c},以及 {n}/{n} 个候选的 dev 分数。",
foot:"来源:fixtures/testnet-run-2.jsonl 与 data/series/v1.json。成本:每单位仓位变化 3 bps。每个区段都从空仓开始评分(与 Evaluator 一致),所以权益是三段得分首尾相接。",
champ:"冠军:第 {g} 代,候选 {i}",bps:"bps"}
};
var L=T[LANG];
function f(s,o){return s.replace(/\{(\w+)\}/g,function(_,k){return o[k]})}
function sg(n){return (n>0?"+":n<0?"−":"")+Math.abs(Math.round(n))}
function sg1(n){return (n>0?"+":n<0?"−":"")+Math.abs(n).toFixed(1)}
var CS=getComputedStyle(document.documentElement);
function col(n){return CS.getPropertyValue(n).trim()}
var C={bg:col("--bg"),sf:col("--surface"),ln:col("--line"),ink:col("--ink"),ac:col("--accent"),up:col("--up"),wn:col("--warn"),dn:col("--down")};
var OPC=[C.ln,C.ac,C.wn,C.ink];
var MONO='"IBM Plex Mono",ui-monospace,Menlo,monospace',SANS='"Hanken Grotesk","PingFang SC",sans-serif';

/* ---------- derived data ---------- */
var S=D.steps,NS=S.length,N=D.n,CAND=D.cands;
var peak=[],dd=[],maxdd=[],mddA=[]; // running peak, drawdown, max dd to date and its (peak step, trough step)
(function(){var pk=0,pki=-1,m=0,a=[-1,-1];for(var k=0;k<NS;k++){var e=S[k].eq;if(e>pk){pk=e;pki=k}peak.push(pk);var d=e-pk;dd.push(d);if(d<m){m=d;a=[pki,k]}maxdd.push(m);mddA.push(a.slice())}})();
var eMin=Math.min.apply(null,[0].concat(S.map(function(s){return s.eq}))),eMax=Math.max.apply(null,S.map(function(s){return s.eq}));
var pMin=Math.min.apply(null,D.P),pMax=Math.max.apply(null,D.P);
var segLen={dev:D.devEnd-6,confirm:D.confirmEnd-D.devEnd,sealed:N-D.confirmEnd};
var allDev=CAND.filter(function(c){return c.dev!==null}).map(function(c){return c.dev});
var dMin=Math.min.apply(null,allDev),dMax=Math.max.apply(null,allDev);
var NB=24,BW=(dMax-dMin)/NB+1e-9;
function binOf(v){return Math.min(NB-1,Math.floor((v-dMin)/BW))}
var genCounts=[];for(var g=0;g<10;g++){var a=new Array(NB).fill(0);genCounts.push(a)}
CAND.forEach(function(c){if(c.dev!==null)genCounts[c.g-1][binOf(c.dev)]++});
var histMax=Math.max.apply(null,genCounts.map(function(a){return Math.max.apply(null,a)}));
var lostN=D.candCheck.lost;
var runBestAt=[],cur=-Infinity;CAND.forEach(function(c){if(c.dev!==null&&c.dev>cur)cur=c.dev;runBestAt.push(cur)});
var recAt=[],rc=-1;CAND.forEach(function(c){if(c.rec>=0)rc=c.rec;recAt.push(rc)});

/* ---------- state ---------- */
var st={mode:Q.get("mode")==="search"?"search":"champion",p:0,playing:false,speed:1,sig:""};
function maxP(){return st.mode==="champion"?NS:CAND.length}
var RATE={champion:7,search:30};

/* ---------- DOM ---------- */
var app=document.getElementById("app");
document.documentElement.lang=LANG==="zh"?"zh-CN":"en";
var other=new URLSearchParams(location.search);other.set("lang",LANG==="zh"?"en":"zh");
app.innerHTML='<div class="wrap">'+
'<header class="top"><span class="brand">'+L.brand+'</span><span><a href="/">'+L.nav+'</a> &nbsp; <a href="?'+other.toString()+'">'+(LANG==="zh"?"EN":"中文")+'</a></span></header>'+
'<h1>'+L.title+'</h1><p class="lede">'+L.lede+'</p><div class="honest" role="note">'+L.honest+'</div>'+
'<div class="bar"><div class="seg" role="group"><button id="b1" aria-pressed="true">'+L.m1+'</button><button id="b2" aria-pressed="false">'+L.m2+'</button></div>'+
'<button class="pp" id="pp"></button><div class="seg" role="group" aria-label="speed"><button data-s="1">1x</button><button data-s="4">4x</button><button data-s="16">16x</button></div>'+
'<input class="scrub" id="sc" type="range" min="0" max="1000" step="1" value="0" aria-label="'+L.scrub+'"><span class="tt" id="tt"></span></div>'+
'<div class="grid"><div id="left">'+
'<div class="card"><h2 id="h1"></h2><p class="sub" id="s1"></p><canvas id="cv"></canvas><div class="legend" id="lg"></div></div>'+
'<div class="card"><h2 id="fh"></h2><p class="sub" id="fs"></p><div class="feed" id="feed"></div></div>'+
'<div id="vd"></div></div><div id="right">'+
'<div class="card"><h2>'+L.sP1+'</h2><p class="sub">'+L.sP1s+'</p><div class="check" id="gc" style="font-size:13px;margin:0 0 6px"></div><canvas id="c1"></canvas><div class="legend" id="l1"></div></div>'+
'<div class="card"><h2>'+L.sP2+'</h2><p class="sub">'+L.sP2s+'</p><canvas id="c2"></canvas></div>'+
'<div class="card"><h2>'+L.sP3+'</h2><p class="sub">'+L.sP3s+'</p><div class="niche" id="nm"></div></div>'+
'<div class="card"><h2>'+L.sP4+'</h2><p class="sub">'+L.sP4s+'</p><canvas id="c4"></canvas><div class="ops" id="l4"></div></div>'+
'<div class="card"><h2>'+L.sP5+'</h2><div class="stats" id="st"></div></div>'+
'</div></div><footer><div class="check"><b>✓ '+L.check+'</b> '+f(L.checkTxt,{a:sg(D.confirmAll.dev),b:sg(D.confirmAll.confirm),c:sg(D.confirmAll.sealed),n:D.candCheck.checked})+'</div><p>'+L.foot+' '+f(L.champ,{g:D.champion.gen,i:D.champion.idx})+' · ['+D.champion.params.join(", ")+']</p></footer></div>';
var $=function(i){return document.getElementById(i)};
var cv=$("cv"),c1=$("c1"),c2=$("c2"),c4=$("c4");

function fit(c,h){var w=c.clientWidth,d=Math.min(window.devicePixelRatio||1,2);if(c.width!==Math.round(w*d)||c.height!==Math.round(h*d)){c.width=Math.round(w*d);c.height=Math.round(h*d);c.style.height=h+"px"}var x=c.getContext("2d");x.setTransform(d,0,0,d,0,0);x.clearRect(0,0,w,h);return {x:x,w:w,h:h}}
function txt(x,s,px,py,o){o=o||{};x.font=(o.w||400)+" "+(o.s||11)+"px "+(o.f||SANS);x.fillStyle=o.c||C.ink;x.textAlign=o.a||"left";x.textBaseline=o.b||"alphabetic";x.globalAlpha=o.al==null?1:o.al;x.fillText(s,px,py);x.globalAlpha=1}
function line(x,pts,c,w,dash,al){x.beginPath();pts.forEach(function(q,i){i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1])});x.strokeStyle=c;x.lineWidth=w;x.setLineDash(dash||[]);x.globalAlpha=al==null?1:al;x.stroke();x.setLineDash([]);x.globalAlpha=1}

/* ---------- controls ---------- */
function setMode(m){st.mode=m;st.p=0;st.playing=false;st.sig="";$("b1").setAttribute("aria-pressed",m==="champion");$("b2").setAttribute("aria-pressed",m==="search");$("sc").max=maxP();draw()}
$("b1").onclick=function(){setMode("champion")};$("b2").onclick=function(){setMode("search")};
$("pp").onclick=function(){if(st.p>=maxP()-0.001){st.p=0}st.playing=!st.playing;last=0;draw()};
document.querySelectorAll("[data-s]").forEach(function(b){b.onclick=function(){st.speed=+b.dataset.s;draw()}});
$("sc").oninput=function(){st.p=+this.value;st.playing=false;draw()};
document.addEventListener("keydown",function(e){if(e.code==="Space"&&e.target.tagName!=="BUTTON"&&e.target.tagName!=="INPUT"){e.preventDefault();$("pp").click()}});
var last=0;
function tick(ts){if(st.playing){if(last){st.p=Math.min(maxP(),st.p+(ts-last)/1000*RATE[st.mode]*st.speed);if(st.p>=maxP())st.playing=false;draw()}last=ts}else last=0;requestAnimationFrame(tick)}
window.addEventListener("resize",function(){draw()});

/* ---------- champion chart ---------- */
function geo(w,h){var Lp=44,R=10,top=26;var H=h;var priceH=Math.round((H-top-62)*0.44),eqH=H-top-62-priceH;return {L:Lp,R:R,w:w,pT:top,pB:top+priceH,bT:top+priceH+8,bB:top+priceH+22,eT:top+priceH+34,eB:top+priceH+34+eqH,H:H}}
function drawChampion(){
 var h=innerWidth<=480?360:430;var o=fit(cv,h),x=o.x,g=geo(o.w,h),p=st.p,k=Math.floor(p);
 var X=function(i){return g.L+i/(N-1)*(g.w-g.L-g.R)};
 var yP=function(v){return g.pB-(v-pMin)/(pMax-pMin)*(g.pB-g.pT)};
 var eTop=eMax*1.14,yE=function(v){return g.eB-(v-eMin)/(eTop-eMin)*(g.eB-g.eT)};
 // segments
 var segs=[[0,5,L.warm,null],[5,D.devEnd-1,L.dev,"rgba(31,90,99,.07)"],[D.devEnd-1,D.confirmEnd-1,L.conf,"rgba(154,106,20,.13)"],[D.confirmEnd-1,N-1,L.seal,"rgba(162,59,46,.11)"]];
 segs.forEach(function(s){if(s[3]){x.fillStyle=s[3];x.fillRect(X(s[0]),g.pT-4,X(s[1])-X(s[0]),g.eB-g.pT+4)}
  var cx=(X(s[0])+X(s[1]))/2;if(s[0]>0)txt(x,innerWidth<=480?s[2].split(' ')[0]:s[2],cx,g.pT-10,{s:innerWidth<=480?9.5:11,a:"center",w:500});
  if(s[0]>0){line(x,[[X(s[0]),g.pT-4],[X(s[0]),g.eB]],C.ln,1,[3,3],.8)}});
 // axes labels
 txt(x,sg(pMax),g.L-5,g.pT+4,{s:10,a:"right",f:MONO,al:.7});txt(x,sg(pMin),g.L-5,g.pB,{s:10,a:"right",f:MONO,al:.7});
 txt(x,sg(Math.round(eTop)),g.L-5,g.eT+4,{s:10,a:"right",f:MONO,al:.7});txt(x,"0",g.L-5,yE(0)+3,{s:10,a:"right",f:MONO,al:.7});
 txt(x,L.pos,g.L-5,g.bB-3,{s:10,a:"right",al:.7});
 txt(x,L.cEq,g.L+4,g.eT+10,{s:10.5,al:.8});
 line(x,[[g.L,yE(0)],[g.w-g.R,yE(0)]],C.ln,1,[],.9);
 // price: full faint, revealed solid
 var all=D.P.map(function(v,i){return [X(i),yP(v)]});line(x,all,C.ink,1.2,[],.2);
 var xe=5+p;var rev=[];for(var i=0;i<=Math.min(N-1,Math.floor(xe));i++)rev.push([X(i),yP(D.P[i])]);
 if(xe<N-1&&xe>=0){var i0=Math.floor(xe),fr=xe-i0;rev.push([X(xe),yP(D.P[i0]+(D.P[i0+1]-D.P[i0])*fr)])}
 line(x,rev,C.ink,1.6);
 // position band
 x.fillStyle=C.ln;x.globalAlpha=.25;x.fillRect(X(5),g.bT,X(N-1)-X(5),g.bB-g.bT);x.globalAlpha=1;
 for(var j=0;j<NS&&j<p;j++){var s=S[j];if(!s.pos)continue;var w=Math.min(1,p-j);x.fillStyle=s.pos>0?C.up:C.dn;x.globalAlpha=.8;x.fillRect(X(5+j),g.bT,(X(5+j+w)-X(5+j)),g.bB-g.bT);x.globalAlpha=1}
 // markers
 D.trades.forEach(function(t){if(t.k>=p)return;var px=X(t.t),py=yP(D.P[t.t]),b=t.side==="BUY";x.beginPath();var z=5.5;if(b){x.moveTo(px,py-z-3);x.lineTo(px-z,py+z-3);x.lineTo(px+z,py+z-3)}else{x.moveTo(px,py+z+3);x.lineTo(px-z,py-z+3);x.lineTo(px+z,py-z+3)}x.closePath();x.fillStyle=b?C.up:C.dn;x.fill();x.strokeStyle=C.bg;x.lineWidth=1;x.stroke()});
 // equity: revealed only
 if(k>=0){var m=Math.min(k,NS);var pts=[[X(5),yE(0)]];for(var q=0;q<m;q++)pts.push([X(6+q),yE(S[q].eq)]);
  var frac=p-m;if(m<NS&&frac>0){var prevE=m?S[m-1].eq:0;pts.push([X(6+m-1+frac),yE(prevE+(S[m].eq-prevE)*frac)])}
  var pkPts=[[X(5),yE(0)]];for(q=0;q<m;q++)pkPts.push([X(6+q),yE(peak[q])]);
  // drawdown fill between peak and equity
  x.beginPath();pkPts.forEach(function(a,i){i?x.lineTo(a[0],a[1]):x.moveTo(a[0],a[1])});for(q=pts.length-1;q>=0;q--)x.lineTo(pts[q][0],pts[q][1]);x.closePath();x.fillStyle=C.dn;x.globalAlpha=.16;x.fill();x.globalAlpha=1;
  line(x,pkPts,C.ac,1,[4,3],.9);line(x,pts,C.ac,2);
  if(m>0){var lastI=m-1;
   // peak marker (latest new peak)
   var pi=0;for(q=lastI;q>=0;q--){if(S[q].eq>=peak[q]&&S[q].eq>0){pi=q;break}}
   if(S[pi]&&S[pi].eq>0){var ppx=X(6+pi),ppy=yE(S[pi].eq);x.beginPath();x.arc(ppx,ppy,4.5,0,7);x.fillStyle=C.bg;x.fill();x.strokeStyle=C.ac;x.lineWidth=2;x.stroke();txt(x,L.peak+" "+sg(S[pi].eq),Math.min(ppx,g.w-g.R-4),ppy-9,{s:10.5,a:ppx>g.w-100?"right":"center",c:C.ac,w:500})}
   // max drawdown bracket
   var A=mddA[lastI];if(maxdd[lastI]<0&&A[0]>=0){var ax=X(6+A[0]),bx=X(6+A[1]),ay=yE(S[A[0]].eq),by=yE(S[A[1]].eq);
    line(x,[[ax,ay],[bx,ay],[bx,by]],C.dn,1.3,[2,2]);x.beginPath();x.arc(bx,by,3.5,0,7);x.fillStyle=C.dn;x.fill();
    txt(x,L.ddm+" "+sg(maxdd[lastI]),Math.min(bx+8,g.w-g.R-70)+0,Math.min(by+16,g.eB-4),{s:10.5,a:"left",c:C.dn,w:500})}}}
 // playhead
 var hx=X(Math.min(N-1,xe));line(x,[[hx,g.pT-4],[hx,g.eB]],C.ink,1.5);x.beginPath();x.arc(hx,g.pT-4,3.5,0,7);x.fillStyle=C.ink;x.fill();
 // x-axis
 [5,D.devEnd-1,D.confirmEnd-1,N-1].forEach(function(v,i){txt(x,String(v+(v===5?1:0)),X(v),g.H-8,{s:10,a:i===0?"left":i===3?"right":"center",f:MONO,al:.7})});
}
function legendChampion(){$("lg").innerHTML='<span><i style="background:'+C.up+'"></i>'+L.BUY+' / '+L.long+'</span><span><i style="background:'+C.dn+'"></i>'+L.SELL+' / '+L.short+'</span><span><i style="background:'+C.ac+'"></i>'+L.cEq+'</span><span><i style="border-top:2px dashed '+C.ac+';height:0;width:14px;vertical-align:3px"></i>'+L.peak+'</span><span><i style="background:rgba(162,59,46,.3)"></i>'+L.ddm+'</span>'}

/* ---------- search chart ---------- */
function drawSearch(){
 var h=innerWidth<=480?380:430;var o=fit(cv,h),x=o.x,w=o.w,p=st.p,n=Math.floor(p);
 var Lp=44,R=10,tT=24,tB=Math.round(h*0.46),bT=tB+40,bB=h-24;
 var rec=D.records,ymin=Infinity,ymax=-Infinity;rec.forEach(function(r){r.curve.forEach(function(v){if(v<ymin)ymin=v;if(v>ymax)ymax=v})});ymin=Math.min(ymin,0);
 var nx=rec[0].curve.length;
 var X=function(i){return Lp+i/(nx-1)*(w-Lp-R)},Y=function(v){return tB-(v-ymin)/(ymax-ymin)*(tB-tT)};
 txt(x,L.sTop,Lp,14,{s:10.5,w:600});
 txt(x,sg(ymax),Lp-5,tT+4,{s:10,a:"right",f:MONO,al:.7});txt(x,"0",Lp-5,Y(0)+3,{s:10,a:"right",f:MONO,al:.7});
 x.fillStyle="rgba(31,90,99,.07)";x.fillRect(Lp,tT,w-Lp-R,tB-tT);
 line(x,[[Lp,Y(0)],[w-R,Y(0)]],C.ln,1);
 var cr=n>0?recAt[n-1]:-1;
 for(var i=0;i<cr;i++)line(x,rec[i].curve.map(function(v,j){return [X(j),Y(v)]}),C.ink,1,[],.22);
 if(cr>=0){line(x,rec[cr].curve.map(function(v,j){return [X(j),Y(v)]}),C.ac,2.2);txt(x,"gen "+rec[cr].g+" #"+rec[cr].i+"  "+sg(rec[cr].dev)+" "+L.bps,w-R,tB-8,{s:11,a:"right",c:C.ac,f:MONO,w:500})}
 txt(x,"6",Lp,tB+12,{s:10,f:MONO,al:.7});txt(x,String(D.devEnd-1),w-R,tB+12,{s:10,a:"right",f:MONO,al:.7});
 // bottom
 txt(x,L.sBot,Lp,bT-8,{s:10.5,w:600});
 var yb=function(v){return bB-(v-dMin)/(dMax-dMin)*(bB-bT)},xb=function(i){return Lp+i/(CAND.length-1)*(w-Lp-R)};
 for(var gi=0;gi<10;gi++){var gx=xb(gi*100);if(gi%2===0){x.fillStyle="rgba(31,90,99,.05)";x.fillRect(gx,bT,xb(Math.min(999,gi*100+100))-gx,bB-bT)}txt(x,String(gi+1),xb(gi*100+50),bB+12,{s:10,a:"center",f:MONO,al:.7})}
 line(x,[[Lp,yb(0)],[w-R,yb(0)]],C.ln,1);txt(x,"0",Lp-5,yb(0)+3,{s:10,a:"right",f:MONO,al:.7});txt(x,sg(dMax),Lp-5,bT+4,{s:10,a:"right",f:MONO,al:.7});txt(x,sg(dMin),Lp-5,bB,{s:10,a:"right",f:MONO,al:.7});
 for(i=0;i<n&&i<CAND.length;i++){var c=CAND[i];if(c.dev===null)continue;x.fillStyle=c.rec>=0?C.ac:C.ink;x.globalAlpha=c.rec>=0?1:.28;x.beginPath();x.arc(xb(i),yb(c.dev),c.rec>=0?2.6:1.5,0,7);x.fill()}x.globalAlpha=1;
 var bp=[];for(i=0;i<n;i++){bp.push([xb(i),yb(runBestAt[i])])}line(x,bp,C.ac,1.8);
 // random benchmark per generation
 D.gens.forEach(function(gg,gi){if(gi*100>n)return;line(x,[[xb(gi*100),yb(gg.rand)],[xb(Math.min(gi*100+99,n)),yb(gg.rand)]],C.wn,1.3,[4,3])});
 var hx=xb(Math.min(CAND.length-1,p));line(x,[[hx,bT-4],[hx,bB]],C.ink,1.5);
}
function legendSearch(){$("lg").innerHTML='<span><i style="background:'+C.ac+'"></i>'+L.sfNew+' / '+L.gCum+'</span><span><i style="background:'+C.ink+';opacity:.35"></i>'+L.sfCand+'</span><span><i style="border-top:2px dashed '+C.wn+';height:0;width:14px;vertical-align:3px"></i>'+L.gRand+'</span>'}

/* ---------- right panels ---------- */
function curGen(vp){return Math.min(9,Math.floor(Math.max(0,vp-1e-9)/100))}
function rightPanels(){
 var full=st.mode==="champion",vp=full?CAND.length:Math.floor(st.p),cg=vp>=CAND.length?9:Math.max(0,Math.ceil(vp/100)-1),inGen=vp-cg*100;
 var completed=Math.floor(vp/100);if(vp>=CAND.length)completed=10;
 $("gc").textContent=full?L.gcountFull:f(L.gcount,{g:vp===0?0:cg+1})+(vp===0?"":"  ·  "+f(L.candOf,{a:inGen,b:100}));
 // P1
 var o=fit(c1,150),x=o.x,w=o.w,h=o.h,Lp=40,R=8,tp=24,bt=h-20;
 var ymax=Math.max.apply(null,D.gens.map(function(g){return Math.max(g.best,g.rand)})),ymin=0;
 var X=function(g){return Lp+(g-1)/9*(w-Lp-R)},Y=function(v){return bt-(v-ymin)/(ymax-ymin)*(bt-tp)};
 for(var gi=1;gi<=10;gi++)txt(x,String(gi),X(gi),h-6,{s:10,a:"center",f:MONO,al:.7});
 txt(x,"0",Lp-5,bt+3,{s:10,a:"right",f:MONO,al:.7});txt(x,sg(ymax),Lp-5,tp+8,{s:10,a:"right",f:MONO,al:.7});
 line(x,[[Lp,bt],[w-R,bt]],C.ln,1);
 var rb=[],gb=[],cb=[],run=-Infinity;
 for(gi=0;gi<10;gi++){var shown=gi<completed||(gi===cg&&inGen>0);if(!shown)break;
  var gv=gi<completed?D.gens[gi].best:(function(){var m=-Infinity;for(var q=gi*100;q<vp;q++)if(CAND[q].dev!==null&&CAND[q].dev>m)m=CAND[q].dev;return m})();
  run=Math.max(run,gv);rb.push([X(gi+1),Y(D.gens[gi].rand)]);gb.push([X(gi+1),Y(gv)]);cb.push([X(gi+1),Y(run)])}
 line(x,rb,C.wn,1.3,[4,3]);line(x,cb,C.ac,2.2);line(x,gb,C.ink,1,[],.6);
 gb.forEach(function(q){x.beginPath();x.arc(q[0],q[1],3,0,7);x.fillStyle=C.ink;x.fill()});
 if(cb.length){var lq=cb[cb.length-1];x.beginPath();x.arc(lq[0],lq[1],4.5,0,7);x.fillStyle=C.ac;x.fill();txt(x,sg(run),lq[0],lq[1]-9,{s:11,a:lq[0]>w-40?"right":"center",f:MONO,c:C.ac,w:500})}
 $("l1").innerHTML='<span><i style="background:'+C.ac+'"></i>'+L.gCum+'</span><span><i style="background:'+C.ink+';border-radius:50%"></i>'+L.gBest+'</span><span><i style="border-top:2px dashed '+C.wn+';height:0;width:14px;vertical-align:3px"></i>'+L.gRand+'</span>';
 // P2
 o=fit(c2,150);x=o.x;w=o.w;h=o.h;Lp=8;R=8;bt=h-22;tp=12;
 var cnt=new Array(NB).fill(0);for(var q=cg*100;q<Math.min(vp,cg*100+100);q++){var c=CAND[q];if(c&&c.dev!==null)cnt[binOf(c.dev)]++}
 if(vp===0)cnt=new Array(NB).fill(0);
 var bw=(w-Lp-R)/NB,yh=function(v){return bt-v/histMax*(bt-tp)};
 var prev=cg>0?genCounts[cg-1]:null;
 if(vp>0)for(var b=0;b<NB;b++){var xx=Lp+b*bw;if(cnt[b]){x.fillStyle=C.ac;x.globalAlpha=.85;x.fillRect(xx+1,yh(cnt[b]),bw-2,bt-yh(cnt[b]));x.globalAlpha=1}}
 if(prev){x.beginPath();for(b=0;b<NB;b++){var xl=Lp+b*bw,yy=yh(prev[b]);if(b===0)x.moveTo(xl,yy);else x.lineTo(xl,yy);x.lineTo(xl+bw,yy)}x.strokeStyle=C.ink;x.lineWidth=1.2;x.globalAlpha=.55;x.setLineDash([3,2]);x.stroke();x.setLineDash([]);x.globalAlpha=1}
 line(x,[[Lp,bt],[w-R,bt]],C.ln,1);
 var zx=Lp+(0-dMin)/(dMax-dMin)*(w-Lp-R);line(x,[[zx,tp],[zx,bt]],C.ln,1,[2,3]);
 txt(x,sg(dMin),Lp,h-6,{s:10,f:MONO,al:.7});txt(x,"0",zx,h-6,{s:10,f:MONO,a:"center",al:.7});txt(x,sg(dMax),w-R,h-6,{s:10,f:MONO,a:"right",al:.7});
 txt(x,"gen "+(vp===0?"–":cg+1)+(vp?"  n="+(vp-cg*100>100?100:Math.min(100,vp-cg*100)):""),w-R,tp-1,{s:10.5,a:"right",f:MONO,al:.8});
 // P3
 var gm=completed>0?D.gens[Math.min(9,completed-1)].map:null,html='<span></span>';
 ["low","mid","high"].forEach(function(a){html+='<div class="h" style="justify-content:center">'+L.act[a]+'</div>'});
 ["reversion","neutral","momentum"].forEach(function(s){html+='<div class="h">'+L.sty[s]+'</div>';["low","mid","high"].forEach(function(a){
  var cell=gm?gm.filter(function(c){return c.style===s&&c.act===a})[0]:null,bg="transparent",inner="<small>–</small>";
  if(cell&&cell.dev!==null){var v=cell.dev,al=Math.min(.85,Math.abs(v)/dMax*.85+.08);bg=v>=0?"rgba(31,90,99,"+al+")":"rgba(162,59,46,"+al+")";inner=sg(v)+"<small>"+cell.label+"</small>"}
  else if(cell)inner="<small>"+(LANG==="zh"?"空":"empty")+"</small>";
  var dark=cell&&cell.dev!==null&&Math.abs(cell.dev)/dMax>.35;
  html+='<div class="c" style="background:'+bg+';border:1px solid '+C.ln+(dark?';color:#f3f3ef':'')+'">'+inner+'</div>'})});
 $("nm").innerHTML=html;
 // P4
 o=fit(c4,130);x=o.x;w=o.w;h=o.h;Lp=8;R=8;bt=h-18;tp=6;
 var cw=(w-Lp-R)/10;
 for(gi=0;gi<10;gi++){var ops=[0,0,0,0];
  if(gi<completed)ops=D.gens[gi].ops.slice();else if(gi===cg&&inGen>0){for(q=gi*100;q<vp;q++)ops[CAND[q].op]++}
  var tot=ops[0]+ops[1]+ops[2]+ops[3],yc=bt;
  txt(x,String(gi+1),Lp+gi*cw+cw/2,h-4,{s:10,a:"center",f:MONO,al:.7});
  if(!tot){x.strokeStyle=C.ln;x.setLineDash([2,3]);x.strokeRect(Lp+gi*cw+3,tp,cw-6,bt-tp);x.setLineDash([]);continue}
  for(var oi=0;oi<4;oi++){var hh=ops[oi]/tot*(bt-tp);x.fillStyle=OPC[oi];x.globalAlpha=(gi===cg&&inGen<100&&!full)?.8:1;x.fillRect(Lp+gi*cw+3,yc-hh,cw-6,hh);yc-=hh}x.globalAlpha=1}
 $("l4").innerHTML=L.ops.map(function(n,i){return '<span><i style="display:inline-block;width:10px;height:10px;margin-right:5px;background:'+OPC[i]+'"></i>'+n+'</span>'}).join("");
}

/* ---------- stats / feed / verdict ---------- */
function statsHTML(items){return items.map(function(a){return '<div class="stat"><div class="v">'+a[1]+'</div><div class="l">'+a[0]+'</div></div>'}).join("")}
function updateText(){
 var p=st.p,k=Math.floor(p);
 if(st.mode==="champion"){
  var m=Math.min(k,NS),nt=D.trades.filter(function(t){return t.k<p}).length,inPos=0,wins=0,best=null;
  for(var q=0;q<m;q++){var s=S[q];if(s.pos){inPos++;if(s.gross>0)wins++}if(!best||s.net>best.net)best=s}
  var mdd=m?maxdd[m-1]:0;
  $("st").innerHTML=statsHTML([[L.sTr,nt],[L.sHit,inPos?Math.round(wins/inPos*100)+"%":"–"],[L.sDD,mdd?sg(mdd):"0"],[L.sBest,best?sg(best.net)+" <small style='font:11px "+MONO.replace(/"/g,"'")+";opacity:.7'>@"+best.e+"</small>":"–"]]);
  $("tt").textContent=f(L.stepOf,{a:m,b:NS});
 }else{
  var vp=Math.floor(p),dv=[];for(var i=Math.floor(Math.max(0,vp-1)/100)*100;i<vp;i++)if(CAND[i].dev!==null)dv.push(CAND[i].dev);dv.sort(function(a,b){return a-b});
  var med=dv.length?dv[Math.floor(dv.length/2)]:null,pos=dv.length?Math.round(dv.filter(function(v){return v>0}).length/dv.length*100)+"%":"–";
  var sc=0;for(i=0;i<vp;i++)if(CAND[i].dev!==null)sc++;
  $("st").innerHTML=statsHTML([[L.sCand,sc],[L.sBestDev,vp?sg(runBestAt[vp-1]):"–"],[L.sMed,med===null?"–":sg(med)],[L.sPos,pos]]);
  $("tt").textContent=f(L.candOf,{a:vp,b:CAND.length});
 }
 $("pp").textContent=st.playing?L.pause:(st.p>=maxP()-0.001?L.replay:L.play);
 document.querySelectorAll("[data-s]").forEach(function(b){b.setAttribute("aria-pressed",+b.dataset.s===st.speed)});
 $("sc").value=Math.round(st.p);
}
function feedHTML(){
 var p=st.p,sig=st.mode+":"+(st.mode==="champion"?D.trades.filter(function(t){return t.k<p}).length:Math.floor(p));
 if(sig===st.sig)return;st.sig=sig;var h="";
 if(st.mode==="champion"){
  $("fh").textContent=L.feedT;$("fs").textContent=L.feedSub;
  var tr=D.trades.filter(function(t){return t.k<p}).reverse();
  if(!tr.length)h='<div class="empty">'+L.fNone+'</div>';
  else{h='<table><thead><tr><th>'+L.fStep+'</th><th>'+L.fSeg+'</th><th>'+L.fSide+'</th><th>'+L.fSize+'</th><th>'+L.fRt+'</th><th>'+L.fEq+'</th><th>'+L.fPk+'</th></tr></thead><tbody>';
   tr.forEach(function(t){var pk=peak[t.k],dv=t.eq-pk,ispk=t.eq>=pk&&t.eq>0;
    h+='<tr><td>'+t.e+'</td><td>'+t.seg+'</td><td class="s '+(t.side==="BUY"?"buy":"sell")+'">'+L[t.side]+' → '+(t.pos>0?L.long:t.pos<0?L.short:L.flat)+'</td><td>'+t.size+'</td><td>'+(t.rt===null?"–":sg(t.rt))+'</td><td>'+sg(t.eq)+'</td><td'+(ispk?' class="pk">◆ '+L.peakTag:'>'+(dv?sg(dv):"0"))+'</td></tr>'});
   h+='</tbody></table>'}
 }else{
  $("fh").textContent=L.sFeedT;$("fs").textContent=L.sFeedSub+(lostN?" "+f(L.lostN,{n:lostN}):"");
  var n=Math.floor(p);
  if(!n)h='<div class="empty">'+L.fNone+'</div>';
  else{h='<table><thead><tr><th>'+L.sfCand+'</th><th>'+L.sfOp+'</th><th>'+L.sfDev+'</th><th>'+L.sfBest+'</th><th></th></tr></thead><tbody>';
   for(var i=n-1;i>=Math.max(0,n-40);i--){var c=CAND[i];if(c.dev===null)continue;h+='<tr><td>gen '+c.g+' #'+c.i+'</td><td>'+L.ops[c.op]+'</td><td>'+sg(c.dev)+'</td><td>'+sg(runBestAt[i])+'</td><td'+(c.rec>=0?' class="pk">◆ '+L.sfNew:'>')+'</td></tr>'}
   h+='</tbody></table>'}
 }
 $("feed").innerHTML=h;
}
function verdictHTML(){
 var el=$("vd");
 if(st.mode!=="champion"){el.innerHTML="";return}
 if(st.p<NS-0.001){el.innerHTML='<div class="verdict pending">'+L.verdictPending+'</div>';return}
 var a=D.confirmAll,pct=Math.round(a.sealed/a.dev*100);
 var r1=function(v,n){return (v/n).toFixed(1)};
 el.innerHTML='<div class="verdict">'+f(L.verdict,{dev:sg(a.dev),conf:sg(a.confirm),seal:sg(a.sealed),pct:pct})+'<small>'+f(L.verdictSub,{a:r1(a.dev,segLen.dev),b:r1(a.confirm,segLen.confirm),c:r1(a.sealed,segLen.sealed)})+'</small></div>';
}
function draw(){
 $("sc").max=maxP();
 if(st.mode==="champion"){$("h1").textContent=L.cPrice;$("s1").textContent=L.cPriceSub;legendChampion();drawChampion()}
 else{$("h1").textContent=LANG==="zh"?"搜索:最佳候选与每个候选的 dev 分数":"The search: best candidate so far, and every candidate's dev score";$("s1").textContent=LANG==="zh"?"每个候选的交易落链后,它的 dev 分数出现。":"Each candidate's dev score appears as its transaction lands on chain.";legendSearch();drawSearch()}
 rightPanels();updateText();feedHTML();verdictHTML();
}
/* ---------- boot ---------- */
var t0=parseFloat(Q.get("t"));
setMode(st.mode);
if(!isNaN(t0)){st.p=Math.max(0,Math.min(1,t0))*maxP();draw()}
else if(!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)){st.playing=true;draw()}
requestAnimationFrame(tick);
window.__simReady=true;
})();
