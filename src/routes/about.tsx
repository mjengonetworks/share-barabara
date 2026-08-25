import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About: Share Barabara" },
      { name: "description", content: "About Share Barabara, a Mjengo Networks Limited platform for road safety in Kenya." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">About</p>
      <h1 className="mt-2 text-4xl font-extrabold">About Share Barabara</h1>
      <div className="mt-6 space-y-4 text-foreground/90">
        <p>
          Share Barabara, meaning "share the road", is a community road safety platform for
          Kenya, part of Mjengo Networks Limited. We bring together live hazard alerts, verified
          accident reports, open crash statistics and road safety news, built by the people who
          use Kenyan roads every day.
        </p>
        <p>
          Our mission is simple: promoting safer roads for all. Every journey home should end at
          home. We believe conscious daily choices, by drivers, riders, pedestrians and everyone
          in between, save lives, and that better information about what is actually happening on
          the road helps people make those choices.
        </p>
        <p>
          Alerts and reports on Share Barabara are submitted by the community and reviewed by our
          moderators and editors before publication where review applies. We aim not to miss
          anything, though we cannot promise complete coverage of every incident on every road in
          Kenya.
        </p>
        <p>
          Have a question, a correction, or want to work with us?{" "}
          <Link to="/partner-with-us" className="underline">Get in touch</Link> or email{" "}
          <a href="mailto:info@sharebarabara.co.ke" className="underline">info@sharebarabara.co.ke</a>.
        </p>
      </div>
    </div>
  );
}
