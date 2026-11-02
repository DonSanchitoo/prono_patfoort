// Identifiants stables : les cinq marchés historiques gardent leur sens.
export const LEGACY_MARKETS=['home','draw','away','over','btts'];
export const STAGE_ONE=['under','bttsNo','over15','under15','over35','under35'];
export const STAGE_TWO=['homeDraw','drawAway','homeAway','homeDnb','awayDnb'];
export function marketSpec(key,match={}){
 const fixed={home:[match.home??'Domicile','Résultat'],draw:['Match nul','Résultat'],away:[match.away??'Extérieur','Résultat'],over:['Plus de 2,5 buts','Buts',2.5,'over'],under:['Moins de 2,5 buts','Buts',2.5,'under'],btts:['Les deux marquent','Équipes'],bttsNo:['Les deux ne marquent pas','Équipes'],homeDraw:['Double chance 1N','Résultat'],drawAway:['Double chance N2','Résultat'],homeAway:['Double chance 12','Résultat'],homeDnb:[`${match.home??'Domicile'} remboursé si nul`,'Résultat'],awayDnb:[`${match.away??'Extérieur'} remboursé si nul`,'Résultat']};
 let v=fixed[key];const total=/^(over|under)(15|35)$/.exec(key),team=/^(home|away)(Over|Under)(05|15|25|35|45|55)$/.exec(key);
 if(total)v=[`${total[1]==='over'?'Plus':'Moins'} de ${Number(total[2])/10} buts`.replace('.',','),'Buts',Number(total[2])/10,total[1]];
 if(team)v=[`${match[team[1]]??(team[1]==='home'?'Domicile':'Extérieur')} : ${team[2]==='Over'?'plus':'moins'} de ${Number(team[3])/10} buts`.replace('.',','),'Équipes',Number(team[3])/10,team[2].toLowerCase(),team[1]];
 if(!v)return null;return{key,label:v[0],family:v[1],line:v[2]??null,direction:v[3]??null,team:v[4]??null,dnb:key==='homeDnb'||key==='awayDnb'};
}
export function marketKeys(odds={}){return [...LEGACY_MARKETS,...Object.keys(odds).filter(key=>!LEGACY_MARKETS.includes(key)&&marketSpec(key))]}
export function scoreOutcome(key,home,away){const spec=marketSpec(key);if(!spec)return null;if(spec.dnb&&home===away)return'void';let won;if(spec.line!=null){const goals=spec.team==='home'?home:spec.team==='away'?away:home+away;won=spec.direction==='over'?goals>spec.line:goals<spec.line}else won=key==='home'||key==='homeDnb'?home>away:key==='away'||key==='awayDnb'?away>home:key==='draw'?home===away:key==='homeDraw'?home>=away:key==='drawAway'?away>=home:key==='homeAway'?home!==away:key==='btts'?home>0&&away>0:home===0||away===0;return won?'won':'lost'}
export function selectionCondition(key){const spec=marketSpec(key);return spec?.dnb?'Temps réglementaire : victoire de l’équipe choisie gagnante, nul remboursé (cote 1 dans un combiné), défaite perdante.':spec?.line!=null?`Temps réglementaire : ${spec.team?'buts de l’équipe choisie':'total du match'}, strictement ${spec.direction==='over'?'plus':'moins'} de ${String(spec.line).replace('.',',')}.`:'Temps réglementaire, arrêts de jeu inclus. Prolongation et tirs au but exclus.'}
