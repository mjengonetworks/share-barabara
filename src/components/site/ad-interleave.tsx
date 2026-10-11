import { Fragment, type ReactNode } from "react";
import { BannerAd } from "@/components/site/banner-ad";
import { withAdPlacements } from "@/lib/ad-placement";
import { renderRichText, splitRichTextBlocks } from "@/lib/richtext";

export function AdInterleave<T>({
  items,
  placement,
  offset = 0,
  adClassName = "",
  contentClassName = "contents",
  renderItem,
}: {
  items: readonly T[];
  placement: string;
  offset?: number;
  adClassName?: string;
  contentClassName?: string;
  renderItem: (item: T, index: number) => ReactNode;
}) {
  return (
    <>
      {withAdPlacements(items, offset).map((entry) =>
        entry.kind === "ad" ? (
          <div key={`${placement}-ad-${entry.slot}`} className={adClassName}>
            <BannerAd placement={`${placement}-interval-${entry.slot}`} />
          </div>
        ) : (
          <div key={`${placement}-item-${offset + entry.index}`} className={contentClassName}>
            {renderItem(entry.item, entry.index)}
          </div>
        ),
      )}
    </>
  );
}

export function AdRichText({ content, placement }: { content: string; placement: string }) {
  const blocks = splitRichTextBlocks(content);
  const midpoint = Math.floor(blocks.length / 2);
  return (
    <>
      {blocks.map((block, index) => (
        <Fragment key={`${placement}-block-${index}`}>
          {renderRichText(block)}
          {blocks.length > 1 && index + 1 === midpoint ? (
            <div className="my-5">
              <BannerAd placement={`${placement}-mid`} />
            </div>
          ) : null}
        </Fragment>
      ))}
    </>
  );
}
