# Admin-managed storefront images

## Changes
- Remove the bundled hero and category image assets and their imports.
- Add a Hero image URL field in Seller Desk → Settings, stored with the existing public shop settings.
- Load the home-page hero from that saved URL; show a clean placeholder when no URL is configured.
- Use each category’s existing Image URL from Seller Desk → Categories across the home page, catalogue, box builder, and product fallbacks.
- Show neutral placeholders where a category or product has no configured image, rather than requesting a missing bundled file.
- Update the seller guide to direct image changes to Settings and Categories.

## Technical details
- Extend the existing `order` settings value with `hero_image_url` to avoid a new database table or migration.
- Keep product and combo image URLs unchanged; their explicit admin-managed links remain supported.
- Delete the obsolete `.asset.json` pointers only after all imports are removed.
- Verify the build and browser network requests for both configured and empty image states.
