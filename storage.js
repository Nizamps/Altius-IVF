const SUPABASE_TABLE="patients";
let supabaseClient=null;
let saveQueue=Promise.resolve();

function getSupabase(){
  if(supabaseClient)return supabaseClient;
  const cfg=window.SUPABASE_CONFIG||{};
  if(!cfg.url||cfg.url.includes("YOUR-PROJECT-REF")||!cfg.publishableKey||cfg.publishableKey.includes("YOUR_SUPABASE")){
    throw new Error("Supabase is not configured. Open supabase-config.js and add your Project URL and Publishable key.");
  }
  if(!window.supabase?.createClient)throw new Error("Supabase client failed to load. Check your internet connection.");
  supabaseClient=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
  return supabaseClient;
}

async function getCurrentUser(){
  const client=getSupabase();
  const {data,error}=await client.auth.getUser();
  if(error && error.message!="Auth session missing!")throw error;
  return data?.user||null;
}

async function signIn(email,password){
  const {error}=await getSupabase().auth.signInWithPassword({email,password});
  if(error)throw error;
}

async function signOut(){
  const {error}=await getSupabase().auth.signOut();
  if(error)throw error;
}

async function loadPatients(){
  const client=getSupabase();
  const {data,error}=await client.from(SUPABASE_TABLE).select("id,patient_data,created_at,updated_at").order("updated_at",{ascending:false});
  if(error)throw error;
  return (data||[]).map(row=>{
    const p=row.patient_data||{};
    p.id=row.id;
    p.createdAt=p.createdAt||row.created_at;
    p.updatedAt=p.updatedAt||row.updated_at;
    return p;
  });
}

function savePatients(patients){
  const snapshot=JSON.parse(JSON.stringify(patients||[]));
  saveQueue=saveQueue.then(async()=>{
    const client=getSupabase();
    const user=await getCurrentUser();
    if(!user)throw new Error("Your session has expired. Please sign in again.");
    const rows=snapshot.map(p=>({
      id:p.id,
      owner_id:user.id,
      patient_data:p,
      created_at:p.createdAt||new Date().toISOString(),
      updated_at:p.updatedAt||new Date().toISOString()
    }));
    if(!rows.length)return true;
    const {error}=await client.from(SUPABASE_TABLE).upsert(rows,{onConflict:"id"});
    if(error)throw error;
    return true;
  }).catch(error=>{
    console.error("Supabase save failed",error);
    alert(error.message||"Could not save changes to Supabase.");
    return false;
  });
  return saveQueue;
}

function uid(){return "p_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,9)}
