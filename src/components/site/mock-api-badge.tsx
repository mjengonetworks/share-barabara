import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";

export function MockApiBadge() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("@/mocks/browser").then(({ maybeStartMockApi }) =>
      maybeStartMockApi().then(() => {
        if (!cancelled) setActive(localStorage.getItem("sb-mock-api") === "1");
      }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (!active) return null;

  return (
    <div className="fixed left-1/2 top-0 z-[60] -translate-x-1/2 rounded-b-lg border border-t-0 border-caution bg-caution/90 px-4 py-1.5 text-xs font-semibold text-black shadow">
      <span className="flex items-center gap-1.5">
        <FlaskConical className="size-3.5" /> Mock API active: nothing here touches the real database
      </span>
    </div>
  );
}
