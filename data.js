const STATUS_OPTIONS = ["Not Started", "Scheduled", "In Progress", "Completed", "Skipped/NA"];
const STATUS_COLORS = {"Not Started":"status-not-started","Scheduled":"status-scheduled","In Progress":"status-progress","Completed":"status-complete","Skipped/NA":"status-skipped"};
const EXTRA_CHARGE_CATEGORIES = ["Pre-treatment workup","Stimulation medication beyond 15 days","Extra blood test","Extra USG scan","Extra doctor visit","TESA / PESA (Surgical Sperm Retrieval)","Donor Sperm Program","Donor Egg Program","Second / repeat cycle","Embryo storage beyond free period (~3 months)","Other"];
const DEFAULT_PACKAGE_PRICE = 200000;

const MATERNITY_STATUS_OPTIONS = ["Pending","Done","Skipped/NA"];
const MATERNITY_TRIMESTERS = [
  {key:"trimester1", label:"Trimester 1", short:"T1", weeks:"0–12 weeks", bloodCount:13, scanCount:1, packagePrice:15000,
   bloodTests:["FT4","FBS","HbA1C","Blood Grouping","HIV","HBSAG","VDRL","Urine Routine","Urine Culture","HB Electrophoresis","CBC","HCV","THYROID PROFILE"],
   scans:["First Trimester Ultrasound"]},
  {key:"trimester2", label:"Trimester 2", short:"T2", weeks:"13–28 weeks", bloodCount:4, scanCount:3, packagePrice:12000,
   bloodTests:["CBC","Urine Routine","OGCT","Quadtriple Marker / Double Marker"],
   scans:["Anomaly Scan","NT Scan","Additional / Follow-up Scan"],
   scanNote:"The source lists 3 scans but names only Anomaly Scan and NT Scan; the third slot is intentionally left as an additional/follow-up scan."},
  {key:"trimester3", label:"Trimester 3", short:"T3", weeks:"29 weeks until delivery", bloodCount:9, scanCount:2, packagePrice:10000,
   bloodTests:["CBC","THYROID PROFILE","Urine Routine","HBSAG","HIV","HCV","VDRL","PT","APTT"],
   scans:["USG Growth 1","USG Growth 2"]}
];
function maternityRowsForTrimester(t){
  const rows=[];
  t.bloodTests.forEach(name=>rows.push({item:name,type:"Blood Test",included:`Included in ${t.label}`,completedDate:"",status:"Pending",notes:""}));
  t.scans.forEach(name=>rows.push({item:name,type:"Scan",included:`Included in ${t.label}`,completedDate:"",status:"Pending",notes:""}));
  return rows;
}
function blankMaternityTrimesterRows(){const o={};MATERNITY_TRIMESTERS.forEach(t=>o[t.key]=maternityRowsForTrimester(t));return o;}
function normalizeMaternityPatient(p){
  if((p.programType||"IVF")!=="Maternity") return p;
  const old=p.maternity||{};
  const fresh=blankMaternityTrimesterRows();
  MATERNITY_TRIMESTERS.forEach(t=>{
    const oldRows=Array.isArray(old[t.key])?old[t.key]:[];
    // Preserve existing completion/status/date/notes by row position when migrating the earlier numbered version.
    fresh[t.key]=fresh[t.key].map((row,i)=>{
      const prev=oldRows[i]||{};
      return {...row,status:prev.status==="Done"||prev.status==="Completed"?"Done":(prev.status==="Skipped/NA"?"Skipped/NA":"Pending"),completedDate:prev.completedDate||prev.actualDate||"",notes:prev.notes||""};
    });
  });
  p.maternity=fresh;
  return p;
}
function maternityStats(p,key){const a=p.maternity?.[key]||[];const actionable=a.filter(x=>x.type!=="Consultation");const total=actionable.length,completed=actionable.filter(x=>x.status==="Done").length;return {total,completed,pct:total?Math.round(completed/total*100):0};}
function maternityOverallStats(p){let total=0,completed=0;MATERNITY_TRIMESTERS.forEach(t=>{const s=maternityStats(p,t.key);total+=s.total;completed+=s.completed});return {total,completed,pct:total?Math.round(completed/total*100):0};}
function gestationalAge(p){
  if(!p.lmp)return null;
  const start=new Date(p.lmp+"T00:00:00"), now=new Date();
  const days=Math.max(0,Math.floor((now-start)/(24*60*60*1000)));
  return {weeks:Math.floor(days/7),days:days%7,totalDays:days};
}
function currentTrimester(p){const g=gestationalAge(p);if(!g)return "Trimester 1";if(g.totalDays<13*7)return "Trimester 1";if(g.totalDays<29*7)return "Trimester 2";return "Trimester 3";}


const PHASE_TEMPLATE = [
 {key:"stimulation",label:"1. Stimulation Phase",short:"Stimulation",items:[
  ["Stimulation Medication — 15-day course","Gonadotropin injections (Humog + Cetrorelix)","15 days included"],
  ["Blood Monitoring — 2 included","Hormone panel (E2 / LH / Progesterone)","2 blood draws included; extra can be charged"],
  ["USG Monitoring — 4 included","Follicular study scans","4 scans average; extra can be charged"],
  ["Doctor Visits — Stimulation","Review consultation + scan during stimulation","Track each visit"],
  ["Trigger Shot","hCG / Agonist trigger injection","1 injection"],
 ]},
 {key:"retrieval",label:"2. Egg Retrieval & Fertilization",short:"Retrieval",items:[
  ["Egg Retrieval (OPU)","Ovum Pick-Up procedure","1 procedure"],
  ["Anesthesia / Sedation","Conscious sedation / GA for OPU","1 session"],
  ["OT & Day-Care","OT charges + day-care admission for OPU day","1 day"],
  ["Sperm Prep","Semen processing / sperm wash","1 sample"],
  ["Fertilization (ICSI / IVF)","ICSI / IVF","1 cycle"],
  ["Embryology","Embryo culture + blastocyst culture + grading + fresh transfer","1 fresh transfer if applicable"],
 ]},
 {key:"freezing",label:"3. Freezing",short:"Freezing",items:[
  ["Embryo Freezing","Vitrification & freezing; ~3 months free storage from freeze date","As required"],
  ["Sperm Freezing","Only if sperm needs freezing ahead of OPU","If applicable"],
  ["Oocyte Freezing","Only for elective egg-freezing cases","If applicable"],
  ["Free Storage Period","Approx. 3 months from freeze date","Track storage end date"],
 ]},
 {key:"fet",label:"4. Frozen Embryo Transfer (FET) Phase",short:"FET",items:[
  ["Blood Monitoring — 2 included","Hormone panel (E2 / LH / Progesterone) during FET prep","2 blood draws included; extra can be charged"],
  ["USG Monitoring — 5 included","Endometrial thickness + follicular monitoring","5 scans average; extra can be charged"],
  ["Susten Injection — 5-day course","Susten injection course before transfer","5 days included"],
  ["Frozen Embryo Transfer","Frozen Embryo Transfer","1 transfer within 3 months of freeze date"],
 ]},
 {key:"pregnancy",label:"5. Pregnancy Confirmation",short:"Pregnancy",items:[
  ["Beta hCG — Day 14","Beta hCG (Qualitative)","1 test"],
  ["Beta hCG — Quantitative / Repeat","Repeat quantitative test","1 test"],
  ["Post-Transfer Doctor Visits","Post-transfer consultations","2 consultations included"],
 ]}
];
function blankPhaseRows(){const p={}; PHASE_TEMPLATE.forEach(ph=>p[ph.key]=ph.items.map(x=>({item:x[0],details:x[1],included:x[2],plannedDate:"",actualDate:"",status:"Not Started",result:"",notes:""})));return p;}
function blankDailyMedication(name,days){return Array.from({length:days},(_,i)=>({day:i+1,date:"",medication:name,dose:"",unit:"",time:"",administered:false,status:"Not Started",notes:""}));}
function newPatient(info){const now=new Date().toISOString();return {id:uid(),createdAt:now,updatedAt:now,
 programType:info.programType||"IVF",name:info.name||"",uhid:info.uhid||"",age:info.age||"",dob:info.dob||"",partner:info.partner||"",contact:info.contact||"",altContact:info.altContact||"",doctor:info.doctor||"",coordinator:info.coordinator||"",cycleType:info.cycleType||"Fresh IVF",diagnosis:info.diagnosis||"",bloodGroup:info.bloodGroup||"",emergencyContact:info.emergencyContact||"",address:info.address||"",packageStartDate:info.packageStartDate||"",packagePrice:info.packagePrice===""?DEFAULT_PACKAGE_PRICE:Number(info.packagePrice||DEFAULT_PACKAGE_PRICE),lmp:info.lmp||"",edd:info.edd||"",maternityPackage:info.maternityPackage||"Full Maternity",
 phases:blankPhaseRows(), maternity:blankMaternityTrimesterRows(), stimulationMedication:blankDailyMedication("Humog + Cetrorelix",15), fetMedication:blankDailyMedication("Susten",5), monitoring:{stimulationBlood:[],stimulationUSG:[],stimulationVisits:[],fetBlood:[],fetUSG:[],fetVisits:[]}, retrieval:{opuDate:"",eggsRetrieved:"",mii:"",mi:"",gv:"",icsi:"",fertilized:"",day3Embryos:"",blastocysts:"",embryoGrades:"",anesthesia:"",otDaycare:"",spermPrep:"",fertilization:"",freshTransfer:"",notes:""}, freezing:{embryoFrozen:"",spermFrozen:"",oocyteFrozen:"",freezeDate:"",storageEndDate:"",notes:""}, fet:{transferDate:"",endometrialThickness:"",embryosTransferred:"",protocol:"",betaHcgDate:"",betaHcgResult:"",notes:""}, pregnancy:{testDate:"",qualitative:"",quantitative:"",consultation1:"",consultation2:"",notes:""}, extraCharges:[], notes:[]};}
function phaseStats(items){const total=items.length,completed=items.filter(x=>x.status==="Completed").length;return {total,completed,pct:total?Math.round(completed/total*100):0};}
function programStats(p){return (p.programType||"IVF")==="Maternity"?maternityOverallStats(p):overallStats(p);}
function currentProgramStage(p){return (p.programType||"IVF")==="Maternity"?maternityCurrentStage(p):currentStage(p);}
function maternityCurrentStage(p){for(const t of MATERNITY_TRIMESTERS){if(maternityStats(p,t.key).pct<100)return t.label;}return "Completed";}
function overallStats(p){let t=0,c=0;PHASE_TEMPLATE.forEach(ph=>{const s=phaseStats(p.phases?.[ph.key]||[]);t+=s.total;c+=s.completed});return {total:t,completed:c,pct:t?Math.round(c/t*100):0};}
function currentStage(p){for(const ph of PHASE_TEMPLATE){if(phaseStats(p.phases?.[ph.key]||[]).pct<100)return ph.short;}return "Completed";}
function extraTotal(p){return (p.extraCharges||[]).reduce((s,x)=>s+(Number(x.amount)||0),0);}
function dateAdd(date,n){if(!date)return "";const d=new Date(date+"T00:00:00");d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}
