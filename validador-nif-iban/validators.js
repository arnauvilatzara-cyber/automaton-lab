// Validadores de formato y dígito de control. No comprueban que el documento exista.
(function (root) {
  var LETRAS = "TRWAGMYFPDXBNJZSQVHLCKE";

  function validarDniNie(v) {
    var m = /^([XYZ]|\d)(\d{7})([A-Z])$/.exec(v);
    if (!m) return null;
    var pref = m[1], tipo = "DNI";
    if (pref === "X" || pref === "Y" || pref === "Z") {
      tipo = "NIE";
      pref = { X: "0", Y: "1", Z: "2" }[pref];
    }
    var n = parseInt(pref + m[2], 10);
    var ok = LETRAS[n % 23] === m[3];
    return { valido: ok, tipo: tipo, motivo: ok ? "" : "letra de control incorrecta (esperada " + LETRAS[n % 23] + ")" };
  }

  function validarKLM(v) {
    var m = /^([KLM])(\d{7})([A-Z0-9])$/.exec(v);
    if (!m) return null;
    var n = parseInt(m[2], 10);
    var ok = LETRAS[n % 23] === m[3];
    return { valido: ok, tipo: "NIF especial (K/L/M)", motivo: ok ? "" : "control incorrecto (esperado " + LETRAS[n % 23] + ")" };
  }

  function validarCif(v) {
    var m = /^([ABCDEFGHJNPQRSUVW])(\d{7})([0-9A-J])$/.exec(v);
    if (!m) return null;
    var d = m[2], par = 0, impar = 0, i, x;
    for (i = 0; i < 7; i++) {
      x = parseInt(d[i], 10);
      if (i % 2 === 0) { x *= 2; impar += Math.floor(x / 10) + (x % 10); }
      else par += x;
    }
    var c = (10 - ((par + impar) % 10)) % 10;
    var letra = "JABCDEFGHI"[c];
    var soloLetra = "PQRSNW".indexOf(m[1]) >= 0;
    var soloDigito = "ABEH".indexOf(m[1]) >= 0;
    var ctl = m[3], ok;
    if (soloLetra) ok = ctl === letra;
    else if (soloDigito) ok = ctl === String(c);
    else ok = ctl === letra || ctl === String(c);
    return { valido: ok, tipo: "CIF", motivo: ok ? "" : "dígito de control incorrecto" };
  }

  function validarNif(raw) {
    var v = String(raw == null ? "" : raw).toUpperCase().replace(/[\s.\-]/g, "");
    if (!v) return { valido: false, tipo: "", motivo: "vacío" };
    var r = validarDniNie(v) || validarKLM(v) || validarCif(v);
    return r || { valido: false, tipo: "", motivo: "formato no reconocido" };
  }

  function mod97(s) {
    var rem = 0;
    for (var i = 0; i < s.length; i++) {
      var ch = s.charCodeAt(i);
      var piece = ch >= 65 && ch <= 90 ? String(ch - 55) : s[i];
      for (var j = 0; j < piece.length; j++) rem = (rem * 10 + parseInt(piece[j], 10)) % 97;
    }
    return rem;
  }

  function validarIban(raw) {
    var v = String(raw == null ? "" : raw).toUpperCase().replace(/[\s\-]/g, "");
    if (!v) return { valido: false, pais: "", motivo: "vacío" };
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(v)) return { valido: false, pais: v.slice(0, 2), motivo: "formato no válido" };
    var pais = v.slice(0, 2);
    if (pais === "ES" && v.length !== 24) return { valido: false, pais: pais, motivo: "un IBAN español tiene 24 caracteres" };
    var ok = mod97(v.slice(4) + v.slice(0, 4)) === 1;
    return { valido: ok, pais: pais, motivo: ok ? "" : "dígitos de control incorrectos" };
  }

  var api = { validarNif: validarNif, validarIban: validarIban };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Validadores = api;
})(typeof window !== "undefined" ? window : this);
