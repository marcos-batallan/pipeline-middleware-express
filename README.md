# Trabajo práctico 05 - Pipeline de middleware en Express

## Descripción

Aplicación web desarrollada con **Node.js, Express y EJS** para gestionar reservas temporales de salas de estudio.

El proyecto tiene como objetivo poner en práctica el funcionamiento de un **pipeline de middleware en Express**, diferenciando entre:

- middleware de terceros;
- middleware incorporado de Express;
- middleware global personalizado;
- middleware aplicado a un router;
- middleware de validación específico para una ruta.

Las reservas se mantienen **únicamente en memoria**. Las nuevas reservas se agregan al arreglo durante la ejecución del servidor, pero se pierden al reiniciar la app.

La aplicación permite:

- consultar las reservas existentes;
- visualizar el detalle de una reserva;
- crear nuevas reservas;
- validar los datos enviados mediante middleware;
- consultar el estado del servicio;
- identificar cada solicitud mediante un ID;
- medir la duración de cada solicitud;
- mostrar páginas 400 y 404 según corresponda.

---

## Tecnologías utilizadas

- Node.js
- Express
- EJS
- express-ejs-layouts
- Morgan
- HTML5
- CSS3

---

## Instalación

Clonar el repositorio y acceder a la carpeta del proyecto:

```bash
git clone https://github.com/marcos-batallan/pipeline-middleware-express.git
cd pipeline-middleware-express
```

Instalar las dependencias:

```bash
npm install
```

---

## Ejecución

Para iniciar el servidor:

```bash
npm start
```

La aplicación queda disponible en:

```text
http://localhost:3000
```

Para verificar la sintaxis de `src/index.js`:

```bash
npm run check
```

---

## Páginas y rutas

| Método | Ruta | Descripción | Respuesta esperada |
|---|---|---|---|
| GET | `/` | Página de inicio | 200 |
| GET | `/estado` | Estado del servicio y cantidad de reservas | 200 JSON |
| GET | `/reservas` | Listado de reservas | 200 |
| GET | `/reservas/nueva` | Formulario de nueva reserva | 200 |
| GET | `/reservas/:id` | Detalle de una reserva | 200 / 404 |
| POST | `/reservas` | Validación y creación de una reserva | 302 / 400 |
| GET | URL inexistente | Página final de error | 404 |

### Importante sobre el orden de las rutas

Dentro del router de reservas, `/nueva` se declara antes que `/:id`:

```text
/reservas/nueva
/reservas/:id
```

Esto evita que la palabra `nueva` sea interpretada como un identificador de reserva.

---

## Estructura del proyecto

```text
pipeline-middleware-express/
├── public/
│   ├── css/
│   │   └── estilos.css
│   └── img/
│       ├── favicon.svg
│       └── salas-estudio.svg
├── src/
│   └── index.js
├── views/
│   ├── layouts/
│   │   └── main.ejs
│   ├── partials/
│   │   ├── encabezado.ejs
│   │   └── pie.ejs
│   ├── reservas/
│   │   ├── detalle.ejs
│   │   ├── lista.ejs
│   │   └── nueva.ejs
│   ├── inicio.ejs
│   └── no-encontrado.ejs
├── .gitignore
├── package-lock.json
├── package.json
└── README.md
```

---

## Pipeline de middleware

El pipeline global de la aplicación se organiza de la siguiente manera:

```text
Morgan
   ↓
identificarSolicitud
   ↓
medirDuracion
   ↓
expressLayouts
   ↓
express.static
   ↓
express.urlencoded
   ↓
express.json
   ↓
Rutas de aplicación
   ↓
Router /reservas
   ↓
404 final
```

### ¿Por qué este orden?

**Morgan** se ejecuta al comienzo para registrar las solicitudes HTTP.

**identificarSolicitud** genera un identificador consecutivo para cada solicitud y lo guarda en:

```js
res.locals.solicitudId
```

**medirDuracion** registra el momento inicial y utiliza el evento `finish` de la respuesta para calcular cuánto tardó en completarse la solicitud.

**expressLayouts** habilita el layout principal utilizado por las vistas EJS.

**express.static** permite servir los recursos estáticos ubicados en `public/`.

**express.urlencoded** procesa los datos enviados por formularios HTML y los deja disponibles en:

```js
req.body
```

**express.json** habilita el procesamiento de solicitudes que envíen datos en formato JSON.

Luego se ejecutan las rutas de la aplicación, el router de reservas y finalmente el middleware 404, que solo se alcanza cuando ninguna ruta anterior respondió.

---

## Middlewares utilizados

### Morgan

Se utiliza el middleware de terceros:

```js
app.use(morgan("dev"));
```

Permite registrar en la terminal información de cada solicitud, incluyendo método, ruta y estado HTTP.

Durante las pruebas pueden observarse respuestas:

```text
200
302
400
404
```

---

### `identificarSolicitud`

Es el middleware personalizado global que genera identificadores consecutivos con el formato:

```text
BIB-0001
BIB-0002
BIB-0003
...
```

El identificador se guarda en:

```js
res.locals.solicitudId
```

Esto permite utilizarlo tanto durante el procesamiento de la solicitud como en las vistas.

---

### `medirDuracion`

Es el middleware personalizado global que guarda el momento de inicio mediante:

```js
process.hrtime.bigint()
```

Luego registra un listener para calcular la duración cuando la respuesta ya terminó:

```js
res.on("finish", ...)
```

En la terminal se informa:

```text
ID
Método
URL original
Status Code
Duración
```

No se calcula la duración antes de finalizar la respuesta porque el código de estado definitivo se conoce al terminar el procesamiento.

---

### `prepararAreaReservas`

Middleware aplicado al router `/reservas`.

Establece:

```js
res.locals.seccion = "Reservas de salas";
```

De esta forma, las vistas correspondientes al área de reservas pueden utilizar el nombre de la sección.

Este middleware no afecta a `/estado`, porque esa ruta está fuera del router de reservas.

---

### `validarReserva`

Este middleware es específico del:

```text
POST /reservas
```

Su responsabilidad es recibir los datos enviados por el formulario, normalizarlos, validar cada regla y decidir si la solicitud puede continuar.

Si existen errores:

```text
POST /reservas
↓
validarReserva
↓
400
↓
render nueva.ejs
```

Si los datos son válidos:

```text
POST /reservas
↓
validarReserva
↓
req.reservaValidada
↓
next()
↓
crearReserva
```

---

## Router de reservas

Se utiliza:

```js
const reservasRouter = express.Router();

app.use("/reservas", reservasRouter);
```

Las rutas internas del router no repiten el prefijo `/reservas`.

Por ejemplo:

```js
reservasRouter.get("/", ...);
reservasRouter.get("/nueva", ...);
reservasRouter.get("/:id", ...);
reservasRouter.post("/", ...);
```

Por lo tanto, Express las expone como:

```text
GET  /reservas
GET  /reservas/nueva
GET  /reservas/:id
POST /reservas
```

---

## Flujo del POST válido

El recorrido completo solicitado para una reserva válida es:

```text
POST /reservas
        ↓
morgan("dev")
        ↓
identificarSolicitud
        ↓
medirDuracion
        ↓
expressLayouts
        ↓
express.urlencoded
        ↓
reservasRouter
        ↓
prepararAreaReservas
        ↓
validarReserva
        ↓
crearReserva
        ↓
302 /reservas
        ↓
finish: ID + estado + duración
```

El `302` se produce mediante:

```js
res.redirect("/reservas");
```

Después de la redirección, el navegador realiza un nuevo:

```text
GET /reservas
```

que muestra la nueva reserva agregada al arreglo en memoria.

---

## Flujo del POST inválido

Cuando los datos no cumplen las reglas:

```text
POST /reservas
        ↓
morgan("dev")
        ↓
identificarSolicitud
        ↓
medirDuracion
        ↓
express.urlencoded
        ↓
reservasRouter
        ↓
prepararAreaReservas
        ↓
validarReserva
        ↓
400
        ↓
render reservas/nueva
        ↓
finish: ID + estado + duración
```

La solicitud termina dentro del middleware de validación.

No se ejecuta `crearReserva`, por lo que la reserva inválida no se agrega al arreglo.

---

## Validación de reservas

El middleware `validarReserva` verifica los siguientes datos:

### Estudiante

Debe existir un nombre no vacío después de aplicar `trim()`.

### Email

Debe ser obligatorio y contener:

```text
@
```

### Sala

Debe pertenecer a las salas permitidas:

```text
Sala Norte
Sala Sur
Sala Multimedia
```

### Fecha

Debe estar presente.

### Turno

Debe pertenecer a:

```text
Mañana
Tarde
Noche
```

### Personas

Debe ser un número entero entre:

```text
1 y 6
```

La validación se realiza en el servidor independientemente de las validaciones HTML del formulario.

Cuando existe un error, se devuelve:

```text
HTTP 400
```

y se conservan los valores enviados para que puedan visualizarse nuevamente en el formulario.

Los mensajes se presentan mediante un elemento:

```html
role="alert"
```

---

## Datos y persistencia temporal

Las reservas iniciales se encuentran definidas directamente en `src/index.js`.

La aplicación comienza con cuatro reservas.

Las nuevas reservas se agregan al arreglo durante la ejecución:

```js
reservas.push(nuevaReserva);
```

El identificador de cada nueva reserva se genera mediante un contador incremental.

No existe persistencia permanente.

Por este motivo:

```text
Servidor iniciado
      ↓
4 reservas iniciales
      ↓
Nueva reserva
      ↓
5 reservas
      ↓
Reinicio del servidor
      ↓
4 reservas iniciales
```

Los datos agregados durante una ejecución se pierden al reiniciar el proceso.

---

## Recursos estáticos

Los recursos estáticos se encuentran dentro de:

```text
public/
```

Actualmente se utilizan:

```text
public/css/estilos.css
public/img/favicon.svg
public/img/salas-estudio.svg
```

Express los sirve mediante:

```js
app.use(express.static(...));
```

---

## Vistas

### `inicio.ejs`

Presenta el propósito de la aplicación y permite acceder al listado de reservas y al formulario de alta.

### `reservas/lista.ejs`

Muestra las reservas existentes.

Cada reserva permite acceder a su detalle.

También contempla un estado vacío cuando no existen reservas.

### `reservas/detalle.ejs`

Muestra todos los datos correspondientes a una reserva.

Si el identificador solicitado no existe, se devuelve una página 404.

### `reservas/nueva.ejs`

Contiene el formulario para crear una nueva reserva.

Incluye controles para:

- estudiante;
- email;
- sala;
- fecha;
- turno;
- cantidad de personas.

También muestra los errores de validación y conserva los valores enviados cuando la solicitud es rechazada.

### `no-encontrado.ejs`

Vista utilizada para las respuestas 404.

Se utiliza tanto para:

- URLs inexistentes;
- reservas inexistentes.

### Layout y parciales

El proyecto utiliza un layout principal:

```text
views/layouts/main.ejs
```

y parciales para organizar el encabezado y pie de página.

---

## Accesibilidad

Se incorporaron algunas prácticas básicas de accesibilidad:

- `lang="es"` en el documento HTML;
- `meta charset="UTF-8"`;
- `meta viewport`;
- etiquetas `<label>` asociadas mediante `for` e `id`;
- navegación principal identificada con `aria-label`;
- mensajes de error con `role="alert"`;
- enlaces navegables;
- foco visible mediante `:focus-visible`;
- contenido dinámico mostrado mediante expresiones EJS escapadas;
- identificador de solicitud visible de manera discreta en el pie de página.

---

## Página 404

El middleware 404 se registra después de todas las rutas:

```js
app.use((req, res) => {
    res.status(404).render("no-encontrado", {
        titulo: "Página no encontrada",
        mensaje: "La dirección solicitada no existe.",
    });
});
```

Su posición al final permite que actúe como último recurso cuando ninguna ruta anterior respondió.

No se utiliza `next()` después del `render`, porque la respuesta ya fue finalizada.

---

## Pruebas manuales

La siguiente matriz permite comprobar el comportamiento requerido por el contrato.

| Prueba | Resultado esperado |
|---|---|
| GET `/` | 200 |
| GET `/estado` | 200 y JSON |
| GET `/reservas` | 200 y al menos 4 reservas iniciales |
| GET `/reservas/nueva` | 200 |
| GET `/reservas/1` | 200 |
| GET `/reservas/999` | 404 HTML |
| GET `/ruta-inexistente` | 404 HTML |
| POST `/reservas` con datos válidos | 302 |
| GET posterior a `/reservas` | nueva reserva visible |
| POST con estudiante vacío | 400 |
| POST con email vacío | 400 |
| POST con email sin `@` | 400 |
| POST con sala inválida | 400 |
| POST con turno inválido | 400 |
| POST con fecha vacía | 400 |
| POST con personas `0` | 400 |
| POST con personas `7` | 400 |
| POST con personas no enteras | 400 |
| Reiniciar servidor | vuelven las 4 reservas iniciales |

Durante las pruebas también debe verificarse en la terminal la presencia de:

```text
Morgan
BIB-XXXX
método HTTP
URL
Status Code
duración en ms
```

---

## Pruebas en detalle realizadas con Postman

Las rutas y respuestas HTTP fueron verificadas manualmente mediante **Postman**.

### Reserva válida

Enviar una solicitud:

```text
POST http://localhost:3000/reservas
```

En **Body → x-www-form-urlencoded**:

| Key          | Value           |
| ------------ | --------------- |
| `estudiante` | `Ana`           |
| `email`      | `ana@gmail.com` |
| `sala`       | `Sala Norte`    |
| `fecha`      | `2026-09-30`    |
| `turno`      | `Mañana`        |
| `personas`   | `2`             |

Resultado esperado:

```text
HTTP 302 Found
```

La respuesta redirige a:

```text
/reservas
```

y la nueva reserva aparece en el listado.

### Email inválido

Enviar:

```text
POST http://localhost:3000/reservas
```

con un email sin `@`:

| Key          | Value          |
| ------------ | -------------- |
| `estudiante` | `Ana`          |
| `email`      | `anagmail.com` |
| `sala`       | `Sala Norte`   |
| `fecha`      | `2026-09-30`   |
| `turno`      | `Mañana`       |
| `personas`   | `2`            |

Resultado esperado:

```text
HTTP 400 Bad Request
```

El formulario vuelve a mostrarse con el mensaje de error y los valores enviados conservados.

### Sala inválida

Enviar:

```text
POST http://localhost:3000/reservas
```

con:

```text
sala = Sala Inexistente
```

Resultado esperado:

```text
HTTP 400 Bad Request
```

### Turno inválido

Enviar:

```text
POST http://localhost:3000/reservas
```

con:

```text
turno = Madrugada
```

Resultado esperado:

```text
HTTP 400 Bad Request
```

### Cantidad de personas fuera de rango

Probar los siguientes valores:

```text
personas = 0
personas = 7
```

Resultado esperado en ambos casos:

```text
HTTP 400 Bad Request
```

La cantidad válida debe ser un número entero entre `1` y `6`.

### Campos obligatorios vacíos

Probar el envío dejando vacíos los campos obligatorios, por ejemplo:

```text
estudiante =
email =
sala =
fecha =
turno =
personas =
```

Resultado esperado:

```text
HTTP 400 Bad Request
```

Los valores enviados se conservan en el formulario y se muestran los errores correspondientes.

### Reserva inexistente

Enviar:

```text
GET http://localhost:3000/reservas/999
```

Resultado esperado:

```text
HTTP 404 Not Found
```

La respuesta muestra la página HTML de recurso no encontrado.

### URL inexistente

Enviar:

```text
GET http://localhost:3000/ruta-inexistente
```

Resultado esperado:

```text
HTTP 404 Not Found
```

La respuesta utiliza la página final `no-encontrado.ejs`.

### Estado del servicio

Enviar:

```text
GET http://localhost:3000/estado
```

Resultado esperado:

```text
HTTP 200 OK
```

La respuesta es JSON y contiene:

```json
{
    "servicio": "activo",
    "reservas": 4,
    "solicitudId": "BIB-0001"
}
```

Los valores de `reservas` y `solicitudId` varían según el estado actual de la aplicación.

### Verificación del pipeline

Durante las pruebas también se verifica la salida de la terminal.

Cada solicitud debe mostrar información de Morgan y del middleware de medición, incluyendo:

```text
BIB-XXXX
Método
URL original
Status Code
Duración
```

De esta manera se pueden comprobar los distintos resultados HTTP:

```text
200 → solicitudes exitosas
302 → redirección después de crear una reserva
400 → datos inválidos
404 → recurso o URL inexistente
```

## Alcance del trabajo práctico

El proyecto se mantiene dentro del alcance solicitado y no se incorporan:

- base de datos;
- persistencia en archivos;
- autenticación;
- sesiones;
- cookies;
- controllers;
- services;
- routers separados;
- middleware central de errores;
- rate limiting;
- sanitización avanzada;
- pruebas automatizadas.

El objetivo principal es demostrar el funcionamiento y el orden de un pipeline de middleware en Express.

---

## Resultado esperado

Al ejecutar la aplicación correctamente debe ser posible recorrer el siguiente flujo:

```text
Inicio
  ↓
Listado de reservas
  ↓
Nueva reserva
  ↓
POST
  ↓
Validación
  ├── datos inválidos → 400 + formulario con errores
  │
  └── datos válidos → crear reserva → 302
                                  ↓
                              /reservas
```

Todas las solicitudes pasan por los middlewares globales correspondientes y quedan registradas mediante Morgan, mientras que el middleware de duración informa el tiempo total al finalizar cada respuesta.
