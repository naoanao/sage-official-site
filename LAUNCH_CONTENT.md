# Sage AI — Launch Content

---

## 1. ProductHunt

### Tagline (60 chars max)
Your AI posts to social media while you sleep

### Description
**Sage AI** is a SaaS tool that automates social media content for solopreneurs and indie creators — fully cloud-based, no setup required.

**What it does:**
- Generates AI-written blog posts, SNS captions, and sales copy from a single topic
- Auto-posts to social platforms daily (9 AM JST) via scheduled Cloudflare Workers
- Sends subscriber onboarding emails automatically via Make.com

**Why I built it:**
I was spending 2–3 hours a day on content. I wanted a system that would write, schedule, and post while I worked on other things — or slept. Sage AI is that system.

**Who it's for:**
Solopreneurs, indie hackers, and small creators who want consistent content without hiring a team.

**Pricing:**
- Pro: $20/month — AI content generation, daily auto-posting, full dashboard access
- Enterprise: $99/month — everything in Pro, plus priority support

**Tech stack:**
React + Vite, Cloudflare Pages + Workers + D1, Stripe, Make.com, Groq API

👉 Try it: https://sage-official-site.pages.dev

---

### First Comment (post this as a comment right after launch)

Hey PH! 👋 I'm the solo builder behind Sage AI.

The idea came from frustration: I kept missing posting days because life got in the way. So I built a tool that handles the whole cycle — research a topic, generate content, schedule it, post it — without me being at my desk.

The hardest part was making it truly cloud-native. No server to babysit. Everything runs on Cloudflare Workers on a cron schedule.

Happy to answer any questions about the tech or the product decisions. What would make this more useful for you?

---

## 2. Reddit — r/SideProject or r/indiehackers

### Title
I built an AI tool that posts to social media automatically — here's what I learned going solo

### Body
Six months ago I was manually writing social posts every morning before work. Not sustainable.

So I built **Sage AI** — a $20/month SaaS that automates the whole content cycle:

1. You pick a topic (or let it choose from a pre-filled pool)
2. AI generates a blog post + SNS captions + sales copy
3. It auto-posts daily at 9 AM on a cloud schedule (Cloudflare Workers cron)
4. Subscribers get onboarding emails automatically (Make.com)

**The stack:**
- Frontend: React + Vite on Cloudflare Pages
- AI: Groq API (llama-3.3-70b — fast and cheap)
- Scheduling: Cloudflare Workers with Cron triggers
- Database: Cloudflare D1 (SQLite at the edge)
- Payments: Stripe + webhooks
- Automation: Make.com for email sequences

**What surprised me:**
- Cloudflare Workers cold-start is basically zero. My cron jobs fire reliably every morning.
- Groq is 10x faster than OpenAI for this use case and a fraction of the cost.
- The hardest thing wasn't the code — it was making the UX feel trustworthy enough for someone to hand over their $20.

**What I'm still working on:**
- Direct Twitter/X and LinkedIn posting (currently copies captions to clipboard)
- Analytics dashboard for engagement tracking
- Multilingual support beyond English and Japanese

If you've tried to automate content and hit walls, I'd love to hear what broke for you.

Live at: https://sage-official-site.pages.dev
Pro: $20/mo | Enterprise: $99/mo

---

## 3. Indie Hackers — "What are you building?" thread or standalone post

### Title
Sage AI crossed $0 → first subscribers: building a content automation SaaS as a solo dev

### Body
I want to share what I've built and what I've learned, in case it helps someone in a similar spot.

**What is it?**
Sage AI automates social media content for solopreneurs. You give it a topic, it generates a full blog post, SNS captions, and a sales page draft. Then it auto-posts daily on a cloud schedule — no PC required, no server to manage.

**Why SaaS over a one-time tool?**
Recurring revenue is the goal. Content creation is a recurring problem. The math made sense.

**Architecture decisions that saved me:**
- **Cloudflare Pages + Workers + D1**: Zero server cost at low volume. Cron triggers work reliably. D1 gives me a SQL database at the edge for subscriber management.
- **Groq over OpenAI**: 3–5x cheaper for the same quality at my scale. Latency is also better for real-time UX.
- **Stripe Payment Links**: Skipped building a checkout UI entirely. Just link directly to Stripe-hosted pages.
- **Make.com for email**: Overkill? Maybe. But it took 20 minutes to set up a welcome email sequence triggered by Stripe webhooks.

**Pricing:**
- Pro: $20/month
- Enterprise: $99/month

**What's working:**
The content quality from llama-3.3-70b is surprisingly good for marketing copy. Users who see the demo usually understand the value proposition immediately.

**What I'd do differently:**
Launch sooner. I spent too long on edge cases and not enough time putting it in front of real users.

**Where it lives:**
https://sage-official-site.pages.dev

Happy to answer questions about the stack, pricing decisions, or anything else. Building in public.

---

## 4. Twitter/X Thread (launch day)

**Tweet 1:**
I built a tool that writes social media posts and publishes them automatically every morning.

No server. No manual work. $20/month.

Here's how Sage AI works 🧵

**Tweet 2:**
The problem: I was writing content every day. Good for consistency, terrible for scale.

The solution: automate the entire cycle.
→ Topic → Blog post → SNS captions → Auto-publish

**Tweet 3:**
The stack that makes it possible:
- Cloudflare Workers (cron at 9 AM daily)
- Groq API (llama-3.3-70b, fast + cheap)
- Cloudflare D1 (edge SQL for subscribers)
- Stripe (payments + webhooks)
- Make.com (automated welcome emails)

Total infra cost at low volume: ~$0/month

**Tweet 4:**
The hardest part wasn't the code.

It was building enough trust that someone would hand over $20 without knowing me.

UX, copy, and social proof matter more than features at launch.

**Tweet 5:**
Live now: https://sage-official-site.pages.dev

Pro: $20/month
Enterprise: $99/month

If you're a solopreneur spending hours on content — this is for you.

RT if you know someone who needs this 🙏

---

## 5. Bluesky Post

Built a SaaS that automates social media content for solopreneurs. AI writes the posts. Cloudflare Workers publishes them every morning at 9 AM. No server required.

$20/month. No free tier (it's a real product, not a toy).

https://sage-official-site.pages.dev

#AIAutomation #Solopreneur #IndieHacker #BuildInPublic
