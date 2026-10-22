// Calculs purs partagés par le site (app.js) et le pipeline de données (scripts/update-fixtures.mjs).
export function poisson(k,lambda){let f=1;for(let i=2;i<=k;i++)f*=i;return Math.exp(-lambda)*lambda**k/f}
export function analyseMatch(match){let home=0,draw=0,away=0,under=0,bttsNo=0;for(let i=0;i<=8;i++)for(let j=0;j<=8;j++){const p=poisson(i,match.homeGoals)*poisson(j,match.awayGoals);if(i>j)home+=p;else if(i===j)draw+=p;else away+=p;if(i+j<=2)under+=p;if(i===0||j===0)bttsNo+=p}const probs={home,draw,away,over:1-under,btts:1-bttsNo};const markets=[['home',match.home],['draw','Match nul'],['away',match.away],['over','Plus de 2,5 buts'],['btts','Les deux marquent']].map(([key,label])=>({key,label,odd:match.odds[key],probability:probs[key],value:probs[key]*match.odds[key]-1}));return{probs,markets,confidence:Math.round(Math.max(...markets.map(m=>m.probability))*100)} }
export function recommendedMarket(match){const markets=analyseMatch(match).markets.filter(m=>m.odd>=1.08&&m.odd<=5&&m.value>=-.18);return markets.sort((a,b)=>(b.probability+Math.min(.15,b.value)*.18)-(a.probability+Math.min(.15,a.value)*.18))[0]??analyseMatch(match).markets.sort((a,b)=>b.probability-a.probability)[0]}
export function optimizeCombo(matches,target=3,maxCount=3,risk='balanced'){const profiles={safe:{minProbability:.5,maxOdd:2.5,valueWeight:.05,riskWeight:1.15},balanced:{minProbability:.42,maxOdd:5,valueWeight:.15,riskWeight:.75},bold:{minProbability:.28,maxOdd:8,valueWeight:.65,riskWeight:.35}},profile=profiles[risk]??profiles.balanced;const candidates=matches.map(match=>({...recommendedMarket(match),matchId:match.id,match:`${match.home} – ${match.away}`,home:match.home,away:match.away,league:match.league,date:match.date,time:match.time})).filter(x=>x.probability>=profile.minProbability&&x.odd<=profile.maxOdd).sort((a,b)=>(b.probability+Math.max(0,b.value)*profile.valueWeight)-(a.probability+Math.max(0,a.value)*profile.valueWeight)).slice(0,18);let best=[],bestScore=Infinity;const evaluate=selection=>{const odds=selection.reduce((p,x)=>p*x.odd,1),confidence=selection.reduce((p,x)=>p*x.probability,1)**(1/selection.length),value=selection.reduce((sum,x)=>sum+Math.max(0,x.value),0)/selection.length,distance=Math.abs(Math.log(odds/target)),under=odds<target?.08:0,score=distance*3+under+(1-confidence)*profile.riskWeight-value*profile.valueWeight;if(score<bestScore){bestScore=score;best=[...selection]}};const search=(index,selection)=>{if(selection.length>=2)evaluate(selection);if(selection.length===maxCount)return;for(let i=index;i<candidates.length;i++)search(i+1,[...selection,candidates[i]])};search(0,[]);return best}
export function selectionResult(item,results){const teams=(item.match??'').split(/\s+[–-]\s+/),homeTeam=item.home??teams[0],awayTeam=item.away??teams[1];const result=results.find(match=>match.id===item.matchId||(homeTeam&&awayTeam&&match.home===homeTeam&&match.away===awayTeam));if(result?.voided)return{status:'void',result};if(!result?.completed)return{status:'pending',result:null};const home=result.homeScore,away=result.awayScore,won=item.key==='home'?home>away:item.key==='draw'?home===away:item.key==='away'?away>home:item.key==='over'?home+away>2.5:item.key==='btts'?home>0&&away>0:false;return{status:won?'won':'lost',result}}
export function settleBet(bet,results){let waiting=false,played=0;for(const item of bet.items){const selection=selectionResult(item,results);if(selection.status==='lost')return'lost';if(selection.status==='pending')waiting=true;else if(selection.status==='won')played++}return waiting?'pending':played?'won':'void'}
export function combinations(size,pick){const result=[];const walk=(start,current)=>{if(current.length===pick){result.push([...current]);return}for(let i=start;i<size;i++)walk(i+1,[...current,i])};walk(0,[]);return result}
export function systemLines(items,formula='auto'){
  const n=items.length,required={trixie:3,yankee:4,'2of3':3,'2of4':4,'3of4':4}[formula];
  if(required&&n!==required)return[];
  const patterns=formula==='trixie'?[[2],[3]]:formula==='yankee'?[[2],[3],[4]]:formula==='2of3'?[[2]]:formula==='2of4'?[[2]]:formula==='3of4'?[[3]]:[[Math.max(2,n-1)]];
  return patterns.flatMap(([pick])=>pick<=n?combinations(n,pick).map(indexes=>({indexes,odds:indexes.reduce((product,index)=>product*items[index].odd,1)})):[])
}
export function settleSystemBet(bet,results){
  const selections=bet.items.map(item=>selectionResult(item,results).status);if(selections.includes('pending'))return{status:'pending',returnAmount:0,wonLines:0};
  let returnAmount=0,wonLines=0;for(const line of bet.systemLines??[]){if(line.indexes.every(index=>selections[index]==='won')){returnAmount+=line.stake*line.odds;wonLines++}}
  return{status:wonLines?'won':'lost',returnAmount,wonLines};
}
// Règlement officiel d'un ticket certifié (serveur) : une sélection annulée est retirée du calcul (cote 1), un ticket entièrement annulé est remboursé.
// bet : {betType, stake, items:[{matchId,key,odd}], systemLines:[{indexes,odds,stake}]}. Renvoie {status:'pending'|'won'|'lost'|'void', payout}.
const cents=value=>Math.round(value*100)/100;
export function settleTicket(bet,results){
  const stake=Number(bet.stake)||0,legs=bet.items.map(item=>({odd:Number(item.odd),status:selectionResult(item,results).status}));
  if(bet.betType==='multiple'){
    let payout=0,waiting=false,wonLines=0;
    for(const line of bet.systemLines??[]){const own=line.indexes.map(index=>legs[index]);if(own.some(leg=>leg.status==='lost'))continue;if(own.some(leg=>leg.status==='pending')){waiting=true;continue}const played=own.filter(leg=>leg.status==='won');payout+=Number(line.stake)*played.reduce((product,leg)=>product*leg.odd,1);if(played.length)wonLines++}
    if(waiting)return{status:'pending',payout:0};
    return{status:wonLines?'won':payout>0?'void':'lost',payout:cents(payout)};
  }
  if(legs.some(leg=>leg.status==='lost'))return{status:'lost',payout:0};
  if(legs.some(leg=>leg.status==='pending'))return{status:'pending',payout:0};
  const played=legs.filter(leg=>leg.status==='won');
  return played.length?{status:'won',payout:cents(stake*played.reduce((product,leg)=>product*leg.odd,1))}:{status:'void',payout:cents(stake)};
}
// Ligue générale (BET-53) : chaque prono compte comme une mise fixe de 10, cote plafonnée à 10,00. Gagné (cote - 1) × 10, perdu -10, annulé 0.
export const WEEKLY_QUOTA=10,LEAGUE_ODDS_CAP=10;
export function leaguePoints({status,odds}){return status==='won'?Math.round((Math.min(Number(odds)||1,LEAGUE_ODDS_CAP)-1)*1000)/100:status==='lost'?-10:0}
const parisDay=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'});
// Lundi (heure de Paris) de la semaine d'un instant, au format AAAA-MM-JJ : la semaine va du lundi 00:00 au dimanche 23:59.
export function weekKey(date){const [y,m,d]=parisDay.format(new Date(date)).split('-').map(Number),day=new Date(Date.UTC(y,m-1,d));day.setUTCDate(day.getUTCDate()-(day.getUTCDay()+6)%7);return day.toISOString().slice(0,10)}
// Paris certifiés (forme du site : date, countsGeneral, items) comptés dans la semaine de `now` et places restantes.
export function quotaUsed(bets,now=Date.now()){const week=weekKey(now);return bets.filter(bet=>bet.countsGeneral&&weekKey(bet.date)===week).length}
export function quotaRemaining(bets,now=Date.now(),limit=WEEKLY_QUOTA){return Math.max(0,limit-quotaUsed(bets,now))}
// Un ticket compte en ligue s'il reste du quota et si aucun de ses matchs n'a déjà servi à un ticket compté (mêmes règles que le serveur).
export function leagueEligibility(matchIds,bets,now=Date.now()){const remaining=quotaRemaining(bets,now);if(!remaining)return{counts:false,reason:'QUOTA',remaining};const used=new Set(bets.filter(bet=>bet.countsGeneral).flatMap(bet=>bet.items.map(item=>item.matchId)));return matchIds.some(id=>used.has(id))?{counts:false,reason:'MATCH_DEJA_COMPTE',remaining}:{counts:true,reason:null,remaining}}
// Départage : points, puis ROI, puis bons pronos au défi du jour, puis ancienneté (le plus ancien d'abord).
export function tieBreak(a,b){return b.points-a.points||b.roi-a.roi||(b.dailyGood??0)-(a.dailyGood??0)||new Date(a.joinedAt)-new Date(b.joinedAt)}
// Défi du jour (BET-54) : 4 matchs du jour (heure de Paris) avec cotes 1N2 réelles, classés par importance de la compétition puis cotes les plus serrées.
// `previous` est le défi déjà publié : ses matchs et ses cotes restent figés, seules les places libres sont complétées avec des matchs pas encore commencés.
export const parisDate=date=>parisDay.format(new Date(date));
export function pickDailyChallenge(matches,day,weights={},previous=null,now=Date.now(),size=4){
  const real=match=>['home','draw','away'].every(key=>match.realOddsMarkets?.includes(key)&&Number(match.odds?.[key])>1),spread=match=>Math.max(match.odds.home,match.odds.draw,match.odds.away)-Math.min(match.odds.home,match.odds.draw,match.odds.away);
  const kept=previous?.date===day?previous.picks:[],taken=new Set(kept.map(pick=>pick.matchId));
  const added=matches.filter(match=>parisDate(match.kickoff)===day&&!match.completed&&!match.voided&&real(match)&&!taken.has(match.id)&&new Date(match.kickoff)>now).sort((a,b)=>(weights[b.league]??0)-(weights[a.league]??0)||spread(a)-spread(b)||String(a.id).localeCompare(String(b.id))).slice(0,Math.max(0,size-kept.length)).map(match=>({matchId:match.id,league:match.league,home:match.home,away:match.away,kickoff:match.kickoff,odds:{home:match.odds.home,draw:match.odds.draw,away:match.odds.away},bookmakers:match.oddsBookmakerCounts?.home??match.bookmakerCount??null}));
  return{date:day,picks:[...kept,...added]};
}
