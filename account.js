import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js?v=accounts-4';

const $=selector=>document.querySelector(selector);

export async function initAccountSync({getState,applyState,resetState,registerCloudSave,toast}){
  const dialog=$('#account-dialog'),button=$('#account-button'),label=$('#account-label'),form=$('#account-form'),loggedOut=$('#account-logged-out'),loggedIn=$('#account-logged-in'),configRequired=$('#account-config-required'),message=$('#account-message'),status=$('#sync-status');
  let client=null,currentUser=null,loadedUserId=null,saveTimer=null;
  const configured=/^https:\/\/.+\.supabase\.co\/?$/.test(SUPABASE_URL)&&SUPABASE_ANON_KEY.length>20;
  const showMessage=(value,error=false)=>{message.textContent=value;message.classList.toggle('error',error)};
  const setBusy=busy=>form.querySelectorAll('button,input').forEach(element=>element.disabled=busy);
  const setView=user=>{currentUser=user??null;loggedOut.hidden=Boolean(user)||!configured;loggedIn.hidden=!user;configRequired.hidden=configured;label.textContent=user?(user.email?.split('@')[0]||'Mon compte'):(configured?'Connexion':'Compte');button.classList.toggle('connected',Boolean(user));if(user)$('#account-email').textContent=user.email??''};

  button.addEventListener('click',()=>dialog.showModal());
  if(!configured){setView(null);showMessage('Ajoutez les variables Supabase au dépôt pour activer la synchronisation.');return}

  const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const saveNow=async payload=>{
    if(!currentUser)return;
    status.textContent='Synchronisation en cours…';status.className='sync-status syncing';
    const {error}=await client.from('user_states').upsert({user_id:currentUser.id,state:payload,updated_at:new Date().toISOString()},{onConflict:'user_id'});
    if(error){status.textContent='Échec de synchronisation · nouvel essai au prochain changement';status.className='sync-status error';console.error(error);return}
    status.textContent=`Synchronisé à ${new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(new Date())}`;status.className='sync-status';
  };
  registerCloudSave(payload=>{if(!currentUser)return;clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveNow(payload),600)});

  const loadUser=async user=>{
    setView(user);
    if(!user||loadedUserId===user.id)return;
    loadedUserId=user.id;status.textContent='Récupération de vos données…';
    const {data,error}=await client.from('user_states').select('state').eq('user_id',user.id).maybeSingle();
    if(error){status.textContent='Impossible de récupérer vos données';status.className='sync-status error';showMessage(error.message,true);return}
    if(data?.state)applyState(data.state);else await saveNow(getState());
    status.textContent='Synchronisation à jour';status.className='sync-status';
  };

  form.addEventListener('submit',async event=>{event.preventDefault();const values=new FormData(form),email=String(values.get('email')??'').trim(),password=String(values.get('password')??'');setBusy(true);showMessage('Connexion en cours…');const {data,error}=await client.auth.signInWithPassword({email,password});setBusy(false);if(error){showMessage(error.message,true);return}showMessage('Connexion réussie.');await loadUser(data.user);dialog.close();toast('Compte connecté · données synchronisées')});
  $('#create-account').addEventListener('click',async()=>{if(!form.reportValidity())return;const values=new FormData(form),email=String(values.get('email')??'').trim(),password=String(values.get('password')??'');if(password.length<6){showMessage(`Mot de passe incomplet (${password.length}/6 caractères).`,true);return}setBusy(true);showMessage('Création du compte…');const {data,error}=await client.auth.signUp({email,password});setBusy(false);if(error){showMessage(error.message,true);return}if(data.session){showMessage('Compte créé et connecté.');await loadUser(data.user);dialog.close();toast('Compte créé · synchronisation activée')}else showMessage('Compte créé. Consultez votre e-mail pour confirmer votre adresse.')});
  $('#logout-account').addEventListener('click',async()=>{const {error}=await client.auth.signOut();if(error){showMessage(error.message,true);return}currentUser=null;loadedUserId=null;clearTimeout(saveTimer);setView(null);resetState();dialog.close();toast('Vous êtes déconnecté')});

  client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){currentUser=null;loadedUserId=null;setView(null);resetState();return}if(session?.user)setTimeout(()=>loadUser(session.user),0)});
  client.auth.getSession().then(({data,error})=>{if(error)showMessage(error.message,true);else if(data.session?.user)loadUser(data.session.user);else setView(null)});
}
