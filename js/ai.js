(function(){
  const D = () => window.EquilibrioData;

  function profileSummary(state){
    const p = state.profile || {};
    return [
      `Nombre: ${p.name || 'usuario'}`,
      `Rol: ${p.role || 'sin definir'}`,
      `Objetivo principal: ${p.mainGoal || ''}`,
      `Horario: ${p.dayStart || '08:00'}-${p.dayEnd || '23:00'}`,
      `Energía alta: ${p.energyPattern || 'sin definir'}`,
      `Sueño: ${p.sleepHours || '?'} h`,
      `Entrenamiento: ${p.trainingDays || 3} días/semana`,
      `Deportes: ${(p.sports || []).join(', ')}`,
      `Comida: ${p.foodStyle || ''}`,
      `Finanzas: ${p.financeFocus || ''}`,
      `Hábitos: ${(p.habitsWanted || []).join(', ')}`,
      `Contexto: ${p.contextNotes || ''}`
    ].join('\n');
  }

  async function callOllama(state, system, prompt){
    const settings = state.settings || {};
    const mode = settings.aiMode || 'rules';
    if (mode === 'rules') throw new Error('IA local no configurada. Usando motor de reglas.');

    if (mode === 'proxy') {
      const res = await fetch(settings.proxyEndpoint || '/api/ai', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ system, prompt, model: settings.ollamaModel || 'llama3.2' })
      });
      if (!res.ok) throw new Error('No responde el proxy local de IA');
      const data = await res.json();
      return data.response || data.text || JSON.stringify(data);
    }

    const endpoint = settings.ollamaEndpoint || 'http://localhost:11434/api/generate';
    const res = await fetch(endpoint, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model: settings.ollamaModel || 'llama3.2', prompt: `${system}\n\n${prompt}`, stream:false })
    });
    if (!res.ok) throw new Error('No responde Ollama. Revisa CORS u OLLAMA_ORIGINS.');
    const data = await res.json();
    return data.response || '';
  }

  function safeJSON(text){
    const clean = String(text || '').replace(/```json|```/g,'').trim();
    const first = clean.indexOf('{');
    const last = clean.lastIndexOf('}');
    if (first !== -1 && last !== -1) return JSON.parse(clean.slice(first,last+1));
    return JSON.parse(clean);
  }

  function dailyPlanRules(state){
    const t = D().today();
    const p = state.profile || {};
    const tasks = state.tasks.filter(x => x.date === t && !x.done).slice(0,5);
    const events = state.events.filter(x => x.date === t).slice(0,4);
    const workouts = state.workouts.filter(x => x.date === t).slice(0,3);
    const missingHabits = state.habits.filter(h => !h.days?.[t]).slice(0,4);
    const parts = [];
    parts.push(`Buenos días${p.name ? ', ' + p.name : ''}. Tu objetivo de hoy es mantener equilibrio, no llenar la agenda sin sentido.`);
    if (events.length) parts.push(`Agenda: ${events.map(e => `${e.time || '--:--'} ${e.title}`).join(' · ')}.`);
    if (tasks.length) parts.push(`Prioridad de tareas: empieza por “${tasks[0].title}” y limita el bloque a 45-60 min.`);
    else parts.push('No tienes tareas pendientes para hoy: define una tarea importante y una tarea ligera.');
    if (workouts.length) parts.push(`Entrenamiento: ${workouts.map(w => `${w.time || ''} ${w.title}`).join(' · ')}. Ajusta intensidad según energía y sueño.`);
    else parts.push(`Movimiento: mete al menos 25-35 min de actividad suave o movilidad.`);
    if (missingHabits.length) parts.push(`Hábitos clave: ${missingHabits.map(h => h.name).join(', ')}.`);
    parts.push(`Cierre del día: responde 3 preguntas: qué salió bien, qué te bloqueó y qué harás mañana.`);
    return parts.join('\n\n');
  }

  function taskIdeasRules(state){
    const t = D().today();
    const p = state.profile || {};
    const role = (p.role || '').toLowerCase();
    const base = [
      {title:'Revisar calendario y elegir 3 prioridades', area:'Productividad', priority:'Alta'},
      {title:'Bloque de foco sin móvil de 45 minutos', area:'Productividad', priority:'Alta'},
      {title:'Preparar comida o merienda equilibrada', area:'Comida', priority:'Media'},
      {title:'Registrar gasto importante del día', area:'Economía', priority:'Media'},
      {title:'Reflexión final de 3 minutos', area:'Reflexión', priority:'Media'}
    ];
    if (role.includes('estudiante') || role.includes('universidad')) base.splice(1,0,{title:'Repasar apuntes o avanzar entrega pendiente', area:'Estudio', priority:'Alta'});
    if ((p.mainGoal||'').toLowerCase().includes('deporte')) base.push({title:'Preparar ropa/material de entrenamiento', area:'Deporte', priority:'Media'});
    return base.map(x => ({id:D().uid('task'), date:t, done:false, notes:'Creada por asistente local', ...x}));
  }

  function sportWeekRules(state){
    const p = state.profile || {};
    const start = D().mondayOf();
    const sports = p.sports?.length ? p.sports : ['Gimnasio','Running'];
    const days = Math.max(2, Math.min(6, Number(p.trainingDays || 3)));
    const schedule = [];
    const templates = {
      'Gimnasio': {title:'Gimnasio · Fuerza base', duration:45, intensity:'Media', plan:'Sentadilla o prensa 3x8 · Empuje 3x8 · Tirón 3x10 · Core 3 rondas'},
      'Running': {title:'Running · Suave Z2', duration:35, intensity:'Suave', plan:'10 min calentamiento · 20 min Z2 · 5 min vuelta a la calma'},
      'Bici': {title:'Bici · Rodaje aeróbico', duration:55, intensity:'Suave', plan:'Rodaje constante Z2. Cadencia cómoda y sin apretar al final.'},
      'Pádel': {title:'Pádel · Partido/técnica', duration:60, intensity:'Media', plan:'Calentamiento hombro · juego táctico · movilidad después'},
      'Natación': {title:'Natación · Técnica suave', duration:35, intensity:'Suave', plan:'200m suave · técnica · series cortas · soltar'},
      'Hyrox': {title:'Hyrox · Circuito controlado', duration:50, intensity:'Alta', plan:'Carrera suave + estaciones funcionales. No buscar fallo muscular.'},
      'Yoga/Pilates': {title:'Movilidad · Pilates/Yoga', duration:35, intensity:'Suave', plan:'Movilidad cadera/espalda · respiración · core controlado'}
    };
    const dayIndexes = days <= 3 ? [0,2,4] : days === 4 ? [0,1,3,5] : days === 5 ? [0,1,2,4,5] : [0,1,2,3,4,5];
    dayIndexes.slice(0,days).forEach((idx, i) => {
      const sport = sports[i % sports.length];
      const tpl = templates[sport] || templates['Gimnasio'];
      schedule.push({
        id:D().uid('work'), date:D().addDays(start, idx), time: i % 2 === 0 ? '18:30' : '08:00', sport,
        done:false, notes:'Generado con reglas locales a partir de tu perfil', ...tpl
      });
    });
    return schedule;
  }

  function mealIdeaRules(state){
    const p = state.profile || {};
    const style = (p.foodStyle || '').toLowerCase();
    if (style.includes('veget')) return 'Idea rápida: bowl de arroz, garbanzos, verduras salteadas, aguacate y yogur/queso fresco para proteína extra.';
    if (style.includes('prote')) return 'Idea rápida: tortilla de 2 huevos con pavo, ensalada grande, patata o arroz y fruta. Sencillo, alto en proteína y fácil de registrar.';
    return 'Idea rápida: plato equilibrado con 1/2 verduras, 1/4 proteína, 1/4 carbohidrato y una grasa saludable. Ejemplo: pollo, arroz, ensalada y aceite de oliva.';
  }

  function reflectionPromptRules(state){
    const p = state.profile || {};
    return `Cierre del día para ${p.name || 'ti'}:\n1) ¿Qué acción pequeña ha acercado tu día a tu objetivo principal?\n2) ¿Qué te ha quitado más energía y cómo lo reducirías mañana?\n3) ¿Cuál es la primera acción concreta de mañana?`;
  }

  async function generateText(state, kind, prompt=''){
    const system = `Eres un asistente personal para una app llamada Equilibrio. Usa un tono claro, práctico y breve. Perfil del usuario:\n${profileSummary(state)}`;
    const taskPrompt = `${prompt}\n\nTipo de petición: ${kind}. Devuelve una respuesta accionable en español.`;
    try { return await callOllama(state, system, taskPrompt); }
    catch { 
      if (kind === 'daily') return dailyPlanRules(state);
      if (kind === 'meal') return mealIdeaRules(state);
      if (kind === 'reflection') return reflectionPromptRules(state);
      return dailyPlanRules(state);
    }
  }

  async function generateTasks(state){
    if ((state.settings || {}).aiMode === 'rules') return taskIdeasRules(state);
    const system = `Genera tareas para una app de productividad. Responde SOLO JSON válido con la forma {"tasks":[{"title":"...","area":"Productividad|Estudio|Deporte|Comida|Economía|Reflexión","priority":"Alta|Media|Baja","notes":"..."}]}. Perfil:\n${profileSummary(state)}`;
    try {
      const text = await callOllama(state, system, 'Crea 5 tareas útiles para hoy.');
      const parsed = safeJSON(text);
      return (parsed.tasks || []).slice(0,8).map(x => ({id:D().uid('task'), date:D().today(), done:false, ...x}));
    } catch { return taskIdeasRules(state); }
  }

  async function generateSportWeek(state){
    if ((state.settings || {}).aiMode === 'rules') return sportWeekRules(state);
    const start = D().mondayOf();
    const system = `Genera un planning semanal deportivo. Responde SOLO JSON válido con {"workouts":[{"date":"YYYY-MM-DD","time":"HH:MM","sport":"Gimnasio|Running|Bici|Pádel|Natación|Hyrox|Yoga/Pilates","title":"...","duration":45,"intensity":"Suave|Media|Alta","plan":"...","notes":"..."}]}. Semana empieza ${start}. Perfil:\n${profileSummary(state)}`;
    try {
      const text = await callOllama(state, system, 'Crea un planning equilibrado para esta semana.');
      const parsed = safeJSON(text);
      return (parsed.workouts || []).slice(0,10).map(x => ({id:D().uid('work'), done:false, ...x}));
    } catch { return sportWeekRules(state); }
  }

  window.EquilibrioAI = { generateText, generateTasks, generateSportWeek, mealIdeaRules, reflectionPromptRules, profileSummary };
})();
