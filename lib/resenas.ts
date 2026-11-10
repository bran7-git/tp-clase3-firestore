
"use client";

import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  getAggregateFromServer,
  count,
  average,
  serverTimestamp,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";

import { firebase, USA_EMULADORES } from "./firebase";

let firestoreDb: ReturnType<typeof getFirestore> | null = null;

function db() {
  if (firestoreDb) return firestoreDb;

  const app = firebase().app;
  firestoreDb = getFirestore(app);

  if (USA_EMULADORES) {
    connectFirestoreEmulator(firestoreDb, "127.0.0.1", 8080);
  }

  return firestoreDb;
}

export interface Resena {
  uid: string;
  puntaje: number;
  texto: string;
  autor: string;
  creadaEn: Timestamp | null;
}

function coleccionResenas(cursoId: string) {
  return collection(db(), "cursos", cursoId, "resenas");
}

export async function guardarResena(
  cursoId: string,
  uid: string,
  puntaje: number,
  texto: string,
  autor: string
): Promise<void> {
  const referencia = doc(coleccionResenas(cursoId), uid);
  const existente = await getDoc(referencia);

  if (existente.exists()) {
    await updateDoc(referencia, {
      puntaje,
      texto,
      autor,
    });
  } else {
    await setDoc(referencia, {
      uid,
      puntaje,
      texto,
      autor,
      creadaEn: serverTimestamp(),
    });
  }
}

export async function borrarResena(
  cursoId: string,
  uid: string
): Promise<void> {
  await deleteDoc(doc(coleccionResenas(cursoId), uid));
}

export function escucharResenas(
  cursoId: string,
  soloCincoEstrellas: boolean,
  alCambiar: (resenas: Resena[]) => void,
  alError?: (error: Error) => void
): Unsubscribe {
  const referencia = coleccionResenas(cursoId);

  const consulta = soloCincoEstrellas
    ? query(
        referencia,
        where("puntaje", "==", 5),
        orderBy("creadaEn", "desc"),
        limit(20)
      )
    : query(
        referencia,
        orderBy("creadaEn", "desc"),
        limit(20)
      );

  return onSnapshot(
    consulta,
    (snapshot) => {
      const resenas = snapshot.docs.map((documento) => ({
        ...documento.data(),
        uid: documento.id,
      })) as Resena[];

      alCambiar(resenas);
    },
    alError
  );
}

export async function resumenDe(cursoId: string): Promise<{
  cantidad: number;
  promedio: number;
}> {
  const referencia = coleccionResenas(cursoId);

  const resultado = await getAggregateFromServer(referencia, {
    cantidad: count(),
    promedio: average("puntaje"),
  });

  return {
    cantidad: resultado.data().cantidad,
    promedio: resultado.data().promedio ?? 0,
  };
}
