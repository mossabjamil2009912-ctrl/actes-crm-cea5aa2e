# ACTES CRM — Conversation history (read after importing to continue)

Summary of every request and decision so far, in order. Rules live in `AGENTS.md`; user preferences in `docs/project-memory/` (copy back to project memory after import).

1. Imported project from GitHub `mossabjamil2009912-ctrl/actes-crm-0158698b`: schema created, data imported, PDFs uploaded, old `orders` table renamed `orders_legacy`.
2. Connected GitHub connector; restored newer data from private repo `actes-crm-data-backup` (73 customers, 3876 messages, 111 catalog items...).
3. n8n at https://n8n.srv1994780.hstgr.cloud linked; workflow `ACTES WhatsApp Bot v35` (id `0XTNcO8mFT8cXsEB`). Bot calls only https://actes-crm.lovable.app with header `x-bot-secret` = BOT_INGEST_SECRET. Copy of the workflow: `docs/n8n/actes-bot-workflow.json` (secret replaced by `__BOT_INGEST_SECRET__`).
4. Equation sizing engine for 8/12/16/20 kW (LV) and 50/80/125 kW (HV): `src/lib/sizing.ts`, ported to bot as `ACTES_SIZING` (parity test: 0 mismatches). Editable values: panelW 720, dcRatio 1.3, lvMaxKw 40, maxInverters 5, batKwh 16 (1.3 and 40 provisional).
5. Battery night tolerance: shortfall ≤ 1 kWh does NOT add a battery (`batTol`, app + bot `ACTES_BAT_TOL`).
6. Equations screen (hold gear 3 s, code 2027): tabs residential (1.6/6.2 ranges; 8/12 single-phase = same 7 items as LV) and commercial LV (7 items) / HV (10 items: + BCU, EBC, BDC). Each item shows its own equations, math styling, only normal parentheses ().
7. Diesel conversion explained: monthly kWh = liters ÷ 0.27.
8. Global switch "عبر المعادلات" / "عبر النطاقات الجاهزة" (`formulas.mode` eq|ranges) used by app and bot. In ranges mode all systems listed with editable ranges; commercial ranges stored in `comRanges` (key kW-phase-panels), bot port `ACTES_COM_RANGES`.
9. PVsyst and SLD are generated per request from the chosen system, so they follow either mode.
10. Added 80 kW ready systems to QuoteBuilder (153 panels/12 batteries, 204 panels/18 batteries); bot already had 80 kW rows.
11. Published to https://actes-crm.lovable.app (2026-11-17).

## Open / next
- Confirm DC box and control counts chosen for the 204-panel 80 kW system.
- dcRatio 1.3 and lvMaxKw 40 are provisional.
