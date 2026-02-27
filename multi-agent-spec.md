# Sistema Multi-Agente Perplexity ↔ Gemini

**Documento técnico de especificación (v1.0)**  
*Stack objetivo: TypeScript · Next.js 15 (App Router) · Vercel Hobby (gratuito) · Perplexity Sonar Pro API · Gemini API*

---

## 1. Objetivo y alcance

Este documento define las especificaciones técnicas para construir un sistema web donde **dos agentes LLM (Perplexity y Gemini) debaten entre sí** sobre una propuesta del usuario, con:

- Orquestación del debate (multi-round loop) en el backend.
- Interfaz visual en tiempo real que muestra qué hace cada agente.
- Coste de infraestructura cero (deploy en Vercel Hobby), pagando únicamente tokens de API de modelos.[web:41][web:44]
- Implementación en TypeScript, sin acoplarse a un framework concreto de orquestación.

El documento **no contiene código fuente**, solo especificaciones detalladas, contratos y descripciones de comportamiento.

---

## 2. Requisitos funcionales

### 2.1 Roles de los agentes

Definir dos agentes con roles complementarios y bien acotados:

- **Agente Perplexity (Researcher)**
  - Modelo: `sonar-pro` vía Perplexity Sonar API (compatible con el SDK de OpenAI).[web:17][web:29]
  - Función principal: búsqueda y análisis de información actualizada, validación factual, identificación de riesgos.
  - Capacidad de citar fuentes externas y advertir cuando los datos sean inciertos.

- **Agente Gemini (Strategist)**
  - Modelo: `gemini-2.0-flash` o equivalente rápido de la familia Gemini vía SDK oficial `@google/generative-ai`.[web:21][web:27]
  - Función principal: síntesis estratégica, evaluación de viabilidad, búsqueda de ángulos más profitables, formulación de planes de acción.
  - Debe desafiar las conclusiones de Perplexity cuando detecte lagunas lógicas o riesgos no tratados.

### 2.2 Flujo de interacción usuario → sistema

1. El usuario introduce una **propuesta inicial** en el frontend (ejemplo: “Quiero una estrategia de arbitraje triangular entre DEX y CEX, maximizando profit con riesgo controlado”).
2. El frontend envía esta propuesta a un endpoint de inicialización del debate en el backend.
3. El backend crea una **sesión de debate** identificada de forma única.
4. El frontend abre un **stream SSE** asociado a la sesión.
5. El backend ejecuta rondas alternas de:
   - Turno de Perplexity (análisis factual, datos).
   - Turno de Gemini (estrategia, crítica, propuesta).
6. En cada turno, el backend emite eventos SSE con:
   - El agente que habla.
   - El número de ronda.
   - El contenido en streaming (tokens o chunks de texto).
   - Eventos de estado (inicio de ronda, fin de ronda, conclusión final).
7. El frontend actualiza en tiempo real un panel visual con dos columnas, una por agente, mostrando la conversación.
8. Al alcanzarse una condición de parada (máximo de rondas o consenso), el backend:
   - Genera una **conclusión estructurada** (ej. estrategia final, riesgos, pasos de implementación).
   - Emite un evento SSE de tipo `conclusion` con un payload JSON estructurado.

### 2.3 Condición de parada

Configurable, pero se recomienda:

- Número máximo de rondas configurable (ej. 3–6).
- Condición lógica adicional: si en alguna ronda Gemini produce explícitamente una **estructura final de plan** (por ejemplo, se obliga al modelo a responder con un bloque bien formateado cuando considere que está listo), el bucle termina aunque no se haya alcanzado el máximo de rondas.

### 2.4 Output final estructurado

El sistema debe terminar con un **objeto de alto nivel** que el frontend pueda mostrar y/o que pueda alimentar otros sistemas (bots, scripts), con al menos estos campos conceptuales:

- `strategySummary`: resumen textual breve de la estrategia acordada.
- `profitabilityModel`: descripción de cómo se espera generar beneficio.
- `riskAssessment`: listado de riesgos clave, clasificados por severidad.
- `constraints`: supuestos/condiciones bajo las que la estrategia es válida.
- `implementationSteps`: lista ordenada de pasos de implementación.
- `openQuestions`: cuestiones que los agentes consideran pendientes.

El documento no impone un formato JSON concreto, pero especifica que el **prompt de cierre** de Gemini debe instruirle para devolver una estructura consistente que pueda ser parseada de forma determinista.

---

## 3. Requisitos no funcionales

### 3.1 Coste y despliegue

- **Infraestructura**: desplegar en Vercel, plan Hobby (gratuito), usando Next.js como framework recomendado.[web:34][web:44]
- **Backend**: únicamente rutas de API serverless de Next.js; sin servidores dedicados.
- **Límites de Vercel**: el sistema debe diseñarse para respetar los límites de ejecución de funciones serverless y número de peticiones concurrentes del plan gratuito.[web:31][web:35]

### 3.2 Latencia y experiencia de usuario

- Se requiere **streaming de texto** (SSE) de ambos agentes para que el usuario vea “pensar” al sistema en tiempo real.
- La primera respuesta parcial de cada agente debería llegar en menos de ~2–4 segundos, dependiendo de la latencia de los modelos.
- El frontend debe manejar reconexiones SSE mínimas en caso de cortes breves.

### 3.3 Escalabilidad ligera en free tier

- El sistema debe soportar **múltiples sesiones concurrentes** de debate siempre que no se superen los límites de Vercel y de las APIs.
- No se usará base de datos externa en la versión inicial para mantener la gratuidad: las sesiones se gestionarían de forma efímera (en memoria del runtime de la función) sabiendo que no hay garantía de persistencia entre invocaciones.

### 3.4 Trazabilidad y logging

- Cada sesión de debate debe tener un `sessionId` único.
- De forma opcional, se pueden registrar estructuras de log (en consola, visible en Vercel Logs) con:
  - `sessionId`, número de ronda, agente, duración de llamada a API LLM, tokens usados.
- No se deben loguear datos sensibles del usuario en texto claro.

---

## 4. Integración con Perplexity Sonar Pro

### 4.1 Modelo y endpoint

- Modelo: `sonar-pro` como modelo generalista con capacidad de razonamiento y acceso a información actualizada.[web:16][web:26]
- API: Perplexity expone un endpoint **compatibles con el formato de OpenAI** (método `chat.completions.create`), lo que permite reutilizar SDKs y tipos de OpenAI en TypeScript.[web:17][web:29]

### 4.2 Autenticación

- Se usará una API key proporcionada por Perplexity.
- La clave se almacenará en variables de entorno del proyecto (p.ej. `PERPLEXITY_API_KEY`).
- No se envía nunca la API key al cliente; todas las llamadas se realizan desde el backend.

### 4.3 Configuración básica de las llamadas

Cada turno de Perplexity debe incluir como mínimo:

- `model`: `sonar-pro`.
- `messages`: historial de la conversación (ver sección 6), incluyendo:
  - Un mensaje `system` con el rol de Researcher (fijo para toda la sesión).
  - Mensajes `assistant` previos de Perplexity y Gemini.
  - El mensaje `user` con la propuesta inicial.
- Parámetros recomendados:
  - `temperature`: entre 0.2–0.5 para priorizar consistencia factual.
  - `max_tokens`: límite razonable para no explotar costes (ej. 800–1200 por turno).
  - `stream`: activado para obtener SSE desde el backend hacia el frontend.

El documento asume que se delega en el SDK/cliente HTTP concreto la mecánica de streaming; el contrato solo exige que el backend pueda:

1. Conectar a la API de Perplexity en modo streaming.
2. Recibir fragmentos de texto (tokens/chunks).
3. Reemitir esos fragmentos sobre el canal SSE hacia el frontend.

### 4.4 Pricing y límites

- `sonar-pro` se factura por tokens de entrada y salida; la documentación reciente sitúa los costes en el rango de unos pocos dólares por millón de tokens.[web:36][web:42]
- El sistema debe permitir configurar:
  - Número máximo de rondas por sesión.
  - Máximo de tokens por turno.

Con esto, es posible controlar el **coste máximo teórico por sesión de debate**.

---

## 5. Integración con Gemini API

### 5.1 Modelo y SDK

- Modelo recomendado: `gemini-2.0-flash` (o sucesor rápido disponible en el momento de implementación), pensado para respuestas ágiles.[web:30]
- SDK TypeScript oficial: `@google/generative-ai` (antes `@google-ai/generativelanguage`), con soporte para Node.js y navegadores.[web:21][web:27]

### 5.2 Autenticación

- Uso de API key de Google AI Studio o equivalente.
- Variable de entorno en el proyecto (p.ej. `GEMINI_API_KEY`).
- Llamadas siempre desde backend; el frontend nunca ve la clave.

### 5.3 Configuración de las llamadas

Cada turno de Gemini debe incluir como mínimo:

- Identificador del modelo (ej. `gemini-2.0-flash`).
- Un prompt compuesto por:
  - Un bloque de instrucciones de sistema: rol de Strategist.
  - Representación textual del historial (ver sección 6).
- Parámetros recomendados:
  - `temperature`: algo más alto que Perplexity (0.5–0.8) para fomentar creatividad estratégica.
  - `max_output_tokens`: similar o ligeramente superior a Perplexity.
  - Streaming activado en el SDK para reenviar chunks al SSE.

### 5.4 Free tier y límites

- El free tier de Gemini ofrece un número diario de llamadas gratuito (decenas a cientos de operaciones/día según modelo) y límites de tokens por minuto.[web:37][web:43]
- El sistema debe incluir:
  - Un mecanismo simple de rechazo amistoso si se detectan errores de rate limit (ej. mensaje de sistema notificando que hoy se ha alcanzado el límite de Gemini).
  - Configuración para conmutar a otro modelo Gemini menos costoso si fuera necesario.

---

## 6. Modelo de conversación y memoria de sesión

### 6.1 Representación conceptual del historial

Se define una abstracción de **mensaje de debate** con los siguientes campos conceptuales:

- `id`: identificador único del mensaje dentro de la sesión.
- `sessionId`: identificador de la sesión.
- `round`: número de ronda (entero, empezando por 1).
- `agent`: `"user" | "perplexity" | "gemini" | "system"`.
- `roleForLLM`: rol equivalente para la API (`system`, `user`, `assistant`).
- `content`: texto completo final del mensaje.
- `createdAt`: marca temporal.

Esta estructura no tiene por qué persistirse en una base de datos en la primera versión; puede vivir en memoria dentro del contexto de la función serverless mientras dure la petición SSE.

### 6.2 Construcción del prompt por agente

Para cada turno:

1. Se toma el historial completo de la sesión ordenado por `createdAt`.
2. Se traduce a la estructura de mensajes correspondiente a cada API:
   - En Perplexity (OpenAI-like): lista de objetos con `role` + `content`.
   - En Gemini: texto concatenado siguiendo un formato tipo chat (ej. `USER: ...`, `PERPLEXITY: ...`, `GEMINI: ...`).
3. Se añade el **mensaje de rol de sistema** específico del agente:
   - Perplexity: instrucción clara de actuar como investigador factual, con énfasis en precisión y referencias.
   - Gemini: instrucción clara de actuar como estratega agresivo pero responsable, obligado a considerar riesgos.

### 6.3 Memoria y trade-offs en serverless

Dado que en Vercel las funciones serverless no garantizan estado entre invocaciones, hay dos estrategias:

1. **Sesión acoplada a una única invocación de SSE**:
   - Cuando se inicia el SSE, el backend entra en un bucle que realiza todas las rondas en una única ejecución de la función.
   - No se necesita almacenamiento externo; el historial vive en memoria.
   - Es el enfoque recomendado para mantener coste cero y simplicidad.

2. **Sesión distribuida (no recomendada en v1)**:
   - Requeriría almacenamiento externo (Redis, base de datos) para persistir el historial entre invocaciones.
   - Aumenta complejidad y potencial coste.

Para la primera versión gratuita, el documento especifica el enfoque 1.

---

## 7. Orquestación del debate (backend)

### 7.1 Bucle de debate secuencial

La orquestación sigue este patrón:

1. Inicializar estructura de sesión con:
   - `sessionId`.
   - Propuesta inicial (mensaje de `user`).
   - Opciones de configuración (máx. rondas, límites de tokens…).
2. Para cada ronda `n` desde 1 hasta `maxRounds`:
   1. **Turno Perplexity**:
      - Construir prompt con historial completo.
      - Solicitar respuesta a la API de Perplexity con streaming.
      - A medida que llegan chunks, emitir eventos SSE al cliente marcados con `agent = "perplexity"` y `round = n`.
      - Al finalizar, guardar el mensaje completo en el historial.
   2. **Turno Gemini**:
      - Construir prompt con el nuevo historial (incluyendo la respuesta de Perplexity).
      - Solicitar respuesta a la API de Gemini con streaming.
      - Emitir eventos SSE con `agent = "gemini"` y `round = n`.
      - Al finalizar, guardar el mensaje completo en el historial.
   3. Evaluar condición de parada:
      - Si se ha alcanzado `maxRounds`, terminar.
      - Opcionalmente, analizar la última respuesta de Gemini para detectar si ha producido un bloque marcado como **conclusión** (mediante instrucciones en el prompt del estratega).
3. Al terminar el bucle:
   - Generar una **llamada final a Gemini** (o reutilizar la última, si ya es estructurada) para obtener el objeto de salida final (estrategia, riesgos, etc.).
   - Emitir un evento SSE final de tipo `"conclusion"` con ese objeto serializado.
   - Cerrar el stream SSE.

### 7.2 Manejo de errores y timeouts

El sistema debe contemplar:

- Errores de red hacia las APIs de modelos.
- Timeouts de respuesta.
- Rate limits (especialmente en Gemini free tier).[web:37][web:40]

Comportamiento esperado:

- Si falla un turno de Perplexity o Gemini:
  - Emitir un evento SSE de tipo `"error"` con un mensaje genérico para el usuario.
  - Opcionalmente, finalizar la sesión con una conclusión parcial basada en lo disponible.
- Establecer timeouts máximos por llamada LLM de forma que no se excedan los timeouts de Vercel Functions.

---

## 8. Protocolo SSE (Server-Sent Events)

### 8.1 Endpoint SSE

El sistema expone un endpoint de lectura (GET) que:

- Acepta un parámetro de sesión (por ejemplo, `sessionId` en query string) o cuerpo inicial con la propuesta.
- Establece una conexión `text/event-stream`.
- Escribe eventos SSE con el siguiente **modelo lógico**:

Campos conceptuales por evento:

- `type`: `"token" | "message_start" | "message_end" | "conclusion" | "error"`.
- `agent`: `"perplexity" | "gemini" | null` (en eventos globales puede ser null).
- `round`: número de ronda cuando aplica.
- `data`: payload textual o JSON serializado.

Ejemplos conceptuales:

- Inicio de mensaje de Perplexity en ronda 1:
  - `type = "message_start"`, `agent = "perplexity"`, `round = 1`.
- Token parcial de Gemini:
  - `type = "token"`, `agent = "gemini"`, `round = 2`, `data = "...texto parcial..."`.
- Fin de mensaje de Perplexity:
  - `type = "message_end"`, `agent = "perplexity"`, `round = 3`.
- Conclusión final:
  - `type = "conclusion"`, `data = "{ ...objeto JSON serializado... }"`.

### 8.2 Reconexión básica en frontend

El frontend, al usar `EventSource`:

- Debe mostrar un indicador de **conexión activa/inactiva**.
- En caso de error o cierre inesperado:
  - Informar al usuario.
  - No reintentar automáticamente sin su consentimiento para no duplicar coste.

---

## 9. Interfaz de usuario (frontend)

### 9.1 Diseño general

Se propone un layout a dos columnas, una para cada agente, más un área de resumen.

Estructura conceptual:

- **Barra superior**: título del sistema, estado de conexión, contador de rondas.
- **Zona central**:
  - Columna izquierda: historial de mensajes de Perplexity.
  - Columna derecha: historial de mensajes de Gemini.
  - Cada mensaje muestra:
    - Ronda.
    - Texto recibido.
    - Indicación visual de “escribiendo…” cuando llegan tokens nuevos.
- **Zona inferior**:
  - Campo de texto para la propuesta inicial.
  - Botón para iniciar un nuevo debate.
  - Opciones avanzadas (máx. rondas, perfil de riesgo, etc.).
- **Panel lateral o sección final**:
  - Visualización estructurada del `strategySummary`, `riskAssessment`, `implementationSteps`, etc., cuando exista una conclusión.

### 9.2 Estados de la UI

- **Idle**: sin sesión activa; campo de entrada habilitado.
- **Running**: sesión de debate en curso; se deshabilita el campo de entrada para esa sesión.
- **Completed**: sesión finalizada con conclusión.
- **Error**: sesión abortada por fallo técnico.

### 9.3 Visualización de la conversación

Para cada agente:

- Se mostrarán los mensajes ordenados por ronda.
- While streaming:
  - Se añade texto incrementalmente al último mensaje del agente correspondiente.
  - Se muestra un pequeño indicador (punto parpadeante, spinner) con la etiqueta “pensando…”.
- Al finalizar cada mensaje:
  - Se desactiva el indicador.
  - Se marca visualmente el final de la intervención en esa ronda.

### 9.4 Controles y parámetros ajustables

El usuario podrá (al menos):

- Definir la propuesta inicial.
- Seleccionar el número máximo de rondas.
- Elegir un “modo” (por ejemplo: conservador, equilibrado, agresivo) que influya en los prompts de los agentes (especialmente en el estratega Gemini).

---

## 10. Seguridad, privacidad y errores

### 10.1 Manejo de datos del usuario

- El sistema no debe persistir propuestas ni resultados en almacenamiento permanente en la versión gratuita.
- Advertir al usuario de que no introduzca datos altamente sensibles.

### 10.2 Gestión de errores y feedback

En caso de error técnico (timeout, fallo en APIs):

- Emitir un evento SSE `"error"`.
- Mostrar en la UI un mensaje claro y comprensible (ej. “Ha habido un problema al contactar con los modelos. Inténtalo de nuevo más tarde.”).

### 10.3 Limitar abuso/coste

- Implementar, a nivel de frontend, restricciones mínimas como:
  - Tamaño máximo de la propuesta inicial.
  - Número máximo de sesiones por unidad de tiempo (soft limit).
- A nivel backend, se recomienda un simple rate limit por IP cuando sea viable, aun sin infraestructura adicional, usando soluciones ligeras (p.ej. contadores en memoria para la vida de la función, sabiendo que es best-effort).

---

## 11. Configuración y despliegue

### 11.1 Variables de entorno mínimas

- `PERPLEXITY_API_KEY`: clave API de Perplexity Sonar.
- `GEMINI_API_KEY`: clave API de Google Gemini.
- Opcionalmente:
  - `DEBATE_MAX_ROUNDS_DEFAULT`.
  - `DEBATE_MAX_TOKENS_PER_TURN`.

### 11.2 Despliegue en Vercel (visión general)

- Repositorio Git con proyecto Next.js configurado.
- Conexión del repositorio a Vercel.[web:34][web:44]
- Definición de variables de entorno en el panel de Vercel para producción y preview.
- Configuración de funciones serverless por defecto (no se requiere ninguna regla especial).

### 11.3 Logs y monitorización básica

- Uso de los logs estándar de Vercel para revisar:
  - Errores de runtime.
  - Excepciones no capturadas.
  - Métricas aproximadas de uso (número de invocaciones de la función SSE, etc.).[web:31]

---

## 12. Posibles extensiones futuras

Aunque fuera del alcance de la v1, se contemplan estas extensiones:

- Añadir más agentes (por ejemplo, un agente de “Risk Officer” adicional).
- Incorporar almacenamiento persistente para poder reanudar debates o consultarlos posteriormente.
- Integrar mecanismos de feedback del usuario (thumbs up/down) sobre estrategias propuestas.
- Añadir gráficos o paneles numéricos si las estrategias incluyen métricas cuantitativas.

---

## 13. Resumen ejecutivo

Este sistema define un **entorno multi-agente autónomo** accesible vía web, donde un usuario experto en software puede lanzar propuestas complejas (por ejemplo, estrategias DeFi) y observar cómo **Perplexity (Researcher) y Gemini (Strategist) dialogan y convergen hacia un plan profitable**, todo ello:

- Sin coste de infraestructura (Vercel Hobby + Next.js).[web:41][web:44]
- Aprovechando la API de Perplexity Sonar Pro (OpenAI-compatible) para investigación factual.[web:17][web:29]
- Utilizando Gemini con el SDK oficial en TypeScript para la parte estratégica.[web:21][web:27]
- Presentando un flujo visual claro donde se ve qué hace cada agente en tiempo real.

El presente documento sirve como **blueprint técnico** para implementar la solución directamente en TypeScript, sin cerrar decisiones de detalle de implementación, pero marcando todos los contratos y comportamientos esenciales del sistema.