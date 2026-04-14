# 🎓 Guía para Alumno: Entendiendo este proyecto desde CERO

## Antes de tocar código: ¿Qué es todo esto?

---

## 1. ¿Qué es una API?

Imaginá un **restaurante**:

```
VOS (cliente)  →  MOZO (API)  →  COCINA (servidor/lógica)
    "Quiero una pizza"              "Acá tenés tu pizza"
```

- Vos no entrás a la cocina. Le pedís al mozo.
- El mozo lleva tu pedido, la cocina lo prepara, y el mozo te trae la respuesta.

**Una API es exactamente eso**: un "mozo" que recibe pedidos (requests) y devuelve respuestas (responses).

En internet esto funciona así:
```
Tu navegador/app  →  HTTP Request  →  Servidor  →  HTTP Response  →  Tu navegador/app
```

### Los "verbos" que sabe el mozo (HTTP Methods):
| Verbo | Qué significa | Ejemplo del restaurante |
|-------|--------------|------------------------|
| `GET` | "Dame algo" | "¿Qué platos hay?" |
| `POST` | "Creá algo nuevo" | "Quiero pedir una pizza" |
| `PUT/PATCH` | "Modificá algo" | "Cambiá la pizza a sin cebolla" |
| `DELETE` | "Borrá algo" | "Cancelá mi pedido" |

---

## 2. ¿Qué es FastAPI?

FastAPI es un **framework de Python** para construir APIs. Es como un kit que te da:
- Un sistema para definir rutas (URLs)
- Validación automática de datos
- Documentación automática (Swagger UI en `/docs`)

```python
# Así de simple es crear un endpoint:
from fastapi import FastAPI

app = FastAPI()

@app.get("/saludo")          # Cuando alguien visite /saludo...
def saludar():
    return {"mensaje": "¡Hola!"}  # ...devolvé esto
```

Eso es TODO lo que necesitás para una API básica.

---

## 3. ¿Qué es un LLM y LangGraph?

- **LLM** = Large Language Model = ChatGPT, básicamente. Un modelo de IA que entiende y genera texto.
- **LangChain** = Una librería de Python para trabajar con LLMs de forma ordenada.
- **LangGraph** = Una extensión de LangChain que te permite crear **flujos** (grafos) de conversación.

### ¿Por qué un "grafo"?

Porque la conversación no es lineal. El agente puede:

```
                    ┌─────────┐
  Mensaje del  ──→  │  CHAT   │ ──→ Respuesta directa ──→ FIN
   usuario          │ (pensar)│
                    └────┬────┘
                         │
                    ¿Necesita buscar info?
                         │ Sí
                         ▼
                    ┌─────────┐
                    │  TOOL   │ ──→ Busca en Google ──→ Vuelve a CHAT
                    │ (actuar)│
                    └─────────┘
```

Es un ciclo: **pensar → actuar → pensar → responder**.

---

## 4. ¿Qué es una base de datos y por qué PostgreSQL?

Una base de datos es donde **guardás información de forma permanente**. Sin ella:
- Se pierde todo cuando apagás el servidor
- No podés tener usuarios, sesiones, historial de chat

**PostgreSQL** es un motor de base de datos gratuito y potente. En este proyecto guarda:
- **Usuarios** (email, contraseña)
- **Sesiones** de chat (quién chatea cuándo)
- **Historial** de conversaciones (via LangGraph checkpointer)

---

## 5. ¿Qué es JWT y autenticación?

Cuando hacés login en Instagram, ¿cómo sabe Instagram que sos vos en cada pantalla nueva?

```
1. Login → mandás email + contraseña
2. Servidor verifica → te da un "ticket" (TOKEN)
3. Cada vez que pedís algo → mostrás tu ticket
4. Servidor ve el ticket → "ah, sos Martín, ok"
```

**JWT (JSON Web Token)** es ese "ticket". Es un string largo que contiene tu identidad encriptada.

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U
```

Parece basura pero dentro dice: "Este es el usuario #123, su token expira mañana".

---

## 6. ¿Qué son los schemas y los models?

### Model = la "forma" de los datos en la base de datos
```python
# "En mi base de datos, un usuario tiene estos campos"
class User:
    id: int
    email: str
    hashed_password: str
```

### Schema = la "forma" de los datos que viajan por la API
```python
# "Cuando alguien me manda datos para registrarse, espero esto"
class UserCreate:
    email: str       # obligatorio
    password: str    # obligatorio, mínimo 8 caracteres
```

¿Por qué separados? Porque **no querés exponer todo**. El password hasheado nunca sale de tu servidor.

---

## 7. ¿Qué es un "servicio" en este contexto?

Es una clase que **hace el trabajo pesado**. Los endpoints son flacos (reciben y responden), los servicios son los que realmente hacen cosas:

```
Endpoint (flaco):           Servicio (musculoso):
"Ah, querés crear usuario"  →  Conecta a la DB, crea el registro,
"Tomá la respuesta"         ←  hashea el password, valida todo
```

---

## 8. ¿Qué son los middleware?

Son como **guardias de seguridad** en la puerta del restaurant. Revisan TODOS los pedidos antes de que lleguen al mozo:

```
Request → [Guardia 1: ¿Viene de un origen permitido? (CORS)]
        → [Guardia 2: ¿Registro esta visita en el log? (Logging)]
        → [Guardia 3: ¿No está pidiendo demasiado? (Rate Limit)]
        → [Guardia 4: ¿Cuánto tiempo tardó? (Metrics)]
        → Llega al endpoint
```

---

## 9. ¿Y las "tools" del agente?

Son **superpoderes** que le das a la IA. Sin tools, la IA solo sabe lo que tiene en su entrenamiento. Con tools puede:

- 🔍 **Buscar en internet** (DuckDuckGo en este proyecto)
- 📧 Mandar emails
- 🧮 Hacer cálculos
- 📊 Consultar bases de datos
- Lo que vos quieras programar

---

## 10. ¿Qué es Docker?

Es como una **caja que contiene TODO lo que necesita tu app para funcionar**: Python, librerías, PostgreSQL, configs. Así funciona igual en tu compu, en la de tu compañero, y en un servidor de Amazon.

No te preocupes por Docker ahora. Es para cuando quieras "enviar" tu app al mundo.

---

---

# 🗺️ TU RUTA DE APRENDIZAJE (paso a paso)

## Nivel 1: Lo básico de Python y APIs (Semana 1-2)

### Ejercicio 1: Tu primera API
Creá un archivo `mi_primera_api.py` y probalo:

```python
from fastapi import FastAPI
import uvicorn

app = FastAPI()

# GET simple
@app.get("/")
def inicio():
    return {"mensaje": "¡Mi primera API funciona!"}

# GET con parámetro
@app.get("/saludo/{nombre}")
def saludar(nombre: str):
    return {"mensaje": f"¡Hola {nombre}!"}

# POST que recibe datos
@app.post("/sumar")
def sumar(a: int, b: int):
    return {"resultado": a + b}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

```bash
# Para correrlo:
python mi_primera_api.py
# Abrí http://localhost:8000/docs en tu navegador  ← ¡Magia!
```

### ¿Qué aprendés?
- Qué es un endpoint
- Diferencia entre GET y POST
- Cómo FastAPI genera documentación automática

---

## Nivel 2: Validación con Pydantic (Semana 2)

### Ejercicio 2: Schemas
```python
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI()

# Esto es un SCHEMA - define la forma de los datos
class Mensaje(BaseModel):
    usuario: str = Field(..., min_length=1, max_length=50)
    texto: str = Field(..., min_length=1, max_length=500)

@app.post("/mensaje")
def recibir_mensaje(msg: Mensaje):
    return {"recibido": f"{msg.usuario} dice: {msg.texto}"}
```

### ¿Qué aprendés?
- Pydantic valida automáticamente (si mandás un texto vacío, te rechaza)
- Esto es lo que hacen `app/schemas/chat.py` y `app/schemas/auth.py`

---

## Nivel 3: Base de datos simple (Semana 3)

### Ejercicio 3: Guardar datos
```python
from fastapi import FastAPI
from sqlmodel import SQLModel, Field, Session, create_engine, select

# MODELO - la forma en la base de datos
class Nota(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True)
    titulo: str
    contenido: str

# Crear la base de datos
engine = create_engine("sqlite:///notas.db")  # SQLite es más fácil para empezar
SQLModel.metadata.create_all(engine)

app = FastAPI()

@app.post("/notas")
def crear_nota(titulo: str, contenido: str):
    with Session(engine) as session:
        nota = Nota(titulo=titulo, contenido=contenido)
        session.add(nota)
        session.commit()
        return {"id": nota.id, "mensaje": "Nota creada"}

@app.get("/notas")
def listar_notas():
    with Session(engine) as session:
        notas = session.exec(select(Nota)).all()
        return notas
```

### ¿Qué aprendés?
- Cómo se conectan Models + Database
- Esto es lo que hacen `app/models/` y `app/services/database.py`

---

## Nivel 4: Autenticación básica (Semana 4)

### Ejercicio 4: Login simple con JWT
```python
# Aprendé a:
# 1. Hashear contraseñas (bcrypt)
# 2. Crear tokens (JWT)
# 3. Proteger endpoints (solo usuarios logueados)
```

### ¿Qué aprendés?
- Esto es lo que hacen `app/utils/auth.py` y `app/api/v1/auth.py`

---

## Nivel 5: Tu primer agente con LangGraph (Semana 5-6)

### Ejercicio 5: Chatbot simple
```python
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from pydantic import BaseModel
from typing import Annotated
from langgraph.graph.message import add_messages

class Estado(BaseModel):
    messages: Annotated[list, add_messages] = []

llm = ChatOpenAI(model="gpt-4o-mini")

def chatear(state: Estado):
    respuesta = llm.invoke(state.messages)
    return {"messages": [respuesta]}

# Crear el grafo
grafo = StateGraph(Estado)
grafo.add_node("chat", chatear)
grafo.set_entry_point("chat")
grafo.set_finish_point("chat")
app = grafo.compile()

# Usarlo
resultado = app.invoke({"messages": [{"role": "user", "content": "Hola!"}]})
print(resultado["messages"][-1].content)
```

### ¿Qué aprendés?
- Esto es lo que hace `app/core/langgraph/graph.py` (pero simplificado)

---

## Nivel 6: Unir todo (Semana 7-8)

Ahora sí, volvé a leer `roadmap_desarrollo.md` y vas a entender **cada pieza**.

---

---

# 🧩 MAPA MENTAL: Cómo se conecta todo en este proyecto

```
     TU NAVEGADOR
          │
          │  "Quiero chatear" (POST /api/v1/chatbot/chat)
          │  + Token JWT en el header
          ▼
    ┌────────────┐
    │  main.py   │ ← Punto de entrada. Crea la app FastAPI.
    │            │    Registra middlewares y rutas.
    └─────┬──────┘
          │
          │ Pasa por middlewares:
          │  1. CORS (¿origen permitido?)
          │  2. Logging (registrar quién pidió qué)
          │  3. Metrics (medir tiempos)
          │  4. Rate Limit (¿no está spameando?)
          │
          ▼
    ┌────────────┐
    │ chatbot.py │ ← Endpoint. Recibe el request.
    │            │    Valida datos con schemas (chat.py).
    │            │    Verifica JWT con auth dependency.
    └─────┬──────┘
          │
          │ "Datos válidos, usuario autenticado"
          │
          ▼
    ┌────────────┐
    │  graph.py  │ ← El CEREBRO. LangGraphAgent.
    │ (LangGraph)│    1. Busca memoria relevante (mem0)
    │            │    2. Prepara mensajes + system prompt
    │            │    3. Llama al LLM (OpenAI)
    │            │    4. Si necesita tools → las ejecuta → vuelve a llamar al LLM
    │            │    5. Guarda estado en PostgreSQL (checkpointer)
    │            │    6. Actualiza memoria a largo plazo
    └─────┬──────┘
          │
          │ Respuesta del agente
          │
          ▼
    ┌────────────┐
    │ chatbot.py │ ← Formatea la respuesta como ChatResponse
    └─────┬──────┘
          │
          ▼
     TU NAVEGADOR ← Recibe: {"messages": [{"role": "assistant", "content": "¡Hola!"}]}
```

---

# 📚 RECURSOS RECOMENDADOS

1. **FastAPI oficial** (en español): https://fastapi.tiangolo.com/es/
2. **Pydantic**: https://docs.pydantic.dev/
3. **SQLModel** (del mismo creador de FastAPI): https://sqlmodel.tiangolo.com/
4. **LangChain/LangGraph**: https://python.langchain.com/docs/
5. **JWT explicado visualmente**: https://jwt.io/

---

# ❓ PREGUNTAS QUE DEBERÍAS PODER RESPONDER

Nivel 1 (Básico):
- [ ] ¿Qué diferencia hay entre GET y POST?
- [ ] ¿Qué hace `@app.get("/saludo")`?
- [ ] ¿Por qué usamos Pydantic?

Nivel 2 (Intermedio):
- [ ] ¿Por qué separamos Models y Schemas?
- [ ] ¿Para qué sirve un JWT?
- [ ] ¿Qué es un middleware?

Nivel 3 (Avanzado):
- [ ] ¿Por qué el agente tiene un ciclo chat→tool→chat?
- [ ] ¿Qué beneficio da el checkpointer de PostgreSQL?
- [ ] ¿Por qué LLMService tiene fallback circular?
- [ ] ¿Qué es la memoria a largo plazo y cómo funciona con pgvector?
