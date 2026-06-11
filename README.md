# Equilibrio

Web app personal all-in-one para agenda, tareas, deporte, hábitos, comida, reflexión, economía e IA.

## Qué incluye

- Onboarding inicial con preguntas para entender al usuario.
- Dashboard diario.
- Agenda mensual.
- Tareas con generación por IA/reglas.
- Plan deportivo semanal con generación por IA/reglas.
- Hábitos diarios y rachas.
- Registro de comida.
- Reflexión diaria.
- Economía personal básica.
- PWA instalable.
- Backup/importación JSON.
- Modo IA por reglas locales, Ollama directo o proxy local Node.

## Uso rápido sin instalar nada

Abre `index.html` en el navegador.

## Publicar con GitHub Pages

1. Crea un repositorio nuevo en GitHub.
2. Sube todos los archivos de esta carpeta a la raíz del repositorio.
3. Ve a **Settings → Pages**.
4. En **Build and deployment**, elige **Deploy from a branch**.
5. Selecciona la rama `main` y la carpeta `/root`.
6. Guarda y espera a que GitHub genere la URL.

## Usar en local con servidor opcional + Ollama

Requisitos:

- Node.js instalado.
- Ollama instalado y corriendo.
- Un modelo descargado, por ejemplo: `ollama pull llama3.2`.

Comandos:

```bash
cd server
npm install
npm start
```

Luego abre:

```text
http://localhost:8787
```

En la app ve a **Perfil e IA** y selecciona **Proxy local Node + Ollama**.

## Nota importante

En GitHub Pages no puede ejecutarse backend. La app funciona como frontend estático con `localStorage`. Para base de datos real, usuarios, login y sincronización entre dispositivos, el siguiente paso sería montar backend con FastAPI/Node + SQLite/PostgreSQL.
