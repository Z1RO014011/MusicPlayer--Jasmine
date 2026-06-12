# Artist Detail Hero Background Design

## Goal

Add a dedicated hero section to the artist detail view in the discover page so the page visually echoes the existing now playing detail screen. The hero should use the artist image as a blurred atmospheric background while keeping the song list area clear and highly readable.

## Scope

In scope:
- Artist detail sub-view opened from search results or artist links
- A top hero area with artist image background when `picUrl` is available
- A graceful visual fallback when no artist image is available
- Responsive behavior for desktop and narrower widths

Out of scope:
- Reworking the full artist detail page layout
- Adding new API calls or data sources
- Applying full-page background art behind the entire track list
- Changing row behavior, playback behavior, or list interactions

## Current State

The artist detail page is rendered through the `subView` branch inside `DiscoverView.tsx`. When an artist is opened, the component stores a playlist-like object in `subViewPlaylist`, with `coverColor` already derived from the artist `picUrl` when available.

The now playing screen already uses a layered background approach:
- one layer for the image/background source
- one overlay layer for contrast and readability

The artist detail screen currently renders only a standard header row and then the track list, so it lacks the same visual depth.

## Proposed Approach

### Layout

Add a new artist hero block above the existing artist track list. The hero should sit inside the discover sub-view and contain:
- the back button
- the artist title
- optional lightweight metadata if the current layout naturally supports it

The hero should have a moderate height so the track list still begins within the first viewport on desktop.

### Background Treatment

When an artist image exists:
- use the existing artist image source already stored in `subViewPlaylist.coverColor`
- render a dedicated background layer with that image
- apply blur and scale so the image reads as atmosphere rather than a literal photo card
- add a darker gradient overlay above the image for text contrast

When an artist image does not exist:
- fall back to the current gradient-based visual treatment
- keep the hero structure identical so layout does not shift

### List Area

Keep the song list outside the heavy image treatment. The list area should remain visually close to the current discover table styling so:
- track readability stays strong
- hover and action affordances remain clear
- the page does not become overly busy while scrolling

## Component Changes

### `src/components/DiscoverView.tsx`

Update the artist sub-view rendering branch to:
- detect whether the current `subViewPlaylist` is an artist detail page with image-backed `coverColor`
- render a new hero container before the track list
- keep the back button behavior unchanged
- keep the existing track rows and actions unchanged

Implementation should avoid introducing a second data fetch. The hero must reuse the image information already resolved during `openArtistDetail`.

### `src/App.css`

Add artist-detail-specific classes for:
- the hero container
- the hero background layer
- the hero overlay layer
- the hero content container
- responsive sizing and spacing

Styling should align with existing rounded corners, spacing, and soft-glass presentation already used in the app.

## Data Flow

1. User opens an artist from search results or another artist link.
2. `openArtistDetail` resolves the artist and stores a playlist-like object in `subViewPlaylist`.
3. The existing `coverColor` field continues to hold either:
   - an image-backed background string derived from `picUrl`, or
   - a gradient fallback
4. The artist detail renderer derives hero background styling from that existing field.
5. The track list renders below the hero without changing playback logic.

## Error Handling And Fallbacks

- If the artist lookup succeeds but no `picUrl` exists, render the same hero layout with the gradient fallback.
- If artist loading fails, preserve the current failure handling path.
- If the image URL is slow or unavailable, the overlay and fallback background should keep the title readable.

## Testing Strategy

### Behavior

- Opening an artist with a valid image shows the hero background.
- Opening an artist without a valid image shows the fallback hero styling.
- Returning from the artist detail view still works exactly as before.

### Visual Checks

- The artist title remains readable over the hero background.
- The back button remains visible and clickable.
- The song list starts cleanly below the hero and keeps its current interaction quality.
- On narrower widths, the hero height and title spacing remain balanced.

### Regression Focus

- No changes to song playback from artist detail rows
- No changes to queue actions or like actions
- No layout breakage for album detail or other discover sub-views

## Risks

- Reusing a `coverColor` string that may contain either gradients or image backgrounds requires careful parsing so hero styles are robust in both cases.
- Blur and overlay tuning may need small visual iteration to avoid making the header too dark or too washed out.
- Shared sub-view code for artists and albums must stay clearly separated so the new hero only affects artist detail.

## Implementation Plan Summary

Recommended path:
1. Add an artist-only hero wrapper in the discover sub-view.
2. Reuse the existing artist image data for the hero background.
3. Add layered CSS for blur, overlay, and content spacing.
4. Verify artist detail, album detail, and responsive behavior locally in the browser.
