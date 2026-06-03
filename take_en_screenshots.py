"""Take English screenshots of previously Japanese-only pages"""
import asyncio
from playwright.async_api import async_playwright
import os

BASE_URL = "https://growl-app.vercel.app"
OUT_DIR = "screenshots/pr_growl_2026_en"
os.makedirs(OUT_DIR, exist_ok=True)

PAGES = [
    ("product", "/product", "13_product_marketing.png"),
    ("marketing", "/marketing", "14_marketing_analysis.png"),
    ("marketing_full", "/marketing", "14_marketing_analysis_full.png"),
    ("report", "/report", "15_monthly_report.png"),
    ("payment_success", "/payment-success?plan=pro", "16_payment_success.png"),
    ("learn_full", "/learn", "11_learn_full_NEW.png"),
    ("dashboard", "/dashboard", "08_dashboard_NEW.png"),
]

async def take_screenshots():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        for name, path, filename in PAGES:
            page = await browser.new_page(viewport={"width": 390, "height": 844})
            url = BASE_URL + path
            print(f"Visiting: {url}")
            try:
                await page.goto(url, wait_until="networkidle", timeout=15000)
                await page.wait_for_timeout(2000)

                if "full" in name:
                    await page.screenshot(path=f"{OUT_DIR}/{filename}", full_page=True)
                else:
                    await page.screenshot(path=f"{OUT_DIR}/{filename}")

                print(f"  ✓ Saved: {filename}")
            except Exception as e:
                print(f"  ✗ Error for {name}: {e}")
            finally:
                await page.close()

        # Also take desktop version of key pages
        desktop_pages = [
            ("/dashboard", "D05_desktop_dashboard_NEW.png"),
            ("/learn", "D06_desktop_learn_NEW.png"),
            ("/marketing", "D07_desktop_marketing_NEW.png"),
        ]

        for path, filename in desktop_pages:
            page = await browser.new_page(viewport={"width": 1440, "height": 900})
            url = BASE_URL + path
            print(f"Desktop: {url}")
            try:
                await page.goto(url, wait_until="networkidle", timeout=15000)
                await page.wait_for_timeout(2000)
                await page.screenshot(path=f"{OUT_DIR}/{filename}")
                print(f"  ✓ Saved: {filename}")
            except Exception as e:
                print(f"  ✗ Error: {e}")
            finally:
                await page.close()

        await browser.close()
        print("\nAll screenshots done!")

asyncio.run(take_screenshots())
