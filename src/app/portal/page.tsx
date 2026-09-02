import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";

export default async function PortalPage() {
  const session = await auth();

  if (!session?.user?.accountId) {
    redirect("/");
  }

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <main className="portal-placeholder">
      <section className="portal-placeholder__card" aria-labelledby="portal-title">
        <p className="eyebrow">Portal GGP</p>
        <h1 id="portal-title">Acesso confirmado.</h1>
        <p>
          A estrutura do portal está pronta para receber os próximos módulos de
          feedback e PDI.
        </p>
        <form action={handleSignOut}>
          <button className="portal-sign-out" type="submit">Encerrar sessão</button>
        </form>
      </section>
    </main>
  );
}
