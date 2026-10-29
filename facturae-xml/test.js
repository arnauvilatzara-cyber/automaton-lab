const assert = require("assert");
const { generar, calcular } = require("./facturae.js");
const f = {
  numero: "2026-001", fecha: "2026-10-29", irpf: 15,
  emisor: { tipo: "fisica", nif: "12345678Z", nombre: "Ana", apellido1: "Pérez", direccion: "C/ Mayor 1", cp: "08001", poblacion: "Barcelona", provincia: "Barcelona" },
  receptor: { tipo: "juridica", nif: "A58818501", nombre: "Cliente & Hijos SL", direccion: "Av. Sol 2", cp: "28001", poblacion: "Madrid", provincia: "Madrid" },
  lineas: [{ descripcion: "Diseño web", cantidad: 1, precio: 1000, iva: 21 }, { descripcion: "Libro", cantidad: 2, precio: 10, iva: 4 }],
};
const c = calcular(f);
assert.strictEqual(c.base.toFixed(2), "1020.00");
assert.strictEqual(c.cuota.toFixed(2), "210.80");
assert.strictEqual(c.irpf.toFixed(2), "153.00");
assert.strictEqual(c.aCobrar.toFixed(2), "1077.80");
const xml = generar(f);
assert(xml.includes("<SchemaVersion>3.2.2</SchemaVersion>"));
assert(xml.includes("Cliente &amp; Hijos SL"));
assert(xml.includes("<InvoiceTotal>1230.80</InvoiceTotal>"));
assert(xml.includes("<TotalExecutableAmount><TotalAmount>1077.80</TotalAmount>"));
assert.strictEqual((xml.match(/<Tax><TaxTypeCode>01<\/TaxTypeCode><TaxRate>(21|4)\.00/g) || []).length >= 2, true);
console.log("OK: pruebas Facturae pasan");
