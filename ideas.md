# Multi-Company ERP Dashboard — Design Direction

## Three Initial Approaches

### Theme Name: Ledger & Linen
Very light, editorial, and trustworthy: warm paper surfaces, ink typography, and restrained brass accents make operational data feel calm and legible.
**Probability:** 0.07

### Theme Name: Copper Circuit
A dark, high-contrast operations console with copper highlights and compact data density for teams managing multiple companies under pressure.
**Probability:** 0.03

### Theme Name: Field Atlas
A practical modernist dashboard inspired by solar field notebooks: deep navy, mineral blue, safety amber, and map-like structure create a grounded working environment.
**Probability:** 0.08

## Chosen Direction: Field Atlas

### Design Movement
Contemporary Swiss modernism blended with field-operations wayfinding. The interface should feel like a reliable control room for real people, not a generic SaaS template.

### Core Principles
1. Use a strong left rail and offset content bands to mirror an atlas/workbook structure.
2. Keep data readable at a glance through high-contrast type, compact metadata, and clear status signals.
3. Pair cool operational navy with a single solar amber accent to create hierarchy without visual noise.
4. Prefer soft depth, fine rules, and generous breathing room over heavy cards and excessive rounding.

### Color Philosophy
Deep ink navy establishes trust and focus; pale blue-gray surfaces keep long sessions comfortable; solar amber signals attention, renewal, and action. Green is reserved for healthy operational states, while coral is used only for risk and discrepancy alerts.

### Layout Paradigm
A persistent command rail anchors the app. The main canvas uses a split editorial rhythm: a wide metrics band, a narrower alert column, and a lower activity/workstream area. On smaller screens, the rail becomes a compact top bar and the canvas collapses into stacked bands.

### Signature Elements
- A small amber sun-mark used as the brand symbol and active-state indicator.
- Hairline dividers and coordinate-style labels such as “OVERVIEW / 01”.
- Company selector chips with short color bars, resembling atlas legend keys.

### Interaction Philosophy
Interactions should feel deliberate and reassuring. Hover states reveal context without shifting layout; active navigation uses a quiet amber marker; company switching updates labels and accent bars immediately. Placeholder modules use a concise “Module staged for Step 2” toast rather than dead ends.

### Animation
Use 180–240ms ease-out transitions for hover, focus, and sidebar changes. Stagger the entry of metric cards by 40ms. Animate only opacity and transform. Respect reduced-motion preferences and keep all keyboard navigation instant.

### Typography System
Use Manrope for compact UI labels and operational metadata, paired with DM Sans for readable dashboard headings and values. Headings are bold and slightly tight; labels are uppercase with tracked spacing; body copy stays at comfortable 14–16px sizes.

### Brand Essence
A shared operating picture for five companies, giving owners and teams one calm place to see money, people, projects, and solar commitments.
**Personality:** grounded, precise, quietly confident.

### Brand Voice
Headlines are direct and observant. CTAs are action-oriented without hype. Microcopy names the current state and the next decision.

Example lines:
- “See the whole group. Act on the one that needs you.”
- “Three warranties enter the watch window this month.”

### Wordmark & Logo
The mark is a geometric amber sun made from four offset quarter-arcs around a square center, suggesting both solar infrastructure and a coordinate compass. The wordmark is set in a custom all-caps treatment with a split crossbar on the A.

### Signature Brand Color
Solar Amber — `#E5A83B`, used sparingly for active navigation, attention states, and the brand mark.
