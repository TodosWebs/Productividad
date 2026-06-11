(function(){
  const STORE_KEY = 'equilibrio_app_v1';

  const today = () => new Date().toISOString().slice(0,10);
  const uid = (prefix='id') => prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7);
  const addDays = (date, days) => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0,10);
  };
  const mondayOf = (dateStr=today()) => {
    const d = new Date(dateStr + 'T12:00:00');
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return d.toISOString().slice(0,10);
  };
  const formatDate = (dateStr, opts={weekday:'long', day:'numeric', month:'long'}) => {
    try { return new Intl.DateTimeFormat('es-ES', opts).format(new Date(dateStr + 'T12:00:00')); }
    catch { return dateStr; }
  };
  const eur = n => Number(n || 0).toLocaleString('es-ES',{style:'currency',currency:'EUR'});

  function defaultState(){
    const t = today();
    return {
      version: 1,
      onboardingDone: false,
      profile: {
        name: '',
        role: '',
        mainGoal: 'Equilibrar productividad, deporte y bienestar',
        dayStart: '08:00',
        dayEnd: '23:00',
        energyPattern: 'Mañana',
        sleepHours: 7,
        trainingDays: 3,
        sports: ['Gimnasio','Running'],
        foodStyle: 'Sencillo y equilibrado',
        financeFocus: 'Controlar gastos y ahorrar',
        habitsWanted: ['Beber agua','Caminar','Leer 10 min'],
        contextNotes: ''
      },
      settings: {
        aiMode: 'rules',
        ollamaEndpoint: 'http://localhost:11434/api/generate',
        ollamaModel: 'llama3.2',
        proxyEndpoint: '/api/ai',
        reminderTime: '21:30',
        notifications: false,
        lastReminderDate: ''
      },
      tasks: [
        {id:uid('task'), title:'Revisar agenda del día', area:'Productividad', priority:'Alta', date:t, done:false, notes:'Primera tarea de ejemplo'},
        {id:uid('task'), title:'Cerrar el día con una reflexión breve', area:'Reflexión', priority:'Media', date:t, done:false, notes:''}
      ],
      events: [
        {id:uid('event'), title:'Bloque de foco', type:'Trabajo/estudio', date:t, time:'10:00', duration:90, notes:'Sin móvil y con objetivo claro'}
      ],
      workouts: [
        {id:uid('work'), title:'Gimnasio · Full body', sport:'Gimnasio', date:t, time:'18:00', duration:45, intensity:'Media', done:false, plan:'Sentadilla 3x8 · Press 3x8 · Remo 3x10 · Core 3 rondas', notes:'Sesión base de ejemplo'}
      ],
      habits: [
        {id:uid('habit'), name:'Beber 2L de agua', category:'Salud', target:'Diario', days:{}},
        {id:uid('habit'), name:'Moverme 30 min', category:'Actividad', target:'Diario', days:{}},
        {id:uid('habit'), name:'Planificar mañana', category:'Productividad', target:'Diario', days:{}}
      ],
      meals: [
        {id:uid('meal'), date:t, type:'Comida', name:'Plato equilibrado', kcal:650, protein:35, notes:'Ejemplo editable'}
      ],
      reflections: {},
      finance: {
        accounts: [
          {id:uid('acc'), name:'Cuenta principal', type:'Banco', balance:0},
          {id:uid('acc'), name:'Ahorro', type:'Ahorro', balance:0}
        ],
        transactions: [],
        goals: [{id:uid('goal'), name:'Fondo de emergencia', target:3000, current:0}]
      }
    };
  }

  function mergeDefaults(state){
    const base = defaultState();
    const merged = Object.assign(base, state || {});
    merged.profile = Object.assign(base.profile, (state||{}).profile || {});
    merged.settings = Object.assign(base.settings, (state||{}).settings || {});
    merged.finance = Object.assign(base.finance, (state||{}).finance || {});
    for (const key of ['tasks','events','workouts','habits','meals']) if (!Array.isArray(merged[key])) merged[key] = [];
    if (!merged.reflections || typeof merged.reflections !== 'object') merged.reflections = {};
    if (!Array.isArray(merged.finance.accounts)) merged.finance.accounts = [];
    if (!Array.isArray(merged.finance.transactions)) merged.finance.transactions = [];
    if (!Array.isArray(merged.finance.goals)) merged.finance.goals = [];
    return merged;
  }

  function load(){
    try{
      const raw = localStorage.getItem(STORE_KEY);
      return mergeDefaults(raw ? JSON.parse(raw) : defaultState());
    } catch(err){
      console.warn('No se pudo cargar el estado', err);
      return defaultState();
    }
  }
  function save(state){
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }
  function reset(){
    const s = defaultState();
    save(s);
    return s;
  }

  function download(filename, data){
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importFile(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try { resolve(mergeDefaults(JSON.parse(e.target.result))); }
        catch(err){ reject(err); }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  window.EquilibrioData = { STORE_KEY, defaultState, load, save, reset, download, importFile, today, uid, addDays, mondayOf, formatDate, eur };
})();
