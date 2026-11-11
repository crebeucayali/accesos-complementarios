"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const codigo = fs.readFileSync(path.resolve(__dirname, "../../estadisticas/visitas-eva.js"), "utf8");
const pausa = () => new Promise(resolve => setImmediate(resolve));

function contexto({ almacen, estado, modulo = "principal", now = () => 1000000, locks = true }) {
  const listeners = new Map();
  const html = { dataset: {} };
  const document = {
    currentScript: { dataset: { evaModulo: modulo } },
    documentElement: html,
    querySelector: () => null,
    addEventListener: (event, fn) => listeners.set(event, fn),
    visibilityState: "visible"
  };
  const windowListeners = new Map();
  const window = { addEventListener: (event, fn) => windowListeners.set(event, fn) };
  const localStorage = {
    getItem: key => almacen.has(key) ? almacen.get(key) : null,
    setItem: (key, value) => almacen.set(key, value)
  };
  const requests = [];
  const fetch = async (url, options) => {
    requests.push({ url, options });
    if (url.includes("registrar_visita_eva_hito")) {
      if (estado.fallar) return { ok: false, status: 503 };
      return { ok: true, text: async () => '{"hito":null}' };
    }
    return { ok: true, text: async () => '[{"total":1,"hoy":1}]' };
  };
  const fakeDate = class extends Date { static now() { return now(); } };
  const navegador = locks ? { locks: { request: async (name, opts, cb) => {
    const previo = estado.cola || Promise.resolve();
    const actual = previo.then(cb);
    estado.cola = actual.catch(() => {});
    return actual;
  } } } : {};
  vm.runInNewContext(codigo, {
    document, window, localStorage, navigator: navegador, fetch, Date: fakeDate,
    console: { warn: () => {} }, Intl, Number, JSON, String, Set
  });
  return { listeners: windowListeners, requests, html };
}

test("registra una sesión y no duplica una recarga en el mismo módulo", async () => {
  const almacen = new Map(), estado = {};
  const primera = contexto({ almacen, estado });
  await pausa(); await pausa();
  assert.equal(primera.requests.filter(r => r.url.includes("registrar_visita")).length, 1);
  const segunda = contexto({ almacen, estado });
  await pausa(); await pausa();
  assert.equal(segunda.requests.filter(r => r.url.includes("registrar_visita")).length, 0);
});

test("no confirma el estado local después de fallo HTTP; permite reintento con interacción", async () => {
  const almacen = new Map(), estado = { fallar: true };
  let tiempo = 1000000;
  const c = contexto({ almacen, estado, now: () => tiempo });
  await pausa(); await pausa();
  assert.equal(c.html.dataset.evaVisitas, "error");
  assert.equal(almacen.has("eva_visitas_sesion_v1"), false);
  estado.fallar = false;
  tiempo += 16000;
  c.listeners.get("pointerdown")();
  await pausa(); await pausa();
  assert.equal(c.html.dataset.evaVisitas, "registrada");
  assert.equal(JSON.parse(almacen.get("eva_visitas_sesion_v1")).modules.principal, true);
});

test("dos pestañas simultáneas con Web Locks comparten una sola sesión", async () => {
  const almacen = new Map(), estado = {};
  const a = contexto({ almacen, estado }), b = contexto({ almacen, estado });
  await pausa(); await pausa(); await pausa();
  const total = [a,b].flatMap(c => c.requests).filter(r => r.url.includes("registrar_visita")).length;
  assert.equal(total, 1);
});
