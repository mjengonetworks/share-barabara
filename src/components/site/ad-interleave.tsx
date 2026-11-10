import { Fragment, type ReactNode } from "react";
import { BannerAd } from "@/components/site/banner-ad";
import { withResponsiveAdPlacements } from "@/lib/ad-placement";
import { renderRichText, splitRichTextBlocks } from "@/lib/richtext";

export function AdInterleave<T>({
  items,
  placement,
  offset = 0,
  adClassName = "",
  contentClassName = "contents",
  layout = "sm-2-lg-3",
  renderItem,
}: {
  items: readonly T[];
  placement: string;
  offset?: number;
  adClassName?: string;
  contentClassName?: string;
  layout?: "sm-2-lg-3" | "md-3";
  renderItem: (item: T, index: number) => ReactNode;
}) {
  return (
    <>
      {withResponsiveAdPlacements(items, offset, layout).map((entry) =>
        entry.kind === "ad" ? (
          <div
            key={`${placement}-ad-${entry.slot}-${entry.visibility}`}
            className={`${adClassName} ${entry.visibility === "tablet" ? "hidden sm:block lg:hidden" : entry.visibility === "mobile-desktop" ? "block sm:hidden lg:block" : "block"}`}
          >
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
