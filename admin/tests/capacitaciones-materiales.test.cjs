"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../admin.js"), "utf8");
const start = source.indexOf("function recursosATexto(recursos)");
const end = source.indexOf("function fechaTextoES(", start);
assert.ok(start >= 0 && end > start, "Funciones de materiales presentes");
const sandbox = {};
vm.runInNewContext(source.slice(start, end), sandbox);

const materiales = [
  { titulo: "SESIÓN CON REDES DEL DUA", url: "https://docs.google.com/document/d/uno/edit", descripcion: "Documento Word compartido por la ponente." },
  { titulo: "ABP SESIONES", url: "https://docs.google.com/document/d/dos/edit", descripcion: "Documento Word compartido por la ponente." },
  { titulo: "SESIÓN CyT UNIDAD PRIMERO", url: "https://docs.google.com/document/d/tres/edit", descripcion: "Documento Word compartido por la ponente." },
  { titulo: "INGLÉS SESIÓN DE CLASE CON DUA", url: "https://docs.google.com/document/d/cuatro/edit", descripcion: "Documento Word compartido por la ponente." },
  { titulo: "EVALUACIÓN DE SALIDA", url: "https://docs.google.com/document/d/cinco/edit", descripcion: "Documento Word compartido por la ponente." },
  { titulo: "SESION DUA CEBE", url: "https://docs.google.com/document/d/seis/edit", descripcion: "Documento Word compartido por la ponente." },
  { titulo: "ACTIVIDAD DE APRENDIZAJE - 4°", url: "https://docs.google.com/document/d/siete/edit", descripcion: "Documento Word compartido por la ponente." }
];

test("siete materiales conservan siete líneas y siete registros después de editar solo el video", () => {
  const texto = sandbox.recursosATexto(materiales);
  assert.equal(texto.split("\n").length, 7);
  const videoActualizado = "https://drive.google.com/file/d/video-nuevo/view";
  assert.ok(videoActualizado.includes("/view"));
  const guardados = sandbox.textoARecursos(texto);
  assert.equal(guardados.length, 7);
  assert.deepEqual(JSON.parse(JSON.stringify(guardados)), materiales);
});

test("acepta saltos de línea Windows CRLF", () => {
  const entrada = sandbox.recursosATexto(materiales).replace(/\n/g, "\r\n");
  assert.equal(sandbox.textoARecursos(entrada).length, 7);
});

test("rechaza materiales sin URL", () => {
  assert.throws(() => sandbox.textoARecursos("Sin enlace"), /Título \| URL/);
});
