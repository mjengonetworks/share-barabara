type EditorialMediaMetaProps = {
  caption?: string | null;
  credit?: string | null;
  className?: string;
};

export function EditorialMediaMeta({ caption, credit, className = "" }: EditorialMediaMetaProps) {
  const cleanCaption = caption?.trim();
  const cleanCredit = credit?.trim();
  if (!cleanCaption && !cleanCredit) return null;
  return (
    <figcaption className={`mt-1.5 text-xs leading-5 text-muted-foreground ${className}`.trim()}>
      {cleanCaption ? <em>{cleanCaption}</em> : null}
      {cleanCaption && cleanCredit ? " · " : null}
      {cleanCredit ? <span>{cleanCredit}</span> : null}
    </figcaption>
  );
}
