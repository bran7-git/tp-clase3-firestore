# REFLEXIÓN – Trabajo Práctico Clase 2

**Materia:** Programación Avanzada  
**Tema:** Firebase SQL Connect – Modelo relacional y autorización  
**Proyecto:** Catálogo de Cursos

## 1. ¿Por qué ninguna operación recibe el ID del alumno como variable? ¿Qué es IDOR y cómo lo evita auth.uid?

Las operaciones no reciben el ID del alumno porque ese dato podría ser manipulado desde el navegador para acceder a información de otro usuario.

IDOR (Insecure Direct Object Reference) es una vulnerabilidad que ocurre cuando una aplicación permite acceder o modificar recursos de otros usuarios mediante identificadores que no se validan correctamente.

Para evitarlo, utilizamos `auth.uid`, que obtiene la identidad del usuario autenticado directamente desde Firebase Authentication. De esta manera, cada alumno solamente puede consultar, crear o eliminar sus propias inscripciones.

## 2. ¿Por qué ListCursos es PUBLIC y ListAlumnos es NO_ACCESS? ¿Cómo funcionaría el panel de administración?

`ListCursos` utiliza `PUBLIC` porque el catálogo de cursos debe poder consultarse sin iniciar sesión.

En cambio, `ListAlumnos` utiliza `NO_ACCESS` porque contiene información personal que no debe estar disponible públicamente ni para cualquier usuario autenticado.

Para implementar un panel de administración, utilizaría un backend seguro que verifique permisos de administrador mediante roles o claims personalizados antes de consultar los datos. No habilitaría `ListAlumnos` directamente para todos los usuarios.

## 3. ¿Qué ventaja tiene una clave primaria compuesta en Matricula frente a validar duplicados en el cliente?

La tabla `Matricula` utiliza una clave primaria compuesta por `alumno` y `curso`.

Esto garantiza desde la base de datos que un mismo alumno no pueda inscribirse dos veces en el mismo curso.

Es más seguro que validar duplicados solamente desde el cliente, porque las validaciones del navegador pueden omitirse y dos solicitudes simultáneas podrían intentar crear la misma inscripción.

Además, utilizamos `upsert` en lugar de `insert` para que repetir una inscripción no produzca duplicados ni errores por una clave existente.

## 4. ¿Por qué la configuración pública de Firebase no compromete la base de datos? ¿Qué aporta App Check?

La configuración de Firebase, incluyendo `apiKey` y `projectId`, permite identificar el proyecto y conectarse con sus servicios, pero no otorga automáticamente permisos para consultar o modificar información protegida.

La seguridad depende de Firebase Authentication y de las reglas de autorización `@auth` definidas en las operaciones de SQL Connect.

Como protección adicional, Firebase App Check permite verificar que las solicitudes provengan de una aplicación legítima, dificultando el abuso mediante scripts o clientes no autorizados. App Check complementa la autenticación y autorización, pero no las reemplaza.

## 5. ¿Qué ventajas y desventajas tiene SQL Connect frente a una API REST propia con Express y PostgreSQL?

SQL Connect permite trabajar con PostgreSQL sin desarrollar y mantener un servidor Express propio.

Las operaciones se definen previamente mediante archivos `.gql`, se ejecutan desde Firebase y permiten declarar autorización con `@auth`.

Esto reduce el código necesario para implementar consultas, mutaciones y controles de acceso.

Como desventaja, ofrece menos flexibilidad que una API REST propia para implementar lógica de negocio compleja, integraciones especiales o comportamientos personalizados del servidor. También genera mayor dependencia de los servicios de Firebase.

## 6. ¿Por qué no alcanzó con la CSP de la clase 1 y por qué conviene listar dominios exactos en connect-src?

La CSP de la clase 1 permitía conexiones principalmente al mismo origen mediante `connect-src 'self'`.

En esta práctica incorporamos Firebase Authentication y SQL Connect, que necesitan comunicarse con servicios externos de Google.

Por eso agregamos los orígenes necesarios:

- `https://identitytoolkit.googleapis.com`
- `https://securetoken.googleapis.com`
- `https://firebasedataconnect.googleapis.com`

Es preferible declarar dominios exactos en lugar de utilizar comodines como `https://*.googleapis.com`, porque así limitamos las conexiones permitidas y reducimos la superficie de ataque.

## Evidencias de auditoría de seguridad

**Antes de la corrección:** La operación `ListAlumnos` tenía acceso `PUBLIC`, lo que permitía consultar información personal sin autenticación. Se identificó como una vulnerabilidad de exposición de datos.

**Corrección aplicada:** Se modificó la operación para utilizar `@auth(level: NO_ACCESS)`.

**Después de la corrección:** Se ejecutó `npm run atacar` y la auditoría terminó con el mensaje:

`Todos los controles pasaron.`

Las pruebas incluyen acceso al catálogo público, protección de datos personales, rechazo de inscripciones anónimas, idempotencia y aislamiento de operaciones entre usuarios.

**Nota sobre evidencias:** La descripción anterior resume las pruebas realizadas. Las salidas originales de terminal o capturas del antes y después deben adjuntarse para cumplir completamente el entregable solicitado.

## Enlaces del proyecto

**Repositorio GitHub:**  
https://github.com/bran7-git/TP-PROG-AVANZADA-firebase-clase2

**Aplicación publicada:**  
https://tp-firebase-clase2.web.app

**Catálogo de cursos:**  
https://tp-firebase-clase2.web.app/cursos

**Mis inscripciones:**  
https://tp-firebase-clase2.web.app/mis-inscripciones
## Práctica 4 · Firestore

### 1. ¿Por qué el id del documento es el UID? ¿Qué tendrías que agregar (en reglas o en código) si usaras ids aleatorios con addDoc?

Utilizamos el UID de Firebase Authentication como identificador del documento para garantizar que cada usuario tenga una sola reseña por curso.

Esto permite crear, editar o eliminar su reseña utilizando siempre el mismo identificador.

Si utilizáramos identificadores aleatorios con `addDoc`, un mismo usuario podría crear varias reseñas. Para evitarlo, necesitaríamos agregar un mecanismo que compruebe que no existe otra reseña del mismo usuario, por ejemplo, mediante un documento de control y reglas que validen su existencia.

### 2. La reseña guarda una copia del nombre del autor. ¿Qué ganás y qué perdés con esa desnormalización? ¿Cómo resolverías el cambio de nombre?

Guardar el nombre del autor directamente en la reseña permite mostrarlo sin consultar otra colección o servicio.

La ventaja es que simplificamos las consultas y reducimos la cantidad de lecturas necesarias.

La desventaja es que, si el usuario cambia su nombre, las reseñas anteriores pueden conservar el nombre viejo.

Para solucionarlo, podríamos actualizar las reseñas del usuario cuando cambie su nombre o guardar solamente su UID y consultar el nombre actualizado desde su perfil.

### 3. ¿Qué diferencia hay entre resource.data y request.resource.data? Dá un ejemplo de regla que use ambos.

`resource.data` representa los datos que ya están guardados en Firestore antes de realizar una operación.

`request.resource.data` representa los datos que quedarían guardados después de una creación o modificación.

En nuestro proyecto utilizamos ambos para impedir que se modifique la fecha original de una reseña:

```javascript
request.resource.data.creadaEn == resource.data.creadaEn
```

De esta manera, el usuario puede editar su puntuación o comentario, pero no alterar la fecha de creación.

### 4. ¿Por qué la regla de creación exige creadaEn == request.time en lugar de confiar en la fecha del cliente?

Porque la fecha enviada desde el navegador podría ser modificada por el usuario.

Al exigir `creadaEn == request.time`, Firestore comprueba que la fecha corresponda al momento de la solicitud validado por el servidor.

En nuestra implementación utilizamos `serverTimestamp()` para generar ese valor y evitar que un usuario pueda inventar una fecha.

### 5. ¿Qué limitación tiene getAggregateFromServer y cómo afecta la experiencia de usuario? ¿Qué alternativas hay?

`getAggregateFromServer` permite calcular la cantidad de reseñas y el promedio de estrellas directamente en el servidor, sin descargar todos los documentos.

Su principal limitación es que no ofrece actualizaciones automáticas en tiempo real ni funciona sin conexión.

Esto significa que el promedio puede quedar desactualizado hasta realizar otra consulta.

En nuestro proyecto volvemos a consultar el resumen cuando `onSnapshot` detecta cambios en las reseñas.

Otra alternativa sería mantener el promedio y la cantidad en un documento de resumen actualizado desde el servidor mediante Cloud Functions.

### 6. Para inscripciones con cupo máximo, ¿usarías Firestore o SQL Connect? Justificá con lo que viste en las dos prácticas.

Utilizaría SQL Connect con PostgreSQL porque las inscripciones necesitan mantener relaciones entre alumnos y cursos, evitar duplicados y controlar que no se supere el cupo disponible.

PostgreSQL permite utilizar claves primarias, claves foráneas, restricciones y transacciones para mantener la integridad de los datos.

En cambio, Firestore resulta más conveniente para funcionalidades como las reseñas, donde necesitamos mostrar cambios en tiempo real y trabajar con documentos independientes.

Por eso, en nuestro proyecto utilizamos SQL Connect para los cursos y las inscripciones, y Cloud Firestore para las reseñas.