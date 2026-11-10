
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { readFileSync } from "node:fs";

let entorno;

const proyecto = "demo-resenas-test";

function resena(uid, cambios = {}) {
  return {
    uid,
    puntaje: 5,
    texto: "Excelente curso",
    autor: "Usuario de prueba",
    creadaEn: serverTimestamp(),
    ...cambios,
  };
}

function referencia(contexto, cursoId = "curso1", uid = "usuario1") {
  return doc(
    contexto.firestore(),
    "cursos",
    cursoId,
    "resenas",
    uid
  );
}

before(async () => {
  entorno = await initializeTestEnvironment({
    projectId: proyecto,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

after(async () => {
  if (entorno) {
    await entorno.cleanup();
  }
});

// 1. Lectura pública
test("1. Cualquier usuario puede leer reseñas", async () => {
  const anonimo = entorno.unauthenticatedContext();

  await assertSucceeds(
    getDoc(referencia(anonimo))
  );
});

// 2. El autor crea su propia reseña
test("2. Un usuario puede crear su propia reseña", async () => {
  const usuario = entorno.authenticatedContext("usuario1");

  await entorno.clearFirestore();

  await assertSucceeds(
    setDoc(referencia(usuario), resena("usuario1"))
  );
});

// 3. No puede crear reseñas ajenas
test("3. Un usuario no puede crear reseñas de otro", async () => {
  const usuario = entorno.authenticatedContext("usuario1");

  await entorno.clearFirestore();

  await assertFails(
    setDoc(
      referencia(usuario, "curso1", "usuario2"),
      resena("usuario2")
    )
  );
});

// 4. Un usuario anónimo no puede escribir
test("4. Un usuario anónimo no puede crear reseñas", async () => {
  const anonimo = entorno.unauthenticatedContext();

  await entorno.clearFirestore();

  await assertFails(
    setDoc(
      referencia(anonimo),
      resena("usuario1")
    )
  );
});

// 5. Puntajes inválidos
test("5. Se rechazan puntajes 6 y 4.5", async () => {
  const usuario = entorno.authenticatedContext("usuario1");

  await entorno.clearFirestore();

  await assertFails(
    setDoc(
      referencia(usuario),
      resena("usuario1", { puntaje: 6 })
    )
  );

  await assertFails(
    setDoc(
      referencia(usuario),
      resena("usuario1", { puntaje: 4.5 })
    )
  );
});

// 6. Campos adicionales
test("6. Se rechazan campos no permitidos", async () => {
  const usuario = entorno.authenticatedContext("usuario1");

  await entorno.clearFirestore();

  await assertFails(
    setDoc(
      referencia(usuario),
      resena("usuario1", { administrador: true })
    )
  );
});

// 7. Fecha del servidor e inmutabilidad
test("7. La fecha debe ser del servidor y no modificarse", async () => {
  const usuario = entorno.authenticatedContext("usuario1");

  await entorno.clearFirestore();

  await assertFails(
    setDoc(
      referencia(usuario),
      resena("usuario1", {
        creadaEn: new Date("2020-01-01"),
      })
    )
  );

  await assertSucceeds(
    setDoc(referencia(usuario), resena("usuario1"))
  );

  await assertFails(
    updateDoc(referencia(usuario), {
      creadaEn: serverTimestamp(),
    })
  );

  await assertSucceeds(
    updateDoc(referencia(usuario), {
      puntaje: 4,
    })
  );
});

// 8. No se pueden escribir documentos de cursos
test("8. Un cliente no puede modificar cursos", async () => {
  const usuario = entorno.authenticatedContext("usuario1");

  await assertFails(
    setDoc(
      doc(usuario.firestore(), "cursos", "curso1"),
      { titulo: "Curso modificado" }
    )
  );
});
