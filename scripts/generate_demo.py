"""Deterministic synthetic fixtures, NOT official 2025 records. Standard library only."""
import json, math, random
from pathlib import Path
from datetime import date, timedelta

ROOT = Path(__file__).resolve().parents[1]
TEAMS = [
("jeonbuk","전북 현대","전북","전북", "#16784d"),
("ulsan","울산 HD","울산","울산", "#2362b7"),
("seoul","FC 서울","서울","서울", "#ba3240"),
("pohang","포항 스틸러스","포항","경북", "#a93435"),
("gimcheon","김천 상무","김천","경북", "#a14e37"),
("daejeon","대전 하나","대전","대전", "#287d67"),
("gwangju","광주 FC","광주","광주", "#b8871b"),
("gangwon","강원 FC","강원","강원", "#dc742d"),
("anyang","FC 안양","안양","경기", "#6f4395"),
("suwonfc","수원 FC","수원FC","경기", "#345e98"),
("jeju","제주 SK","제주","제주", "#e07832"),
("daegu","대구 FC","대구","대구", "#459bbd"),
("incheon","인천 유나이티드","인천","인천","#2c5687"),
("suwon","수원 삼성","수원삼성","경기","#2767a9"),
("busan","부산 아이파크","부산","부산","#bf3446"),
("seongnam","성남 FC","성남","경기","#404954"),
("bucheon","부천 FC","부천","경기","#b43e45"),
("jeonnam","전남 드래곤즈","전남","전남","#b08b20"),
("seoule","서울 이랜드","서울E","서울","#243957"),
("asan","충남 아산","아산","충남","#2a68b0"),
("cheongju","충북 청주","청주","충북","#a23c3b"),
("cheonan","천안 시티","천안","충남","#5d94b4"),
("gimpo","김포 FC","김포","경기","#2f7464"),
("ansan","안산 그리너스","안산","경기","#24846f"),
("gyeongnam","경남 FC","경남","경남","#b63745"),
("hwaseong","화성 FC","화성","경기","#d56c2b")]
teams=[dict(id=t[0],name=t[1],short=t[2],region=t[3],color=t[4],league=1 if i<12 else 2) for i,t in enumerate(TEAMS)]
byid={t["id"]:t for t in teams}
rng=random.Random(2025)

def poisson(lam, r):
    limit=math.exp(-lam); prod=1; k=0
    while prod>limit:
        k+=1; prod*=r.random()
    return k-1

def pairs(ids):
    a=list(ids); result=[]
    for k in range(len(a)-1):
        result.append([(a[i],a[-1-i]) if (k+i)%2==0 else (a[-1-i],a[i]) for i in range(len(a)//2)])
        a=[a[0],a[-1]]+a[1:-1]
    return result

def table(ids, matches):
    rows={i:[0,0,0] for i in ids}
    for m in matches:
        if m["home"] not in rows or m["away"] not in rows: continue
        h,a=m["score"]
        for t,g,c,p in [(m["home"],h,a,3 if h>a else 1 if h==a else 0),(m["away"],a,h,3 if a>h else 1 if h==a else 0)]:
            rows[t][0]+=p; rows[t][1]+=g; rows[t][2]+=g-c
    return sorted(ids,key=lambda t:(-rows[t][0],-rows[t][1],-rows[t][2],t)), rows

def lambdas(h,a,history):
    def avg(t,field):
        vals=[m["score"][0 if m["home"]==t else 1] if field=="gf" else m["score"][1 if m["home"]==t else 0] for m in history if t in (m["home"],m["away"])]
        return (sum(vals)+7)/(len(vals)+5)
    return min(3.2,max(.4,(avg(h,"gf")+avg(a,"ga"))/2*1.12)),min(3,max(.3,(avg(a,"gf")+avg(h,"ga"))/2*.93))
def outcome_probs(lh,la):
    p=[0.,0.,0.]
    for h in range(15):
        for a in range(15):
            v=math.exp(-lh)*lh**h/math.factorial(h)*math.exp(-la)*la**a/math.factorial(a)
            p[0 if h>a else 1 if h==a else 2]+=v
    s=sum(p); return [round(x/s*100,3) for x in p]

matches=[]
for league in (1,2):
    ids=[t["id"] for t in teams if t["league"]==league]
    base=pairs(ids)
    strength={t:1.85-i*.065 for i,t in enumerate(ids)}
    schedule=[]
    for cycle in range(3):
        schedule += [[(a,h) if cycle%2 else (h,a) for h,a in row] for row in base]
    for rd,row in enumerate(schedule,1):
        history=[m for m in matches if m["league"]==league]
        for h,a in row:
            lh,la=lambdas(h,a,history)
            score=[poisson(strength[h]*1.12,rng),poisson(strength[a]*.94,rng)]
            matches.append(dict(id=f"k{league}-r{rd}-{h}-{a}",league=league,round=rd,date=str(date(2025,2,15)+timedelta(days=(rd-1)*7)),home=h,away=a,score=score,probabilities=outcome_probs(lh,la)))
    if league==1:
        ranked,_=table(ids,[m for m in matches if m["league"]==1])
        split=[ranked[:6],ranked[6:]]
        for k in range(5):
            history=[m for m in matches if m["league"]==1]
            for group in split:
                for h,a in pairs(group)[k]:
                    lh,la=lambdas(h,a,history)
                    matches.append(dict(id=f"k1-r{34+k}-{h}-{a}",league=1,round=34+k,date=str(date(2025,2,15)+timedelta(days=(33+k)*7)),home=h,away=a,score=[poisson(strength[h]*1.12,rng),poisson(strength[a]*.94,rng)],probabilities=outcome_probs(lh,la)))
k1=[m for m in matches if m["league"]==1]
ids=[t["id"] for t in teams if t["league"]==1]
actual_a=table(ids,[m for m in k1 if m["round"]<=33])[0][:6]

def simulate(cutoff,forced=None,iterations=240):
    history=[m for m in k1 if m["round"]<=cutoff]
    _,initial=table(ids,history)
    rates={(h,a):lambdas(h,a,history) for h in ids for a in ids if h!=a}
    counts={t:[0,0,0] for t in ids}
    # Same seed for baseline and conditional estimates reduces simulation noise.
    for run in range(iterations):
        r=random.Random(77400+cutoff*1000+run)
        rows={t:list(initial[t]) for t in ids}
        def play(h,a,mid=None):
            lh,la=rates[h,a]; hg,ag=poisson(lh,r),poisson(la,r)
            if forced and mid==forced[0]:
                # Conditional score draws, not an arbitrary fixed winning margin.
                target=forced[1]
                while (0 if hg>ag else 1 if hg==ag else 2)!=target:
                    hg,ag=poisson(lh,r),poisson(la,r)
            rows[h][0]+=3 if hg>ag else 1 if hg==ag else 0
            rows[a][0]+=3 if ag>hg else 1 if hg==ag else 0
            rows[h][1]+=hg; rows[a][1]+=ag
            rows[h][2]+=hg-ag; rows[a][2]+=ag-hg
        def rank(group):
            # Internal demo tie resolution only; not asserted as official policy.
            return sorted(group,key=lambda t:(-rows[t][0],-rows[t][1],-rows[t][2],t))
        if cutoff<33:
            for m in k1:
                if cutoff<m["round"]<=33: play(m["home"],m["away"],m["id"])
            ordered=rank(ids); groups=[ordered[:6],ordered[6:]]
            for group in groups:
                for round_pairs in pairs(group):
                    for h,a in round_pairs: play(h,a)
        else:
            groups=[actual_a,[t for t in ids if t not in actual_a]]
            for m in k1:
                if m["round"]>cutoff: play(m["home"],m["away"],m["id"])
        final=rank(groups[0])+rank(groups[1])
        for t in ids:
            counts[t][0]+=t in groups[0]
            counts[t][1]+=final.index(t)>=9
            counts[t][2]+=final.index(t)==11
    return {t:dict(finalA=round(v[0]/iterations*100,1),danger=round(v[1]/iterations*100,1),direct=round(v[2]/iterations*100,1)) for t,v in counts.items()}

forecasts={}
for rd in (31,32,33,36,37):
    print(f"Generating illustrative round {rd}",flush=True)
    base=simulate(rd-1)
    games={}
    for m in [m for m in k1 if m["round"]==rd]:
        variants=[simulate(rd-1,(m["id"],o)) for o in range(3)]
        swings=[max(v[t][metric] for v in variants)-min(v[t][metric] for v in variants) for t in (m["home"],m["away"]) for metric in ("finalA","danger")]
        games[m["id"]]=dict(index=round(sum(swings)/4,1),outcomes=variants)
    forecasts[str(rd)]=dict(asOfRound=rd-1,baseline=base,games=games)
data=dict(heroMedia=dict(videoSrc="/media/hero.mp4" if (ROOT/"public/media/hero.mp4").exists() else None,posterSrc="/media/hero-poster.jpg" if (ROOT/"public/media/hero-poster.jpg").exists() else None),meta=dict(mode="demo",season=2025,source="합성 예시 데이터 · 실제 2025시즌 기록 아님",generatedAt="2026-11-14",model="demo-poisson-v1",simulationRuns=240,notes="과거 합성 경기의 득실점으로 포아송 모형 계산. 33R 이전에는 모의 순위에 따라 파이널 그룹 재편성. 빅매치 지수는 양 팀 파이널 A·강등권 확률 범위 4개의 평균. 공식 계산식이 아닙니다. 내부 완전 동률은 ID순으로 처리하므로 확정 판정에 사용하지 않습니다.",relegationCertified=False),teams=teams,matches=matches,forecasts=forecasts)
out=ROOT/"public"/"data"/"sample-data.json";out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(data,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
assert len(k1)==228
assert len([m for m in matches if m["league"]==2])==273
print(f"Wrote {len(matches)} synthetic matches to {out}")
