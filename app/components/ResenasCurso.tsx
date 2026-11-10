
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useUsuario } from "@/lib/useUsuario";
import {
  guardarResena,
  borrarResena,
  escucharResenas,
  resumenDe,
  type Resena,
} from "@/lib/resenas";

interface Props {
  cursoId: string;
}

export default function ResenasCurso({ cursoId }: Props) {
  const usuario = useUsuario();

  const [resenas, setResenas] = useState<Resena[]>([]);
  const [puntaje, setPuntaje] = useState(5);
  const [texto, setTexto] = useState("");
  const [soloCinco, setSoloCinco] = useState(false);
  const [cantidad, setCantidad] = useState(0);
  const [promedio, setPromedio] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    setError("");

    const cancelar = escucharResenas(
      cursoId,
      soloCinco,
      (datos) => {
        setResenas(datos);
        resumenDe(cursoId)
          .then((resumen) => {
            setCantidad(resumen.cantidad);
            setPromedio(resumen.promedio);
          })
          .catch((e) => setError(String(e)));
      },
      (e) => setError(e.message)
    );

    return () => cancelar();
  }, [cursoId, soloCinco]);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!usuario) return;

    setCargando(true);
    setError("");
    setAviso("");

    try {
      await guardarResena(
        cursoId,
        usuario.uid,
        puntaje,
        texto.trim(),
        (usuario.displayName || usuario.email || "Usuario").slice(0, 80)
      );

      setTexto("");
      setAviso("Reseña guardada correctamente.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCargando(false);
    }
  }

  async function eliminar() {
    if (!usuario) return;
    setCargando(true);
    setError("");
    setAviso("");

    try {
      await borrarResena(cursoId, usuario.uid);
      setAviso("Reseña eliminada.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="resenas" aria-label="Reseñas del curso">
      <h3>Reseñas del curso</h3>

      <p>
        <strong>{promedio.toFixed(1)} / 5</strong>
        {" · "}
        {cantidad} reseña(s)
      </p>

      {usuario === undefined ? (
        <p>Comprobando sesión...</p>
      ) : usuario ? (
        <form onSubmit={enviar}>
          <label>
            Calificación
            <select
              value={puntaje}
              onChange={(e) => setPuntaje(Number(e.target.value))}
            >
              <option value={5}>★★★★★ (5)</option>
              <option value={4}>★★★★ (4)</option>
              <option value={3}>★★★ (3)</option>
              <option value={2}>★★ (2)</option>
              <option value={1}>★ (1)</option>
            </select>
          </label>

          <label>
            Tu comentario
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={500}
              required
              rows={3}
              placeholder="Escribí tu opinión sobre el curso"
            />
          </label>

          <button type="submit" disabled={cargando || !texto.trim()}>
            {cargando ? "Guardando..." : "Guardar reseña"}
          </button>
        </form>
      ) : (
        <p className="hint">Iniciá sesión para escribir una reseña.</p>
      )}

      <label>
        <input
          type="checkbox"
          checked={soloCinco}
          onChange={(e) => setSoloCinco(e.target.checked)}
        />
        {" "}Mostrar solamente reseñas de 5 estrellas
      </label>

      {error && (
        <p className="alerta alerta--error" role="alert">{error}</p>
      )}

      {aviso && (
        <p className="alerta alerta--ok" role="status">{aviso}</p>
      )}

      <ul>
        {resenas.map((resena) => (
          <li key={resena.uid}>
            <strong>{resena.autor}</strong>
            {" · "}
            <span>{"★".repeat(resena.puntaje)}</span>

            <p>{resena.texto}</p>

            {usuario?.uid === resena.uid && (
              <button
                type="button"
                onClick={eliminar}
                disabled={cargando}
              >
                Eliminar mi reseña
              </button>
            )}
          </li>
        ))}
      </ul>

      {resenas.length === 0 && (
        <p className="hint">Todavía no hay reseñas para mostrar.</p>
      )}
    </section>
  );
}
