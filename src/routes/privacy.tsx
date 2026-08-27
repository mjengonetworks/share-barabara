import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [{ title: "Privacy Policy: Share Barabara" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Legal
      </p>
      <h1 className="mt-2 text-[1.575rem] font-extrabold">Privacy policy</h1>
      <div className="mt-6 space-y-6 text-sm text-foreground/90">
        <section>
          <h2 className="text-lg font-bold">What we collect</h2>
          <p className="mt-2">
            When you create an account, we collect your email address and any display name, bio,
            county or avatar you choose to add. When you sign in with Google, we receive your name,
            email and profile picture from Google. When you submit an alert, report, article,
            comment or video, we store the content you submit and, where you allow location access,
            the coordinates you share.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold">Cookies</h2>
          <p className="mt-2">
            We use a small number of cookies and local storage entries to keep you signed in and to
            remember preferences such as notification settings. We do not currently use third-party
            advertising or tracking cookies.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold">How we use your information</h2>
          <p className="mt-2">
            We use your information to operate the platform: showing your contributions on your
            profile, notifying you about activity relevant to you, and moderating submitted content.
            Alerts you submit are shown publicly. Accident reports and articles are reviewed before
            publication, and may be edited by a moderator or editor for accuracy or clarity.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold">Sharing</h2>
          <p className="mt-2">
            We do not sell your personal information. Published crash report links may be shared
            periodically with road safety agencies such as NTSA and KeNHA in the public interest.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold">Your choices</h2>
          <p className="mt-2">
            You can edit or delete your own submissions where the platform still allows it, update
            your profile at any time, and control which notifications you receive from your
            notification preferences. To request deletion of your account or data, contact us at{" "}
            <a href="mailto:info@sharebarabara.co.ke" className="underline">
              info@sharebarabara.co.ke
            </a>
            .
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold">Contact</h2>
          <p className="mt-2">
            Questions about this policy can be sent to{" "}
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
