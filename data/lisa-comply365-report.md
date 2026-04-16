# Comply365 — Research Report for Lisa's Personalized Page

## 1. Company Overview

Comply365 is an enterprise SaaS vendor providing **operational content management, safety management, and training management** to highly regulated industries — specifically **aviation, defense, rail, and MRO (maintenance, repair, overhaul)**. Its flagship products are **ContentManager365**, **SafetyManager365** (the former AQD platform), **TrainingManager365**, and **DocuNet** (document management). It positions itself as "The Industry's First Connected Platform across Operations, Safety and Training, Powered by AI."

- **Founded:** 2008, Beloit, Wisconsin, USA.
- **Offices:** Beloit (US HQ), Bristol, UK (legacy Vistair), and Brisbane, Australia.
- **Size:** ~500 employees post-merger (per Comply365's own About page). Crunchbase/Pitchbook pre-merger listings still show 51–200, which predates the Vistair combination.
- **Customers:** 550+ customers in 80+ countries. Confirmed named customers include **JetBlue, American Airlines, PSA Airlines, NetJets, Atlas Air, Envoy Air, Eastern Airlines, Executive Jet Management, Amtrak, Wheels Up, GlobalX, MBTA Commuter Rail / Keolis Boston**.
- **Ownership:** Private, PE-backed. Acquired by **Liberty Hall Capital Partners** in December 2020 (from Luminate Capital Partners). **Insight Partners** joined as an equal co-investor in January 2024 alongside the **merger with Vistair Systems**. In June 2024 the combined company rebranded under the Comply365 name. Also acquired **MINT Software Systems** (training/competency management) in 2024-2025.

Primary sources: comply365.com/about-us/, comply365.com, prnewswire.com merger releases, libertyhallcapital.com, insightpartners.com, theirstack.com customer list.

## 2. Tech Stack

### Confirmed (cited below)

From the **Salesforce & GTM Systems Engineer** job posting (Bristol, posted 14 March 2026, totaljobs.com job106923172) — this is a direct primary source describing Lisa-adjacent tooling:

| System | Role | Evidence |
|---|---|---|
| **Salesforce (Sales Cloud)** | CRM of record | "Serve as the internal authority on the Salesforce org" |
| **Salesforce CPQ** | Quote/configure/price tool | "own the CPQ implementation end-to-end"; "Hands-on CPQ administration experience — configuration from scratch" |
| **NetSuite** | ERP / finance system of record | "ensure reliable data flows into NetSuite"; contract & subscription objects feed NetSuite |
| **HubSpot** | Marketing automation | Named in GTM stack |
| **LinkedIn Sales Navigator** | Prospecting | Named in GTM stack |
| **ChurnZero** | Customer success / renewals | Named in GTM stack |
| **n8n** | Low-code workflow / middleware | Named in GTM stack |
| **Make.com (Integromat)** | Low-code middleware | Named in GTM stack |
| **"CoPilot"** | Named in GTM stack (likely Microsoft 365 Copilot, not verified) | Named in GTM stack |
| **BambooHR** | HRIS / applicant tracking | Careers portal hosted at vistairhr.bamboohr.com |

Team context the posting reveals: Sales, Marketing, Legal, Finance, Customer Success, and RevOps are all named as internal stakeholders — Lisa's deal desk / ops / finance work touches every one of those.

### Reported by Lisa (treat as Confirmed-by-insider)

- **Salesforce** — matches job posting. Confirmed.
- **Slack** — consistent with Salesforce ownership of Slack and the company's remote-first culture; I could not find it named in a public source, but accept Lisa's statement.

### Likely, not confirmed

- **Microsoft 365 / Azure ecosystem** — "CoPilot" in the job post plus a LinkedIn reference to a Comply365 Senior Infrastructure Engineer (zoominfo) and a Bristol-based Cloud Engineer role suggest a Microsoft-heavy stack. Not confirmed.
- **AWS** — Possible (common for SaaS), unconfirmed.
- **.NET / C#** — ContentManager365's legacy JetBlue portal (jetblue.comply365.net/login.aspx) uses classic ASP.NET routing, hinting at a .NET codebase historically. Not a current hiring-ad confirmation.

### Unknown (no public evidence found)

- Contract lifecycle management (Ironclad / DocuSign CLM / Conga CLM) — **unknown**. The job post references "contract objects" inside Salesforce but doesn't name a standalone CLM.
- E-signature (DocuSign vs Adobe Sign) — **unknown**.
- BI tool (Tableau / Power BI / Looker / Snowflake) — **unknown**; no public mention.
- Ticketing (Jira / ServiceNow / Zendesk) — **unknown**.
- Data warehouse — **unknown**.

## 3. How Claude Could Help — Tailored to Lisa's World

Each use case is grounded in the confirmed stack (Salesforce + CPQ + NetSuite + HubSpot + ChurnZero + n8n/Make).

**a. Deal-desk quote review.** Pain: Lisa's team spot-checks every CPQ quote for non-standard discount, term length, or legal redlines before approval, which is slow and inconsistent. Claude angle: a Claude-for-Work agent reads the CPQ quote PDF and the opportunity's Salesforce record via **MCP Salesforce connector**, flags deviations from policy, and drafts the approval memo. Capability: **Claude for Work + Salesforce MCP** (Anthropic x Salesforce partnership, Oct 2025, brings Claude inside the Salesforce trust boundary — data does not leave the ecosystem).

**b. MSA / contract clause extraction.** Pain: Aviation/defense customers send marked-up MSAs with jurisdiction, DPIA, FedRAMP, and ITAR clauses that must map back to Comply365's standard paper. Claude angle: Claude parses the redlined DOCX, compares to the standard template, and produces a fallback-position matrix. Capability: **Claude API with 200K context** or **Claude for Work Projects** (drop in the redline + standard template + playbook).

**c. Compliance-selling positioning (meta use case).** Pain: Comply365 sells compliance software into regulated industries, so Lisa's reps and ops must articulate how their own AI features handle data. Claude angle: Claude drafts customer-facing trust summaries, RFP security answers, and DPA clauses grounded in Comply365's ISMS docs. Capability: **Claude Projects** with the trust library uploaded as reference.

**d. RevOps Q&A in Slack.** Pain: "What's Q3 pipeline for the aviation segment?" today means someone exports a Salesforce report. Claude angle: Claude responds in Slack, queries Salesforce via MCP, returns the number with a breakdown by rep. Capability: **Claude in Slack** (via Salesforce's Agentforce 360 + Anthropic integration announced 2025) plus the **Salesforce MCP server**.

**e. NetSuite close / AR anomaly detection.** Pain: Month-end close, Lisa's finance counterparts reconcile Salesforce-contract-object → NetSuite-subscription → revenue-schedule and hunt mismatches manually. Claude angle: Claude ingests the reconciliation report and a diff of this-month vs last-month AR aging, flags the top 5 anomalies with a hypothesis for each. Capability: **Claude API** in a scheduled n8n/Make workflow — n8n is already in the stack, so no new vendor is needed.

**f. CPQ quote generation from RFP.** Pain: A prospect RFP arrives with SKU-level requirements; a rep hand-builds the CPQ quote. Claude angle: Claude reads the RFP, maps requirements to the CPQ product catalog, and produces a draft quote line-item list the rep tweaks. Capability: **Claude Code or API** orchestrated via n8n against the Salesforce CPQ API.

## 4. Pitch Angles for a Non-Technical VP of Operations

1. "We already pay for Salesforce CPQ, NetSuite, HubSpot, and ChurnZero — Claude connects to all four natively and turns them into one place a rep asks questions in plain English, instead of building another report."
2. "Deal-desk review time drops from hours to minutes per non-standard quote, and we get a written audit trail of every exception approval — which is the same compliance-audit story we sell our airline customers."
3. "Claude inside the Salesforce trust boundary means our customer data never leaves the Salesforce ecosystem and is never used to train a model — the same enterprise guardrails our regulated customers demand of us."
4. "Our GTM job post already commits us to a 'one-engineer GTM automation stack' with n8n and Make — Claude is the reasoning layer that makes those automations intelligent instead of brittle, without hiring another admin."
5. "For a compliance-software company, having documented AI workflows with SOC 2, ISO 27001, and ISO 42001 (AI management) coverage is now a differentiator in RFPs, not a cost."

## 5. Risk / Objection Map

All responses sourced from Anthropic's Privacy Center, Trust Center, and Salesforce/Anthropic partnership announcements (URLs below).

| Objection | Documented Claude / Anthropic response |
|---|---|
| **"Will our data train Anthropic's models?"** | No. **API and Claude for Work (both Team and Enterprise plans) inputs/outputs are not used for training by default** under Anthropic's Commercial Terms. Only consumer Free/Pro plans have different defaults and are not relevant to a business deployment. |
| **"Data retention — how long are prompts stored?"** | As of 14 September 2025, default API log retention is **7 days**. **Zero Data Retention (ZDR)** is available for sensitive sectors (healthcare, finance) — inputs are processed only for real-time safety checks and not stored. Enterprise customers can also opt into a longer 30-day window via DPA for audit. |
| **"SOC 2 / ISO coverage?"** | Anthropic holds **SOC 2 Type II**, **ISO 27001:2022**, and **ISO/IEC 42001:2023** (AI management). Reports are available via trust.anthropic.com under NDA or through the Anthropic account team. |
| **"SSO, SCIM, enterprise identity?"** | Claude Enterprise supports **SAML 2.0 + OIDC** SSO and **SCIM** provisioning. Tested IdPs include Okta, Entra ID (Azure AD), Auth0, Google Workspace, Ping. JIT provisioning available on Team+. |
| **"HIPAA for any medical-adjacent aviation customers?"** | Anthropic offers a **HIPAA-ready configuration with BAA** for qualifying customers. |
| **"FedRAMP for defense customers?"** | Claude Gov exists as a separate offering for US national-security customers; standard FedRAMP authorization status is not publicly documented as of this report. **Flag for verification with Anthropic account team** before pitching to defense-segment customers internally. |
| **"GDPR for EU customers (Bristol office, European airlines)?"** | DPA available; GDPR-compliance posture documented in Anthropic privacy center. |

## Sources

- https://comply365.com/
- https://comply365.com/about-us/
- https://comply365.com/careers/
- https://comply365.com/comply365-and-vistair-to-unify-brands-as-comply365/
- https://comply365.com/wheels-up-selects-comply365-for-operational-document-compliance-management/
- https://comply365.com/globalx-implements-comply365s-for-operational-content-management/
- https://www.totaljobs.com/job/salesforce-gtm-systems-engineer/comply365-job106923172
- https://vistairhr.bamboohr.com/careers (confirms BambooHR as HRIS)
- https://theirstack.com/en/technology/comply365/us (customer list)
- https://www.prnewswire.com/news-releases/comply365-and-vistair-announce-merger-and-strategic-growth-investment-from-insight-partners-and-liberty-hall-capital-partners-302027613.html
- https://www.libertyhallcapital.com/liberty-hall-capital-partners-acquires-comply365/
- https://www.insightpartners.com/ideas/comply365-and-vistair-announce-merger-and-strategic-growth-investment-from-insight-partners-and-liberty-hall-capital-partners/
- https://www.agcpartners.com/transactions/agc-partners-advises-comply365-on-its-acquisition-by-liberty-hall-capital-partners
- https://www.crunchbase.com/organization/comply365
- https://pitchbook.com/profiles/company/90267-13
- https://www.linkedin.com/company/comply365
- https://www.zoominfo.com/p/Geoff-Hellings/1515999173 (Senior Infrastructure Engineer, Comply365)
- https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training
- https://privacy.claude.com/en/articles/7996885-how-do-you-use-personal-data-in-model-training
- https://trust.anthropic.com/
- https://support.anthropic.com/en/articles/10015870-do-you-have-a-soc-2-or-hipaa-certifications
- https://support.claude.com/en/articles/13132885-set-up-single-sign-on-sso
- https://www.anthropic.com/news/claude-for-enterprise
- https://www.salesforce.com/news/stories/salesforce-anthropic-trusted-context-ai-actions-on-claude/
- https://www.anthropic.com/news/model-context-protocol
- https://docs.anthropic.com/en/docs/mcp
