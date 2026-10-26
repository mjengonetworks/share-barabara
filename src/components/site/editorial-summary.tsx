import type { ReactNode } from "react";

type EditorialSummaryProps = {
  children: ReactNode;
  className?: string;
};

export function EditorialSummary({ children, className = "" }: EditorialSummaryProps) {
  return (
    <p className={`border-l-2 border-brand-blue pl-4 text-base leading-7 text-brand-navy/85 sm:text-lg sm:leading-8 ${className}`.trim()}>
      {children}
    </p>
  );
}
