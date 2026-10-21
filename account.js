import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js?v=accounts-v3';

const $=selector=>document.querySelector(selector);

export async function initAccountSync({getState,applyState,resetState,registerCloudSave,onAuthChange=()=>{},onCommunityData=()=>{},toast}){
  const dialog=$('#account-dialog'),button=$('#account-button'),label=$('#account-label'),form=$('#account-form'),loggedOut=$('#account-logged-out'),loggedIn=$('#account-logged-in'),configRequired=$('#account-config-required'),message=$('#account-message'),status=$('#sync-status');
  let client=null,currentUser=null,loadedUserId=null,saveTimer=null;
  const configured=/^https:\/\/.+\.supabase\.co\/?$/.test(SUPABASE_URL)&&SUPABASE_ANON_KEY.length>20;
  const showMessage=(value,error=false)=>{message.textContent=value;message.classList.toggle('error',error)};
  const setBusy=busy=>form.querySelectorAll('button,input').forEach(element=>element.disabled=busy);
  const setView=user=>{currentUser=user??null;loggedOut.hidden=Boolean(user)||!configured;loggedIn.hidden=!user;configRequired.hidden=configured;label.textContent=user?(user.email?.split('@')[0]||'Mon compte'):(configured?'Connexion':'Compte');button.classList.toggle('connected',Boolean(user));if(user)$('#account-email').textContent=user.email??'';onAuthChange(Boolean(user))};

  button.addEventListener('click',()=>dialog.showModal());
  if(!configured){setView(null);showMessage('Ajoutez les variables Supabase au dépôt pour activer la synchronisation.');return}

  const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const metrics=(history,days)=>{const after=Date.now()-days*864e5,bets=(history??[]).filter(bet=>bet.status!=='pending'&&new Date(bet.settledAt??bet.date).getTime()>=after),won=bets.filter(bet=>bet.status==='won'),staked=bets.reduce((sum,bet)=>sum+Number(bet.stake||0),0),returned=bets.reduce((sum,bet)=>sum+Number(bet.returnAmount??(bet.status==='won'?bet.stake*bet.odds:0)),0);return{bets:bets.length,wins:won.length,roi:staked?(returned-staked)/staked*100:0,bestOdd:Math.max(0,...won.map(bet=>Number(bet.odds||0)))}};
  const challengeMetrics=payload=>Object.fromEntries((payload.challengeEntries??[]).map(entry=>{const id=typeof entry==='string'?entry:entry.id,joinedAt=typeof entry==='string'?0:new Date(entry.joinedAt).getTime(),days=id==='safe-week'?7:id==='value-hunter'?30:3650,after=Math.max(joinedAt,Date.now()-days*864e5),bets=(payload.history??[]).filter(bet=>bet.status!=='pending'&&new Date(bet.settledAt??bet.date).getTime()>=after&&(id!=='safe-week'||Number(bet.odds)<=2));let streak=0,bestStreak=0;for(const bet of bets.slice().reverse()){streak=bet.status==='won'?streak+1:0;bestStreak=Math.max(bestStreak,streak)}const score=id==='perfect-five'?bestStreak:bets.reduce((sum,bet)=>sum+(bet.status==='won'?Math.round(Number(bet.returnAmount??bet.stake*bet.odds)/Number(bet.stake||1)*10):-5),0);return[id,{score,bets:bets.length,wins:bets.filter(bet=>bet.status==='won').length}]}));
  const loadCommunity=async()=>{const {data,error}=await client.from('profiles').select('nickname,avatar,metrics,period_stats,challenge_stats,updated_at').order('updated_at',{ascending:false}).limit(100);if(data)onCommunityData(data);else if(error&&error.code!=='42P01')console.warn('Classement indisponible',error.message)};
  const publishCommunity=async payload=>{if(!currentUser)return;const profile=payload.profile??{},period_stats={day:metrics(payload.history,1),week:metrics(payload.history,7),month:metrics(payload.history,30),year:metrics(payload.history,365)},row={user_id:currentUser.id,nickname:String(profile.nickname||'Parieur').slice(0,24),avatar:['lime','blue','purple','orange'].includes(profile.avatar)?profile.avatar:'lime',metrics:metrics(payload.history,3650),period_stats,challenge_stats:challengeMetrics(payload),updated_at:new Date().toISOString()},{error}=await client.from('profiles').upsert(row,{onConflict:'user_id'});if(error){if(error.code!=='42P01')console.warn('Classement indisponible',error.message);return}await loadCommunity()};
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
    if(data?.state)applyState(data.state);else await saveNow(getState());await publishCommunity(data?.state??getState());
    status.textContent='Synchronisation à jour';status.className='sync-status';
  };

  form.addEventListener('submit',async event=>{event.preventDefault();const values=new FormData(form),email=String(values.get('email')??'').trim(),password=String(values.get('password')??'');setBusy(true);showMessage('Connexion en cours…');const {data,error}=await client.auth.signInWithPassword({email,password});setBusy(false);if(error){showMessage(error.message,true);return}showMessage('Connexion réussie.');await loadUser(data.user);dialog.close();toast('Compte connecté · données synchronisées')});
  $('#create-account').addEventListener('click',async()=>{if(!form.reportValidity())return;const values=new FormData(form),email=String(values.get('email')??'').trim(),password=String(values.get('password')??'');if(password.length<6){showMessage(`Mot de passe incomplet (${password.length}/6 caractères).`,true);return}setBusy(true);showMessage('Création du compte…');const {data,error}=await client.auth.signUp({email,password});setBusy(false);if(error){showMessage(error.message,true);return}if(data.session){showMessage('Compte créé et connecté.');await loadUser(data.user);dialog.close();toast('Compte créé · synchronisation activée')}else showMessage('Compte créé. Consultez votre e-mail pour confirmer votre adresse.')});
  $('#logout-account').addEventListener('click',async()=>{const {error}=await client.auth.signOut();if(error){showMessage(error.message,true);return}currentUser=null;loadedUserId=null;clearTimeout(saveTimer);setView(null);resetState();dialog.close();toast('Vous êtes déconnecté')});

  client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){currentUser=null;loadedUserId=null;setView(null);resetState();return}if(session?.user)setTimeout(()=>loadUser(session.user),0)});
  loadCommunity();
  client.auth.getSession().then(({data,error})=>{if(error)showMessage(error.message,true);else if(data.session?.user)loadUser(data.session.user);else setView(null)});
}
