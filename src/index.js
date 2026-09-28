const express = require("express");
const morgan = require("morgan");
const expressLayouts = require("express-ejs-layouts");
const path = require("node:path");

const PORT = 3000;

// Middleware personalizado global para asignar un identificador de forma consecutiva a cada solicitud.
let numeroDeSolicitud = 0;
function identificarSolicitud(req, res, next) {
    numeroDeSolicitud += 1;
    res.locals.solicitudId = `BIB-${String(numeroDeSolicitud).padStart(4, "0")}`;
    next();
}

// Middleware personalizado global para medir la duración de la solicitud hasta que termina la respuesta.
function medirDuracion(req, res, next) {
    const inicio = process.hrtime.bigint();
    res.on("finish", () => {
        const fin = process.hrtime.bigint();
        const milisegundos = Number(fin - inicio) / 1_000_000;
        console.log(
            `ID: ${res.locals.solicitudId}\nMetodo: ${req.method}\nURL original: ${req.originalUrl}\nStatus Code: ${res.statusCode}\nDuración: ${milisegundos.toFixed(2)} ms`
        );
    });
    next();
}

async function main() {

    const salasPermitidas = ["Sala Norte", "Sala Sur", "Sala Multimedia"];
    const turnosPermitidos = ["Mañana", "Tarde", "Noche"];

    // Datos iniciales en memoria. Las altas nuevas se agregan a este arreglo y se pierden al reiniciar el proceso
    const reservas = [
        {
            id: 1,
            estudiante: "Mariela Gómez",
            email: "marigomez@gmail.com",
            sala: "Sala Norte",
            fecha: "2026-09-25",
            turno: "Mañana",
            personas: 4
        },
        {
            id: 2,
            estudiante: "Marcos Batallán",
            email: "marcosbat@gmail.com",
            sala: "Sala Sur",
            fecha: "2026-09-24",
            turno: "Tarde",
            personas: 6
        },
        {
            id: 3,
            estudiante: "Juan Cruz López",
            email: "jclopez@gmail.com",
            sala: "Sala Multimedia",
            fecha: "2026-09-25",
            turno: "Noche",
            personas: 3
        },
        {
            id: 4,
            estudiante: "María Rodriguez",
            email: "mrodriguez@gmail.com",
            sala: "Sala Norte",
            fecha: "2026-09-25",
            turno: "Tarde",
            personas: 5
        }
    ];

    let proximoId = reservas.length + 1;

    // Middleware de validación aplicado únicamente al POST /reservas.
    // Normaliza los datos recibidos, verifica cada regla del formulario y,
    // ante un error, corta el ciclo con un 400 conservando lo que el usuario
    // ya había escrito. Si todo es válido, deja los datos listos en
    // req.reservaValidada y delega en el handler final con next().
    function validarReserva(req, res, next) {
        const cuerpo = req.body || {};

        const valores = {
            estudiante: String(cuerpo.estudiante ?? "").trim(),
            email: String(cuerpo.email ?? "").trim(),
            sala: String(cuerpo.sala ?? "").trim(),
            fecha: String(cuerpo.fecha ?? "").trim(),
            turno: String(cuerpo.turno ?? "").trim(),
            personas: cuerpo.personas,
        };

        const personasNumero = Number(valores.personas);

        const errores = [];

        if (!valores.estudiante) errores.push("El nombre del estudiante es obligatorio.");
        if (!valores.email) {
            errores.push("El email es obligatorio.");
        } else if (!valores.email.includes("@")) {
            errores.push("El email debe contener un @ válido.");
        }
        if (!valores.fecha) errores.push("La fecha es obligatoria.");
        if (!salasPermitidas.includes(valores.sala)) {
            errores.push("Debe seleccionar una sala permitida.");
        }
        if (!turnosPermitidos.includes(valores.turno)) {
            errores.push("Debe seleccionar un turno permitido.");
        }
        if (!Number.isInteger(personasNumero) || personasNumero < 1 || personasNumero > 6) {
            errores.push("La cantidad de personas debe ser un entero entre 1 y 6.");
        }

        if (errores.length > 0) {
            return res.status(400).render("reservas/nueva", {
                titulo: "Nueva reserva",
                salasPermitidas,
                turnosPermitidos,
                valores,
                errores,
            });
        }

        req.reservaValidada = {
            estudiante: valores.estudiante,
            email: valores.email,
            sala: valores.sala,
            fecha: valores.fecha,
            turno: valores.turno,
            personas: personasNumero,
        };

        next();
    };

    // Handler final del POST. Ya no repite la validación: solo agrega en memoria y redirige al listado.
    function crearReserva(req, res) {
        const nuevaReserva = {
            id: proximoId,
            ...req.reservaValidada,
        };
        proximoId += 1;
        reservas.push(nuevaReserva);
        res.redirect("/reservas");
    };

    const app = express();

    app.set("view engine", "ejs");
    app.set("views", path.join(__dirname, "..", "views"));
    app.set("layout", "layouts/main");

    // --- Pipeline global ---
    app.use(morgan("dev")); // Middleware de terceros: registra cada solicitud en consola.
    app.use(identificarSolicitud); // Middleware personalizado global #1.
    app.use(medirDuracion); // Middleware personalizado global #2.
    app.use(expressLayouts); // Habilita el layout principal para las vistas EJS.
    app.use(express.static(path.join(__dirname, "..", "public"))); // Recursos estáticos incorporados.
    app.use(express.urlencoded({ extended: true })); // Parser incorporado para formularios.
    app.use(express.json()); // Parser incorporado para JSON (no lo usa el formulario, pero queda disponible).

    // --- Rutas de aplicación ---
    app.get("/", (req, res) => {
        res.render("inicio", { titulo: "Inicio" });
    });

    app.get("/estado", (req, res) => {
        res.json({
            servicio: "activo",
            reservas: reservas.length,
            solicitudId: res.locals.solicitudId,
        });
    });

    // --- Router de reservas ---
    const reservasRouter = express.Router();

    // Middleware de router: se aplica a todo lo montado bajo /reservas.
    function prepararAreaReservas(req, res, next) {
        res.locals.seccion = "Reservas de salas";
        next();
    }
    reservasRouter.use(prepararAreaReservas);

    reservasRouter.get("/", (req, res) => {
        res.render("reservas/lista", {
            titulo: "Reservas",
            reservas,
        });
    });

    // Debe declararse antes de /:id para que "nueva" no se interprete como un id.
    reservasRouter.get("/nueva", (req, res) => {
        res.render("reservas/nueva", {
            titulo: "Nueva reserva",
            salasPermitidas,
            turnosPermitidos,
            valores: {},
            errores: [],
        });
    });

    reservasRouter.get("/:id", (req, res) => {
        const id = Number(req.params.id);
        const reserva = reservas.find((item) => item.id === id);

        if (!reserva) {
            return res.status(404).render("no-encontrado", {
                titulo: "Reserva no encontrada",
                mensaje: "La reserva solicitada no existe.",
            });
        }

        res.render("reservas/detalle", {
            titulo: "Detalle de reserva",
            reserva,
        });
    });

    reservasRouter.post("/", validarReserva, crearReserva);

    app.use("/reservas", reservasRouter);

    // --- Página 404: al final de todo el pipeline ---
    app.use((req, res) => {
        res.status(404).render("no-encontrado", {
            titulo: "Página no encontrada",
            mensaje: "La dirección solicitada no existe.",
        });
    });

    app.listen(PORT, () => {
        console.log(`Aplicación escuchando en http://localhost:${PORT}`);
    });
}

main().catch((error) => {
    console.error("No se pudo iniciar el servidor", error);
    process.exitCode = 1;
});