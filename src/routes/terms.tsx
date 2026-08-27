import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [{ title: "Terms of Use: Share Barabara" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Legal
      </p>
      <h1 className="mt-2 text-[1.575rem] font-extrabold">Terms of use</h1>
      <div className="mt-6 space-y-6 text-sm text-foreground/90">
        <section>
          <h2 className="text-lg font-bold">Using Share Barabara</h2>
          <p className="mt-2">
            Share Barabara is a community platform. Reading news, alerts, reports and statistics is
            free and open to everyone. Posting alerts, filing reports, writing articles, commenting
            and rating other contributors requires an account.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold">Community content</h2>
          <p className="mt-2">
            Alerts are published immediately by their author and are to enhance awareness, not to
            spread fear. An alert marked unverified is still crucial information; if you dispute a
            verified alert, submit a correction request rather than removing or ignoring it.
            Accident reports and articles are reviewed by a moderator or editor before publication
            and may be edited for accuracy or clarity. Share Barabara does not guarantee the
            accuracy or completeness of community-submitted content, and aims not to miss incidents
            rather than to cover every one.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold">Your responsibilities</h2>
          <p className="mt-2">
            Do not submit false reports, defamatory content, or content that is unrelated to road
            safety. Do not impersonate another person. Moderators and admins may edit, unverify, or
            remove content, and may suspend accounts that misuse the platform.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold">Victim photographs</h2>
          <p className="mt-2">
            Where a report includes a photograph of someone who has died, a family member may
            request its removal by contacting us.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold">Emergencies</h2>
          <p className="mt-2">
            Share Barabara is not an emergency service. In an emergency, always call 999 or 112
            first.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold">Changes</h2>
          <p className="mt-2">
            We may update these terms from time to time. Continued use of Share Barabara after a
            change means you accept the updated terms.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold">Contact</h2>
          <p className="mt-2">
            Questions about these terms can be sent to{" "}
            <a href="mailto:info@sharebarabara.co.ke" className="underline">
              info@sharebarabara.co.ke
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
