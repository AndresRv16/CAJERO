/* script.js - Flujo multipágina con POO y localStorage
   - Login, registro y dashboard (home)
   - Incluye depósito, retiro, transferencia, saldo y movimientos
*/

// ------------------ CLASES ------------------
class Cuenta {
  constructor(numeroCuenta, saldo = 0) {
    this.numeroCuenta = numeroCuenta;
    this.saldo = Number(saldo);
    this.movimientos = [];
  }
  consultarSaldo() { return this.saldo; }
  realizarDeposito(monto, descripcion = "Depósito") {
    if (monto <= 0) throw new Error("Monto inválido");
    this.saldo += monto;
    this._addMov("DEPÓSITO", monto, descripcion);
  }
  realizarRetiro(monto, descripcion = "Retiro") {
    if (monto <= 0) throw new Error("Monto inválido");
    if (monto > this.saldo) throw new Error("Saldo insuficiente");
    this.saldo -= monto;
    this._addMov("RETIRO", monto, descripcion);
  }
  _addMov(tipo, monto, descripcion) {
    this.movimientos.unshift({
      tipo, monto, descripcion,
      fecha: new Date().toISOString()
    });
  }
}

class CuentaAhorros extends Cuenta {
  constructor(numeroCuenta, saldo = 0) {
    super(numeroCuenta, saldo);
    this.tipo = "Ahorros";
  }
}
class CuentaCorriente extends Cuenta {
  constructor(numeroCuenta, saldo = 0) {
    super(numeroCuenta, saldo);
    this.tipo = "Corriente";
    this.limiteSobregiro = 500000;
  }
  realizarRetiro(monto, descripcion = "Retiro") {
    if (monto <= 0) throw new Error("Monto inválido");
    if (monto > this.saldo + this.limiteSobregiro) {
      throw new Error("Excede límite de sobregiro");
    }
    this.saldo -= monto;
    this._addMov("RETIRO", monto, descripcion);
  }
}

class Cliente {
  constructor({nombre, apellido, documento, usuario, contrasena, cuenta}) {
    this.nombre = nombre;
    this.apellido = apellido;
    this.documento = documento;
    this.usuario = usuario;
    this.contrasena = contrasena;
    this.cuenta = cuenta;
  }

  realizarDeposito(monto, desc = "Depósito") {
    return this.cuenta.realizarDeposito(monto, desc);
  }
  realizarRetiro(monto, desc = "Retiro") {
    return this.cuenta.realizarRetiro(monto, desc);
  }
  consultarSaldo() {
    return this.cuenta.consultarSaldo();
  }
  consultarMovimientos() {
    return this.cuenta.movimientos;
  }
}

// ------------------ STORAGE ------------------
const STORAGE_KEY = "banco_clientes";
const SESSION_KEY = "banco_sesion";

function cargarClientes() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw).map(c => {
    let cuenta = c.cuenta.tipo === "Corriente"
      ? new CuentaCorriente(c.cuenta.numeroCuenta, c.cuenta.saldo)
      : new CuentaAhorros(c.cuenta.numeroCuenta, c.cuenta.saldo);
    cuenta.movimientos = c.cuenta.movimientos || [];
    return new Cliente({...c, cuenta});
  });
}

function guardarClientes(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

function generarCuenta() {
  return "AC" + Math.floor(100000 + Math.random() * 900000);
}

// ------------------ AUTH ------------------
function login(user, pass) {
  const clientes = cargarClientes();
  const encontrado = clientes.find(c => c.usuario === user && c.contrasena === pass);
  if (encontrado) {
    localStorage.setItem(SESSION_KEY, encontrado.usuario);
    return true;
  }
  return false;
}

function registrarUsuario() {
  const clientes = cargarClientes();
  const nombre = document.getElementById("regNombre").value.trim();
  const apellido = document.getElementById("regApellido").value.trim();
  const documento = document.getElementById("regDocumento").value.trim();
  const usuario = document.getElementById("regUsuario").value.trim();
  const contrasena = document.getElementById("regContrasena").value.trim();
  const tipo = document.getElementById("regTipoCuenta").value;

  if (clientes.some(c => c.usuario === usuario)) {
    return false; // usuario ya existe
  }

  const cuenta = tipo === "corriente"
    ? new CuentaCorriente(generarCuenta(), 0)
    : new CuentaAhorros(generarCuenta(), 0);

  const nuevo = new Cliente({nombre, apellido, documento, usuario, contrasena, cuenta});
  clientes.push(nuevo);
  guardarClientes(clientes);
  return true;
}

function usuarioLogueado() {
  return !!localStorage.getItem(SESSION_KEY);
}

function getUsuarioActual() {
  const user = localStorage.getItem(SESSION_KEY);
  if (!user) return null;
  const clientes = cargarClientes();
  return clientes.find(c => c.usuario === user) || null;
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
}

// ------------------ HOME (Dashboard) ------------------
function cargarPanel() {
  const cliente = getUsuarioActual();
  if (!cliente) {
    window.location.href = "index.html";
    return;
  }
  document.getElementById("welcomeUser").textContent = 
    `Hola, ${cliente.nombre} ${cliente.apellido}`;
  document.getElementById("accountInfo").textContent =
    `Cuenta ${cliente.cuenta.numeroCuenta} · ${cliente.cuenta.tipo} · Saldo: $${cliente.cuenta.saldo.toLocaleString()}`;

  document.querySelectorAll(".op").forEach(btn => {
    btn.addEventListener("click", () => mostrarOperacion(btn.dataset.op, cliente));
  });
  document.getElementById("logoutBtn").addEventListener("click", logout);
}

function mostrarOperacion(op, cliente) {
  const actionTitle = document.getElementById("actionTitle");
  const actionBody = document.getElementById("actionBody");
  actionTitle.textContent = op.toUpperCase();
  actionBody.innerHTML = "";

  // Depositar
  if (op === "depositar") {
    actionBody.innerHTML = `
      <input id="monto" type="number" placeholder="Monto a depositar" />
      <button id="doOp" class="btn">Depositar</button>
      <p id="msg" class="msg"></p>`;
    document.getElementById("doOp").onclick = () => {
      try {
        cliente.realizarDeposito(Number(document.getElementById("monto").value));
        const clientes = cargarClientes().map(c => c.usuario===cliente.usuario?cliente:c);
        guardarClientes(clientes);
        document.getElementById("msg").style.color="green";
        document.getElementById("msg").textContent="Depósito exitoso";
        document.getElementById("accountInfo").textContent =
          `Cuenta ${cliente.cuenta.numeroCuenta} · ${cliente.cuenta.tipo} · Saldo: $${cliente.cuenta.saldo.toLocaleString()}`;
      } catch(e){ document.getElementById("msg").textContent=e.message; }
    };
  }

  // Retirar
  if (op === "retirar") {
    actionBody.innerHTML = `
      <input id="monto" type="number" placeholder="Monto a retirar" />
      <button id="doOp" class="btn">Retirar</button>
      <p id="msg" class="msg"></p>`;
    document.getElementById("doOp").onclick = () => {
      try {
        cliente.realizarRetiro(Number(document.getElementById("monto").value));
        const clientes = cargarClientes().map(c => c.usuario===cliente.usuario?cliente:c);
        guardarClientes(clientes);
        document.getElementById("msg").style.color="green";
        document.getElementById("msg").textContent="Retiro exitoso";
        document.getElementById("accountInfo").textContent =
          `Cuenta ${cliente.cuenta.numeroCuenta} · ${cliente.cuenta.tipo} · Saldo: $${cliente.cuenta.saldo.toLocaleString()}`;
      } catch(e){ document.getElementById("msg").textContent=e.message; }
    };
  }

  // Transferir
  if (op === "transferir") {
    actionBody.innerHTML = `
      <input id="destino" type="text" placeholder="Cuenta destino" />
      <input id="monto" type="number" placeholder="Monto a transferir" />
      <button id="doOp" class="btn">Transferir</button>
      <p id="msg" class="msg"></p>`;
    document.getElementById("doOp").onclick = () => {
      const destino = document.getElementById("destino").value.trim();
      const monto = Number(document.getElementById("monto").value);

      let clientes = cargarClientes();
      let cliDestino = clientes.find(c => c.cuenta.numeroCuenta === destino);

      if (!cliDestino) {
        document.getElementById("msg").textContent = "Cuenta destino no encontrada";
        return;
      }
      try {
        cliente.realizarRetiro(monto, `Transferencia a ${destino}`);
        cliDestino.realizarDeposito(monto, `Transferencia desde ${cliente.cuenta.numeroCuenta}`);

        clientes = clientes.map(c => {
          if (c.usuario === cliente.usuario) return cliente;
          if (c.usuario === cliDestino.usuario) return cliDestino;
          return c;
        });
        guardarClientes(clientes);

        document.getElementById("msg").style.color="green";
        document.getElementById("msg").textContent="Transferencia exitosa";
        document.getElementById("accountInfo").textContent =
          `Cuenta ${cliente.cuenta.numeroCuenta} · ${cliente.cuenta.tipo} · Saldo: $${cliente.cuenta.saldo.toLocaleString()}`;
      } catch (e) {
        document.getElementById("msg").textContent = e.message;
      }
    };
  }

  // Saldo
  if (op === "saldo") {
    actionBody.innerHTML = `<p>Saldo actual: <strong>$${cliente.consultarSaldo().toLocaleString()}</strong></p>`;
  }

  // Movimientos
  if (op === "movimientos") {
    const movs = cliente.consultarMovimientos();
    actionBody.innerHTML = movs.length
      ? movs.map(m => `<div class="small">[${m.tipo}] $${m.monto} - ${new Date(m.fecha).toLocaleString()} (${m.descripcion})</div>`).join("")
      : "<p>No hay movimientos</p>";
  }
}
