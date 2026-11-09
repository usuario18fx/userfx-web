import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Condiciones del chat · USER FX",
  description: "Consentimiento y sincronización del chat web USER FX con Telegram.",
};

export default function ChatTerms() {
  return (
    <main className="mx-auto min-h-svh max-w-3xl space-y-6 px-6 py-16 text-slate-100" style={{ background: "#090f1b" }}>
      <a className="text-sky-300 underline" href="/">← USER FX</a>
      <h1 className="text-3xl font-semibold tracking-wide">Condiciones del chat USER FX</h1>
      <p className="text-sm text-slate-400">Versión: 8 de noviembre de 2026</p>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Vinculación voluntaria</h2>
        <p>El chat de la web se conecta a tu cuenta de Telegram únicamente después de aceptar estas condiciones y confirmar un código temporal recibido de @User18Fx_bot. El código de vinculación es distinto del código de acceso a la bóveda.</p>
        <h2 className="text-xl font-semibold">2. Mensajes sincronizados</h2>
        <p>Los mensajes del chat y las respuestas del bot o soporte pueden mostrarse tanto en esta web como en tu conversación de Telegram. El bot puede responder automáticamente a consultas básicas. Para otras consultas, el equipo puede contestar manualmente, sin garantía de respuesta inmediata.</p>
        <h2 className="text-xl font-semibold">3. Datos y conservación</h2>
        <p>Al vincularte, autorizas el uso de tu identificador de Telegram, tu consentimiento y hasta 100 mensajes del historial sincronizado, conservados un máximo de 30 días en el servidor web. Telegram conserva sus propios mensajes según sus políticas y configuración.</p>
        <h2 className="text-xl font-semibold">4. Protección y uso correcto</h2>
        <p>No compartas contraseñas, códigos de acceso, datos de pago ni información sensible por el chat. El acceso a contenido privado requiere permisos válidos y los pagos se confirman únicamente mediante el proceso oficial de Telegram Stars.</p>
        <h2 className="text-xl font-semibold">5. Revocación</h2>
        <p>Puedes desvincular tu cuenta en la ventana del chat o enviar /stopchat al bot. Esto revoca la sincronización y elimina el historial web sincronizado. Los mensajes que ya estén guardados dentro de Telegram no se eliminan automáticamente.</p>
      </section>
      <p className="text-sm text-slate-300">Lee también nuestra <a href="/privacy" className="text-sky-300 underline">política de privacidad</a>.</p>
    </main>
  );
}
