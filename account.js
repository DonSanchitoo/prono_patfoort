import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js?v=accounts-v6';

const $=selector=>document.querySelector(selector);

export async function initAccountSync({getState,applyState,resetState,registerCloudSave,onAuthChange=()=>{},onCommunityData=()=>{},onCommunityStatus=()=>{},toast}){
  const dialog=$('#account-dialog'),button=$('#account-button'),label=$('#account-label'),form=$('#account-form'),loggedOut=$('#account-logged-out'),loggedIn=$('#account-logged-in'),configRequired=$('#account-config-required'),message=$('#account-message'),status=$('#sync-status');
  let client=null,currentUser=null,loadedUserId=null,saveTimer=null;
  const configured=/^https:\/\/.+\.supabase\.co\/?$/.test(SUPABASE_URL)&&SUPABASE_ANON_KEY.length>20;
  const showMessage=(value,error=false)=>{message.textContent=value;message.classList.toggle('error',error)};
  const setBusy=busy=>form.querySelectorAll('button,input').forEach(element=>element.disabled=busy);
  const setView=user=>{currentUser=user??null;loggedOut.hidden=Boolean(user)||!configured;loggedIn.hidden=!user;configRequired.hidden=configured;const nickname=getState().profile?.nickname||user?.user_metadata?.username;label.textContent=user?(nickname||user.email?.split('@')[0]||'Mon profil'):(configured?'Connexion':'Compte');button.classList.toggle('connected',Boolean(user));if(user)$('#account-email').textContent=user.email??'';onAuthChange(Boolean(user))};

  button.addEventListener('click',()=>currentUser?$('#profile-dialog').showModal():dialog.showModal());
  if(!configured){setView(null);showMessage('Ajoutez les variables Supabase au dépôt pour activer la synchronisation.');onCommunityStatus('off');return{reloadCommunity:()=>{}}}

  const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const metrics=(history,days)=>{const after=Date.now()-days*864e5,bets=(history??[]).filter(bet=>bet.status!=='pending'&&new Date(bet.settledAt??bet.date).getTime()>=after),won=bets.filter(bet=>bet.status==='won'),staked=bets.reduce((sum,bet)=>sum+Number(bet.stake||0),0),returned=bets.reduce((sum,bet)=>sum+Number(bet.returnAmount??(bet.status==='won'?bet.stake*bet.odds:0)),0);return{bets:bets.length,wins:won.length,roi:staked?(returned-staked)/staked*100:0,bestOdd:Math.max(0,...won.map(bet=>Number(bet.odds||0)))}};
  const challengeMetrics=payload=>Object.fromEntries((payload.challengeEntries??[]).map(entry=>{const id=typeof entry==='string'?entry:entry.id,joinedAt=typeof entry==='string'?0:new Date(entry.joinedAt).getTime(),days=id==='safe-week'?7:id==='value-hunter'?30:3650,after=Math.max(joinedAt,Date.now()-days*864e5),bets=(payload.history??[]).filter(bet=>bet.status!=='pending'&&new Date(bet.settledAt??bet.date).getTime()>=after&&(id!=='safe-week'||Number(bet.odds)<=2));let streak=0,bestStreak=0;for(const bet of bets.slice().reverse()){streak=bet.status==='won'?streak+1:0;bestStreak=Math.max(bestStreak,streak)}const score=id==='perfect-five'?bestStreak:bets.reduce((sum,bet)=>sum+(bet.status==='won'?Math.round(Number(bet.returnAmount??bet.stake*bet.odds)/Number(bet.stake||1)*10):-5),0);return[id,{score,bets:bets.length,wins:bets.filter(bet=>bet.status==='won').length}]}));
  // Annuaire complet : pages de 500 profils (ordre alphabétique stable, le pseudo est unique), jusqu'à 5 000 joueurs.
  const COMMUNITY_PAGE=500,COMMUNITY_MAX=5000;
  const loadCommunity=async()=>{onCommunityStatus('loading');const rows=[];for(let from=0;from<COMMUNITY_MAX;from+=COMMUNITY_PAGE){const {data,error}=await client.from('profiles').select('nickname,avatar,avatar_config,metrics,period_stats,challenge_stats,updated_at').order('nickname',{ascending:true}).range(from,from+COMMUNITY_PAGE-1);if(error){if(error.code!=='42P01')console.warn('Classement indisponible',error.message);onCommunityStatus('error');return}rows.push(...data);if(data.length<COMMUNITY_PAGE)break}onCommunityData(rows);onCommunityStatus('ready')};
  const publishCommunity=async payload=>{if(!currentUser)return;const profile=payload.profile??{},avatar=['lime','blue','purple','orange'].includes(profile.avatar)?profile.avatar:'lime',avatar_config={avatar,face:['smile','cool','focused','wink'].includes(profile.face)?profile.face:'smile',accessory:['none','glasses','cap','crown'].includes(profile.accessory)?profile.accessory:'none'},period_stats={day:metrics(payload.history,1),week:metrics(payload.history,7),month:metrics(payload.history,30),all:metrics(payload.history,36500)},row={user_id:currentUser.id,nickname:String(profile.nickname||currentUser.user_metadata?.username||'Parieur').slice(0,24),avatar,avatar_config,metrics:metrics(payload.history,36500),period_stats,challenge_stats:challengeMetrics(payload),updated_at:new Date().toISOString()},{error}=await client.from('profiles').upsert(row,{onConflict:'user_id'});if(error){if(error.code==='23505')toast('Ce pseudo est déjà pris, choisissez-en un autre');else if(error.code!=='42P01')console.warn('Classement indisponible',error.message);return}label.textContent=row.nickname;await loadCommunity()};
  const saveNow=async payload=>{
    if(!currentUser)return;
    status.textContent='Synchronisation en cours…';status.className='sync-status syncing';
    const {error}=await client.from('user_states').upsert({user_id:currentUser.id,state:payload,updated_at:new Date().toISOString()},{onConflict:'user_id'});
    if(error){status.textContent='Échec de synchronisation · nouvel essai au prochain changement';status.className='sync-status error';console.error(error);return}
    status.textContent=`Synchronisé à ${new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(new Date())}`;status.className='sync-status';publishCommunity(payload);
  };
  registerCloudSave(payload=>{if(!currentUser)return;clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveNow(payload),600)});

  const loadUser=async user=>{
    setView(user);
    if(!user||loadedUserId===user.id)return;
    loadedUserId=user.id;status.textContent='Récupération de vos données…';
    const {data,error}=await client.from('user_states').select('state').eq('user_id',user.id).maybeSingle();
    if(error){status.textContent='Impossible de récupérer vos données';status.className='sync-status error';showMessage(error.message,true);return}
    const meta=user.user_metadata??{},metaProfile={nickname:String(meta.username||'Parieur').slice(0,24),avatar:meta.avatar||'lime',face:meta.face||'smile',accessory:meta.accessory||'none'},payload=data?.state??{...getState(),profile:metaProfile},{data:own}=await client.from('profiles').select('nickname').eq('user_id',user.id).maybeSingle();if(own?.nickname)payload.profile={...payload.profile,nickname:own.nickname};
    applyState(payload);if(!data?.state)await saveNow(payload);await publishCommunity(payload);setView(user);
    status.textContent='Synchronisation à jour';status.className='sync-status';
  };

  form.addEventListener('submit',async event=>{event.preventDefault();const values=new FormData(form),email=String(values.get('email')??'').trim(),password=String(values.get('password')??'');setBusy(true);showMessage('Connexion en cours…');const {data,error}=await client.auth.signInWithPassword({email,password});setBusy(false);if(error){showMessage(error.message,true);return}showMessage('Connexion réussie.');await loadUser(data.user);dialog.close();toast('Compte connecté · données synchronisées')});
  $('#create-account').addEventListener('click',async()=>{if(!form.reportValidity())return;const values=new FormData(form),username=String(values.get('username')??'').trim(),email=String(values.get('email')??'').trim(),password=String(values.get('password')??''),avatar=String(values.get('signup-avatar')??'lime'),face=String(values.get('signup-face')??'smile'),accessory=String(values.get('signup-accessory')??'none');if(!/^[A-Za-zÀ-ÿ0-9_. -]{3,24}$/.test(username)){showMessage('Choisissez un nom d’utilisateur de 3 à 24 caractères.',true);return}if(password.length<6){showMessage(`Mot de passe incomplet (${password.length}/6 caractères).`,true);return}setBusy(true);showMessage('Création du compte…');const {data,error}=await client.auth.signUp({email,password,options:{data:{username,avatar,face,accessory}}});setBusy(false);if(error){showMessage(error.message,true);return}if(data.session){showMessage('Compte créé et connecté.');await loadUser(data.user);dialog.close();toast(`Bienvenue ${username} · votre profil est créé`)}else showMessage(`Compte ${username} créé. Consultez votre e-mail pour confirmer votre adresse.`)});
  $('#logout-account').addEventListener('click',async()=>{const {error}=await client.auth.signOut();if(error){showMessage(error.message,true);return}currentUser=null;loadedUserId=null;clearTimeout(saveTimer);setView(null);resetState();dialog.close();toast('Vous êtes déconnecté')});

  client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){currentUser=null;loadedUserId=null;setView(null);resetState();return}if(session?.user)setTimeout(()=>loadUser(session.user),0)});
  loadCommunity();
  client.auth.getSession().then(({data,error})=>{if(error)showMessage(error.message,true);else if(data.session?.user)loadUser(data.session.user);else setView(null)});
  return{reloadCommunity:loadCommunity};
}
