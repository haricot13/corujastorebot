/**
 * Logs
 *
 * @author Dev Gui
 */
import pkg from "../../package.json" with { type: "json" };

export function sayLog(message) {
  console.log("\x1b[36m[CORUJA STORE BOT | TALK]\x1b[0m", message);
}

export function inputLog(message) {
  console.log("\x1b[30m[CORUJA STORE BOT | INPUT]\x1b[0m", message);
}

export function infoLog(message) {
  console.log("\x1b[34m[CORUJA STORE BOT | INFO]\x1b[0m", message);
}

export function successLog(message) {
  console.log("\x1b[32m[CORUJA STORE BOT | SUCCESS]\x1b[0m", message);
}

export function errorLog(message) {
  console.log("\x1b[31m[CORUJA STORE BOT | ERROR]\x1b[0m", message);
}

export function warningLog(message) {
  console.log("\x1b[33m[CORUJA STORE BOT | WARNING]\x1b[0m", message);
}

export function bannerLog() {
  console.log(`\x1b[36m░█░█░█▀█░▀█▀░█░█░█░█░█▀█░░░█▀▄░█▀█░▀█▀\x1b[0m`);
  console.log(`░█▀▄░█▀█░░█░░█░█░░█░░█▀█░░░█▀▄░█░█░░█░`);
  console.log(`\x1b[36m░▀░▀░▀░▀░▀▀▀░▀▀▀░░▀░░▀░▀░░░▀▀░░▀▀▀░░▀░\x1b[0m`);
  console.log(`\x1b[36m🪐 Coruja Store Bot — Versão: \x1b[0m${pkg.version}\n`);
}
