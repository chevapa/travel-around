/**
 * Category illustrations ported from the live site's `assets/img0NN.png`
 * (see `data/vocab.json`'s `categories[*].ico`, which embeds these same
 * files as `<img>` HTML) — issue 122: replace the generic
 * photo-collage placeholders (which included a stock Photoshop-brush-kit
 * screenshot that had nothing to do with any place, and the equally
 * unrelated "frame not printed yet" hatch box) with an image that at
 * least reflects the KIND of place this is, when we don't have a real
 * photo.
 *
 * Keyed by the same category strings the dataset's `tags` already use
 * (`src/model/migrate.ts` copies `places/*.json`'s `cats` verbatim) — one
 * illustration per `data/vocab.json` category, `culture` sharing
 * `museum`'s image exactly as the live site's vocab does.
 */
import beach from "../assets/categories/beach.png";
import bike from "../assets/categories/bike.png";
import castle from "../assets/categories/castle.png";
import cave from "../assets/categories/cave.png";
import church from "../assets/categories/church.png";
import culture from "../assets/categories/culture.png";
import food from "../assets/categories/food.png";
import museum from "../assets/categories/museum.png";
import nature from "../assets/categories/nature.png";
import spa from "../assets/categories/spa.png";
import town from "../assets/categories/town.png";
import view from "../assets/categories/view.png";
import water from "../assets/categories/water.png";

export const CATEGORY_IMAGE: Record<string, string> = {
  town,
  castle,
  museum,
  church,
  nature,
  view,
  water,
  cave,
  beach,
  food,
  bike,
  spa,
  culture,
};

/** The first tag that has a known illustration, or undefined (no tags, or none recognised — e.g. a brand-new frame from the New Frame flow, which starts with `tags: []`). */
export function categoryImageFor(tags: string[]): string | undefined {
  for (const tag of tags) {
    if (CATEGORY_IMAGE[tag]) return CATEGORY_IMAGE[tag];
  }
  return undefined;
}
