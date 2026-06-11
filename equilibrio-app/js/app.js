(function(){
  const Data = window.EquilibrioData;
  const AI = window.EquilibrioAI;
  let S = Data.load();
  let currentView = 'dashboard';
  let selectedDate = Data.today();
  let calCursor = new Date(selectedDate + 'T12:00:00');
  let taskFilter = 'Todas';

  const NAV = [
    ['dashboard','🏠','Inicio','Hoy'],
    ['calendar','📅','Agenda','Plan'],
    ['tasks','✅','Tareas','To-do'],
    ['sport','🏋️','Deporte','Train'],
    ['habits','🌱','Hábitos','Daily'],
    ['food','🍽️','Comida','Fuel'],
    ['reflection','🧘','Reflexión','Mind'],
    ['finance','💶','Economía','Money'],
    ['profile','👤','Perfil','Setup']
  ];

  const TITLES = {
    dashboard:['Dashboard','Resumen de hoy con agenda, tareas, hábitos, comida, deporte y reflexión.'],
    calendar:['Agenda','Calendario global para eventos, entrenamientos y tareas importantes.'],
    tasks:['Tareas','Crea, organiza y prioriza tareas. La IA puede proponerte tareas según tu perfil.'],
    sport:['Deporte','Planifica entrenamientos, registra sesiones y genera una semana equilibrada.'],
    habits:['Hábitos','Control diario, rachas y seguimiento simple de hábitos.'],
    food:['Comida','Registro rápido de comidas y objetivo nutricional básico.'],
    reflection:['Reflexión','Cierre del día para entender energía, bloqueos y próximos pasos.'],
    finance:['Economía personal','Cuentas, gastos, ingresos y metas de ahorro.'],
    profile:['Perfil e IA','Preguntas iniciales, configuración de IA, notificaciones y backup.']
  };

  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function save(){ Data.save(S); showToast('Guardado'); }
  function saveQuiet(){ Data.save(S); }
  function dateKeyFromDate(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function todayItems(){
    const t = Data.today();
    return {
      tasks:S.tasks.filter(x=>x.date===t),
      events:S.events.filter(x=>x.date===t),
      workouts:S.workouts.filter(x=>x.date===t),
      meals:S.meals.filter(x=>x.date===t),
      reflection:S.reflections[t]
    };
  }
  function badge(text, cls=''){ return `<span class="badge ${cls}">${esc(text)}</span>`; }
  function priorityClass(p){ return p === 'Alta' ? 'red' : p === 'Media' ? 'orange' : 'green'; }

  function init(){
    renderNav();
    showView(currentView, false);
    if(!S.onboardingDone) openOnboarding(false);
    setupNotifications();
    if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
  }

  function renderNav(){
    const html = NAV.map(([id,icon,label,small]) => `<button class="nav-btn ${id===currentView?'active':''}" onclick="App.showView('${id}')"><span class="icon">${icon}</span><span>${label}</span><small>${small}</small></button>`).join('');
    $('desktopNav').innerHTML = html;
    $('mobileNav').innerHTML = NAV.slice(0,7).map(([id,icon,label]) => `<button class="nav-btn ${id===currentView?'active':''}" onclick="App.showView('${id}')"><span class="icon">${icon}</span><span>${label}</span></button>`).join('');
  }

  function showView(view, shouldRender=true){
    currentView = view;
    const [title, sub] = TITLES[view] || TITLES.dashboard;
    $('pageTitle').textContent = title;
    $('pageSub').textContent = sub;
    $('topEyebrow').textContent = S.profile.name ? `${S.profile.name}, tu día en equilibrio` : 'Tu día, en equilibrio';
    renderNav();
    if(shouldRender) render(); else render();
  }

  function render(){
    const map = {
      dashboard: renderDashboard,
      calendar: renderCalendar,
      tasks: renderTasks,
      sport: renderSport,
      habits: renderHabits,
      food: renderFood,
      reflection: renderReflection,
      finance: renderFinance,
      profile: renderProfile
    };
    $('view').innerHTML = (map[currentView] || renderDashboard)();
  }

  function renderDashboard(){
    const t = Data.today();
    const items = todayItems();
    const pendingTasks = items.tasks.filter(x=>!x.done).length;
    const habitsDone = S.habits.filter(h=>h.days?.[t]).length;
    const kcal = items.meals.reduce((a,m)=>a+Number(m.kcal||0),0);
    const protein = items.meals.reduce((a,m)=>a+Number(m.protein||0),0);
    const checkedReflection = !!items.reflection;
    const timeline = [
      ...items.events.map(e=>({kind:'Evento', icon:'📅', title:e.title, meta:`${e.time||'--:--'} · ${e.type || 'Agenda'} · ${e.duration || 30} min`, done:false})),
      ...items.workouts.map(w=>({kind:'Deporte', icon:'🏋️', title:w.title, meta:`${w.time||'--:--'} · ${w.sport} · ${w.duration || 45} min · ${w.intensity || 'Media'}`, done:w.done})),
      ...items.tasks.map(x=>({kind:'Tarea', icon:'✅', title:x.title, meta:`${x.area} · ${x.priority}`, done:x.done}))
    ].sort((a,b)=>String(a.meta).localeCompare(String(b.meta)));

    return `
      <div class="grid grid-4">
        <div class="card kpi" style="--accent:#dbeafe;--accent-text:var(--blue)"><div class="kpi-label">Tareas pendientes</div><div class="kpi-value">${pendingTasks}</div><div class="kpi-sub">${items.tasks.length} tareas para hoy</div></div>
        <div class="card kpi" style="--accent:#d1fae5;--accent-text:var(--green)"><div class="kpi-label">Hábitos completados</div><div class="kpi-value">${habitsDone}/${S.habits.length}</div><div class="kpi-sub">Control diario de hábitos</div></div>
        <div class="card kpi" style="--accent:#ede9fe;--accent-text:var(--purple)"><div class="kpi-label">Entrenos hoy</div><div class="kpi-value">${items.workouts.length}</div><div class="kpi-sub">${items.workouts[0]?.title || 'Sin sesión prevista'}</div></div>
        <div class="card kpi" style="--accent:#fff7ed;--accent-text:var(--orange)"><div class="kpi-label">Comida registrada</div><div class="kpi-value">${kcal}<span style="font-size:16px"> kcal</span></div><div class="kpi-sub">${protein} g proteína · ${checkedReflection?'reflexión hecha':'sin cierre del día'}</div></div>
      </div>

      <div class="layout-2" style="margin-top:16px">
        <section class="card">
          <div class="card-title"><div><h2>Hoy</h2><p>${Data.formatDate(t,{weekday:'long', day:'numeric', month:'long', year:'numeric'})}</p></div><button class="soft-btn" onclick="App.showView('calendar')">Ver agenda</button></div>
          <div class="timeline">
            ${timeline.length ? timeline.map(x=>`
              <div class="item ${x.done?'done':''}"><div class="item-icon">${x.icon}</div><div class="item-main"><div class="item-title">${esc(x.title)}</div><div class="item-meta">${esc(x.kind)} · ${esc(x.meta)}</div></div></div>
            `).join('') : `<div class="empty"><strong>Hoy está limpio.</strong><br>Añade una tarea, un evento o deja que la IA te proponga un plan realista.</div>`}
          </div>
        </section>
        <aside class="grid">
          <div class="ai-box">
            <div class="label">Asistente IA</div>
            <h2 style="margin:8px 0 8px">Plan inteligente del día</h2>
            <p class="small muted">Usa las preguntas iniciales, tus tareas, eventos, hábitos y entrenamientos para proponerte un día equilibrado.</p>
            <button class="primary-btn full" style="margin-top:14px" onclick="App.generateDailyPlan()">✨ Generar plan</button>
            <div id="dailyAiResult" class="ai-response" style="display:none"></div>
          </div>
          <div class="card flat">
            <div class="card-title"><div><h2>Cierre del día</h2><p>Recordatorio configurado a las ${esc(S.settings.reminderTime)}</p></div></div>
            <button class="soft-btn full" onclick="App.showView('reflection')">🧘 Hacer reflexión</button>
          </div>
        </aside>
      </div>`;
  }

  function renderCalendar(){
    const y = calCursor.getFullYear();
    const m = calCursor.getMonth();
    const monthTitle = new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'}).format(calCursor);
    const first = new Date(y,m,1);
    const startOffset = (first.getDay() + 6) % 7;
    const start = new Date(y,m,1-startOffset);
    const days = [];
    for(let i=0;i<42;i++){
      const d = new Date(start); d.setDate(start.getDate()+i);
      const key = dateKeyFromDate(d);
      days.push({date:d,key,other:d.getMonth()!==m});
    }
    const selected = collectDate(selectedDate);
    return `
      <div class="calendar-wrap">
        <section class="card cal-card">
          <div class="cal-head">
            <button class="soft-btn" onclick="App.moveMonth(-1)">‹</button>
            <div class="cal-title">${monthTitle}</div>
            <div style="display:flex;gap:8px"><button class="soft-btn" onclick="App.goToday()">Hoy</button><button class="soft-btn" onclick="App.moveMonth(1)">›</button></div>
          </div>
          <div class="cal-grid">
            ${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=>`<div class="day-name">${d}</div>`).join('')}
            ${days.map(d=>{
              const c = collectDate(d.key);
              const minis = [...c.events.map(x=>'📅 '+x.title), ...c.workouts.map(x=>'🏋️ '+x.title), ...c.tasks.map(x=>'✅ '+x.title)].slice(0,3);
              return `<button class="cal-day ${d.other?'other':''} ${d.key===Data.today()?'today':''} ${d.key===selectedDate?'selected':''}" onclick="App.selectDate('${d.key}')">
                <div class="cal-date">${d.date.getDate()}</div>${minis.map(x=>`<div class="cal-mini">${esc(x)}</div>`).join('')}
              </button>`;
            }).join('')}
          </div>
        </section>
        <aside class="card">
          <div class="card-title"><div><h2>${Data.formatDate(selectedDate,{weekday:'long',day:'numeric',month:'long'})}</h2><p>${selected.events.length + selected.workouts.length + selected.tasks.length} elementos</p></div></div>
          <div class="tabs"><button class="tab-chip" onclick="App.openEventModal()">+ Evento</button><button class="tab-chip" onclick="App.openTaskModal('${selectedDate}')">+ Tarea</button><button class="tab-chip" onclick="App.openWorkoutModal('${selectedDate}')">+ Entreno</button></div>
          <div class="timeline">
            ${[...selected.events.map(e=>dateItem('📅',e.title,`${e.time||'--:--'} · ${e.type||'Evento'} · ${e.duration||30} min`, `App.deleteItem('events','${e.id}')`)), ...selected.workouts.map(w=>dateItem('🏋️',w.title,`${w.time||'--:--'} · ${w.sport} · ${w.duration||45} min`, `App.toggleDone('workouts','${w.id}')`, w.done)), ...selected.tasks.map(t=>dateItem('✅',t.title,`${t.area} · ${t.priority}`, `App.toggleDone('tasks','${t.id}')`, t.done))].join('') || '<div class="empty">No hay nada para este día.</div>'}
          </div>
        </aside>
      </div>`;
  }

  function collectDate(date){
    return {events:S.events.filter(x=>x.date===date).sort((a,b)=>String(a.time).localeCompare(String(b.time))), workouts:S.workouts.filter(x=>x.date===date).sort((a,b)=>String(a.time).localeCompare(String(b.time))), tasks:S.tasks.filter(x=>x.date===date)};
  }
  function dateItem(icon,title,meta,action,done=false){
    return `<div class="item ${done?'done':''}"><div class="item-icon">${icon}</div><div class="item-main"><div class="item-title">${esc(title)}</div><div class="item-meta">${esc(meta)}</div></div><div class="item-actions"><button class="tiny-btn" onclick="${action}">${done?'↺':'✓'}</button></div></div>`;
  }

  function renderTasks(){
    const areas = ['Todas',...Array.from(new Set(S.tasks.map(t=>t.area || 'General')))].filter(Boolean);
    const filtered = taskFilter==='Todas' ? S.tasks : S.tasks.filter(t=>t.area===taskFilter);
    const done = S.tasks.filter(t=>t.done).length;
    return `
      <div class="grid grid-3">
        <div class="card kpi" style="--accent:#dbeafe;--accent-text:var(--blue)"><div class="kpi-label">Total</div><div class="kpi-value">${S.tasks.length}</div><div class="kpi-sub">tareas registradas</div></div>
        <div class="card kpi" style="--accent:#d1fae5;--accent-text:var(--green)"><div class="kpi-label">Completadas</div><div class="kpi-value">${done}</div><div class="kpi-sub">${S.tasks.length?Math.round(done/S.tasks.length*100):0}% completado</div></div>
        <div class="card kpi" style="--accent:#fff7ed;--accent-text:var(--orange)"><div class="kpi-label">Para hoy</div><div class="kpi-value">${S.tasks.filter(t=>t.date===Data.today()&&!t.done).length}</div><div class="kpi-sub">pendientes de hoy</div></div>
      </div>
      <div class="layout-2" style="margin-top:16px">
        <section class="card">
          <div class="card-title"><div><h2>Lista de tareas</h2><p>Filtra por área y marca lo completado.</p></div><button class="primary-btn" onclick="App.generateTasks()">✨ Crear con IA</button></div>
          <div class="tabs">${areas.map(a=>`<button class="tab-chip ${a===taskFilter?'active':''}" onclick="App.setTaskFilter('${esc(a)}')">${esc(a)}</button>`).join('')}</div>
          <div class="timeline">${filtered.length?filtered.sort((a,b)=>String(a.done).localeCompare(String(b.done)) || String(a.date).localeCompare(String(b.date))).map(t=>taskCard(t)).join(''):'<div class="empty">Sin tareas en este filtro.</div>'}</div>
        </section>
        <aside class="card">
          <div class="card-title"><div><h2>Nueva tarea</h2><p>Crea una tarea rápida.</p></div></div>
          ${taskFormHTML()}
        </aside>
      </div>`;
  }
  function taskCard(t){
    return `<div class="item ${t.done?'done':''}"><div class="item-icon">${t.done?'✅':'⬜'}</div><div class="item-main"><div class="item-title">${esc(t.title)}</div><div class="item-meta">${esc(t.date)} · ${badge(t.area||'General','blue')} ${badge(t.priority||'Media',priorityClass(t.priority))} ${t.notes?`<br>${esc(t.notes)}`:''}</div></div><div class="item-actions"><button class="tiny-btn" onclick="App.toggleDone('tasks','${t.id}')">${t.done?'Reabrir':'Hecha'}</button><button class="tiny-btn" onclick="App.deleteItem('tasks','${t.id}')">🗑</button></div></div>`;
  }
  function taskFormHTML(date=Data.today()){
    return `<form class="form" onsubmit="App.saveTask(event)">
      <div class="field"><label>Título</label><input name="title" required placeholder="Ej: preparar presentación"></div>
      <div class="form-row"><div class="field"><label>Fecha</label><input name="date" type="date" value="${date}" required></div><div class="field"><label>Prioridad</label><select name="priority"><option>Alta</option><option selected>Media</option><option>Baja</option></select></div></div>
      <div class="form-row"><div class="field"><label>Área</label><select name="area"><option>Productividad</option><option>Estudio</option><option>Trabajo</option><option>Deporte</option><option>Comida</option><option>Economía</option><option>Reflexión</option></select></div><div class="field"><label>Notas</label><input name="notes" placeholder="Opcional"></div></div>
      <button class="primary-btn full">Guardar tarea</button>
    </form>`;
  }

  function renderSport(){
    const thisWeek = S.workouts.filter(w=>w.date>=Data.mondayOf() && w.date<=Data.addDays(Data.mondayOf(),6));
    const done = S.workouts.filter(w=>w.done).length;
    return `
      <div class="grid grid-4">
        <div class="card kpi" style="--accent:#ede9fe;--accent-text:var(--purple)"><div class="kpi-label">Sesiones</div><div class="kpi-value">${S.workouts.length}</div><div class="kpi-sub">registradas</div></div>
        <div class="card kpi" style="--accent:#d1fae5;--accent-text:var(--green)"><div class="kpi-label">Hechas</div><div class="kpi-value">${done}</div><div class="kpi-sub">cumplimiento total</div></div>
        <div class="card kpi" style="--accent:#fff7ed;--accent-text:var(--orange)"><div class="kpi-label">Esta semana</div><div class="kpi-value">${thisWeek.length}</div><div class="kpi-sub">planificadas</div></div>
        <div class="card kpi" style="--accent:#dbeafe;--accent-text:var(--blue)"><div class="kpi-label">Objetivo perfil</div><div class="kpi-value">${S.profile.trainingDays || 3}</div><div class="kpi-sub">días/semana</div></div>
      </div>
      <div class="layout-2" style="margin-top:16px">
        <section class="card">
          <div class="card-title"><div><h2>Plan deportivo</h2><p>Sesiones próximas y pasadas.</p></div><button class="primary-btn" onclick="App.generateSportWeek()">✨ Planning IA semanal</button></div>
          <div class="timeline">${S.workouts.sort((a,b)=>String(a.date+a.time).localeCompare(String(b.date+b.time))).map(w=>workoutCard(w)).join('') || '<div class="empty">Aún no hay entrenamientos.</div>'}</div>
        </section>
        <aside class="card">
          <div class="card-title"><div><h2>Nuevo entrenamiento</h2><p>Registra una sesión manual.</p></div></div>
          ${workoutFormHTML(Data.today())}
        </aside>
      </div>`;
  }
  function workoutCard(w){
    return `<div class="item ${w.done?'done':''}"><div class="item-icon">${sportIcon(w.sport)}</div><div class="item-main"><div class="item-title">${esc(w.title)}</div><div class="item-meta">${esc(w.date)} · ${esc(w.time||'--:--')} · ${esc(w.sport)} · ${esc(w.duration||45)} min · ${badge(w.intensity||'Media', w.intensity==='Alta'?'red':w.intensity==='Suave'?'green':'orange')}<br>${esc(w.plan||'')}</div></div><div class="item-actions"><button class="tiny-btn" onclick="App.toggleDone('workouts','${w.id}')">${w.done?'↺':'✓'}</button><button class="tiny-btn" onclick="App.deleteItem('workouts','${w.id}')">🗑</button></div></div>`;
  }
  function sportIcon(s){ return {'Gimnasio':'🏋️','Running':'🏃','Bici':'🚴','Pádel':'🎾','Natación':'🏊','Hyrox':'⚡','Yoga/Pilates':'🧘'}[s] || '🏋️'; }
  function workoutFormHTML(date=Data.today()){
    return `<form class="form" onsubmit="App.saveWorkout(event)">
      <div class="field"><label>Título</label><input name="title" required placeholder="Ej: tren superior, Z2, pádel..."></div>
      <div class="form-row"><div class="field"><label>Deporte</label><select name="sport"><option>Gimnasio</option><option>Running</option><option>Bici</option><option>Pádel</option><option>Natación</option><option>Hyrox</option><option>Yoga/Pilates</option></select></div><div class="field"><label>Fecha</label><input name="date" type="date" value="${date}" required></div></div>
      <div class="form-row"><div class="field"><label>Hora</label><input name="time" type="time" value="18:00"></div><div class="field"><label>Duración</label><input name="duration" type="number" value="45"></div></div>
      <div class="field"><label>Intensidad</label><select name="intensity"><option>Suave</option><option selected>Media</option><option>Alta</option></select></div>
      <div class="field"><label>Plan</label><textarea name="plan" placeholder="Ejercicios, series, zonas, objetivo..."></textarea></div>
      <div class="field"><label>Notas</label><input name="notes" placeholder="Opcional"></div>
      <button class="primary-btn full">Guardar entrenamiento</button>
    </form>`;
  }

  function renderHabits(){
    const t = selectedDate || Data.today();
    const done = S.habits.filter(h=>h.days?.[t]).length;
    return `
      <div class="layout-2">
        <section class="card">
          <div class="card-title"><div><h2>Control diario</h2><p>${Data.formatDate(t,{weekday:'long',day:'numeric',month:'long'})} · ${done}/${S.habits.length} completados</p></div><input style="max-width:180px" type="date" value="${t}" onchange="App.setSelectedDate(this.value)"></div>
          <div class="progress" style="margin-bottom:16px"><div style="width:${S.habits.length?done/S.habits.length*100:0}%"></div></div>
          <div class="habit-grid">${S.habits.map(h=>habitCard(h,t)).join('') || '<div class="empty">Crea tus primeros hábitos.</div>'}</div>
        </section>
        <aside class="card">
          <div class="card-title"><div><h2>Nuevo hábito</h2><p>Simple, medible y diario.</p></div></div>
          <form class="form" onsubmit="App.saveHabit(event)"><div class="field"><label>Nombre</label><input name="name" required placeholder="Ej: leer 10 minutos"></div><div class="field"><label>Categoría</label><select name="category"><option>Salud</option><option>Actividad</option><option>Productividad</option><option>Mental</option><option>Comida</option></select></div><button class="primary-btn full">Crear hábito</button></form>
        </aside>
      </div>`;
  }
  function habitCard(h,date){
    const last7 = Array.from({length:7},(_,i)=>Data.addDays(date, i-6));
    const isDone = !!h.days?.[date];
    return `<div class="habit-card"><div><div class="item-title">${esc(h.name)}</div><div class="item-meta">${esc(h.category)} · racha ${habitStreak(h)} días</div></div><div class="week-dots">${last7.map(d=>`<span class="week-dot ${h.days?.[d]?'done':''}" title="${d}"></span>`).join('')}</div><button class="habit-toggle ${isDone?'done':''}" onclick="App.toggleHabit('${h.id}','${date}')">${isDone?'✓ Completado':'Marcar hoy'}</button><button class="tiny-btn" onclick="App.deleteItem('habits','${h.id}')">Eliminar</button></div>`;
  }
  function habitStreak(h){ let count=0; for(let d=Data.today(); h.days?.[d]; d=Data.addDays(d,-1)) count++; return count; }

  function renderFood(){
    const t = selectedDate || Data.today();
    const meals = S.meals.filter(m=>m.date===t);
    const kcal = meals.reduce((a,m)=>a+Number(m.kcal||0),0);
    const protein = meals.reduce((a,m)=>a+Number(m.protein||0),0);
    return `
      <div class="grid grid-3">
        <div class="card kpi" style="--accent:#fff7ed;--accent-text:var(--orange)"><div class="kpi-label">Kcal</div><div class="kpi-value">${kcal}</div><div class="kpi-sub">registradas el día seleccionado</div></div>
        <div class="card kpi" style="--accent:#d1fae5;--accent-text:var(--green)"><div class="kpi-label">Proteína</div><div class="kpi-value">${protein}<span style="font-size:16px"> g</span></div><div class="kpi-sub">aproximado</div></div>
        <div class="card kpi" style="--accent:#dbeafe;--accent-text:var(--blue)"><div class="kpi-label">Comidas</div><div class="kpi-value">${meals.length}</div><div class="kpi-sub">registradas</div></div>
      </div>
      <div class="layout-2" style="margin-top:16px">
        <section class="card">
          <div class="card-title"><div><h2>Diario de comida</h2><p><input type="date" value="${t}" onchange="App.setSelectedDate(this.value)"></p></div><button class="primary-btn" onclick="App.generateMealIdea()">✨ Idea IA</button></div>
          <div id="mealIdea" class="ai-response" style="display:none"></div>
          <div class="timeline" style="margin-top:12px">${meals.map(m=>`<div class="item"><div class="item-icon">🍽️</div><div class="item-main"><div class="item-title">${esc(m.type)} · ${esc(m.name)}</div><div class="item-meta">${m.kcal||0} kcal · ${m.protein||0} g proteína ${m.notes?`<br>${esc(m.notes)}`:''}</div></div><button class="tiny-btn" onclick="App.deleteItem('meals','${m.id}')">🗑</button></div>`).join('') || '<div class="empty">No hay comidas registradas en este día.</div>'}</div>
        </section>
        <aside class="card">
          <div class="card-title"><div><h2>Nueva comida</h2><p>Registro rápido.</p></div></div>
          <form class="form" onsubmit="App.saveMeal(event)"><div class="field"><label>Fecha</label><input name="date" type="date" value="${t}"></div><div class="field"><label>Tipo</label><select name="type"><option>Desayuno</option><option>Comida</option><option>Merienda</option><option>Cena</option><option>Snack</option></select></div><div class="field"><label>Nombre</label><input name="name" required placeholder="Ej: tortilla + ensalada"></div><div class="form-row"><div class="field"><label>Kcal</label><input name="kcal" type="number" value="0"></div><div class="field"><label>Proteína g</label><input name="protein" type="number" value="0"></div></div><div class="field"><label>Notas</label><input name="notes" placeholder="Opcional"></div><button class="primary-btn full">Guardar comida</button></form>
        </aside>
      </div>`;
  }

  function renderReflection(){
    const t = selectedDate || Data.today();
    const r = S.reflections[t] || {};
    return `
      <div class="layout-2">
        <section class="card">
          <div class="card-title"><div><h2>Reflexión diaria</h2><p>${Data.formatDate(t,{weekday:'long',day:'numeric',month:'long'})}</p></div><button class="soft-btn" onclick="App.generateReflectionPrompt()">✨ Preguntas IA</button></div>
          <div id="reflectionPrompt" class="ai-response" style="display:none"></div>
          <form class="form" onsubmit="App.saveReflection(event)">
            <input name="date" type="date" value="${t}" onchange="App.setSelectedDate(this.value)">
            <div class="form-row"><div class="field"><label>Estado de ánimo 1-10</label><input name="mood" type="number" min="1" max="10" value="${esc(r.mood||'')}"></div><div class="field"><label>Energía 1-10</label><input name="energy" type="number" min="1" max="10" value="${esc(r.energy||'')}"></div></div>
            <div class="field"><label>Qué ha salido bien</label><textarea name="wins" placeholder="Una victoria pequeña...">${esc(r.wins||'')}</textarea></div>
            <div class="field"><label>Qué me ha bloqueado</label><textarea name="blockers" placeholder="Qué me quitó energía...">${esc(r.blockers||'')}</textarea></div>
            <div class="field"><label>Primera acción de mañana</label><textarea name="tomorrow" placeholder="Concreta y pequeña...">${esc(r.tomorrow||'')}</textarea></div>
            <div class="field"><label>Gratitud / nota mental</label><input name="gratitude" value="${esc(r.gratitude||'')}" placeholder="Opcional"></div>
            <button class="primary-btn full">Guardar reflexión</button>
          </form>
        </section>
        <aside class="card">
          <div class="card-title"><div><h2>Historial</h2><p>Últimos cierres del día.</p></div></div>
          <div class="timeline">${Object.entries(S.reflections).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,7).map(([d,x])=>`<div class="item"><div class="item-icon">🧘</div><div class="item-main"><div class="item-title">${esc(d)} · ánimo ${esc(x.mood||'-')}/10</div><div class="item-meta">${esc((x.wins||'').slice(0,120))}</div></div></div>`).join('') || '<div class="empty">Todavía no hay reflexiones.</div>'}</div>
        </aside>
      </div>`;
  }

  function renderFinance(){
    const f = S.finance;
    const balance = f.accounts.reduce((a,x)=>a+Number(x.balance||0),0);
    const month = Data.today().slice(0,7);
    const monthTx = f.transactions.filter(t=>String(t.date||'').startsWith(month));
    const income = monthTx.filter(t=>Number(t.amount)>0).reduce((a,t)=>a+Number(t.amount),0);
    const expenses = monthTx.filter(t=>Number(t.amount)<0).reduce((a,t)=>a+Math.abs(Number(t.amount)),0);
    return `
      <div class="grid grid-4">
        <div class="card kpi" style="--accent:#d1fae5;--accent-text:var(--green)"><div class="kpi-label">Patrimonio</div><div class="kpi-value">${Data.eur(balance)}</div><div class="kpi-sub">suma de cuentas</div></div>
        <div class="card kpi" style="--accent:#dbeafe;--accent-text:var(--blue)"><div class="kpi-label">Ingresos mes</div><div class="kpi-value">${Data.eur(income)}</div><div class="kpi-sub">movimientos positivos</div></div>
        <div class="card kpi" style="--accent:#fff7ed;--accent-text:var(--orange)"><div class="kpi-label">Gastos mes</div><div class="kpi-value">${Data.eur(expenses)}</div><div class="kpi-sub">movimientos negativos</div></div>
        <div class="card kpi" style="--accent:#ede9fe;--accent-text:var(--purple)"><div class="kpi-label">Ahorro</div><div class="kpi-value">${Data.eur(income-expenses)}</div><div class="kpi-sub">estimación mensual</div></div>
      </div>
      <div class="layout-2" style="margin-top:16px">
        <section class="grid">
          <div class="card"><div class="card-title"><div><h2>Cuentas</h2><p>Edita saldos manualmente.</p></div></div><div class="timeline">${f.accounts.map(a=>`<div class="item"><div class="item-icon">💳</div><div class="item-main"><div class="item-title">${esc(a.name)}</div><div class="item-meta">${esc(a.type)} · ${Data.eur(a.balance)}</div></div><button class="tiny-btn" onclick="App.editAccount('${a.id}')">Editar</button><button class="tiny-btn" onclick="App.deleteFinance('accounts','${a.id}')">🗑</button></div>`).join('') || '<div class="empty">Sin cuentas.</div>'}</div></div>
          <div class="card"><div class="card-title"><div><h2>Movimientos</h2><p>Usa importaciones más adelante; de momento registro manual.</p></div></div><div class="timeline">${f.transactions.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(t=>`<div class="item"><div class="item-icon">${Number(t.amount)>=0?'➕':'➖'}</div><div class="item-main"><div class="item-title">${esc(t.name)}</div><div class="item-meta">${esc(t.date)} · ${esc(t.category)} · ${Data.eur(t.amount)}</div></div><button class="tiny-btn" onclick="App.deleteFinance('transactions','${t.id}')">🗑</button></div>`).join('') || '<div class="empty">Sin movimientos.</div>'}</div></div>
        </section>
        <aside class="grid">
          <div class="card"><div class="card-title"><div><h2>Añadir movimiento</h2><p>Importe positivo ingreso, negativo gasto.</p></div></div><form class="form" onsubmit="App.saveTransaction(event)"><div class="field"><label>Concepto</label><input name="name" required></div><div class="form-row"><div class="field"><label>Fecha</label><input name="date" type="date" value="${Data.today()}"></div><div class="field"><label>Importe</label><input name="amount" type="number" step="0.01" required placeholder="-12.50"></div></div><div class="field"><label>Categoría</label><select name="category"><option>Alimentación</option><option>Transporte</option><option>Ocio</option><option>Suscripción</option><option>Ingreso</option><option>Ahorro</option><option>Otros</option></select></div><button class="primary-btn full">Guardar movimiento</button></form></div>
          <div class="card"><div class="card-title"><div><h2>Nueva cuenta</h2><p>Banco, ahorro, inversión...</p></div></div><form class="form" onsubmit="App.saveAccount(event)"><div class="field"><label>Nombre</label><input name="name" required></div><div class="form-row"><div class="field"><label>Tipo</label><input name="type" value="Banco"></div><div class="field"><label>Saldo</label><input name="balance" type="number" step="0.01" value="0"></div></div><button class="soft-btn full">Añadir cuenta</button></form></div>
        </aside>
      </div>`;
  }

  function renderProfile(){
    const p = S.profile;
    return `
      <div class="layout-2">
        <section class="card">
          <div class="card-title"><div><h2>Perfil inicial</h2><p>Estas respuestas alimentan las recomendaciones de la app.</p></div><button class="primary-btn" onclick="App.openOnboarding(true)">Editar cuestionario</button></div>
          <div class="grid grid-2">
            ${profileField('Nombre',p.name||'Sin definir')}
            ${profileField('Rol',p.role||'Sin definir')}
            ${profileField('Objetivo principal',p.mainGoal)}
            ${profileField('Energía alta',p.energyPattern)}
            ${profileField('Horario',`${p.dayStart} - ${p.dayEnd}`)}
            ${profileField('Sueño',`${p.sleepHours} h`)}
            ${profileField('Deportes',p.sports?.join(', ') || 'Sin definir')}
            ${profileField('Comida',p.foodStyle)}
            ${profileField('Finanzas',p.financeFocus)}
            ${profileField('Hábitos deseados',p.habitsWanted?.join(', ') || 'Sin definir')}
          </div>
        </section>
        <aside class="grid">
          <div class="card">
            <div class="card-title"><div><h2>IA local / API</h2><p>Por defecto funciona con reglas locales. Para Ollama, lanza el servidor opcional o activa conexión directa.</p></div></div>
            <form class="form" onsubmit="App.saveAISettings(event)">
              <div class="field"><label>Modo IA</label><select name="aiMode"><option value="rules" ${S.settings.aiMode==='rules'?'selected':''}>Reglas locales, sin conexión</option><option value="proxy" ${S.settings.aiMode==='proxy'?'selected':''}>Proxy local Node + Ollama</option><option value="ollama" ${S.settings.aiMode==='ollama'?'selected':''}>Ollama directo desde navegador</option></select></div>
              <div class="field"><label>Modelo Ollama</label><input name="ollamaModel" value="${esc(S.settings.ollamaModel)}"></div>
              <div class="field"><label>Endpoint Ollama directo</label><input name="ollamaEndpoint" value="${esc(S.settings.ollamaEndpoint)}"></div>
              <div class="field"><label>Endpoint proxy</label><input name="proxyEndpoint" value="${esc(S.settings.proxyEndpoint)}"></div>
              <button class="primary-btn full">Guardar IA</button>
            </form>
          </div>
          <div class="card">
            <div class="card-title"><div><h2>Notificación final del día</h2><p>Funciona si la app está abierta o instalada como PWA. No es push remoto.</p></div></div>
            <form class="form" onsubmit="App.saveReminder(event)"><div class="field"><label>Hora</label><input type="time" name="reminderTime" value="${esc(S.settings.reminderTime)}"></div><button class="soft-btn full">Guardar recordatorio</button><button type="button" class="ghost-btn full" onclick="App.requestNotifications()">Permitir notificaciones</button></form>
          </div>
          <div class="card"><div class="card-title"><div><h2>Datos</h2><p>Todo se guarda en localStorage del navegador.</p></div></div><div class="grid"><button class="soft-btn full" onclick="App.exportBackup()">↓ Exportar backup</button><label class="ghost-btn full">↑ Importar backup<input type="file" accept=".json" style="display:none" onchange="App.importBackup(this.files[0])"></label><button class="danger-btn full" onclick="App.resetAll()">Resetear app</button></div></div>
        </aside>
      </div>`;
  }
  function profileField(k,v){return `<div class="card flat"><div class="kpi-label">${esc(k)}</div><div class="small" style="font-weight:800;color:var(--text-2)">${esc(v)}</div></div>`;}

  function openOnboarding(edit=false){
    const p = S.profile;
    const sports = ['Gimnasio','Running','Bici','Pádel','Natación','Hyrox','Yoga/Pilates'];
    const habits = ['Beber agua','Caminar','Leer 10 min','Meditar','Estudiar','Ahorrar','Dormir antes','Planificar mañana'];
    $('modalRoot').innerHTML = `<div class="modal-backdrop"><div class="modal onboarding"><div class="modal-header"><div><h2>${edit?'Editar perfil inicial':'Vamos a entenderte un poco'}</h2><p class="small muted">Estas preguntas son la base para que la app no sea genérica: tareas, entrenos, hábitos y cierre diario se adaptan a ti.</p></div>${edit?'<button class="x-btn" onclick="App.closeModal()">×</button>':''}</div><div class="modal-body"><form class="form" onsubmit="App.saveOnboarding(event)">
      <div class="question-grid">
        <div class="field"><label>Nombre</label><input name="name" value="${esc(p.name)}" placeholder="Ej: Marcos"></div>
        <div class="field"><label>Rol actual</label><input name="role" value="${esc(p.role)}" placeholder="Estudiante, trabajador, opositor..."></div>
        <div class="field"><label>Objetivo principal</label><input name="mainGoal" value="${esc(p.mainGoal)}"></div>
        <div class="field"><label>Cuándo tienes más energía</label><select name="energyPattern"><option ${p.energyPattern==='Mañana'?'selected':''}>Mañana</option><option ${p.energyPattern==='Tarde'?'selected':''}>Tarde</option><option ${p.energyPattern==='Noche'?'selected':''}>Noche</option><option ${p.energyPattern==='Variable'?'selected':''}>Variable</option></select></div>
        <div class="field"><label>Inicio del día</label><input name="dayStart" type="time" value="${esc(p.dayStart)}"></div>
        <div class="field"><label>Fin del día</label><input name="dayEnd" type="time" value="${esc(p.dayEnd)}"></div>
        <div class="field"><label>Horas de sueño objetivo</label><input name="sleepHours" type="number" step="0.5" value="${esc(p.sleepHours)}"></div>
        <div class="field"><label>Días de deporte por semana</label><input name="trainingDays" type="number" min="0" max="7" value="${esc(p.trainingDays)}"></div>
        <div class="field"><label>Estilo de comida</label><input name="foodStyle" value="${esc(p.foodStyle)}" placeholder="Rápido, alto en proteína, vegetariano..."></div>
        <div class="field"><label>Foco económico</label><input name="financeFocus" value="${esc(p.financeFocus)}" placeholder="Ahorrar, controlar gastos, invertir..."></div>
      </div>
      <div class="field"><label>Deportes que haces o te interesan</label><div class="choice-grid" data-name="sports">${sports.map(s=>`<button type="button" class="choice ${(p.sports||[]).includes(s)?'active':''}" onclick="App.toggleChoice(this)">${s}</button>`).join('')}</div></div>
      <div class="field"><label>Hábitos que quieres construir</label><div class="choice-grid" data-name="habitsWanted">${habits.map(h=>`<button type="button" class="choice ${(p.habitsWanted||[]).includes(h)?'active':''}" onclick="App.toggleChoice(this)">${h}</button>`).join('')}</div></div>
      <div class="field"><label>Contexto importante para la IA</label><textarea name="contextNotes" placeholder="Limitaciones, horarios, lesiones, objetivos, cosas que te cuestan...">${esc(p.contextNotes)}</textarea></div>
      <button class="primary-btn full">Guardar y entrar</button>
    </form></div></div></div>`;
  }

  function closeModal(){ $('modalRoot').innerHTML = ''; }
  function toggleChoice(btn){ btn.classList.toggle('active'); }

  function formDataObj(form){ return Object.fromEntries(new FormData(form).entries()); }
  function getChoices(name){ return [...document.querySelectorAll(`[data-name="${name}"] .choice.active`)].map(x=>x.textContent.trim()); }

  function saveOnboarding(e){
    e.preventDefault();
    const o = formDataObj(e.target);
    S.profile = {...S.profile, ...o, sleepHours:Number(o.sleepHours||7), trainingDays:Number(o.trainingDays||3), sports:getChoices('sports'), habitsWanted:getChoices('habitsWanted')};
    S.onboardingDone = true;
    // create missing selected habits
    for(const h of S.profile.habitsWanted){ if(!S.habits.some(x=>x.name.toLowerCase().includes(h.toLowerCase()))) S.habits.push({id:Data.uid('habit'), name:h, category:'Personal', target:'Diario', days:{}}); }
    saveQuiet(); closeModal(); render(); showToast('Perfil inicial guardado');
  }

  function saveTask(e){e.preventDefault(); const o=formDataObj(e.target); S.tasks.push({id:Data.uid('task'), done:false, ...o}); saveQuiet(); render(); showToast('Tarea creada');}
  function saveWorkout(e){e.preventDefault(); const o=formDataObj(e.target); S.workouts.push({id:Data.uid('work'), done:false, duration:Number(o.duration||45), ...o}); saveQuiet(); render(); showToast('Entrenamiento guardado');}
  function saveHabit(e){e.preventDefault(); const o=formDataObj(e.target); S.habits.push({id:Data.uid('habit'), target:'Diario', days:{}, ...o}); saveQuiet(); render(); showToast('Hábito creado');}
  function saveMeal(e){e.preventDefault(); const o=formDataObj(e.target); S.meals.push({id:Data.uid('meal'), kcal:Number(o.kcal||0), protein:Number(o.protein||0), ...o}); saveQuiet(); render(); showToast('Comida guardada');}
  function saveReflection(e){e.preventDefault(); const o=formDataObj(e.target); S.reflections[o.date] = {mood:o.mood, energy:o.energy, wins:o.wins, blockers:o.blockers, tomorrow:o.tomorrow, gratitude:o.gratitude}; saveQuiet(); selectedDate=o.date; render(); showToast('Reflexión guardada');}
  function saveTransaction(e){e.preventDefault(); const o=formDataObj(e.target); S.finance.transactions.push({id:Data.uid('tx'), amount:Number(o.amount||0), ...o}); saveQuiet(); render(); showToast('Movimiento guardado');}
  function saveAccount(e){e.preventDefault(); const o=formDataObj(e.target); S.finance.accounts.push({id:Data.uid('acc'), balance:Number(o.balance||0), ...o}); saveQuiet(); render(); showToast('Cuenta añadida');}
  function saveAISettings(e){e.preventDefault(); Object.assign(S.settings, formDataObj(e.target)); saveQuiet(); render(); showToast('Configuración IA guardada');}
  function saveReminder(e){e.preventDefault(); S.settings.reminderTime=formDataObj(e.target).reminderTime; saveQuiet(); setupNotifications(); render(); showToast('Recordatorio guardado');}

  function toggleDone(collection,id){ const item=S[collection].find(x=>x.id===id); if(item){item.done=!item.done; saveQuiet(); render();} }
  function deleteItem(collection,id){ if(!confirm('¿Eliminar?')) return; S[collection]=S[collection].filter(x=>x.id!==id); saveQuiet(); render(); showToast('Eliminado'); }
  function deleteFinance(collection,id){ if(!confirm('¿Eliminar?')) return; S.finance[collection]=S.finance[collection].filter(x=>x.id!==id); saveQuiet(); render(); }
  function toggleHabit(id,date){ const h=S.habits.find(x=>x.id===id); if(!h) return; if(!h.days) h.days={}; h.days[date] ? delete h.days[date] : h.days[date]=true; saveQuiet(); render(); }
  function setSelectedDate(date){ selectedDate=date; if(['habits','food','reflection'].includes(currentView)) render(); }
  function setTaskFilter(f){ taskFilter=f; render(); }
  function moveMonth(delta){ calCursor.setMonth(calCursor.getMonth()+delta); render(); }
  function goToday(){ selectedDate=Data.today(); calCursor=new Date(selectedDate+'T12:00:00'); render(); }
  function selectDate(date){ selectedDate=date; render(); }

  function openTaskModal(date=Data.today()){ $('modalRoot').innerHTML=`<div class="modal-backdrop"><div class="modal small"><div class="modal-header"><div><h2>Nueva tarea</h2><p class="small muted">Fecha: ${date}</p></div><button class="x-btn" onclick="App.closeModal()">×</button></div><div class="modal-body">${taskFormHTML(date)}</div></div></div>`; }
  function openWorkoutModal(date=Data.today()){ $('modalRoot').innerHTML=`<div class="modal-backdrop"><div class="modal small"><div class="modal-header"><div><h2>Nuevo entrenamiento</h2><p class="small muted">Fecha: ${date}</p></div><button class="x-btn" onclick="App.closeModal()">×</button></div><div class="modal-body">${workoutFormHTML(date)}</div></div></div>`; }
  function openEventModal(){
    $('modalRoot').innerHTML=`<div class="modal-backdrop"><div class="modal small"><div class="modal-header"><div><h2>Nuevo evento</h2></div><button class="x-btn" onclick="App.closeModal()">×</button></div><div class="modal-body"><form class="form" onsubmit="App.saveEvent(event)"><div class="field"><label>Título</label><input name="title" required></div><div class="form-row"><div class="field"><label>Fecha</label><input name="date" type="date" value="${selectedDate}"></div><div class="field"><label>Hora</label><input name="time" type="time" value="10:00"></div></div><div class="form-row"><div class="field"><label>Tipo</label><select name="type"><option>Trabajo/estudio</option><option>Personal</option><option>Comida</option><option>Descanso</option><option>Social</option></select></div><div class="field"><label>Duración min</label><input name="duration" type="number" value="60"></div></div><div class="field"><label>Notas</label><input name="notes"></div><button class="primary-btn full">Guardar evento</button></form></div></div></div>`;
  }
  function saveEvent(e){e.preventDefault(); const o=formDataObj(e.target); S.events.push({id:Data.uid('event'), duration:Number(o.duration||60), ...o}); saveQuiet(); closeModal(); render(); showToast('Evento creado');}

  function quickAdd(){
    $('modalRoot').innerHTML=`<div class="modal-backdrop"><div class="modal small"><div class="modal-header"><div><h2>Añadir rápido</h2><p class="small muted">Elige qué quieres crear.</p></div><button class="x-btn" onclick="App.closeModal()">×</button></div><div class="modal-body"><div class="grid grid-2"><button class="soft-btn" onclick="App.openTaskModal('${Data.today()}')">✅ Tarea</button><button class="soft-btn" onclick="App.openEventModal()">📅 Evento</button><button class="soft-btn" onclick="App.openWorkoutModal('${Data.today()}')">🏋️ Entreno</button><button class="soft-btn" onclick="App.showView('food');App.closeModal()">🍽️ Comida</button><button class="soft-btn" onclick="App.showView('habits');App.closeModal()">🌱 Hábito</button><button class="soft-btn" onclick="App.showView('reflection');App.closeModal()">🧘 Reflexión</button></div></div></div></div>`;
  }

  async function generateDailyPlan(){
    const mount = $('dailyAiResult');
    if(mount){ mount.style.display='block'; mount.textContent='Pensando...'; }
    const text = await AI.generateText(S,'daily','Genera un plan realista para hoy.');
    if(mount){ mount.textContent=text; }
    else showAIText('Plan del día', text);
  }
  async function generateTasks(){
    showToast('Generando tareas...');
    const tasks = await AI.generateTasks(S);
    S.tasks.push(...tasks);
    saveQuiet(); render(); showToast(`${tasks.length} tareas creadas`);
  }
  async function generateSportWeek(){
    showToast('Generando planning semanal...');
    const workouts = await AI.generateSportWeek(S);
    S.workouts.push(...workouts);
    saveQuiet(); render(); showToast(`${workouts.length} entrenamientos creados`);
  }
  async function generateMealIdea(){
    const box = $('mealIdea');
    if(box){ box.style.display='block'; box.textContent='Pensando...'; }
    const text = await AI.generateText(S,'meal','Dame una idea de comida rápida y equilibrada.');
    if(box) box.textContent = text; else showAIText('Idea de comida', text);
  }
  async function generateReflectionPrompt(){
    const box = $('reflectionPrompt');
    if(box){ box.style.display='block'; box.textContent='Pensando...'; }
    const text = await AI.generateText(S,'reflection','Dame preguntas de cierre del día.');
    if(box) box.textContent = text; else showAIText('Reflexión', text);
  }
  function showAIText(title,text){ $('modalRoot').innerHTML=`<div class="modal-backdrop"><div class="modal small"><div class="modal-header"><div><h2>${esc(title)}</h2></div><button class="x-btn" onclick="App.closeModal()">×</button></div><div class="modal-body"><div class="ai-response">${esc(text)}</div></div></div></div>`; }

  function editAccount(id){
    const a=S.finance.accounts.find(x=>x.id===id); if(!a) return;
    const name=prompt('Nombre de la cuenta', a.name); if(name===null) return;
    const balance=prompt('Saldo', a.balance); if(balance===null) return;
    a.name=name; a.balance=Number(balance||0); saveQuiet(); render();
  }

  function exportBackup(){ Data.download(`equilibrio-backup-${Data.today()}.json`, JSON.stringify(S,null,2)); showToast('Backup exportado'); }
  async function importBackup(file){ if(!file) return; try{ S=await Data.importFile(file); saveQuiet(); render(); showToast('Backup importado'); } catch{ showToast('Archivo no válido','error'); } }
  function resetAll(){ if(confirm('¿Seguro? Se borran todos los datos locales.')){ S=Data.reset(); currentView='dashboard'; selectedDate=Data.today(); renderNav(); render(); openOnboarding(false); } }

  function requestNotifications(){
    if(!('Notification' in window)){ showToast('Tu navegador no soporta notificaciones','error'); return; }
    Notification.requestPermission().then(p=>{ S.settings.notifications = p === 'granted'; saveQuiet(); showToast(p==='granted'?'Notificaciones activadas':'Permiso no concedido'); });
  }
  function setupNotifications(){
    if(window._eqReminder) clearInterval(window._eqReminder);
    window._eqReminder = setInterval(checkReminder, 60*1000);
  }
  function checkReminder(){
    const t = new Date();
    const hhmm = String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0');
    const d = Data.today();
    if(hhmm === S.settings.reminderTime && S.settings.lastReminderDate !== d){
      S.settings.lastReminderDate=d; saveQuiet();
      const msg = 'Cierra el día: hábitos, comida y 3 preguntas de reflexión.';
      showToast(msg);
      if(S.settings.notifications && 'Notification' in window && Notification.permission==='granted') new Notification('Equilibrio · Cierre del día', {body:msg, icon:'assets/icon.svg'});
    }
  }

  window.App = { init, showView, openOnboarding, closeModal, toggleChoice, saveOnboarding, quickAdd,
    saveTask, saveWorkout, saveHabit, saveMeal, saveReflection, saveTransaction, saveAccount, saveAISettings, saveReminder,
    toggleDone, deleteItem, deleteFinance, toggleHabit, setSelectedDate, setTaskFilter, moveMonth, goToday, selectDate,
    openTaskModal, openWorkoutModal, openEventModal, saveEvent, generateDailyPlan, generateTasks, generateSportWeek, generateMealIdea, generateReflectionPrompt,
    editAccount, exportBackup, importBackup, resetAll, requestNotifications };

  document.addEventListener('DOMContentLoaded', init);
})();
