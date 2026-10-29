// Generador mínimo de Facturae 3.2.2 (sin firma XAdES). Sin dependencias, sin red.
// AVISO: no validado contra el XSD oficial ni firmado; para presentar en FACe hace falta firma electrónica.
const esc = (s) => String(s).replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]));
const r2 = (n) => (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2);
const r6 = (n) => (Math.round((n + Number.EPSILON) * 1e6) / 1e6).toFixed(6);

function parte(p) {
  const juridica = p.tipo === "juridica";
  const ident = `<TaxIdentification><PersonTypeCode>${juridica ? "J" : "F"}</PersonTypeCode><ResidenceTypeCode>R</ResidenceTypeCode><TaxIdentificationNumber>${esc(p.nif)}</TaxIdentificationNumber></TaxIdentification>`;
  const dir = `<AddressInSpain><Address>${esc(p.direccion)}</Address><PostCode>${esc(p.cp)}</PostCode><Town>${esc(p.poblacion)}</Town><Province>${esc(p.provincia)}</Province><CountryCode>ESP</CountryCode></AddressInSpain>`;
  const ent = juridica
    ? `<LegalEntity><CorporateName>${esc(p.nombre)}</CorporateName>${dir}</LegalEntity>`
    : `<Individual><Name>${esc(p.nombre)}</Name><FirstSurname>${esc(p.apellido1 || "-")}</FirstSurname>${dir}</Individual>`;
  return ident + ent;
}

function calcular(f) {
  const lineas = f.lineas.map((l) => {
    const bruto = l.cantidad * l.precio;
    return { ...l, bruto, iva: l.iva ?? 21 };
  });
  const porTipo = {};
  lineas.forEach((l) => {
    porTipo[l.iva] = porTipo[l.iva] || { base: 0 };
    porTipo[l.iva].base += l.bruto;
  });
  let base = 0, cuota = 0;
  const impuestos = Object.entries(porTipo).map(([t, v]) => {
    const c = v.base * Number(t) / 100;
    base += v.base; cuota += c;
    return { tipo: Number(t), base: v.base, cuota: c };
  });
  const irpf = f.irpf ? base * f.irpf / 100 : 0;
  return { lineas, impuestos, base, cuota, irpf, total: base + cuota, aCobrar: base + cuota - irpf };
}

function generar(f) {
  const c = calcular(f);
  const imp = c.impuestos.map((i) => `<Tax><TaxTypeCode>01</TaxTypeCode><TaxRate>${r2(i.tipo)}</TaxRate><TaxableBase><TotalAmount>${r2(i.base)}</TotalAmount></TaxableBase><TaxAmount><TotalAmount>${r2(i.cuota)}</TotalAmount></TaxAmount></Tax>`).join("");
  const items = c.lineas.map((l) => `<InvoiceLine><ItemDescription>${esc(l.descripcion)}</ItemDescription><Quantity>${r6(l.cantidad)}</Quantity><UnitOfMeasure>01</UnitOfMeasure><UnitPriceWithoutTax>${r6(l.precio)}</UnitPriceWithoutTax><TotalCost>${r6(l.bruto)}</TotalCost><GrossAmount>${r6(l.bruto)}</GrossAmount><TaxesOutputs><Tax><TaxTypeCode>01</TaxTypeCode><TaxRate>${r2(l.iva)}</TaxRate><TaxableBase><TotalAmount>${r2(l.bruto)}</TotalAmount></TaxableBase></Tax></TaxesOutputs></InvoiceLine>`).join("");
  const irpfXml = c.irpf ? `<TaxesWithheld><Tax><TaxTypeCode>04</TaxTypeCode><TaxRate>${r2(f.irpf)}</TaxRate><TaxableBase><TotalAmount>${r2(c.base)}</TotalAmount></TaxableBase><TaxAmount><TotalAmount>${r2(c.irpf)}</TotalAmount></TaxAmount></Tax></TaxesWithheld>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<fe:Facturae xmlns:fe="http://www.facturae.gob.es/formato/Versiones/Facturaev3_2_2.xml"><FileHeader><SchemaVersion>3.2.2</SchemaVersion><Modality>I</Modality><InvoiceIssuerType>EM</InvoiceIssuerType><Batch><BatchIdentifier>${esc(f.nif_emisor_batch || f.emisor.nif + f.numero)}</BatchIdentifier><InvoicesCount>1</InvoicesCount><TotalInvoicesAmount><TotalAmount>${r2(c.total)}</TotalAmount></TotalInvoicesAmount><TotalOutstandingAmount><TotalAmount>${r2(c.total)}</TotalAmount></TotalOutstandingAmount><TotalExecutableAmount><TotalAmount>${r2(c.aCobrar)}</TotalAmount></TotalExecutableAmount><InvoiceCurrencyCode>EUR</InvoiceCurrencyCode></Batch></FileHeader><Parties><SellerParty>${parte(f.emisor)}</SellerParty><BuyerParty>${parte(f.receptor)}</BuyerParty></Parties><Invoices><Invoice><InvoiceHeader><InvoiceNumber>${esc(f.numero)}</InvoiceNumber><InvoiceDocumentType>FC</InvoiceDocumentType><InvoiceClass>OO</InvoiceClass></InvoiceHeader><InvoiceIssueData><IssueDate>${esc(f.fecha)}</IssueDate><InvoiceCurrencyCode>EUR</InvoiceCurrencyCode><TaxCurrencyCode>EUR</TaxCurrencyCode><LanguageName>es</LanguageName></InvoiceIssueData><TaxesOutputs>${imp}</TaxesOutputs>${irpfXml}<InvoiceTotals><TotalGrossAmount>${r2(c.base)}</TotalGrossAmount><TotalGrossAmountBeforeTaxes>${r2(c.base)}</TotalGrossAmountBeforeTaxes><TotalTaxOutputs>${r2(c.cuota)}</TotalTaxOutputs><TotalTaxesWithheld>${r2(c.irpf)}</TotalTaxesWithheld><InvoiceTotal>${r2(c.total)}</InvoiceTotal><TotalOutstandingAmount>${r2(c.total)}</TotalOutstandingAmount><TotalExecutableAmount>${r2(c.aCobrar)}</TotalExecutableAmount></InvoiceTotals><Items>${items}</Items></Invoice></Invoices></fe:Facturae>
`;
}

if (typeof module !== 'undefined') module.exports = { generar, calcular };
if (typeof window !== 'undefined') window.Facturae = { generar, calcular };

if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  const fs = require("fs");
  const [, , entrada, salida] = process.argv;
  if (!entrada) { console.error("Uso: node facturae.js factura.json [salida.xml]"); process.exit(2); }
  const xml = generar(JSON.parse(fs.readFileSync(entrada, "utf8")));
  if (salida) fs.writeFileSync(salida, xml); else process.stdout.write(xml);
}
