# Would You Survive? (Museum iPad Exhibit)

A fully offline, touch-friendly web app for a secondary-school audience. Visitors build an organism, choose traits in three extreme zones, and see survival results based on simple trade-offs.

## Run locally (offline)

- **Option 1:** Open `index.html` in Safari on the iPad.
- **Option 2:** Serve locally from a laptop for kiosk testing:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Editing content

All exhibit content is stored in JSON files.

- `data/zones.json` contains the zones, traits, trade-offs, and survival thresholds.
- `data/copy.json` contains general screen copy.

### Update zones

Each zone has:

- `pressures`: 2 bullet points about the environment.
- `pick.count`: how many traits are required.
- `meters`: the displayed meters and their starting values.
- `options`: trait cards with `effects` for each meter.
- `survival_rule.thresholds`: minimum values required to survive.

Example snippet:

```json
{
  "id": "desert",
  "title": "Hot Desert",
  "pick": { "count": 2 },
  "meters": [
    { "id": "heat", "label": "Heat", "start": 0 },
    { "id": "water", "label": "Water", "start": 0 }
  ],
  "options": [
    {
      "id": "nocturnal",
      "label": "Nocturnal behaviour",
      "effects": { "heat": 2, "water": 1 }
    }
  ],
  "survival_rule": {
    "thresholds": { "heat": 1, "water": 1 }
  }
}
```

## Admin / Preview mode

Use the **Preview** button in the top bar to open the admin view. This renders the contents of `data/zones.json` as tables for quick proofreading.

## Resetting

Use the **Reset** button in the top bar to clear the current run for the next visitor.
