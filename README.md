# ShadowPay
**Guidewire DEVTrails 2026 · Phase 1**
*Protecting Zomato/Swiggy delivery partners from income loss during disruptions*

---

We're building something we genuinely wish existed.

One of our team members has an uncle who delivers for Swiggy in Chennai. Last October during the northeast monsoon, he lost nearly ₹6,000 in a single week because he simply couldn't ride. He couldn't file a claim — there was nothing to file. He just absorbed the loss. This project started from that conversation.

---

## The Person We're Building For

His name is Rajan. 27 years old, rides a Honda Activa in Anna Nagar, Chennai. Works Zomato. On a good day he makes ₹700–800. He starts at 9, peaks during lunch, breaks in the afternoon heat, goes again for dinner.

When it rains heavily in Chennai, Rajan doesn't just slow down — he stops completely. The roads flood. He can't see. The Zomato app keeps pinging with orders he can't take. He waits under a petrol station roof with three or four other partners, watching the clock.

Two of those days last October. His weekly earnings went from ₹4,200 to ₹2,640. His rent is ₹3,200. Bike EMI is ₹1,100. Do the math. That week he called home to ask his mother for money.

There's no insurance that covers this. Zomato Shield is accident-only. Health insurance doesn't touch lost wages. Vehicle insurance doesn't pay because the bike is fine — the problem is the sky.

That's the gap we're filling. Not vaguely. For Rajan specifically.

**Disruptions we cover (for Chennai food delivery):**

| What | When we trigger | How we know |
|---|---|---|
| Heavy rain / red alert | IMD red or orange alert, or rainfall > 35mm/hr | IMD API + our sensor check |
| Cyclone warning | NDMA advisory active | NDMA feed |
| Extreme heat | Feels-like temp > 43°C during working hours | OpenWeatherMap |
| Severe pollution | AQI > 300 | CPCB API |
| Curfew / Section 144 | Official district advisory | Govt feed (mocked for demo) |
| Platform outage | Zomato/Swiggy API down > 90 minutes | Uptime monitor |

We don't cover vehicle damage, accidents, or health issues. Not our product. We cover one thing: income lost because the world made it impossible to work.

---

## The Core Idea — Shadow Earnings

Here's the thing about parametric insurance that most implementations get wrong: they trigger on an *event* (it rained), not on an *outcome* (you lost income). Those aren't the same thing. A light drizzle at 2 AM doesn't hurt Rajan at all. A red alert at 12:30 PM during the lunch rush destroys his day.

So we built something we're calling the **Shadow Earnings Model**.

Every 15 minutes while Rajan is active, our system is quietly running a prediction in the background: *"Given Rajan's history, the current demand in Anna Nagar, the time of day, and what the weather is doing — what should he earn in the next two hours?"* That prediction is his shadow earnings.

The moment his actual earnings fall 35%+ below the shadow AND a verified disruption is active in his zone, we automatically kick off a payout. He doesn't open an app. He doesn't file anything. He gets a notification:

> *"Heavy rain in Anna Nagar. We're sending you ₹320 for today's lost hours. Stay safe."*

That's it. The whole UX. Under 15 minutes from disruption to transfer.

### How the model actually gets built

We're using XGBoost regression. We chose it over something fancier because it handles our data well and we can actually explain what it's doing — which matters when you're processing someone's income.

Features going in per prediction:
- Hour of day and day of week (lunch peaks are 3–5x dinner on weekdays for Rajan's zone)
- Rajan's personal historical average for that exact time slot
- Number of other active riders in Anna Nagar right now (supply affects per-rider earnings sharply)
- Current weather status and forecast
- Any local event flag — cricket match, festival, hartal

Output: expected ₹ for the next 2 hours, specific to Rajan, specific to now.

For new workers who don't have 90 days of history yet, we fall back to zone-level averages and apply a conservative cap (max ₹200/event) for the first four weeks. Personal model kicks in from week 5.

The gap detection is straightforward:

```python
shadow = shadow_model.predict(worker_id, current_time)
actual = platform_api.get_earnings(worker_id, last_2h)
gap    = (shadow - actual) / shadow

if gap > 0.35 and disruption_active and trust_score < 70:
    payout = min((shadow - actual) * 0.80, weekly_cap)
    send_to_worker(worker_id, payout)
```

We pay 80% of the gap. Not 100% — we don't want workers to be better off during disruptions than when they're working. That's not insurance, that's a perverse incentive. 80% covers the hurt without creating bad behaviour.

---

## Weekly Premium — Why Weekly Matters

Rajan does not think monthly. He earns weekly, spends weekly, pays his landlord weekly. A ₹600/month premium is not how he thinks about money. ₹49 this week — that he can evaluate against his earnings and decide.

| Tier | Per week | Max payout/week | Who it's for |
|---|---|---|---|
| Basic | ₹29 | ₹350 | New workers, relatively dry zones |
| Standard | ₹49 | ₹600 | Most workers, year-round |
| Pro | ₹79 | ₹1,000 | High earners, flood-prone areas, monsoon months |

Every Monday morning, our model recalculates Rajan's premium for the coming week based on four things: his zone's historical flood/disruption risk, his own claim history, his Resilience Credit score (more on this below), and the current season. October Rajan in Anna Nagar pays more than March Rajan in a drier part of the city. That's just honest pricing.

**Quick example:** November, Anna Nagar, Standard tier, 8 weeks no claims, good credit score:
`₹49 × 1.15 (flood zone) × 1.0 (clean history) × 0.97 (credit discount) × 1.15 (monsoon month) = ~₹63/week`

At ₹63, if one bad rain day pays out ₹300+, Rajan comes out comfortably ahead on a rough week. He understands this trade-off. It's why he'll buy it.

UPI autopay handles renewal. He can cancel any Sunday night — no lock-in, no cancellation fee. We made this rule because we've seen how traditional insurance traps people and erodes trust. We don't want that relationship with Rajan.

---

## Onboarding — We Designed for Someone on a Bike

Three screens. Under 4 minutes. That's the constraint we set ourselves.

**Screen 1:** Phone number + OTP. We pull his zone and recent delivery history automatically from the platform API (simulated for the demo). No forms to fill, no KYC document uploads. He's a verified Zomato partner — that's enough to start.

**Screen 2:** Pick a tier. We show him something personalised here — not generic marketing. We calculate what each tier would have paid him in the last 4 weeks based on his actual disruptions. He sees: *"Standard tier would have paid you ₹1,200 of the ₹1,840 you lost last month."* That's the moment he decides.

**Screen 3:** UPI autopay confirmation. Tap. Done. Coverage starts Monday.

From Monday onwards, he doesn't need to think about us. We're running quietly in the background. If something happens, he hears from us. If nothing happens, he doesn't.

---

## Adversarial Defense — The GPS Syndicate Problem

*This section addresses the Market Crash scenario head-on.*

We thought carefully about this because it's genuinely hard, and we don't want to pretend otherwise.

The attack described — 500 workers coordinating on Telegram to spoof GPS into flood zones and drain the pool — is not theoretical. It's exactly what happens to any parametric system that trusts a single data source. GPS coordinates are just numbers. Anyone with a free app can put themselves anywhere on the map.

So we stopped trusting location. We trust convergent physical evidence instead.

### What we actually check (4 independent signals)

**Signal 1 — Does the phone's environment match a rainstorm?**

We read three sensors passively in the background: barometric pressure, humidity, and the microphone. Real rain does specific things to all three simultaneously — pressure drops 2–6 hPa, humidity spikes past 85%, and the microphone picks up the broadband noise signature of rain hitting asphalt (roughly 1–8 kHz, distinct from indoor sound).

We trained a Random Forest classifier on actual recordings from Chennai rain events versus indoor environments. Someone at home running a GPS spoofer has normal indoor pressure, 55% humidity, and TV audio in the background. The classifier sees through it immediately.

To defeat this signal at scale, 500 syndicate members would each need a compressed air rig, a humidifier, and a rain sound recording at the exact right frequency — simultaneously. That's not happening.

**Signal 2 — Are nearby workers also losing income?**

When a claim comes in from Rajan in Anna Nagar, we check: are other active workers within 500 metres also showing an earnings drop in the last 90 minutes? If 3+ of them are — yes, there's a real disruption. If only Rajan is dropping and everyone else is fine, something's off.

This is just a database query. No blockchain, no IPFS — a simple SELECT with a distance filter. We're mentioning this because we initially overcomplicated it and had to dial back.

**Signal 3 — Is the phone behaving like a stranded person or someone at home?**

A genuinely stranded delivery partner behaves in a recognisable way. He checks his phone repeatedly (short screen-on bursts every few minutes), shifts around while waiting (mild accelerometer activity), occasionally walks a few metres to check the rain. His motion is characteristic of someone stuck outdoors waiting.

A spoofer at home shows either complete stillness (phone on a table), walking-around-the-house gait, or TV vibration — while GPS claims he's standing in a flooded street. An LSTM trained on these motion patterns catches this mismatch. We also run a simple velocity check: if GPS shows him teleporting more than 60 km/h between pings, that's not physics — that's a spoofing app artifact.

**Signal 4 — What does the platform itself say?**

This is the signal that can't be faked. If Zomato actually stopped assigning orders to workers in Anna Nagar during that window — order assignment rate dropped to less than 25% of normal — that's ground truth. No syndicate can manipulate Zomato's own dispatch data.

If 50 people claim they were stranded in Anna Nagar but orders were flowing normally there the whole time, every one of those claims is fraudulent. The platform data proves it.

### How these four signals combine

Each signal feeds a composite Trust Score from 0 to 100. Lower is better (less fraud risk):

- **Score 0–30:** Auto-approve. Money sent immediately.
- **Score 31–60:** Send half now. Ask for a quick time-stamped photo to release the rest. (A genuine worker can do this in 10 seconds. 500 coordinated fraudsters cannot simultaneously fabricate 500 unique photos of a real disaster scene — that's the whole point of this step.)
- **Score 61–80:** Hold the claim, reach out for more verification. 4-hour window.
- **Score 81–100:** Flag for manual review. 24-hour hold.

One rule we won't compromise on: we never reject a claim based on a single signal failing. Bad network in a storm degrades sensor data. A new worker doesn't have enough history for the behavioral model. We default to trust and require multiple signals to align before we hold anything.

Workers who consistently score low — meaning honest, consistent behaviour — get Instant Liquidity status after 4 weeks. They skip even the soft verification. That's the reward for being trustworthy.

### Syndicate-level detection

Beyond individual scoring, we run a DBSCAN clustering job on all claims every 10 minutes looking for suspicious bursts:

```python
# Claims from same IP subnet + same tiny geographic radius + same 30-minute window
# 10+ claims in that pattern = probable syndicate activity
# All claims in that cluster → manual review queue
# Honest workers in the same zone: unaffected
```

When a cluster gets flagged, we freeze payouts from those specific claim IDs pending investigation. Workers outside that cluster who have genuine claims in the same zone are not affected. Individual Trust Scores protect them.

---

## Tech Stack

We kept this realistic. We're a student team with 6 weeks.

- **Mobile:** Flutter (Android-first — Rajan uses Android)
- **Backend:** FastAPI in Python — we're all comfortable with it and it's ML-friendly
- **Shadow model:** XGBoost + scikit-learn
- **LSTM for behaviour:** PyTorch, CPU-only — no GPU needed for demo scale
- **Sensor classifier:** scikit-learn Random Forest — can run on-device eventually
- **DBSCAN fraud detection:** scikit-learn, single import
- **Database:** Firebase Firestore for real-time data + Firebase Storage
- **Weather:** OpenWeatherMap free tier + mocked IMD
- **Payments:** Razorpay test mode — full UPI sandbox
- **Auth:** Firebase Phone OTP
- **Hosting:** Firebase Hosting + Firebase Cloud Functions for backend triggers

No Kubernetes. No microservices. Nothing we can't explain in detail if asked.

---

## Build Timeline

**Phase 1 (now):** What you're reading. Plus: synthetic data generation for 10 test workers across 3 Chennai zones, and a Jupyter notebook proving the shadow earnings model works — predicted vs actual earnings across a simulated monsoon week. We want to show the concept working before we write a single line of app code.

**Phase 2 (Weeks 3–4):** Registration flow, policy management, live premium calculator with real model output, 5 disruption triggers live-wired to OpenWeatherMap, basic fraud scoring (IP + velocity + peer query), claims UI with gap visualisation.

**Phase 3 (Weeks 5–6):** Full sensor pipeline in Flutter, peer consensus, DBSCAN batch job, Razorpay sandbox end-to-end, dual dashboard (worker + insurer), final demo video showing a simulated Anna Nagar rainstorm trigger an automatic claim approval and UPI transfer — start to finish, on screen.

---

## Why We Think This Works

We're not claiming this is the only way to solve it. But we do think the Shadow Earnings idea is genuinely different from what everyone else is building.

The shift is from *"did a disruption happen?"* to *"did this specific person actually lose money — and can we prove it from signals no fraudster can cheaply fake?"* That's a harder question. It's also the right one. And answering it automatically, without Rajan having to do a single thing, for ₹49 a week — that's a product he'd actually use.

We'll be honest about what we don't know yet. We haven't figured out exactly how the sensor fusion performs in noisy real-world conditions. We don't know whether the peer consensus threshold of 3 workers is too high for low-density zones. We're going to find out during Phase 2. That's the point of building it.

---
Team:BITZAPP

Demo Video Link :https://drive.google.com/file/d/1s1BthEnWetZ1ANy13NNbS396kYgV-p1U/view?usp=drivesdk
