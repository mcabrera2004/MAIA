# 🏗️ Ingeniería Inversa: LangGraph FastAPI Template

## Arquitectura General del Proyecto

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENTE (HTTP)                        │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    app/main.py (FastAPI)                     │
│        Middlewares: CORS, Logging, Metrics, RateLimit        │
└────────────────────────────┬────────────────────────────────┘
                             │
                   ┌─────────┴─────────┐
                   ▼                   ▼
          ┌──────────────┐    ┌──────────────┐
          │  /api/v1/auth │    │/api/v1/chatbot│
          │  (auth.py)    │    │ (chatbot.py)  │
          └──────┬───────┘    └──────┬───────┘
                 │                   │
        ┌────────┼────────┐          │
        ▼        ▼        ▼          ▼
   ┌────────┐┌──────┐┌───────┐┌──────────────┐
   │Database││ JWT  ││Sanitiz││ LangGraph    │
   │Service ││Utils ││ation  ││   Agent      │
   └────┬───┘└──────┘└───────┘└──────┬───────┘
        │                            │
        ▼                      ┌─────┴──────┐
   ┌────────┐                  ▼            ▼
   │PostgreSQL│           ┌────────┐  ┌──────────┐
   │(Supabase)│           │LLM     │  │ Tools    │
   └──────────┘           │Service │  │(DDG,etc) │
                          └────┬───┘  └──────────┘
                               ▼
                          ┌────────┐
                          │OpenAI  │
                          │  API   │
                          └────────┘
```

---

## 🧠 Mapa Mental: Qué hace cada archivo

### Capa 0 — Fundación (sin dependencias internas)
| Archivo | Propósito |
|---------|-----------|
| `app/core/config.py` | Define **Settings** (env vars, DB, JWT, LLM, rate limits). Es el primer archivo que se carga. Todo lo demás depende de él. |
| `app/models/base.py` | Modelo base SQLModel con campo `created_at`. |
| `app/core/prompts/system.md` | El system prompt (archivo markdown con placeholders). |

### Capa 1 — Infraestructura (dependen solo de config)
| Archivo | Propósito |
|---------|-----------|
| `app/core/logging.py` | Configura **structlog** con contexto por request, rotación diaria, formatos JSON/consola. Exporta `logger`, `bind_context`, `clear_context`. |
| `app/core/limiter.py` | Crea instancia de **slowapi** Limiter para rate limiting. |
| `app/core/metrics.py` | Define contadores/histogramas **Prometheus** (HTTP, DB, LLM). |

### Capa 2 — Modelos de datos (dependen de base)
| Archivo | Propósito |
|---------|-----------|
| `app/models/user.py` | Modelo `User` (SQLModel, tabla). Tiene email, hashed_password, métodos verify_password / hash_password con bcrypt. Relación 1:N con Session. |
| `app/models/session.py` | Modelo `Session` (SQLModel, tabla). id (UUID string), user_id (FK→User), name. Relación N:1 con User. |
| `app/models/thread.py` | Modelo `Thread` (SQLModel, tabla). Solo id + created_at. Usado por LangGraph checkpointer. |
| `app/models/database.py` | Re-exporta Thread. Módulo de conveniencia. |

### Capa 3 — Schemas (validación Pydantic, sin lógica de negocio)
| Archivo | Propósito |
|---------|-----------|
| `app/schemas/auth.py` | `Token`, `TokenResponse`, `UserCreate` (con validación de contraseña fuerte), `UserResponse`, `SessionResponse`. |
| `app/schemas/chat.py` | `Message` (role + content con validación anti-XSS), `ChatRequest`, `ChatResponse`, `StreamResponse`. |
| `app/schemas/graph.py` | `GraphState` — el estado del grafo LangGraph: `messages` (con `add_messages` reducer) + `long_term_memory`. |
| `app/schemas/__init__.py` | Re-exporta todos los schemas. |

### Capa 4 — Utilidades (funciones puras)
| Archivo | Propósito |
|---------|-----------|
| `app/utils/sanitization.py` | Funciones de sanitización: `sanitize_string` (anti-XSS), `sanitize_email`, `sanitize_dict`, `sanitize_list`, `validate_password_strength`. |
| `app/utils/auth.py` | `create_access_token()` → genera JWT. `verify_token()` → valida JWT y retorna thread_id/user_id. |
| `app/utils/graph.py` | `dump_messages()` — serializa Message→dict. `process_llm_response()` — extrae texto de bloques GPT-5. `prepare_messages()` — trim de tokens + system prompt. |
| `app/utils/__init__.py` | Re-exporta las 3 funciones de graph utils. |

### Capa 5 — Servicios (lógica de negocio)
| Archivo | Propósito |
|---------|-----------|
| `app/services/database.py` | `DatabaseService` — CRUD completo: create/get/delete User, create/get/delete/list Session, update_session_name, health_check. Usa SQLModel + PostgreSQL con connection pool. Singleton `database_service`. |
| `app/services/llm.py` | `LLMRegistry` — registro de modelos ChatOpenAI (gpt-5-mini, gpt-5, gpt-5-nano, gpt-4o, gpt-4o-mini). `LLMService` — llamadas con retry (tenacity), fallback circular entre modelos, bind_tools. Singleton `llm_service`. |
| `app/services/__init__.py` | Re-exporta singletons. |

### Capa 6 — Tools del Agente
| Archivo | Propósito |
|---------|-----------|
| `app/core/langgraph/tools/duckduckgo_search.py` | Tool de búsqueda DuckDuckGo (10 resultados). |
| `app/core/langgraph/tools/__init__.py` | Lista `tools: list[BaseTool]` que se pasan al agente. |

### Capa 7 — Prompts del Agente
| Archivo | Propósito |
|---------|-----------|
| `app/core/prompts/__init__.py` | `load_system_prompt()` — carga `system.md` e inyecta variables (nombre del agente, fecha, long_term_memory). |

### Capa 8 — Middleware
| Archivo | Propósito |
|---------|-----------|
| `app/core/middleware.py` | `MetricsMiddleware` — registra duración y conteo de requests. `LoggingContextMiddleware` — extrae session_id del JWT y lo vincula al contexto de logging. |

### Capa 9 — El Cerebro: LangGraph Agent
| Archivo | Propósito |
|---------|-----------|
| `app/core/langgraph/graph.py` | **`LangGraphAgent`** — la clase principal: |
| | • `__init__` — inicializa LLM service con tools |
| | • `_long_term_memory()` — mem0 con pgvector para memoria a largo plazo |
| | • `_get_connection_pool()` — pool psycopg async para checkpointer |
| | • `_chat()` — nodo del grafo: prepara mensajes, llama LLM, decide si va a tool_call o END |
| | • `_tool_call()` — nodo del grafo: ejecuta tools y vuelve a chat |
| | • `create_graph()` — construye StateGraph con checkpointer PostgreSQL |
| | • `get_response()` — invoca el grafo completo (sync) |
| | • `get_stream_response()` — invoca el grafo con streaming |
| | • `get_chat_history()` — recupera historial desde checkpointer |
| | • `clear_chat_history()` — borra checkpoints de una sesión |

### Capa 10 — API Endpoints (la capa más externa)
| Archivo | Propósito |
|---------|-----------|
| `app/api/v1/auth.py` | Endpoints: `POST /register`, `POST /login`, `POST /session`, `PATCH /session/{id}/name`, `DELETE /session/{id}`, `GET /sessions`. Dependencies: `get_current_user`, `get_current_session`. |
| `app/api/v1/chatbot.py` | Endpoints: `POST /chat`, `POST /chat/stream`, `GET /messages`, `DELETE /messages`. Usa `LangGraphAgent`. |
| `app/api/v1/api.py` | Router principal que monta auth + chatbot bajo prefijos `/auth` y `/chatbot`. |

### Capa 11 — Punto de entrada
| Archivo | Propósito |
|---------|-----------|
| `app/main.py` | Crea la app FastAPI, registra middlewares, exception handlers, CORS, monta el api_router, define `/` y `/health`. Langfuse init. Lifespan events. |

---

## 📋 ORDEN EXACTO DE DESARROLLO (Si empezaras de cero)

### Fase 1: Configuración y Fundación
```
Paso 1 → pyproject.toml                    # Definir dependencias del proyecto
Paso 2 → .env.example / .env               # Variables de entorno
Paso 3 → app/core/config.py                # Settings centralizados
Paso 4 → app/models/base.py                # BaseModel con created_at
```

### Fase 2: Infraestructura transversal
```
Paso 5 → app/core/logging.py               # Sistema de logging (structlog)
Paso 6 → app/core/limiter.py               # Rate limiting
Paso 7 → app/core/metrics.py               # Métricas Prometheus
Paso 8 → app/core/middleware.py             # Middlewares personalizados
```

### Fase 3: Modelos de base de datos
```
Paso 9  → app/models/user.py               # Modelo User con bcrypt
Paso 10 → app/models/session.py            # Modelo Session (FK → User)
Paso 11 → app/models/thread.py             # Modelo Thread (para LangGraph)
Paso 12 → app/models/database.py           # Re-exports
Paso 13 → schema.sql                       # Script SQL de referencia
```

### Fase 4: Schemas de validación
```
Paso 14 → app/schemas/auth.py              # Token, UserCreate, UserResponse, etc.
Paso 15 → app/schemas/chat.py              # Message, ChatRequest, ChatResponse
Paso 16 → app/schemas/graph.py             # GraphState (estado del agente)
Paso 17 → app/schemas/__init__.py          # Re-exports
```

### Fase 5: Utilidades
```
Paso 18 → app/utils/sanitization.py        # Sanitización anti-XSS/inyección
Paso 19 → app/utils/auth.py                # JWT: create_access_token, verify_token
Paso 20 → app/utils/graph.py               # dump_messages, prepare_messages, process_llm_response
Paso 21 → app/utils/__init__.py            # Re-exports
```

### Fase 6: Servicios
```
Paso 22 → app/services/database.py         # CRUD Users + Sessions (SQLModel + PostgreSQL)
Paso 23 → app/services/llm.py              # LLMRegistry + LLMService (retry + fallback)
Paso 24 → app/services/__init__.py         # Re-exports de singletons
```

### Fase 7: Agente LangGraph
```
Paso 25 → app/core/prompts/system.md                   # System prompt del agente
Paso 26 → app/core/prompts/__init__.py                  # Loader del prompt
Paso 27 → app/core/langgraph/tools/duckduckgo_search.py # Tool de búsqueda
Paso 28 → app/core/langgraph/tools/__init__.py          # Lista de tools
Paso 29 → app/core/langgraph/graph.py                   # LangGraphAgent (¡EL CEREBRO!)
```

### Fase 8: Endpoints de la API
```
Paso 30 → app/api/v1/auth.py               # Endpoints de autenticación
Paso 31 → app/api/v1/chatbot.py            # Endpoints del chatbot
Paso 32 → app/api/v1/api.py                # Router agregador
```

### Fase 9: Punto de entrada
```
Paso 33 → app/main.py                      # App FastAPI principal
```

### Fase 10: DevOps y Tooling
```
Paso 34 → Makefile                          # Comandos de desarrollo
Paso 35 → Dockerfile                        # Contenedor Docker
Paso 36 → docker-compose.yml               # Orquestación (PostgreSQL, app, Prometheus, Grafana)
Paso 37 → scripts/                          # Scripts auxiliares
Paso 38 → evals/                            # Sistema de evaluación del agente
Paso 39 → grafana/ + prometheus/            # Monitoreo
```

---

## 📁 LISTA COMPLETA DE ARCHIVOS .py A CREAR

```
app/
├── __init__.py                              # (vacío o no necesario)
├── main.py                                  # ⭐ Punto de entrada FastAPI
│
├── core/
│   ├── config.py                            # ⭐ Settings desde env vars
│   ├── logging.py                           # ⭐ Structlog setup
│   ├── limiter.py                           # Rate limiting (slowapi)
│   ├── metrics.py                           # Prometheus metrics
│   ├── middleware.py                        # Middlewares custom
│   │
│   ├── prompts/
│   │   └── __init__.py                      # load_system_prompt()
│   │
│   └── langgraph/
│       ├── graph.py                         # ⭐⭐⭐ LangGraphAgent (cerebro)
│       └── tools/
│           ├── __init__.py                  # Lista de tools
│           └── duckduckgo_search.py         # Tool de búsqueda
│
├── models/
│   ├── base.py                              # BaseModel SQLModel
│   ├── user.py                              # User model
│   ├── session.py                           # Session model
│   ├── thread.py                            # Thread model
│   └── database.py                          # Re-exports
│
├── schemas/
│   ├── __init__.py                          # Re-exports
│   ├── auth.py                              # Token, UserCreate, etc.
│   ├── chat.py                              # Message, ChatRequest, etc.
│   └── graph.py                             # GraphState
│
├── services/
│   ├── __init__.py                          # Re-exports
│   ├── database.py                          # ⭐ DatabaseService (CRUD)
│   └── llm.py                               # ⭐ LLMRegistry + LLMService
│
├── utils/
│   ├── __init__.py                          # Re-exports
│   ├── auth.py                              # JWT utils
│   ├── graph.py                             # Message processing utils
│   └── sanitization.py                      # Sanitización de inputs
│
└── api/
    └── v1/
        ├── api.py                           # Router principal
        ├── auth.py                          # ⭐ Endpoints auth
        └── chatbot.py                       # ⭐ Endpoints chatbot
```

**Total: 22 archivos .py** + 1 archivo .md (system prompt)

---

## 🔄 Flujo Completo de una Request de Chat

```
1. Cliente envía POST /api/v1/chatbot/chat con JWT + mensajes
2. Middleware intercepta → extrae session_id del JWT → logging context
3. Rate limiter verifica límites
4. get_current_session() → verifica JWT → busca Session en DB
5. chatbot.chat() recibe ChatRequest validado por Pydantic
6. agent.get_response() se invoca:
   a. Busca memoria a largo plazo relevante (mem0 + pgvector)
   b. Invoca el grafo LangGraph:
      - Nodo "chat": prepara mensajes + system prompt → llama LLM
      - Si LLM retorna tool_calls → va a nodo "tool_call"
      - Nodo "tool_call": ejecuta tools → vuelve a "chat"
      - Si LLM no tiene tool_calls → END
   c. El checkpointer guarda estado en PostgreSQL
   d. Actualiza memoria a largo plazo en background
7. Respuesta formateada como ChatResponse
8. Métricas Prometheus registradas
9. Logs escritos a archivo JSONL + consola
```

---

## 🔑 Conceptos Clave del Template

| Concepto | Implementación |
|----------|---------------|
| **Autenticación** | JWT (python-jose), bcrypt para contraseñas |
| **Persistencia de chat** | LangGraph Checkpointer con PostgreSQL (AsyncPostgresSaver) |
| **Memoria a largo plazo** | mem0 con pgvector (embeds con OpenAI) |
| **Fallback de modelos** | LLMService rota circularmente entre 5 modelos si uno falla |
| **Retry** | tenacity con backoff exponencial en llamadas LLM |
| **Observabilidad** | Langfuse (tracing), Prometheus (métricas), structlog (logging) |
| **Seguridad** | Sanitización de inputs, validación Pydantic, rate limiting |
| **Multi-entorno** | development/staging/production/test con configs separadas |
| **Streaming** | Server-Sent Events (SSE) via FastAPI StreamingResponse |
| **Tools** | LangGraph tool calling con DuckDuckGo search |

---

## 🔍 Ingeniería Inversa: ¿Por dónde empiezo a LEER?

El hilo que tenés que tirar es **`app/main.py`**. Todo empieza ahí.

Cuando el servidor arranca, Python ejecuta `main.py`. Ese archivo hace solo 3 cosas:
1. Crea la app FastAPI (línea 59)
2. Le pone middlewares — filtros que revisan cada pedido (líneas 68-78)
3. Monta las rutas (línea 123): `app.include_router(api_router)`

### Recorrido de ingeniería inversa (seguí las importaciones):

```
1. main.py              → ¿qué arranca? ¿qué monta?
2. api/v1/api.py        → ¿qué rutas existen? (auth + chatbot)
3. api/v1/chatbot.py    → ¿qué hace POST /chat?
4. core/langgraph/graph.py → ¿cómo funciona el agente de IA?
5. services/llm.py      → ¿cómo habla con OpenAI?
6. services/database.py → ¿cómo guarda datos?
7. core/config.py       → ¿de dónde salen las configuraciones?
```

Cada archivo tiene `from app.algo import algo` al principio. Eso te dice de qué depende y a dónde ir después. Seguí las importaciones como un mapa de pistas.

---

## 🔨 Orden de Desarrollo: ¿Qué codeo PRIMERO?

Para **leer** el proyecto se empieza por `main.py` (la puerta). Para **construirlo**, se empieza por el fondo (los cimientos).

```
1.  config.py          ← "¿con qué trabajo?"
2.  models/            ← "¿qué forma tienen mis datos?"
3.  schemas/           ← "¿qué acepto y qué devuelvo?"
4.  utils/             ← "¿qué funciones auxiliares necesito?"
5.  services/          ← "¿cómo hago las operaciones reales?"
6.  graph.py           ← "¿cómo piensa mi agente?"
7.  api/endpoints      ← "¿cómo llega el usuario a todo esto?"
8.  main.py            ← "¿cómo arranca todo junto?"
```

### ¿Por qué este orden?

- **config.py** primero porque TODOS los demás hacen `from app.core.config import settings`.
- **models/** segundo porque antes de guardar datos necesitás definir su forma.
- **schemas/** tercero porque los endpoints necesitan saber qué datos aceptar y devolver.
- **services/** cuarto porque es la lógica real (CRUD en DB, llamar a OpenAI).
- **graph.py** quinto porque usa los servicios que ya creaste.
- **endpoints** sexto porque son solo "envoltorios" que reciben datos, llaman a un servicio, y devuelven respuesta.
- **main.py** último porque junta todo.

Pensalo como construir una casa: primero los cimientos (config), después las paredes (models, schemas), después la electricidad y el agua (services), después los muebles (el agente), y al final la puerta de entrada (endpoints + main). No podés poner la puerta si no hay paredes.

---

## 🌍 ¿Esto aplica a TODOS los proyectos LangGraph + FastAPI?

### Lo que SÍ es siempre igual: el orden de capas

En **cualquier** proyecto FastAPI (con o sin LangGraph), siempre vas a tener esta lógica de fondo hacia afuera:

```
config → models → schemas → services → endpoints → main
```

Esto no es de LangGraph ni de este template. Es un **patrón de arquitectura** llamado "capas" o "clean architecture". Lo vas a ver en FastAPI, Django, Node.js, Java... en todos lados. La idea: lo de abajo no sabe que existe lo de arriba.

### Lo que cambia de un proyecto a otro: la estructura de carpetas

```
# Proyecto minimalista (todo junto)
main.py          ← config + models + endpoints + todo

# Proyecto intermedio
app/
├── main.py
├── models.py    ← un solo archivo con todos los modelos
├── routes.py    ← un solo archivo con todos los endpoints
└── agent.py     ← el grafo LangGraph

# Este template (muy organizado)
app/
├── core/        ├── models/      ├── schemas/
├── services/    ├── utils/       └── api/
```

Tres formas de organizar **lo mismo**. La diferencia es cuán grande es el proyecto.

### Lo que es específico de LangGraph

Lo único que LangGraph agrega a la receta es:
1. **`graph.py`** — archivo donde definís nodos y edges del grafo
2. **`GraphState`** — schema especial con `messages` y el reducer `add_messages`
3. **Checkpointer** — para guardar el estado de la conversación (en este caso PostgreSQL)
4. **Tools** — herramientas que puede usar el agente

### Regla práctica para cualquier proyecto nuevo

Si abrís un proyecto de LangGraph + FastAPI y no sabés por dónde empezar:
1. Buscá el archivo que tenga **`StateGraph`** → ese es el cerebro
2. Buscá el archivo que tenga **`FastAPI()`** → ese es la entrada
3. Seguí las importaciones entre los dos → ahí está todo lo demás

Esos dos archivos son las anclas. Todo el resto es infraestructura alrededor de ellos.
