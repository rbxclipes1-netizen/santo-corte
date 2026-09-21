import { staff, HttpError } from "@/lib/server";
import Dashboard from "./ui";
export const dynamic = "force-dynamic";
export default async function Page() {
  try {
    const u = await staff();
    return <Dashboard owner={u.owner} />;
  } catch (e) {
    return (
      <main className="system gate">
        <a className="wordmark" href="/"><span className="official-logo"><img src="/logo-santo-corte.png" alt="Santo Corte Barbearia" width={1450} height={1088} /></span></a>
        <h1>ÁREA DA EQUIPE</h1>
        <p>
          {e instanceof HttpError
            ? e.message
            : "O sistema precisa ser configurado. Consulte o guia de instalação."}
        </p>
        {e instanceof HttpError && e.status === 401 && (
          <a className="action" href="/entrar?next=%2Fpainel">
            Entrar com Google
          </a>
        )}
        <p className="fineprint">
          Use o mesmo e-mail cadastrado pelo administrador.
        </p>
        <a href="/">Voltar ao site</a>
      </main>
    );
  }
}
