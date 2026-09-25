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

    const app = express();

    app.use(morgan("dev"));
    app.use(identificarSolicitud);
    app.use(medirDuracion);

    app.listen(PORT, () => {
        console.log(`Aplicación escuchando en http://localhost:${PORT}`);
    });
}

main().catch((error) => {
    console.error("No se pudo iniciar el servidor", error);
    process.exitCode = 1;
});