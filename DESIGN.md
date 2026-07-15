---
name: md-review-server
description: Quiet local Markdown review workbench for Codex-assisted revision.
colors:
  bg-primary: "#f4f4f3"
  bg-secondary: "#fbfbfa"
  bg-tertiary: "#eeeeec"
  bg-panel: "#ffffff"
  bg-control: "#eeeeec"
  bg-control-active: "#ffffff"
  bg-inset: "#f5f5f4"
  text-primary: "#222326"
  text-secondary: "#4d4f54"
  text-tertiary: "#73757b"
  border-primary: "#d8d8d5"
  border-secondary: "#e5e5e2"
  link-blue: "#2f6fd6"
  status-blue-bg: "#e8f0ff"
  status-green: "#2f7d45"
  status-green-bg: "#e7f4eb"
  status-amber: "#936200"
  status-amber-bg: "#fff3d0"
  status-red: "#b4232b"
  status-red-bg: "#ffe9ea"
  dark-bg-primary: "#151515"
  dark-bg-secondary: "#181818"
  dark-bg-tertiary: "#202020"
  dark-text-primary: "#eeeeee"
  dark-text-secondary: "#c9c9c9"
  dark-text-tertiary: "#8d8d8d"
  dark-border-primary: "#2a2a2a"
  dark-border-secondary: "#232323"
typography:
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"
    fontSize: "26px"
    fontWeight: 520
    lineHeight: 1.2
    letterSpacing: "0"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"
    fontSize: "16px"
    fontWeight: 540
    lineHeight: 1.25
    letterSpacing: "0"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.78
    letterSpacing: "0"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0"
rounded:
  xs: "3px"
  sm: "6px"
  md: "7px"
  lg: "9px"
  xl: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-compact:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "0 9px"
    height: "26px"
  segmented-control:
    backgroundColor: "{colors.bg-control}"
    textColor: "{colors.text-tertiary}"
    rounded: "{rounded.lg}"
    padding: "2px"
  segmented-control-active:
    backgroundColor: "{colors.bg-control-active}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    height: "26px"
  status-pill:
    backgroundColor: "{colors.status-blue-bg}"
    textColor: "{colors.link-blue}"
    rounded: "{rounded.pill}"
    padding: "0 7px"
    height: "20px"
  document-panel:
    backgroundColor: "{colors.bg-panel}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.xl}"
    padding: "34px 42px 48px"
---

# Design System: md-review-server

## 1. Overview

**Creative North Star: "Quiet Review Bench"**

md-review-server should feel like a local workbench for focused document review. The interface supports the document, selection, comments, and Codex revision loop without competing for attention. It is quiet, precise, and compact, with familiar controls and visible local state.

The system rejects landing-page energy, decorative dashboards, generic document portals, and action centers that pull the user away from the text. New features should look like they were already part of the comments workflow: low contrast surfaces, compact buttons, small status pills, and minimal icon language.

**Runtime Baseline:**

Use [design-drafts/runtime-baseline/README.md](design-drafts/runtime-baseline/README.md) as the visual and DOM source of truth before shaping new UI. It contains real app screenshots, frozen HTML, `#root` fragments, and measurements for collapsed/expanded sidebars, comments open/closed, empty/commented states, and dark/light themes. Do not use hand-written design drafts as the primary baseline when runtime HTML exists.

**Key Characteristics:**

- Document-first layout with side panels serving navigation and review state.
- Restrained product palette: neutral surfaces, one blue accent, semantic status colors.
- Compact controls with consistent 6px to 9px radii and 26px to 32px heights.
- Automation state is explicit, local, and visually subordinate to the document.

## 2. Colors

The palette is a restrained neutral tool palette with blue reserved for current selection, links, active review state, and primary status signals.

### Primary

- **Review Blue** (`#2f6fd6`): Links, active review markers, selected file badges, and high-signal action state. Use sparingly. It should mark focus or review state, not decorate the interface.
- **Review Blue Surface** (`#e8f0ff`): Small status backgrounds and selected-count badges. Pair with blue text and subtle blue border only in compact areas.

### Neutral

- **Workspace Gray** (`#f4f4f3`): Main app background. It separates the document panel from sidebars without adding visual weight.
- **Panel White** (`#ffffff`): Document panel and elevated content surface in light mode.
- **Sidebar Near-White** (`#fbfbfa`): File tree and comments sidebar surface.
- **Control Gray** (`#eeeeec`): Segmented controls, inactive control backgrounds, hover fills.
- **Primary Ink** (`#222326`): Headings, file names, active labels.
- **Secondary Ink** (`#4d4f54`): Body text, button labels, comment text.
- **Tertiary Ink** (`#73757b`): Hints, secondary metadata, placeholder-adjacent text.
- **Soft Divider** (`#e5e5e2`): Default panel and list separation.
- **Defined Divider** (`#d8d8d5`): Focused borders, icon container borders, stronger separation.

### Semantic Status

- **Resolved Green** (`#2f7d45`, `#e7f4eb`): Resolved status, copied confirmation, successful handoff completion.
- **Partial Amber** (`#936200`, `#fff3d0`): Partial resolution or caution state.
- **Unresolved Red** (`#b4232b`, `#ffe9ea`): Failed handoff, delete hover, unresolved status.

### Dark Mode

Dark mode mirrors the same hierarchy, not a separate theme. Use `#151515` for the app background, `#181818` for panels, `#202020` for elevated and hover layers, `#eeeeee` for primary text, and `#232323` to `#2a2a2a` for dividers.

### Named Rules

**The Accent Scarcity Rule.** Blue appears only where it answers "what is active, selected, linked, or ready for review." Do not use blue for large buttons or decorative blocks.

**The Local Trust Rule.** Network-adjacent or automation behavior uses plain neutral UI plus explicit text. Do not imply remote sync, account state, or cloud document upload.

## 3. Typography

**Display Font:** System sans stack, no separate display family.
**Body Font:** System sans stack, with Helvetica and Arial fallbacks inside Markdown content.
**Label/Mono Font:** SFMono-Regular, Consolas, Liberation Mono, Menlo for code only.

**Character:** Product-native and dense. Type should feel like a familiar local tool, not a brand surface. Hierarchy comes from small size and weight shifts, not dramatic scale.

### Hierarchy

- **Headline** (520, 26px, 1.2): Markdown document `h1` only. Keep it calm and readable.
- **Section Heading** (520, 17px, 1.35): Markdown `h2` and compact in-document structure.
- **Panel Title** (500 to 540, 14px to 16px, 1.25): File name, Comments title, top bar labels.
- **Body** (400, 14.5px, 1.78): Markdown reading text. Keep the readable document column around 820px, roughly 65 to 75 characters for prose.
- **Comment Body** (400, 12.8px, 1.5): Comment list text and compact review annotations.
- **Label** (500, 11px to 12.5px, 1): Tabs, buttons, pills, file tree metadata.

### Named Rules

**The Product Scale Rule.** Do not use fluid hero type or oversized headings in the app shell. This is a work surface, not a landing page.

**The No Shouting Rule.** Avoid all-caps labels except tiny conventional badges if a future pattern truly needs them. Current controls use sentence or title case.

## 4. Elevation

The system uses tonal layering first, shadows only for floating UI. Default panels and list items are flat, separated by background shifts and 1px dividers. Shadows are reserved for selection popovers, comment editors, tooltips, and history cards that literally float above the document.

### Shadow Vocabulary

- **Soft Floating** (`0 10px 24px rgb(26 28 32 / 10%)`): Selection popover and small transient controls in light mode.
- **Floating Panel** (`0 14px 32px rgb(26 28 32 / 12%)`): Larger popovers such as processed comment history in light mode.
- **Dark Soft Floating** (`0 10px 28px rgb(0 0 0 / 24%)`): Dark-mode counterpart for small floating UI.
- **Dark Floating Panel** (`0 14px 36px rgb(0 0 0 / 28%)`): Dark-mode counterpart for larger floating UI.

### Named Rules

**The Flat-By-Default Rule.** Sidebars, document panels, comments, file rows, and handoff rows should not use broad drop shadows. Use tonal layers and dividers first.

**The Floating-Only Rule.** If an element is not visually above the document or tied to a transient interaction, it probably should not have a shadow.

## 5. Components

Components are compact, familiar, and state-explicit. They should preserve the current vocabulary before introducing new shapes, icons, or color treatments.

### Buttons

- **Shape:** Compact radius, usually 7px. Icon-only buttons are 28px to 30px square.
- **Primary:** Prefer a light bordered or transparent button for app actions. Use blue text or blue borders only when the action represents active review state.
- **Hover / Focus:** Hover shifts to `bg-tertiary` and stronger text. Focus uses a visible outline or stronger border without adding heavy shadow.
- **Secondary / Ghost:** Transparent background, muted text, no border unless the control needs a clickable boundary.

### Segmented Controls

- **Style:** 2px padding, 9px outer radius, 7px active segment radius, neutral control background.
- **Use:** Preview/Diff, comment filters, and compact state toggles.
- **State:** Active segment uses `bg-control-active` and primary or secondary ink. Inactive segments use tertiary text.

### Chips

- **Style:** Pill radius, 10px to 11px labels, 16px to 21px height.
- **Use:** Counts, status labels, resolved or failed states.
- **State:** Semantic chips may use blue, green, amber, or red surfaces. Keep them small and color-independent by including readable text.

### Cards / Containers

- **Corner Style:** Document panels use 12px. Comment active cards and popovers use 9px to 10px. Avoid radii above 16px.
- **Background:** Main document uses `bg-panel`; sidebars use `bg-secondary`; controls use `bg-control`.
- **Shadow Strategy:** No shadow at rest. Use border and tonal contrast.
- **Border:** Use `border-secondary` for default separation, `border-primary` or semantic border for focused state.
- **Internal Padding:** Document panels use generous reading padding. Tool panels use 8px to 12px.

### Inputs / Fields

- **Style:** Transparent or panel background, 1px neutral border, 7px to 8px radius.
- **Focus:** Border strengthens to `border-primary`; no glow by default.
- **Placeholder:** Must remain readable, use text-secondary or text-tertiary only when contrast is adequate.

### Navigation

- **File Tree:** 30px rows, 7px radius, muted labels, active row uses `bg-tertiary` and primary ink. Counts use compact blue badges.
- **Sidebars:** Widths are utilitarian and resizable. Collapsed sidebars use 42px to 46px rails with icon-only buttons.
- **Top Bar:** 52px height, filename first, view controls second. Avoid extra toolbar density unless the workflow requires it.
- **Document Outline:** Keep heading navigation inside the document card. Use a `160px` text outline when the card is at least `520px` wide; below that threshold, switch to a `32px` H1-H6 tick rail. The active heading uses review blue. Compact-rail tooltips show heading level and full title, stay inside the visible preview boundary, and never cover the comments panel.

### Comments Panel

- **Header:** Comments title, subtitle, and segmented filter are the top-level structure.
- **Runtime Dimensions:** The comments panel is about 300px wide. The comments header is about 113px high without comment actions and about 143px high when `Copy All` and `Clear` appear.
- **Default Review State:** The comment filter defaults to `Open`. The comments sidebar auto-expands only when the current file has open comments. If a generated document only has resolved history, keep the sidebar collapsed by default; users can open `Done` or `All` when they want history.
- **Comment Items:** Default items are flat rows with bottom dividers. Only the active or focused comment gets a bordered container.
- **Comment Replies:** Replies live inside the existing comment item as a flat text thread. Use only `Codex` and `你` author labels with subtle time text; align reply times to a stable column. Show very recent times relatively (`刚刚`, `n分钟前`, `n小时前`) and older times as concrete local dates (`7月8日 10:30`, with year only when needed). Do not use avatars, nested reply cards, chat bubbles, or a separate confirmation status. If Codex needs clarification, append a Codex reply and keep the comment `Open`. If the user appends a comment to a `Done` item, reopen that item as `Open` so the next Codex loop treats it as active again.
- **Handoff State:** Codex handoff belongs inside the comments workflow. Represent it as a compact state row near existing comment actions or as a low-height status row below them, using existing text, pill, and small button patterns. Do not add a large CTA block, new leading icon language, independent action-center card, wider comments panel, or a tall block that pushes the first comment far down.

### Selection and Review Markers

- **Selection Popover:** Floating, compact, 9px radius, soft shadow. The selection editor stays near the selection and clamps to the viewport.
- **Review Markers:** Small circular markers with semantic status color. Markers live in the document gutter area, independent of Markdown indentation, list nesting, or table content. The marker center sits on the document content border so the border visually passes through the icon center. Multiple comments and multi-round history on the same line use one marker with a tiny count badge. Marker popovers use existing floating panel rules.

## 6. Do's and Don'ts

### Do:

- **Do** start from runtime baseline HTML and screenshots when shaping or implementing review UI changes.
- **Do** keep the document and selection flow central. Sidebars should serve the document, not compete with it.
- **Do** express Codex handoff as local review state in the comments panel: ready, queued, running, completed, failed.
- **Do** reuse segmented controls, compact buttons, and status pills before creating new component vocabulary.
- **Do** use blue only for selected, active, linked, or review-ready states.
- **Do** keep light and dark mode hierarchy equivalent, using the same density and component shapes.
- **Do** make automation state explicit with target file, comment count, completion state, failure state, and retry path.

### Don't:

- **Don't** treat hand-written static drafts as the source of truth when runtime HTML exists.
- **Don't** make this look like a landing page, GitHub clone, decorative dashboard, or enterprise document portal.
- **Don't** use large blue primary controls, busy toolbars, card stacks, marketing copy, oversized typography, or visuals that compete with the document text.
- **Don't** turn Codex handoff into a separate action center or prominent CTA block.
- **Don't** introduce a new icon language for one feature. Use existing icon scale and only when it clarifies a familiar control.
- **Don't** use heavy shadows on resting panels or cards. Shadows belong to floating UI.
- **Don't** imply account-based sync, remote document upload, or surprise network behavior.
- **Don't** use side-stripe accents, gradient text, glassmorphism, repeated card grids, or decorative stripe backgrounds.
