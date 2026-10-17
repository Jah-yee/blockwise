#!/usr/bin/env python3
"""Blockwise diagrams adapted from p-to-q/ants assets/make_figures.py.
Original project: https://github.com/p-to-q/ants (Apache-2.0).
Original layout, coordinates and diagram grammar retained; copy and labels adapted.
"""
from pathlib import Path
from html import escape
A=Path(__file__).parent
PAPER='#E1E1DC'; CARD='#F0F0EC'; INK='#41423D'; MUTE='#73736F'; HAIR='#C8C7C1'; FILL='#B8B7B1'; MINT_1='#D9D8D2'; MINT_2='#C4C3BD'; MINT_3='#92918B'; MINT_TEXT='#595955'
SANS="'Noto Sans CJK SC','Source Han Sans SC','PingFang SC','Microsoft YaHei','Heiti SC',sans-serif"
W,PAD,TOP=900,32,124

def t(x,y,s,size=13,fill=INK,anchor='start',weight=400):
 return f'<text x="{x:.1f}" y="{y:.1f}" font-family="{SANS}" font-size="{size}" fill="{fill}" text-anchor="{anchor}" font-weight="{weight}">{escape(str(s))}</text>'
def head(title,sub):return [t(PAD,58,title,28,weight=600),t(PAD,86,sub,13,MUTE)]
def canvas(h,o,title):return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {h}" width="{W}" role="img" aria-label="{escape(title)}"><rect width="{W}" height="{h}" rx="16" fill="{PAPER}"/>'+''.join(o)+'</svg>'
def card(x,y,w,h,fill=CARD,stroke=HAIR):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{fill}" stroke="{stroke}" stroke-width="1"/>'
def arrow(x0,x1,y):
 d=1 if x1>=x0 else -1
 return f'<circle cx="{x0}" cy="{y}" r="3.2" fill="{INK}"/><line x1="{x0}" x2="{x1-d*2}" y1="{y}" y2="{y}" stroke="{INK}" stroke-width="1.8"/><path d="M{x1-d*6.5},{y-5.5} L{x1},{y} L{x1-d*6.5},{y+5.5}" fill="none" stroke="{INK}" stroke-width="1.8"/>'
def varrow(x,y0,y1):return f'<circle cx="{x}" cy="{y0}" r="3.2" fill="{INK}"/><line x1="{x}" x2="{x}" y1="{y0}" y2="{y1-2}" stroke="{INK}" stroke-width="1.8"/><path d="M{x-5.5},{y1-6.5} L{x},{y1} L{x+5.5},{y1-6.5}" fill="none" stroke="{INK}" stroke-width="1.8"/>'
def save(name,h,o,title): (A/name).write_text(canvas(h,o,title),encoding='utf-8')

def architecture():
 ch,gap_l,led=144,36,48; h=TOP+ch+gap_l+led+PAD
 o=head('Who Judges the Agents?','Agent 负责提出想法，实验负责检验想法；成绩由独立规则决定。')
 widths,gaps=(196,292,252),(44,52)
 cols=[('Propose',['提出新策略','可以探索，不能打分'],CARD,HAIR),('Judge',['用同一套规则评估','结果不由 Agent 决定'],MINT_2,MINT_2),('Execute',['让策略接受实际检验','每次实验独立进行'],CARD,HAIR)]
 xs=[PAD,PAD+widths[0]+gaps[0],PAD+widths[0]+gaps[0]+widths[1]+gaps[1]]
 wall=xs[1]-gaps[0]/2
 o.append(f'<line x1="{wall}" x2="{wall}" y1="{TOP-14}" y2="{TOP+ch+14}" stroke="{INK}" stroke-dasharray="3 3"/>')
 for (name,lines,fill,stroke),x,w in zip(cols,xs,widths):
  o.append(card(x,TOP,w,ch,fill,stroke));o.append(t(x+28,TOP+46,name,17,weight=600))
  for j,s in enumerate(lines):o.append(t(x+28,TOP+82+j*21,s,13))
 g=xs[1]+widths[1];o.extend([arrow(g,xs[2],TOP+ch/2-13),arrow(xs[2],g,TOP+ch/2+13)])
 ly=TOP+ch+gap_l;o.append(card(PAD,ly,W-2*PAD,led))
 for x,w in zip(xs,widths):o.append(varrow(x+w/2,TOP+ch,ly-1))
 o.extend([t(PAD+28,ly+29,'Ledger',15,weight=600),t(PAD+105,ly+29,'每个策略从提出到评估，都留下可核查的记录。',13)])
 save('01_architecture.svg',h,o,'Architecture')

def cascade():
 ch=240;h=TOP+ch+PAD;o=head('From Many to Few','先广泛尝试，再谨慎验证；只有少数策略进入下一轮。（数量仅为示意）')
 cw,gap=244,52
 stages=[('S0','自由探索 · Dev','16','从许多想法开始',16,None),('S1','独立复核 · Confirm','4','值得进一步检验',4,'示意比例'),('S2','最后检验 · Sealed','1','留下最后的候选',1,'示意比例')]
 for i,(name,sub,cost,total,keep,tag) in enumerate(stages):
  x=PAD+i*(cw+gap);o.append(card(x,TOP,cw,ch));o.extend([t(x+24,TOP+44,name,17,weight=600),t(x+24,TOP+66,sub,12,MUTE)])
  if tag:o.append(t(x+cw-24,TOP+44,tag,11,MINT_TEXT,'end',600))
  for k in range(16):
   cx,cy=x+30+(k%8)*26,TOP+104+(k//8)*26;on=k<keep
   o.append(f'<circle cx="{cx}" cy="{cy}" r="6" fill="{MINT_3 if on else FILL}" fill-opacity="{1 if on else .5}"/>')
  o.extend([f'<line x1="{x+24}" x2="{x+cw-24}" y1="{TOP+156}" y2="{TOP+156}" stroke="{HAIR}"/>',t(x+24,TOP+194,cost,22,weight=600),t(x+24,TOP+216,total,12,MUTE)])
  if i<2:o.append(arrow(x+cw,x+cw+gap,TOP+117))
 save('02_cascade.svg',h,o,'From Many to Few')

def roles():
 rows=[('dev','供 Agent 反复尝试',0,'反复尝试',MINT_2,INK),('confirm','换一组数据重新检查',1,'独立复核',MINT_1,INK),('sealed','直到最后才揭晓',2,'最终检验',INK,PAPER),('stress','寻找策略脆弱的地方',3,'只用于诊断',CARD,INK)]
 cols=['Search','Confirmation','Claim','Diagnostics'];lw,cell_w,gap,rh=232,144,8,56;x0=PAD+lw;h=TOP+28+len(rows)*(rh+gap)-gap+PAD
 o=head('A Fair Test','探索可以反复发生，但最终检验必须留给真正未见过的数据。')
 for j,name in enumerate(cols):o.append(t(x0+j*(cell_w+gap)+cell_w/2,TOP+8,name,12,MUTE,'middle',500))
 for i,(name,desc,col,lab,fill,ink) in enumerate(rows):
  y=TOP+28+i*(rh+gap);o.extend([t(PAD,y+24,name,15,weight=600),t(PAD,y+43,desc,12,MUTE)])
  for j in range(4):
   cx=x0+j*(cell_w+gap)
   if j==col:o.extend([card(cx,y,cell_w,rh,fill,HAIR if fill==CARD else fill),t(cx+cell_w/2,y+rh/2+4.5,lab,13,ink,'middle',500)])
   else:o.append(f'<circle cx="{cx+cell_w/2}" cy="{y+rh/2}" r="2.5" fill="{FILL}"/>')
 save('03_data_roles.svg',h,o,'A Fair Test')

def ladder():
 bw,gap=190,25;heights=[96,128,160,192];base=TOP+heights[-1];track=base+32;h=track+56+PAD-8
 o=head('Earning Trust','一次好成绩还不够；策略需要经受更多检验，才能逐渐获得信任。')
 rungs=[('Candidate','值得继续看',CARD,HAIR),('Confirmed','经得起复核',MINT_1,HAIR),('Validated','在新数据上仍有效',MINT_2,MINT_2),('Champion','通过最终检验',MINT_3,MINT_3)]
 gates=['Confirm','Families','Sealed'];o.append(f'<line x1="{PAD}" x2="{W-PAD}" y1="{track}" y2="{track}" stroke="{INK}"/>')
 for i,(name,sub,fill,stroke) in enumerate(rungs):
  x,hh=PAD+i*(bw+gap),heights[i];o.extend([card(x,base-hh,bw,hh,fill,stroke),t(x+22,base-hh+38,name,16,weight=600),t(x+22,base-hh+60,sub,12.5,MUTE)])
  if i<3:
   gx=x+bw+gap/2;o.extend([f'<line x1="{gx}" x2="{gx}" y1="{base-24}" y2="{track}" stroke="{INK}"/>',f'<circle cx="{gx}" cy="{track}" r="6" fill="{PAPER}" stroke="{INK}" stroke-width="1.5"/>',t(gx,track+30,gates[i],12,INK,'middle',500)])
 save('04_promotion_ladder.svg',h,o,'Earning Trust')

def chain():
 n,bw,gap=5,140,34;ch=88;h=TOP+ch+24+28+PAD;o=head('Ledger','不只展示赢家，也保留每次提交、评分与状态变化的证据。')
 for i in range(n):
  x,last=PAD+i*(bw+gap),i==n-1;o.append(card(x,TOP,bw,ch,MINT_2 if last else CARD,MINT_2 if last else HAIR))
  o.extend([t(x+18,TOP+32,'head' if last else f'event {i+1}',12,INK if last else MUTE,weight=500),t(x+18,TOP+58,'H(0, body)' if i==0 else 'H(prev, body)',13,weight=600),f'<rect x="{x+18}" y="{TOP+70}" width="{bw-36}" height="4" rx="2" fill="{MINT_3 if last else FILL}"/>'])
  if i<n-1:o.append(arrow(x+bw,x+bw+gap,TOP+44))
 hx=PAD+(n-1)*(bw+gap)+bw/2;o.append(f'<line x1="{hx}" x2="{hx}" y1="{TOP+ch}" y2="{TOP+ch+24}" stroke="{INK}" stroke-dasharray="3 3"/>')
 o.extend([card(hx-74,TOP+ch+24,148,28,PAPER,INK),t(hx,TOP+ch+43,'链上记录可核查',12,INK,'middle',500)])
 save('05_ledger.svg',h,o,'Ledger')
if __name__=='__main__':
 for f in [architecture,cascade,roles,ladder,chain]:f()
 print('Generated five SVG figures in',A)
